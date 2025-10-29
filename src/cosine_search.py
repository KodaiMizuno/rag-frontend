import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def load_embeddings(path="data/embeddings.npy"):
    return np.load(path)

def get_top_k_chunks(query_vec, emb_matrix, k=5):
    sims = cosine_similarity(query_vec.reshape(1, -1), emb_matrix)[0]
    top_idx = np.argsort(sims)[-k:][::-1]
    return top_idx, sims[top_idx]

if __name__ == "__main__":
    emb_matrix = load_embeddings("data/embeddings.npy")
    query_vec = np.load("data/query_vec.npy")

    top_idx, scores = get_top_k_chunks(query_vec, emb_matrix, k=5)

    print("✅ Cosine similarity search complete!")
    print("Top indices:", top_idx)
    print("Scores:", scores)
