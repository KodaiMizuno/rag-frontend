# backend/crud.py
from database import get_connection

def log_event(user_id: str, event_type: str, query_text=None, is_correct=None):
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO USER_ACTIVITY_LOG (id, user_id, event_type, query_text, is_correct)
        VALUES (:id, :uid, :ev, :qt, :correct)
    """, {
        "id": str(uuid.uuid4()),
        "uid": user_id,
        "ev": event_type,
        "qt": query_text,
        "correct": is_correct
    })
    conn.commit()
    conn.close()


def get_user_stats(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.display_name,
               s.total_queries,
               s.total_mcqs_generated,
               s.total_mcqs_answered,
               s.total_mcqs_correct,
               s.avg_accuracy,
               s.streak_days
        FROM USER_STATS s
        JOIN USERS u ON u.user_id = s.user_id
        WHERE s.user_id = :uid
    """, {"uid": user_id})

    row = cursor.fetchone()
    conn.close()
    return row


def get_leaderboard():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.display_name,
               s.total_queries,
               s.total_mcqs_generated,
               s.total_mcqs_answered,
               s.total_mcqs_correct,
               s.avg_accuracy,
               s.streak_days
        FROM USER_STATS s
        JOIN USERS u ON u.user_id = s.user_id
        ORDER BY s.total_mcqs_correct DESC, s.avg_accuracy DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows
