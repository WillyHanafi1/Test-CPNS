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
import type { ChartDataPoint } from "@/types/admin";
import { formatCompactRupiah, formatRupiah } from "@/lib/admin-format";

interface RevenueChartProps {
  data: ChartDataPoint[];
  height?: number;
  loading?: boolean;
  emptyText?: string;
}

export default function RevenueChart({
  data,
  height = 280,
  loading = false,
  emptyText = "Belum ada pendapatan tercatat pada rentang waktu ini.",
}: RevenueChartProps) {
  if (loading) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl bg-surface-subtle/70 animate-pulse"
      />
    );
  }

  if (!data || data.length === 0) {
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
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--line)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
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
            width={68}
            tickFormatter={(value: number) => formatCompactRupiah(value)}
          />
          <Tooltip
            formatter={(value) => [
              formatRupiah(Number(value ?? 0)),
              "Pendapatan",
            ]}
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
            dataKey="value"
            stroke="var(--chart-1)"
            fillOpacity={1}
            fill="url(#adminRevenueGrad)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
