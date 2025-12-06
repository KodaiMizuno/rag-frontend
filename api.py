"""
FastAPI Backend for RAG Tutor with Authentication
Run with: uvicorn api:app --reload --port 8000
"""

import os
import uuid
import hashlib
import json
import tempfile
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import jwt
import cohere

from startup import setup_oracle_wallet
from src.database import DatabaseManager
from src.rag_engine import RAGEngine
from src.ingest import process_single_file

load_dotenv()

app = FastAPI(title="RAG Tutor API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "https://rag-tutor-frontend.onrender.com")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Global instances
db: DatabaseManager = None
rag: RAGEngine = None

# ============== PYDANTIC MODELS ==============

# Auth Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    token: str

# Source Model (Rich)
class SourceInfo(BaseModel):
    filename: str
    title: str
    course_id: Optional[str] = None
    chunk_id: Optional[int] = None
    page_number: Optional[int] = None
    snippet: str
    relevance_score: float

# Chat Models
class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    course_id: Optional[str] = None
    category: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    chat_id: str
    message_id: str
    timestamp: str

class ChatInstance(BaseModel):
    chat_id: str
    title: str
    course_id: Optional[str] = None
    category: Optional[str] = None
    created_at: str
    updated_at: str

class ChatMessage(BaseModel):
    message_id: str
    role: str
    content: str
    sources: Optional[List[SourceInfo]] = None
    created_at: str

# Legacy Chat (for unauthenticated users)
class LegacyChatRequest(BaseModel):
    question: str
    user_id: Optional[str] = None
    


class LegacyChatResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    user_id: str

# MCQ Models
class MCQRequest(BaseModel):
    user_id: Optional[str] = None

class MCQResponse(BaseModel):
    has_question: bool
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    topic: Optional[str] = None

class AnswerCheckRequest(BaseModel):
    user_id: Optional[str] = None
    topic: str
    user_answer: str
    correct_answer: str
    is_first_attempt: bool

class AnswerCheckResponse(BaseModel):
    is_correct: bool
    marked_mastered: bool

# Dashboard Models
class StudentStats(BaseModel):
    user_id: str
    email: str
    name: str
    total_questions: int
    mastered_topics: int
    last_active: Optional[str] = None

class DashboardOverview(BaseModel):
    total_students: int
    total_questions: int
    questions_today: int
    mastery_rate: float

# Document Models
class DocumentInfo(BaseModel):
    doc_id: str
    title: str
    course_id: str
    content_type: str
    filename: str
    chunk_count: Optional[int] = None
    uploaded_at: str

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    """Hash password with SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, email: str, role: str) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(authorization: str = Header(None)) -> dict:
    """Verify JWT token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def optional_token(authorization: str = Header(None)) -> Optional[dict]:
    """Verify token if present, return None otherwise"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        return None

def require_teacher(user: dict = Depends(verify_token)) -> dict:
    """Require teacher role"""
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user

def format_sources(raw_sources: list) -> List[SourceInfo]:
    """Convert raw source dicts to SourceInfo objects"""
    formatted = []
    for src in raw_sources:
        if isinstance(src, dict):
            formatted.append(SourceInfo(
                filename=src.get("filename", "Unknown"),
                title=src.get("title", src.get("filename", "Unknown")),
                course_id=src.get("course_id"),
                chunk_id=src.get("chunk_id"),
                page_number=src.get("page_number"),
                snippet=src.get("snippet", "")[:300],
                relevance_score=src.get("relevance_score", 0.0)
            ))
        else:
            # Legacy string format
            formatted.append(SourceInfo(
                filename=str(src),
                title=str(src),
                snippet="",
                relevance_score=0.0
            ))
    return formatted

# ============== STARTUP ==============

@app.on_event("startup")
async def startup():
    global db, rag
    try:
        print("🚀 Starting RAG Tutor Backend...")
        
        # Setup wallet for production
        setup_oracle_wallet()
        
        # Initialize database and RAG engine
        db = DatabaseManager()
        conn = db.connect()
        rag = RAGEngine(conn)
        
        # Create tables if they don't exist
        create_tables_if_needed()
        
        print("✅ RAG Engine initialized successfully!")
        if rag and hasattr(rag, 'embeddings'):
            print(f"📚 Loaded {len(rag.embeddings)} document embeddings")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        raise e

def create_tables_if_needed():
    """Create authentication and chat tables if they don't exist"""
    tables_sql = [
        """
        BEGIN
            EXECUTE IMMEDIATE 'CREATE TABLE USERS (
                user_id VARCHAR2(36) PRIMARY KEY,
                email VARCHAR2(255) UNIQUE NOT NULL,
                password_hash VARCHAR2(255) NOT NULL,
                role VARCHAR2(20) DEFAULT ''student'',
                name VARCHAR2(255),
                created_at TIMESTAMP DEFAULT SYSTIMESTAMP
            )';
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE != -955 THEN RAISE; END IF;
        END;
        """,
        """
        BEGIN
            EXECUTE IMMEDIATE 'CREATE TABLE CHAT_INSTANCES (
                chat_id VARCHAR2(36) PRIMARY KEY,
                user_id VARCHAR2(36),
                title VARCHAR2(255),
                course_id VARCHAR2(50),
                category VARCHAR2(50),
                created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
                updated_at TIMESTAMP DEFAULT SYSTIMESTAMP
            )';
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE != -955 THEN RAISE; END IF;
        END;
        """,
        """
        BEGIN
            EXECUTE IMMEDIATE 'CREATE TABLE CHAT_MESSAGES (
                message_id VARCHAR2(36) PRIMARY KEY,
                chat_id VARCHAR2(36),
                role VARCHAR2(20),
                content CLOB,
                sources CLOB,
                created_at TIMESTAMP DEFAULT SYSTIMESTAMP
            )';
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE != -955 THEN RAISE; END IF;
        END;
        """,
        """
        BEGIN
            EXECUTE IMMEDIATE 'CREATE TABLE UPLOADED_DOCUMENTS (
                doc_id VARCHAR2(36) PRIMARY KEY,
                user_id VARCHAR2(36),
                title VARCHAR2(255),
                course_id VARCHAR2(50),
                content_type VARCHAR2(50),
                filename VARCHAR2(255),
                chunk_count NUMBER,
                uploaded_at TIMESTAMP DEFAULT SYSTIMESTAMP
            )';
        EXCEPTION WHEN OTHERS THEN
            IF SQLCODE != -955 THEN RAISE; END IF;
        END;
        """
    ]
    
    with db.conn.cursor() as cur:
        for sql in tables_sql:
            try:
                cur.execute(sql)
                db.conn.commit()
            except Exception as e:
                print(f"Table creation note: {e}")

# ============== HEALTH CHECK ==============

@app.get("/health")
async def health_check():
    return {"status": "healthy", "rag_loaded": rag is not None}

# ============== AUTH ENDPOINTS ==============

@app.post("/auth/register", response_model=UserResponse)
async def register(user: UserRegister):
    """Register a new user"""
    user_id = str(uuid.uuid4())
    password_hash = hash_password(user.password)
    
    try:
        with db.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO USERS (user_id, email, password_hash, role, name)
                VALUES (:1, :2, :3, :4, :5)
            """, [user_id, user.email.lower(), password_hash, user.role, user.name])
            db.conn.commit()
        
        token = create_token(user_id, user.email, user.role)
        return UserResponse(
            user_id=user_id,
            email=user.email,
            name=user.name,
            role=user.role,
            token=token
        )
    except Exception as e:
        if "unique constraint" in str(e).lower() or "ORA-00001" in str(e):
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    """Login with email and password"""
    password_hash = hash_password(credentials.password)
    
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT user_id, email, name, role FROM USERS
            WHERE LOWER(email) = :1 AND password_hash = :2
        """, [credentials.email.lower(), password_hash])
        row = cur.fetchone()
    
    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id, email, name, role = row
    token = create_token(user_id, email, role)
    
    return UserResponse(
        user_id=user_id,
        email=email,
        name=name or "",
        role=role,
        token=token
    )

