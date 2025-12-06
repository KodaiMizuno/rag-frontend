'use client';

import { useState, useEffect } from 'react';
import { getUserStats, UserStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lock, AlertCircle, BarChart3 } from 'lucide-react';

interface StatCardProps {
  icon: string;
  iconClass: string;
  title: string;
  value: string | number;
  subtitle: string;
}

function StatCard({ icon, iconClass, title, value, subtitle }: StatCardProps) {
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

export default function MyStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.token) {
      loadMyStats();
    }
  }, [user?.token]);

  const loadMyStats = async () => {
    if (!user?.token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await getUserStats(user.token);
      setStats(statsData);
    } catch (err) {
      console.error('Stats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="empty-state">
        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3>Log in to see your stats</h3>
        <p className="text-gray-500 mb-4">
          Track your progress, see how many questions you've asked, and monitor your MCQ accuracy.
        </p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="loading">
        <Loader2 className="w-8 h-8 animate-spin text-berkeley-blue" />
        <span>Loading your stats...</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="empty-state">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3>Could not load your stats</h3>
        <p className="text-gray-500 mb-4">Make sure the backend is running and you're logged in.</p>
        <button 
          className="px-4 py-2 bg-berkeley-blue text-white rounded-lg hover:bg-blue-800 transition-colors"
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
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3>No stats yet</h3>
        <p className="text-gray-500">Start asking questions to build your stats!</p>
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

