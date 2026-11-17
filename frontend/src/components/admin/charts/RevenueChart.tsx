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

interface RevenueChartProps {
  data: any[];
  height?: number;
  days?: number;
  loading?: boolean;
}

export default function RevenueChart({
  data,
  height = 300,
  loading = false,
}: RevenueChartProps) {
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
    <div style={{ height }} className="w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValueMain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
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
            fontSize={10}
            fontWeight="bold"
            tickFormatter={(str) =>
              str.includes("-") ? str.split("-").slice(1).join("/") : str
            }
          />
          <YAxis stroke="var(--muted)" fontSize={10} fontWeight="bold" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              borderRadius: "16px",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
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
