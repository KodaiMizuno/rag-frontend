import os
from pypdf import PdfReader

# -----------------------------
# CONFIGURATION
# -----------------------------
RAW_PDF_DIR = "data/raw_pdfs"
CHUNK_DIR = "data/processed_chunks"
CHUNK_SIZE = 1000     # characters per chunk
OVERLAP = 200         # overlap between consecutive chunks

# -----------------------------
# UTILITIES
# -----------------------------
def ensure_dirs():
    """Ensure that required directories exist."""
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
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def save_chunks(file_name, chunks):
    """Save each chunk to a text file."""
    base_name = os.path.splitext(os.path.basename(file_name))[0]
    for i, chunk in enumerate(chunks):
        chunk_path = os.path.join(CHUNK_DIR, f"{base_name}_chunk_{i+1}.txt")
        with open(chunk_path, "w", encoding="utf-8") as f:
            f.write(chunk)

# -----------------------------
# MAIN PIPELINE
# -----------------------------
def process_pdfs():
    """Read, chunk, and save all PDFs from raw_pdfs directory."""
    ensure_dirs()
    pdf_files = [f for f in os.listdir(RAW_PDF_DIR) if f.lower().endswith(".pdf")]
    
    if not pdf_files:
        print(f"⚠️ No PDFs found in {RAW_PDF_DIR}. Please add files first.")
        return

    for pdf_file in pdf_files:
        pdf_path = os.path.join(RAW_PDF_DIR, pdf_file)
        print(f"📘 Processing: {pdf_file}")
        text = read_pdf_text(pdf_path)
        chunks = chunk_text(text)
        save_chunks(pdf_file, chunks)
        print(f"✅ Created {len(chunks)} chunks for {pdf_file}")

    print(f"\n🎉 All PDFs processed! Chunks saved in: {CHUNK_DIR}")

# -----------------------------
# RUN SCRIPT
# -----------------------------
if __name__ == "__main__":
    process_pdfs()
