"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, User, TrendingUp, ChevronRight, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LeaderboardEntry {
  name: string;
  score: number;
  score_twk?: number;
  score_tiu?: number;
  score_tkp?: number;
  target: string;
}

interface NationalRankingTableProps {
  packageId?: string;
  packageTitle?: string;
  currentUserEmail?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function NationalRankingTable({ packageId, packageTitle, currentUserEmail }: NationalRankingTableProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ 
    rank: number | null, 
    score: number,
    score_twk?: number,
    score_tiu?: number,
    score_tkp?: number
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [lbRes, rankRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/exam/leaderboard/${packageId}?limit=10`, { credentials: 'include' }),
          fetch(`${API_URL}/api/v1/exam/my-rank/${packageId}`, { credentials: 'include' })
        ]);
        
        if (lbRes.ok) {
          const data = await lbRes.json();
          setLeaderboard(data);
        }
        
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          setMyRank(rankData);
        }
      } catch (err) {
        console.error("Failed to fetch national ranking", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [packageId]);

  if (loading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-slate-800 rounded-lg mb-6"></div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-slate-800/40 rounded-2xl w-full"></div>
        ))}
      </div>
    );
  }

  if (!packageId || leaderboard.length === 0) return null;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">
            Top 10 Nasional <span className="text-slate-500 mx-2 text-sm normal-case not-italic font-normal">—</span> <span className="text-indigo-400 capitalize">{packageTitle || "Tryout Terkini"}</span>
          </h2>
        </div>
        <Link href={`/leaderboard?package_id=${packageId}`}>
          <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 rounded-xl text-xs font-bold uppercase tracking-widest">
            Semua Peringkat <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2rem] overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rank</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Peserta</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center hidden sm:table-cell">TWK</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center hidden sm:table-cell">TIU</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center hidden sm:table-cell">TKP</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {leaderboard.map((item, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const rankColor = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-orange-400' : 'text-slate-600';
              
              return (
                <tr key={idx} className="group hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-5">
                    <span className={`text-lg font-black italic tracking-tighter ${rankColor} w-6 text-center`}>
                      {rank}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isTop3 ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-800 border-slate-700'}`}>
                        <User className={`w-5 h-5 ${isTop3 ? 'text-indigo-400' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 group-hover:text-white transition-colors text-sm uppercase tracking-tight">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium sm:hidden">
                          {item.score_twk || 0}/{item.score_tiu || 0}/{item.score_tkp || 0}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-slate-400">{item.score_twk || 0}</span>
                  </td>
                  <td className="px-4 py-5 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-slate-400">{item.score_tiu || 0}</span>
                  </td>
                  <td className="px-4 py-5 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-orange-400/80">{item.score_tkp || 0}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-2xl font-black text-white italic tracking-tighter group-hover:scale-110 transition-transform inline-block">
                      {item.score}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Sticky Row for User (Rank > 10) */}
            {myRank && myRank.rank && myRank.rank > 10 && (
                <tr className="bg-indigo-600/10 border-t-2 border-indigo-500/30 relative z-10">
                  <td className="px-6 py-5">
                    <span className="text-lg font-black italic tracking-tighter text-indigo-400 w-6 text-center">
                      {myRank.rank}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm uppercase tracking-tight">
                          Anda (Peringkat Nasional)
                        </p>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse sm:hidden">
                          {myRank.score_twk || 0}/{myRank.score_tiu || 0}/{myRank.score_tkp || 0}
                        </p>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest hidden sm:block">
                          Terus Berjuang!
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-indigo-300/80">{myRank.score_twk || 0}</span>
                  </td>
                  <td className="px-4 py-5 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-indigo-300/80">{myRank.score_tiu || 0}</span>
                  </td>
                  <td className="px-4 py-5 text-center hidden sm:table-cell">
                    <span className="text-sm font-bold text-orange-400/80">{myRank.score_tkp || 0}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-2xl font-black text-white italic tracking-tighter">
                      {myRank.score}
                    </span>
                  </td>
                </tr>
            )}
          </tbody>
        </table>
        
        <div className="p-6 bg-slate-900/60 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium italic">
            "Keberhasilan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan."
          </p>
          <Link href="/catalog" className="w-full md:w-auto">
            <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest px-6 h-10 shadow-lg shadow-indigo-600/20">
              Bersaing Sekarang <ChevronRight className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
