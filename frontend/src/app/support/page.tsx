"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Heart, Trophy, MessageSquare, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import WallOfFame from '@/components/WallOfFame';
import DonationModal from '@/components/DonationModal';
import Navbar from '@/components/Navbar';

interface TopSupporter {
  full_name: string;
  total_amount: number;
}

export default function SupportHubPage() {
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [topSupporters, setTopSupporters] = useState<TopSupporter[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  useEffect(() => {
    const fetchTop = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      try {
        const res = await fetch(`${API_URL}/api/v1/transactions/donations/top`);
        if (res.ok) {
          const data = await res.json();
          setTopSupporters(data);
        }
      } catch (err) {
        console.error('Failed to fetch top supporters', err);
      } finally {
        setTopLoading(false);
      }
    };
    fetchTop();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-32 space-y-16">
        {/* Intro */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            Dukungan <span className="text-indigo-500">Komunitas</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Platform ini dibangun dengan semangat edukasi gratis. Donasi Anda membantu kami membayar server, 
            memperbarui bank soal, dan terus mengembangkan fitur simulasi CAT yang lebih baik.
          </p>
          <div className="pt-4">
            <Button 
                onClick={() => setIsDonationOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-7 rounded-2xl text-xl font-bold shadow-2xl shadow-indigo-600/20 group transition-all hover:scale-105"
            >
              <Heart className="w-6 h-6 mr-3 group-hover:scale-125 transition-transform fill-white" />
              Kirim Dukungan Sekarang
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wall of Fame - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800">
               <WallOfFame />
            </div>
          </div>

          {/* Top Donors - 1/3 width */}
          <div className="space-y-6">
            <Card className="bg-slate-900/60 border-indigo-500/20 shadow-xl overflow-hidden h-full">
                <CardHeader className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        <CardTitle className="text-lg text-white">Top Supporters</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {topLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />)}
                        </div>
                    ) : topSupporters.length > 0 ? (
                        <div className="space-y-2">
                            {topSupporters.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                                            idx === 0 ? 'bg-amber-500 text-white' : 
                                            idx === 1 ? 'bg-slate-300 text-slate-800' : 
                                            idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-200">{s.full_name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-400">
                                        Rp {s.total_amount.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-40">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2" />
                            <p className="text-xs">Jadilah donatur pertama kami!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Accountability Message at the bottom */}
        <div className="flex flex-col items-center justify-center pt-10 text-center space-y-4 border-t border-slate-900/50">
            <div className="flex items-center gap-3 bg-slate-900/50 px-6 py-3 rounded-2xl border border-slate-800">
                <Zap className="h-5 w-5 text-indigo-400" />
                <span className="font-bold text-white italic">Transparan & Aman</span>
            </div>
            <p className="text-sm text-slate-500 italic max-w-md">
                "Semua dukungan langsung digunakan untuk pengembangan platform."
            </p>
        </div>
      </main>

      <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
    </div>
  );
}
