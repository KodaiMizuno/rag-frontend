/* ===========================================
   DSS Decal AI Tutor - Leaderboard Component
   
   Contributor: [Your Name]
   
   Usage in partner's React app:
   1. Copy this file to their components folder
   2. Import: import LeaderboardTab from './LeaderboardTab'
   3. Use: <LeaderboardTab />
   4. Add leaderboard.css for styling
   =========================================== */

import React, { useState, useEffect } from 'react';

// Update this to match your backend URL
const LEADERBOARD_API_URL = "http://127.0.0.1:8001";

export default function LeaderboardTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${LEADERBOARD_API_URL}/leaderboard`);
      if (!res.ok) throw new Error("Failed to load leaderboard");
      
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Leaderboard error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2>🏆 Community Leaderboard</h2>
          <p>See how you rank against other students in the class</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2>🏆 Community Leaderboard</h2>
          <p>See how you rank against other students in the class</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Could not load leaderboard</h3>
          <p>Make sure the leaderboard backend is running on {LEADERBOARD_API_URL}</p>
          <button className="auth-btn btn-primary" onClick={loadLeaderboard} style={{ marginTop: '20px' }}>
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
          <h2>🏆 Community Leaderboard</h2>
          <p>See how you rank against other students in the class</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <h3>No data yet</h3>
          <p>Be the first to appear on the leaderboard by asking questions!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>🏆 Community Leaderboard</h2>
        <p>See how you rank against other students in the class</p>
      </div>
      
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
            <tr key={row.display_name + i}>
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
  );
}