@app.get("/auth/me")
async def get_current_user(user: dict = Depends(verify_token)):
    """Get current user info"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT user_id, email, name, role FROM USERS WHERE user_id = :1
        """, [user["user_id"]])
        row = cur.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": row[0],
        "email": row[1],
        "name": row[2],
        "role": row[3]
    }

# ============== CHAT HISTORY ENDPOINTS ==============

@app.get("/chats", response_model=List[ChatInstance])
async def get_chats(user: dict = Depends(verify_token)):
    """Get all chat instances for current user"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT chat_id, title, course_id, category, created_at, updated_at
            FROM CHAT_INSTANCES
            WHERE user_id = :1
            ORDER BY updated_at DESC
        """, [user["user_id"]])
        rows = cur.fetchall()
    
    return [
        ChatInstance(
            chat_id=row[0],
            title=row[1] or "New Chat",
            course_id=row[2],
            category=row[3],
            created_at=str(row[4]),
            updated_at=str(row[5])
        )
        for row in rows
    ]

@app.get("/chats/{chat_id}/messages", response_model=List[ChatMessage])
async def get_chat_messages(chat_id: str, user: dict = Depends(verify_token)):
    """Get all messages for a chat instance"""
    with db.conn.cursor() as cur:
        # Verify ownership
        cur.execute("""
            SELECT user_id FROM CHAT_INSTANCES WHERE chat_id = :1
        """, [chat_id])
        row = cur.fetchone()
        if not row or row[0] != user["user_id"]:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Get messages
        cur.execute("""
            SELECT message_id, role, content, sources, created_at
            FROM CHAT_MESSAGES
            WHERE chat_id = :1
            ORDER BY created_at ASC
        """, [chat_id])
        rows = cur.fetchall()
    
    messages = []
    for row in rows:
        content = row[2]
        if hasattr(content, 'read'):
            content = content.read()
        
        sources_raw = row[3]
        if sources_raw:
            if hasattr(sources_raw, 'read'):
                sources_raw = sources_raw.read()
            try:
                sources = format_sources(json.loads(sources_raw))
            except:
                sources = None
        else:
            sources = None
        
        messages.append(ChatMessage(
            message_id=row[0],
            role=row[1],
            content=content,
            sources=sources,
            created_at=str(row[4])
        ))
    
    return messages

