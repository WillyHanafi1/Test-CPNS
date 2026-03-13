"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, User, Home, ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

function LeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const package_id = searchParams.get('package_id');
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<{ 
    rank: number | null, 
    score: number,
    score_twk?: number,
    score_tiu?: number,
    score_tkp?: number
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!package_id) {
      setError("Package ID required to view leaderboard.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [lbRes, rankRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/exam/leaderboard/${package_id}?limit=100`, { credentials: 'include' }),
          fetch(`${API_URL}/api/v1/exam/my-rank/${package_id}`, { credentials: 'include' })
        ]);
        
        if (!lbRes.ok) throw new Error("Gagal mengambil data peringkat.");
        
        const lbData = await lbRes.json();
        const rankData = await rankRes.json();
        
        setLeaderboard(lbData);
        setMyRank(rankData);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [package_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Memuat Peringkat Nasional...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Gagal Memuat</h1>
        <p className="text-slate-400 mb-8">{error}</p>
        <Button onClick={() => router.push('/catalog')} className="bg-slate-800 hover:bg-slate-700">
          Kembali ke Katalog
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div className="flex items-center space-x-2 text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Live National ranking</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-200 to-slate-600">
            LEADERBOARD
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Peringkat Nasional Terkini</p>
        </div>

        {/* Top Rank Table */}
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] overflow-hidden backdrop-blur-sm shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rank</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Peserta</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center hidden sm:table-cell">TWK</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center hidden sm:table-cell">TIU</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center hidden sm:table-cell">TKP</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {leaderboard.slice(0, 10).map((item, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const rankColor = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-orange-400' : 'text-slate-600';
                
                return (
                  <tr key={idx} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-6">
                      <span className={`text-2xl font-black italic tracking-tighter ${rankColor} w-8 text-center`}>
                        {rank}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${isTop3 ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-800 border-slate-700'}`}>
                          <User className={`w-6 h-6 ${isTop3 ? 'text-indigo-400' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 group-hover:text-white transition-colors text-lg uppercase tracking-tight">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium sm:hidden">
                            {item.score_twk || 0}/{item.score_tiu || 0}/{item.score_tkp || 0}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center hidden sm:table-cell">
                      <span className="text-sm font-bold text-slate-400">{item.score_twk || 0}</span>
                    </td>
                    <td className="px-4 py-6 text-center hidden sm:table-cell">
                      <span className="text-sm font-bold text-slate-400">{item.score_tiu || 0}</span>
                    </td>
                    <td className="px-4 py-6 text-center hidden sm:table-cell">
                      <span className="text-sm font-bold text-orange-400/80">{item.score_tkp || 0}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-4xl font-black text-white italic tracking-tighter group-hover:scale-110 transition-transform inline-block">
                        {item.score}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Sticky Rank (User) */}
              {myRank && myRank.rank && myRank.rank > 10 && (
                <tr className="bg-indigo-600/20 border-t-4 border-indigo-500 relative z-10">
                  <td className="px-8 py-8">
                    <span className="text-2xl font-black italic tracking-tighter text-indigo-400 w-8 text-center">
                      {myRank.rank}
                    </span>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center border-2 bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-600/40">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xl uppercase tracking-tight">
                          Posisi Anda
                        </p>
                        <p className="text-xs text-indigo-400 font-black uppercase tracking-widest animate-pulse sm:hidden">
                          {myRank.score_twk || 0}/{myRank.score_tiu || 0}/{myRank.score_tkp || 0}
                        </p>
                        <p className="text-xs text-indigo-400 font-black uppercase tracking-widest hidden sm:block">
                          Waktunya GAS POLL! 🚀
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-8 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-indigo-300/80">{myRank.score_twk || 0}</span>
                  </td>
                  <td className="px-4 py-8 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-indigo-300/80">{myRank.score_tiu || 0}</span>
                  </td>
                  <td className="px-4 py-8 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-orange-400/80">{myRank.score_tkp || 0}</span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <span className="text-5xl font-black text-white italic tracking-tighter">
                      {myRank.score}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {leaderboard.length === 0 && (
            <div className="text-center py-32 flex flex-col items-center">
              <Trophy className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Belum ada data peringkat nasional</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="pt-12 text-center pb-20">
           <Button 
            onClick={() => router.push('/dashboard')}
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500 text-white font-bold py-8 px-12 rounded-[2rem] shadow-2xl text-lg group transition-all"
          >
            <Home className="w-5 h-5 mr-3 group-hover:-translate-y-1 transition-transform" />
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Menyiapkan halaman...</p>
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}

