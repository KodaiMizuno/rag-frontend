'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Sparkles, AlertCircle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm';         
import { Message, MCQData } from '@/types';
import { sendMessage, generateMCQ, checkAnswer } from '@/lib/api';
import SourceCard from './SourceCard';

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // MCQ State
  const [mcq, setMcq] = useState<MCQData | null>(null);
  const [showMcqFeedback, setShowMcqFeedback] = useState<string | null>(null);
  const [mcqAttempts, setMcqAttempts] = useState(0); 
  // New state to control button visibility: only hide buttons on success
  const [isCorrectlyAnswered, setIsCorrectlyAnswered] = useState(false); 
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mcq, showMcqFeedback]);

  // Initialize or Load User ID
  useEffect(() => {
    const stored = localStorage.getItem('rag-tutor-user-id');
    if (stored) setUserId(stored);
    else {
      const newId = crypto.randomUUID();
      localStorage.setItem('rag-tutor-user-id', newId);
      setUserId(newId);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    // Reset MCQ state for the new turn
    setMcq(null);
    setShowMcqFeedback(null);
    setIsCorrectlyAnswered(false);

    try {
      const response = await sendMessage(userMsg.content, userId || undefined);
      
      // Update User ID if the backend assigns a new one
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

      setMessages(prev => [...prev, assistantMsg]);

      // Trigger MCQ generation if user exists
      if (response.user_id) {
        const quiz = await generateMCQ(response.user_id);
        if (quiz.has_question) {
          setMcq(quiz);
          setMcqAttempts(0);
          setIsCorrectlyAnswered(false);
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '**Error:** Could not connect to the tutor. Please check if the backend is running.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      // Focus input again for better UX
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleMcqAnswer = async (answer: string) => {
    if (!mcq || !userId) return;
    
    // Prevent clicking again if already solved
    if (isCorrectlyAnswered) return;

    setMcqAttempts(prev => prev + 1);
    const isFirstAttempt = mcqAttempts === 0;

    try {
      const result = await checkAnswer(userId, mcq.topic || '', answer, mcq.correct_answer || '', isFirstAttempt);
      
      if (result.is_correct) {
        // SUCCESS CASE
        setIsCorrectlyAnswered(true); // This triggers buttons to hide
        const masteryText = result.marked_mastered ? '\n\n🌟 **Marked as Mastered!**' : '';
        setShowMcqFeedback(`✅ **Correct!** ${mcq.explanation}${masteryText}`);
        
        // Remove the quiz card after 8 seconds
        setTimeout(() => { 
            setMcq(null); 
            setShowMcqFeedback(null);
            setIsCorrectlyAnswered(false);
        }, 8000);
      } else {
        // FAILURE CASE - Do NOT set isCorrectlyAnswered(true)
        // Buttons remain visible so they can try again
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
      <div className="bg-[#003262] text-white px-6 py-4 flex items-center gap-3 shadow-md">
        <div className="p-2 bg-white/10 rounded-full">
          <BookOpen className="w-5 h-5 text-[#FDB515]" />
        </div>
        <div>
          {/* You can rename the Title here */}
          <h1 className="font-bold text-lg tracking-wide">DSS RAG Tutor</h1>
          <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">Data Science Teaching Assistant</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-50">
            <Sparkles className="w-16 h-16 text-[#FDB515]" />
            <p className="font-medium">Ask a question to start learning</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
              msg.role === 'assistant' ? 'bg-[#003262] text-white' : 'hidden'
            }`}>
              <Bot className="w-5 h-5" />
            </div>

            <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-[#003262] text-white rounded-br-none' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              
              <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>

              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourceCard sources={msg.sources} />
              )}
              
              <p className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-blue-300' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-center gap-2 ml-10">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {/* --- IMPROVED MCQ SECTION --- */}
        {mcq && mcq.has_question && (
           <div className="ml-10 max-w-[85%] bg-amber-50 rounded-xl p-5 border border-amber-200 shadow-sm relative overflow-hidden mt-4">
             <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
             
             <div className="flex items-center gap-2 mb-3">
               <AlertCircle className="w-5 h-5 text-amber-600" />
               <span className="font-bold text-amber-800 text-sm uppercase tracking-wide">Knowledge Check</span>
             </div>
             
             {/* Question Text (Markdown Enabled) */}
             <div className="prose prose-sm prose-amber mb-4 text-gray-800 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {mcq.question_text || ''}
                </ReactMarkdown>
             </div>
             
             {/* Feedback Message (Markdown Enabled for Bold Text) */}
             {showMcqFeedback && (
               <div className={`mb-4 p-3 rounded-lg text-sm border ${
                 showMcqFeedback.includes('Correct') 
                    ? 'bg-green-50 text-green-800 border-green-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
               }`}>
                 <ReactMarkdown>{showMcqFeedback}</ReactMarkdown>
               </div>
             )}

             {/* Buttons (Only hide if CORRECT answer was given) */}
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
            className="flex-1 px-5 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#003262] focus:border-transparent transition-all shadow-inner"
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1.5 p-1.5 bg-[#003262] text-white rounded-full hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-[#003262] transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          AI can make mistakes. Check sources.
        </p>
      </div>
    </div>
  );
}