"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Star, CheckCircle2 } from 'lucide-react';

interface PackageProps {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
  is_weekly?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  user_status?: "ongoing" | "finished" | null;
}

export function PackageCard({ id, title, description, price, is_premium, category, is_weekly, start_at, end_at, user_status }: PackageProps) {
  const now = new Date();
  const start = start_at ? new Date(start_at.endsWith('Z') ? start_at : start_at + 'Z') : null;
  const end = end_at ? new Date(end_at.endsWith('Z') ? end_at : end_at + 'Z') : null;
  
  let statusLabel = null;
  let statusColor = "";

  if (user_status === "finished") {
    statusLabel = "Selesai";
    statusColor = "bg-green-500/10 text-green-400 border-green-500/20";
  } else if (user_status === "ongoing") {
    statusLabel = "Sedang Dikerjakan";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  } else if (start && start > now) {
    statusLabel = "Upcoming";
    statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  } else if (end && end < now) {
    statusLabel = "Expired";
    statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
  } else if (is_weekly) {
    statusLabel = "Weekly Tryout";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }

  return (
    <Card className="flex flex-col h-full bg-slate-900/50 border-slate-800 hover:border-indigo-500/50 transition-all duration-300 group overflow-hidden">
      <CardHeader className="relative">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20">
            {category}
          </Badge>
          <div className="flex flex-col gap-1 items-end">
            {is_premium && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                <Star className="w-3 h-3 mr-1 fill-current" /> Premium
              </Badge>
            )}
            {statusLabel && (
              <Badge className={`${statusColor} ${user_status === 'ongoing' ? 'animate-pulse' : ''} px-3`}>
                {statusLabel}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
          {title}
        </CardTitle>
        <div className="mt-4 flex flex-col gap-2.5">
          {description.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
              // Menghilangkan tanda "-" atau "*" di awal kalimat jika data dari db sudah ber-bullet
              const cleanLine = line.replace(/^[-*]\s*/, '');
              return (
                <div key={index} className="flex items-start text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 mr-2.5 text-indigo-400 shrink-0 mt-0.5 opacity-80" />
                  <span className="leading-snug">{cleanLine}</span>
                </div>
              );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow pt-0">
        <div className="flex items-center space-x-4 text-sm text-slate-500">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1.5 text-slate-600" />
            110 Soal
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-slate-600" />
            100 Menit
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-slate-800/50 pt-4 bg-slate-900/30">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Harga</span>
            <span className="text-lg font-bold text-white">
              {is_premium ? (
                <span className="text-amber-400 flex items-center">
                  PREMIUM
                </span>
              ) : (
                price === 0 ? 'Gratis' : `Rp ${price.toLocaleString('id-ID')}`
              )}
            </span>
          </div>
          <Link href={`/catalog/${id}`}>
            <Button size="sm" className={`${user_status === 'finished' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white shadow-lg shadow-indigo-500/20`}>
              {user_status === 'finished' ? 'Lihat Hasil' : (user_status === 'ongoing' ? 'Lanjutkan' : 'Lihat Detail')}
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
