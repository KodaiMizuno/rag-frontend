'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatWindow from '@/components/ChatWindow';
import ChatSidebar from '@/components/ChatSidebar';
import { 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  Upload,
  GraduationCap,
  Trophy
} from 'lucide-react';

export default function ChatPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-berkeley-blue rounded-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">DSS Tutor</h1>
              <p className="text-xs text-gray-500">
                {user ? `${user.role === 'teacher' ? '👩‍🏫' : '🎓'} ${user.name}` : 'Guest'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatSidebar 
            activeChatId={activeChatId} 
            onSelectChat={setActiveChatId}
            onNewChat={() => setActiveChatId(null)}
          />
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => router.push('/leaderboard')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
          {user?.role === 'teacher' && (
            <>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => router.push('/upload')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Documents
              </button>
            </>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-berkeley-blue hover:bg-blue-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="ml-3 font-medium text-gray-700">
            {activeChatId ? 'Chat' : 'New Chat'}
          </span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-4 overflow-hidden">
          <ChatWindow chatId={activeChatId} onChatCreated={setActiveChatId} />
        </div>
      </div>
    </div>
  );
}
