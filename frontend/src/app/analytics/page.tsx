"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Activity, ChevronLeft, TrendingUp, TrendingDown, Minus,
  Shield, AlertTriangle, BookOpen, Zap, Target,
  Lock, CheckCircle2, XCircle, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };
const MAX_SCORES = { TWK: 150, TIU: 175, TKP: 225, TOTAL: 550 };

interface ReadinessData {
  is_locked: boolean;
  total_finished_sessions: number;
  required_sessions?: number;
  sessions_remaining?: number;
  readiness?: {
    level: string;
    label: string;
    emoji: string;
    color: string;
    description: string;
  };
  trend?: {
    direction: string;
    label: string;
    emoji: string;
  };
  avg_scores?: {
    total: number;
    twk: number;
    tiu: number;
    tkp: number;
  };
  raw_avg_scores?: {
    total: number;
    twk: number;
    tiu: number;
    tkp: number;
  };
  pg_consistency?: number;
  confidence_score?: number;
  session_history?: Array<{
    session_id: string;
    date: string;
    package_title: string;
    difficulty: string;
    multiplier: number;
    raw_score: { total: number; twk: number; tiu: number; tkp: number };
    weighted_score: { total: number; twk: number; tiu: number; tkp: number };
    is_passed: boolean;
  }>;
  weak_categories?: Array<{
    category: string;
    avg_score: number;
    passing_grade: number;
    gap: number;
  }>;
  passing_grades?: { TWK: number; TIU: number; TKP: number };
}

interface WeakPoint {
  segment: string;
  sub_category: string;
  total_answered: number;
  correct_count: number;
  mastery_percentage: number;
  status: string;
}

