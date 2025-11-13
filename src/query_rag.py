import os, json, numpy as np, oracledb
from sklearn.metrics.pairwise import cosine_similarity
import cohere
from dotenv import load_dotenv
import uuid
from pathlib import Path
import hashlib
import re



load_dotenv()

# -----------------------------
# CONFIG
# -----------------------------
WALLET_DIR = os.getenv("ADB_WALLET_PATH")
DB_USER = os.getenv("ADB_USER")
DB_PASSWORD = os.getenv("ADB_PASSWORD")
DB_DSN = os.getenv("ADB_CONNECT_STR")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
wallet_password=os.getenv("ADB_WALLET_PASSWORD")
TABLE_NAME = "DOC_CHUNKS_V4"
TOP_K = 5

# -----------------------------
# DB LOAD
# -----------------------------
print("🔌 Connecting to TutorDatabase...")
conn = oracledb.connect(
    user=DB_USER,
    password=DB_PASSWORD,
    dsn=DB_DSN,
    config_dir=WALLET_DIR,
    wallet_location=WALLET_DIR,
    wallet_password=wallet_password,
    ssl_server_dn_match=True
)
cur = conn.cursor()
cur.execute(f"SELECT chunk_text, embedding, metadata FROM {TABLE_NAME}")
rows = cur.fetchall()

texts, embeddings = [], []
for text, vec, meta in rows:
    texts.append(text.read() if hasattr(text, "read") else text)
    embeddings.append(np.array(vec, dtype=np.float32))

cur.close()
print(f"✅ Loaded {len(embeddings)} embeddings from {TABLE_NAME}")

# -----------------------------
# 🔑 User Session Setup
# -----------------------------
USER_ID_PATH = Path("data/session_user_id.txt")
reset_user = False
question = "what is the data science life cycle"

def get_session_user_id(conn, reset_user=False):
    """
    Returns a persistent user_id for the current session.
    - Reuses same ID across runs unless reset_user=True.
    - Logs session start in USER_QUERIES table.
    - If reset_user=True, cleans up old database records for that user.
    """
    USER_ID_PATH.parent.mkdir(parents=True, exist_ok=True)

    # ♻️ Optional manual reset
    if reset_user and USER_ID_PATH.exists():
        old_user_id = USER_ID_PATH.read_text().strip()
        
        # 🗑️ Clean up old user's database records
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM USER_QUERIES WHERE user_id = :1", [old_user_id])
            conn.commit()
            deleted_count = cur.rowcount
            print(f"🗑️ Deleted {deleted_count} old query records for previous user.")
        except Exception as e:
            print(f"⚠️ Could not delete old records: {e}")
        finally:
            cur.close()
        
        USER_ID_PATH.unlink()
        print("♻️ Session user ID reset (reset_user=True).")

    # ✅ Reuse existing user ID if available
    if USER_ID_PATH.exists():
        user_id = USER_ID_PATH.read_text().strip()
        print(f"👤 Reusing existing session user ID: {user_id}")
        return user_id

    # 🆕 Otherwise, create a new one
    user_id = str(uuid.uuid4())
    USER_ID_PATH.write_text(user_id)
    print(f"🆕 Created new session user ID: {user_id}")

    # 🗂️ Log session start in DB
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO USER_QUERIES (user_id, query_text, timestamp) VALUES (:1, 'SESSION_START', SYSTIMESTAMP)",
            [user_id]
        )
        conn.commit()
        print("🗂️ Session start logged in DB.")
    except Exception as e:
        print(f"⚠️ Could not record session start: {e}")
    finally:
        cur.close()

    return user_id

user_id = get_session_user_id(conn, reset_user=reset_user)
print(f"💾 Current session user: {user_id}")
# -----------------------------
# QUERY EMBEDDING
# -----------------------------
co = cohere.ClientV2(api_key=COHERE_API_KEY)

