"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, User, Clock, Crown, Trophy, Star, ChevronRight, TrendingUp } from 'lucide-react';

interface Supporter {
  full_name: string;
  amount: number;
  message: string | null;
  created_at: string;
  is_anonymous: boolean;
}

interface TopSupporter {
  full_name: string;
  total_amount: number;
}

interface DonationStats {
  total_amount: number;
  target_amount: number;
  percentage: number;
  supporter_count: number;
}

interface WallOfFameProps {
  limit?: number;
  compact?: boolean;
}

export default function WallOfFame({ limit, compact }: WallOfFameProps) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [topSupporters, setTopSupporters] = useState<TopSupporter[]>([]);
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      try {
        const [resLatest, resTop, resStats] = await Promise.all([
          fetch(`${API_URL}/api/v1/transactions/donations/wall-of-fame`),
          fetch(`${API_URL}/api/v1/transactions/donations/top`),
          fetch(`${API_URL}/api/v1/transactions/donations/stats`)
        ]);

        if (resLatest.ok) {
          const data = await resLatest.json();
          setSupporters(limit ? data.slice(0, limit) : data);
        }
        if (resTop.ok) {
          setTopSupporters(await resTop.json());
        }
        if (resStats.ok) {
          setStats(await resStats.json());
        }
      } catch (err) {
        console.error('Failed to fetch wall of fame data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [limit]);

  const getTierInfo = (amount: number) => {
    if (amount >= 1000000) return { label: "Sultan NIP", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Crown };
    if (amount >= 500000) return { label: "Mentor Pejuang", color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20", icon: Trophy };
    return { label: "Pejuang NIP", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", icon: User };
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="rounded-full bg-slate-800 h-8 w-8"></div>
          <div className="h-2 w-24 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  // --- COMPACT MODE (Ticker style for sidebar or small areas) ---
  if (compact) {
    if (supporters.length === 0) {
      return (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Wall of Fame</h3>
          </div>
          <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-500 font-medium italic">Belum ada donasi. Jadilah pendukung pertama!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Wall of Fame</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {supporters.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/50 px-2 py-1 rounded-lg hover:border-indigo-500/30 transition-all cursor-default group">
              <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">{item.full_name}</span>
            </div>
          ))}
          {supporters.length > 5 && (
            <div className="text-[8px] font-black text-slate-600 flex items-center uppercase tracking-tighter">
              +{supporters.length - 5} lainnya
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- FULL DESIGN (Podium + List + Activity) ---
  return (
    <div className="w-full space-y-12 py-8 pt-32">
      {/* 1. Progress Monthly Goal */}
      {stats && stats.total_amount > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-24 w-24 text-indigo-500" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Maintenance Fund</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">Rp {stats.total_amount.toLocaleString('id-ID')}</span>
                <span className="text-xs font-bold text-slate-500">/ Rp {stats.target_amount.toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-xl">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{stats.percentage}% Goal Tercapai</span>
                <span className="text-[10px] font-bold text-slate-500 italic">Target Server Bulan Ini</span>
              </div>
              <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50 p-0.5" id="monthly-donation-progress">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center">
              <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-0.5">Supporters</span>
              <span className="text-xl font-black text-white">{stats.supporter_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Podium (Top 3) */}
      {topSupporters.length > 0 && (
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Sultan NIP Leaderboard</h3>
            <p className="text-sm text-slate-500 font-medium">Apresiasi khusus untuk penyokong utama kelangsungan platform</p>
          </div>

          <div className="flex flex-col md:flex-row items-end justify-center gap-4 lg:gap-8 pt-10">
            {/* Rank 2 (Desktop Order 1, Mobile Order 2) */}
            {topSupporters[1] && (
              <div className="order-2 md:order-1 w-full md:w-64 space-y-4">
                <div className="relative bg-slate-900/60 border-2 border-slate-800 rounded-3xl p-6 text-center transform hover:-translate-y-2 transition-all duration-500 group shadow-lg">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-2xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Trophy className="h-6 w-6 text-slate-300" />
                  </div>
                  <div className="pt-4">
                    <h5 className="font-black text-white uppercase text-sm mb-1 truncate">{topSupporters[1].full_name}</h5>
                    <div className="text-lg font-black text-slate-400">Rp {topSupporters[1].total_amount.toLocaleString('id-ID')}</div>
                    <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rank 2 Supporter</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 (Desktop Order 2, Mobile Order 1) */}
            {topSupporters[0] && (
              <div className="order-1 md:order-2 w-full md:w-80 space-y-4 relative">
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce">
                  <Crown className="h-12 w-12 text-amber-400 fill-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                </div>
                <div className="relative bg-gradient-to-b from-slate-900 to-indigo-950/40 border-2 border-amber-500/50 rounded-[2.5rem] p-8 text-center transform hover:-translate-y-3 transition-all duration-500 group shadow-[0_10px_40px_rgba(245,158,11,0.15)]">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Crown className="h-20 w-20 text-amber-500" />
                  </div>
                  <div className="pt-4 relative z-10">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[.4em] mb-2 block">The Sultan NIP</span>
                    <h5 className="font-black text-white uppercase text-xl mb-1 truncate">{topSupporters[0].full_name}</h5>
                    <div className="text-3xl font-black text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">Rp {topSupporters[0].total_amount.toLocaleString('id-ID')}</div>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      <Star className="h-3 w-3 fill-slate-900" /> Utama
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Desktop Order 3, Mobile Order 3) */}
            {topSupporters[2] ? (
              <div className="order-3 w-full md:w-64 space-y-4">
                <div className="relative bg-slate-900/60 border-2 border-slate-800 rounded-3xl p-6 text-center transform hover:-translate-y-2 transition-all duration-500 group shadow-lg">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-2xl bg-orange-950/80 border-2 border-orange-800/50 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Trophy className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="pt-4">
                    <h5 className="font-black text-white uppercase text-sm mb-1 truncate">{topSupporters[2].full_name}</h5>
                    <div className="text-lg font-black text-orange-400/80">Rp {topSupporters[2].total_amount.toLocaleString('id-ID')}</div>
                    <div className="mt-3 inline-block px-3 py-1 rounded-full bg-orange-950/30 border border-orange-900/40 text-[9px] font-black text-orange-400 uppercase tracking-widest">Rank 3 Supporter</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Placeholder to keep Rank 1 centered on desktop if Rank 3 is missing but Rank 2 exists */
              topSupporters[1] && <div className="hidden md:block w-64 order-3" />
            )}
          </div>
        </div>
      )}

      {/* 3. List & Activity Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Honorable Mentions (Rank 4-10) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <h4 className="text-lg font-black text-white italic uppercase tracking-tighter shrink-0 leading-none">Honorable Pejuang</h4>
            <div className="h-px w-full bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topSupporters.slice(3, 11).map((item, idx) => {
              const tier = getTierInfo(item.total_amount);
              return (
                <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-all group">
                  <div className={`h-10 w-10 rounded-xl ${tier.bg} border ${tier.border} flex items-center justify-center shrink-0`}>
                    <tier.icon className={`h-5 w-5 ${tier.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-black text-white uppercase text-xs truncate">{item.full_name}</span>
                      <span className="text-[10px] font-black font-mono text-slate-500">#{idx + 4}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-indigo-400">Rp {item.total_amount.toLocaleString('id-ID')}</span>
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${tier.color}`}>{tier.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {topSupporters.length < 4 && (
              <div className="col-span-full py-12 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                <Star className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest italic">Slot Terbuka Untuk Anda</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Ticker */}
        <div className="lg:col-span-1 space-y-6 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-4">
            <h4 className="text-lg font-black text-white italic uppercase tracking-tighter shrink-0 leading-none">Aktivitas Live</h4>
            <div className="h-px w-full bg-slate-800" />
          </div>

          <div className="flex-1 relative bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden min-h-[500px]">
            {/* Top & Bottom Fading Gradients */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-950/80 to-transparent z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950/80 to-transparent z-20 pointer-events-none" />
            
            <div className="absolute inset-0 p-4 space-y-4 animate-marquee-vertical hover:[animation-play-state:paused] pointer-events-auto">
              {[...supporters, ...supporters].map((item, idx) => (
                <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:border-pink-500/30 transition-colors group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] font-black text-white uppercase truncate">{item.full_name}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">{isMounted ? getRelativeTime(item.created_at) : '...'}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-pink-500 mb-2 font-mono text-left">Rp {item.amount.toLocaleString('id-ID')}</p>
                  {item.message && (
                    <p className="text-[10px] text-slate-400 italic bg-slate-900/40 p-2 rounded-lg leading-relaxed border-l-2 border-slate-700 text-left">
                      "{item.message}"
                    </p>
                  )}
                </div>
              ))}
              {supporters.length === 0 && (
                <div className="p-10 text-center text-slate-600 italic text-xs font-medium">Belum ada donasi terbaru...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-vertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-marquee-vertical {
          animation: marquee-vertical 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
