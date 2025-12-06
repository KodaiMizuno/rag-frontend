/* ===========================================
   DSS Decal AI Tutor - My Stats Component
   
   Contributor: [Your Name]
   
   Usage:
   import MyStatsTab from './MyStatsTab'
   <MyStatsTab token={userToken} onLoginClick={() => setShowAuth(true)} />
   =========================================== */

import React, { useState, useEffect } from 'react';

const LEADERBOARD_API_URL = "http://127.0.0.1:8001";

export default function MyStatsTab({ token, onLoginClick }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      loadMyStats();
    }
  }, [token]);

  const loadMyStats = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${LEADERBOARD_API_URL}/users/me/stats`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to load stats");
      
      const json = await res.json();
      setStats(json);
    } catch (err) {
      console.error("Stats error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Not logged in
  if (!token) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <h3>Log in to see your stats</h3>
        <p>Track your progress, see how many questions you've asked, and monitor your MCQ accuracy.</p>
        <button 
          className="auth-btn btn-primary" 
          style={{ marginTop: '20px' }}
          onClick={onLoginClick}
        >
          Log In
        </button>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading your stats...</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h3>Could not load your stats</h3>
        <p>Make sure the backend is running and you're logged in.</p>
        <button 
          className="auth-btn btn-primary" 
          style={{ marginTop: '20px' }}
          onClick={loadMyStats}
        >
          Try Again
        </button>
      </div>
    );
  }

  // No stats yet
  if (!stats) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h3>No stats yet</h3>
        <p>Start asking questions to build your stats!</p>
      </div>
    );
  }

  // Display stats
  return (
    <div className="stats-container">
      <StatCard
        icon="❓"
        iconClass="queries"
        title="Total Queries"
        value={stats.total_queries}
        subtitle="Questions asked to the tutor"
      />
      
      <StatCard
        icon="📝"
        iconClass="mcqs"
        title="MCQs Generated"
        value={stats.total_mcqs_generated}
        subtitle="Practice questions received"
      />
      
      <StatCard
        icon="✏️"
        iconClass="answered"
        title="MCQs Answered"
        value={stats.total_mcqs_answered}
        subtitle="Questions you've attempted"
      />
      
      <StatCard
        icon="✅"
        iconClass="correct"
        title="Correct Answers"
        value={stats.total_mcqs_correct}
        subtitle="Questions answered correctly"
      />
      
      <StatCard
        icon="🎯"
        iconClass="accuracy"
        title="Accuracy"
        value={`${(stats.avg_accuracy * 100).toFixed(1)}%`}
        subtitle="Your overall accuracy rate"
      />
      
      <StatCard
        icon="🔥"
        iconClass="streak"
        title="Current Streak"
        value={stats.streak_days}
        subtitle="Consecutive days active"
      />
    </div>
  );
}

// Stat Card Sub-component
function StatCard({ icon, iconClass, title, value, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
        <div>
          <div className="stat-card-title">{title}</div>
        </div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-subtitle">{subtitle}</div>
    </div>
  );
}

