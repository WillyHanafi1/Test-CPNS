"use client";

import React from 'react';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import RevenueChart from '@/components/admin/charts/RevenueChart';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function AdminDashboard() {
  const { data: overview, error: ovError, isLoading: ovLoading } = useSWR('/api/v1/admin/analytics/overview', fetcher);
  const { data: revenue, error: revError, isLoading: revLoading } = useSWR('/api/v1/admin/analytics/revenue-trends?days=7', fetcher);

  const loading = ovLoading || revLoading;
  const data = overview ? { ...overview, revenueTrends: revenue?.daily_revenue } : null;

  const stats = [
    { name: 'Total Pengguna', value: data?.total_users?.toLocaleString() || '0', change: '+5%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Total Soal', value: data?.total_questions?.toLocaleString() || '0', change: '+2%', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'Total Revenue', value: `Rp ${data?.total_revenue?.toLocaleString() || '0'}`, change: '+12%', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Sesi Ujian Aktif', value: data?.active_exams?.toString() || '0', change: 'Live', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Dashboard Overview</h1>
          <p className="text-slate-400 font-medium">Selamat datang kembali, Control Center siap digunakan.</p>
        </div>
        <Link href="/admin/analytics">
           <Button className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-6 shadow-xl shadow-indigo-600/20">
              VIEW DETAILED ANALYTICS <ArrowUpRight className="w-4 h-4 ml-2" />
           </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className={`bg-slate-900/50 border-slate-800 border-2 rounded-3xl overflow-hidden hover:border-slate-700 transition-all group ${loading ? 'animate-pulse' : ''}`}>
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
                <h3 className="text-3xl font-black mt-1 group-hover:scale-105 transition-transform origin-left text-slate-100">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts / Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 border-2 rounded-[2.5rem] p-8 overflow-hidden">
           <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black">Statistik Pendapatan (7 Hari)</CardTitle>
                <p className="text-sm text-slate-500 font-medium font-mono uppercase tracking-tighter mt-1">Weekly financial performance</p>
              </div>
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
              </div>
           </CardHeader>
           <CardContent className="px-0 h-[300px] mt-6 relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.revenueTrends || []}>
                    <defs>
                      <linearGradient id="colorValueMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                       dataKey="label" 
                       stroke="#475569" 
                       fontSize={10} 
                       fontWeight="bold" 
                       tickFormatter={(str) => str.split('-').slice(2).join('/')}
                    />
                    <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#818cf8" fillOpacity={1} fill="url(#colorValueMain)" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
           </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 border-2 rounded-[2.5rem] p-8">
           <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-black">Quick Access</CardTitle>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-tighter mt-1">Management Shortcuts</p>
           </CardHeader>
           <CardContent className="px-0 space-y-4 mt-6">
              {[
                { name: 'Urus Paket Soal', href: '/admin/packages', icon: BookOpen, color: 'text-indigo-400' },
                { name: 'Kelola Pengguna', href: '/admin/users', icon: Users, color: 'text-blue-400' },
                { name: 'Monitor Transaksi', href: '/admin/transactions', icon: CreditCard, color: 'text-emerald-400' },
              ].map((item) => (
                <Link key={item.name} href={item.href}>
                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 rounded-2xl group hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all mb-3">
                     <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-slate-900 ${item.color}`}>
                           <item.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-300 group-hover:text-white transition-colors">{item.name}</span>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
              <div className="mt-8 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Pro Tip</p>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Gunakan fitur **Analytics** untuk melihat statistik performa peserta secara lebih detail dan mendalam.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
