"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, BookOpen, Target, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface Package {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
}

export default function PackageDetailPage() {
  const { id } = useParams();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
        const response = await fetch(`${baseUrl}/api/v1/packages/${id}`);
        if (response.ok) {
          const data = await response.json();
          setPkg(data);
        }
      } catch (error) {
        console.error("Failed to fetch package", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  if (!pkg) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Package not found</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/catalog" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Katalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <header>
              <div className="flex items-center space-x-3 mb-4">
                <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3">
                  {pkg.category}
                </Badge>
                {pkg.is_premium && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3">
                    Premium
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4">{pkg.title}</h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                {pkg.description}
              </p>
            </header>

            <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-400" /> Apa yang kamu dapatkan?
              </h2>
              <ul className="space-y-4">
                {[
                  '110 Soal standar BKN terbaru',
                  'Simulasi waktu real-time 100 menit',
                  'Pembahasan soal mendalam setelah ujian',
                  'Statistik performa per kategori',
                  'Peringkat nasional (Live Leaderboard)'
                ].map((text, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 sticky top-24">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Detail Ujian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-2" /> Jumlah Soal
                    </div>
                    <span className="text-white font-medium">110 Soal</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" /> Durasi
                    </div>
                    <span className="text-white font-medium">100 Menit</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center">
                      <Target className="w-4 h-4 mr-2" /> Passing Grade
                    </div>
                    <span className="text-white font-medium">Tersedia</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <div className="flex items-baseline justify-between mb-6">
                    <span className="text-slate-400">Harga</span>
                    <span className="text-3xl font-bold text-white">
                      {pkg.price === 0 ? 'GRATIS' : `Rp ${pkg.price.toLocaleString('id-ID')}`}
                    </span>
                  </div>
                  <Link href={`/exam/${pkg.id}`} className="w-full block">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg font-bold">
                      {pkg.price === 0 ? 'Mulai Ujian Sekarang' : 'Beli Paket Sekarang'}
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-slate-500 mt-4">
                    Akses selamanya dengan sekali pembayaran
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
