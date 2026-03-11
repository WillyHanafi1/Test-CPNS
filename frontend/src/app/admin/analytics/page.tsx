"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  CreditCard, 
  Award,
  Calendar,
  Filter,
  ArrowUpRight,
  Target,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AdminPageHeader } from '@/components/admin';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function AnalyticsAdmin() {
  const [overview, setOverview] = useState<any>(null);
  const [exams, setExams] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ovRes, exRes, revRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/admin/analytics/overview`, { credentials: 'include' }),
        fetch(`${API_URL}/api/v1/admin/analytics/exam-performance`, { credentials: 'include' }),
        fetch(`${API_URL}/api/v1/admin/analytics/revenue-trends?days=${days}`, { credentials: 'include' })
      ]);

      const [ovData, exData, revData] = await Promise.all([
        ovRes.json(),
        exRes.json(),
        revRes.json()
      ]);

      setOverview(ovData);
      setExams(exData);
      setRevenue(revData);
    } catch (error) {
      console.error("Fetch analytics error:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <Card className="bg-slate-900/40 border-slate-800/60 rounded-3xl overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className="flex items-center space-x-1 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded-lg">
              <ArrowUpRight className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-100 tracking-tight">{value}</h3>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <AdminPageHeader 
          title="Analytics & Insight" 
          subtitle="Pantau performa platform secara menyeluruh"
        />
        <div className="flex items-center space-x-2 bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl">
           {[7, 30, 90].map(d => (
             <button
               key={d}
               onClick={() => setDays(d)}
               className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                 days === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               {d} HARI
             </button>
           ))}
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Pendapatan" 
          value={`Rp ${overview?.total_revenue?.toLocaleString() || '0'}`} 
          icon={CreditCard} 
          color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
          trend="+12.5%"
        />
        <StatCard 
          title="Total Pengguna" 
          value={overview?.total_users || '0'} 
          icon={Users} 
          color="bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
          trend="+5.2%"
        />
        <StatCard 
          title="Sesi Ujian" 
          value={overview?.active_exams || '0'} 
          icon={Activity} 
          color="bg-rose-500/10 border-rose-500/20 text-rose-500"
          trend="Live"
        />
        <StatCard 
          title="Lulus SCM" 
          value={`${exams?.pass_rate || '0'}%`} 
          icon={Award} 
          color="bg-amber-500/10 border-amber-500/20 text-amber-500"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart */}
        <Card className="bg-slate-900/40 border-slate-800/60 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
               </div>
               <CardTitle className="text-xl font-black tracking-tight">Tren Pendapatan Harian</CardTitle>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenue Growth over {days} days</p>
          </CardHeader>
          <CardContent className="p-8 pt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue?.daily_revenue || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                   dataKey="label" 
                   stroke="#64748b" 
                   fontSize={10} 
                   fontWeight="bold" 
                   tickFormatter={(str) => str.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontWeight: 'bold' }}
                   itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution Bar Chart */}
        <Card className="bg-slate-900/40 border-slate-800/60 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <Target className="w-4 h-4 text-indigo-500" />
               </div>
               <CardTitle className="text-xl font-black tracking-tight">Distribusi Skor Peserta</CardTitle>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performance histogram of all time</p>
          </CardHeader>
          <CardContent className="p-8 pt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exams?.score_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} fontWeight="bold" />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                   cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Packages Table */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/60 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle className="text-xl font-black tracking-tight mb-1">Paket Terlaris</CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Top Selling Exam Packages</p>
               </div>
               <Button variant="ghost" className="text-indigo-400 font-bold text-xs">VIEW PACKAGES <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-4">
               {revenue?.top_packages.map((pkg: any, idx: number) => (
                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl group hover:border-indigo-500/50 transition-all">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-slate-500 group-hover:text-indigo-400">
                          {idx + 1}
                       </div>
                       <div>
                          <p className="font-bold text-slate-200">{pkg.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{pkg.sales} TRANSAKSI</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <div className="w-32 h-2 bg-slate-900 rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(pkg.sales / (revenue.top_packages[0].sales || 1)) * 100}%` }}></div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-700" />
                    </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {/* Categories Share (Mock Pie Chart for visuals) */}
        <Card className="bg-slate-900/40 border-slate-800/60 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8">
             <CardTitle className="text-xl font-black tracking-tight mb-1">Distribusi Paket</CardTitle>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category Market Share</p>
          </CardHeader>
           <CardContent className="p-8 pt-0 h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={revenue?.category_share?.map((c: any) => ({ name: c.label, value: c.value })) || []}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={100}
                   paddingAngle={8}
                   dataKey="value"
                 >
                   {(revenue?.category_share || []).map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
               </PieChart>
             </ResponsiveContainer>
             <div className="flex flex-wrap justify-center gap-4 mt-2">
                {(revenue?.category_share || []).map((cat: any, idx: number) => (
                  <div key={cat.label} className="flex items-center space-x-2">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                     <span className="text-[10px] font-bold text-slate-500">{cat.label}</span>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
