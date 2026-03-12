"use client";

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface RevenueChartProps {
  data: any[];
  height?: number;
  days?: number;
  loading?: boolean;
}

export default function RevenueChart({ data, height = 300, loading = false }: RevenueChartProps) {
  if (loading) {
    return (
      <div style={{ height }} className="w-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
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
            tickFormatter={(str) => str.includes('-') ? str.split('-').slice(1).join('/') : str}
          />
          <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#818cf8" 
            fillOpacity={1} 
            fill="url(#colorValueMain)" 
            strokeWidth={4} 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
