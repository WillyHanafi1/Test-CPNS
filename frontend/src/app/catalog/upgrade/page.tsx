"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, Zap, ShieldCheck, Trophy, 
  Crown, ArrowLeft, Loader2, Star
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const BENEFITS = [
  { 
    title: 'Akses Semua Paket', 
    desc: 'Buka semua paket soal SKD & SKB tanpa batas.', 
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" /> 
  },
  { 
    title: 'Pembahasan Super Lengkap', 
    desc: 'Penjelasan detail untuk setiap nomor soal.', 
    icon: <Star className="w-5 h-5 text-amber-400" /> 
  },
  { 
    title: 'Ranking Nasional Live', 
    desc: 'Lihat posisi Anda di antara ribuan peserta lain.', 
    icon: <Trophy className="w-5 h-5 text-indigo-400" /> 
  },
  { 
    title: 'Update Soal Berkala', 
    desc: 'Dapatkan soal-soal terbaru sesuai kisi-kisi BKN.', 
    icon: <RefreshCw className="w-5 h-5 text-sky-400" /> 
  }
];

import { RefreshCw } from 'lucide-react';

export default function UpgradeProPage() {
  const { user, refreshSession } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/transactions/upgrade-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Gagal membuat transaksi');
      const data = await res.json();
      
      if (window.snap) {
        window.snap.pay(data.token, {
          onSuccess: async function(result: any) {
            toast.success('Pembayaran Berhasil! Selamat datang di PRO.');
            await refreshSession();
            router.push('/dashboard');
          },
          onPending: function(result: any) {
            toast.success('Pembayaran Menunggu. Selesaikan proses di aplikasi Anda.');
          },
          onError: function(result: any) {
            toast.error('Pembayaran Gagal. Silakan coba lagi.');
            setLoading(false);
          },
          onClose: function() {
            setLoading(false);
          }
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memulai transaksi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-600/20 to-transparent blur-3xl -z-10" />
      
      <div className="max-w-4xl mx-auto px-4 py-20 relative z-10">
        <Link href="/catalog" className="inline-flex items-center text-slate-400 hover:text-white mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Katalog
        </Link>

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
            <Crown className="w-4 h-4 fill-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Premium Access</span>
          </div>
          <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Upgrade ke Akun PRO
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto">
            Satu kali pembayaran untuk akses tak terbatas ke seluruh fitur dan paket soal simulasi CPNS terbaik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Benefits */}
          <div className="space-y-8">
            {BENEFITS.map((benefit, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl h-fit">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{benefit.title}</h3>
                  <p className="text-slate-500">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Pricing Card */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl" />
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-slate-400 uppercase tracking-widest text-sm font-bold">Lifetime Access</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-6">
               <div className="flex items-center justify-center gap-2 mb-2">
                 <span className="text-slate-600 line-through text-2xl font-medium">Rp 200.000</span>
                 <Badge className="bg-emerald-500 text-white border-0">Hemat 75%</Badge>
               </div>
               <div className="text-6xl font-black text-white mb-2">
                 Rp 50.000
               </div>
               <p className="text-slate-500 text-sm">Hanya sekali bayar, tanpa biaya bulanan.</p>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 h-16 text-xl font-bold rounded-2xl shadow-2xl shadow-indigo-600/30 group"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-6 h-6 mr-2 fill-yellow-300 text-yellow-300 group-hover:scale-125 transition-transform" />
                    Aktifkan PRO Sekarang
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Pembayaran Aman via Midtrans
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-20 pt-12 border-t border-slate-900 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
           {[
             { label: 'Siswa PRO', val: '5.000+' },
             { label: 'Paket Soal', val: '50+' },
             { label: 'Tingkat Kelulusan', val: '92%' },
             { label: 'Uptime Sistem', val: '99.9%' }
           ].map(stat => (
             <div key={stat.label}>
               <div className="text-2xl font-black text-white mb-1">{stat.val}</div>
               <div className="text-xs text-slate-500 uppercase tracking-widest">{stat.label}</div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
