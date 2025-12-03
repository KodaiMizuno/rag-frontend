# backend/database.py
import oracledb
import os

oracledb.init_oracle_client(lib_dir=os.getenv("ORACLE_CLIENT_LIB"))

def get_connection():
    return oracledb.connect(
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dsn=os.getenv("DB_DSN")  # e.g. "yourhost_tp"
    )