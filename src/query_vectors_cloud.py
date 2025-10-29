import os
import json
import numpy as np
import oracledb
from sklearn.metrics.pairwise import cosine_similarity
import oci
from oci.generative_ai_inference import GenerativeAiInferenceClient
from oci.generative_ai_inference.models import TextGenerationRequest

# --- 🔧 Environment ---
os.environ["TNS_ADMIN"] = "/home/kmizuno/oracle_dss_hybrid/wallet_dir"

# --- 🧠 Connect to ADB ---
conn = oracledb.connect(
    user="ADMIN",
    password="Kodaimizuno0508",
    dsn="tutordb_high"
)

# --- 📥 Retrieve embeddings + texts ---
cur = conn.cursor()
cur.execute("SELECT chunk_id, chunk_text, embedding_json FROM doc_chunks_hybrid")
rows = cur.fetchall()
conn.close()

texts, embeddings = [], []
for cid, text, emb_json in rows:
    embeddings.append(np.array(json.loads(emb_json)))
    texts.append(text)

print(f"✅ Loaded {len(embeddings)} embeddings from DOC_CHUNKS_HYBRID.")

# --- 🔍 Cosine similarity search ---
query_vec = np.load("data/query_vec.npy").reshape(1, -1)
scores = cosine_similarity(query_vec, np.vstack(embeddings))[0]
top_k = np.argsort(scores)[-5:][::-1]

context = "\n\n".join([texts[i] for i in top_k])
print("\n📘 Top Contexts Retrieved:\n")
for i in top_k:
    print(f"🔹 Score {scores[i]:.3f}: {texts[i][:120]}...\n")

# --- 🤖 OCI Generative AI Integration ---
config = oci.config.from_file("~/.oci/config")
client = GenerativeAiInferenceClient(config=config)

def ask_tutor(question, context):
    prompt = f"""Use the following course materials to help guide a student.
Context:
{context}

Question: {question}

Provide a clear explanation or hint (not a direct answer).
"""
    req = TextGenerationRequest(
        compartment_id="ocid1.compartment.oc1..your_id_here",
        input=prompt,
        max_output_tokens=300,
        temperature=0.7
    )
    res = client.generate_text(req)
    return res.data.output_text

# --- 🧩 Ask your hybrid RAG model ---
question = "How do you merge two DataFrames in pandas?"
response = ask_tutor(question, context)

print("\n🤖 Tutor Hint:\n", response)
