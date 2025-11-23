import os
import oracledb
import uuid
import hashlib
from pathlib import Path
import array

class DatabaseManager:
    def __init__(self):
        self.user = os.getenv("ADB_USER")
        self.password = os.getenv("ADB_PASSWORD")
        self.dsn = os.getenv("ADB_CONNECT_STR")
        self.wallet_dir = os.getenv("ADB_WALLET_PATH")
        self.wallet_pwd = os.getenv("ADB_WALLET_PASSWORD")
        self.conn = None

    def connect(self):
        print("🔌 Connecting to TutorDatabase...")
        self.conn = oracledb.connect(
            user=self.user,
            password=self.password,
            dsn=self.dsn,
            config_dir=self.wallet_dir,
            wallet_location=self.wallet_dir,
            wallet_password=self.wallet_pwd,
            ssl_server_dn_match=True
        )
        return self.conn

    def get_session_user_id(self, reset_user=False):
        user_id_path = Path("data/session_user_id.txt")
        user_id_path.parent.mkdir(parents=True, exist_ok=True)

        if reset_user and user_id_path.exists():
            old_id = user_id_path.read_text().strip()
            # Optional: Add logic here to delete old records if needed
            user_id_path.unlink()
            print(f"♻️ Reset user session (Old: {old_id})")

        if user_id_path.exists():
            return user_id_path.read_text().strip()

        new_id = str(uuid.uuid4())
        user_id_path.write_text(new_id)
        
        # Log start
        with self.conn.cursor() as cur:
            try:
                cur.execute(
                    "INSERT INTO USER_QUERIES (user_id, query_text, timestamp) VALUES (:1, 'SESSION_START', SYSTIMESTAMP)",
                    [new_id]
                )
                self.conn.commit()
            except Exception as e:
                print(f"⚠️ Warning: Could not log session start: {e}")
        
        return new_id

    def log_query(self, user_id, query_text, correct='N'):
        query_hash = hashlib.sha256(query_text.encode("utf-8")).hexdigest()[:64]
        with self.conn.cursor() as cur:
            # FIX: Use positional :1, :2, :3, :4 binds to avoid reserved words
            cur.execute("""
                MERGE INTO USER_QUERIES u
                USING (SELECT :1 AS user_id, :2 AS query_hash, :3 AS query_text FROM dual) s
                ON (u.user_id = s.user_id AND u.query_hash = s.query_hash)
                WHEN NOT MATCHED THEN
                    INSERT (user_id, query_text, query_hash, answered_correctly)
                    VALUES (s.user_id, s.query_text, s.query_hash, :4)
            """, [user_id, query_hash, query_text, correct])
            self.conn.commit()

    def get_random_past_query(self, user_id):
        with self.conn.cursor() as cur:
            # FIX: Use DBMS_LOB.SUBSTR to safely compare CLOB data
            cur.execute("""
                SELECT query_text FROM USER_QUERIES
                WHERE user_id = :1 
                AND answered_correctly = 'N' 
                AND DBMS_LOB.SUBSTR(query_text, 13, 1) != 'SESSION_START'
                ORDER BY DBMS_RANDOM.VALUE FETCH FIRST 1 ROWS ONLY
            """, [user_id])
            row = cur.fetchone()
        
        if row:
            # Handle CLOB if returned as LOB object
            text = row[0]
            return text.read() if hasattr(text, 'read') else text
        return None

    def mark_correct(self, user_id, query_text):
        # Hash the query text to find the specific record
        query_hash = hashlib.sha256(query_text.encode("utf-8")).hexdigest()[:64]
        
        with self.conn.cursor() as cur:
            # FIX: Use :1 and :2 instead of named variables
            cur.execute("""
                UPDATE USER_QUERIES 
                SET answered_correctly = 'Y', timestamp = SYSTIMESTAMP
                WHERE user_id = :1 AND query_hash = :2
            """, [user_id, query_hash])
            self.conn.commit()

    def clear_table(self, table_name):
        """Wipes all data from the table to start fresh."""
        with self.conn.cursor() as cur:
            try:
                print(f"🧹 Clearing table {table_name}...")
                cur.execute(f"DELETE FROM {table_name}")
                self.conn.commit()
                print("✅ Table cleared.")
            except Exception as e:
                print(f"⚠️ Error clearing table: {e}")

    def insert_chunks(self, chunks, embeddings, filename, table_name="DOC_CHUNKS_V4"):
        """
        Batch inserts text chunks and vector embeddings into the DB.
        """
        print(f"💾 Inserting {len(chunks)} chunks into {table_name}...")
        
        with self.conn.cursor() as cur:
            data = []
            for i, (text, vec) in enumerate(zip(chunks, embeddings)):
                metadata = f'{{"source": "{filename}", "chunk_id": {i}}}'
                
                # --- FIX: Convert list to array.array ---
                # This tells Oracle "This is a VECTOR, not a list of parameters"
                # 'f' stands for float (32-bit), which matches Cohere/Oracle types
                vec_array = array.array('f', vec)
                
                data.append((text, vec_array, metadata))

            # Bulk insert
            try:
                cur.executemany(f"""
                    INSERT INTO {table_name} (chunk_text, embedding, metadata)
                    VALUES (:1, :2, :3)
                """, data)
                self.conn.commit()
                print("✅ Upload complete!")
            except Exception as e:
                print(f"❌ Error inserting data: {e}")