// frontend/src/types/index.ts

export interface Source {
    filename: string;
    title: string;
    course_id?: string;
    chunk_id?: number;
    page_number?: number;
    snippet: string;
    relevance_score: number;
  }
  
  export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];  // Changed from string[]
    timestamp: Date;
  }
  
  export interface ChatResponse {
    answer: string;
    sources: Source[];  // Changed from string[]
    user_id: string;
  }
  
  export interface MCQData {
    has_question: boolean;
    question_text?: string;
    correct_answer?: string;
    explanation?: string;
    topic?: string;
  }
  
  export interface AnswerCheckResponse {
    is_correct: boolean;
    marked_mastered: boolean;
  }