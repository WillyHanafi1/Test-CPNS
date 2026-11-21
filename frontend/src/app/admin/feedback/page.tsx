"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Trash2,
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
  ConfirmModal,
  type AdminTone,
  type Column,
} from "@/components/admin";
import { formatDateTimeJakarta } from "@/lib/admin-format";
import type { AdminFeedback, AdminFeedbackList } from "@/types/admin";

const PAGE_SIZE = 15;

const STATUS_META: Record<string, { label: string; tone: AdminTone }> = {
  pending: { label: "Pending", tone: "warning" },
  reviewed: { label: "Ditinjau", tone: "accent" },
  in_progress: { label: "Diproses", tone: "accent" },
  resolved: { label: "Selesai", tone: "success" },
};

const PRIORITY_META: Record<string, { label: string; tone: AdminTone }> = {
  urgent: { label: "Urgent", tone: "danger" },
  high: { label: "Tinggi", tone: "warning" },
  medium: { label: "Sedang", tone: "accent" },
  low: { label: "Rendah", tone: "neutral" },
};

const CATEGORY_META: Record<string, { label: string; tone: AdminTone }> = {
  bug: { label: "Bug", tone: "danger" },
  correction: { label: "Koreksi soal", tone: "warning" },
  suggestion: { label: "Saran", tone: "accent" },
  other: { label: "Lainnya", tone: "neutral" },
};

function FeedbackAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
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
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") ?? "",
  );
  const [priorityFilter, setPriorityFilter] = useState(
    searchParams.get("priority") ?? "",
  );

  // Triage drawer & delete modal
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [editPriority, setEditPriority] = useState("medium");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminFeedback | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchFeedback = useCallback(async () => {
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
      if (categoryFilter) params.set("category", categoryFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      const data = await api<AdminFeedbackList>(
        `/admin/feedback?${params.toString()}`,
        { signal: controller.signal },
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setCountsByStatus(data.counts_by_status ?? {});
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error ? err.message : "Gagal memuat data masukan.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchFeedback();
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchFeedback]);

  const openTriage = (f: AdminFeedback) => {
    setSelected(f);
    setEditStatus(f.status);
    setEditPriority(f.priority);
    setEditNotes(f.admin_notes ?? "");
  };

  const handleSaveTriage = async (overrideStatus?: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const nextStatus = overrideStatus ?? editStatus;
      const updated = await api<AdminFeedback>(
        `/admin/feedback/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
            priority: editPriority,
            admin_notes: editNotes.trim() || null,
          }),
        },
      );
      toast.success("Status masukan diperbarui.");
      setSelected(updated);
      setEditStatus(updated.status);
      await fetchFeedback();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui masukan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/admin/feedback/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Masukan dihapus.");
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      await fetchFeedback();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus masukan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const totalAllStatuses = Object.values(countsByStatus).reduce(
    (sum, n) => sum + n,
    0,
  );

  const columns: Column<AdminFeedback>[] = [
    {
      header: "Pengirim & Konteks",
      className: "min-w-[220px]",
      render: (f) => (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink truncate max-w-[210px]">
            {f.user?.email || "Anonim"}
          </p>
          <p className="text-xs text-muted tabular-nums">
            {formatDateTimeJakarta(f.created_at)}
          </p>
          {f.path_context && (
            <code className="inline-block max-w-[200px] truncate rounded border border-line bg-surface-subtle px-1.5 py-0.5 text-[11px] text-muted">
              {f.path_context}
            </code>
          )}
        </div>
      ),
    },
    {
      header: "Kategori & Prioritas",
      className: "min-w-[140px]",
      render: (f) => {
        const cat = CATEGORY_META[f.category?.toLowerCase()] ?? {
          label: f.category,
          tone: "neutral" as AdminTone,
        };
        const pri = PRIORITY_META[f.priority?.toLowerCase()] ?? {
          label: f.priority,
          tone: "neutral" as AdminTone,
        };
        return (
          <div className="flex flex-col items-start gap-1">
            <AdminBadge tone={cat.tone}>{cat.label}</AdminBadge>
            <AdminBadge tone={pri.tone}>{pri.label}</AdminBadge>
          </div>
        );
      },
    },
    {
      header: "Pesan & Catatan",
      className: "min-w-[280px] max-w-md",
      render: (f) => (
        <div className="space-y-1">
          <p className="text-sm text-ink line-clamp-2 leading-relaxed">
            {f.content}
          </p>
          {f.admin_notes && (
            <p className="text-xs text-accent line-clamp-1">
              Catatan admin: {f.admin_notes}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      render: (f) => {
        const meta = STATUS_META[f.status?.toLowerCase()] ?? {
          label: f.status,
          tone: "neutral" as AdminTone,
        };
        return (
          <AdminBadge tone={meta.tone} dot>
            {meta.label}
          </AdminBadge>
        );
      },
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap",
      render: (f) => (
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openTriage(f);
            }}
            className="inline-flex h-8 items-center rounded-lg border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover"
          >
            Tinjau
          </button>
          <button
            type="button"
            aria-label="Hapus masukan"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(f);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(
    search || statusFilter || categoryFilter || priorityFilter,
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Komunitas"
        title="Masukan peserta"
        subtitle="Tinjau laporan koreksi soal, bug, dan saran pengembangan dari peserta."
      />

      {/* Status Tabs with Live Counters */}
      <div
        className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1"
        role="tablist"
        aria-label="Filter status masukan"
      >
        {(
          [
            ["", `Semua (${totalAllStatuses})`],
            ["pending", `Pending (${countsByStatus.pending ?? 0})`],
            ["reviewed", `Ditinjau (${countsByStatus.reviewed ?? 0})`],
            ["in_progress", `Diproses (${countsByStatus.in_progress ?? 0})`],
            ["resolved", `Selesai (${countsByStatus.resolved ?? 0})`],
          ] as const
        ).map(([val, label]) => (
          <button
            key={val || "all"}
            type="button"
            role="tab"
            aria-selected={statusFilter === val}
            onClick={() => {
              setStatusFilter(val);
              setPage(1);
              const params = new URLSearchParams(searchParams.toString());
              if (val) params.set("status", val);
              else params.delete("status");
              const qs = params.toString();
              router.replace(qs ? `/admin/feedback?${qs}` : "/admin/feedback", {
                scroll: false,
              });
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
              statusFilter === val
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari isi pesan, catatan admin, atau email…"
        hasActiveFilters={hasFilters}
        onResetFilters={() => {
          setSearch("");
          setDebouncedSearch("");
          setStatusFilter("");
          setCategoryFilter("");
          setPriorityFilter("");
          setPage(1);
          router.replace("/admin/feedback", { scroll: false });
        }}
      >
        <select
          aria-label="Filter kategori masukan"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua kategori</option>
          <option value="correction">Koreksi soal</option>
          <option value="bug">Bug</option>
          <option value="suggestion">Saran</option>
          <option value="other">Lainnya</option>
        </select>

        <select
          aria-label="Filter prioritas masukan"
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua prioritas</option>
          <option value="urgent">Urgent</option>
          <option value="high">Tinggi</option>
          <option value="medium">Sedang</option>
          <option value="low">Rendah</option>
        </select>
      </AdminFilterBar>

      {error ? (
        <ErrorPanel message={error} retry={() => void fetchFeedback()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={items}
          loading={loading}
          emptyIcon={<MessageSquare className="h-6 w-6" />}
          emptyText="Belum ada masukan ditemukan"
          emptyHint="Semua laporan peserta akan tampil di sini untuk ditinjau."
          onRowClick={openTriage}
        />
      )}

      <AdminPagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Triage Slide-Over Drawer */}
      {selected && (
        <AdminDialog
          variant="drawer"
          size="md"
          label="Detail dan tindak lanjut masukan"
          title="Tindak lanjut masukan"
          subtitle={`${selected.user?.email || "Anonim"} · ${formatDateTimeJakarta(selected.created_at)}`}
          onClose={() => !saving && setSelected(null)}
          footer={
            <>
              {selected.status !== "resolved" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveTriage("resolved")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-success-soft px-3.5 text-xs font-semibold text-success hover:opacity-90 mr-auto"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tandai selesai
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveTriage()}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-surface-subtle/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminBadge
                  tone={
                    CATEGORY_META[selected.category?.toLowerCase()]?.tone ??
                    "neutral"
                  }
                >
                  {CATEGORY_META[selected.category?.toLowerCase()]?.label ??
                    selected.category}
                </AdminBadge>
                {selected.path_context && (
                  <a
                    href={
                      selected.path_context.startsWith("/")
                        ? selected.path_context
                        : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
                  >
                    {selected.path_context}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {selected.content}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Status
                </label>
                <select
                  aria-label="Status masukan"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Ditinjau</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Prioritas
                </label>
                <select
                  aria-label="Prioritas masukan"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Catatan internal admin
              </label>
              <textarea
                rows={4}
                aria-label="Catatan internal admin"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Catat progres perbaikan atau tindak lanjut untuk arsip internal…"
                className="w-full rounded-xl border border-control-line bg-canvas p-3 text-sm text-ink leading-relaxed focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </AdminDialog>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Hapus masukan?"
        description="Masukan ini akan dihapus permanen dari daftar."
        confirmText="Hapus"
        loading={saving}
      />
    </div>
  );
}

export default function FeedbackAdmin() {
  return (
    <Suspense fallback={<Loading label="Memuat masukan…" />}>
      <FeedbackAdminContent />
    </Suspense>
  );
}
