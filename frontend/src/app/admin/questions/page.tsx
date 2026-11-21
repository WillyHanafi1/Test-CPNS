"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
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
import { useQuestions } from "@/hooks/useQuestions";
import { API_URL, api } from "@/lib/api";
import type {
  AdminPackage,
  AdminPackageList,
  AdminQuestion,
  AdminQuestionOption,
  PackageValidationResult,
} from "@/types/admin";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5MB (matches backend admin_import.py)

interface QuestionDraft {
  id?: string;
  package_id: string;
  content: string;
  segment: string;
  sub_category: string;
  number: number;
  image_url: string;
  discussion: string;
  options: AdminQuestionOption[];
}

function makeEmptyOptions(segment: string): AdminQuestionOption[] {
  return ["A", "B", "C", "D", "E"].map((label, idx) => ({
    label,
    content: "",
    image_url: "",
    score: segment === "TKP" ? 5 - idx : idx === 0 ? 5 : 0,
  }));
}

function summarizeOptions(q: AdminQuestion): {
  label: string;
  valid: boolean;
} {
  const opts = q.options ?? [];
  if (opts.length < 5) {
    return { label: `${opts.length}/5 opsi`, valid: false };
  }
  if (q.segment === "TKP") {
    const scores = opts.map((o) => o.score);
    const hasMin = Math.min(...scores) >= 1;
    const hasMax = Math.max(...scores) === 5;
    return {
      label: hasMin && hasMax ? "Skor TKP 1–5" : "Bobot TKP tidak lengkap",
      valid: hasMin && hasMax,
    };
  }
  const best = opts.filter((o) => o.score === 5);
  if (best.length === 1) {
    return { label: `Kunci ${best[0].label} (5)`, valid: true };
  }
  if (best.length === 0) {
    return { label: "Belum ada kunci", valid: false };
  }
  return { label: `${best.length} kunci ganda`, valid: false };
}

function QuestionsAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    questions,
    loading,
    error,
    total,
    page,
    pageSize,
    setPage,
    search,
    setSearch,
    selectedPackage,
    setSelectedPackage,
    segment,
    setSegment,
    missingDiscussion,
    setMissingDiscussion,
    selectedIds,
    setSelectedIds,
    fetchQuestions,
    deleteQuestion,
    bulkDeleteQuestions,
    toggleSelect,
    toggleSelectAll,
    resetFilters,
  } = useQuestions({
    initialPackageId: searchParams.get("package_id") ?? "",
    initialSegment: searchParams.get("segment") ?? "",
    initialSearch: searchParams.get("search") ?? "",
    initialMissingDiscussion: searchParams.get("missing_discussion") === "true",
    pageSize: 15,
  });

  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [statusSwitching, setStatusSwitching] = useState(false);

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDragActive, setImportDragActive] = useState(false);
  const [importPackageId, setImportPackageId] = useState("");
  const [importReplace, setImportReplace] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Editor Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mobileEditorTab, setMobileEditorTab] = useState<"edit" | "preview">(
    "edit",
  );
  const [showOptionImages, setShowOptionImages] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft>({
    package_id: "",
    content: "",
    segment: "TWK",
    sub_category: "",
    number: 1,
    image_url: "",
    discussion: "",
    options: makeEmptyOptions("TWK"),
  });
  const [formLoading, setFormLoading] = useState(false);

  // Validation & delete confirmations
  const [validation, setValidation] = useState<
    (PackageValidationResult & { id: string; title: string }) | null
  >(null);
  const [publishing, setPublishing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AdminQuestion | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPackages = useCallback(async () => {
    try {
      const data = await api<AdminPackageList>("/admin/packages?size=100");
      setPackages(data.items ?? []);
    } catch {
      /* Package list error is surfaced if dropdown fails */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPackages();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPackages]);

  const activePackage = useMemo(
    () => packages.find((p) => p.id === selectedPackage) ?? null,
    [packages, selectedPackage],
  );

  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `/admin/questions?${qs}` : "/admin/questions", {
      scroll: false,
    });
  };

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackage(pkgId);
    updateUrlParam("package_id", pkgId);
  };

  const handleSelectSegment = (seg: string) => {
    setSegment(seg);
    updateUrlParam("segment", seg);
  };

  const openCreateDrawer = () => {
    const nextNumber =
      questions.length > 0
        ? Math.max(...questions.map((q) => q.number)) + 1
        : 1;
    const defaultSeg = segment || "TWK";
    setIsEditing(false);
    setMobileEditorTab("edit");
    setShowOptionImages(false);
    setDraft({
      package_id: selectedPackage || packages[0]?.id || "",
      content: "",
      segment: defaultSeg,
      sub_category: "",
      number: nextNumber,
      image_url: "",
      discussion: "",
      options: makeEmptyOptions(defaultSeg),
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (q: AdminQuestion) => {
    const sortedOpts = [...(q.options ?? [])].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    const normalizedOpts =
      sortedOpts.length >= 5
        ? sortedOpts.map((o) => ({
            id: o.id,
            label: o.label,
            content: o.content ?? "",
            image_url: o.image_url ?? "",
            score: o.score ?? 0,
          }))
        : makeEmptyOptions(q.segment);
    setIsEditing(true);
    setMobileEditorTab("edit");
    setShowOptionImages(normalizedOpts.some((o) => Boolean(o.image_url)));
    setDraft({
      id: q.id,
      package_id: q.package_id,
      content: q.content ?? "",
      segment: q.segment,
      sub_category: q.sub_category ?? "",
      number: q.number,
      image_url: q.image_url ?? "",
      discussion: q.discussion ?? "",
      options: normalizedOpts,
    });
    setIsDrawerOpen(true);
  };

  const handleScoreChange = (index: number, value: number) => {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        prev.segment === "TKP"
          ? i === index
            ? { ...opt, score: value }
            : opt
          : { ...opt, score: i === index ? 5 : 0 },
      ),
    }));
  };

  const handleSaveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEditing && !draft.package_id) {
      toast.error("Pilih paket ujian tujuan terlebih dahulu.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        ...(isEditing ? {} : { package_id: draft.package_id }),
        content: draft.content.trim(),
        segment: draft.segment,
        sub_category: draft.sub_category.trim() || null,
        number: Number(draft.number) || 1,
        image_url: draft.image_url.trim() || null,
        discussion: draft.discussion.trim() || null,
        options: draft.options.map((opt) => ({
          id: opt.id || undefined,
          label: opt.label,
          content: opt.content,
          image_url: opt.image_url?.trim() || null,
          score: Number(opt.score) || 0,
        })),
      };

      await api(
        isEditing ? `/admin/questions/${draft.id}` : "/admin/questions",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(
        isEditing ? "Soal berhasil diperbarui." : "Soal baru berhasil disimpan.",
      );
      setIsDrawerOpen(false);
      await Promise.all([fetchQuestions(), loadPackages()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan soal.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSetPackageDraft = async (pkg: AdminPackage) => {
    setStatusSwitching(true);
    try {
      await api(`/admin/packages/${pkg.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_published: false }),
      });
      toast.success(`"${pkg.title}" diubah ke Draft. Soal kini bisa diedit.`);
      await loadPackages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status paket.",
      );
    } finally {
      setStatusSwitching(false);
    }
  };

  const handleCopyActivePackage = async (pkg: AdminPackage) => {
    setStatusSwitching(true);
    try {
      const copied = await api<AdminPackage>(`/admin/packages/${pkg.id}/copy`, {
        method: "POST",
        body: JSON.stringify({ title: `${pkg.title} (Revisi Draft)` }),
      });
      toast.success(`Salinan draft "${copied.title}" dibuat.`);
      await loadPackages();
      handleSelectPackage(copied.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyalin paket.");
    } finally {
      setStatusSwitching(false);
    }
  };

  const handleValidateActivePackage = async (pkg: AdminPackage) => {
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
      toast.success("Paket berhasil diterbitkan.");
      setValidation(null);
      await loadPackages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Penerbitan paket gagal.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const pickImportFile = (file: File | null) => {
    if (!file) {
      setImportFile(null);
      return;
    }
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".xlsx") &&
      !lower.endsWith(".xls") &&
      !lower.endsWith(".csv")
    ) {
      toast.error("Format file harus .xlsx, .xls, atau .csv.");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("Ukuran file melebihi batas maksimal 5MB.");
      return;
    }
    setImportFile(file);
    setImportErrors([]);
  };

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!importFile || !importPackageId) return;

    setImportLoading(true);
    setImportErrors([]);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/import/questions?package_id=${importPackageId}&replace=${importReplace}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string | { message?: string; errors?: string[] };
      };

      if (response.ok) {
        toast.success(data.message || "Soal berhasil diimpor.");
        setIsImportOpen(false);
        setImportFile(null);
        setImportReplace(false);
        await Promise.all([fetchQuestions(), loadPackages()]);
      } else if (
        data.detail &&
        typeof data.detail === "object" &&
        Array.isArray(data.detail.errors)
      ) {
        setImportErrors(data.detail.errors);
        toast.error(data.detail.message || "Validasi file gagal.");
      } else {
        toast.error(
          typeof data.detail === "string" ? data.detail : "Import gagal.",
        );
      }
    } catch {
      toast.error("Gagal menghubungi server saat import.");
    } finally {
      setImportLoading(false);
    }
  };

  const columns: Column<AdminQuestion>[] = [
    {
      header: "No.",
      className: "w-16 tabular-nums font-semibold text-muted",
      render: (q) => `#${q.number}`,
    },
    {
      header: "Segmen & Materi",
      className: "min-w-[160px]",
      render: (q) => (
        <div className="flex flex-col items-start gap-1">
          <AdminBadge
            tone={
              q.segment === "TKP"
                ? "warning"
                : q.segment === "TIU"
                  ? "accent"
                  : "neutral"
            }
          >
            {q.segment}
          </AdminBadge>
          <span className="text-xs text-muted truncate max-w-[160px]">
            {q.sub_category || "Tanpa sub-materi"}
          </span>
        </div>
      ),
    },
    {
      header: "Pertanyaan",
      className: "min-w-[280px] max-w-md",
      render: (q) => (
        <div className="space-y-1">
          <div className="text-sm text-ink line-clamp-2 leading-relaxed">
            <MarkdownRenderer>{q.content ?? ""}</MarkdownRenderer>
          </div>
          {q.image_url && (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-subtle px-2 py-0.5 text-xs text-muted">
              <ImageIcon className="h-3 w-3" />
              Memiliki gambar
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Kunci & Kelengkapan",
      className: "min-w-[175px]",
      render: (q) => {
        const summary = summarizeOptions(q);
        const hasDiscussion = Boolean(q.discussion && q.discussion.trim());
        return (
          <div className="flex flex-col items-start gap-1">
            <AdminBadge tone={summary.valid ? "success" : "danger"}>
              {summary.label}
            </AdminBadge>
            <span
              className={`text-xs ${hasDiscussion ? "text-muted" : "font-medium text-warning"}`}
            >
              {hasDiscussion ? "Pembahasan terisi" : "Pembahasan kosong"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap",
      render: (q) => (
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Ubah soal ${q.number}`}
            title="Edit soal & live preview"
            onClick={() => openEditDrawer(q)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            aria-label={`Hapus soal ${q.number}`}
            title="Hapus soal"
            onClick={() => setItemToDelete(q)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(
    search || selectedPackage || segment || missingDiscussion,
  );

  const previewBestScore = Math.max(
    0,
    ...draft.options.map((o) => Number(o.score) || 0),
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Konten Ujian"
        title="Bank soal"
        subtitle={`Menampilkan ${total} soal${activePackage ? ` pada paket "${activePackage.title}"` : " dari seluruh paket"}.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setImportPackageId(selectedPackage || "");
                setImportErrors([]);
                setIsImportOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-hover"
            >
              <Upload className="h-4 w-4" />
              Import Excel / CSV
            </button>
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Tambah soal
            </button>
          </>
        }
      />

      {/* Active Package Context Banner */}
      {activePackage && (
        <section className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink truncate">
                {activePackage.title}
              </h2>
              {activePackage.is_published ? (
                <AdminBadge tone="success" dot>
                  Published (Terkunci)
                </AdminBadge>
              ) : (
                <AdminBadge tone="accent" dot>
                  Draft (Bisa diedit)
                </AdminBadge>
              )}
            </div>
            <p className="text-xs text-muted tabular-nums">
              Komposisi SKD: <strong>{activePackage.question_count}/110</strong>{" "}
              · TWK {activePackage.twk_count ?? 0}/30 · TIU{" "}
              {activePackage.tiu_count ?? 0}/35 · TKP{" "}
              {activePackage.tkp_count ?? 0}/45
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activePackage.is_published ? (
              <>
                <button
                  type="button"
                  disabled={statusSwitching}
                  onClick={() => void handleSetPackageDraft(activePackage)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover disabled:opacity-50"
                >
                  <Unlock className="h-3.5 w-3.5 text-warning" />
                  Jadikan Draft
                </button>
                <button
                  type="button"
                  disabled={statusSwitching}
                  onClick={() => void handleCopyActivePackage(activePackage)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-border bg-accent-soft px-3 text-xs font-semibold text-accent hover:opacity-90 disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin ke Draft Baru
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleValidateActivePackage(activePackage)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-solid px-3.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Validasi &amp; Terbitkan
              </button>
            )}
          </div>
        </section>
      )}

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari teks pertanyaan atau sub-materi…"
        hasActiveFilters={hasFilters}
        onResetFilters={() => {
          resetFilters();
          router.replace("/admin/questions", { scroll: false });
        }}
      >
        <select
          aria-label="Filter paket soal"
          value={selectedPackage}
          onChange={(e) => handleSelectPackage(e.target.value)}
          className="h-10 max-w-[260px] rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua paket</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.question_count})
            </option>
          ))}
        </select>

        <div
          className="inline-flex items-center rounded-xl border border-line bg-surface-subtle p-1"
          role="group"
          aria-label="Filter segmen soal"
        >
          {[
            ["", "Semua"],
            ["TWK", "TWK"],
            ["TIU", "TIU"],
            ["TKP", "TKP"],
          ].map(([val, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSelectSegment(val)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                segment === val
                  ? "bg-surface text-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !missingDiscussion;
            setMissingDiscussion(next);
            updateUrlParam("missing_discussion", next ? "true" : "");
          }}
          className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
            missingDiscussion
              ? "border-warning-solid/40 bg-warning-soft text-warning"
              : "border-line bg-canvas text-muted hover:text-ink"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Pembahasan kosong
        </button>
      </AdminFilterBar>

      {error ? (
        <ErrorPanel message={error} retry={() => void fetchQuestions()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={questions}
          loading={loading}
          emptyIcon={<BookOpen className="h-6 w-6" />}
          emptyText="Belum ada soal ditemukan"
          emptyHint="Pilih paket lain, reset filter, atau tambah/import soal baru."
          selectedIds={selectedIds}
          onSelectToggle={toggleSelect}
          onSelectAll={toggleSelectAll}
        />
      )}

      <AdminPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Floating Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-lg">
            <span className="inline-flex items-center gap-2 border-r border-line pr-3 text-xs font-semibold text-ink">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-accent-solid px-1.5 text-white tabular-nums">
                {selectedIds.size}
              </span>
              soal dipilih
            </span>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-danger-soft px-3 text-xs font-semibold text-danger hover:opacity-90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus massal
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Split-Pane Question Editor Drawer */}
      {isDrawerOpen && (
        <AdminDialog
          variant="drawer"
          size="xl"
          label="Editor soal CAT"
          title={isEditing ? `Edit Soal #${draft.number}` : "Tambah soal baru"}
          subtitle="Mendukung Markdown dan rumus matematika KaTeX ($x^2$, $$\\frac{a}{b}$$)."
          onClose={() => !formLoading && setIsDrawerOpen(false)}
          footer={
            <>
              <button
                type="button"
                disabled={formLoading}
                onClick={() => setIsDrawerOpen(false)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Batal
              </button>
              <button
                type="submit"
                form="admin-question-editor-form"
                disabled={formLoading}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Simpan soal
              </button>
            </>
          }
        >
          {/* Mobile Tab Switcher */}
          <div className="mb-4 flex items-center gap-1 rounded-xl border border-line bg-surface-subtle p-1 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileEditorTab("edit")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                mobileEditorTab === "edit"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-muted"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setMobileEditorTab("preview")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold ${
                mobileEditorTab === "preview"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-muted"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview peserta
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Form Editor */}
            <form
              id="admin-question-editor-form"
              onSubmit={handleSaveQuestion}
              className={`space-y-4 lg:col-span-7 ${
                mobileEditorTab === "preview" ? "hidden lg:block" : ""
              }`}
            >
              {!isEditing && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Paket ujian tujuan
                  </label>
                  <select
                    required
                    aria-label="Paket ujian tujuan"
                    value={draft.package_id}
                    onChange={(e) =>
                      setDraft({ ...draft, package_id: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="">Pilih paket…</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.is_published ? "(Published)" : "(Draft)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Segmen
                  </label>
                  <select
                    aria-label="Segmen"
                    value={draft.segment}
                    onChange={(e) => {
                      const nextSeg = e.target.value;
                      setDraft((prev) => ({
                        ...prev,
                        segment: nextSeg,
                        options:
                          nextSeg === "TKP"
                            ? prev.options.map((o, idx) => ({
                                ...o,
                                score: o.score >= 1 && o.score <= 5 ? o.score : 5 - idx,
                              }))
                            : prev.options.map((o, idx) => ({
                                ...o,
                                score:
                                  prev.options.some((x) => x.score === 5)
                                    ? o.score === 5
                                      ? 5
                                      : 0
                                    : idx === 0
                                      ? 5
                                      : 0,
                              })),
                      }));
                    }}
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="TWK">TWK</option>
                    <option value="TIU">TIU</option>
                    <option value="TKP">TKP</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Nomor soal
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    aria-label="Nomor soal"
                    value={draft.number}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        number: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink tabular-nums focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Sub-materi (analitik)
                  </label>
                  <input
                    type="text"
                    aria-label="Sub-materi"
                    value={draft.sub_category}
                    onChange={(e) =>
                      setDraft({ ...draft, sub_category: e.target.value })
                    }
                    placeholder="Mis. Silogisme / Pancasila"
                    className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Teks pertanyaan
                </label>
                <textarea
                  required
                  rows={5}
                  aria-label="Teks pertanyaan"
                  value={draft.content}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                  placeholder="Tulis narasi soal… Gunakan $...$ untuk rumus matematika."
                  className="w-full rounded-xl border border-control-line bg-canvas p-3 text-sm text-ink leading-relaxed focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  URL gambar soal (opsional, mis. soal figural)
                </label>
                <input
                  type="url"
                  aria-label="URL gambar soal"
                  value={draft.image_url}
                  onChange={(e) =>
                    setDraft({ ...draft, image_url: e.target.value })
                  }
                  placeholder="https://.../exam-assets/figural/..."
                  className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-ink">
                    Opsi jawaban &amp; bobot skor ({draft.segment})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOptionImages((prev) => !prev)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {showOptionImages
                      ? "Sembunyikan URL gambar opsi"
                      : "+ URL gambar opsi (figural)"}
                  </button>
                </div>

                <div className="space-y-2">
                  {draft.options.map((opt, index) => (
                    <div
                      key={opt.label}
                      className="rounded-xl border border-line bg-surface-subtle/40 p-2.5 space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-xs font-semibold text-ink">
                          {opt.label}
                        </span>
                        <textarea
                          rows={2}
                          aria-label={`Isi opsi ${opt.label}`}
                          value={opt.content}
                          onChange={(e) => {
                            const next = [...draft.options];
                            next[index] = {
                              ...next[index],
                              content: e.target.value,
                            };
                            setDraft({ ...draft, options: next });
                          }}
                          placeholder={`Teks opsi ${opt.label}…`}
                          className="flex-1 rounded-lg border border-control-line bg-canvas p-2 text-sm text-ink focus:border-accent focus:outline-none"
                        />
                        {draft.segment === "TKP" ? (
                          <select
                            aria-label={`Skor opsi ${opt.label}`}
                            value={opt.score}
                            onChange={(e) =>
                              handleScoreChange(
                                index,
                                parseInt(e.target.value, 10),
                              )
                            }
                            className="h-9 w-24 shrink-0 rounded-lg border border-control-line bg-canvas px-2 text-xs font-semibold text-ink"
                          >
                            {[5, 4, 3, 2, 1].map((v) => (
                              <option key={v} value={v}>
                                {v} poin
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleScoreChange(index, 5)}
                            aria-label={`Tandai opsi ${opt.label} sebagai jawaban benar`}
                            title="Tandai sebagai kunci jawaban (5 poin)"
                            className={`mt-0.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                              opt.score === 5
                                ? "border-accent-border bg-accent-solid text-white"
                                : "border-line bg-surface text-muted hover:text-ink"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {opt.score === 5 ? "Benar" : "Set"}
                          </button>
                        )}
                      </div>
                      {showOptionImages && (
                        <input
                          type="url"
                          aria-label={`URL gambar opsi ${opt.label}`}
                          value={opt.image_url ?? ""}
                          onChange={(e) => {
                            const next = [...draft.options];
                            next[index] = {
                              ...next[index],
                              image_url: e.target.value,
                            };
                            setDraft({ ...draft, options: next });
                          }}
                          placeholder={`URL gambar opsi ${opt.label} (opsional)`}
                          className="h-8 w-full rounded-lg border border-control-line bg-canvas px-2.5 text-xs text-ink"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Pembahasan
                </label>
                <textarea
                  rows={4}
                  aria-label="Pembahasan"
                  value={draft.discussion}
                  onChange={(e) =>
                    setDraft({ ...draft, discussion: e.target.value })
                  }
                  placeholder="Jelaskan langkah penyelesaian dan alasan jawaban paling tepat…"
                  className="w-full rounded-xl border border-control-line bg-canvas p-3 text-sm text-ink leading-relaxed focus:border-accent focus:outline-none"
                />
              </div>
            </form>

            {/* Right: Live Participant Preview */}
            <aside
              aria-label="Preview tampilan peserta"
              className={`lg:col-span-5 ${
                mobileEditorTab === "edit" ? "hidden lg:block" : ""
              }`}
            >
              <div className="sticky top-0 rounded-2xl border border-accent-border bg-canvas p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold text-ink">
                      Preview tampilan peserta
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AdminBadge tone="accent">{draft.segment}</AdminBadge>
                    <span className="text-xs text-muted tabular-nums">
                      No. {draft.number}
                    </span>
                  </div>
                </div>

                {draft.sub_category && (
                  <p className="text-xs text-muted">
                    Materi: <strong className="text-ink">{draft.sub_category}</strong>
                  </p>
                )}

                <div className="text-sm text-ink leading-relaxed">
                  {draft.content.trim() ? (
                    <MarkdownRenderer>{draft.content}</MarkdownRenderer>
                  ) : (
                    <p className="text-muted italic">
                      Teks pertanyaan akan muncul di sini secara langsung…
                    </p>
                  )}
                </div>

                {draft.image_url.trim() && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={draft.image_url}
                    alt="Preview gambar soal"
                    className="diagram-image max-h-56 w-auto mx-auto"
                  />
                )}

                <div className="space-y-2">
                  {draft.options.map((opt) => {
                    const isBest =
                      previewBestScore > 0 && opt.score === previewBestScore;
                    return (
                      <div
                        key={opt.label}
                        className={`rounded-xl border px-3 py-2.5 text-sm ${
                          isBest
                            ? "border-success bg-success-soft/70"
                            : "border-line bg-surface"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                                isBest
                                  ? "bg-success text-white"
                                  : "bg-surface-hover text-ink"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <div className="min-w-0 text-ink">
                              {opt.content.trim() ? (
                                <MarkdownRenderer>{opt.content}</MarkdownRenderer>
                              ) : (
                                <span className="text-xs text-muted italic">
                                  Opsi {opt.label} kosong
                                </span>
                              )}
                              {opt.image_url?.trim() && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={opt.image_url}
                                  alt={`Preview opsi ${opt.label}`}
                                  className="diagram-image mt-2 max-h-28 w-auto"
                                />
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
                            {opt.score} pt
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-line bg-surface p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-accent">
                    Pembahasan
                  </p>
                  <div className="text-xs text-ink leading-relaxed">
                    {draft.discussion.trim() ? (
                      <MarkdownRenderer>{draft.discussion}</MarkdownRenderer>
                    ) : (
                      <p className="text-muted italic">
                        Pembahasan belum diisi (wajib dilengkapi sebelum
                        publikasi).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </AdminDialog>
      )}

      {/* Staged Bulk Import Modal */}
      {isImportOpen && (
        <AdminDialog
          label="Import soal Excel atau CSV"
          title="Import massal soal (Excel / CSV)"
          subtitle="Validasi header dan baris dijalankan otomatis sebelum data disimpan ke paket draft."
          size="md"
          onClose={() => !importLoading && setIsImportOpen(false)}
          footer={
            <>
              <button
                type="button"
                disabled={importLoading}
                onClick={() => {
                  setIsImportOpen(false);
                  setImportReplace(false);
                }}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Batal
              </button>
              <button
                type="submit"
                form="admin-import-questions-form"
                disabled={importLoading || !importFile || !importPackageId}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-45"
              >
                {importLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {importLoading ? "Mengimpor…" : "Mulai import"}
              </button>
            </>
          }
        >
          <form
            id="admin-import-questions-form"
            onSubmit={handleImport}
            className="space-y-4"
          >
            {importErrors.length > 0 && (
              <div className="rounded-xl border border-danger-solid/30 bg-danger-soft p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-danger">
                    Ditemukan {importErrors.length} kesalahan validasi baris:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        importErrors.join("\n"),
                      );
                      toast.success("Daftar error disalin.");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    Salin error
                  </button>
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-danger list-disc pl-4">
                  {importErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-subtle/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink">
                  Format kolom wajib
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  <code>No</code>, <code>Segmen</code> (TWK/TIU/TKP),{" "}
                  <code>Teks Soal</code>, <code>Opsi A–E</code>,{" "}
                  <code>Nilai A–E</code>. Opsional: <code>Materi</code>,{" "}
                  <code>Pembahasan</code>, <code>URL Gambar Soal</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  window.open("/template_soal_cpns.xlsx", "_blank")
                }
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-accent-border bg-accent-soft px-3 text-xs font-semibold text-accent hover:opacity-90"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Unduh template
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Pilih paket tujuan (harus berstatus Draft)
              </label>
              <select
                required
                aria-label="Pilih paket tujuan"
                value={importPackageId}
                onChange={(e) => setImportPackageId(e.target.value)}
                className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="">Pilih paket…</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.is_published ? "Published (kunci)" : "Draft"}{" "}
                    ({p.question_count} soal)
                  </option>
                ))}
              </select>
              {packages.find((p) => p.id === importPackageId)?.is_published && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-warning">
                  <Lock className="h-3.5 w-3.5" />
                  Paket ini masih Published. Ubah ke Draft terlebih dahulu agar
                  import diizinkan.
                </p>
              )}
            </div>

            <AdminSwitch
              checked={importReplace}
              onChange={setImportReplace}
              tone="warning"
              label="Timpa seluruh soal draft di paket ini"
              description="Mengganti soal dan opsi draft saat ini dengan isi file baru. Sesi ujian peserta yang sudah berjalan atau selesai tetap aman pada revisi sebelumnya."
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                File soal (.xlsx, .xls, atau .csv — maks. 5MB)
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setImportDragActive(true);
                }}
                onDragLeave={() => setImportDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportDragActive(false);
                  const dropped = e.dataTransfer.files?.[0] ?? null;
                  pickImportFile(dropped);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                  importDragActive || importFile
                    ? "border-accent bg-accent-soft/40"
                    : "border-line bg-canvas hover:border-control-line"
                }`}
              >
                <input
                  id="admin-question-file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => pickImportFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="admin-question-file-upload"
                  className="flex cursor-pointer flex-col items-center gap-2"
                >
                  <Upload
                    className={`h-7 w-7 ${importFile ? "text-accent" : "text-muted"}`}
                  />
                  <span className="text-sm font-semibold text-ink">
                    {importFile
                      ? importFile.name
                      : "Pilih file atau seret (drag & drop) ke sini"}
                  </span>
                  <span className="text-xs text-muted">
                    {importFile
                      ? `${(importFile.size / 1024).toFixed(1)} KB`
                      : "Ukuran maksimal 5MB"}
                  </span>
                </label>
              </div>
            </div>
          </form>
        </AdminDialog>
      )}

      {/* Package Validation Modal */}
      {validation && (
        <AdminDialog
          label="Validasi publikasi paket"
          title={`Validasi: ${validation.title}`}
          size="md"
          onClose={() => !publishing && setValidation(null)}
          footer={
            <>
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
                Terbitkan revisi
              </button>
            </>
          }
        >
          {validation.errors.length > 0 ? (
            <div className="rounded-xl border border-danger-solid/30 bg-danger-soft p-4">
              <p className="text-xs font-semibold text-danger mb-2">
                {validation.errors.length} catatan sebelum publikasi:
              </p>
              <ul className="space-y-1 text-xs text-danger list-disc pl-4 max-h-60 overflow-y-auto">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                Semua 110 soal valid dan siap diterbitkan ke katalog peserta.
              </p>
            </div>
          )}
        </AdminDialog>
      )}

      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={async () => {
          if (!itemToDelete) return;
          setDeleteLoading(true);
          await deleteQuestion(itemToDelete.id);
          setDeleteLoading(false);
          setItemToDelete(null);
          await loadPackages();
        }}
        title="Hapus soal?"
        description={`Soal #${itemToDelete?.number} akan dihapus permanen dari draft paket ini.`}
        confirmText="Hapus soal"
        loading={deleteLoading}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={async () => {
          setDeleteLoading(true);
          await bulkDeleteQuestions();
          setDeleteLoading(false);
          setBulkDeleteOpen(false);
          await loadPackages();
        }}
        title="Hapus massal soal?"
        description={`Yakin ingin menghapus ${selectedIds.size} soal terpilih sekaligus dari draft paket?`}
        confirmText="Hapus semua"
        loading={deleteLoading}
      />
    </div>
  );
}

export default function QuestionsAdmin() {
  return (
    <Suspense fallback={<Loading label="Memuat bank soal…" />}>
      <QuestionsAdminContent />
    </Suspense>
  );
}