const LEVEL_STYLES: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  not_ready: {
    bg: 'from-rose-900/40 via-slate-900 to-slate-900',
    border: 'border-rose-500/30',
    glow: 'bg-rose-600',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  ready: {
    bg: 'from-amber-900/40 via-slate-900 to-slate-900',
    border: 'border-amber-500/30',
    glow: 'bg-amber-600',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  very_ready: {
    bg: 'from-emerald-900/40 via-slate-900 to-slate-900',
    border: 'border-emerald-500/30',
    glow: 'bg-emerald-600',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  master: {
    bg: 'from-blue-900/40 via-slate-900 to-slate-900',
    border: 'border-blue-500/30',
    glow: 'bg-blue-600',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  legendary: {
    bg: 'from-cyan-900/40 via-slate-900 to-slate-900',
    border: 'border-cyan-500/30',
    glow: 'bg-cyan-600',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
};

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  extreme: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  extreme: '???',
};

const STATUS_STYLES: Record<string, string> = {
  Master: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Proficient: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Beginner: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

function CircularProgress({ percentage, label, value, maxVal, color, size = 100 }: {
  percentage: number; label: string; value: number; maxVal: number; color: string; size?: number;
}) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-800" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className={`${color} transition-all duration-1000 ease-out`}
            style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white leading-none">{Math.round(value)}</span>
          <span className="text-[9px] text-slate-500 font-bold">{maxVal}</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}

// Custom Tooltip for chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-bold text-white">{Math.round(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ReadinessData | null>(null);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      const fetchData = async () => {
        try {
          const [readinessRes, weakPointsRes] = await Promise.all([
            fetch(`${API_URL}/api/v1/analytics/readiness`, { credentials: 'include' }),
            fetch(`${API_URL}/api/v1/user/me/weak-points`, { credentials: 'include' }),
          ]);
          if (readinessRes.ok) setData(await readinessRes.json());
          if (weakPointsRes.ok) setWeakPoints(await weakPointsRes.json());
        } catch (error) {
          console.error('Failed to fetch analytics:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Menganalisis data Anda...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── Locked State ──
  if (!data || data.is_locked) {
    const progress = data ? ((data.total_finished_sessions) / (data.required_sessions || 3)) * 100 : 0;
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Navbar */}
        <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <div className="mx-4 h-5 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm">Analisis Kesiapan CPNS</span>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-slate-800/50 border-2 border-slate-700 flex items-center justify-center">
                <Lock className="w-12 h-12 text-slate-600" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full">
                {data?.total_finished_sessions || 0}/{data?.required_sessions || 3}
              </div>
            </div>
            <h1 className="text-2xl font-extrabold mb-3">Fitur Analisis Terkunci 🔒</h1>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Untuk mendapatkan prediksi kesiapan CPNS yang akurat, selesaikan minimal <span className="text-indigo-400 font-bold">{data?.required_sessions || 3} paket Tryout</span>.
              Semakin banyak data, semakin presisi analisisnya.
            </p>
            {data && (
              <div className="w-full max-w-xs mb-8">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">
                  {data.sessions_remaining} tryout lagi untuk membuka
                </p>
              </div>
            )}
            <Link href="/catalog">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-5 rounded-2xl shadow-lg shadow-indigo-600/30 group">
                <Zap className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform" />
                Mulai Tryout Sekarang
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Unlocked State — Full Analytics ──
  const { readiness, trend, avg_scores, raw_avg_scores, pg_consistency, confidence_score, session_history, weak_categories } = data;
  if (!readiness || !avg_scores || !session_history) return null;

  const style = LEVEL_STYLES[readiness.level] || LEVEL_STYLES.not_ready;

  // Prepare chart data (chronological)
  const chartData = session_history.map((s, i) => ({
    name: s.date.split('-').slice(1).join('/'),
    Total: s.raw_score.total,
    TWK: s.raw_score.twk,
    TIU: s.raw_score.tiu,
    TKP: s.raw_score.tkp,
    difficulty: s.difficulty,
    packageTitle: s.package_title,
  }));

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
          <div className="mx-4 h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm">Analisis Kesiapan CPNS</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ═══ HERO CARD ═══ */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${style.bg} border ${style.border} p-8 md:p-10`}>
          <div className={`absolute -top-24 -right-24 w-60 h-60 ${style.glow} rounded-full blur-[120px] opacity-15 pointer-events-none`} />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Left: Level info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${style.badge}`}>
                  {readiness.emoji} {readiness.label}
                </span>
                {trend && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <TrendIcon className={`w-3.5 h-3.5 ${trend.direction === 'up' ? 'text-emerald-400' : trend.direction === 'down' ? 'text-rose-400' : 'text-slate-500'}`} />
                    Tren {trend.label}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                Analisis Kesiapan <span className={style.text}>CPNS</span>
              </h1>
              <p className="text-slate-400 leading-relaxed max-w-lg">
                {readiness.description}
              </p>

              {/* Bars container */}
              <div className="flex flex-col gap-3 mt-6">
                {/* PG Consistency Bar */}
                <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-4 max-w-md">
                  <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Konsistensi Lolos Passing Grade</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${(pg_consistency || 0) >= 80 ? 'bg-emerald-500' : (pg_consistency || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${pg_consistency || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-white">{pg_consistency}%</span>
                    </div>
                  </div>
                </div>

                {/* Confidence Score Bar */}
                <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-4 max-w-md">
                  <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Akurasi Prediksi (Berdasarkan Jam Terbang)</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${(confidence_score || 0) >= 80 ? 'bg-cyan-500' : (confidence_score || 0) >= 50 ? 'bg-blue-500' : 'bg-slate-500'}`}
                          style={{ width: `${confidence_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-white">{confidence_score}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Score Rings */}
            <div className="grid grid-cols-2 gap-6">
              <CircularProgress percentage={Math.min(((raw_avg_scores?.twk || 0) / MAX_SCORES.TWK) * 100, 100)} label="TWK" value={raw_avg_scores?.twk || 0} maxVal={MAX_SCORES.TWK} color={(raw_avg_scores?.twk || 0) >= PASSING_GRADES.TWK ? 'stroke-emerald-500' : 'stroke-rose-500'} />
              <CircularProgress percentage={Math.min(((raw_avg_scores?.tiu || 0) / MAX_SCORES.TIU) * 100, 100)} label="TIU" value={raw_avg_scores?.tiu || 0} maxVal={MAX_SCORES.TIU} color={(raw_avg_scores?.tiu || 0) >= PASSING_GRADES.TIU ? 'stroke-emerald-500' : 'stroke-rose-500'} />
              <CircularProgress percentage={Math.min(((raw_avg_scores?.tkp || 0) / MAX_SCORES.TKP) * 100, 100)} label="TKP" value={raw_avg_scores?.tkp || 0} maxVal={MAX_SCORES.TKP} color={(raw_avg_scores?.tkp || 0) >= PASSING_GRADES.TKP ? 'stroke-emerald-500' : 'stroke-rose-500'} />
              <CircularProgress
                percentage={Math.min((avg_scores.total / MAX_SCORES.TOTAL) * 100, 100)}
                label="TOTAL*"
                value={avg_scores.total}
                maxVal={MAX_SCORES.TOTAL}
                color={readiness.level === 'legendary' ? 'stroke-cyan-500' : readiness.level === 'master' ? 'stroke-blue-500' : readiness.level === 'very_ready' ? 'stroke-emerald-500' : readiness.level === 'ready' ? 'stroke-amber-500' : 'stroke-rose-500'}
                size={100}
              />
            </div>
          </div>

          <p className="text-[9px] text-slate-600 mt-4 italic">
            * Skor TOTAL memperhitungkan bobot kesulitan paket (Easy ×0.90, Medium ×1.00, Hard ×1.15, ??? ×1.30)
          </p>
        </div>

        {/* ═══ SCORE TREND CHART ═══ */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">Tren Skor (5 Sesi Terakhir)</h2>
            </div>
          </div>

          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                />

                {/* Passing Grade Reference Lines */}
                <ReferenceLine y={PASSING_GRADES.TWK} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.4} />
                <ReferenceLine y={PASSING_GRADES.TIU} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.4} />
                <ReferenceLine y={PASSING_GRADES.TKP} stroke="#8b5cf6" strokeDasharray="5 5" strokeOpacity={0.4} />

                <Line type="monotone" dataKey="TWK" name="TWK" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="TIU" name="TIU" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="TKP" name="TKP" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Total" name="Total" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-slate-600 mt-4 italic">
            Garis putus-putus menunjukkan batas Passing Grade BKN (TWK: {PASSING_GRADES.TWK}, TIU: {PASSING_GRADES.TIU}, TKP: {PASSING_GRADES.TKP})
          </p>
        </div>

        {/* ═══ TWO-COLUMN: Session History + Weak Points ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Session History Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Riwayat 5 Sesi Terakhir</h2>
            </div>
            <div className="space-y-3">
              {session_history.map((s, i) => (
                <div key={s.session_id}
                  className="flex items-center justify-between bg-slate-800/40 rounded-xl p-3 hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${s.is_passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {s.is_passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-300 truncate">{s.package_title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-600">{s.date}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${DIFFICULTY_BADGE[s.difficulty] || DIFFICULTY_BADGE.medium}`}>
                          {DIFFICULTY_LABELS[s.difficulty] || s.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-lg font-black text-white">{s.raw_score.total}</p>
                    <p className="text-[9px] text-slate-600 font-mono">
                      {s.raw_score.twk}/{s.raw_score.tiu}/{s.raw_score.tkp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak Points */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Sub-Topik Terlemah</h2>
            </div>

            {weakPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mb-3" />
                <p className="text-slate-400 text-sm font-medium">Belum cukup data</p>
                <p className="text-slate-600 text-xs mt-1">Kerjakan lebih banyak tryout untuk melihat analisis sub-topik.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakPoints.map((wp, i) => (
                  <div key={`${wp.segment}-${wp.sub_category}`}
                    className="bg-slate-800/40 rounded-xl p-4 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-300 truncate">{wp.sub_category}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[wp.status] || STATUS_STYLES.Beginner}`}>
                        {wp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider w-8">{wp.segment}</span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${wp.mastery_percentage >= 60 ? 'bg-blue-500' : wp.mastery_percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${wp.mastery_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-300 w-12 text-right">{wp.mastery_percentage}%</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {wp.correct_count}/{wp.total_answered} benar
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Weak Categories from Readiness */}
            {weak_categories && weak_categories.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-800">
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mb-3">⚠ Kategori di Bawah Passing Grade</p>
                {weak_categories.map((wc) => (
                  <div key={wc.category} className="flex items-center justify-between py-2">
                    <span className="text-xs font-bold text-rose-300">{wc.category}</span>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Rata-rata: <span className="text-rose-400 font-bold">{wc.avg_score}</span> / min. {wc.passing_grade}</span>
                      <span className="text-[10px] text-rose-500 ml-2">(-{wc.gap})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ CTA CARD ═══ */}
        <div className={`bg-gradient-to-r ${readiness.level === 'legendary' ? 'from-cyan-900/30 to-slate-900' : readiness.level === 'master' ? 'from-blue-900/30 to-slate-900' : readiness.level === 'very_ready' ? 'from-emerald-900/30 to-slate-900' : readiness.level === 'ready' ? 'from-amber-900/30 to-slate-900' : 'from-rose-900/30 to-slate-900'} border ${readiness.level === 'legendary' ? 'border-cyan-500/20' : readiness.level === 'master' ? 'border-blue-500/20' : readiness.level === 'very_ready' ? 'border-emerald-500/20' : readiness.level === 'ready' ? 'border-amber-500/20' : 'border-rose-500/20'} rounded-3xl p-8 text-center`}>
          {readiness.level === 'legendary' ? (
            <>
              <h3 className="text-xl font-extrabold mb-2 text-cyan-400">✨ Anda Adalah Legenda!</h3>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Pengalaman Anda di atas 99% peserta lain. Jaga mentalitas pemenang ini sampai hari H. Formasi impian sudah di depan mata!
              </p>
            </>
          ) : readiness.level === 'master' ? (
            <>
              <h3 className="text-xl font-extrabold mb-2 text-blue-400">💎 Mental Baja Teruji!</h3>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Jam terbang yang luar biasa tinggi dengan skor yang sangat memuaskan. Anda sudah siap untuk segala jenis jebakan soal SKD.
              </p>
            </>
          ) : readiness.level === 'very_ready' ? (
            <>
              <h3 className="text-xl font-extrabold mb-2 text-emerald-400">🏆 Performa Luar Biasa!</h3>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Pertahankan konsistensi Anda. Gunakan tryout berkesulitan tinggi untuk mempertajam insting.
              </p>
            </>
          ) : readiness.level === 'ready' ? (
            <>
              <h3 className="text-xl font-extrabold mb-2 text-amber-400">💪 Hampir Sampai!</h3>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Tingkatkan skor rata-rata total dan jaga konsistensi. Fokus pada sub-topik terlemah Anda untuk menutup gap nilai.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-extrabold mb-2 text-rose-400">🎯 Jangan Menyerah!</h3>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Latihan repetitif adalah kuncinya. Fokuskan energi pada kategori yang belum lolos Passing Grade.
              </p>
            </>
          )}
          <Link href="/catalog">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-5 rounded-2xl shadow-lg shadow-indigo-600/30 group">
              <BookOpen className="w-4 h-4 mr-2" />
              Kerjakan Tryout Lagi
              <Zap className="w-4 h-4 ml-2 group-hover:scale-125 transition-transform" />
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
