"use client";

import React from 'react';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const stats = [
    { name: 'Total Pengguna', value: '1,284', change: '+12%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Total Soal', value: '4,520', change: '+5%', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'Transaksi Berhasil', value: ' Rp 42.5M', change: '+18%', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Sesi Aktif', value: '142', change: 'Live', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Dashboard Overview</h1>
        <p className="text-slate-400 font-medium">Selamat datang kembali, Control Center siap digunakan.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="bg-slate-900/50 border-slate-800 border-2 rounded-3xl overflow-hidden hover:border-slate-700 transition-all group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full bg-slate-800 ${stat.change === 'Live' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {stat.change}
                  {stat.change !== 'Live' && <ArrowUpRight className="w-3 h-3 ml-1" />}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.name}</p>
                <h3 className="text-3xl font-black mt-1 group-hover:scale-105 transition-transform origin-left">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts / Detailed Sections Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 border-2 rounded-[2.5rem] p-8">
           <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black">Statistik Pengerjaan Tryout</CardTitle>
                <p className="text-sm text-slate-500 font-medium font-mono uppercase tracking-tighter mt-1">Real-time usage analytics</p>
              </div>
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
              </div>
           </CardHeader>
           <CardContent className="px-0 h-[300px] flex items-center justify-center border-t border-slate-800 mt-6 border-dashed">
              <div className="text-center group">
                 <TrendingUp className="w-16 h-16 text-slate-800 mb-4 mx-auto group-hover:scale-110 group-hover:text-indigo-500/50 transition-all duration-500" />
                 <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Chart data will be rendered here</p>
              </div>
           </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 border-2 rounded-[2.5rem] p-8">
           <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-black">Aktivitas Terbaru</CardTitle>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-tighter mt-1">System logs</p>
           </CardHeader>
           <CardContent className="px-0 space-y-6 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex space-x-4 group cursor-pointer">
                   <div className="w-2 h-10 bg-slate-800 rounded-full group-hover:bg-indigo-500 transition-colors" />
                   <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Admin @willy mereplikasi paket soal SKD #02</p>
                      <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {i * 12} menit yang lalu
                      </div>
                   </div>
                </div>
              ))}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
