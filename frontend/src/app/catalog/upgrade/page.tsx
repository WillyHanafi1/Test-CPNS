"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Zap, ShieldCheck, Trophy, 
  Crown, ArrowLeft, Loader2, Star, RefreshCw
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

export default function UpgradeProPage() {
  const { user, refreshSession } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
      
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(data.token, {
          onSuccess: function(result: any) {
            toast.success('Pembayaran Berhasil! Sedang memverifikasi akun Anda...');
            setIsVerifying(true);
          },
          onPending: function(result: any) {
            toast.success('Pembayaran Menunggu. Selesaikan proses di aplikasi Anda.');
            setLoading(false);
          },
          onError: function(result: any) {
            toast.error('Pembayaran Gagal. Silakan coba lagi.');
            setLoading(false);
          },
          onClose: function() {
            setLoading(false);
          }
        });
      } else {
        toast.error('Layanan pembayaran belum siap. Mohon tunggu sebentar atau refresh halaman.');
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memulai transaksi.');
      setLoading(false);
    }
  };

  // Polling logic when isVerifying is true
  React.useEffect(() => {
    if (!isVerifying) return;

    let attempts = 0;
    const maxAttempts = 20; // ~60 seconds total

    const poll = setInterval(async () => {
      attempts++;
      await refreshSession();
      
      // AuthContext.user will be updated by refreshSession()
      // We check the 'is_pro' property on the user object (need to check if it updates in the closure)
      // Since 'user' is a dependency of the component, it might be better to check it in another effect
      // but interval closure will see the 'user' from the render when it was created unless we use a ref.
    }, 3000);

    return () => clearInterval(poll);
  }, [isVerifying, refreshSession]);

  // Effect to watch user.is_pro change during verification
  React.useEffect(() => {
    if (isVerifying && user?.is_pro) {
      toast.success('Akun PRO sudah aktif! Selamat belajar.');
      setIsVerifying(false);
      router.push('/dashboard');
    }
  }, [isVerifying, user?.is_pro, router]);

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
            Satu kali pembayaran untuk akses tak terbatas ke seluruh fitur dan paket soal tryout CPNS terbaik.
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
              {isVerifying ? (
                <div className="py-8 flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                  <p className="text-indigo-400 font-bold animate-pulse text-lg">Memverifikasi Pembayaran...</p>
                  <p className="text-slate-500 text-sm max-w-[200px] mx-auto">Tunggu sebentar, kami sedang mengaktifkan fitur PRO Anda.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-slate-600 line-through text-2xl font-medium">Rp 200.000</span>
                    <Badge className="bg-emerald-500 text-white border-0">Hemat 75%</Badge>
                  </div>
                  <div className="text-6xl font-black text-white mb-2">
                    Rp 50.000
                  </div>
                  <p className="text-slate-500 text-sm">Hanya sekali bayar, tanpa biaya bulanan.</p>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {!isVerifying && (
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
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {isVerifying ? 'Jangan tutup halaman ini' : 'Pembayaran Aman via Midtrans'}
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
