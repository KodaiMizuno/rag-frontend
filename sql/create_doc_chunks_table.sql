-- ===============================================
-- 📘 DOC_CHUNKS Vector Table and Index Definition
-- Author  : Kodai Mizuno
-- Version : v1.0 (October 2025)
-- Purpose : Store text chunks, embeddings, and metadata
-- ===============================================

CREATE TABLE DOC_CHUNKS (
    CHUNK_ID      VARCHAR2(100) PRIMARY KEY,
    FILE_NAME     VARCHAR2(400),
    CHUNK_INDEX   NUMBER,
    CHUNK_TEXT    CLOB,
    EMBEDDING     VECTOR(1536, FLOAT32),
    CREATED_AT    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- ⚡ Active Vector Index (in use)
-- ===============================================
CREATE VECTOR INDEX IX_DOC_CHUNKS_EMB
  ON DOC_CHUNKS (EMBEDDING)
  ORGANIZATION INMEMORY NEIGHBOR GRAPH
  DISTANCE COSINE;

-- ===============================================
-- 🧩 Future Scaling Option (optional)
-- ===============================================
CREATE VECTOR INDEX IX_DOC_CHUNKS_EMB_IVF
  ON DOC_CHUNKS (EMBEDDING)
  ORGANIZATION NEIGHBOR PARTITIONS
  PARAMETERS (
    'TYPE IVF',
    'DISTANCE COSINE',
    'NEIGHBOR_PARTITIONS 100'
  );

-- ===============================================
-- 🧾 Index Summary
-- SYS_IL... : System LOB indexes (for CLOBs)
-- SYS_C...  : Primary key index (CHUNK_ID)
-- IX_DOC_CHUNKS_EMB : Active vector index (in-memory ANN)
-- IX_DOC_CHUNKS_EMB_IVF : Optional IVF index (large-scale)
-- ===============================================

