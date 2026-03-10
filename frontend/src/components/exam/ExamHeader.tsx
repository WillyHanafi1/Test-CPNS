"use client";

import React from 'react';
import { useExamStore } from '@/store/useExamStore';
import { Button } from '@/components/ui/button';
import { Clock, Send, ShieldAlert } from 'lucide-react';

export default function ExamHeader() {
  const { timeLeft, finishExam } = useExamStore();
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    if (confirm("Apakah Anda yakin ingin mengakhiri ujian dan mengumpulkan jawaban?")) {
      finishExam();
    }
  };

  const isLowTime = timeLeft < 300; // 5 minutes

  return (
    <header className="h-20 border-b border-slate-800 bg-slate-950 sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-sm md:text-base leading-tight">SIMULASI CAT CPNS</h2>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-widest">Live Session — Standard BKN</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 md:space-x-8">
        <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl border transition-colors ${
          isLowTime 
            ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' 
            : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          <Clock className="w-4 h-4" />
          <span className="font-mono text-lg font-bold tracking-wider">{formatTime(timeLeft)}</span>
        </div>

        <Button 
          onClick={handleFinish}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20"
        >
          <Send className="w-4 h-4 mr-2" />
          Selesaikan
        </Button>
      </div>
    </header>
  );
}
