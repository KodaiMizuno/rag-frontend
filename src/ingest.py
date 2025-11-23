import os
import time
import cohere
from pypdf import PdfReader
from dotenv import load_dotenv
from database import DatabaseManager

# --- CONFIGURATION ---
INPUT_DIR = "data/raw_pdfs"
TABLE_NAME = "DOC_CHUNKS_V4"
BATCH_SIZE = 90
SLEEP_TIME = 10
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

load_dotenv()

def extract_text_from_pdf(pdf_path):
    """Reads a PDF and returns the full text."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"❌ Error reading {pdf_path}: {e}")
        return None

def smart_chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Splits text into chunks without cutting sentences in half where possible.
    No external libraries required.
    """
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        
        # If we are at the end, just take the rest
        if end >= text_len:
            chunks.append(text[start:])
            break

        # Try to find the last period (.) to break cleanly
        # We look in the last 20% of the chunk to find a sentence end
        search_zone = text[start:end]
        last_period = search_zone.rfind('.')
        
        # If a period is found reasonably late in the chunk, break there
        if last_period > (chunk_size * 0.7): 
            end = start + last_period + 1
        else:
            # If no period found, try finding a newline
            last_newline = search_zone.rfind('\n')
            if last_newline > (chunk_size * 0.7):
                end = start + last_newline + 1

        # Append the chunk
        chunks.append(text[start:end].strip())
        
        # Move forward (Apply overlap)
        start = end - overlap

    return [c for c in chunks if c] # Remove empty strings

def generate_embeddings_batched(chunks, co_client):
    """Generates embeddings in batches to respect API limits."""
    all_embeddings = []
    total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"🧠 Generating Embeddings (Total Batches: {total_batches})...")
    
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        current_batch = (i // BATCH_SIZE) + 1
        print(f"   → Processing Batch {current_batch}/{total_batches} ({len(batch)} chunks)...")
        
        try:
            response = co_client.embed(
                texts=batch,
                model="embed-english-v3.0",
                input_type="search_document",
                embedding_types=["float"]
            )
            all_embeddings.extend(response.embeddings.float)
            if current_batch < total_batches:
                time.sleep(SLEEP_TIME)
        except Exception as e:
            print(f"❌ Error in batch {current_batch}: {e}")
            
    return all_embeddings

def main():
    # 1. Setup
    if not os.path.exists(INPUT_DIR):
        print(f"⚠️ Directory '{INPUT_DIR}' not found. Creating it...")
        os.makedirs(INPUT_DIR)
        print(f"❌ Please put your PDFs in '{INPUT_DIR}' and run this again.")
        return

    db = DatabaseManager()
    try:
        db.connect()
    except Exception as e:
        print("❌ Could not connect to DB. Check .env and wallet.")
        return

    co = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))

    # 2. Ask to Clear DB
    user_input = input(f"⚠️ Do you want to DELETE all existing data in {TABLE_NAME} before starting? (y/n): ")
    if user_input.lower() == 'y':
        db.clear_table(TABLE_NAME)

    # 3. Process Files
    pdf_files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("No PDF files found to process.")
        return

    for filename in pdf_files:
        filepath = os.path.join(INPUT_DIR, filename)
        print(f"\n📘 Processing: {filename}")
        
        # A. Extract
        raw_text = extract_text_from_pdf(filepath)
        if not raw_text: continue
        
        # B. Chunk (Using our new custom function)
        chunks = smart_chunk_text(raw_text)
        print(f"   ✂️ Generated {len(chunks)} chunks.")
        
        # C. Embed
        embeddings = generate_embeddings_batched(chunks, co)
        
        # D. Insert
        if len(embeddings) == len(chunks):
            db.insert_chunks(chunks, embeddings, filename, TABLE_NAME)
        else:
            print("⚠️ Mismatch between chunks and embeddings. Skipping DB insert.")

    print("\n🎉 Ingestion Complete!")

if __name__ == "__main__":
    main()