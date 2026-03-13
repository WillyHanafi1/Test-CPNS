"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  LogOut, User, BookOpen, History, Trophy,
  ChevronRight, TrendingUp, Target, Zap, Clock,
  CheckCircle2, XCircle, AlertCircle, Heart,
  ShieldCheck, Quote
} from 'lucide-react';
import Link from 'next/link';
import DonationModal from '@/components/DonationModal';
import WallOfFame from '@/components/WallOfFame';
import NationalRankingTable from '@/components/NationalRankingTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface RecentSession {
  id: string;
  package_id: string;
  package_title: string;
  start_time: string;
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
  status: string;
  is_passed: boolean;
}

const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };
const MAX_SCORE = 150 + 175 + 225; // 550 total max

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [stats, setStats] = useState({ total_sessions: 0, best_score: 0, total_passed: 0 });
  const [weeklyPackage, setWeeklyPackage] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      // Fetch stats
      const fetchDashboardData = async () => {
        try {
          const [statsRes, sessionsRes, weeklyRes] = await Promise.all([
            fetch(`${API_URL}/api/v1/exam/sessions/me/stats`, { credentials: 'include' }),
            fetch(`${API_URL}/api/v1/exam/sessions/me`, { credentials: 'include' }),
            fetch(`${API_URL}/api/v1/packages/weekly-active`, { credentials: 'include' })
          ]);

          const statsData = statsRes.ok ? await statsRes.json() : { total_sessions: 0, best_score: 0, total_passed: 0 };
          const sessionsData = sessionsRes.ok ? await sessionsRes.json() : [];
          const weeklyData = weeklyRes.ok ? await weeklyRes.json() : null;

          setStats(statsData);
          setSessions(sessionsData.slice(0, 5));
          setWeeklyPackage(weeklyData);
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        } finally {
          setStatsLoading(false);
          setLeaderboardLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const finishedSessions = sessions.filter(s => s.status === 'finished');
  const latestSession = finishedSessions[0] ?? null;
  const firstName = user.full_name?.split(' ')[0] || user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CAT CPNS</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700">
              <div className="h-6 w-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                <User className="h-3 w-3 text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-slate-300">{user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Hero Welcome */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/20 p-8 md:p-12">
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-600 rounded-full blur-[120px] opacity-10 pointer-events-none" />
          <div className="relative">
            <p className="text-indigo-400 font-bold text-sm uppercase tracking-[0.2em] mb-2">Dashboard Peserta</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Selamat datang, <span className="text-indigo-400">{firstName}</span> 👋
            </h1>
            <p className="text-slate-400 text-lg mb-8 max-w-xl">
              Pantau perkembanganmu dan mulai simulasi CAT untuk menembus Passing Grade BKN.
            </p>
            <Link href="/catalog">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-indigo-600/30 text-base group">
                <Zap className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" />
                Mulai Simulasi CAT
                <ChevronRight className="w-4 h-4 ml-2 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
          </div>

          {/* Featured Weekly TO Card - Premium Hero Position */}
          {weeklyPackage && (
            <div className="mt-10 relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-500/20 via-yellow-500/30 to-orange-600/20 border-2 border-amber-400/50 p-1 shadow-2xl shadow-amber-500/20 animate-in fade-in zoom-in duration-700">
              {/* Animated background pulse */}
              <div className="absolute inset-0 bg-amber-400/5 animate-pulse pointer-events-none" />

              <div className="absolute top-0 right-0 p-4 z-10">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-500/40">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                  </span>
                  Live Tryout Mingguan
                </div>
              </div>

              <div className="bg-slate-950/60 backdrop-blur-xl rounded-[2.3rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10 relative">
                {/* Decorative element */}
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-amber-500/20 rounded-full blur-[60px] pointer-events-none" />

                <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
                  <div className="space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-500 uppercase">
                      {weeklyPackage.title}
                    </h2>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-amber-500 to-transparent rounded-full mx-auto md:mx-0" />
                  </div>

                  <p className="text-slate-300 text-lg font-medium max-w-lg leading-relaxed">
                    {weeklyPackage.user_status === 'finished'
                      ? "Selamat! Anda telah menyelesaikan tantangan ini. Cek posisi Anda di papan peringkat nasional sekarang."
                      : "Tantangan baru telah tiba! Tryout ini hanya dapat dikerjakan satu kali. Tunjukkan kemampuan terbaikmu!"
                    }
                  </p>

                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="bg-slate-900/90 px-5 py-3 rounded-2xl border border-amber-500/30 flex items-center space-x-3 shadow-inner">
                      <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Batas Waktu</span>
                        <span className="text-sm font-black text-amber-200">
                          {new Date(weeklyPackage.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {weeklyPackage.user_status && (
                      <div className={`px-5 py-3 rounded-2xl border flex items-center space-x-3 shadow-inner ${weeklyPackage.user_status === 'finished' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        }`}>
                        {weeklyPackage.user_status === 'finished' ? <CheckCircle2 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Status Anda</span>
                          <span className="text-sm font-black uppercase tracking-wider">
                            {weeklyPackage.user_status === 'finished' ? 'Selesai' : 'Sedang Dikerjakan'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 w-full md:w-auto relative z-10">
                  {weeklyPackage.user_status === 'finished' ? (
                    <Link href={`/leaderboard?package_id=${weeklyPackage.id}`}>
                      <Button className="w-full md:w-auto bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black py-10 px-12 rounded-3xl shadow-2xl shadow-amber-500/40 text-xl group transition-all hover:scale-105 active:scale-95">
                        <Trophy className="w-8 h-8 mr-4 group-hover:rotate-12 transition-transform" />
                        Lihat Peringkat Nasional
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/catalog/${weeklyPackage.id}`}>
                      <Button className="w-full md:w-auto bg-white hover:bg-slate-100 text-black font-black py-10 px-12 rounded-3xl shadow-2xl shadow-white/10 text-xl group transition-all hover:scale-105 active:scale-95">
                        <Zap className="w-8 h-8 mr-4 text-amber-500 group-hover:scale-125 transition-transform" />
                        Kerjakan Sekarang (Hanya 1x)
                        <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                      </Button>
                    </Link>
                  )}
                  <Link href="/catalog" className="text-center">
                    <span className="text-xs text-slate-500 hover:text-amber-400 transition-colors font-bold uppercase tracking-[0.2em] cursor-pointer">
                      Eksplor Paket Lainnya
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            loading={statsLoading}
            icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
            label="Total Simulasi"
            value={stats.total_sessions.toString()}
            sub="sesi selesai"
            color="indigo"
          />
          <StatCard
            loading={statsLoading}
            icon={<Trophy className="w-5 h-5 text-amber-400" />}
            label="Skor Terbaik"
            value={stats.best_score > 0 ? stats.best_score.toString() : '—'}
            sub={`dari ${MAX_SCORE} poin`}
            color="amber"
          />
          <StatCard
            loading={statsLoading}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            label="Lolos Passing Grade"
            value={stats.total_passed.toString()}
            sub={`dari ${stats.total_sessions} sesi`}
            color="emerald"
          />
          <StatCard
            loading={statsLoading}
            icon={<Target className="w-5 h-5 text-rose-400" />}
            label="Passing Grade"
            value="311"
            sub="ambang batas BKN"
            color="rose"
          />
        </div>

        {/* Latest Result + Leaderboard + Quick Nav */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Latest Session Result */}
          <div className="xl:col-span-2 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-400" /> Skor Terakhir
              </h2>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
                  Lihat Semua <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>

            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-800/60 rounded-xl animate-pulse" />)}
              </div>
            ) : latestSession ? (
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Skor SKD</p>
                    <p className="text-6xl font-black tracking-tighter text-white">{latestSession.total_score}</p>
                  </div>
                  {latestSession.is_passed ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" /> LULUS (P/L)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full text-sm font-bold">
                      <XCircle className="w-4 h-4" /> TIDAK LULUS (TL)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'TWK', score: latestSession.score_twk, min: PASSING_GRADES.TWK, max: 150 },
                    { label: 'TIU', score: latestSession.score_tiu, min: PASSING_GRADES.TIU, max: 175 },
                    { label: 'TKP', score: latestSession.score_tkp, min: PASSING_GRADES.TKP, max: 225 },
                  ].map(({ label, score, min, max }) => (
                    <div key={label} className="bg-slate-800/50 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                      <p className={`text-2xl font-black ${score >= min ? 'text-white' : 'text-rose-400'}`}>{score}</p>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${score >= min ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min((score / max) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">min. {min}</p>
                    </div>
                  ))}
                </div>
                <Link href={`/exam/${latestSession.id}/result`} className="block">
                  <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl">
                    Lihat Detail Hasil
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-400 font-medium mb-2">Belum ada sesi selesai</p>
                <p className="text-slate-600 text-sm">Kerjakan simulasi pertamamu untuk melihat statistik di sini.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Leaderboard Redirection Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-100 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-amber-400" /> Peringkat Tryout
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Lihat peringkat nasional untuk setiap paket Tryout Mingguan yang sedang aktif.
              </p>
              <Link href="/catalog">
                <Button variant="secondary" size="sm" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl">
                  Buka Katalog Tryout
                </Button>
              </Link>
            </div>

            {/* Donation Card */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-pink-500/20 rounded-lg">
                  <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-100 italic">Tip Jar</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Platform ini gratis untuk semua. Dukung sistem kami agar tetap stabil dan up-to-date.
              </p>
              <Button
                onClick={() => setIsDonationOpen(true)}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-lg shadow-pink-500/20 group"
              >
                Kirim Dukungan
                <Heart className="w-3.5 h-3.5 ml-2 group-hover:scale-125 transition-transform fill-white" />
              </Button>
            </div>

            {/* Quick Nav Cards */}
            <div className="grid grid-cols-1 gap-3">
              <QuickNavCard
                href="/catalog"
                icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
                title="Katalog Ujian"
                desc="Pilih paket SKD & SKB"
                accent="indigo"
              />
              <QuickNavCard
                href="/history"
                icon={<History className="w-5 h-5 text-amber-400" />}
                title="Riwayat Nilai"
                desc="Lacak progres skor Anda"
                accent="amber"
              />
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Standar BKN</span>
                </div>
                <div className="space-y-1.5 text-sm text-slate-400">
                  <p>📝 TWK min. <span className="text-white font-bold">65</span> / 150</p>
                  <p>🧠 TIU min. <span className="text-white font-bold">80</span> / 175</p>
                  <p>💡 TKP min. <span className="text-white font-bold">166</span> / 225</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Greeting & Motivation Card */}
        <section className="mt-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-8 md:p-12 group">
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full" />
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
                    👋 Sepatah Kata dari Developer
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white italic leading-tight uppercase tracking-tight">
                    "Platform ini bukan sekadar kode, <br/><span className="text-indigo-500">ini adalah bentuk dukungan saya untuk perjuangan kalian."</span>
                  </h3>
                  <div className="space-y-4 text-slate-400 text-base md:text-lg leading-relaxed font-medium">
                    <p>
                      Platform CAT CPNS ini dirancang, dibangun, dan dikelola secara mandiri oleh satu orang (**solo developer**). 
                      Tujuan utamanya sederhana: mempermudah langkah kalian menuju impian menjadi ASN.
                    </p>
                    <p className="border-l-4 border-indigo-500/50 pl-4 py-2 bg-indigo-500/5 rounded-r-2xl italic text-white font-bold uppercase tracking-tight text-base">
                      "Ingat, tidak ada jalan pintas menuju kesuksesan. NIP hanya bisa diraih dengan keringat, dedikasi, dan doa yang tak putus. Teruslah berjuang dan berikan yang terbaik!"
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-80 shrink-0">
                  <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-indigo-400" />
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">Butuh Bantuan?</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Punya saran fitur, menemukan kendala, atau butuh bantuan? Jangan ragu hubungi saya langsung.
                    </p>
                    <a 
                      href="https://wa.me/6282319401259" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 group"
                    >
                      Hubungi via WA <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Achievement Section (Footer) */}
        <section className="pt-40 border-t border-slate-800/50">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 text-xs font-black uppercase tracking-widest mb-4">
              <Heart className="h-3 w-3 fill-pink-500" /> Komunitas CAT CPNS
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase mb-4">
              Wall of Fame
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
              Setiap dukungan Anda membantu kami menjaga server tetap stabil dan menyediakan konten berkualitas bagi pejuang NIP di seluruh Indonesia.
            </p>
          </div>
          <WallOfFame limit={12} />
        </section>
      </main>

      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, loading }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  loading: boolean;
}) {
  const border = color === 'indigo' ? 'hover:border-indigo-500/40' :
    color === 'amber' ? 'hover:border-amber-500/40' :
      color === 'emerald' ? 'hover:border-emerald-500/40' : 'hover:border-rose-500/40';

  return (
    <div className={`bg-slate-900/50 border border-slate-800 ${border} rounded-2xl p-5 transition-all duration-300`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span></div>
      {loading ? (
        <div className="h-9 bg-slate-800 rounded-xl animate-pulse" />
      ) : (
        <>
          <p className="text-3xl font-black text-white tracking-tight">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </>
      )}
    </div>
  );
}

function QuickNavCard({ href, icon, title, desc, accent }: {
  href: string; icon: React.ReactNode; title: string; desc: string; accent: string;
}) {
  const border = accent === 'indigo' ? 'hover:border-indigo-500/40' :
    accent === 'amber' ? 'hover:border-amber-500/40' : 'hover:border-emerald-500/40';

  return (
    <Link href={href} className={`flex items-center gap-4 bg-slate-900/50 border border-slate-800 ${border} rounded-2xl p-5 group transition-all duration-300 hover:bg-slate-900`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{title}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </Link>
  );
}
