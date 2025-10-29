import os
import oracledb
import numpy as np
import json
import uuid

os.environ["TNS_ADMIN"] = "/home/kmizuno/oracle_dss_hybrid/wallet_dir"

conn = oracledb.connect(
    user="ADMIN",
    password="…",
    dsn="tutordb_high",
    config_dir="/home/kmizuno/oracle_dss_hybrid/wallet_dir"
)


# --- 📂 Load embeddings and chunks ---
embeddings = np.load("data/embeddings.npy")
texts = np.load("data/texts.npy", allow_pickle=True)
file_name = "Lecture_Pandas.pdf"

print(f"🚀 Inserting {len(embeddings)} chunks into DOC_CHUNKS_HYBRID...")

with conn.cursor() as cur:
    for i, (text, emb) in enumerate(zip(texts, embeddings)):
        emb_json = json.dumps(emb.tolist())
        chunk_id = str(uuid.uuid4())

        cur.execute("""
            INSERT INTO doc_chunks_hybrid
            (chunk_id, file_name, chunk_index, chunk_text, embedding_json)
            VALUES (:1, :2, :3, :4, :5)
        """, (chunk_id, file_name, i, text, emb_json))
    
    conn.commit()

print("✅ All embeddings stored as JSON in DOC_CHUNKS_HYBRID.")
conn.close()
