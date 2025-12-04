'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ChatInstance {
  chat_id: string;
  title: string;
  course_id?: string;
  updated_at: string;
}

interface ChatSidebarProps {
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({ activeChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.token) {
      loadChats();
    }
  }, [user?.token]);

  const loadChats = async () => {
    if (!user?.token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/chats`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.token) return;

    try {
      await fetch(`${API_URL}/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      setChats(chats.filter(c => c.chat_id !== chatId));
      if (activeChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <p>Sign in to save your chat history</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-berkeley-blue text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : chats.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No chats yet</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.chat_id}
              onClick={() => onSelectChat(chat.chat_id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left group transition-colors ${
                activeChatId === chat.chat_id
                  ? 'bg-berkeley-blue/10 text-berkeley-blue'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate text-sm">{chat.title}</span>
              <button
                onClick={(e) => deleteChat(chat.chat_id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
