"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Loader2, Bot, User, MessageSquare, 
  Sparkles, RefreshCcw, AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ReviewChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  examSessionId?: string;
  questionId?: string;
  questionNumber?: number;
  packageTitle?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function ReviewChatPanel({ 
  isOpen, 
  onClose, 
  examSessionId, 
  questionId,
  questionNumber,
  packageTitle
}: ReviewChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      // If we already have a session, we might want to keep it or start fresh.
      // For Phase 1 "Explain My Mistake", it's better to start a session scoped to the question.
      startNewChat();
    } else {
      // Reset when closed to avoid stale data
      setSessionId(null);
      setMessages([]);
      setError(null);
    }
  }, [isOpen, questionId]);

  const startNewChat = async () => {
    setInitializing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exam_session_id: examSessionId,
          question_id: questionId
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Gagal memulai sesi chat");
      }

      const data = await res.json();
      setSessionId(data.id);
      
      const topic = questionNumber ? `Soal #${questionNumber}` : 'ujian ini';
      setMessages([
        {
          role: 'assistant',
          content: `Halo! Saya Tutor AI. Bagaimana saya bisa membantu kamu memahami pola pengerjaan ${topic} ini?`,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInitializing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: userMessage,
          question_id: questionId 
        }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error("Gagal mengirim pesan");

      const data = await res.json();
      setMessages(prev => [...prev, data]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Maaf, saya mengalami kendala teknis saat memproses pesanmu. Silakan coba lagi ya.",
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-slate-900 border-l border-slate-800 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              Tutor AI Mentor
              <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
            </h3>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full hover:bg-slate-800">
          <X className="w-5 h-5 text-slate-400" />
        </Button>
      </div>

      {/* Info Context */}
      {(packageTitle || questionNumber) && !initializing && (
        <div className="px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <MessageSquare className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                    {questionNumber ? `Diskusi Soal #${questionNumber}` : packageTitle}
                </span>
            </div>
            <Badge variant="outline" className="text-[9px] bg-slate-950 border-slate-800 text-indigo-300 px-1 py-0 h-4 uppercase font-black">
                PRO
            </Badge>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {initializing ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full" />
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Menghubungkan ke Mentor...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <Button onClick={startNewChat} className="bg-indigo-600 hover:bg-indigo-500 text-xs rounded-xl shadow-lg shadow-indigo-600/20">
              <RefreshCcw className="w-3 h-3 mr-2" /> Hubungkan Kembali
            </Button>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5`}>
                   <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-slate-700 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-slate-800' : 'bg-indigo-600'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-white" />}
                   </div>
                   <div className={`p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                     msg.role === 'user' 
                       ? 'bg-indigo-600 text-white rounded-tr-none' 
                       : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none whitespace-pre-line'
                   }`}>
                     {msg.role === 'assistant' ? (
                       msg.content.split('\n').map((line, i) => {
                         // Simple markdown formatting for bold and bullets
                         let formatted = line;
                         // Bold: **text**
                         formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                         
                         if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                           return <div key={i} className="flex gap-2 mb-1">
                             <span className="text-indigo-400">•</span>
                             <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-*]\s/, '') }} />
                           </div>;
                         }
                         return <div key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
                       })
                     ) : (
                       msg.content
                     )}
                   </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-pulse">
                 <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/50 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-none">
                        <div className="flex gap-1.5">
                           <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                           <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                           <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pertanyaanmu di sini..."
            disabled={loading || initializing || !!error}
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || loading || initializing}
            className="h-11 w-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-xl transition-all shadow-lg shadow-indigo-600/20 shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
        <p className="text-[10px] text-slate-500 mt-4 text-center px-4 leading-relaxed italic">
            "Mentor AI membantu kamu memahami konsep materi SKD lebih dalam."
        </p>
      </div>
    </div>
  );
}
