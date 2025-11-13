#!/usr/bin/env python3
import os
import time
import json
import glob
import numpy as np
import cohere
from pypdf import PdfReader
from dotenv import load_dotenv
import oracledb
import shutil

load_dotenv()

# -----------------------------
# CONFIGURATION
# -----------------------------
RAW_PDF_DIR = "data/raw_pdfs"
CHUNK_DIR = "data/processed_chunks"
EMBED_PATH = "data/embeddings.npy"
CHUNK_ID_PATH = "data/chunk_ids.npy"
UPLOAD_TO_DB = True   # Toggle this to upload to Oracle

CHUNK_SIZE = 1000
OVERLAP = 200
EMBEDDING_DIM = 1536
BATCH_SIZE = 70

# Oracle DB configuration
WALLET_DIR      = os.getenv("ADB_WALLET_PATH")
DB_USER         = os.getenv("ADB_USER")
DB_PASSWORD     = os.getenv("ADB_PASSWORD")
DB_CONNECT_STR  = os.getenv("ADB_CONNECT_STR")
WALLET_PASSWORD = os.getenv("ADB_WALLET_PASSWORD")
COHERE_API_KEY  = os.getenv("COHERE_API_KEY")

# -----------------------------
# UTILITIES
# -----------------------------
def ensure_dirs():
    os.makedirs("data", exist_ok=True)
    os.makedirs(CHUNK_DIR, exist_ok=True)
    os.makedirs(RAW_PDF_DIR, exist_ok=True)

def read_pdf_text(pdf_path):
    """Extract full text from a PDF file."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def save_chunks(file_name, chunks):
    """Save each chunk as a text file."""
    base_name = os.path.splitext(os.path.basename(file_name))[0]
    for i, chunk in enumerate(chunks):
        chunk_path = os.path.join(CHUNK_DIR, f"{base_name}_chunk_{i+1}.txt")
        with open(chunk_path, "w", encoding="utf-8") as f:
            f.write(chunk)

def read_chunks():
    """Read all .txt chunks from folder."""
    chunk_files = sorted(glob.glob(os.path.join(CHUNK_DIR, "*.txt")))
    chunks = []
    for file_path in chunk_files:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        if text:
            chunk_id = os.path.basename(file_path)
            chunks.append((chunk_id, text))
    return chunks

def clear_old_chunks():
    """Remove old chunk files before reprocessing."""
    if os.path.exists(CHUNK_DIR):
        shutil.rmtree(CHUNK_DIR)
    os.makedirs(CHUNK_DIR, exist_ok=True)

# -----------------------------
# EMBEDDING PIPELINE
# -----------------------------
def generate_embeddings(chunks):
    """Generate embeddings via Cohere API."""
    co = cohere.ClientV2(api_key=COHERE_API_KEY)
    texts = [t for _, t in chunks]
    chunk_ids = np.array([cid for cid, _ in chunks])

    print(f"🧠 Generating Cohere embeddings for {len(chunks)} chunks...")
    all_embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        print(f"  → Embedding batch {i//BATCH_SIZE + 1} ({len(batch)} chunks)")
        resp = co.embed(
            model="embed-english-v3.0",
            texts=batch,
            input_type="search_document",
            truncate="END"
        )
        all_embeddings.extend(resp.embeddings.float)
        time.sleep(25)

    embeddings = np.array(all_embeddings, dtype=np.float32)
    print(f"✅ Generated embeddings with shape {embeddings.shape}")
    return embeddings, chunk_ids, texts

# -----------------------------
# UPLOAD TO ORACLE
# -----------------------------
def upload_to_db(embeddings, chunk_ids, texts):
    print("🔌 Connecting to Oracle Autonomous Database...")
    conn = oracledb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_CONNECT_STR,
        config_dir=WALLET_DIR,
        wallet_location=WALLET_DIR,
        wallet_password=WALLET_PASSWORD
    )
    cur = conn.cursor()

    # Clear existing records
    print("🧹 Clearing existing rows in DOC_CHUNKS_HYBRID...")
    cur.execute("DELETE FROM DOC_CHUNKS_HYBRID")
    conn.commit()

    print(f"⬆️ Uploading {len(embeddings)} chunks to database...")
    for cid, text, emb in zip(chunk_ids, texts, embeddings):
        emb_json = json.dumps(emb.tolist())
        cur.execute(
            """
            INSERT INTO DOC_CHUNKS_HYBRID (CHUNK_ID, FILE_NAME, CHUNK_TEXT, EMBEDDING_JSON)
            VALUES (:1, :2, :3, :4)
            """,
            (str(cid), str(cid), text, emb_json)
        )

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Successfully uploaded all embeddings to Oracle!")

# -----------------------------
# MAIN PIPELINE
# -----------------------------
def main():
    ensure_dirs()
    clear_old_chunks()

    # Step 1: Process PDFs into text chunks
    pdf_files = [f for f in os.listdir(RAW_PDF_DIR) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print(f"⚠️ No PDFs found in {RAW_PDF_DIR}. Add files and re-run.")
        return

    for pdf_file in pdf_files:
        pdf_path = os.path.join(RAW_PDF_DIR, pdf_file)
        print(f"📘 Processing: {pdf_file}")
        text = read_pdf_text(pdf_path)
        chunks = chunk_text(text)
        save_chunks(pdf_file, chunks)
        print(f"✅ Created {len(chunks)} chunks for {pdf_file}")

    # Step 2: Read chunks and generate embeddings
    chunks = read_chunks()
    embeddings, chunk_ids, texts = generate_embeddings(chunks)

    # Step 3: Save locally
    np.save(EMBED_PATH, embeddings)
    np.save(CHUNK_ID_PATH, chunk_ids)
    print("💾 Saved embeddings locally to .npy")

    # Step 4: Upload to Oracle (optional)
    if UPLOAD_TO_DB:
        upload_to_db(embeddings, chunk_ids, texts)

    print("\n🎉 Pipeline complete!")

# -----------------------------
# RUN SCRIPT
# -----------------------------
if __name__ == "__main__":
    main()
