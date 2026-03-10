"use client";

import React from 'react';
import { useExamStore } from '@/store/useExamStore';

export default function ExamSidebar() {
  const { questions, currentIndex, setCurrentIndex, answers, doubtStatus } = useExamStore();

  const getStatusColor = (questionId: string, index: number) => {
    const isCurrent = index === currentIndex;
    const isAnswered = !!answers[questionId];
    const isDoubt = !!doubtStatus[questionId];

    if (isCurrent) return 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]';
    if (isDoubt) return 'bg-amber-500 text-white';
    if (isAnswered) return 'bg-emerald-600 text-white';
    return 'bg-slate-800 text-slate-400 hover:bg-slate-700';
  };

  // Group questions by segment for easier navigation
  const segments = ["TWK", "TIU", "TKP"];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Navigasi Soal</h3>
        <div className="grid grid-cols-5 gap-3">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${getStatusColor(q.id, idx)}`}
            >
              {q.number}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Keterangan</h3>
        <div className="space-y-3">
          <LegendItem color="bg-indigo-600" label="Sedang Dikerjakan" />
          <LegendItem color="bg-emerald-600" label="Sudah Dijawab" />
          <LegendItem color="bg-amber-500" label="Ragu-ragu" />
          <LegendItem color="bg-slate-800" label="Belum Dijawab" />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-800">
        <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Status Koneksi</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-300">Terhubung ke Cloud Redis</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}
