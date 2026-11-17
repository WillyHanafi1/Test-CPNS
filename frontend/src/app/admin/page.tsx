"use client";

import React from "react";
import {
  Users,
  BookOpen,
  CreditCard,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import RevenueChart from "@/components/admin/charts/RevenueChart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function AdminDashboard() {
  const {
    data: overview,
    error: ovError,
    isLoading: ovLoading,
  } = useSWR("/api/v1/admin/analytics/overview", fetcher);
  const {
    data: revenue,
    error: revError,
    isLoading: revLoading,
  } = useSWR("/api/v1/admin/analytics/revenue-trends?days=7", fetcher);

  const loading = ovLoading || revLoading;
  const data = overview
    ? { ...overview, revenueTrends: revenue?.daily_revenue }
    : null;

  const stats = [
    {
      name: "Total Pengguna",
      value: data?.total_users?.toLocaleString() || "0",
      change: "",
      icon: Users,
      color: "text-accent",
      bg: "bg-accent-soft",
    },
    {
      name: "Total Soal",
      value: data?.total_questions?.toLocaleString() || "0",
      change: "",
      icon: BookOpen,
      color: "text-accent",
      bg: "bg-accent-soft",
    },
    {
      name: "Pendapatan",
      value: `Rp ${data?.total_revenue?.toLocaleString() || "0"}`,
      change: "",
      icon: CreditCard,
      color: "text-success",
      bg: "bg-success-soft",
    },
    {
      name: "Sesi Ujian Aktif",
      value: data?.active_exams?.toString() || "0",
      change: "Live",
      icon: Activity,
      color: "text-danger",
      bg: "bg-danger-soft",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">
            Ringkasan platform
          </h1>
          <p className="text-muted font-medium">
            Kelola paket, peserta, dan aktivitas platform.
          </p>
        </div>
        <Button
          asChild
          className="rounded-2xl bg-accent-solid hover:bg-accent-solid font-bold px-6 py-6 shadow-sm "
        >
          <Link href="/admin/analytics">
            Lihat analitik <ArrowUpRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.name}
            className={`bg-surface border-line border rounded-2xl overflow-hidden hover:border-line transition-all group ${loading ? "animate-pulse" : ""}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-muted uppercase tracking-wide">
                  {stat.name}
                </p>
                <h3 className="admin-stat-value text-3xl font-semibold mt-1  transition-transform origin-left text-ink">
                  {stat.value}
                </h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts / Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-surface border-line border rounded-2xl p-8 overflow-hidden">
          <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold">
                Statistik Pendapatan (7 Hari)
              </CardTitle>
              <p className="text-sm text-muted font-medium font-mono uppercase tracking-tighter mt-1">
                Pendapatan yang tercatat
              </p>
            </div>
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div className="w-3 h-3 rounded-full bg-surface-hover" />
            </div>
          </CardHeader>
          <CardContent className="px-0 h-[300px] mt-6 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-line border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueTrends || []}>
                  <defs>
                    <linearGradient
                      id="colorValueMain"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0}
                      />
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
                    tickFormatter={(str) => str.split("-").slice(2).join("/")}
                  />
                  <YAxis
                    stroke="var(--muted)"
                    fontSize={10}
                    fontWeight="bold"
                  />
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
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface border-line border rounded-2xl p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-semibold">
              Akses cepat
            </CardTitle>
            <p className="text-sm text-muted font-medium uppercase tracking-tighter mt-1">
              Halaman pengelolaan
            </p>
          </CardHeader>
          <CardContent className="px-0 space-y-4 mt-6">
            {[
              {
                name: "Urus Paket Soal",
                href: "/admin/packages",
                icon: BookOpen,
                color: "text-accent",
              },
              {
                name: "Kelola Pengguna",
                href: "/admin/users",
                icon: Users,
                color: "text-accent",
              },
              {
                name: "Monitor Transaksi",
                href: "/admin/transactions",
                icon: CreditCard,
                color: "text-success",
              },
              {
                name: "Kelola Saran",
                href: "/admin/feedback",
                icon: MessageSquare,
                color: "text-danger",
              },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                <div className="flex items-center justify-between p-4 bg-surface border border-line rounded-2xl group hover:border-accent-border hover:bg-surface transition-all mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-surface ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-ink group-hover:text-ink transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
            <div className="mt-8 p-6 bg-accent-soft border border-accent-border rounded-2xl">
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                Pro Tip
              </p>
              <p className="text-xs text-muted font-medium leading-relaxed">
                Gunakan fitur Analitik untuk melihat statistik performa peserta
                secara lebih detail dan mendalam.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
