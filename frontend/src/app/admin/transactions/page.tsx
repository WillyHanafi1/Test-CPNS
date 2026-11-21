"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Heart,
  Loader2,
  Package as PackageIcon,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { ErrorPanel, Loading } from "@/components/AppShell";
import {
  AdminBadge,
  AdminDataTable,
  AdminDialog,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminStatCard,
  type Column,
} from "@/components/admin";
import PaymentAudit from "@/components/admin/PaymentAudit";
import {
  formatDateJakarta,
  formatDateTimeJakarta,
  formatRupiah,
} from "@/lib/admin-format";
import type {
  AdminTransaction,
  AdminTransactionList,
  AdminTransactionSummary,
} from "@/types/admin";

const PAGE_SIZE = 15;

function TransactionsAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") ?? "",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "",
  );
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "");

  // Drawer state
  const [selected, setSelected] = useState<AdminTransaction | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await api<AdminTransactionSummary>(
        "/admin/transactions/summary",
      );
      setSummary(data);
    } catch {
      /* Handled gracefully in KPI cards */
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("transaction_type", typeFilter);

      const data = await api<AdminTransactionList>(
        `/admin/transactions?${params.toString()}`,
        { signal: controller.signal },
      );
      setTransactions(data.items);
      setTotal(data.total);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error ? err.message : "Gagal memuat data transaksi.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSummary();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTransactions();
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchTransactions]);

  const syncParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `/admin/transactions?${qs}` : "/admin/transactions", {
      scroll: false,
    });
  };

  const handleOverrideStatus = async (newStatus: "pending" | "success" | "failed") => {
    if (!selected) return;
    if (!overrideReason.trim()) {
      toast.error("Isi alasan perubahan status untuk jejak audit.");
      return;
    }
    setActionLoading(true);
    try {
      const params = new URLSearchParams({
        new_status: newStatus,
        reason: overrideReason.trim(),
      });
      const res = await api<{ message: string; new_status: string }>(
        `/admin/transactions/${selected.id}/status?${params.toString()}`,
        { method: "PUT" },
      );
      toast.success(res.message || "Status transaksi diperbarui.");
      setSelected((prev) =>
        prev ? { ...prev, payment_status: res.new_status } : null,
      );
      setOverrideReason("");
      await Promise.all([fetchTransactions(), fetchSummary()]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui status.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<AdminTransaction>[] = [
    {
      header: "Order ID & Waktu",
      className: "min-w-[200px]",
      render: (t) => {
        const orderLabel = t.order_id || t.id.slice(0, 8);
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <code className="text-xs font-semibold text-accent">
                {orderLabel}
              </code>
              <button
                type="button"
                aria-label={`Salin order ${orderLabel}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard.writeText(t.order_id || t.id);
                  toast.success("Order ID disalin.");
                }}
                className="rounded p-0.5 text-muted hover:bg-surface-hover hover:text-ink"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-muted tabular-nums">
              {formatDateTimeJakarta(t.paid_at || t.created_at)}
            </p>
          </div>
        );
      },
    },
    {
      header: "Pengguna",
      className: "min-w-[190px]",
      render: (t) => (
        <p className="text-sm font-medium text-ink truncate max-w-[220px]">
          {t.user.email}
        </p>
      ),
    },
    {
      header: "Produk / Tipe",
      className: "min-w-[190px]",
      render: (t) => {
        if (t.transaction_type === "donation") {
          return (
            <div className="space-y-0.5">
              <AdminBadge tone="accent">
                <Heart className="h-3 w-3" />
                Donasi{t.is_anonymous ? " (Anonim)" : ""}
              </AdminBadge>
              {t.message && (
                <p className="text-xs text-muted line-clamp-1 max-w-[220px]">
                  &ldquo;{t.message}&rdquo;
                </p>
              )}
            </div>
          );
        }
        if (t.transaction_type === "pro_upgrade") {
          return (
            <AdminBadge tone="warning">
              <Crown className="h-3 w-3" />
              Paket Pro
            </AdminBadge>
          );
        }
        return (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            <PackageIcon className="h-3.5 w-3.5 text-muted" />
            <span>{t.package?.title || t.transaction_type}</span>
          </div>
        );
      },
    },
    {
      header: "Nominal",
      className: "tabular-nums font-semibold text-ink whitespace-nowrap",
      render: (t) => formatRupiah(t.amount),
    },
    {
      header: "Status",
      render: (t) => {
        const tone =
          t.payment_status === "success"
            ? "success"
            : t.payment_status === "pending"
              ? "warning"
              : "danger";
        const label =
          t.payment_status === "success"
            ? "Sukses"
            : t.payment_status === "pending"
              ? "Pending"
              : "Gagal";
        return (
          <AdminBadge tone={tone} dot>
            {label}
          </AdminBadge>
        );
      },
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap",
      render: (t) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOverrideReason("");
            setSelected(t);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover"
        >
          Detail &amp; Audit
        </button>
      ),
    },
  ];

  const hasFilters = Boolean(search || statusFilter || typeFilter);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Keuangan"
        title="Transaksi & audit pembayaran"
        subtitle="Pantau transaksi Paket Pro, donasi komunitas, dan riwayat verifikasi webhook DOKU."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Pendapatan Paket Pro"
          value={formatRupiah(summary?.pro_revenue)}
          hint={`${summary?.pro_count ?? 0} transaksi Pro berhasil`}
          icon={TrendingUp}
          tone="success"
          loading={summaryLoading}
        />
        <AdminStatCard
          label="Donasi komunitas"
          value={formatRupiah(summary?.donation_revenue)}
          hint={`${summary?.donation_count ?? 0} dukungan tercatat`}
          icon={Heart}
          tone="accent"
          loading={summaryLoading}
        />
        <AdminStatCard
          label="Transaksi sukses"
          value={summary?.success_count ?? 0}
          hint={`Total ${formatRupiah(summary?.total_revenue)}`}
          icon={CheckCircle2}
          tone="success"
          loading={summaryLoading}
        />
        <AdminStatCard
          label="Menunggu konfirmasi"
          value={summary?.pending_count ?? 0}
          hint={`${summary?.failed_count ?? 0} transaksi gagal / kedaluwarsa`}
          icon={Clock}
          tone={(summary?.pending_count ?? 0) > 0 ? "warning" : "neutral"}
          loading={summaryLoading}
        />
      </div>

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari email pengguna atau Order ID…"
        hasActiveFilters={hasFilters}
        onResetFilters={() => {
          setSearch("");
          setDebouncedSearch("");
          setStatusFilter("");
          setTypeFilter("");
          setPage(1);
          router.replace("/admin/transactions", { scroll: false });
        }}
      >
        <select
          aria-label="Filter tipe transaksi"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
            syncParam("type", e.target.value);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua tipe</option>
          <option value="pro_upgrade">Paket Pro</option>
          <option value="donation">Donasi</option>
        </select>

        <select
          aria-label="Filter status pembayaran"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
            syncParam("status", e.target.value);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua status</option>
          <option value="success">Sukses</option>
          <option value="pending">Pending</option>
          <option value="failed">Gagal</option>
        </select>
      </AdminFilterBar>

      {error ? (
        <ErrorPanel message={error} retry={() => void fetchTransactions()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={transactions}
          loading={loading}
          emptyIcon={<CreditCard className="h-6 w-6" />}
          emptyText="Belum ada transaksi ditemukan"
          emptyHint="Coba ubah filter tipe, status, atau kata kunci Order ID."
          onRowClick={(t) => {
            setOverrideReason("");
            setSelected(t);
          }}
        />
      )}

      <AdminPagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Detail & Audit Slide-Over Drawer */}
      {selected && (
        <AdminDialog
          variant="drawer"
          size="md"
          label="Detail dan audit transaksi"
          title={`Order ${selected.order_id || selected.id.slice(0, 8)}`}
          subtitle={`${selected.user.email} · ${formatRupiah(selected.amount)}`}
          onClose={() => !actionLoading && setSelected(null)}
          footer={
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
            >
              Tutup
            </button>
          }
        >
          <div className="space-y-6">
            {/* Core Metadata */}
            <dl className="rounded-xl border border-line bg-surface-subtle/50 divide-y divide-line text-sm">
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Status pembayaran</dt>
                <dd>
                  <AdminBadge
                    tone={
                      selected.payment_status === "success"
                        ? "success"
                        : selected.payment_status === "pending"
                          ? "warning"
                          : "danger"
                    }
                    dot
                  >
                    {selected.payment_status === "success"
                      ? "Sukses"
                      : selected.payment_status === "pending"
                        ? "Pending"
                        : "Gagal"}
                  </AdminBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Tipe transaksi</dt>
                <dd className="font-medium text-ink">
                  {selected.transaction_type === "donation"
                    ? `Donasi${selected.is_anonymous ? " (Anonim)" : ""}`
                    : selected.transaction_type === "pro_upgrade"
                      ? "Paket Pro"
                      : selected.package?.title || selected.transaction_type}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Order ID</dt>
                <dd className="font-mono text-xs text-ink break-all text-right">
                  {selected.order_id || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Transaction ID</dt>
                <dd className="font-mono text-xs text-muted break-all text-right">
                  {selected.id}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Dibuat</dt>
                <dd className="text-xs text-ink tabular-nums">
                  {formatDateTimeJakarta(selected.created_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Dikonfirmasi bayar</dt>
                <dd className="text-xs text-ink tabular-nums">
                  {formatDateTimeJakarta(selected.paid_at)}
                </dd>
              </div>
              {selected.payment_environment && (
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-xs text-muted">Lingkungan DOKU</dt>
                  <dd className="text-xs font-semibold uppercase text-muted">
                    {selected.payment_environment}
                  </dd>
                </div>
              )}
              {selected.transaction_type !== "donation" && (
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-xs text-muted">Akses berlaku hingga</dt>
                  <dd className="text-xs text-ink tabular-nums">
                    {formatDateJakarta(selected.access_expires_at)}
                  </dd>
                </div>
              )}
              {selected.message && (
                <div className="px-4 py-3 space-y-1">
                  <dt className="text-xs text-muted">Pesan dukungan</dt>
                  <dd className="text-sm text-ink italic">
                    &ldquo;{selected.message}&rdquo;
                  </dd>
                </div>
              )}
            </dl>

            {/* DOKU Provider Events & Audit Trail */}
            <div className="rounded-xl border border-line bg-surface p-4">
              <PaymentAudit id={selected.id} />
            </div>

            {/* Audited Status Override */}
            <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-ink">
                  Pembaruan status manual (tercatat di audit)
                </h3>
              </div>

              {selected.payment_status === "success" ? (
                <p className="text-xs text-muted leading-relaxed">
                  Transaksi ini sudah berstatus <strong>Sukses</strong> dan
                  terkunci agar hak akses Paket Pro / catatan keuangan tidak
                  berubah tidak sengaja.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted leading-relaxed">
                    Gunakan hanya jika bukti transfer/mutasi DOKU sudah
                    terverifikasi secara manual.
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted">
                      Alasan perubahan (wajib untuk log audit)
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Contoh: Mutasi DOKU terkonfirmasi manual ref #1234"
                      className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleOverrideStatus("success")}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-success px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Tandai Sukses
                    </button>
                    <button
                      type="button"
                      disabled={
                        actionLoading || selected.payment_status === "pending"
                      }
                      onClick={() => void handleOverrideStatus("pending")}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover disabled:opacity-45"
                    >
                      Set Pending
                    </button>
                    <button
                      type="button"
                      disabled={
                        actionLoading || selected.payment_status === "failed"
                      }
                      onClick={() => void handleOverrideStatus("failed")}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-danger-soft px-3 text-xs font-semibold text-danger hover:opacity-90 disabled:opacity-45"
                    >
                      Tandai Gagal
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}

export default function TransactionsAdmin() {
  return (
    <Suspense fallback={<Loading label="Memuat transaksi…" />}>
      <TransactionsAdminContent />
    </Suspense>
  );
}
