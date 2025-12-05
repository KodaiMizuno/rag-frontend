# backend/database.py
import oracledb
import os

# Use thin mode with wallet (no Oracle client required)
# Set these environment variables:
#   TNS_ADMIN - path to wallet folder
#   ADB_DSN - e.g. "aitutordb_tp"
#   ADB_USER - e.g. "ADMIN"
#   ADB_PASSWORD - your database password
#   WALLET_PASSWORD - wallet password (if encrypted)

# Connection pool (much faster than creating new connections each time)
_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = oracledb.create_pool(
            user=os.getenv("ADB_USER"),
            password=os.getenv("ADB_PASSWORD"),
            dsn=os.getenv("ADB_DSN"),
            wallet_location=os.getenv("TNS_ADMIN"),
            wallet_password=os.getenv("WALLET_PASSWORD"),
            min=1,
            max=4,
            increment=1,
        )
    return _pool

def get_connection():
    """Get a connection from the pool."""
    return get_pool().acquire()