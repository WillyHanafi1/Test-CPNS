"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Eye,
  Globe,
  Heart,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useResource } from "@/lib/useResource";
import { ErrorPanel } from "@/components/AppShell";
import {
  AdminBadge,
  AdminPageHeader,
  AdminStatCard,
} from "@/components/admin";
import RevenueChart from "@/components/admin/charts/RevenueChart";
import { formatDateTimeJakarta, formatRupiah } from "@/lib/admin-format";
import type {
  AdminActionSummary,
  AdminOverviewStats,
  AdminRevenueAnalytics,
  AdminVisitorAnalytics,
} from "@/types/admin";

export default function AdminDashboard() {
  const [days, setDays] = useState<7 | 30>(7);

  const overview = useResource<AdminOverviewStats>("/admin/analytics/overview");
  const actions = useResource<AdminActionSummary>(
    "/admin/analytics/action-summary",
  );
  const revenue = useResource<AdminRevenueAnalytics>(
    `/admin/analytics/revenue-trends?days=${days}`,
  );
  const visitors = useResource<AdminVisitorAnalytics>(
    "/admin/analytics/visitors?days=14",
  );

  const refreshing =
    overview.refreshing ||
    actions.refreshing ||
    revenue.refreshing ||
    visitors.refreshing;

  const refreshAll = () => {
    overview.reload();
    actions.reload();
    revenue.reload();
    visitors.reload();
  };

  const ov = overview.data;
  const act = actions.data;
  const vis = visitors.data;

  const attentionItems = [
    {
      key: "ops",
      label: "Kesehatan layanan",
      value:
        act && act.ops_issues_count > 0
          ? `${act.ops_issues_count} perlu diperiksa`
          : "Berjalan baik",
      tone: act && act.ops_issues_count > 0 ? "danger" : "success",
      icon:
        act && act.ops_issues_count > 0 ? AlertTriangle : CheckCircle2,
      href: "/admin/operations",
    },
    {
      key: "feedback",
      label: "Masukan belum dibaca",
      value: `${act?.pending_feedback ?? 0} pending`,
      tone: (act?.pending_feedback ?? 0) > 0 ? "warning" : "neutral",
      icon: MessageSquare,
      href: "/admin/feedback?status=pending",
    },
    {
      key: "payments",
      label: "Transaksi tertunda",
      value: `${(act?.pending_transactions ?? 0) + (act?.review_payment_events ?? 0)} antrean`,
      tone:
        (act?.review_payment_events ?? 0) > 0
          ? "danger"
          : (act?.pending_transactions ?? 0) > 0
            ? "warning"
            : "neutral",
      icon: CreditCard,
      href: "/admin/transactions?status=pending",
    },
    {
      key: "drafts",
      label: "Paket masih draft",
      value: `${act?.draft_packages ?? 0} paket`,
      tone: (act?.draft_packages ?? 0) > 0 ? "accent" : "neutral",
      icon: Package,
      href: "/admin/packages?status=draft",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Command Center"
        title="Ringkasan platform"
        subtitle="Pantau antrean tindak lanjut, performa konten, dan aktivitas transaksi dari satu layar."
        actions={
          <>
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Memperbarui…" : "Perbarui"}
            </button>
            <Link
              href="/admin/packages?action=create"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Buat paket baru
            </Link>
          </>
        }
      />

      {overview.error && (
        <ErrorPanel message={overview.error} retry={overview.reload} />
      )}

      {/* Row 1: Action Queue (Needs Attention) */}
      <section aria-label="Antrean tindak lanjut">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Antrean tindak lanjut
          </h2>
          <span className="text-xs text-muted">
            Klik kartu untuk langsung menangani
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {attentionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-accent-border hover:bg-surface-subtle/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      item.tone === "danger"
                        ? "bg-danger-soft text-danger"
                        : item.tone === "warning"
                          ? "bg-warning-soft text-warning"
                          : item.tone === "success"
                            ? "bg-success-soft text-success"
                            : item.tone === "accent"
                              ? "bg-accent-soft text-accent"
                              : "bg-surface-subtle text-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted truncate">{item.label}</p>
                    <p className="text-sm font-semibold text-ink tabular-nums">
                      {actions.loading ? "Memuat…" : item.value}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Row 2: Core KPIs */}
      <section aria-label="Metrik utama">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Peserta aktif"
            value={(ov?.participants_count ?? ov?.total_users ?? 0).toLocaleString("id-ID")}
            hint={`${ov?.pro_users_count ?? 0} anggota Paket Pro · ${ov?.total_users ?? 0} total akun`}
            icon={Users}
            tone="accent"
            href="/admin/users"
            loading={overview.loading}
          />
          <AdminStatCard
            label="Bank soal tayang"
            value={(ov?.published_questions ?? ov?.total_questions ?? 0).toLocaleString("id-ID")}
            hint={`${ov?.published_packages ?? 0} dari ${ov?.total_packages ?? 0} paket aktif tayang`}
            icon={BookOpen}
            tone="accent"
            href="/admin/packages"
            loading={overview.loading}
          />
          <AdminStatCard
            label="Total pendapatan"
            value={formatRupiah(ov?.total_revenue)}
            hint={`Pro ${formatRupiah(ov?.pro_revenue)} · Donasi ${formatRupiah(ov?.donation_revenue)}`}
            icon={CreditCard}
            tone="success"
            href="/admin/transactions"
            loading={overview.loading}
          />
          <AdminStatCard
            label="Ujian sedang berjalan"
            value={ov?.active_exams ?? 0}
            hint={`${ov?.finished_sessions_7d ?? 0} sesi selesai dalam 7 hari terakhir`}
            badge="Live"
            icon={Activity}
            tone="warning"
            href="/admin/analytics"
            loading={overview.loading}
          />
        </div>
      </section>

      {/* Row 2B: Privacy-Friendly Visitor Telemetry */}
      <section
        aria-label="Trafik pengunjung"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-soft text-success">
              <Globe className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Trafik pengunjung situs
              </h2>
              <p className="text-xs text-muted">
                Tanpa cookie pelacak · Jendela online 5 menit terakhir (WIB)
              </p>
            </div>
          </div>
          <Link
            href="/admin/analytics#visitors"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            Lihat grafik & halaman populer
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface-subtle/50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Online sekarang</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
              {visitors.loading ? "—" : (vis?.online_now ?? 0).toLocaleString("id-ID")}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Aktif 5 menit terakhir</p>
          </div>

          <div className="rounded-xl border border-line bg-surface-subtle/50 px-4 py-3">
            <span className="text-xs text-muted">Hari ini</span>
            <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
              {visitors.loading ? "—" : (vis?.today_visitors ?? 0).toLocaleString("id-ID")}
            </p>
            <p className="mt-0.5 text-[11px] text-muted tabular-nums">
              {(vis?.today_pageviews ?? 0).toLocaleString("id-ID")} tayangan · kemarin{" "}
              {(vis?.yesterday_visitors ?? 0).toLocaleString("id-ID")}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface-subtle/50 px-4 py-3">
            <span className="text-xs text-muted">Bulan ini</span>
            <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
              {visitors.loading ? "—" : (vis?.month_visitors ?? 0).toLocaleString("id-ID")}
            </p>
            <p className="mt-0.5 text-[11px] text-muted tabular-nums">
              {(vis?.month_pageviews ?? 0).toLocaleString("id-ID")} tayangan bulan berjalan
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface-subtle/50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Total tercatat</span>
              <Eye className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
              {visitors.loading ? "—" : (vis?.total_visitors ?? 0).toLocaleString("id-ID")}
            </p>
            <p className="mt-0.5 text-[11px] text-muted tabular-nums">
              {(vis?.total_pageviews ?? 0).toLocaleString("id-ID")} total tayangan halaman
            </p>
          </div>
        </div>
      </section>

      {/* Row 3: Revenue Chart + Recent Transactions / Quick Links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Tren pendapatan Paket Pro ({days} hari)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Berdasarkan tanggal konfirmasi pembayaran (WIB), tidak termasuk
                donasi sukarela.
              </p>
            </div>
            <div className="inline-flex items-center rounded-xl border border-line bg-surface-subtle p-1 self-start">
              {([7, 30] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDays(range)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    days === range
                      ? "bg-surface text-ink shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {range} Hari
                </button>
              ))}
            </div>
          </div>

          {revenue.error ? (
            <ErrorPanel message={revenue.error} retry={revenue.reload} />
          ) : (
            <RevenueChart
              data={revenue.data?.daily_revenue ?? []}
              height={280}
              loading={revenue.loading}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
            <span className="text-muted">
              Butuh distribusi skor TWK/TIU/TKP dan paket terpopuler?
            </span>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
            >
              Buka analitik lengkap
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 flex flex-col">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Transaksi terbaru
              </h2>
              <p className="text-xs text-muted mt-0.5">
                5 aktivitas pembayaran terakhir
              </p>
            </div>
            <Link
              href="/admin/transactions"
              className="text-xs font-semibold text-accent hover:underline"
            >
              Semua →
            </Link>
          </div>

          {actions.loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-surface-subtle animate-pulse"
                />
              ))}
            </div>
          ) : !act?.recent_transactions?.length ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line bg-surface-subtle/40 p-6 text-center text-xs text-muted">
              Belum ada transaksi masuk.
            </div>
          ) : (
            <ul className="space-y-2 flex-1">
              {act.recent_transactions.map((tx) => {
                const isDonation = tx.transaction_type === "donation";
                const statusTone =
                  tx.payment_status === "success"
                    ? "success"
                    : tx.payment_status === "pending"
                      ? "warning"
                      : "danger";
                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isDonation ? (
                          <Heart className="h-3.5 w-3.5 shrink-0 text-accent" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 shrink-0 text-warning" />
                        )}
                        <p className="text-xs font-semibold text-ink truncate">
                          {tx.email}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted truncate">
                        {isDonation ? "Donasi" : "Paket Pro"} ·{" "}
                        {formatDateTimeJakarta(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-ink tabular-nums">
                        {formatRupiah(tx.amount)}
                      </p>
                      <AdminBadge tone={statusTone} className="mt-0.5">
                        {tx.payment_status === "success"
                          ? "Sukses"
                          : tx.payment_status === "pending"
                            ? "Pending"
                            : "Gagal"}
                      </AdminBadge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
            <Link
              href="/admin/questions"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover"
            >
              <BookOpen className="h-3.5 w-3.5 text-accent" />
              Bank soal
            </Link>
            <Link
              href="/admin/operations"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover"
            >
              <Activity className="h-3.5 w-3.5 text-success" />
              Cek operasi
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
