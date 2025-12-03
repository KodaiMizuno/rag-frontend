# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
from models import RegisterRequest, LoginRequest, TokenResponse, UserStats
from auth import hash_password, check_password, create_access_token, get_user, create_user
from crud import get_user_stats, get_leaderboard, log_event

SECRET_KEY = "SUPER_SECRET_KEY"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
app = FastAPI()

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# -------- AUTH ---------

@app.post("/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest):
    hashed = hash_password(req.password)
    user_id = create_user(req.email, hashed, req.display_name)
    token = create_access_token(user_id)
    return TokenResponse(access_token=token)


@app.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user = get_user(req.email)
    if not user:
        raise HTTPException(404, "User not found")

    user_id, stored_hash = user

    if not check_password(req.password, stored_hash):
        raise HTTPException(401, "Incorrect password")

    token = create_access_token(user_id)
    return TokenResponse(access_token=token)


# -------- LEADERBOARD ---------

@app.get("/leaderboard")
def leaderboard():
    rows = get_leaderboard()
    return [
        {
            "display_name": r[0],
            "total_queries": r[1],
            "total_mcqs_generated": r[2],
            "total_mcqs_answered": r[3],
            "total_mcqs_correct": r[4],
            "avg_accuracy": float(r[5]),
            "streak_days": r[6]
        }
        for r in rows
    ]


# -------- USER STATS ---------

@app.get("/users/me/stats", response_model=UserStats)
def my_stats(user_id: str = Depends(get_current_user)):
    row = get_user_stats(user_id)
    if not row:
        raise HTTPException(404, "Stats not found")

    return UserStats(
        display_name=row[0],
        total_queries=row[1],
        total_mcqs_generated=row[2],
        total_mcqs_answered=row[3],
        total_mcqs_correct=row[4],
        avg_accuracy=float(row[5]),
        streak_days=row[6]
    )
