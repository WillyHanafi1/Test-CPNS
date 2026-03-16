"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Clock, BookOpen, Target, CheckCircle2,
  ShieldCheck, Lock, CreditCard, Loader2, AlertTriangle, Zap
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Package {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const FEATURES = [
  '110 Soal standar BKN terbaru',
  'Simulasi waktu real-time 100 menit',
  'Pembahasan soal mendalam setelah ujian',
  'Statistik performa per kategori (TWK/TIU/TKP)',
  'Peringkat nasional Live Leaderboard',
  'Bisa diulang tanpa batas',
];

type AccessState = 'idle' | 'loading' | 'granted' | 'denied';

export default function PackageDetailPage() {
  const params = useParams();
  // Safe extraction: useParams can return string | string[] in Next.js
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, refreshSession } = useAuth();
  const router = useRouter();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [accessState, setAccessState] = useState<AccessState>('idle');

  // Fetch package info
  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/packages/${id}`);
        if (response.ok) {
          const data = await response.json();
          setPkg(data);
        }
      } catch (error) {
        console.error('Failed to fetch package', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [id]);

  // Check access (RBAC) once package + user are loaded
  useEffect(() => {
    if (!pkg || !user) return;

    // Free packages: always accessible
    if (!pkg.is_premium || pkg.price === 0) {
      setAccessState('granted');
      return;
    }

    // Premium package: check transaction
    const checkAccess = async () => {
      setAccessState('loading');
      try {
        const res = await fetch(`${API_URL}/api/v1/packages/${id}/access`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAccessState(data.has_access ? 'granted' : 'denied');
        } else {
          // Endpoint might not exist yet or unauthorized 
          setAccessState('denied');
        }
      } catch {
        setAccessState('denied');
      }
    };

    checkAccess();
  }, [pkg, user, id]);

  const handleUpgradePro = () => {
    router.push('/catalog/upgrade');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <AlertTriangle className="w-16 h-16 text-rose-500" />
        <h1 className="text-2xl font-bold">Paket tidak ditemukan</h1>
        <Link href="/catalog"><Button variant="outline" className="border-slate-700">Kembali ke Katalog</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/catalog" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="font-bold">Katalog</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Package Info */}
          <div className="lg:col-span-2 space-y-8">
            <header>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3">
                  {pkg.category}
                </Badge>
                {pkg.is_premium ? (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3">
                    <Lock className="w-3 h-3 mr-1" /> Premium
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3">
                    Gratis
                  </Badge>
                )}
                {user?.is_pro && (
                  <Badge className="bg-amber-500 text-slate-950 border-0 px-3 font-bold">
                    <Zap className="w-3 h-3 mr-1 fill-slate-950" /> PRO MEMBER
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4 leading-tight">{pkg.title}</h1>
              <p className="text-slate-400 text-lg leading-relaxed">{pkg.description}</p>
            </header>

            <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-400" /> Apa yang kamu dapatkan?
              </h2>
              <ul className="space-y-3">
                {FEATURES.map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{text}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Passing Grade Info */}
            <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" /> Ambang Batas Kelulusan BKN
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[['TWK', 65, 175], ['TIU', 80, 175], ['TKP', 166, 225]].map(([seg, min, max]) => (
                  <div key={seg} className="bg-slate-900/60 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{seg}</p>
                    <p className="text-xl font-black text-white">{min}</p>
                    <p className="text-xs text-slate-600">dari {max}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: CTA Card */}
          <div>
            <Card className="bg-slate-900/60 border-slate-800 sticky top-24 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Detail Ujian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Exam specs */}
                <div className="space-y-3">
                  {[
                    { icon: <BookOpen className="w-4 h-4" />, label: 'Jumlah Soal', val: '110 Soal' },
                    { icon: <Clock className="w-4 h-4" />, label: 'Durasi', val: '100 Menit' },
                    { icon: <Target className="w-4 h-4" />, label: 'Passing Grade', val: 'TWK 65 / TIU 80 / TKP 166' },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 text-slate-400">{icon}{label}</div>
                      <span className="text-white font-medium text-right max-w-[120px]">{val}</span>
                    </div>
                  ))}
                </div>

                  {/* Access Status + CTA */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-400 text-sm">Status Akses</span>
                      <span className="text-xl font-bold text-white">
                        {pkg.price === 0 ? (
                          <span className="text-emerald-400">GRATIS</span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <Badge className="bg-amber-500 text-slate-950 border-0 mb-1">PREMIUM</Badge>
                            <span className="text-[10px] text-slate-500 font-normal">Termasuk Paket PRO</span>
                          </div>
                        )}
                      </span>
                    </div>

                    {!user ? (
                      // Not logged in
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>Login untuk mengakses paket ini.</span>
                        </div>
                        <Button onClick={() => router.push('/login')} className="w-full bg-indigo-600 hover:bg-indigo-500 h-12 font-bold rounded-xl">
                          Login Sekarang
                        </Button>
                      </div>
                    ) : accessState === 'idle' || accessState === 'loading' ? (
                      // Checking access
                      <Button disabled className="w-full h-12 rounded-xl">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memeriksa akses...
                      </Button>
                    ) : accessState === 'granted' ? (
                      // HAS ACCESS — show start button
                      <Link href={`/exam/${pkg.id}`} className="block">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 text-base font-bold rounded-xl shadow-lg shadow-indigo-600/20 group">
                          <Zap className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" />
                          Mulai Ujian Sekarang
                        </Button>
                      </Link>
                    ) : (
                      // NO ACCESS — show upgrade button
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 text-sm bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                          <Lock className="w-4 h-4 flex-shrink-0" />
                          <span>Akses eksklusif untuk Member PRO.</span>
                        </div>
                        <Button
                          onClick={handleUpgradePro}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 text-base font-bold rounded-xl shadow-lg shadow-indigo-600/20 group"
                        >
                          <Zap className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                          Upgrade PRO (Buka Semua)
                        </Button>
                      </div>
                    )}

                    <p className="text-center text-[10px] text-slate-600 italic leading-relaxed">
                      {pkg.price === 0 ? 'Tersedia untuk semua pengguna' : 'Aktifkan PRO untuk akses tak terbatas seluruh paket soal'}
                    </p>
                  </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
