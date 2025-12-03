"""
FastAPI Backend for RAG Tutor
Run with: uvicorn api:app --reload --port 8000
"""

import os
import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from startup import setup_oracle_wallet

# Import your existing modules
from src.database import DatabaseManager
from src.rag_engine import RAGEngine

load_dotenv()

app = FastAPI(title="RAG Tutor API")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
db: DatabaseManager = None
rag: RAGEngine = None

# ============== MODELS ==============

class ChatRequest(BaseModel):
    question: str
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    user_id: str

class MCQRequest(BaseModel):
    user_id: str

class MCQResponse(BaseModel):
    has_question: bool
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    topic: Optional[str] = None

class AnswerCheckRequest(BaseModel):
    user_id: str
    topic: str
    user_answer: str
    correct_answer: str
    is_first_attempt: bool

class AnswerCheckResponse(BaseModel):
    is_correct: bool
    marked_mastered: bool

# ============== STARTUP ==============

@app.on_event("startup")
async def startup():
    global db, rag
    try:
        print("🚀 Starting RAG Tutor Backend...")
        
        # Setup wallet for production
        setup_oracle_wallet()  # ← ADD THIS LINE
        
        # Initialize database and RAG engine
        db = DatabaseManager()
        conn = db.connect()
        rag = RAGEngine(conn)
        
        print("✅ RAG Engine initialized successfully!")
        if rag and hasattr(rag, 'embeddings'):
            print(f"📚 Loaded {len(rag.embeddings)} document embeddings")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        raise e
# ============== ENDPOINTS ==============

@app.get("/health")
async def health_check():
    return {"status": "healthy", "rag_loaded": rag is not None}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not rag:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    user_id = request.user_id or str(uuid.uuid4())
    
    try:
        context, sources = rag.search(request.question)
        answer = rag.get_tutor_hint(request.question, context)
        db.log_query(user_id, request.question)
        
        return ChatResponse(
            answer=answer,
            sources=list(set(sources)),
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mcq/generate", response_model=MCQResponse)
async def generate_mcq(request: MCQRequest):
    if not rag:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    past_query = db.get_random_past_query(request.user_id)
    
    if not past_query:
        return MCQResponse(has_question=False)
    
    try:
        quiz_context, _ = rag.search(past_query, top_k=3)
        q_text, correct_ans, explanation = rag.generate_mcq(past_query, context=quiz_context)
        
        if q_text and correct_ans:
            return MCQResponse(
                has_question=True,
                question_text=q_text,
                correct_answer=correct_ans,
                explanation=explanation,
                topic=past_query
            )
        return MCQResponse(has_question=False)
    except Exception as e:
        print(f"MCQ generation error: {e}")
        return MCQResponse(has_question=False)


@app.post("/mcq/check", response_model=AnswerCheckResponse)
async def check_answer(request: AnswerCheckRequest):
    is_correct = request.user_answer.upper() == request.correct_answer.upper()
    marked_mastered = False
    
    if is_correct and request.is_first_attempt:
        try:
            db.mark_correct(request.user_id, request.topic)
            marked_mastered = True
        except Exception as e:
            print(f"Error marking correct: {e}")
    
    return AnswerCheckResponse(is_correct=is_correct, marked_mastered=marked_mastered)


@app.post("/session/new")
async def new_session():
    return {"user_id": str(uuid.uuid4())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)