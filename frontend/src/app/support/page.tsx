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

      <main className="max-w-7xl mx-auto px-4 pt-32 space-y-16">
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

        {/* Global Wall of Fame (Podium + Activity) */}
        <WallOfFame />

        {/* Accountability Message at the bottom */}
        <div className="flex flex-col items-center justify-center pt-20 text-center space-y-4 border-t border-slate-900/50">
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
