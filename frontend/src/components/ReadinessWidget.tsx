"use client";

import React, { useEffect, useState } from 'react';
import { Lock, TrendingUp, TrendingDown, Minus, ChevronRight, Activity, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

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
  pg_consistency?: number;
  confidence_score?: number;
}

const LEVEL_STYLES: Record<string, { bg: string; border: string; glow: string; ring: string; text: string; progress: string }> = {
  not_ready: {
    bg: 'from-rose-900/30 to-slate-900',
    border: 'border-rose-500/30',
    glow: 'bg-rose-500',
    ring: 'stroke-rose-500',
    text: 'text-rose-400',
    progress: 'bg-rose-500',
  },
  ready: {
    bg: 'from-amber-900/30 to-slate-900',
    border: 'border-amber-500/30',
    glow: 'bg-amber-500',
    ring: 'stroke-amber-500',
    text: 'text-amber-400',
    progress: 'bg-amber-500',
  },
  very_ready: {
    bg: 'from-emerald-900/30 to-slate-900',
    border: 'border-emerald-500/30',
    glow: 'bg-emerald-500',
    ring: 'stroke-emerald-500',
    text: 'text-emerald-400',
    progress: 'bg-emerald-500',
  },
  master: {
    bg: 'from-blue-900/30 to-slate-900',
    border: 'border-blue-500/30',
    glow: 'bg-blue-500',
    ring: 'stroke-blue-500',
    text: 'text-blue-400',
    progress: 'bg-blue-500',
  },
  legendary: {
    bg: 'from-cyan-900/30 to-slate-900',
    border: 'border-cyan-500/30',
    glow: 'bg-cyan-500',
    ring: 'stroke-cyan-500',
    text: 'text-cyan-400',
    progress: 'bg-cyan-500',
  },
};

function CircularProgress({ percentage, color, size = 80 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${color} transition-all duration-1000 ease-out`}
        style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
      />
    </svg>
  );
}

export default function ReadinessWidget() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/analytics/readiness`, { credentials: 'include' });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error('Failed to fetch readiness:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReadiness();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-4" />
        <div className="h-20 bg-slate-800 rounded-2xl mb-3" />
        <div className="h-3 bg-slate-800 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  // ── Locked State ──
  if (data.is_locked) {
    const progress = ((data.total_finished_sessions) / (data.required_sessions || 3)) * 100;
    return (
      <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-10 pointer-events-none" />

        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
            <Lock className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Prediksi Kesiapan</h2>
        </div>

        <div className="flex items-center justify-center py-5">
          <div className="relative">
            <CircularProgress percentage={progress} color="stroke-indigo-500" size={104} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-slate-800/90 w-14 h-14 flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-slate-700 backdrop-blur-md">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mb-1 font-medium">
          Selesaikan <span className="text-indigo-400 font-bold">{data.sessions_remaining}</span> tryout lagi
        </p>
        <p className="text-[10px] text-slate-500 text-center mb-5">
          {data.total_finished_sessions}/{data.required_sessions || 3} sesi selesai
        </p>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Link href="/catalog">
          <Button variant="secondary" size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 rounded-xl text-xs font-bold transition-all">
            Kerjakan Tryout Sekarang
          </Button>
        </Link>
      </div>
    );
  }

  // ── Unlocked State ──
  const { readiness, trend, avg_scores, pg_consistency } = data;
  if (!readiness || !avg_scores) return null;

  const style = LEVEL_STYLES[readiness.level] || LEVEL_STYLES.not_ready;
  const maxScore = 550;
  const scorePercentage = Math.min((avg_scores.total / maxScore) * 100, 100);

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className={`bg-gradient-to-br ${style.bg} border ${style.border} rounded-3xl p-6 relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${style.glow} rounded-full blur-[80px] opacity-15 pointer-events-none`} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-700/50 rounded-lg">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Kesiapan CPNS</h2>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <TrendIcon className={`w-3.5 h-3.5 ${trend.direction === 'up' ? 'text-emerald-400' : trend.direction === 'down' ? 'text-rose-400' : 'text-slate-500'}`} />
            {trend.label}
          </div>
        )}
      </div>

      {/* Score Ring + Level */}
      <div className="flex items-center gap-5 mb-4">
        <div className="relative shrink-0">
          <CircularProgress percentage={scorePercentage} color={style.ring} size={80} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-white leading-none">{Math.round(avg_scores.total)}</span>
            <span className="text-[8px] text-slate-500 font-bold tracking-wider">AVG</span>
          </div>
        </div>
        <div>
          <p className={`text-xl font-black ${style.text} leading-tight`}>
            {readiness.emoji} {readiness.label}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {readiness.description}
          </p>
        </div>
      </div>

      {/* PG Consistency */}
      <div className="flex items-center gap-2 mb-4 bg-slate-800/40 rounded-xl p-3">
        <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Konsistensi Lolos PG</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${(pg_consistency || 0) >= 80 ? 'bg-emerald-500' : (pg_consistency || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${pg_consistency || 0}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-300">{pg_consistency}%</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Link href="/analytics">
        <Button
          variant="secondary"
          size="sm"
          className={`w-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs group`}
        >
          Lihat Analisis Detail
          <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </Link>
    </div>
  );
}
