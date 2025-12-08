const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============== CHAT ==============

export async function sendMessage(question: string, userId?: string) {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, user_id: userId }),
  });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
}

// ============== MCQ ==============

export async function generateMCQ(userId: string) {
  const response = await fetch(`${API_URL}/mcq/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) throw new Error('Failed to generate MCQ');
  return response.json();
}

export async function checkAnswer(
  userId: string, 
  topic: string, 
  userAnswer: string, 
  correctAnswer: string, 
  isFirstAttempt: boolean
) {
  const response = await fetch(`${API_URL}/mcq/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId, 
      topic, 
      user_answer: userAnswer,
      correct_answer: correctAnswer, 
      is_first_attempt: isFirstAttempt,
    }),
  });
  if (!response.ok) throw new Error('Failed to check answer');
  return response.json();
}

// ============== HEALTH ==============

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}

// ============== LEADERBOARD ==============

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  email: string;
  total_questions: number;
  mastered_topics: number;
  accuracy: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_URL}/leaderboard`);
  if (!response.ok) throw new Error('Failed to fetch leaderboard');
  return response.json();
}

// ============== USER STATS ==============

export interface UserStats {
  total_queries: number;
  total_mcqs_generated: number;
  total_mcqs_answered: number;
  total_mcqs_correct: number;
  avg_accuracy: number;
  streak_days: number;
}

export async function getUserStats(token: string): Promise<UserStats> {
  const response = await fetch(`${API_URL}/user/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch user stats');
  return response.json();
}