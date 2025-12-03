# backend/auth.py
import jwt
import bcrypt
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException
from database import get_connection

SECRET_KEY = "SUPER_SECRET_KEY"  # put in env variable

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user_id: str):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_user(email: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, password_hash FROM USERS WHERE email = :e", {"e": email})
    row = cursor.fetchone()
    conn.close()
    return row

def create_user(email: str, hashed_pw: str, display_name: str):
    user_id = str(uuid.uuid4())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO USERS (user_id, email, password_hash, display_name)
        VALUES (:id, :e, :pw, :dn)
    """, {"id": user_id, "e": email, "pw": hashed_pw, "dn": display_name})

    cursor.execute("""
        INSERT INTO USER_STATS (user_id)
        VALUES (:id)
    """, {"id": user_id})

    conn.commit()
    conn.close()

    return user_id
