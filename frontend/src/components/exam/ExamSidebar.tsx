"use client";

import React, { useEffect, useRef } from 'react';
import { useExamStore } from '@/store/useExamStore';

interface ExamSidebarProps {
  onClose?: () => void;
}

export default function ExamSidebar({ onClose }: ExamSidebarProps) {
  const {
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    doubtStatus,
  } = useExamStore();

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Ref on the grid's scroll container so we can precisely control scrollTop
  const gridContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll best practice:
   * Instead of relying on scrollIntoView (which can be confused by nested
   * overflow containers), we manually calculate the offset of the active
   * button relative to the grid container and use scrollTo() to center it.
   */
  useEffect(() => {
    const container = gridContainerRef.current;
    const activeBtn = buttonRefs.current[currentIndex];
    if (!container || !activeBtn) return;

    const containerHeight = container.clientHeight;
    // offsetTop relative to the grid container
    const btnTop = activeBtn.offsetTop;
    const btnHeight = activeBtn.offsetHeight;

    // Desired scrollTop: center the active button in the container
    const targetScroll = btnTop - containerHeight / 2 + btnHeight / 2;

    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [currentIndex]);

  /**
   * Priority order for status colors:
   * 1. Current → indigo (even if answered/doubt)
   * 2. Doubt + Answered → amber (ragu tapi sudah dipilih)
   * 3. Doubt only → amber
   * 4. Answered → emerald
   * 5. Unanswered → slate
   */
  const getStatusColor = (questionId: string, index: number) => {
    const isCurrent = index === currentIndex;
    const isAnswered = !!answers[questionId];
    const isDoubt = !!doubtStatus[questionId];

    if (isCurrent) {
      return 'ring-4 ring-indigo-500/50 ring-offset-2 ring-offset-slate-900 bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.6)] animate-pulse-subtle';
    }
    if (isDoubt) return 'bg-amber-500 text-white'; // amber takes priority over answered-green for doubt
    if (isAnswered) return 'bg-emerald-600 text-white';
    return 'bg-slate-800 text-slate-400 hover:bg-slate-700';
  };

  // Count summary
  const answeredCount = questions.filter(q => !!answers[q.id] && !doubtStatus[q.id]).length;
  const doubtCount = questions.filter(q => !!doubtStatus[q.id]).length;
  const unansweredCount = questions.filter(q => !answers[q.id] && !doubtStatus[q.id]).length;

  const handleNavigate = (idx: number) => {
    setCurrentIndex(idx);
    onClose?.(); // close mobile sidebar after navigation
  };

  return (
    <div className="p-5 space-y-6">
      {/* Progress Summary */}
      <div className="bg-slate-800/50 rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Progres Pengerjaan</p>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Dijawab</span>
          <span className="font-bold text-white">{answeredCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Ragu-ragu</span>
          <span className="font-bold text-white">{doubtCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-600" /> Belum</span>
          <span className="font-bold text-rose-400">{unansweredCount}</span>
        </div>
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 text-right">
          {answeredCount}/{questions.length} soal dijawab
        </p>
      </div>

      {/* Question Grid */}
      <div>
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Navigasi Soal</h3>
        {/* Scrollable grid container — auto-scroll targets this ref */}
        <div
          ref={gridContainerRef}
          className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1 scroll-smooth relative"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
        >
          {questions.map((q, idx) => (
            <button
              key={q.id}
              ref={el => { buttonRefs.current[idx] = el; }}
              onClick={() => handleNavigate(idx)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${getStatusColor(q.id, idx)}`}
              title={`Soal ${q.number}: ${doubtStatus[q.id] ? 'Ragu-ragu' : answers[q.id] ? 'Dijawab' : 'Belum dijawab'}`}
            >
              {q.number}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 border-t border-slate-800 pt-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Keterangan</h3>
        {[
          { color: 'bg-indigo-600', label: 'Sedang Dikerjakan' },
          { color: 'bg-emerald-600', label: 'Sudah Dijawab' },
          { color: 'bg-amber-500', label: 'Ragu-ragu' },
          { color: 'bg-slate-800 border border-slate-700', label: 'Belum Dijawab' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Connection Status */}
      <div className="bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20">
        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Status Autosave</p>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-300">Jawaban tersimpan otomatis</span>
        </div>
      </div>
    </div>
  );
}
