'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Sparkles, AlertCircle, Bot } from 'lucide-react';
import { Message, MCQData, Source } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import SourceCard from './SourceCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============== API FUNCTIONS ==============

async function sendMessage(
  message: string,
  userId?: string,
  token?: string,
  chatId?: string
): Promise<{
  answer: string;
  sources: Source[];
  user_id: string;
  chat_id?: string;
}> {
  // Use authenticated endpoint if token exists
  if (token) {
    const response = await fetch(`${API_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        chat_id: chatId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    return {
      answer: data.answer,
      sources: data.sources,
      user_id: userId || '',
      chat_id: data.chat_id,
    };
  }

  // Legacy endpoint for guests
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: message, user_id: userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

async function generateMCQ(userId: string, token?: string): Promise<MCQData> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/mcq/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    return { has_question: false };
  }

  return response.json();
}

async function checkAnswer(
  userId: string,
  topic: string,
  userAnswer: string,
  correctAnswer: string,
  isFirstAttempt: boolean,
  token?: string
): Promise<{ is_correct: boolean; marked_mastered: boolean }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/mcq/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: userId,
      topic,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_first_attempt: isFirstAttempt,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to check answer');
  }

  return response.json();
}

// ============== COMPONENT ==============

interface ChatWindowProps {
  chatId?: string | null;
  onChatCreated?: (chatId: string) => void;
}

export default function ChatWindow({ chatId, onChatCreated }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);

  // MCQ State
  const [mcq, setMcq] = useState<MCQData | null>(null);
  const [showMcqFeedback, setShowMcqFeedback] = useState<string | null>(null);
  const [mcqAttempts, setMcqAttempts] = useState(0);
  const [isCorrectlyAnswered, setIsCorrectlyAnswered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mcq, showMcqFeedback]);

  // Initialize User ID for guests
  useEffect(() => {
    if (user) {
      setUserId(user.user_id);
    } else {
      const stored = localStorage.getItem('rag-tutor-user-id');
      if (stored) {
        setUserId(stored);
      } else {
        const newId = crypto.randomUUID();
        localStorage.setItem('rag-tutor-user-id', newId);
        setUserId(newId);
      }
    }
  }, [user]);

  // Update currentChatId when prop changes
  useEffect(() => {
    setCurrentChatId(chatId || null);
    if (chatId) {
      loadChatMessages(chatId);
    } else {
      setMessages([]);
    }
  }, [chatId]);

  // Load messages for existing chat
  const loadChatMessages = async (chatIdToLoad: string) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${API_URL}/chats/${chatIdToLoad}/messages`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(
          data.map((msg: any) => ({
            id: msg.message_id,
            role: msg.role,
            content: msg.content,
            sources: msg.sources,
            timestamp: new Date(msg.created_at),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Reset MCQ state
    setMcq(null);
    setShowMcqFeedback(null);
    setIsCorrectlyAnswered(false);

    try {
      const response = await sendMessage(
        userMsg.content,
        userId || undefined,
        user?.token,
        currentChatId || undefined
      );

      // Update chat ID if new chat was created
      if (response.chat_id && response.chat_id !== currentChatId) {
        setCurrentChatId(response.chat_id);
        onChatCreated?.(response.chat_id);
      }

      // Update User ID if backend assigns one
      if (response.user_id && response.user_id !== userId) {
        setUserId(response.user_id);
        localStorage.setItem('rag-tutor-user-id', response.user_id);
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Generate MCQ
      const effectiveUserId = response.user_id || userId;
      if (effectiveUserId) {
        const quiz = await generateMCQ(effectiveUserId, user?.token);
        if (quiz.has_question) {
          setMcq(quiz);
          setMcqAttempts(0);
          setIsCorrectlyAnswered(false);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '**Error:** Could not connect to the tutor. Please check if the backend is running.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleMcqAnswer = async (answer: string) => {
    if (!mcq || !userId) return;
    if (isCorrectlyAnswered) return;

    setMcqAttempts((prev) => prev + 1);
    const isFirstAttempt = mcqAttempts === 0;

    try {
      const result = await checkAnswer(
        userId,
        mcq.topic || '',
        answer,
        mcq.correct_answer || '',
        isFirstAttempt,
        user?.token
      );

      if (result.is_correct) {
        setIsCorrectlyAnswered(true);
        const masteryText = result.marked_mastered ? '\n\n🌟 **Marked as Mastered!**' : '';
        setShowMcqFeedback(`✅ **Correct!** ${mcq.explanation}${masteryText}`);

        setTimeout(() => {
          setMcq(null);
          setShowMcqFeedback(null);
          setIsCorrectlyAnswered(false);
        }, 8000);
      } else {
        setShowMcqFeedback('❌ **Incorrect.** Try again!');
      }
    } catch (error) {
      console.error('Error checking answer:', error);
      setShowMcqFeedback('⚠️ Error checking answer. Try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 font-sans">
      {/* Header */}
      <div className="bg-berkeley-blue text-white px-6 py-4 flex items-center gap-3 shadow-md">
        <div className="p-2 bg-white/10 rounded-full">
          <BookOpen className="w-5 h-5 text-california-gold" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wide">DSS RAG Tutor</h1>
          <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
            Data Science Teaching Assistant
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-50">
            <Sparkles className="w-16 h-16 text-california-gold" />
            <p className="font-medium">Ask a question to start learning</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* Bot Avatar */}
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 bg-berkeley-blue text-white">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-berkeley-blue text-white rounded-br-none'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>

              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourceCard sources={msg.sources} />
              )}

              <p
                className={`text-[10px] mt-2 text-right ${
                  msg.role === 'user' ? 'text-blue-300' : 'text-gray-400'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-start items-center gap-2 ml-10">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {/* MCQ Section */}
        {mcq && mcq.has_question && (
          <div className="ml-10 max-w-[85%] bg-amber-50 rounded-xl p-5 border border-amber-200 shadow-sm relative overflow-hidden mt-4">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>

            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-800 text-sm uppercase tracking-wide">Knowledge Check</span>
            </div>

            <div className="prose prose-sm prose-amber mb-4 text-gray-800 max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{mcq.question_text || ''}</ReactMarkdown>
            </div>

            {showMcqFeedback && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm border ${
                  showMcqFeedback.includes('Correct')
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <ReactMarkdown>{showMcqFeedback}</ReactMarkdown>
              </div>
            )}

            {!isCorrectlyAnswered && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleMcqAnswer(opt)}
                    className="px-4 py-3 bg-white border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 text-amber-900 font-semibold transition-all shadow-sm text-left flex items-center gap-2 group"
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs group-hover:bg-amber-200">
                      {opt}
                    </span>
                    <span>Option {opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question..."
            className="flex-1 px-5 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-berkeley-blue focus:border-transparent transition-all shadow-inner"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1.5 p-2 bg-berkeley-blue text-white rounded-full hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-berkeley-blue transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">AI can make mistakes. Check sources.</p>
      </div>
    </div>
  );
}