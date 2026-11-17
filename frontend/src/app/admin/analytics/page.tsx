"use client";

import React, { useState, useEffect } from "react";
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
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/api";
import RevenueChart from "@/components/admin/charts/RevenueChart";
import ScoreDistributionChart from "@/components/admin/charts/ScoreDistributionChart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function AnalyticsAdmin() {
  const [days, setDays] = useState(7);

  const {
    data: overview,
    error: ovError,
    isLoading: ovLoading,
  } = useSWR("/api/v1/admin/analytics/overview", fetcher);
  const {
    data: exams,
    error: exError,
    isLoading: exLoading,
  } = useSWR("/api/v1/admin/analytics/exam-performance", fetcher);
  const {
    data: revenue,
    error: revError,
    isLoading: revLoading,
  } = useSWR(`/api/v1/admin/analytics/revenue-trends?days=${days}`, fetcher);

  const loading = ovLoading || exLoading || revLoading;

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <Card className="bg-surface border-line rounded-2xl overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500  ${color}`}
          >
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className="flex items-center space-x-1 text-success font-bold text-xs bg-success-soft px-2 py-1 rounded-lg">
              <ArrowUpRight className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <p className="text-xs font-semibold text-muted uppercase tracking-[0.2em] mb-1">
          {title}
        </p>
        <h3 className="admin-stat-value text-3xl font-semibold text-ink tracking-tight">
          {value}
        </h3>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <AdminPageHeader
          title="Analitik platform"
          subtitle="Pantau performa platform secara menyeluruh"
        />
        <div className="flex items-center space-x-2 bg-surface border border-line p-1.5 rounded-2xl">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                days === d
                  ? "bg-accent-solid text-white shadow-lg "
                  : "text-muted hover:text-ink"
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
          value={`Rp ${overview?.total_revenue?.toLocaleString() || "0"}`}
          icon={CreditCard}
          color="bg-success-soft border-line text-success"
        />
        <StatCard
          title="Total Pengguna"
          value={overview?.total_users || "0"}
          icon={Users}
          color="bg-accent-soft border-accent-border text-accent"
        />
        <StatCard
          title="Sesi Ujian"
          value={overview?.active_exams || "0"}
          icon={Activity}
          color="bg-danger-soft border-line text-danger"
          trend="Live"
        />
        <StatCard
          title="Memenuhi ambang latihan"
          value={`${exams?.pass_rate || "0"}%`}
          icon={Award}
          color="bg-warning-soft border-line text-warning"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart */}
        <Card className="bg-surface border-line rounded-2xl overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-success-soft rounded-xl flex items-center justify-center border border-line">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                Tren Pendapatan Harian
              </CardTitle>
            </div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide">
              Revenue Growth over {days} days
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-4 h-[350px]">
            <RevenueChart
              data={revenue?.daily_revenue || []}
              height={350}
              days={days}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Score Distribution Bar Chart */}
        <Card className="bg-surface border-line rounded-2xl overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-accent-soft rounded-xl flex items-center justify-center border border-accent-border">
                <Target className="w-4 h-4 text-accent" />
              </div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                Distribusi Skor Peserta
              </CardTitle>
            </div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide">
              Distribusi nilai latihan
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-4 h-[350px]">
            <ScoreDistributionChart
              data={exams?.score_distribution || []}
              height={350}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Packages Table */}
        <Card className="lg:col-span-2 bg-surface border-line rounded-2xl overflow-hidden">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight mb-1">
                  Paket Terlaris
                </CardTitle>
                <p className="text-xs font-bold text-muted uppercase tracking-wide">
                  Transaksi paket tercatat
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                className="text-accent font-bold text-xs"
              >
                <Link href="/admin/packages">
                  Lihat paket <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-4">
              {revenue?.top_packages.map((pkg: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-surface border border-line rounded-2xl group hover:border-accent-border transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center font-semibold text-muted group-hover:text-accent">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-ink">{pkg.title}</p>
                      <p className="text-xs text-muted font-bold">
                        {pkg.sales} TRANSAKSI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 h-2 bg-surface rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-accent-solid rounded-full"
                        style={{
                          width: `${(pkg.sales / (revenue.top_packages[0].sales || 1)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Categories Share (Mock Pie Chart for visuals) */}
        <Card className="bg-surface border-line rounded-2xl overflow-hidden">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-semibold tracking-tight mb-1">
              Distribusi Paket
            </CardTitle>
            <p className="text-xs font-bold text-muted uppercase tracking-wide">
              Category Market Share
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    revenue?.category_share?.map((c: any) => ({
                      name: c.label,
                      value: c.value,
                    })) || []
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {(revenue?.category_share || []).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ),
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    borderRadius: "16px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {(revenue?.category_share || []).map((cat: any, idx: number) => (
                <div key={cat.label} className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></div>
                  <span className="text-xs font-bold text-muted">
                    {cat.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
