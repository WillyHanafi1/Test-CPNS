"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, User, Clock } from 'lucide-react';

interface Supporter {
  full_name: string;
  amount: number;
  message: string | null;
  created_at: string;
  is_anonymous: boolean;
}

interface WallOfFameProps {
  limit?: number;
  compact?: boolean;
}

export default function WallOfFame({ limit, compact }: WallOfFameProps) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSupporters = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      try {
        const res = await fetch(`${API_URL}/api/v1/transactions/donations/wall-of-fame`);
        if (res.ok) {
          const data = await res.json();
          setSupporters(limit ? data.slice(0, limit) : data);
        }
      } catch (err) {
        console.error('Failed to fetch wall of fame', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupporters();
  }, [limit]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="rounded-full bg-slate-800 h-8 w-8"></div>
          <div className="h-2 w-24 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (supporters.length === 0) {
    if (compact) {
      return (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Wall of Fame</h3>
          </div>
          <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-500 font-medium italic">Belum ada donasi. Jadilah pendukung pertama kami!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-bold text-slate-400 uppercase italic tracking-tight">Wall of Fame</h3>
        </div>
        <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="p-4 bg-slate-800/40 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Heart className="h-8 w-8 text-slate-600" />
          </div>
          <h4 className="text-lg font-bold text-slate-300 mb-2">Belum ada pendukung di sini</h4>
          <p className="text-sm text-slate-500 max-w-sm">
            Dukung pengembangan platform CAT CPNS ini agar tetap bisa diakses gratis oleh pejuang NIP di seluruh Indonesia.
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Wall of Fame</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {supporters.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/50 px-3 py-1.5 rounded-xl hover:border-indigo-500/30 transition-all cursor-default group">
              <div className="h-6 w-6 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <User className="h-3 w-3 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors leading-tight">{item.full_name}</span>
                <span className="text-[8px] font-black text-indigo-500">Donatur</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
          <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Wall of Fame</h3>
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Apresiasi Pendukung Platform</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supporters.map((item, idx) => (
          <Card key={idx} className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/30 transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-200 truncate uppercase tracking-tight text-sm">
                    {item.full_name}
                  </h4>
                  <span className="text-[10px] font-black text-indigo-400 shrink-0">
                    Rp {item.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                {item.message && (
                  <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2">
                    "{item.message}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
