"""
Database Manager for RAG Tutor
Handles user queries, mastery tracking, and guest session cleanup
"""

import os
import hashlib
import oracledb

class DatabaseManager:
    def __init__(self):
        self.conn = None
        
    def connect(self):
        """Connect to Oracle Autonomous Database."""
        wallet_path = os.getenv("ADB_WALLET_PATH", "wallet_dir")
        
        self.conn = oracledb.connect(
            user=os.getenv("ADB_USER"),
            password=os.getenv("ADB_PASSWORD"),
            dsn=os.getenv("ADB_CONNECT_STR"),
            config_dir=wallet_path,
            wallet_location=wallet_path,
            wallet_password=os.getenv("ADB_WALLET_PASSWORD")
        )
        print("✅ Connected to Oracle Autonomous Database!")
        
        # Ensure tables exist
        self._create_tables_if_needed()
        
        return self.conn
    
    def _create_tables_if_needed(self):
        """Create USER_QUERIES table if it doesn't exist."""
        create_sql = """
        BEGIN
            EXECUTE IMMEDIATE '
                CREATE TABLE USER_QUERIES (
                    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id VARCHAR2(100) NOT NULL,
                    query_text CLOB NOT NULL,
                    query_hash VARCHAR2(64) NOT NULL,
                    answered_correctly VARCHAR2(1) DEFAULT ''N'',
                    is_guest VARCHAR2(1) DEFAULT ''N'',
                    timestamp TIMESTAMP DEFAULT SYSTIMESTAMP
                )
            ';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLCODE != -955 THEN
                    RAISE;
                END IF;
        END;
        """
        
        # Create index for faster lookups
        index_sql = """
        BEGIN
            EXECUTE IMMEDIATE 'CREATE INDEX idx_user_queries_user_id ON USER_QUERIES(user_id)';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLCODE != -955 THEN
                    RAISE;
                END IF;
        END;
        """
        
        with self.conn.cursor() as cur:
            try:
                cur.execute(create_sql)
                cur.execute(index_sql)
                self.conn.commit()
            except Exception as e:
                print(f"Note: Table setup - {e}")
    
    def log_query(self, user_id: str, query_text: str, is_guest: bool = False):
        """
        Log a user's question for future MCQ generation.
        
        Args:
            user_id: Unique identifier for the user
            query_text: The question they asked
            is_guest: Whether this is a guest (temporary) session
        """
        # Create hash to check for duplicates
        query_hash = hashlib.sha256(query_text.lower().strip().encode()).hexdigest()
        guest_flag = 'Y' if is_guest else 'N'
        
        with self.conn.cursor() as cur:
            # Check if this exact question was already asked by this user
            cur.execute("""
                SELECT COUNT(*) FROM USER_QUERIES 
                WHERE user_id = :1 AND query_hash = :2
            """, [user_id, query_hash])
            
            if cur.fetchone()[0] == 0:
                # New question - insert it
                cur.execute("""
                    INSERT INTO USER_QUERIES (user_id, query_text, query_hash, is_guest)
                    VALUES (:1, :2, :3, :4)
                """, [user_id, query_text, query_hash, guest_flag])
                self.conn.commit()
                print(f"📝 Logged query for user {user_id[:8]}...")
            else:
                print(f"ℹ️ Query already exists for user {user_id[:8]}...")
    
    def get_random_past_query(self, user_id: str) -> str:
        """
        Get a random past question from THIS USER ONLY that hasn't been mastered.
        
        Args:
            user_id: The specific user's ID
            
        Returns:
            A random question string, or None if no questions available
        """
        with self.conn.cursor() as cur:
            # Get random unmastered query FOR THIS SPECIFIC USER
            cur.execute("""
                SELECT query_text FROM (
                    SELECT query_text 
                    FROM USER_QUERIES 
                    WHERE user_id = :1 
                    AND answered_correctly = 'N'
                    ORDER BY DBMS_RANDOM.VALUE
                )
                WHERE ROWNUM = 1
            """, [user_id])
            
            row = cur.fetchone()
            if row:
                text = row[0]
                # Handle CLOB
                if hasattr(text, 'read'):
                    text = text.read()
                return text
            return None
    
    def mark_correct(self, user_id: str, query_text: str):
        """
        Mark a question as mastered for THIS USER.
        
        Args:
            user_id: The specific user's ID
            query_text: The question that was answered correctly
        """
        query_hash = hashlib.sha256(query_text.lower().strip().encode()).hexdigest()
        
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE USER_QUERIES 
                SET answered_correctly = 'Y' 
                WHERE user_id = :1 AND query_hash = :2
            """, [user_id, query_hash])
            self.conn.commit()
            print(f"✅ Marked as mastered for user {user_id[:8]}...")
    
    def get_user_stats(self, user_id: str) -> dict:
        """
        Get statistics for a specific user.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Dict with total_questions and mastered_topics counts
        """
        with self.conn.cursor() as cur:
            # Total questions asked by this user
            cur.execute("""
                SELECT COUNT(*) FROM USER_QUERIES WHERE user_id = :1
            """, [user_id])
            total = cur.fetchone()[0]
            
            # Mastered topics for this user
            cur.execute("""
                SELECT COUNT(*) FROM USER_QUERIES 
                WHERE user_id = :1 AND answered_correctly = 'Y'
            """, [user_id])
            mastered = cur.fetchone()[0]
            
            return {
                "total_questions": total,
                "mastered_topics": mastered
            }
    
    def cleanup_guest_sessions(self, guest_user_id: str = None):
        """
        Delete guest session data.
        
        Args:
            guest_user_id: Specific guest ID to clean up.
                          If None, cleans up ALL guest data.
        """
        with self.conn.cursor() as cur:
            if guest_user_id:
                # Delete specific guest's data
                cur.execute("""
                    DELETE FROM USER_QUERIES 
                    WHERE user_id = :1 AND is_guest = 'Y'
                """, [guest_user_id])
                deleted = cur.rowcount
                print(f"🧹 Cleaned up {deleted} queries for guest {guest_user_id[:8]}...")
            else:
                # Delete all guest data older than 24 hours
                cur.execute("""
                    DELETE FROM USER_QUERIES 
                    WHERE is_guest = 'Y' 
                    AND timestamp < SYSTIMESTAMP - INTERVAL '24' HOUR
                """)
                deleted = cur.rowcount
                print(f"🧹 Cleaned up {deleted} old guest queries...")
            
            self.conn.commit()
    
    def cleanup_old_guest_data(self):
        """
        Scheduled cleanup: Remove guest data older than 24 hours.
        Call this periodically (e.g., daily cron job).
        """
        with self.conn.cursor() as cur:
            cur.execute("""
                DELETE FROM USER_QUERIES 
                WHERE is_guest = 'Y' 
                AND timestamp < SYSTIMESTAMP - INTERVAL '24' HOUR
            """)
            deleted = cur.rowcount
            self.conn.commit()
            print(f"🧹 Scheduled cleanup: Removed {deleted} old guest queries")
            return deleted
    
    # ============== VECTOR DB METHODS ==============
    
    def insert_chunks(self, chunks, embeddings, source, table_name="DOC_CHUNKS_V4"):
        """Insert document chunks with embeddings."""
        import array
        
        print(f"💾 Inserting {len(chunks)} chunks into {table_name}...")
        
        with self.conn.cursor() as cur:
            data = []
            for chunk_data, vec in zip(chunks, embeddings):
                # Handle both dict format and string format
                if isinstance(chunk_data, dict):
                    text = chunk_data["text"]
                    metadata = chunk_data.get("metadata", source)
                else:
                    text = chunk_data
                    metadata = source
                
                vec_array = array.array('f', vec)
                data.append((text, vec_array, metadata))

            try:
                cur.executemany(f"""
                    INSERT INTO {table_name} (chunk_text, embedding, metadata)
                    VALUES (:1, :2, :3)
                """, data)
                self.conn.commit()
                print("✅ Upload complete!")
            except Exception as e:
                print(f"❌ Error inserting data: {e}")
    
    def clear_table(self, table_name):
        """Clear all data from a table."""
        with self.conn.cursor() as cur:
            cur.execute(f"DELETE FROM {table_name}")
            self.conn.commit()
            print(f"🗑️ Cleared all data from {table_name}")
    
    def get_session_user_id(self, reset_user=False):
        """Get or create a persistent user ID (for CLI usage)."""
        id_file = "data/session_user_id.txt"
        
        if reset_user:
            import uuid
            new_id = str(uuid.uuid4())
            os.makedirs("data", exist_ok=True)
            with open(id_file, "w") as f:
                f.write(new_id)
            return new_id
        
        if os.path.exists(id_file):
            with open(id_file, "r") as f:
                return f.read().strip()
        else:
            import uuid
            new_id = str(uuid.uuid4())
            os.makedirs("data", exist_ok=True)
            with open(id_file, "w") as f:
                f.write(new_id)
            return new_id