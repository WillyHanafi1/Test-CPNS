"use client";

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ScoreDistributionChartProps {
  data: any[];
  height?: number;
  loading?: boolean;
}

export default function ScoreDistributionChart({ data, height = 350, loading = false }: ScoreDistributionChartProps) {
  if (loading) {
    return (
      <div style={{ height }} className="w-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} fontWeight="bold" />
          <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
