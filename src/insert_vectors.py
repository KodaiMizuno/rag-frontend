import os
import uuid
import numpy as np
import oracledb
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Connect to ADB
connection = oracledb.connect(
    user=os.getenv("ADB_USER"),
    password=os.getenv("ADB_PASSWORD"),
    dsn=os.getenv("ADB_CONNECT_STR"),
    config_dir=os.getenv("ADB_WALLET_PATH"),
    wallet_location=os.getenv("ADB_WALLET_PATH"),
    wallet_password=os.getenv("ADB_WALLET_PASSWORD")
)

cursor = connection.cursor()

# Example chunks and dummy embeddings
chunks = [
    "Oracle Cloud Infrastructure powers enterprise AI workloads.",
    "Vector databases enable semantic search with embeddings.",
    "Cal Ice Hockey went undefeated in the PAC-8 last season!"
]

# Generate 1536-dimensional float32 embeddings
for i, text in enumerate(chunks):
    emb = np.random.rand(1536).astype(np.float32)
    # memoryview tells Oracle this is binary float data (not a PL/SQL array)
    cursor.execute("""
        INSERT INTO DOC_CHUNKS (CHUNK_ID, FILE_NAME, CHUNK_INDEX, CHUNK_TEXT, EMBEDDING)
        VALUES (:1, :2, :3, :4, :5)
    """, (str(uuid.uuid4()), "test_doc.txt", i, text, memoryview(emb)))


connection.commit()
print(f"✅ Inserted {len(chunks)} test chunks successfully.")

cursor.close()
connection.close()

