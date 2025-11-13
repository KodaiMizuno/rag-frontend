from flask import Flask, request, jsonify
import numpy as np
import oracledb, os, json
from dotenv import load_dotenv
import cohere
from sklearn.metrics.pairwise import cosine_similarity
from flask_cors import CORS

# -----------------------------------------------------
# Load environment and run your existing DB + RAG setup
# -----------------------------------------------------
load_dotenv()

app = Flask(__name__)
CORS(app)  # <--- add this


# ---- your existing DB load code here ----
# (keep EXACTLY the same code you already wrote)
# Load: WALLETS, connect to DB, load embeddings, normalize, etc.
# Keep these as global so they load once at startup.

# Example:
WALLET_DIR = os.getenv("ADB_WALLET_PATH")
DB_USER = os.getenv("ADB_USER")
DB_PASSWORD = os.getenv("ADB_PASSWORD")
DB_DSN = os.getenv("ADB_CONNECT_STR")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
wallet_password=os.getenv("ADB_WALLET_PASSWORD")

print("🔌 Connecting…")
conn = oracledb.connect(
    user=DB_USER,
    password=DB_PASSWORD,
    dsn=DB_DSN,
    config_dir=WALLET_DIR,
    wallet_location=WALLET_DIR,
    wallet_password=wallet_password
)
cur = conn.cursor()
cur.execute("SELECT chunk_text, embedding, metadata FROM DOC_CHUNKS_V4")
rows = cur.fetchall()

texts = []
emb_list = []

for text, emb, meta in rows:
    texts.append(text.read() if hasattr(text, "read") else text)
    emb_list.append(np.array(emb, dtype=np.float32))

embeddings = np.vstack(emb_list)
embeddings = embeddings.astype(np.float32)

# Normalization function
def safe_normalize(v):
    norms = np.linalg.norm(v, axis=1, keepdims=True)
    return v / np.maximum(norms, 1e-12)

embeddings = safe_normalize(embeddings)

co = cohere.ClientV2(api_key=COHERE_API_KEY)

# -----------------------------------------------------
#           🔥 The API ENDPOINT your frontend calls
# -----------------------------------------------------
@app.post("/answer")
def answer():
    data = request.json
    question = data.get("question", "")

    # 1. Embed question
    q = co.embed(
        model="embed-english-v3.0",
        texts=[question],
        input_type="search_query",
        embedding_types=["float"]
    )
    query_vec = np.array(q.embeddings.float[0], dtype=np.float32).reshape(1, -1)
    query_vec = safe_normalize(query_vec)

    # 2. Retrieve top K (RAG)
    scores = cosine_similarity(query_vec, embeddings)[0]
    top_idxs = np.argsort(scores)[-5:][::-1]

    context = "\n\n".join(texts[i] for i in top_idxs)

    # 3. Generate tutor response
    prompt = f"""
    Context:
    {context}

    Student Question: {question}
    Provide a helpful explanation and hints (not full answers).
    """

    gen = co.chat(
        model="command-a-03-2025",
        messages=[
            {"role": "system", "content": "You are a helpful tutor."},
            {"role": "user", "content": prompt}
        ]
    )

    answer_text = "".join([c.text for c in gen.message.content if c.type=="text"])

    # 4. Prepare sources for frontend
    sources = []
    for idx in top_idxs:
        sources.append({
            "id": int(idx),
            "score": float(scores[idx]),
            "preview": texts[idx][:160],
            "source_uri": "oracle-db"
        })

    return jsonify({
        "answer": answer_text,
        "sources": sources
    })


# -----------------------------------------------------
# Run server
# -----------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
