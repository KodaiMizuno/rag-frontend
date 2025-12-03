import os
import json  # <-- ADD THIS LINE
import numpy as np
import cohere
import re
import random 
from sklearn.metrics.pairwise import cosine_similarity

class RAGEngine:
    def __init__(self, db_conn, table_name="DOC_CHUNKS_V4"):
        self.co = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))
        self.conn = db_conn
        self.table_name = table_name
        self.texts = []
        self.embeddings = []
        self.metadata = []  # <-- ADD THIS LINE
        self._load_vectors()

    def _load_vectors(self):
        print("📥 Loading vectors from DB...")
        with self.conn.cursor() as cur:
            cur.execute(f"SELECT chunk_text, embedding, metadata FROM {self.table_name}")
            rows = cur.fetchall()
        
        self.metadata = []
        
        for text, vec, meta in rows:
            self.texts.append(text.read() if hasattr(text, "read") else text)
            self.embeddings.append(np.array(vec, dtype=np.float32))
            # Handle CLOB metadata
            if meta:
                if hasattr(meta, "read"):
                    meta = meta.read()
                self.metadata.append(meta)
            else:
                self.metadata.append("{}")
        
        if len(self.embeddings) > 0:
            self.embeddings = np.vstack(self.embeddings)
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            self.embeddings = self.embeddings / np.maximum(norms, 1e-12)
        print(f"✅ Loaded {len(self.embeddings)} embeddings.")

    def search(self, query, top_k=5):
        resp = self.co.embed(
            model="embed-english-v3.0", texts=[query],
            input_type="search_query", embedding_types=["float"]
        )
        query_vec = np.array(resp.embeddings.float[0], dtype=np.float32).reshape(1, -1)
        query_vec = query_vec / np.maximum(np.linalg.norm(query_vec), 1e-12)
        
        scores = cosine_similarity(query_vec, self.embeddings)[0]
        top_idxs = np.argsort(scores)[-top_k:][::-1]
        
        results = []
        sources = []
        
        for i in top_idxs:
            chunk_text = self.texts[i]
            results.append(chunk_text)
            
            # Parse rich metadata
            try:
                meta_str = self.metadata[i]
                if meta_str and meta_str.strip():
                    meta = json.loads(meta_str)
                else:
                    meta = {}
                    
                sources.append({
                    "filename": meta.get("source", "Unknown"),
                    "title": meta.get("title", meta.get("source", "Unknown Document")),
                    "course_id": meta.get("course_id", ""),
                    "chunk_id": meta.get("chunk_id", 0),
                    "page_number": meta.get("page_number"),
                    "total_chunks": meta.get("total_chunks", 1),
                    "snippet": chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text,
                    "relevance_score": float(scores[i])
                })
            except Exception as e:
                print(f"⚠️ Error parsing metadata: {e}")
                sources.append({
                    "filename": "Unknown",
                    "title": "Unknown Source",
                    "course_id": "",
                    "chunk_id": 0,
                    "page_number": None,
                    "snippet": chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text,
                    "relevance_score": float(scores[i])
                })
        
        return results, sources

    def get_tutor_hint(self, query, context):
        context_str = "\n\n".join(context)
        prompt = f"""
        You are a Data Science TA. 
        Context: {context_str}
        Student Question: {query}
        
        Now, respond as a helpful TA:
        1. Offer a brief explanation of the underlying concept.
        2. Give 2-3 hints or questions that guide the student toward the solution.
        3. Be concise, clear, and friendly.
        """
        gen = self.co.chat(
            model="command-a-03-2025",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return gen.message.content[0].text

    def generate_mcq(self, past_query, context=None):
        angles = [
            "conceptual understanding",        
            "syntax and coding specifics",     
            "a real-world application",        
            "troubleshooting a specific scenario",
            "predicting the output of code"
        ]
        chosen_angle = random.choice(angles)

        if context:
            context_str = "\n\n".join(context)
            prompt = f"""
            You are an expert Data Science Exam Creator.
            Create a multiple-choice question based STRICTLY on the provided context.
            
            Target Topic: "{past_query}"
            Learning Angle: {chosen_angle}
            
            ### CRITICAL RULES (Follow these or you will be fired):
            1. **Clarity First:** The question must be unambiguous. Avoid double negatives.
            2. **Single Truth:** There must be EXACTLY ONE correct answer.
            3. **Clear Distractors:** The wrong answers must be demonstrably false.
            4. **No Code Tricks:** If the question involves code, ensure the syntax is standard.
            
            Context to use:
            {context_str}
            
            Format:
            Question: <text>
            A) <option>
            B) <option>
            C) <option>
            D) <option>
            Correct Answer: <A/B/C/D>
            Explanation: <Clear explanation why the correct answer is right and why others are wrong>
            """
        else:
            prompt = f"""
            You are an expert Data Science Exam Creator.
            Generate a clear, high-quality multiple-choice question about: "{past_query}".
            
            ### CRITICAL RULES:
            1. Avoid negative logic. Use positive framing.
            2. Ensure exactly one answer is correct.
            3. Focus on: {chosen_angle}.

            Format:
            Question: <text>
            A) ...
            B) ...
            C) ...
            D) ...
            Correct Answer: <A/B/C/D>
            Explanation: <text>
            """

        try:
            gen = self.co.chat(
                model="command-a-03-2025",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4
            )
            text = gen.message.content[0].text
        except Exception as e:
            print(f"⚠️ Error calling Cohere: {e}")
            return None, None, None
        
        try:
            if "Correct Answer:" not in text: return None, None, None
            parts = text.split("Correct Answer:")
            question_part = parts[0].strip()
            remaining_text = parts[1]
            match = re.search(r"([A-D])", remaining_text, re.IGNORECASE)
            if not match: return None, None, None
            correct_letter = match.group(1).upper()
            explanation = ""
            if "Explanation:" in remaining_text:
                explanation = remaining_text.split("Explanation:")[1].strip()
            return question_part, correct_letter, explanation
        except Exception:
            return None, None, None