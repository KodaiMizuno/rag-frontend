import os
import sys
import oracledb
from dotenv import load_dotenv

# === Load environment variables ===
load_dotenv()

# Read variables from .env
WALLET_DIR = os.getenv("TNS_ADMIN")
DB_USER = os.getenv("ADB_USER")
DB_PASSWORD = os.getenv("ADB_PASSWORD")
DB_CONNECT_STR = os.getenv("ADB_CONNECT_STR")

# === Diagnostics ===
print("🔧 Diagnostic info")
print("TNS_ADMIN env var:", os.environ.get("TNS_ADMIN"))
print("WALLET_DIR:", WALLET_DIR)
print("ADB_USER:", DB_USER)
print("ADB_CONNECT_STR:", DB_CONNECT_STR)
print("Exists WALLET_DIR?", os.path.exists(WALLET_DIR))
print("Contents of WALLET_DIR:", os.listdir(WALLET_DIR) if os.path.exists(WALLET_DIR) else "N/A")
print("Exists tnsnames.ora?", os.path.exists(os.path.join(WALLET_DIR, "tnsnames.ora")))
print("-----")

# === Connection Test ===
try:
    print("🔌 Connecting...")
    conn = oracledb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_CONNECT_STR,
        config_dir=WALLET_DIR
    )
    print("✅ Connected successfully to TutorDatabase!")
    conn.close()
except oracledb.Error as e:
    print("❌ Connection failed:")
    print(str(e))
    sys.exit(1)
