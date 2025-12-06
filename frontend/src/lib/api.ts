const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function sendMessage(question: string, userId?: string) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, user_id: userId }),
  });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
}

export async function generateMCQ(userId: string) {
  const response = await fetch(`${API_BASE_URL}/mcq/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) throw new Error('Failed to generate MCQ');
  return response.json();
}

export async function checkAnswer(
  userId: string, topic: string, userAnswer: string, correctAnswer: string, isFirstAttempt: boolean
) {
  const response = await fetch(`${API_BASE_URL}/mcq/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId, topic, user_answer: userAnswer,
      correct_answer: correctAnswer, is_first_attempt: isFirstAttempt,
    }),
  });
  if (!response.ok) throw new Error('Failed to check answer');
  return response.json();
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

// Leaderboard API (separate backend on port 8001)
const LEADERBOARD_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://localhost:8001';

export interface LeaderboardEntry {
  display_name: string;
  total_queries: number;
  total_mcqs_generated: number;
  total_mcqs_answered: number;
  total_mcqs_correct: number;
  avg_accuracy: number;
  streak_days: number;
}

export interface UserStats {
  display_name: string;
  total_queries: number;
  total_mcqs_generated: number;
  total_mcqs_answered: number;
  total_mcqs_correct: number;
  avg_accuracy: number;
  streak_days: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${LEADERBOARD_API_URL}/leaderboard`);
  if (!response.ok) throw new Error('Failed to fetch leaderboard');
  return response.json();
}

export async function getUserStats(token: string): Promise<UserStats> {
  const response = await fetch(`${LEADERBOARD_API_URL}/users/me/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch user stats');
  return response.json();
}
