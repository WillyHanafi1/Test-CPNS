"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExamStore } from '@/store/useExamStore';
import ExamHeader from '@/components/exam/ExamHeader';
import QuestionDisplay from '@/components/exam/QuestionDisplay';
import ExamSidebar from '@/components/exam/ExamSidebar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function ExamPage() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    isStarted, 
    isFinished, 
    startExam, 
    tick, 
    questions, 
    currentIndex 
  } = useExamStore();
  const [loading, setLoading] = useState(true);

  // Initialize Exam
  useEffect(() => {
    const initExam = async () => {
      // If already started and same package, don't restart
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

        if (!response.ok) throw new Error("Failed to start exam");

        const data = await response.json();
        startExam(
          String(id), 
          data.session_id, 
          data.package.questions, 
          100 // 100 minutes
        );
      } catch (error) {
        console.error(error);
        router.push(`/catalog/${id}`);
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [id, startExam, isStarted, questions.length, router]);

  // Timer Tick
  useEffect(() => {
    if (!isStarted || isFinished) return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isFinished, tick]);

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
        <h1 className="text-3xl font-bold mb-4">Waktu Habis!</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          Ujian Anda telah selesai dikumpulkan secara otomatis. Hasil Anda sedang diproses oleh sistem.
        </p>
        <Button onClick={() => router.push('/dashboard')} className="bg-indigo-600 hover:bg-indigo-700">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <ExamHeader />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Main Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <QuestionDisplay />
          </div>
        </div>

        {/* Sidebar Navigation */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/50 hidden lg:block overflow-y-auto">
          <ExamSidebar />
        </aside>
      </main>
    </div>
  );
}
