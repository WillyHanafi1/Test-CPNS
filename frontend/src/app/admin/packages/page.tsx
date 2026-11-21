"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  Loader2,
  Package as PackageIcon,
  Plus,
  RotateCcw,
  ShieldCheck,
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
  AdminSwitch,
  ConfirmModal,
  type Column,
} from "@/components/admin";
import {
  formatDateTimeJakarta,
  formatRupiah,
  toLocalDatetimeInput,
} from "@/lib/admin-format";
import type {
  AdminPackage,
  AdminPackageList,
  PackageValidationResult,
} from "@/types/admin";

type StatusTab = "active" | "published" | "draft" | "archived";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  title: "",
  description: "",
  price: 0,
  category: "Mix",
  is_premium: false,
  is_published: false,
  is_active: true,
  is_weekly: false,
  start_at: "",
  end_at: "",
};

function PackagesAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = ((): StatusTab => {
    const param = searchParams.get("status");
    if (
      param === "published" ||
      param === "draft" ||
      param === "archived" ||
      param === "active"
    ) {
      return param;
    }
    return "active";
  })();

  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") ?? "",
  );
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [statusTab, setStatusTab] = useState<StatusTab>(initialStatus);

  // Modals & drawers
  const [isFormOpen, setIsFormOpen] = useState(
    searchParams.get("action") === "create",
  );
  const [selectedPackage, setSelectedPackage] = useState<AdminPackage | null>(
    null,
  );
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<AdminPackage | null>(null);
  const [copyTarget, setCopyTarget] = useState<AdminPackage | null>(null);
  const [copyTitle, setCopyTitle] = useState("");
  const [copyWeekly, setCopyWeekly] = useState(false);
  const [copyStart, setCopyStart] = useState("");
  const [copyEnd, setCopyEnd] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

  const [validation, setValidation] = useState<
    ({ id: string; title: string } & PackageValidationResult) | null
  >(null);
  const [publishing, setPublishing] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPackages = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (category) params.set("category", category);
      if (statusTab === "archived") {
        params.set("status", "archived");
        params.set("include_archived", "true");
      } else if (statusTab === "published" || statusTab === "draft") {
        params.set("status", statusTab);
      }

      const data = await api<AdminPackageList>(
        `/admin/packages?${params.toString()}`,
        { signal: controller.signal },
      );
      setPackages(data.items);
      setTotal(data.total);
    } catch (err) {
      if (controller.signal.aborted) return;
      setFetchError(
        err instanceof Error ? err.message : "Gagal memuat daftar paket.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, debouncedSearch, category, statusTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPackages();
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchPackages]);

  const syncTabUrl = (nextTab: StatusTab) => {
    setStatusTab(nextTab);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    if (nextTab === "active") params.delete("status");
    else params.set("status", nextTab);
    const qs = params.toString();
    router.replace(qs ? `/admin/packages?${qs}` : "/admin/packages", {
      scroll: false,
    });
  };

  const openCreate = () => {
    setSelectedPackage(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (pkg: AdminPackage) => {
    setSelectedPackage(pkg);
    setFormData({
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      category: pkg.category,
      is_premium: pkg.is_premium,
      is_published: pkg.is_published,
      is_active: pkg.is_active,
      is_weekly: pkg.is_weekly,
      start_at: toLocalDatetimeInput(pkg.start_at),
      end_at: toLocalDatetimeInput(pkg.end_at),
    });
    setIsFormOpen(true);
  };

  const openCopy = (pkg: AdminPackage) => {
    setCopyTarget(pkg);
    setCopyTitle(`${pkg.title} (Salinan)`);
    setCopyWeekly(pkg.is_weekly);
    setCopyStart("");
    setCopyEnd("");
  };

  const handleSubmitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormLoading(true);
    const isEdit = Boolean(selectedPackage);
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: formData.price,
      category: formData.category,
      is_premium: formData.is_premium,
      is_published: isEdit ? formData.is_published : false,
      is_active: formData.is_active,
      is_weekly: formData.is_weekly,
      start_at:
        formData.is_weekly && formData.start_at
          ? new Date(formData.start_at).toISOString()
          : null,
      end_at:
        formData.is_weekly && formData.end_at
          ? new Date(formData.end_at).toISOString()
          : null,
    };

    try {
      await api(
        isEdit ? `/admin/packages/${selectedPackage?.id}` : "/admin/packages",
        {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(
        isEdit
          ? "Perubahan paket disimpan."
          : "Paket draft baru berhasil dibuat.",
      );
      setIsFormOpen(false);
      await fetchPackages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan paket.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopyPackage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!copyTarget) return;
    setCopyLoading(true);
    try {
      const created = await api<AdminPackage>(
        `/admin/packages/${copyTarget.id}/copy`,
        {
          method: "POST",
          body: JSON.stringify({
            title: copyTitle.trim() || `${copyTarget.title} (Salinan)`,
            is_weekly: copyWeekly,
            new_start_at:
              copyWeekly && copyStart ? new Date(copyStart).toISOString() : null,
            new_end_at:
              copyWeekly && copyEnd ? new Date(copyEnd).toISOString() : null,
          }),
        },
      );
      toast.success(`Paket "${created.title}" berhasil disalin sebagai Draft.`);
      setCopyTarget(null);
      await fetchPackages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyalin paket.");
    } finally {
      setCopyLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setFormLoading(true);
    try {
      await api(`/admin/packages/${archiveTarget.id}`, { method: "DELETE" });
      toast.success("Paket diarsipkan.");
      setArchiveTarget(null);
      await fetchPackages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengarsipkan paket.",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleRestore = async (pkg: AdminPackage) => {
    try {
      await api(`/admin/packages/${pkg.id}/restore`, { method: "POST" });
      toast.success(`Paket "${pkg.title}" dipulihkan.`);
      await fetchPackages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memulihkan paket.",
      );
    }
  };

  const handleValidate = async (pkg: AdminPackage) => {
    try {
      const data = await api<PackageValidationResult>(
        `/admin/packages/${pkg.id}/validation`,
      );
      setValidation({ id: pkg.id, title: pkg.title, ...data });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memvalidasi paket.",
      );
    }
  };

  const handlePublishValidated = async () => {
    if (!validation) return;
    setPublishing(true);
    try {
      await api(`/admin/packages/${validation.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_published: true }),
      });
      toast.success("Revisi paket berhasil diterbitkan.");
      setValidation(null);
      await fetchPackages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Penerbitan paket gagal.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const handlePreview = async (pkg: AdminPackage) => {
    setPreviewingId(pkg.id);
    try {
      const data = await api<{ session_id: string }>(
        `/admin/packages/${pkg.id}/quick-preview`,
        { method: "POST" },
      );
      toast.success("Preview dibuka di tab baru.");
      window.open(
        `/exam/${data.session_id}/result`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat preview paket.",
      );
    } finally {
      setPreviewingId(null);
    }
  };

  const columns: Column<AdminPackage>[] = [
    {
      header: "Paket ujian",
      className: "min-w-[260px]",
      render: (pkg) => (
        <div className={`min-w-0 ${!pkg.is_active ? "opacity-60" : ""}`}>
          <p className="font-semibold text-ink truncate max-w-sm">
            {pkg.title}
          </p>
          <p className="text-xs text-muted line-clamp-1 max-w-sm mt-0.5">
            {pkg.description}
          </p>
          {pkg.is_weekly && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                Tryout Mingguan
                {pkg.start_at ? ` · ${formatDateTimeJakarta(pkg.start_at)}` : ""}
              </span>
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Akses & Kategori",
      render: (pkg) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <AdminBadge tone={pkg.is_premium ? "warning" : "neutral"}>
            {pkg.is_premium ? "Paket Pro" : "Gratis"}
          </AdminBadge>
          <AdminBadge tone="accent">{pkg.category}</AdminBadge>
          {pkg.price > 0 && (
            <span className="text-xs text-muted tabular-nums">
              {formatRupiah(pkg.price)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Komposisi soal",
      render: (pkg) => {
        const ready = pkg.question_count === 110;
        const hasBreakdown =
          (pkg.twk_count ?? 0) + (pkg.tiu_count ?? 0) + (pkg.tkp_count ?? 0) >
          0;
        return (
          <Link
            href={`/admin/questions?package_id=${pkg.id}`}
            className="group inline-flex flex-col gap-1 focus-visible:outline-none"
            title="Buka bank soal paket ini"
          >
            <span className="inline-flex items-center gap-1.5">
              <AdminBadge tone={ready ? "success" : "warning"}>
                {pkg.question_count} / 110 soal
              </AdminBadge>
              <span className="text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Kelola →
              </span>
            </span>
            {hasBreakdown && (
              <span className="text-xs text-muted tabular-nums">
                TWK {pkg.twk_count ?? 0} · TIU {pkg.tiu_count ?? 0} · TKP{" "}
                {pkg.tkp_count ?? 0}
              </span>
            )}
          </Link>
        );
      },
    },
    {
      header: "Status",
      render: (pkg) => (
        <div className="flex flex-col items-start gap-1">
          {!pkg.is_active ? (
            <AdminBadge tone="danger" dot>
              Arsip
            </AdminBadge>
          ) : pkg.is_published ? (
            <AdminBadge tone="success" dot>
              Published
            </AdminBadge>
          ) : (
            <AdminBadge tone="neutral" dot>
              Draft
            </AdminBadge>
          )}
          {pkg.published_revision_id && pkg.is_active && (
            <span className="text-xs text-muted">Revisi tersimpan</span>
          )}
        </div>
      ),
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap",
      render: (pkg) => (
        <div className="inline-flex items-center justify-end gap-1">
          {pkg.is_active ? (
            <>
              <Link
                href={`/admin/questions?package_id=${pkg.id}`}
                title="Kelola soal paket"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent" />
                <span className="hidden xl:inline">Soal</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleValidate(pkg)}
                title="Validasi 110 soal & terbitkan"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent-border bg-accent-soft px-2.5 text-xs font-semibold text-accent hover:opacity-90"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">
                  {pkg.is_published ? "Validasi" : "Terbitkan"}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Preview ${pkg.title}`}
                title="Preview hasil & pembahasan (tab baru)"
                disabled={previewingId === pkg.id || pkg.question_count === 0}
                onClick={() => void handlePreview(pkg)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40"
              >
                {previewingId === pkg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                aria-label={`Salin ${pkg.title}`}
                title="Salin paket ke draft baru"
                onClick={() => openCopy(pkg)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-ink"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Ubah ${pkg.title}`}
                title="Edit pengaturan paket"
                onClick={() => openEdit(pkg)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-ink"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Arsipkan ${pkg.title}`}
                title="Arsipkan paket"
                onClick={() => setArchiveTarget(pkg)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleRestore(pkg)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 text-xs font-semibold text-success hover:bg-success-soft"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Pulihkan
            </button>
          )}
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(search || category || statusTab !== "active");

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Konten Ujian"
        title="Paket ujian"
        subtitle={`Kelola ${total} paket simulasi SKD, komposisi 110 soal, dan status revisi tayang.`}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Buat paket baru
          </button>
        }
      />

      {/* Status Tabs */}
      <div
        className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1"
        role="tablist"
        aria-label="Filter status paket"
      >
        {(
          [
            ["active", "Semua aktif"],
            ["published", "Published"],
            ["draft", "Draft"],
            ["archived", "Arsip"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={statusTab === key}
            onClick={() => syncTabUrl(key)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              statusTab === key
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
        searchPlaceholder="Cari judul atau deskripsi paket…"
        hasActiveFilters={hasFilters}
        onResetFilters={() => {
          setSearch("");
          setDebouncedSearch("");
          setCategory("");
          syncTabUrl("active");
        }}
      >
        <select
          aria-label="Filter kategori paket"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua kategori</option>
          <option value="Mix">Mix (SKD Lengkap)</option>
          <option value="TWK">TWK</option>
          <option value="TIU">TIU</option>
          <option value="TKP">TKP</option>
        </select>
      </AdminFilterBar>

      {fetchError ? (
        <ErrorPanel message={fetchError} retry={() => void fetchPackages()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={packages}
          loading={loading}
          emptyIcon={<PackageIcon className="h-6 w-6" />}
          emptyText="Belum ada paket ditemukan"
          emptyHint="Ubah filter pencarian atau buat paket draft baru."
        />
      )}

      <AdminPagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Create / Edit Modal */}
      {isFormOpen && (
        <AdminDialog
          label="Formulir paket ujian"
          title={selectedPackage ? "Edit paket ujian" : "Buat paket baru"}
          subtitle={
            selectedPackage
              ? "Perubahan metadata langsung diterapkan pada katalog."
              : "Paket baru otomatis dibuat sebagai Draft sampai 110 soal lengkap."
          }
          size="md"
          onClose={() => !formLoading && setIsFormOpen(false)}
          footer={
            <>
              <button
                type="button"
                disabled={formLoading}
                onClick={() => setIsFormOpen(false)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Batal
              </button>
              <button
                type="submit"
                form="admin-package-form"
                disabled={formLoading}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedPackage ? "Simpan perubahan" : "Buat draft paket"}
              </button>
            </>
          }
        >
          <form
            id="admin-package-form"
            onSubmit={handleSubmitForm}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Nama paket
              </label>
              <input
                required
                type="text"
                aria-label="Nama paket"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Contoh: Tryout SKD CPNS 2026 #9"
                className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Deskripsi singkat
              </label>
              <textarea
                required
                rows={3}
                aria-label="Deskripsi singkat"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Jelaskan cakupan latihan dan target peserta…"
                className="w-full rounded-xl border border-control-line bg-canvas p-3 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Kategori
                </label>
                <select
                  aria-label="Kategori"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="Mix">Mix (SKD Lengkap)</option>
                  <option value="TWK">TWK</option>
                  <option value="TIU">TIU</option>
                  <option value="TKP">TKP</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Harga nominal (opsional, Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  aria-label="Harga nominal"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink tabular-nums focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <AdminSwitch
              checked={formData.is_premium}
              onChange={(checked) =>
                setFormData({ ...formData, is_premium: checked })
              }
              label="Khusus Paket Pro"
              description="Aktifkan agar paket hanya dapat dibuka oleh peserta dengan Paket Pro aktif."
            />

            <AdminSwitch
              checked={formData.is_weekly}
              onChange={(checked) =>
                setFormData({ ...formData, is_weekly: checked })
              }
              tone="warning"
              label="Tryout Mingguan terjadwal"
              description="Batasi pengerjaan ke rentang waktu tertentu dan satu kali percobaan."
            />

            {formData.is_weekly && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Waktu mulai
                  </label>
                  <input
                    type="datetime-local"
                    aria-label="Waktu mulai"
                    value={formData.start_at}
                    onChange={(e) =>
                      setFormData({ ...formData, start_at: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Waktu berakhir
                  </label>
                  <input
                    type="datetime-local"
                    aria-label="Waktu berakhir"
                    value={formData.end_at}
                    onChange={(e) =>
                      setFormData({ ...formData, end_at: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-xs text-ink"
                  />
                </div>
              </div>
            )}

            {selectedPackage ? (
              <AdminSwitch
                checked={formData.is_published}
                onChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
                tone="success"
                label="Status tayang (Published)"
                description="Matikan sementara ke Draft bila ingin mengedit atau mengimpor ulang soal."
              />
            ) : (
              <p className="rounded-xl border border-accent-border bg-accent-soft px-3.5 py-2.5 text-xs text-accent">
                Paket baru disimpan sebagai <strong>Draft</strong>. Setelah soal
                lengkap (110 soal), gunakan tombol{" "}
                <strong>Validasi &amp; Terbitkan</strong>.
              </p>
            )}
          </form>
        </AdminDialog>
      )}

      {/* Copy Package Modal */}
      {copyTarget && (
        <AdminDialog
          label="Salin paket ujian"
          title="Salin paket ke draft baru"
          subtitle={`Semua ${copyTarget.question_count} soal dan pembahasan dari "${copyTarget.title}" akan ikut disalin.`}
          size="sm"
          onClose={() => !copyLoading && setCopyTarget(null)}
          footer={
            <>
              <button
                type="button"
                disabled={copyLoading}
                onClick={() => setCopyTarget(null)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Batal
              </button>
              <button
                type="submit"
                form="admin-copy-package-form"
                disabled={copyLoading}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {copyLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salin paket
              </button>
            </>
          }
        >
          <form
            id="admin-copy-package-form"
            onSubmit={handleCopyPackage}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Judul paket salinan
              </label>
              <input
                required
                type="text"
                value={copyTitle}
                onChange={(e) => setCopyTitle(e.target.value)}
                className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <AdminSwitch
              checked={copyWeekly}
              onChange={setCopyWeekly}
              tone="warning"
              label="Jadikan Tryout Mingguan"
              description="Aktifkan jika salinan ini memiliki jadwal mulai & berakhir."
            />

            {copyWeekly && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Waktu mulai
                  </label>
                  <input
                    type="datetime-local"
                    value={copyStart}
                    onChange={(e) => setCopyStart(e.target.value)}
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Waktu berakhir
                  </label>
                  <input
                    type="datetime-local"
                    value={copyEnd}
                    onChange={(e) => setCopyEnd(e.target.value)}
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-xs text-ink"
                  />
                </div>
              </div>
            )}
          </form>
        </AdminDialog>
      )}

      {/* Validation & Publish Modal */}
      {validation && (
        <AdminDialog
          label="Validasi publikasi paket"
          title={`Validasi: ${validation.title}`}
          subtitle="Pemeriksaan kelengkapan 110 soal BKN (30 TWK, 35 TIU, 45 TKP) sebelum revisi diterbitkan."
          size="md"
          onClose={() => !publishing && setValidation(null)}
          footer={
            <>
              <Link
                href={`/admin/questions?package_id=${validation.id}`}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-hover mr-auto"
              >
                Buka bank soal
              </Link>
              <button
                type="button"
                disabled={publishing}
                onClick={() => setValidation(null)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={!validation.valid || publishing}
                onClick={() => void handlePublishValidated()}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-45"
              >
                {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                {publishing ? "Menerbitkan…" : "Terbitkan revisi"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Validasi struktur memastikan format dan kunci skor konsisten, dan
              penerbitan membekukan revisi immutable tanpa mengubah sesi ujian
              peserta yang sedang berjalan.
            </p>
            {validation.errors.length > 0 ? (
              <div className="rounded-xl border border-danger-solid/30 bg-danger-soft p-4">
                <p className="text-xs font-semibold text-danger mb-2">
                  Ditemukan {validation.errors.length} catatan yang perlu
                  diperbaiki:
                </p>
                <ul className="space-y-1.5 text-xs text-danger list-disc pl-4 max-h-60 overflow-y-auto">
                  {validation.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">
                    Struktur paket siap diterbitkan
                  </p>
                  <p className="text-xs mt-0.5">
                    Total {validation.question_count ?? 110} soal lengkap dengan
                    opsi A–E, bobot skor valid, dan pembahasan terisi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </AdminDialog>
      )}

      {/* Archive Confirmation */}
      <ConfirmModal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void handleArchive()}
        title="Arsipkan paket ujian?"
        description={`Paket "${archiveTarget?.title}" akan disembunyikan dari katalog peserta. Riwayat pengerjaan dan nilai peserta tetap tersimpan aman dan paket dapat dipulihkan kapan saja.`}
        confirmText="Arsipkan paket"
        variant="danger"
        loading={formLoading}
      />
    </div>
  );
}

export default function PackagesAdmin() {
  return (
    <Suspense fallback={<Loading label="Memuat paket ujian…" />}>
      <PackagesAdminContent />
    </Suspense>
  );
}
