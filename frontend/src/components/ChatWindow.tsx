'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { Message, MCQData } from '@/types';
import { sendMessage, generateMCQ, checkAnswer } from '@/lib/api';

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mcq, setMcq] = useState<MCQData | null>(null);
  const [mcqAttempts, setMcqAttempts] = useState(0);
  const [showMcqFeedback, setShowMcqFeedback] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mcq]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('rag-tutor-user-id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem('rag-tutor-user-id', newId);
      setUserId(newId);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setMcq(null);
    setShowMcqFeedback(null);

    try {
      const response = await sendMessage(userMessage.content, userId || undefined);
      
      if (response.user_id && !userId) {
        setUserId(response.user_id);
        localStorage.setItem('rag-tutor-user-id', response.user_id);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (userId || response.user_id) {
        const mcqResponse = await generateMCQ(userId || response.user_id);
        if (mcqResponse.has_question) {
          setMcq(mcqResponse);
          setMcqAttempts(0);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the backend is running.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleMcqAnswer = async (answer: string) => {
    if (!mcq || !userId) return;
    setMcqAttempts(prev => prev + 1);
    const isFirstAttempt = mcqAttempts === 0;

    try {
      const result = await checkAnswer(userId, mcq.topic || '', answer, mcq.correct_answer || '', isFirstAttempt);
      if (result.is_correct) {
        setShowMcqFeedback(`✅ Correct! ${mcq.explanation}${result.marked_mastered ? '\n\n🌟 Marked as Mastered!' : ''}`);
        setTimeout(() => { setMcq(null); setShowMcqFeedback(null); }, 5000);
      } else {
        setShowMcqFeedback('❌ Incorrect. Try again!');
      }
    } catch (error) {
      console.error('Error checking answer:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-berkeley-blue to-blue-700 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Data Science Tutor</h1>
            <p className="text-blue-100 text-sm">Ask any question about your course materials</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-california-gold" />
            <p className="text-lg font-medium text-gray-700">Welcome to your AI Tutor!</p>
            <p className="mt-2">Ask a question about Data Science to get started.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-berkeley-blue text-white rounded-br-md'
                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.sources.map((source, idx) => (
                      <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{source}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
              </div>
            </div>
          </div>
        )}

        {mcq && mcq.has_question && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Knowledge Check!</span>
            </div>
            <div className="whitespace-pre-wrap text-gray-800 mb-4">{mcq.question_text}</div>
            {showMcqFeedback && (
              <div className={`mb-4 p-3 rounded-lg ${showMcqFeedback.includes('Correct') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {showMcqFeedback}
              </div>
            )}
            {!showMcqFeedback?.includes('Correct') && (
              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <button key={letter} onClick={() => handleMcqAnswer(letter)}
                    className="px-4 py-2 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 font-medium text-gray-700">
                    {letter}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a Data Science question..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-berkeley-blue"
            disabled={isLoading}
          />
          <button onClick={handleSendMessage} disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-berkeley-blue text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
