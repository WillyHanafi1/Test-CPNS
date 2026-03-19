"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Calendar, Clock, Trophy, ChevronRight,
  LayoutDashboard, History as HistoryIcon, AlertCircle,
  CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/store/useExamStore';

interface ExamSession {
  id: string;         // session ID — used for result redirect
  package_id: string;
  package_title: string;
  start_time: string;
  end_time: string | null;
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
  status: string;
  is_passed: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { resetExam, startExam: _startExam } = useExamStore();

  const fetchHistory = async (isPoll = false) => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    try {
      const response = await fetch(`${API_URL}/api/v1/exam/sessions/me`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  // Effect 1: Initial fetch only
  useEffect(() => {
    if (authLoading || !user) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Effect 2: Independent polling for processing sessions
  useEffect(() => {
    const hasProcessing = sessions.some(s => s.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => fetchHistory(true), 3000);
    return () => clearInterval(interval);
    // Use stable stringified status array to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length, sessions.map(s => s.status).join(',')]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 animate-pulse">Memuat riwayat ujian...</p>
      </div>
    );
  }

  const checkPass = (s: ExamSession) => s.is_passed;

  /**
   * FIX: Redirect to result page using the session ID from the API list.
   * We write the sessionId into the Zustand store so the result page can
   * fetch from `POST /exam/finish/{sessionId}` (which is idempotent and returns
   * the stored scores for finished sessions).
   */
  const handleViewResult = (session: ExamSession) => {
    if (session.status !== 'finished') return;
    // The result page now fetches the result using sessionId from the URL
    router.push(`/exam/${session.id}/result`);
  };

  const finishedSessions = sessions.filter(s => s.status === 'finished');
  const passCount = finishedSessions.filter(checkPass).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <HistoryIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Exam History</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center space-x-3 mb-3 text-indigo-400">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Personal Achievements</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
            Riwayat Simulasi CAT
          </h1>
          <p className="text-slate-400 max-w-2xl">
            Pantau perkembangan skor Anda dari waktu ke waktu. Analisis kelemahan dan terus tingkatkan kemampuan.
          </p>

          {/* Stats Bar */}
          {sessions.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-6">
              <span className="text-sm bg-slate-800/60 border border-slate-700 px-4 py-2 rounded-full text-slate-300">
                Total: <span className="font-bold text-white">{sessions.length}</span> sesi
              </span>
              <span className="text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400">
                Lulus (P/L): <span className="font-bold">{passCount}</span>
              </span>
              <span className="text-sm bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full text-rose-400">
                Belum Lulus (TL): <span className="font-bold">{finishedSessions.length - passCount}</span>
              </span>
            </div>
          )}
        </header>

        {/* Empty State */}
        {sessions.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/20 rounded-[2.5rem] border-2 border-slate-800 border-dashed group hover:border-indigo-500/30 transition-colors">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="h-10 w-10 text-slate-700 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-slate-300 mb-2">Belum Ada Riwayat Ujian</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Mulai simulasi ujian pertama Anda sekarang!</p>
            <Link href="/catalog">
              <Button className="bg-indigo-600 hover:bg-indigo-700 px-8 py-6 rounded-2xl font-bold shadow-xl shadow-indigo-600/20">
                Explore Katalog Ujian
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isFinished = session.status === 'finished';
              const isPass = isFinished && checkPass(session);
              const date = new Date(session.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
              const time = new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

              return (
                <Card
                  key={session.id}
                  className={`bg-slate-900/40 border-slate-800 border-2 rounded-3xl overflow-hidden transition-all duration-300 group ${
                    isFinished ? 'hover:border-indigo-500/30 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/5' : ''
                  }`}
                  onClick={() => isFinished && handleViewResult(session)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Left: Date + Status */}
                      <div className="p-6 md:w-56 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sesi Ujian</p>
                          <div className="flex items-center text-slate-300 font-semibold mb-1 text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-indigo-400 flex-shrink-0" />
                            {date}
                          </div>
                          <div className="flex items-center text-slate-500 text-sm">
                            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                            {time}
                          </div>
                        </div>
                        <div>
                          {session.status === 'ongoing' ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 rounded-full text-[10px] font-bold">ONGOING</Badge>
                          ) : session.status === 'processing' ? (
                            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 rounded-full text-[10px] font-bold animate-pulse">CALCULATING...</Badge>
                          ) : isPass ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> P/L (LULUS)
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" /> TL (TIDAK LULUS)
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right: Scores */}
                      <div className="flex-grow p-6 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Trophy className="w-28 h-28 text-indigo-500" />
                        </div>

                        <div className="relative mb-4">
                          <h3 className="text-xl font-extrabold text-white group-hover:text-indigo-400 transition-colors mb-1">
                            {session.package_title}
                          </h3>
                          <div className="flex items-center text-slate-500 text-xs font-medium">
                            <BookOpen className="w-3 h-3 mr-1.5" /> Simulasi CAT BKN Standar
                          </div>
                        </div>

                        <div className="relative flex flex-wrap items-end justify-between gap-4">
                          {isFinished ? (
                            <>
                              <div className="flex gap-4 md:gap-6">
                                {[
                                  { label: 'TWK', score: session.score_twk, min: PASSING_GRADES.TWK },
                                  { label: 'TIU', score: session.score_tiu, min: PASSING_GRADES.TIU },
                                  { label: 'TKP', score: session.score_tkp, min: PASSING_GRADES.TKP },
                                ].map(({ label, score, min }) => (
                                  <div key={label}>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                                    <p className={`text-xl font-black ${score >= min ? 'text-white' : 'text-rose-400'}`}>{score}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-3 rounded-full border border-emerald-500/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/exam/${session.id}/review`);
                                  }}
                                >
                                  PEMBAHASAN
                                </Button>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total</p>
                                  <p className="text-3xl font-black text-white">{session.total_score}</p>
                                </div>
                                <div className="bg-slate-800 p-2.5 rounded-xl group-hover:bg-indigo-600 transition-colors group-hover:translate-x-1 duration-300">
                                  <ChevronRight className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-slate-500 text-sm italic">Skor belum tersedia.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
