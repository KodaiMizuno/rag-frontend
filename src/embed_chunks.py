import os
import numpy as np
import glob

# -----------------------------
# CONFIGURATION
# -----------------------------
CHUNK_DIR = "data/processed_chunks"
EMBED_PATH = "data/embeddings.npy"
CHUNK_ID_PATH = "data/chunk_ids.npy"

EMBEDDING_DIM = 1536  # same dimension you'll later use for OCI GenAI

# -----------------------------
# UTILITIES
# -----------------------------
def ensure_dirs():
    os.makedirs("data", exist_ok=True)
    os.makedirs(CHUNK_DIR, exist_ok=True)

def read_chunks():
    """Read all chunk text files and return a list of (chunk_id, text)."""
    chunk_files = sorted(glob.glob(os.path.join(CHUNK_DIR, "*.txt")))
    chunks = []
    for file_path in chunk_files:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        chunk_id = os.path.basename(file_path)
        chunks.append((chunk_id, text))
    return chunks

# -----------------------------
# MAIN PIPELINE
# -----------------------------
def embed_chunks():
    """Generate embeddings (offline = random) and save as .npy."""
    ensure_dirs()
    chunks = read_chunks()

    if not chunks:
        print(f"⚠️ No chunks found in {CHUNK_DIR}. Run chunking.py first.")
        return

    print(f"🧠 Generating embeddings for {len(chunks)} chunks...")
    # For offline testing, generate random vectors
    embeddings = np.random.rand(len(chunks), EMBEDDING_DIM).astype(np.float32)
    chunk_ids = np.array([cid for cid, _ in chunks])

    # Save results
    np.save(EMBED_PATH, embeddings)
    np.save(CHUNK_ID_PATH, chunk_ids)
    print(f"✅ Saved embeddings → {EMBED_PATH}")
    print(f"✅ Saved chunk IDs → {CHUNK_ID_PATH}")
    print(f"Shape: {embeddings.shape}")

# -----------------------------
# RUN SCRIPT
# -----------------------------
if __name__ == "__main__":
    embed_chunks()
