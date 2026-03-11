"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, Medal, Home, ArrowLeft, User, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number | null, score: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lbRes, rankRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/exam/national-leaderboard?limit=100`, { credentials: 'include' }),
          fetch(`${API_URL}/api/v1/exam/my-rank`, { credentials: 'include' })
        ]);
        
        const lbData = await lbRes.json();
        const rankData = await rankRes.json();
        
        setLeaderboard(lbData);
        setMyRank(rankData);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Memuat Peringkat Nasional...</p>
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
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Top 100 Peringkat Nasional</p>
        </div>

        {/* My Rank Card */}
        {myRank && myRank.rank && (
          <Card className="bg-indigo-600/10 border-indigo-500/30 rounded-[2rem] overflow-hidden border-2 shadow-2xl shadow-indigo-500/5">
            <CardContent className="p-6 md:p-8 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
                  <span className="text-2xl font-black text-white italic">#{myRank.rank}</span>
                </div>
                <div>
                  <h3 className="font-bold text-indigo-400 uppercase tracking-widest text-xs mb-1">Peringkat Saya</h3>
                  <p className="text-xl font-black text-white tracking-tight">Anda berada di posisi 100 besar nasional!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-white italic tracking-tighter">{myRank.score}</div>
                <div className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter">Total Points</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 Podium */}
        {leaderboard.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-6 items-end pt-12 max-w-2xl mx-auto">
            {/* Rank 2 */}
            {leaderboard.length >= 2 ? (
              <PodiumItem 
                name={leaderboard[1].name} 
                score={leaderboard[1].score} 
                rank={2} 
                height="h-32 md:h-40" 
                color="text-slate-300" 
                bg="bg-slate-400/5"
                borderColor="border-slate-400/20"
              />
            ) : <div />}

            {/* Rank 1 */}
            <PodiumItem 
              name={leaderboard[0].name} 
              score={leaderboard[0].score} 
              rank={1} 
              height="h-44 md:h-56" 
              color="text-amber-400" 
              bg="bg-amber-500/10"
              borderColor="border-amber-500/30"
              glow
            />

            {/* Rank 3 */}
            {leaderboard.length >= 3 ? (
              <PodiumItem 
                name={leaderboard[2].name} 
                score={leaderboard[2].score} 
                rank={3} 
                height="h-24 md:h-32" 
                color="text-orange-400" 
                bg="bg-orange-500/5"
                borderColor="border-orange-500/20"
              />
            ) : <div />}
          </div>
        )}

        {/* Full List */}
        <div className="space-y-4 pt-8">
          {leaderboard.slice(3).map((item, index) => (
            <Card key={index} className="bg-slate-900/30 border-slate-800/50 hover:border-indigo-500/30 transition-all duration-300 group rounded-3xl overflow-hidden hover:bg-slate-900/50">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <span className="w-8 text-center font-black text-xl text-slate-700 group-hover:text-indigo-500/50 transition-colors">
                    {index + 4}
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700 group-hover:border-indigo-500/50 transition-all">
                    <User className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight text-lg leading-none mb-1">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mr-2" />
                      {item.target}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white italic tracking-tighter group-hover:scale-110 transition-transform origin-right">
                    {item.score}
                  </div>
                  <div className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">Points</div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {leaderboard.length === 0 && (
            <div className="text-center py-32 bg-slate-900/20 rounded-[3rem] border-4 border-dashed border-slate-900/50 flex flex-col items-center">
              <Trophy className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Belum ada data peringkat nasional</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="pt-12 text-center pb-20">
           <Button 
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-8 px-12 rounded-[2rem] shadow-2xl shadow-indigo-600/20 text-lg group"
          >
            <Home className="w-5 h-5 mr-3 group-hover:-translate-y-1 transition-transform" />
            Lanjut Berlatih Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}

function PodiumItem({ name, score, rank, height, color, bg, borderColor, glow = false }: any) {
  return (
    <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center space-y-1">
        <div className={`font-black text-[10px] uppercase tracking-[0.2em] ${color}`}>
          {rank === 1 ? '🥇 Winner' : rank === 2 ? '🥈 Runner Up' : '🥉 3rd Place'}
        </div>
        <div className="font-black text-sm md:text-base truncate w-24 md:w-32 text-white uppercase tracking-tighter">
          {name}
        </div>
      </div>
      <div className={`w-full ${height} ${bg} rounded-t-[2.5rem] border-x-2 border-t-2 ${borderColor} relative group transition-all duration-500 hover:brightness-125`}>
        {glow && (
          <div className="absolute inset-0 bg-amber-500 blur-[80px] opacity-10 animate-pulse pointer-events-none" />
        )}
        <div className="absolute inset-x-0 -top-8 flex justify-center">
           <div className={`w-16 h-16 rounded-2xl ${bg} backdrop-blur-md border-2 ${borderColor} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform`}>
             <User className={`w-8 h-8 ${color}`} />
           </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">{score}</span>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Points</span>
        </div>
      </div>
    </div>
  );
}
