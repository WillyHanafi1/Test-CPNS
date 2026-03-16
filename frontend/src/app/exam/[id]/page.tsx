"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExamStore } from '@/store/useExamStore';
import ExamHeader from '@/components/exam/ExamHeader';
import QuestionDisplay from '@/components/exam/QuestionDisplay';
import ExamSidebar from '@/components/exam/ExamSidebar';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutGrid, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function ExamPage() {
  const params = useParams();
  // Safe extraction: useParams can return string | string[] in Next.js
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const {
    isStarted,
    isFinished,
    startExam,
    tick,
    questions,
    sessionId,
    packageId
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle

  // HOOK 1: Initialize Exam
  useEffect(() => {
    const initExam = async () => {
      // Resume if already started for same package
      if (isStarted && questions.length > 0) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/exam/start/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.detail || "Gagal memulai ujian";
          router.push(`/catalog/${id}?error=${encodeURIComponent(msg)}`);
          return;
        }

        const data = await response.json();

        startExam(
          String(id),
          data.session_id,
          data.package.questions,
          100,           // fallback durationMinutes (not used when serverEndTimeISO is set)
          data.end_time  // server end_time ISO — source of truth for timer
        );
      } catch (error) {
        console.error(error);
        router.push(`/catalog/${id}`);
      } finally {
        setLoading(false);
      }
    };

    initExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // HOOK 2: Timer Tick
  useEffect(() => {
    if (!isStarted || isFinished) return;
    const interval = setInterval(() => { tick(); }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isFinished, tick]);

  // HOOK 3: Handle Auto-Finish on Time Up (only once, via ref-guard)
  const hasAutoFinished = React.useRef(false);
  useEffect(() => {
    if (isFinished && !hasAutoFinished.current) {
      hasAutoFinished.current = true;
      const currentSessionId = sessionId; // Capture before delay
      const autoFinish = async () => {
        // Delay to allow the "Ujian Selesai!" UI to be read by the user
        await new Promise(resolve => setTimeout(resolve, 1500));
        router.push(currentSessionId ? `/exam/${currentSessionId}/result` : '/dashboard');
      };
      autoFinish();
    }
  }, [isFinished, router, sessionId, packageId]);

  // ==========================================
  // RENDER STATES
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 animate-pulse">Menyiapkan Lembar Ujian...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h1 className="text-3xl font-bold mb-4">Ujian Selesai!</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          Sistem sedang mengamankan jawaban dan menghitung skor Anda. Mohon tunggu sebentar...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Pass setSidebarOpen to ExamHeader for mobile toggle */}
      <ExamHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Main Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <QuestionDisplay />
          </div>
        </div>

        {/* Desktop Sidebar */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/50 hidden lg:block overflow-y-auto">
          <ExamSidebar onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative ml-auto w-80 bg-slate-900 border-l border-slate-800 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Navigasi Soal</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ExamSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}
      </main>

      {/* Mobile floating nav button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setSidebarOpen(true)}
          className="h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30"
        >
          <LayoutGrid className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
