"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, X, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import ReviewChatPanel from './ReviewChatPanel';
import { useAuth } from '@/context/AuthContext';

export default function GlobalChatBubble() {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState(false);

  // Only show for PRO users
  if (!user?.is_pro) return null;

  // Hide on active exam pages: /exam/[id]
  // This regex matches /exam/ followed by exactly one segment (the id),
  // so it won't hide the chat on /exam/[id]/review or /exam/[id]/result
  const isExamPage = /^\/exam\/[^/]+$/.test(pathname);
  if (isExamPage) return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[90]">
        <Button
          onClick={() => setIsOpen(true)}
          className={`h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-2xl shadow-indigo-500/40 border-2 border-white/20 flex items-center justify-center p-0 hover:scale-110 active:scale-95 transition-all duration-300 group ${isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
        >
          <div className="relative">
            <Bot className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-indigo-600">
               <Sparkles className="w-3 h-3 text-indigo-900 fill-indigo-900" />
            </div>
          </div>
          
          {/* Label Tooltip */}
          <div className="absolute right-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-wider">
            Tanya Tutor AI Mentors
          </div>
        </Button>
      </div>

      {/* The Chat Panel */}
      <ReviewChatPanel 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        packageTitle="Global Mentor Chat"
      />
    </>
  );
}
