"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Award, BarChart3, Home, ArrowRight } from 'lucide-react';
import { useExamStore } from '@/store/useExamStore';

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
  const [retryTrigger, setRetryTrigger] = useState(0);
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
          signal: controller.signal
        });

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
                signal: controller.signal
              });
              if (!pollRes.ok) throw new Error("Gagal mengambil hasil");
              
              const pollData = await pollRes.json();
              if (pollData.status === 'finished' || pollData.status === 'already finished') {
                if (!controller.signal.aborted) {
                  setResult(pollData);
                  setLoading(false);
                }
              } else if (pollData.status === 'processing') {
                 // Keep polling with exponential backoff (max 10 seconds)
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

    fetchResult();

    return () => {
      controller.abort();
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [id, router, retryTrigger]);

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

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-2 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Award className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Hasil Simulasi CAT
          </h1>
          <p className="text-slate-400 font-medium">Rincian skor Seleksi Kompetensi Dasar (SKD)</p>
        </div>

        {/* Main Status Card */}
        <div className={`relative p-8 md:p-12 rounded-[2.5rem] border-2 flex flex-col items-center text-center space-y-6 overflow-hidden transition-all duration-500 hover:shadow-2xl ${
          isPass
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
            className="w-full sm:w-auto border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 py-7 px-10 rounded-3xl border-2 transition-all group"
            onClick={() => { resetExam(); router.push('/dashboard'); }}
          >
            <Home className="w-5 h-5 mr-3 group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-bold">Ke Dashboard</span>
          </Button>
          <Button
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-7 px-10 rounded-3xl shadow-2xl shadow-indigo-600/20 group"
            onClick={() => { resetExam(); router.push('/leaderboard'); }}
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