print(f"\n🧠 Generating query embedding for: '{question}' …")
resp = co.embed(
    model="embed-english-v3.0",
    texts=[question],
    input_type="search_query",
    embedding_types=["float"] 
)
query_vec = np.array(resp.embeddings.float[0], dtype=np.float32).reshape(1, -1)
print(f"✅ Query embedding shape: {query_vec.shape}")

# -----------------------------
# Logging query
# -----------------------------

def log_user_query(conn, user_id, query_text):
    """Insert a new query if it hasn’t been logged yet."""
    cur = conn.cursor()
    query_hash = hashlib.sha256(query_text.encode("utf-8")).hexdigest()[:64]

    cur.execute("""
        MERGE INTO USER_QUERIES u
        USING (SELECT :user_id AS user_id, :query_hash AS query_hash, :query_text AS query_text FROM dual) s
        ON (u.user_id = s.user_id AND u.query_hash = s.query_hash)
        WHEN NOT MATCHED THEN
            INSERT (user_id, query_text, query_hash)
            VALUES (s.user_id, s.query_text, s.query_hash)
    """, [user_id, query_hash, query_text])

    conn.commit()
    cur.close()
# -----------------------------
# COSINE SIMILARITY
# -----------------------------
embeddings = np.vstack(embeddings).astype(np.float32)

# Clean invalid values first
embeddings = np.nan_to_num(embeddings, nan=0.0, posinf=0.0, neginf=0.0)
query_vec = np.nan_to_num(query_vec, nan=0.0, posinf=0.0, neginf=0.0)

# Clip extreme values to prevent overflow
embeddings = np.clip(embeddings, -1e10, 1e10)
query_vec = np.clip(query_vec, -1e10, 1e10)

# Safer normalization
def safe_normalize(vectors):
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-12)  # Avoid division by zero
    return vectors / norms

embeddings = safe_normalize(embeddings)
query_vec = safe_normalize(query_vec)

scores = cosine_similarity(query_vec, embeddings)[0]
top_idxs = np.argsort(scores)[-TOP_K:][::-1]

## Uncommet this to see the topK chunks 
# print("\n📘 Top Retrieved Contexts:\n")
# for rank, i in enumerate(top_idxs, start=1):
#     print(f"#{rank} | Score {scores[i]:.3f}\n{texts[i][:150]}...\n")

# -----------------------------
# HINT GENERATION
# -----------------------------
context = "\n\n".join([texts[i] for i in top_idxs])
prompt = f"""
You are an experienced data science teaching assistant who helps students understand complex topics 
through guided reasoning rather than direct answers.

Your role:
- Provide conceptual explanations and hints that help the student think critically.
- Encourage exploration by asking guiding questions or clarifying relevant principles.
- Avoid giving full solutions or code outputs.
- When applicable, refer to data science techniques, Python methods, or statistical reasoning concisely.

Context:
{context}

Student's Question:
{question}

Now, respond as a helpful TA:
1. Offer a brief explanation of the underlying concept.
2. Give 2-3 hints or questions that guide the student toward the solution.
3. Be concise, clear, and friendly.
"""

