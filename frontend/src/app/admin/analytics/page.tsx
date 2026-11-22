"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  BarChart3,
  ChevronRight,
  CreditCard,
  Eye,
  Globe,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useResource } from "@/lib/useResource";
import { ErrorPanel } from "@/components/AppShell";
import {
  AdminBadge,
  AdminPageHeader,
  AdminStatCard,
} from "@/components/admin";
import RevenueChart from "@/components/admin/charts/RevenueChart";
import ScoreDistributionChart from "@/components/admin/charts/ScoreDistributionChart";
import VisitorTrendChart from "@/components/admin/charts/VisitorTrendChart";
import { formatRupiah } from "@/lib/admin-format";
import type {
  AdminExamAnalytics,
  AdminOverviewStats,
  AdminRevenueAnalytics,
  AdminVisitorAnalytics,
} from "@/types/admin";

const PAGE_LABELS: Record<string, string> = {
  "/": "Beranda",
  "/catalog": "Katalog paket soal",
  "/catalog/[id]": "Detail & persiapan paket",
  "/catalog/upgrade": "Halaman TOCPNS Pro",
  "/dashboard": "Beranda peserta",
  "/donasi": "Halaman donasi",
  "/faq": "Bantuan & FAQ",
  "/history": "Riwayat ujian",
  "/leaderboard": "Peringkat nasional",
  "/login": "Masuk akun",
  "/register": "Daftar akun",
  "/session/[id]": "Ruang ujian CAT",
  "/session/[id]/result": "Hasil ujian",
  "/session/[id]/review": "Pembahasan ujian",
  "/support": "Kontak & bantuan",
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const SUBTEST_BENCHMARKS = [
  { key: "avg_twk" as const, label: "TWK", pg: 65, max: 150 },
  { key: "avg_tiu" as const, label: "TIU", pg: 80, max: 175 },
  { key: "avg_tkp" as const, label: "TKP", pg: 166, max: 225 },
];

export default function AnalyticsAdmin() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const overview = useResource<AdminOverviewStats>("/admin/analytics/overview");
  const exams = useResource<AdminExamAnalytics>(
    "/admin/analytics/exam-performance",
  );
  const revenue = useResource<AdminRevenueAnalytics>(
    `/admin/analytics/revenue-trends?days=${days}`,
  );
  const visitors = useResource<AdminVisitorAnalytics>(
    `/admin/analytics/visitors?days=${days}`,
  );

  const ov = overview.data;
  const ex = exams.data;
  const rev = revenue.data;
  const vis = visitors.data;

  const revenueMix = rev?.revenue_by_type ?? [];
  const topAttempted = rev?.top_attempted_packages ?? [];
  const maxAttempts = topAttempted[0]?.attempts || 1;
  const topPages = vis?.top_pages ?? [];
  const maxPageviews = topPages[0]?.pageviews || 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Analitik"
        title="Performa & keuangan platform"
        subtitle="Pantau tren pendapatan Paket Pro vs donasi, rata-rata skor TWK/TIU/TKP, dan paket yang paling aktif dikerjakan."
        actions={
          <div
            className="inline-flex items-center rounded-xl border border-line bg-surface p-1"
            role="group"
            aria-label="Rentang waktu analitik"
          >
            {([7, 30, 90] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  days === range
                    ? "bg-accent-solid text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                {range} Hari
              </button>
            ))}
          </div>
        }
      />

      {(overview.error || exams.error || revenue.error) && (
        <ErrorPanel
          message={
            overview.error ||
            exams.error ||
            revenue.error ||
            "Sebagian data analitik belum dapat dimuat."
          }
          retry={() => {
            overview.reload();
            exams.reload();
            revenue.reload();
          }}
        />
      )}

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Total pendapatan"
          value={formatRupiah(ov?.total_revenue)}
          hint={`Pro ${formatRupiah(ov?.pro_revenue)} · Donasi ${formatRupiah(ov?.donation_revenue)}`}
          icon={CreditCard}
          tone="success"
          loading={overview.loading}
        />
        <AdminStatCard
          label="Rata-rata skor SKD"
          value={ex ? ex.avg_total_score.toFixed(1) : "0"}
          hint={`Dari ${ex?.total_finished_sessions ?? 0} sesi ujian selesai`}
          icon={Target}
          tone="accent"
          loading={exams.loading}
        />
        <AdminStatCard
          label="Lulus Passing Grade"
          value={`${ex?.pass_rate ?? 0}%`}
          hint="Ambang SKD BKN: TWK 65 · TIU 80 · TKP 166"
          icon={Award}
          tone="warning"
          loading={exams.loading}
        />
        <AdminStatCard
          label="Peserta & sesi live"
          value={(ov?.participants_count ?? ov?.total_users ?? 0).toLocaleString("id-ID")}
          hint={`${ov?.active_exams ?? 0} sedang ujian · ${ov?.pro_users_count ?? 0} Pro`}
          icon={ov?.active_exams ? Activity : Users}
          tone={ov?.active_exams ? "danger" : "neutral"}
          loading={overview.loading}
        />
      </div>

      {/* Subtest Averages vs Passing Grade */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Rata-rata skor per subtes vs Passing Grade
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Perbandingan rata-rata hasil seluruh peserta (sesi preview admin
              dikecualikan).
            </p>
          </div>
          <AdminBadge tone="neutral">Standar SKD BKN</AdminBadge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SUBTEST_BENCHMARKS.map((item) => {
            const score = ex?.[item.key] ?? 0;
            const passed = score >= item.pg;
            const pct = Math.min(100, Math.round((score / item.max) * 100));
            const pgPct = Math.round((item.pg / item.max) * 100);
            return (
              <div
                key={item.label}
                className="rounded-xl border border-line bg-surface-subtle/50 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted">
                    {item.label}
                  </span>
                  <AdminBadge tone={passed ? "success" : "warning"}>
                    {passed ? "Di atas PG" : "Di bawah PG"}
                  </AdminBadge>
                </div>
                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-2xl font-semibold text-ink">
                    {exams.loading ? "—" : score.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted">
                    / {item.max} (PG {item.pg})
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      passed ? "bg-success" : "bg-accent-solid"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  <span
                    className="absolute top-0 bottom-0 w-0.5 bg-ink/50"
                    style={{ left: `${pgPct}%` }}
                    title={`Passing Grade ${item.pg}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-soft text-success">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Tren pendapatan harian ({days} hari)
              </h2>
              <p className="text-xs text-muted">
                Transaksi Paket Pro terkonfirmasi (WIB)
              </p>
            </div>
          </div>
          <RevenueChart
            data={rev?.daily_revenue ?? []}
            height={290}
            loading={revenue.loading}
          />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <BarChart3 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Distribusi skor total peserta
              </h2>
              <p className="text-xs text-muted">
                Sebaran rentang nilai pada seluruh sesi selesai
              </p>
            </div>
          </div>
          <ScoreDistributionChart
            data={ex?.score_distribution ?? []}
            height={290}
            loading={exams.loading}
          />
        </section>
      </div>

      {/* Visitor Analytics Section */}
      <section id="visitors" className="space-y-4 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Trafik pengunjung situs ({days} hari)
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Pencatatan ramah privasi tanpa cookie pelacak (hash teranonimisasi
              per bulan · kalender WIB · jalur admin & bot dikecualikan).
            </p>
          </div>
          <AdminBadge tone="success">
            {(vis?.online_now ?? 0).toLocaleString("id-ID")} online sekarang
          </AdminBadge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Online sekarang"
            value={(vis?.online_now ?? 0).toLocaleString("id-ID")}
            hint="Pengunjung aktif 5 menit terakhir"
            badge="Live"
            icon={Globe}
            tone="success"
            loading={visitors.loading}
          />
          <AdminStatCard
            label="Pengunjung hari ini"
            value={(vis?.today_visitors ?? 0).toLocaleString("id-ID")}
            hint={`${(vis?.today_pageviews ?? 0).toLocaleString("id-ID")} tayangan · kemarin ${(vis?.yesterday_visitors ?? 0).toLocaleString("id-ID")}`}
            icon={Users}
            tone="accent"
            loading={visitors.loading}
          />
          <AdminStatCard
            label="Pengunjung bulan ini"
            value={(vis?.month_visitors ?? 0).toLocaleString("id-ID")}
            hint={`${(vis?.month_pageviews ?? 0).toLocaleString("id-ID")} tayangan bulan berjalan`}
            icon={TrendingUp}
            tone="accent"
            loading={visitors.loading}
          />
          <AdminStatCard
            label="Total pengunjung"
            value={(vis?.total_visitors ?? 0).toLocaleString("id-ID")}
            hint={`${(vis?.total_pageviews ?? 0).toLocaleString("id-ID")} total tayangan halaman`}
            icon={Eye}
            tone="neutral"
            loading={visitors.loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Tren pengunjung unik & tayangan harian
                </h3>
                <p className="text-xs text-muted">
                  Hijau: pengunjung unik harian · Indigo: total tayangan halaman
                </p>
              </div>
            </div>
            <VisitorTrendChart
              data={vis?.daily_trend ?? []}
              height={260}
              loading={visitors.loading}
            />
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-ink">
                Halaman paling sering dikunjungi
              </h3>
              <p className="text-xs text-muted">
                Total tayangan dalam {days} hari terakhir
              </p>
            </div>
            {visitors.loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-surface-subtle animate-pulse"
                  />
                ))}
              </div>
            ) : topPages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface-subtle/40 p-6 text-center text-xs text-muted">
                Belum ada kunjungan tercatat pada rentang waktu ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topPages.map((item) => {
                  const widthPct = Math.max(
                    6,
                    Math.round((item.pageviews / maxPageviews) * 100),
                  );
                  return (
                    <div key={item.path} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-ink" title={item.path}>
                          {PAGE_LABELS[item.path] ?? item.path}
                        </span>
                        <span className="shrink-0 font-semibold text-ink tabular-nums">
                          {item.pageviews.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-surface-hover overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-solid"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-muted">
                          {item.path}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Row: Most Attempted Packages + Revenue Mix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Paket paling banyak dikerjakan
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Berdasarkan sesi simulasi selesai peserta (non-preview)
              </p>
            </div>
            <Link
              href="/admin/packages"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              Kelola paket
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {revenue.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-surface-subtle animate-pulse"
                />
              ))}
            </div>
          ) : topAttempted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface-subtle/40 p-8 text-center text-sm text-muted">
              Belum ada sesi ujian selesai untuk meranking paket terpopuler.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topAttempted.map((pkg, idx) => (
                <Link
                  key={pkg.id}
                  href={`/admin/questions?package_id=${pkg.id}`}
                  className="group flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-surface-subtle/40 px-4 py-3 transition-colors hover:border-accent-border hover:bg-surface-hover/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-xs font-semibold text-muted tabular-nums group-hover:text-accent">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {pkg.title}
                      </p>
                      <p className="text-xs text-muted tabular-nums">
                        {pkg.attempts} sesi · Rata-rata {pkg.avg_score} · Lulus
                        PG {pkg.pass_rate}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block h-2 w-28 rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-solid"
                        style={{
                          width: `${Math.round((pkg.attempts / maxAttempts) * 100)}%`,
                        }}
                      />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 flex flex-col">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">
              Komposisi pendapatan
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Perbandingan Paket Pro vs donasi sukses
            </p>
          </div>

          {revenue.loading ? (
            <div className="h-56 rounded-xl bg-surface-subtle animate-pulse" />
          ) : revenueMix.length === 0 ? (
            <div className="flex flex-1 min-h-[220px] items-center justify-center rounded-xl border border-dashed border-line bg-surface-subtle/40 p-6 text-center text-xs text-muted">
              Belum ada transaksi berhasil untuk dipecah per sumber pendapatan.
            </div>
          ) : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueMix}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={4}
                    >
                      {revenueMix.map((entry, idx) => (
                        <Cell
                          key={entry.label}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatRupiah(Number(value ?? 0))}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2 border-t border-line pt-3 text-xs">
                {revenueMix.map((entry, idx) => (
                  <li
                    key={entry.label}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="inline-flex items-center gap-2 text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                      {entry.label}
                    </span>
                    <strong className="text-ink tabular-nums">
                      {formatRupiah(entry.value)}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
