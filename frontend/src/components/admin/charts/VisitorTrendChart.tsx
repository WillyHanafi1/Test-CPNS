"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VisitorDailyPoint } from "@/types/admin";

interface VisitorTrendChartProps {
  data: VisitorDailyPoint[];
  height?: number;
  loading?: boolean;
  emptyText?: string;
}

export default function VisitorTrendChart({
  data,
  height = 280,
  loading = false,
  emptyText = "Belum ada data pengunjung pada rentang waktu ini.",
}: VisitorTrendChartProps) {
  if (loading) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl bg-surface-subtle/70 animate-pulse"
      />
    );
  }

  const hasActivity = data?.some((d) => d.visitors > 0 || d.pageviews > 0);
  if (!data || data.length === 0 || !hasActivity) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface-subtle/40 px-6 text-center text-sm text-muted"
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="adminVisitorUvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="adminVisitorPvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--line)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(str: string) =>
              str.includes("-") ? str.split("-").slice(1).join("/") : str
            }
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => [
              Number(value ?? 0).toLocaleString("id-ID"),
              name === "visitors" ? "Pengunjung unik" : "Tayangan halaman",
            ]}
            labelFormatter={(label) => `Tanggal ${label} (WIB)`}
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              borderRadius: "12px",
              fontSize: "13px",
            }}
          />
          <Area
            type="monotone"
            dataKey="pageviews"
            stroke="var(--chart-1)"
            fillOpacity={1}
            fill="url(#adminVisitorPvGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="var(--chart-2)"
            fillOpacity={1}
            fill="url(#adminVisitorUvGrad)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