gen = co.chat(
    model="command-a-03-2025",
    messages=[
        {"role": "system", "content": "You are a helpful teaching assistant."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.7,
    max_tokens=300
)


full_text = "".join([c.text for c in gen.message.content if c.type == "text"])
print("\n💡 Tutor Hint:\n")
print(full_text)


# -----------------------------
# Getting past query for MCQ
# -----------------------------
def get_random_past_query(conn, user_id):
    cur = conn.cursor()
    cur.execute("""
        SELECT query_text 
        FROM USER_QUERIES
        WHERE user_id = :1
        AND answered_correctly = 'N'
        AND query_text NOT LIKE 'SESSION_START'
        ORDER BY DBMS_RANDOM.VALUE
        FETCH FIRST 1 ROWS ONLY
    """, [user_id])
    row = cur.fetchone()
    cur.close()
    return row[0] if row else None

def generate_mcq(co, past_query):
    """
    Generates a well-structured MCQ question with answer and explanation.
    Ensures consistent format for reliable parsing.
    """
    prompt = f"""
You are a data science teaching assistant. 
Generate one multiple-choice question (MCQ) based on the following concept or question:
"{past_query}"

Format your answer EXACTLY like this:
Question: <the question text>

A) <choice A>  
B) <choice B>  
C) <choice C>  
D) <choice D>  

Correct Answer: <A/B/C/D>  
Explanation: <1–3 sentence explanation of why this is the correct answer and what concept it reinforces.>
    """

    response = co.chat(
        model="command-a-03-2025",
        messages=[
            {"role": "system", "content": "You are a data science tutor who creates short MCQs to reinforce understanding."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=300
    )

    mcq_text = response.message.content[0].text.strip()
    return mcq_text


def parse_mcq(mcq_text):
    """
    Parses MCQ text and separates question/choices from answer/explanation.
    Returns: (question_with_choices, correct_answer, explanation)
    """
    # Extract the question and choices (everything before "Correct Answer:")
    question_match = re.search(r"(Question:.*?)(?=Correct Answer:)", mcq_text, re.DOTALL)
    question_with_choices = question_match.group(1).strip() if question_match else ""
    
    # Extract correct answer
    answer_match = re.search(r"Correct Answer:\s*([A-D])", mcq_text)
    correct_answer = answer_match.group(1).strip().upper() if answer_match else None
    
    # Extract explanation
    explanation_match = re.search(r"Explanation:\s*(.+)", mcq_text, re.DOTALL)
    explanation = explanation_match.group(1).strip() if explanation_match else ""
    
    return question_with_choices, correct_answer, explanation


def mark_query_correct(conn, user_id, query_text):
    # If Oracle returns a LOB, read it into a string
    if hasattr(query_text, "read"):
        query_text = query_text.read()
    elif not isinstance(query_text, str):
        query_text = str(query_text)

    # Now safely hash it
    query_hash = hashlib.sha256(query_text.encode("utf-8")).hexdigest()

    cur = conn.cursor()
    cur.execute("""
        UPDATE USER_QUERIES
        SET answered_correctly = 'Y', timestamp = CURRENT_TIMESTAMP
        WHERE user_id = :user_id AND query_hash = :query_hash
    """, {"user_id": user_id, "query_hash": query_hash})
    conn.commit()


# -----------------------------
# Main MCQ Flow
# -----------------------------

past_query = get_random_past_query(conn, user_id)

if past_query:
    # Check if it's the current question (just asked)
    if past_query == question:
        print("\n(This is your first query - no MCQ yet.)")
    # Check if it's just the SESSION_START marker
    elif isinstance(past_query, str) and past_query == "SESSION_START":
        print("\n(This is your first session query - no MCQ yet.)")
    else:
        print("\n🧠 Let's test your understanding from before!\n")

        for _ in range(3):  # up to 3 attempts to get a valid MCQ
            mcq = generate_mcq(co, past_query)
            question_with_choices, correct_letter, explanation = parse_mcq(mcq)

            if correct_letter and explanation and question_with_choices:
                break
            print("⚠️ MCQ generation failed to include a valid answer or explanation. Retrying...\n")
        else:
            print("❌ Could not generate a valid MCQ. Skipping this round.")
            mcq = None

        if mcq and correct_letter:
            # Display ONLY the question and choices
            print(question_with_choices)

            first_attempt = True
            while True:
                user_answer = input("\nYour answer (A/B/C/D): ").strip().upper()

                if user_answer == correct_letter:
                    print("✅ Correct!")
                    print("\n💡 Explanation:\n" + explanation)
                    
                    if first_attempt:
                        mark_query_correct(conn, user_id, past_query)
                    else:
                        print("✔️ Good recovery, but this one won't count as mastered yet.")
                    break
                else:
                    print("❌ Incorrect — try again!")
                    first_attempt = False

else:
    print("\n(No previous queries found to generate MCQ yet.)")


log_user_query(conn, user_id, question)
