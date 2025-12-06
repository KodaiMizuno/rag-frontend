'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard, LeaderboardEntry } from '@/lib/api';
import { Loader2, Trophy, AlertCircle } from 'lucide-react';

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const leaderboardData = await getLeaderboard();
      setData(leaderboardData);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2 className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Community Leaderboard
          </h2>
          <p>See how you rank against other students in the class</p>
        </div>
        <div className="loading">
          <Loader2 className="w-8 h-8 animate-spin text-berkeley-blue" />
          <span>Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2 className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Community Leaderboard
          </h2>
          <p>See how you rank against other students in the class</p>
        </div>
        <div className="empty-state">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3>Could not load leaderboard</h3>
          <p className="text-gray-500 mb-4">Make sure the leaderboard backend is running</p>
          <button 
            className="px-4 py-2 bg-berkeley-blue text-white rounded-lg hover:bg-blue-800 transition-colors"
            onClick={loadLeaderboard}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2 className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Community Leaderboard
          </h2>
          <p>See how you rank against other students in the class</p>
        </div>
        <div className="empty-state">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3>No data yet</h3>
          <p className="text-gray-500">Be the first to appear on the leaderboard by asking questions!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2 className="flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Community Leaderboard
        </h2>
        <p>See how you rank against other students in the class</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student</th>
              <th>Queries</th>
              <th>MCQs</th>
              <th>Correct</th>
              <th>Accuracy</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={`${row.display_name}-${i}`}>
                <td className={`rank-cell rank-${i + 1}`}>
                  <span className="rank-badge">{getRankIcon(i + 1)}</span>
                </td>
                <td className="player-name">{row.display_name}</td>
                <td className="stat-value">{row.total_queries}</td>
                <td className="stat-value">{row.total_mcqs_generated}</td>
                <td className="stat-value">{row.total_mcqs_correct}</td>
                <td>
                  <div className="accuracy-bar">
                    <div className="accuracy-bar-bg">
                      <div 
                        className="accuracy-bar-fill" 
                        style={{ width: `${row.avg_accuracy * 100}%` }}
                      />
                    </div>
                    <span className="stat-value">
                      {(row.avg_accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td>
                  <span className="streak-badge">🔥 {row.streak_days}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

