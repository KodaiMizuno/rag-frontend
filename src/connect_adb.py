import os
import oracledb
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

DB_USER = os.getenv("ADB_USER")
DB_PASSWORD = os.getenv("ADB_PASSWORD")
CONNECT_STRING = os.getenv("ADB_CONNECT_STR")
WALLET_PATH = os.getenv("ADB_WALLET_PATH")
WALLET_PASSWORD = os.getenv("ADB_WALLET_PASSWORD")

def run_app():
    try:
        print("Connecting to ADB with wallet (mTLS)...")

        # Use wallet-based connection (required for mTLS databases)
        connection = oracledb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            dsn=CONNECT_STRING,
            config_dir=WALLET_PATH,
            wallet_location=WALLET_PATH,
            wallet_password=WALLET_PASSWORD
        )

        with connection.cursor() as cursor:
            cursor.execute("SELECT 'Connected to ADB successfully!' FROM dual")
            result = cursor.fetchone()
            print(result[0])

    except oracledb.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_app()

