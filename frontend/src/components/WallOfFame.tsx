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

export default function WallOfFame() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSupporters = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      try {
        const res = await fetch(`${API_URL}/api/v1/transactions/donations/wall-of-fame`);
        if (res.ok) {
          const data = await res.json();
          setSupporters(data);
        }
      } catch (err) {
        console.error('Failed to fetch wall of fame', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupporters();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-800 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-800 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-800 rounded col-span-2"></div>
                <div className="h-2 bg-slate-800 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (supporters.length === 0) return null;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
          <h3 className="text-xl font-bold text-white">Wall of Fame</h3>
        </div>
        <span className="text-xs text-slate-500">Apresiasi untuk pendukung kami</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supporters.map((item, idx) => (
          <Card key={idx} className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/30 transition-all duration-300">
            <CardContent className="p-4 flex gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-200 truncate">
                    {item.full_name}
                  </h4>
                  <span className="text-xs font-bold text-indigo-400 shrink-0">
                    Rp {item.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                {item.message && (
                  <p className="text-sm text-slate-400 mt-1 italic line-clamp-2">
                    "{item.message}"
                  </p>
                )}
                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
