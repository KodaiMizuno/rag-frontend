import os
import numpy as np

# -----------------------------
# CONFIGURATION
# -----------------------------
EMBEDDING_DIM = 1024  # must match embed_chunks.py
QUERY_PATH = "data/query_vec.npy"

# -----------------------------
# OFFLINE QUERY GENERATOR
# -----------------------------
def make_random_query():
    """Generate a random query vector for offline testing."""
    query_vec = np.random.rand(EMBEDDING_DIM).astype(np.float32)
    np.save(QUERY_PATH, query_vec)
    print(f"✅ Random query vector saved to {QUERY_PATH}")
    print(f"Shape: {query_vec.shape}")
    print("\nYou can now run:")
    print("  python -m src.cosine_search")

# -----------------------------
# (OPTIONAL) TEXT QUERY PLACEHOLDER
# -----------------------------
def make_text_query(text: str):
    """Placeholder for converting a text query into an embedding later."""
    # 🔜 Replace this with a real embedding model in the future.
    np.random.seed(abs(hash(text)) % (10**6))  # deterministic random vector for same text
    query_vec = np.random.rand(EMBEDDING_DIM).astype(np.float32)
    np.save(QUERY_PATH, query_vec)
    print(f"🧠 Query vector created from text: '{text}'")
    print(f"✅ Saved to {QUERY_PATH}")
    print(f"Shape: {query_vec.shape}")

# -----------------------------
# MAIN ENTRY POINT
# -----------------------------
if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)

    print("🧭 Choose query mode:")
    print("1️⃣  Random vector (offline test)")
    print("2️⃣  From text (placeholder for real embeddings)")
    mode = input("Enter 1 or 2: ").strip()

    if mode == "1":
        make_random_query()
    elif mode == "2":
        text = input("Enter your query text: ")
        make_text_query(text)
    else:
        print("⚠️ Invalid input. Please run again.")

