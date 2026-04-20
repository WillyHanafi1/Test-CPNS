"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Award, BarChart3, Home, BookOpen, ArrowRight } from 'lucide-react';
import { useExamStore } from '@/store/useExamStore';
import AIAnalysisCard from '@/components/AIAnalysisCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Accurate max scores per category (BKN standard)
const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };
const MAX_SCORES = { TWK: 175, TIU: 175, TKP: 225 };

export default function ResultPage() {
  const params = useParams();
  // Safe extraction: useParams can return string | string[] in Next.js
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { resetExam } = useExamStore();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [rankData, setRankData] = useState<{ rank: number | null, percentile: number, totalParticipants: number }>({ rank: null, percentile: 0, totalParticipants: 0 });
  const retryCountRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) {
      router.replace('/dashboard');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let pollTimeout: NodeJS.Timeout | null = null;
    let startTime = Date.now();
    const MAX_POLL_TIME = 45000; // 45 detik timeout untuk skala tinggi
    let pollDelay = 2000; // Mulai dengan jeda 2 detik

    const fetchResult = async () => {
      try {
        // FIX #5: Try GET /result first (lightweight, no row lock)
        // Only call POST /finish if the session is still 'ongoing'
        const getRes = await fetch(`${API_URL}/api/v1/exam/result/${id}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        });

        // Specific 404 Handling
        if (getRes.status === 404) {
          setErrorMsg("Sesi ujian tidak ditemukan. Mungkin Anda sudah keluar atau sesi telah kadaluarsa.");
          setLoading(false);
          return;
        }

        if (getRes.ok) {
          const getData = await getRes.json();

          if (getData.status === 'finished' || getData.status === 'already finished') {
            // Already scored — show result immediately
            if (!controller.signal.aborted) {
              setResult(getData);
              setLoading(false);
            }
            return;
          }

          if (getData.status === 'processing') {
            // Scoring in progress — start polling
            if (!controller.signal.aborted) setLoading(true);
            pollResult();
            return;
          }

          // Status is 'ongoing' — need to finish first
        }

        // Session is ongoing or GET failed — trigger finish
        const response = await fetch(`${API_URL}/api/v1/exam/finish/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
          signal: controller.signal
        });

        if (response.status === 404) {
          setErrorMsg("Sesi ujian tidak dapat diselesaikan karena tidak ditemukan.");
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error("Gagal memproses hasil ujian");


        const data = await response.json();

        if (data.status === 'processing') {
          if (!controller.signal.aborted) setLoading(true);
          pollResult();
        } else {
          if (!controller.signal.aborted) {
            setResult(data);
            setLoading(false);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setErrorMsg(error.message || 'Gagal menghubungi server');
          setLoading(false);
        }
      }
    };

    const pollResult = () => {
      if (Date.now() - startTime > MAX_POLL_TIME) {
        if (!controller.signal.aborted) {
          setErrorMsg('Waktu pemrosesan terlalu lama (timeout). Pekerja latar belakang mungkin sibuk.');
          setLoading(false);
        }
        return;
      }

      pollTimeout = setTimeout(async () => {
        if (controller.signal.aborted) return;
        try {
          const pollRes = await fetch(`${API_URL}/api/v1/exam/result/${id}`, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal
          });
          if (!pollRes.ok) throw new Error("Gagal mengambil hasil");

          const pollData = await pollRes.json();
          setResult(pollData);

          if (pollData.status === 'finished' || pollData.status === 'already finished') {
            if (!controller.signal.aborted) {
              setLoading(false);
            }
            
            // IF AI is still processing, keep polling but maybe slower?
            if (pollData.ai_status === 'processing') {
              pollDelay = Math.min(pollDelay * 1.5, 5000); // Poll every ~5s for AI
              if (!controller.signal.aborted) pollResult();
            }
          } else if (pollData.status === 'processing') {
            // Main scoring still in progress
            pollDelay = Math.min(pollDelay * 1.5, 10000);
            if (!controller.signal.aborted) pollResult();
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          if (!controller.signal.aborted) {
            setErrorMsg(err.message || "Gagal mengambil hasil");
            setLoading(false);
          }
        }
      }, pollDelay);
    };

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' });
        if (res.ok) setUser(await res.json());
      } catch (e) {}
    };

    fetchUser();
    fetchResult();

    return () => {
      controller.abort();
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [id, router, retryTrigger]);

  // Fetch rank once result is loaded and we have a package_id
  useEffect(() => {
    if (!result?.package_id) return;
    const fetchRank = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/exam/my-rank/${result.package_id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setRankData({ 
            rank: data.rank, 
            percentile: data.percentile || 0, 
            totalParticipants: data.totalParticipants || data.total_participants || 0 
          });
        }
      } catch (e) {
        console.error("Gagal mengambil data rank", e);
      }
    };
    fetchRank();
  }, [result?.package_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Mengkalkulasi Skor Anda...</p>
        <p className="text-slate-600 text-sm mt-2">Mohon tunggu, proses ini bisa memakan beberapa detik.</p>
      </div>
    );
  }

  if (errorMsg || !result || (result.total_score == null && result.status !== 'already finished')) {
    const handleRetry = () => {
      retryCountRef.current += 1;
      setErrorMsg(null);
      setLoading(true);
      setRetryTrigger(prev => prev + 1);
    };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <XCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Ups! Terjadi Kesalahan</h1>
        <p className="text-slate-400 mb-4">Gagal memproses hasil ujian Anda.</p>
        {errorMsg && (
          <p className="text-xs text-slate-600 mb-6 font-mono bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            {errorMsg}
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={handleRetry} className="bg-indigo-600 hover:bg-indigo-500">
            Coba Lagi {retryCountRef.current > 0 && `(${retryCountRef.current})`}
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-slate-700 text-slate-300">
            Ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isPass = (
    result.score_twk >= PASSING_GRADES.TWK &&
    result.score_tiu >= PASSING_GRADES.TIU &&
    result.score_tkp >= PASSING_GRADES.TKP
  );

  const handleGenerateAI = async () => {
    if (!id || result?.ai_status === 'processing') return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/exam/${id}/ai-generate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        // [PERBAIKAN]: Trigger ulang useEffect agar polling berjalan lagi
        setRetryTrigger(prev => prev + 1); 
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Gagal memulai analisis AI");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-2 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Award className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Hasil Tryout CAT
          </h1>
          <p className="text-slate-400 font-medium">Rincian skor Seleksi Kompetensi Dasar (SKD)</p>
        </div>

        {/* Main Status Card */}
        <div className={`relative p-8 md:p-12 rounded-[2.5rem] border-2 flex flex-col items-center text-center space-y-6 overflow-hidden transition-all duration-500 hover:shadow-2xl ${isPass
            ? 'bg-emerald-500/5 border-emerald-500/30 hover:shadow-emerald-500/10'
            : 'bg-rose-500/5 border-rose-500/30 hover:shadow-rose-500/10'
          }`}>
          <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] opacity-20 ${isPass ? 'bg-emerald-500' : 'bg-rose-500'}`} />

          <div className="relative">
            {isPass ? (
              <div className="relative">
                <CheckCircle className="w-20 h-20 text-emerald-500" />
                <div className="absolute inset-0 w-20 h-20 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
              </div>
            ) : (
              <XCircle className="w-20 h-20 text-rose-500" />
            )}
          </div>

          <div className="relative space-y-2">
            <h2 className={`text-4xl font-black italic tracking-tighter ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPass ? 'SELAMAT! ANDA LULUS' : 'MAAF, ANDA BELUM LULUS'}
            </h2>
            <p className="text-slate-400 max-w-sm mx-auto font-medium">
              {isPass
                ? 'Skor Anda telah melampaui Passing Grade BKN (P/L).'
                : 'Skor Anda belum mencapai ambang batas minimum di salah satu kategori (TL).'}
            </p>
          </div>

          <div className="relative pt-4">
            <div className="text-8xl font-black text-white tracking-tighter">{result.total_score}</div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Total Skor SKD Nasional</p>
          </div>
        </div>

        {/* Percentile Ranking Card */}
        {rankData.totalParticipants > 1 && rankData.rank !== null && (
          <div className={`relative p-6 md:p-8 rounded-[2rem] border-2 overflow-hidden transition-all duration-500 hover:shadow-xl ${
            rankData.percentile >= 75 ? 'bg-indigo-500/5 border-indigo-500/20 hover:shadow-indigo-500/10' :
            rankData.percentile >= 50 ? 'bg-amber-500/5 border-amber-500/20 hover:shadow-amber-500/10' :
            'bg-slate-500/5 border-slate-700 hover:shadow-slate-500/10'
          }`}>
            <div className={`absolute -top-20 -right-20 w-56 h-56 rounded-full blur-[80px] opacity-15 ${
              rankData.percentile >= 75 ? 'bg-indigo-500' : rankData.percentile >= 50 ? 'bg-amber-500' : 'bg-slate-500'
            }`} />

            <div className="relative space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    rankData.percentile >= 75 ? 'bg-indigo-500/10' : rankData.percentile >= 50 ? 'bg-amber-500/10' : 'bg-slate-500/10'
                  }`}>
                    <BarChart3 className={`w-5 h-5 ${
                      rankData.percentile >= 75 ? 'text-indigo-400' : rankData.percentile >= 50 ? 'text-amber-400' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Peringkat Anda</h3>
                    <p className="text-xs text-slate-500">Dibandingkan dengan peserta lain</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">#{rankData.rank}</div>
                  <p className="text-[10px] text-slate-500 font-medium">dari {rankData.totalParticipants} peserta</p>
                </div>
              </div>

              {/* Percentile Bar */}
              <div className="space-y-2">
                <div className="h-4 bg-slate-800/80 rounded-full overflow-hidden p-[2px]">
                  <div
                    className={`h-full rounded-full transition-all duration-[2000ms] ease-out ${
                      rankData.percentile >= 75 ? 'bg-gradient-to-r from-indigo-600 to-indigo-400' :
                      rankData.percentile >= 50 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                      'bg-gradient-to-r from-slate-600 to-slate-400'
                    }`}
                    style={{ width: `${Math.max(rankData.percentile, 3)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-medium px-1">
                  <span>0%</span>
                  <span className={`text-xs font-bold ${
                    rankData.percentile >= 75 ? 'text-indigo-400' : rankData.percentile >= 50 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {
                      (100 - rankData.percentile) <= 0.1 ? "Top 0.1%" :
                      (100 - rankData.percentile) <= 1 ? "Top 1%" :
                      (100 - rankData.percentile) <= 10 ? "Top 10%" :
                      (100 - rankData.percentile) <= 25 ? "Top 25%" :
                      (100 - rankData.percentile) <= 50 ? "Top 50%" :
                      (100 - rankData.percentile) <= 75 ? "Top 75%" : "Perlu Latihan"
                    }
                  </span>
                  <span>100%</span>
                </div>
              </div>

              {/* Motivational Text */}
              <div className={`text-center py-3 px-4 rounded-xl ${
                rankData.percentile >= 75 ? 'bg-indigo-500/10' : rankData.percentile >= 50 ? 'bg-amber-500/10' : 'bg-slate-800/50'
              }`}>
                <p className="text-sm font-semibold text-white">
                  {rankData.percentile >= 90 ? '🏆 ' : rankData.percentile >= 75 ? '🔥 ' : rankData.percentile >= 50 ? '💪 ' : '📈 '}
                  Hasil ujian Anda lebih baik dari{' '}
                  <span className={`font-black ${
                    rankData.percentile >= 75 ? 'text-indigo-400' : rankData.percentile >= 50 ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {rankData.percentile}%
                  </span>
                  {' '}peserta lainnya
                  {rankData.percentile >= 90 ? '!' : rankData.percentile >= 50 ? '.' : '. Terus berlatih!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        <AIAnalysisCard 
          status={result.ai_status} 
          data={result.ai_analysis} 
          isPro={user?.is_pro || false} 
          onGenerate={handleGenerateAI}
        />

        {/* Categories Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CategoryScore
            label="TWK"
            fullLabel="Tes Wawasan Kebangsaan"
            score={result.score_twk}
            min={PASSING_GRADES.TWK}
            max={MAX_SCORES.TWK}
            colorClass={result.score_twk >= PASSING_GRADES.TWK ? "bg-emerald-500" : "bg-rose-500"}
          />
          <CategoryScore
            label="TIU"
            fullLabel="Tes Intelegensia Umum"
            score={result.score_tiu}
            min={PASSING_GRADES.TIU}
            max={MAX_SCORES.TIU}
            colorClass={result.score_tiu >= PASSING_GRADES.TIU ? "bg-emerald-500" : "bg-rose-500"}
          />
          <CategoryScore
            label="TKP"
            fullLabel="Tes Karakteristik Pribadi"
            score={result.score_tkp}
            min={PASSING_GRADES.TKP}
            max={MAX_SCORES.TKP}
            colorClass={result.score_tkp >= PASSING_GRADES.TKP ? "bg-emerald-500" : "bg-rose-500"}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto border-slate-800 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-7 px-10 rounded-3xl border-2 transition-all group"
            onClick={() => router.push(`/exam/${id}/review`)}
          >
            <BookOpen className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            <span className="font-bold">Lihat Pembahasan</span>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 py-7 px-10 rounded-3xl border-2 transition-all group"
            onClick={() => { resetExam(); router.push('/dashboard'); }}
          >
            <Home className="w-5 h-5 mr-3 group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-bold">Ke Dashboard</span>
          </Button>
          <Button
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-7 px-10 rounded-3xl shadow-2xl shadow-indigo-600/20 group"
            onClick={() => { resetExam(); router.push(`/leaderboard?package_id=${result.package_id}`); }}
          >
            <BarChart3 className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            <span>Lihat Ranking Nasional</span>
            <ArrowRight className="w-4 h-4 ml-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryScore({ label, fullLabel, score, min, max, colorClass }: {
  label: string;
  fullLabel: string;
  score: number;
  min: number;
  max: number;      // Actual max (175/175/225) — not min*1.5
  colorClass: string;
}) {
  // Use the actual max score for accurate progress bar
  const progress = Math.min((score / max) * 100, 100);

  return (
    <Card className="bg-slate-900/50 border-slate-800 border-2 rounded-[2rem] overflow-hidden transition-all hover:border-slate-700 hover:bg-slate-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
          {label}
          {score >= min ? (
            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">LULUS</span>
          ) : (
            <span className="text-[10px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">GAGAL</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-5xl font-black text-white">{score}</span>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ambang Batas</div>
            <div className="text-sm font-bold text-slate-300">{min}</div>
          </div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-[2px]">
          <div
            className={`h-full rounded-full transition-all duration-[1500ms] ease-out ${colorClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{fullLabel}</span>
          <span className="font-medium">max. {max}</span>
        </div>
      </CardContent>
    </Card>
  );
}
