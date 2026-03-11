"use client";

import React, { useState } from 'react';
import { useExamStore } from '@/store/useExamStore';
import { Button } from '@/components/ui/button';
import { Clock, Send, ShieldAlert, LayoutGrid } from 'lucide-react';

interface ExamHeaderProps {
  onToggleSidebar?: () => void;
}

export default function ExamHeader({ onToggleSidebar }: ExamHeaderProps) {
  const { timeLeft, finishExam } = useExamStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleConfirmFinish = () => {
    setShowConfirmModal(false);
    // Trigger global finish state. 
    // ExamPage will detect this, show the global loading screen, and call the finish API.
    finishExam();
  };

  const isLowTime = timeLeft < 300; // 5 minutes

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-950 sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile: hamburger to open sidebar */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white mr-1"
            aria-label="Toggle soal navigator"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <div className="bg-indigo-600 p-2 rounded-lg hidden sm:flex">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">SIMULASI CAT CPNS</h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest hidden sm:block">Live Session — Standard BKN</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-6">
          {/* Timer */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-colors ${
            isLowTime
              ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono text-base md:text-lg font-bold tracking-wider">{formatTime(timeLeft)}</span>
          </div>

          {/* Finish Button */}
          <Button
            onClick={() => setShowConfirmModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 px-4 md:px-6 h-9"
          >
            <Send className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Selesaikan</span>
            <span className="sm:hidden">Selesai</span>
          </Button>
        </div>
      </header>

      {/* Custom Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Akhiri Ujian?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Apakah Anda yakin ingin mengakhiri ujian dan mengumpulkan jawaban sekarang? Anda tidak dapat mengubah jawaban setelah ini.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmModal(false)}
                className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Batal
              </Button>
              <Button 
                onClick={handleConfirmFinish}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Ya, Selesaikan
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
