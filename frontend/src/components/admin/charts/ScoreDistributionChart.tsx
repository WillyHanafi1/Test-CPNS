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

interface ScoreDistributionChartProps {
  data: any[];
  height?: number;
  loading?: boolean;
}

export default function ScoreDistributionChart({
  data,
  height = 350,
  loading = false,
}: ScoreDistributionChartProps) {
  if (loading) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center"
      >
        <div className="w-10 h-10 border-4 border-line border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--line)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="var(--muted)"
            fontSize={10}
            fontWeight="bold"
          />
          <YAxis stroke="var(--muted)" fontSize={10} fontWeight="bold" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              borderRadius: "16px",
            }}
            cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
          />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={[8, 8, 0, 0]}
            barSize={40}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
