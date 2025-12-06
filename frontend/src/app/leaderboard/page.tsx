'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Leaderboard from '@/components/Leaderboard';
import MyStats from '@/components/MyStats';
import { Trophy, BarChart3, MessageSquare, ArrowLeft } from 'lucide-react';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'stats'>('leaderboard');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Leaderboard & Stats</h1>
              <p className="text-gray-600">Track your progress and see how you rank</p>
            </div>
            <button
              onClick={() => router.push('/chat')}
              className="flex items-center gap-2 px-4 py-2 bg-berkeley-blue text-white rounded-lg hover:bg-blue-800 transition-colors shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Chat</span>
              <MessageSquare className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-berkeley-blue text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Trophy className="w-5 h-5" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-berkeley-blue text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            My Stats
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'stats' && <MyStats />}
        </div>
      </div>
    </div>
  );
}

