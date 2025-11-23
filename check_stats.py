import os
from dotenv import load_dotenv  # <--- NEW
from src.database import DatabaseManager
import oracledb

# Load the keys from .env
load_dotenv()  # <--- NEW

def main():
    print("🔌 Connecting to Database...")
    
    # Initialize the manager (now it can see the env variables)
    try:
        db = DatabaseManager()
        db.connect()
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return

    table_name = "DOC_CHUNKS_V4"

    with db.conn.cursor() as cur:
        # 1. Get Total Count
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cur.fetchone()[0]
            print(f"\n📊 Total Chunks in {table_name}: {count}")
        except oracledb.DatabaseError as e:
            print(f"❌ Error reading table: {e}")
            return

        # 2. Get distinct filenames
        try:
            print("\n📂 Documents currently in the library:")
            cur.execute(f"SELECT DISTINCT json_value(metadata, '$.source') FROM {table_name}")
            files = cur.fetchall()
            if files:
                for f in files:
                    print(f"   - {f[0]}")
            else:
                print("   (No documents found)")
        except Exception:
            print("   (Could not list filenames)")

if __name__ == "__main__":
    main()