@app.post("/chats", response_model=ChatResponse)
async def create_chat_and_message(request: ChatRequest, user: dict = Depends(verify_token)):
    """Create a new chat or send message to existing chat"""
    user_id = user["user_id"]
    chat_id = request.chat_id
    timestamp = datetime.utcnow()
    
    # Create new chat if needed
    if not chat_id:
        chat_id = str(uuid.uuid4())
        title = request.message[:50] + "..." if len(request.message) > 50 else request.message
        with db.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO CHAT_INSTANCES (chat_id, user_id, title, course_id, category, created_at, updated_at)
                VALUES (:1, :2, :3, :4, :5, :6, :7)
            """, [chat_id, user_id, title, request.course_id, request.category, timestamp, timestamp])
            db.conn.commit()
    
    # Get chat history for context
    history_text = ""
    try:
        messages = await get_chat_messages(chat_id, user)
        history_text = "\n".join([f"{m.role}: {m.content}" for m in messages[-10:]])
    except:
        pass
    
    # Search and generate response
    context, raw_sources = rag.search(request.message)
    sources = format_sources(raw_sources)
    
    # Include history in prompt
    if history_text:
        full_context = f"Previous conversation:\n{history_text}\n\nRelevant documents:\n" + "\n".join(context)
    else:
        full_context = "\n".join(context)
    
    answer = rag.get_tutor_hint(request.message, [full_context])
    
    # Save messages
    user_msg_id = str(uuid.uuid4())
    assistant_msg_id = str(uuid.uuid4())
    
    with db.conn.cursor() as cur:
        # User message
        cur.execute("""
            INSERT INTO CHAT_MESSAGES (message_id, chat_id, role, content, created_at)
            VALUES (:1, :2, 'user', :3, :4)
        """, [user_msg_id, chat_id, request.message, timestamp])
        
        # Assistant message with sources
        cur.execute("""
            INSERT INTO CHAT_MESSAGES (message_id, chat_id, role, content, sources, created_at)
            VALUES (:1, :2, 'assistant', :3, :4, :5)
        """, [assistant_msg_id, chat_id, answer, json.dumps([s.dict() for s in sources]), timestamp])
        
        # Update chat timestamp
        cur.execute("""
            UPDATE CHAT_INSTANCES SET updated_at = :1 WHERE chat_id = :2
        """, [timestamp, chat_id])
        
        db.conn.commit()
    
    # Log for MCQ
    db.log_query(user_id, request.message, is_guest=False)
    
    return ChatResponse(
        answer=answer,
        sources=sources,
        chat_id=chat_id,
        message_id=assistant_msg_id,
        timestamp=str(timestamp)
    )

@app.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str, user: dict = Depends(verify_token)):
    """Delete a chat instance and all its messages"""
    with db.conn.cursor() as cur:
        # Delete messages first
        cur.execute("DELETE FROM CHAT_MESSAGES WHERE chat_id = :1", [chat_id])
        # Delete chat
        cur.execute("""
            DELETE FROM CHAT_INSTANCES 
            WHERE chat_id = :1 AND user_id = :2
        """, [chat_id, user["user_id"]])
        db.conn.commit()
    
    return {"message": "Chat deleted"}

# ============== LEGACY CHAT (NO AUTH) ==============

@app.post("/chat", response_model=LegacyChatResponse)
async def legacy_chat(request: LegacyChatRequest):
    """Legacy chat endpoint for unauthenticated users"""
    if not rag:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    user_id = request.user_id or str(uuid.uuid4())
    
    try:
        context, raw_sources = rag.search(request.question)
        sources = format_sources(raw_sources)
        answer = rag.get_tutor_hint(request.question, context)
        db.log_query(user_id, request.question, is_guest=True)
        
        return LegacyChatResponse(
            answer=answer,
            sources=sources,
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== MCQ ENDPOINTS ==============

@app.post("/mcq/generate", response_model=MCQResponse)
async def generate_mcq(request: MCQRequest, user: Optional[dict] = Depends(optional_token)):
    """Generate MCQ from past queries"""
    if not rag:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    user_id = user["user_id"] if user else request.user_id
    if not user_id:
        return MCQResponse(has_question=False)
    
    past_query = db.get_random_past_query(user_id)
    
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
async def check_answer(request: AnswerCheckRequest, user: Optional[dict] = Depends(optional_token)):
    """Check MCQ answer"""
    user_id = user["user_id"] if user else request.user_id
    
    is_correct = request.user_answer.upper() == request.correct_answer.upper()
    marked_mastered = False
    
    if is_correct and request.is_first_attempt and user_id:
        try:
            db.mark_correct(user_id, request.topic)
            marked_mastered = True
        except Exception as e:
            print(f"Error marking correct: {e}")
    
    return AnswerCheckResponse(is_correct=is_correct, marked_mastered=marked_mastered)

# ============== DOCUMENT UPLOAD (TEACHERS ONLY) ==============

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    course_id: str = Form(...),
    content_type: str = Form(...),
    user: dict = Depends(require_teacher)
):
    """Upload and process a document (teachers only)"""
    doc_id = str(uuid.uuid4())
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Process through ingest pipeline
        co = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))
        chunks_created = process_single_file(db, co, tmp_path, title=title, course_id=course_id)
        
        # Save metadata
        with db.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO UPLOADED_DOCUMENTS (doc_id, user_id, title, course_id, content_type, filename, chunk_count)
                VALUES (:1, :2, :3, :4, :5, :6, :7)
            """, [doc_id, user["user_id"], title, course_id, content_type, file.filename, chunks_created])
            db.conn.commit()
        
        # Reload RAG engine to include new documents
        global rag
        rag = RAGEngine(db.conn)
        
        return {
            "doc_id": doc_id,
            "chunks_created": chunks_created,
            "message": "Document processed and indexed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    finally:
        os.unlink(tmp_path)

@app.get("/documents", response_model=List[DocumentInfo])
async def get_documents(user: dict = Depends(require_teacher)):
    """Get all uploaded documents (teachers only)"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT doc_id, title, course_id, content_type, filename, chunk_count, uploaded_at
            FROM UPLOADED_DOCUMENTS
            WHERE user_id = :1
            ORDER BY uploaded_at DESC
        """, [user["user_id"]])
        rows = cur.fetchall()
    
    return [
        DocumentInfo(
            doc_id=row[0],
            title=row[1],
            course_id=row[2],
            content_type=row[3],
            filename=row[4],
            chunk_count=row[5],
            uploaded_at=str(row[6])
        )
        for row in rows
    ]

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(require_teacher)):
    """Delete a document and its chunks (teachers only)"""
    # Get document info
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT filename, course_id FROM UPLOADED_DOCUMENTS
            WHERE doc_id = :1 AND user_id = :2
        """, [doc_id, user["user_id"]])
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        
        filename, course_id = row
        
        # Delete chunks from vector DB (match by source in metadata)
        cur.execute("""
            DELETE FROM DOC_CHUNKS_V4 
            WHERE metadata LIKE :1
        """, [f'%"source": "{filename}"%'])
        
        # Delete document record
        cur.execute("""
            DELETE FROM UPLOADED_DOCUMENTS WHERE doc_id = :1
        """, [doc_id])
        
        db.conn.commit()
    
    # Reload RAG engine
    global rag
    rag = RAGEngine(db.conn)
    
    return {"message": "Document and chunks deleted"}

# ============== TEACHER DASHBOARD ==============

@app.get("/dashboard/overview", response_model=DashboardOverview)
async def get_dashboard_overview(user: dict = Depends(require_teacher)):
    """Get dashboard overview stats (teachers only)"""
    with db.conn.cursor() as cur:
        # Total students
        cur.execute("SELECT COUNT(*) FROM USERS WHERE role = 'student'")
        total_students = cur.fetchone()[0] or 0
        
        # Total questions asked
        cur.execute("""
            SELECT COUNT(*) FROM USER_QUERIES 
            WHERE DBMS_LOB.SUBSTR(query_text, 13, 1) != 'SESSION_START'
        """)
        total_questions = cur.fetchone()[0] or 0
        
        # Questions today
        cur.execute("""
            SELECT COUNT(*) FROM USER_QUERIES 
            WHERE timestamp > TRUNC(SYSDATE) 
            AND DBMS_LOB.SUBSTR(query_text, 13, 1) != 'SESSION_START'
        """)
        questions_today = cur.fetchone()[0] or 0
        
        # Mastery rate
        cur.execute("""
            SELECT 
                SUM(CASE WHEN answered_correctly = 'Y' THEN 1 ELSE 0 END) as mastered,
                COUNT(*) as total
            FROM USER_QUERIES
            WHERE DBMS_LOB.SUBSTR(query_text, 13, 1) != 'SESSION_START'
        """)
        row = cur.fetchone()
        mastered = row[0] or 0
        total = row[1] or 1
        mastery_rate = (mastered / total * 100) if total > 0 else 0
    
    return DashboardOverview(
        total_students=total_students,
        total_questions=total_questions,
        questions_today=questions_today,
        mastery_rate=round(mastery_rate, 1)
    )

@app.get("/dashboard/students", response_model=List[StudentStats])
async def get_student_stats(user: dict = Depends(require_teacher)):
    """Get all students with their statistics"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT 
                u.user_id,
                u.email,
                u.name,
                COUNT(DISTINCT q.query_hash) as total_questions,
                SUM(CASE WHEN q.answered_correctly = 'Y' THEN 1 ELSE 0 END) as mastered,
                MAX(q.timestamp) as last_active
            FROM USERS u
            LEFT JOIN USER_QUERIES q ON u.user_id = q.user_id
            WHERE u.role = 'student'
            GROUP BY u.user_id, u.email, u.name
            ORDER BY last_active DESC NULLS LAST
        """)
        rows = cur.fetchall()
    
    return [
        StudentStats(
            user_id=row[0],
            email=row[1],
            name=row[2] or "Unknown",
            total_questions=row[3] or 0,
            mastered_topics=row[4] or 0,
            last_active=str(row[5]) if row[5] else None
        )
        for row in rows
    ]


@app.get("/dashboard/popular-topics")
async def get_popular_topics(user: dict = Depends(require_teacher)):
    """Get most asked topics (teachers only)"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT query_text, COUNT(*) as count
            FROM USER_QUERIES
            WHERE DBMS_LOB.SUBSTR(query_text, 13, 1) != 'SESSION_START'
            GROUP BY query_text
            ORDER BY count DESC
            FETCH FIRST 10 ROWS ONLY
        """)
        rows = cur.fetchall()
    
    topics = []
    for row in rows:
        text = row[0]
        if hasattr(text, 'read'):
            text = text.read()
        topics.append({
            "topic": text[:100] + "..." if len(text) > 100 else text,
            "count": row[1]
        })
    
    return topics

@app.post("/session/cleanup")
async def cleanup_guest_session(user_id: str = None):
    """Clean up guest session data when they leave"""
    if user_id:
        db.cleanup_guest_sessions(user_id)
    return {"message": "Cleaned up"}


@app.get("/dashboard/student/search")
async def search_student_by_email(email: str, user: dict = Depends(require_teacher)):
    """Search for a student by email"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT 
                u.user_id,
                u.email,
                u.name,
                COUNT(DISTINCT q.query_hash) as total_questions,
                SUM(CASE WHEN q.answered_correctly = 'Y' THEN 1 ELSE 0 END) as mastered,
                MAX(q.timestamp) as last_active
            FROM USERS u
            LEFT JOIN USER_QUERIES q ON u.user_id = q.user_id
            WHERE LOWER(u.email) = LOWER(:1) AND u.role = 'student'
            GROUP BY u.user_id, u.email, u.name
        """, [email])
        row = cur.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "user_id": row[0],
        "email": row[1],
        "name": row[2] or "Unknown",
        "total_questions": row[3] or 0,
        "mastered_topics": row[4] or 0,
        "last_active": str(row[5]) if row[5] else None
    }


@app.get("/dashboard/student/{student_id}/activity")
async def get_student_activity(student_id: str, user: dict = Depends(require_teacher)):
    """Get all activity/questions for a specific student"""
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT query_text, answered_correctly, timestamp
            FROM USER_QUERIES
            WHERE user_id = :1
            ORDER BY timestamp DESC
        """, [student_id])
        rows = cur.fetchall()
    
    activity = []
    for row in rows:
        query_text = row[0]
        # Handle CLOB
        if hasattr(query_text, 'read'):
            query_text = query_text.read()
        
        activity.append({
            "query_text": query_text,
            "answered_correctly": row[1] or 'N',
            "timestamp": str(row[2]) if row[2] else None
        })
    
    return activity


# ============== SESSION ==============

@app.post("/session/new")
async def new_session():
    """Create a new anonymous session"""
    return {"user_id": str(uuid.uuid4())}

# ============== MAIN ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
