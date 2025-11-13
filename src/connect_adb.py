import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# DATABASE CONNECTION
# -----------------------------
def connect_adb():
    """
    Establishes a secure connection to your Oracle Autonomous Database
    using wallet-based authentication.
    """
    try:
        conn = oracledb.connect(
            user=os.getenv("ADB_USER"),
            password=os.getenv("ADB_PASSWORD"),
            dsn=os.getenv("ADB_CONNECT_STR"),
            config_dir=os.getenv("ADB_WALLET_PATH"),
            wallet_location=os.getenv("ADB_WALLET_PATH"),
            wallet_password=os.getenv("ADB_WALLET_PASSWORD"),
            ssl_server_dn_match=True
        )
        print("🔌 Connected to TutorDatabase successfully.")
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise


print("🔌 Connecting to TutorDatabase...")
conn = connect_adb()
print("✅ Connected successfully!")
