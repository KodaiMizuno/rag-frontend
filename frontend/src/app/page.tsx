'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, LogIn, Shield } from 'lucide-react';
import ChatWindow from '@/components/ChatWindow';
import { healthCheck } from '@/lib/api';

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-berkeley-blue rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Teaching Assistant Intelligence</h1>
              <p className="text-sm text-gray-500">AI-Powered Data Science Tutor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              isConnected === null ? 'bg-gray-100 text-gray-600'
                : isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected === null ? 'bg-gray-400' : isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected === null ? 'Connecting...' : isConnected ? 'Connected' : 'Backend Offline'}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-berkeley-blue border border-berkeley-blue rounded-lg hover:bg-berkeley-blue hover:text-white transition-colors">
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Welcome to your AI Tutor!</p>
              <p className="mt-1 text-blue-600">Ask questions about your Data Science course materials.</p>
            </div>
          </div>
        </div>

        {isConnected === false && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <p className="font-medium">⚠️ Backend Not Connected</p>
            <p className="mt-1">Run: <code className="bg-red-100 px-1 rounded">uvicorn api:app --reload --port 8000</code></p>
          </div>
        )}

        <div className="h-[600px]">
          <ChatWindow />
        </div>
      </div>
    </main>
  );
}
