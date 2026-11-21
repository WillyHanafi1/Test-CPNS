"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint } from "@/types/admin";

interface ScoreDistributionChartProps {
  data: ChartDataPoint[];
  height?: number;
  loading?: boolean;
  emptyText?: string;
}

export default function ScoreDistributionChart({
  data,
  height = 280,
  loading = false,
  emptyText = "Belum ada sesi ujian selesai untuk menampilkan distribusi skor.",
}: ScoreDistributionChartProps) {
  if (loading) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl bg-surface-subtle/70 animate-pulse"
      />
    );
  }

  const hasValues = data && data.some((d) => d.value > 0);
  if (!hasValues) {
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
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            formatter={(value) => [`${Number(value ?? 0)} sesi`, "Jumlah"]}
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              borderRadius: "12px",
              fontSize: "13px",
            }}
            cursor={{ fill: "var(--surface-hover)" }}
          />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
