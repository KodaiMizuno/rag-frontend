export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
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
