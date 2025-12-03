# backend/models.py
from pydantic import BaseModel

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserStats(BaseModel):
    display_name: str
    total_queries: int
    total_mcqs_generated: int
    total_mcqs_answered: int
    total_mcqs_correct: int
    avg_accuracy: float
    streak_days: int
