import os
import time
import json
import cohere
from pypdf import PdfReader
from dotenv import load_dotenv
from database import DatabaseManager
from datetime import datetime

# --- CONFIGURATION ---
INPUT_DIR = "data/raw_pdfs"
TABLE_NAME = "DOC_CHUNKS_V4"
BATCH_SIZE = 96
SLEEP_TIME = 15
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

load_dotenv()

def extract_text_with_pages(pdf_path):
    """Reads a PDF and returns text with page numbers."""
    try:
        reader = PdfReader(pdf_path)
        pages = []
        
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append({
                    "page_number": page_num,
                    "text": text
                })
        
        return pages, len(reader.pages)
    except Exception as e:
        print(f"❌ Error reading {pdf_path}: {e}")
        return None, 0

def smart_chunk_with_pages(pages, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Splits text into chunks while preserving page number info.
    """
    chunks = []
    
    for page_data in pages:
        page_num = page_data["page_number"]
        text = page_data["text"]
        text_len = len(text)
        start = 0
        
        while start < text_len:
            end = start + chunk_size
            
            if end >= text_len:
                chunk_text = text[start:].strip()
                if chunk_text:
                    chunks.append({
                        "text": chunk_text,
                        "page_number": page_num
                    })
                break
            
            # Try to find the last period to break cleanly
            search_zone = text[start:end]
            last_period = search_zone.rfind('.')
            
            if last_period > (chunk_size * 0.7):
                end = start + last_period + 1
            else:
                last_newline = search_zone.rfind('\n')
                if last_newline > (chunk_size * 0.7):
                    end = start + last_newline + 1
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "page_number": page_num
                })
            
            start = end - overlap
    
    return chunks

def generate_embeddings_batched(chunks, co_client):
    """Generates embeddings in batches to respect API limits."""
    texts = [c["text"] for c in chunks]
    all_embeddings = []
    total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"🧠 Generating Embeddings (Total Batches: {total_batches})...")
    
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
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
            
            # --- FIX: ALWAYS SLEEP ---
            # Even if it's the last batch, we need to sleep to protect 
            # the API limit before the NEXT file starts processing.
            print(f"   ...Sleeping for {SLEEP_TIME}s to respect API limits...")
            time.sleep(SLEEP_TIME)
            
        except Exception as e:
            print(f"❌ Error in batch {current_batch}: {e}")
            # Optional: Sleep here too in case the error was a rate limit
            time.sleep(SLEEP_TIME)
            
    return all_embeddings

def insert_chunks_with_metadata(db, chunks, embeddings, filename, title=None, course_id=None, table_name=TABLE_NAME):
    """
    Batch inserts text chunks with rich metadata.
    """
    import array
    
    print(f"💾 Inserting {len(chunks)} chunks into {table_name}...")
    
    # Use filename as title if not provided
    if not title:
        title = filename.replace('.pdf', '').replace('_', ' ').replace('-', ' ').title()
    
    with db.conn.cursor() as cur:
        data = []
        for i, (chunk_data, vec) in enumerate(zip(chunks, embeddings)):
            # Rich metadata
            metadata = json.dumps({
                "source": filename,
                "title": title,
                "course_id": course_id or "GENERAL",
                "chunk_id": i,
                "page_number": chunk_data["page_number"],
                "total_chunks": len(chunks),
                "uploaded_at": datetime.utcnow().isoformat()
            })
            
            vec_array = array.array('f', vec)
            data.append((chunk_data["text"], vec_array, metadata))

        try:
            cur.executemany(f"""
                INSERT INTO {table_name} (chunk_text, embedding, metadata)
                VALUES (:1, :2, :3)
            """, data)
            db.conn.commit()
            print("✅ Upload complete!")
        except Exception as e:
            print(f"❌ Error inserting data: {e}")

def process_single_file(db, co_client, filepath, title=None, course_id=None):
    """
    Process a single PDF file and insert into DB.
    Returns number of chunks created.
    """
    filename = os.path.basename(filepath)
    print(f"\n📘 Processing: {filename}")
    
    # A. Extract with page numbers
    pages, total_pages = extract_text_with_pages(filepath)
    if not pages:
        return 0
    print(f"   📄 Extracted {len(pages)} pages with text (of {total_pages} total)")
    
    # B. Chunk with page tracking
    chunks = smart_chunk_with_pages(pages)
    print(f"   ✂️ Generated {len(chunks)} chunks")
    
    # C. Embed
    embeddings = generate_embeddings_batched(chunks, co_client)
    
    # D. Insert with metadata
    if len(embeddings) == len(chunks):
        insert_chunks_with_metadata(db, chunks, embeddings, filename, title, course_id)
        return len(chunks)
    else:
        print("⚠️ Mismatch between chunks and embeddings. Skipping DB insert.")
        return 0

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

    # 3. Ask for course ID (optional)
    course_id = input("📚 Enter Course ID for these documents (or press Enter for 'GENERAL'): ").strip()
    if not course_id:
        course_id = "GENERAL"

    # 4. Process Files
    pdf_files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("No PDF files found to process.")
        return

    total_chunks = 0
    for filename in pdf_files:
        filepath = os.path.join(INPUT_DIR, filename)
        chunks_created = process_single_file(db, co, filepath, course_id=course_id)
        total_chunks += chunks_created

    print(f"\n🎉 Ingestion Complete! Total chunks created: {total_chunks}")

if __name__ == "__main__":
    main()