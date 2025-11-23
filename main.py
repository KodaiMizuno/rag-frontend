import os
import time
from dotenv import load_dotenv
from src.database import DatabaseManager
from src.rag_engine import RAGEngine

# Load environment variables
load_dotenv()

def run_session():
    # 1. Setup
    try:
        db = DatabaseManager()
        conn = db.connect()
        rag = RAGEngine(conn)
    except Exception as e:
        print(f"❌ Critical Error during setup: {e}")
        return

    # 2. Identify User
    user_id = db.get_session_user_id(reset_user=False)
    print(f"👤 User Session: {user_id}")
    print("-" * 50)
    print("🤖 AI Tutor Ready! Ask a question to start learning.")
    print("-" * 50)

    # 3. Main Loop
    while True:
        # A. Get User Input
        question = input("\n📚 Ask a Data Science question (or 'q' to quit): ").strip()
        if question.lower() in ['q', 'quit', 'exit']:
            print("👋 Goodbye! See you next study session.")
            break

        if question.lower() in ['reset', 'new user']:
            print("♻️  Resetting user session...")
            try:
                os.remove("data/session_user_id.txt")
            except FileNotFoundError:
                pass
            
            # Get new ID immediately
            user_id = db.get_session_user_id(reset_user=True)
            print(f"👤 New User Session: {user_id}")
            continue

        if not question:
            continue

        # B. Get Context & Generate Hint (Explanation First)
        print("\n🔍 Searching textbooks...")
        try:
            # CHANGED: Unpack the sources too
            context, sources = rag.search(question)
            
            print("🤖 Generating Tutor Hint...")
            hint = rag.get_tutor_hint(question, context)
            
            print("\n" + "="*50)
            print("💡 TUTOR EXPLANATION")
            print("="*50)
            print(hint)
            print("-" * 50)
            
        except Exception as e:
            print(f"⚠️ Error retrieving answer: {e}")
            continue

        # C. MCQ Logic (Reinforcement Phase)
        # We fetch a past query BEFORE logging the current one. 
        # This ensures we quiz them on history, not the thing they just read.
        past_query = db.get_random_past_query(user_id)

        # ... inside main.py ...

        if past_query:
            print(f"🧠 Knowledge Check! Let's review: '{past_query}'")
            print("creating question...")
            
            quiz_context, _ = rag.search(past_query, top_k=3)
            
            q_text, correct_ans, explanation = rag.generate_mcq(past_query, context=quiz_context)

            if q_text and correct_ans:
                print("\n" + q_text)
                
                # Retry Loop
                attempts = 0
                while True:
                    user_ans = input("\nYour Answer (A/B/C/D): ").strip().upper()
                    attempts += 1
                    
                    if user_ans == correct_ans:
                        print(f"\n✅ Correct! {explanation}")
                        
                        # LOGIC: Only mark mastered if correct on FIRST try
                        if attempts == 1:
                            db.mark_correct(user_id, past_query)
                            print("🌟 Marked as Mastered! (Won't appear again)")
                        else:
                            print("👍 Good job! (Keep practicing to master this)")
                        break
                    else:
                        print("❌ Incorrect. Try again!")
            else:
                print("⚠️ Couldn't generate a valid MCQ this time. Moving on.")
        
        else:
            # If no past queries exist (first time user), skip MCQ
            print("(Asking your first question? The Knowledge Checks will start next round!)")

        # D. Log the CURRENT query for future quizzes
        db.log_query(user_id, question)

if __name__ == "__main__":
    run_session()