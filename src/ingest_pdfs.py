import os, io, uuid
import oracledb, oci, numpy as np
from PyPDF2 import PdfReader
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from oci.generative_ai_inference import GenerativeAiInferenceClient
from oci.generative_ai_inference.models import EmbedTextDetails

load_dotenv()

# ---- CONFIG ----
COMPARTMENT_OCID = os.getenv("OCI_COMPARTMENT_OCID")
BUCKET_NAME = os.getenv("OCI_BUCKET")
NAMESPACE = os.getenv("OCI_OBJ_NAMESPACE")
EMBED_MODEL = os.getenv("GENAI_EMBED_MODEL")

DB_USER = os.getenv("ADB_USER")
DB_PASSWORD = os.getenv("ADB_PASSWORD")
ADB_DSN = os.getenv("ADB_CONNECT_STR")
WALLET_PATH = os.getenv("ADB_WALLET_PATH")
WALLET_PASSWORD = os.getenv("ADB_WALLET_PASSWORD")

# ---- CONNECT TO SERVICES ----
print("Initializing OCI clients...")

config = oci.config.from_file("~/.oci/config", "DEFAULT")
object_storage = oci.object_storage.ObjectStorageClient(config)
ai_client = GenerativeAiInferenceClient(config)

connection = oracledb.connect(
    user=DB_USER,
    password=DB_PASSWORD,
    dsn=ADB_DSN,
    config_dir=WALLET_PATH,
    wallet_location=WALLET_PATH,
    wallet_password=WALLET_PASSWORD
)
cursor = connection.cursor()

print("📚 Fetching PDFs from Object Storage...")
objects = object_storage.list_objects(NAMESPACE, BUCKET_NAME).data.objects

for obj in objects:
    name = obj.name
    print(f"\nProcessing: {name}")
    file_data = object_storage.get_object(NAMESPACE, BUCKET_NAME, name).data.content
    pdf_reader = PdfReader(io.BytesIO(file_data))
    text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)

    splitter = RecursiveCharacterTextSplitter(chunk_size=4000, chunk_overlap=400)
    chunks = splitter.split_text(text)
    print(f"  → {len(chunks)} chunks created")

    for i, chunk in enumerate(chunks):
        embed_req = EmbedTextDetails(
            inputs=[chunk],
            compartment_id=COMPARTMENT_OCID,
            serving_mode={"model_id": EMBED_MODEL}
        )
        response = ai_client.embed_text(embed_req)
        vector = np.array(response.data.embeddings[0].values, dtype=np.float32)

        cursor.execute("""
            INSERT INTO DOC_CHUNKS (CHUNK_ID, FILE_NAME, CHUNK_INDEX, CHUNK_TEXT, EMBEDDING)
            VALUES (:1, :2, :3, :4, :5)
        """, (str(uuid.uuid4()), name, i, chunk, vector))

    connection.commit()
    print(f"✅ {name} inserted successfully!")

cursor.close()
connection.close()
print("\n🎉 Ingestion complete!")
