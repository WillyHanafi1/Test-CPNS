"use client";

import React from 'react';
import { useExamStore } from '@/store/useExamStore';
import { Button } from '@/components/ui/button';
import { Check, Info, Flag } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function QuestionDisplay() {
  const {
    questions,
    currentIndex,
    answers,
    selectOption,
    doubtStatus,
    toggleDoubt,
    sessionId,
    setCurrentIndex
  } = useExamStore();

  const question = questions[currentIndex];
  if (!question) return null;

  const selectedOptionId = answers[question.id];
  const isDoubt = doubtStatus[question.id];

  const handleSelectOption = async (optionId: string) => {
    // Optimistic UI Update
    selectOption(question.id, optionId);

    // Background Autosave to Redis (only if sessionId is available)
    if (!sessionId) return;
    try {
      fetch(`${API_URL}/api/v1/exam/autosave/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: question.id,
          option_id: optionId
        }),
        credentials: 'include'
      });
    } catch (e) {
      console.error("Autosave failed", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg">
            {question.number}
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700">
            {question.segment}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={() => toggleDoubt(question.id)}
          aria-pressed={isDoubt}
          className={`border-slate-800 ${isDoubt ? 'bg-amber-500/20 border-amber-500 text-amber-500 hover:bg-amber-500/30' : 'hover:bg-slate-900 text-slate-400'}`}
        >
          <Flag aria-hidden="true" className={`w-4 h-4 mr-2 ${isDoubt ? 'fill-current' : ''}`} />
          Ragu-ragu
        </Button>
      </div>

      {/* Question Content */}
      <div className="space-y-4">
        <div className="text-lg md:text-xl font-medium leading-relaxed text-slate-200 overflow-x-auto">
          <Latex strict={false}>{question.content}</Latex>
        </div>

        {question.image_url && (
          <div className="rounded-xl overflow-hidden border border-slate-800 max-w-sm shadow-xl bg-slate-900/40">
            <img src={question.image_url} alt="Question Diagram" className="w-full h-auto" />
          </div>
        )}
      </div>

      {/* Options Grid - Aggressive Compact Layout */}
      <div className={`grid gap-3 ${
          question.options.some(o => o.image_url) 
            ? 'grid-cols-2 lg:grid-cols-5' 
            : 'grid-cols-1 md:grid-cols-2'
        }`}>
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelectOption(option.id)}
            aria-pressed={selectedOptionId === option.id}
            className={`flex flex-col p-3 rounded-xl border transition-all duration-200 text-left group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${selectedOptionId === option.id
                ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
          >
            <div className="flex items-center mb-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs mr-2 shrink-0 transition-colors ${selectedOptionId === option.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                }`}>
                {option.label}
              </div>
              
              {!option.image_url && option.content && (
                <div className={`text-base flex-1 overflow-x-auto ${selectedOptionId === option.id ? 'text-white' : 'text-slate-300'}`}>
                  <Latex strict={false}>{option.content}</Latex>
                </div>
              )}

              {selectedOptionId === option.id && (
                <Check className="w-4 h-4 text-indigo-500 ml-auto" />
              )}
            </div>

            {option.image_url && (
              <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center p-1">
                <img src={option.image_url} alt={`Option ${option.label}`} className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="pt-8 flex items-center justify-between border-t border-slate-900">
        <Button
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="text-slate-400 hover:text-white"
        >
          ← Sebelumnya
        </Button>
        <div className="flex items-center text-slate-500 text-sm italic">
          <Info className="w-4 h-4 mr-2" />
          Klik opsi jawaban untuk menyimpan secara otomatis
        </div>
        <Button
          disabled={currentIndex === questions.length - 1}
          onClick={() => setCurrentIndex(currentIndex + 1)}
          className="bg-slate-800 hover:bg-slate-700 text-white"
        >
          Selanjutnya →
        </Button>
      </div>
    </div>
  );
}
