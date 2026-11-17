"use client";
import AdminDialog from "@/components/admin/AdminDialog";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import {
  Plus,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit,
  BookOpen,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AdminPageHeader,
  AdminDataTable,
  AdminPagination,
  ConfirmModal,
  Column,
} from "@/components/admin";
import { useQuestions } from "@/hooks/useQuestions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function QuestionsAdmin() {
  const {
    questions,
    loading,
    total,
    page,
    setPage,
    search,
    setSearch,
    selectedPackage,
    setSelectedPackage,
    selectedIds,
    setSelectedIds,
    fetchQuestions,
    deleteQuestion,
    bulkDeleteQuestions,
    toggleSelect,
    toggleSelectAll,
  } = useQuestions();

  const [packages, setPackages] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPackageId, setImportPackageId] = useState("");
  const [importReplace, setImportReplace] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>({
    content: "",
    segment: "TWK",
    number: 1,
    image_url: "",
    discussion: "",
    options: [
      { label: "A", content: "", score: 0 },
      { label: "B", content: "", score: 0 },
      { label: "C", content: "", score: 0 },
      { label: "D", content: "", score: 0 },
      { label: "E", content: "", score: 0 },
    ],
  });

  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      // Peningkatan limit (size=100) agar semua paket muncul di dropdown admin
      const response = await fetch(
        `${API_URL}/api/v1/admin/packages?size=100`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      const data = await response.json();

      // FIX: Backend mengirimkan { items: [], total: x, ... }, bukan Array langsung
      if (data && data.items && Array.isArray(data.items)) {
        setPackages(data.items);
      } else {
        setPackages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Fetch packages error:", error);
    }
  };

  const handleDelete = async (questionId: string) => {
    await deleteQuestion(questionId);
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteQuestions();
    setBulkDeleteConfirmOpen(false);
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const isNew = !isEditing;
      const url = isNew
        ? `${API_URL}/api/v1/admin/questions`
        : `${API_URL}/api/v1/admin/questions/${currentQuestion.id}`;

      const method = isNew ? "POST" : "PUT";

      const payload = {
        ...currentQuestion,
        // Ensure option IDs are present if they exist in the incoming object for Upsert support
        options: currentQuestion.options.map((opt: any) => ({
          id: opt.id || undefined,
          label: opt.label,
          content: opt.content,
          image_url: opt.image_url,
          score: opt.score,
        })),
      };

      if (isNew) payload.package_id = selectedPackage || importPackageId;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Gagal menyimpan soal");
      }

      toast.success(`Soal berhasil ${isNew ? "ditambah" : "diupdate"}`);
      setIsDrawerOpen(false);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleScoreChange = (index: number, value: number) => {
    const updatedOptions = currentQuestion.options.map(
      (opt: any, i: number) => {
        if (currentQuestion.segment === "TKP") {
          return i === index ? { ...opt, score: value } : opt;
        } else {
          return { ...opt, score: i === index ? 5 : 0 };
        }
      },
    );

    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        setIsImportModalOpen(false);
        setImportFile(null);
        fetchQuestions();
      } else {
        // Handle detailed errors from backend refactor
        if (
          data.detail &&
          typeof data.detail === "object" &&
          data.detail.errors
        ) {
          setImportErrors(data.detail.errors);
          toast.error(data.detail.message || "Validasi file gagal");
        } else {
          toast.error(data.detail || "Import gagal");
        }
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setImportLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: "No.",
      accessor: "number",
      className: "w-20",
      render: (q) => (
        <span className="font-semibold text-muted group-hover:text-accent transition-colors">
          {q.number}
        </span>
      ),
    },
    {
      header: "Segment",
      render: (q) => (
        <Badge
          className={`rounded-xl py-1 px-3 font-bold text-xs border-none tracking-wide ${
            q.segment === "TWK"
              ? "bg-accent-soft text-accent"
              : q.segment === "TIU"
                ? "bg-accent-soft text-accent"
                : "bg-warning-soft text-warning"
          }`}
        >
          {q.segment}
        </Badge>
      ),
    },
    {
      header: "Konten Soal",
      className: "max-w-md",
      render: (q) => (
        <div className="text-sm font-medium text-ink line-clamp-2 leading-relaxed overflow-x-auto">
          <MarkdownRenderer>{q.content ?? ""}</MarkdownRenderer>
        </div>
      ),
    },
    {
      header: "Opsi / Jawaban",
      render: (q) => (
        <div className="flex -space-x-2">
          {[1, 2, 3, 4, 5].map((o) => (
            <div
              key={o}
              className="w-7 h-7 rounded-lg bg-surface-hover border border-line flex items-center justify-center text-xs font-semibold text-muted"
            >
              {String.fromCharCode(64 + o)}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "Aksi",
      className: "text-center",
      render: (q) => (
        <div className="flex items-center justify-center space-x-2">
          <Button
            aria-label="Ubah"
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-surface-hover hover:text-ink transition-all"
            onClick={() => {
              setIsEditing(true);
              setCurrentQuestion({ ...q });
              setIsDrawerOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            aria-label="Hapus"
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-danger-soft hover:text-danger transition-all"
            onClick={() => {
              setItemToDelete(q);
              setDeleteConfirmOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-surface-hover"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      <AdminPageHeader
        title="Bank Soal"
        subtitle={`Total ${total} Soal Terdaftar`}
        actions={
          <>
            <Button
              variant="outline"
              className="border-line bg-surface hover:bg-surface-hover hover:text-ink rounded-2xl py-6 px-6 font-bold"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-5 h-5 mr-2" />
              Import Excel
            </Button>
            <Button
              className="bg-accent-solid hover:bg-accent-solid rounded-2xl py-6 px-10 font-bold shadow-sm "
              onClick={() => {
                setIsEditing(false);
                setCurrentQuestion({
                  content: "",
                  segment: "TWK",
                  number:
                    questions.length > 0
                      ? Math.max(...questions.map((q) => q.number)) + 1
                      : 1,
                  image_url: "",
                  discussion: "",
                  options: [
                    { label: "A", content: "", score: 0 },
                    { label: "B", content: "", score: 0 },
                    { label: "C", content: "", score: 0 },
                    { label: "D", content: "", score: 0 },
                    { label: "E", content: "", score: 0 },
                  ],
                });
                setIsDrawerOpen(true);
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Tambah Manual
            </Button>
          </>
        }
      />

      {/* Filters & Search */}
      <Card className="bg-surface border-line rounded-2xl overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" />
              <Input
                placeholder="Cari konten soal..."
                className="pl-12 bg-surface border-line rounded-2xl py-7 font-medium md:text-lg focus:ring-accent-border focus:border-accent-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center min-w-[200px]">
                <Filter className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none pr-10"
                  value={selectedPackage}
                  onChange={(e) => {
                    setSelectedPackage(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua Paket</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable
        columns={columns}
        data={questions}
        loading={loading}
        emptyIcon={<BookOpen className="w-12 h-12 text-muted" />}
        emptyText="Belum ada soal ditemukan"
        selectedIds={selectedIds}
        onSelectToggle={toggleSelect}
        onSelectAll={toggleSelectAll}
      />

      <AdminPagination
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* --- BULK ACTIONS TOOLBAR --- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-surface border border-line rounded-2xl py-4 px-8 shadow-sm flex items-center space-x-6  bg-opacity-90">
            <div className="flex items-center space-x-4 pr-6 border-r border-line">
              <div className="w-8 h-8 bg-accent-solid rounded-xl flex items-center justify-center font-semibold text-xs">
                {selectedIds.size}
              </div>
              <span className="text-sm font-bold text-ink">Soal Terpilih</span>
            </div>
            <Button
              variant="ghost"
              className="text-danger hover:text-danger hover:bg-danger-soft font-bold rounded-xl"
              onClick={() => setBulkDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Massal
            </Button>
            <Button
              variant="ghost"
              className="text-muted hover:text-ink font-bold rounded-xl"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* --- DRAWER EDITOR --- */}
      {isDrawerOpen && (
        <AdminDialog
          label="Formulir soal"
          onClose={() => setIsDrawerOpen(false)}
        >
          <div
            className={`absolute top-0 right-0 h-full w-full max-w-2xl bg-canvas border-l border-line shadow-sm flex flex-col transform transition-transform duration-500 ease-in-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            {/* Drawer Header â€” stays fixed at top */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-line flex-shrink-0">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {isEditing ? "Edit Soal" : "Tambah Soal Baru"}
                </h2>
                <p className="text-xs font-bold text-accent uppercase tracking-wide mt-1">
                  CAT CPNS Engine Editor
                </p>
              </div>
              <Button
                aria-label="Tutup dialog"
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-2xl hover:bg-surface"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-10">
              <form
                id="question-form"
                onSubmit={saveQuestion}
                className="space-y-8"
              >
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                      Segmen / Kategori
                    </label>
                    <select
                      aria-label="Segmen / Kategori"
                      className="w-full bg-surface border border-line rounded-2xl p-4 text-sm font-bold text-ink focus:ring-2 focus:ring-accent-border focus:outline-none appearance-none"
                      value={currentQuestion.segment}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          segment: e.target.value,
                        })
                      }
                    >
                      <option value="TWK">TWK (Wawasan Kebangsaan)</option>
                      <option value="TIU">TIU (Intelegensia Umum)</option>
                      <option value="TKP">TKP (Karakteristik Pribadi)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                      Nomor Soal
                    </label>
                    <Input
                      aria-label="Nomor Soal"
                      type="number"
                      value={currentQuestion.number}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          number: parseInt(e.target.value),
                        })
                      }
                      className="bg-surface border-line p-7 rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Konten Pertanyaan
                  </label>
                  <textarea
                    aria-label="Konten Pertanyaan"
                    className="w-full h-40 bg-surface border border-line rounded-2xl p-6 text-sm font-medium text-ink focus:ring-2 focus:ring-accent-border focus:outline-none resize-none leading-relaxed"
                    value={currentQuestion.content}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        content: e.target.value,
                      })
                    }
                    placeholder="Ketik pertanyaan di sini..."
                  />
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-accent uppercase tracking-wide ml-1">
                    Pilihan Jawaban & Skor
                  </label>
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt: any, index: number) => (
                      <div key={index} className="flex gap-3 group">
                        <div className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center font-semibold text-muted group-hover:border-accent-border group-hover:text-accent transition-colors">
                          {opt.label}
                        </div>
                        <textarea
                          className="flex-1 bg-surface border border-line rounded-2xl p-3 text-sm text-ink focus:ring-2 focus:ring-accent-border focus:outline-none resize-none leading-relaxed min-h-[48px]"
                          value={opt.content}
                          rows={2}
                          onChange={(e) => {
                            const newOpts = [...currentQuestion.options];
                            newOpts[index].content = e.target.value;
                            setCurrentQuestion({
                              ...currentQuestion,
                              options: newOpts,
                            });
                          }}
                          placeholder={`Opsi ${opt.label}...`}
                        />
                        {currentQuestion.segment === "TKP" ? (
                          <select
                            className="w-20 bg-surface border border-line rounded-2xl px-3 text-xs font-semibold text-accent focus:ring-2 focus:ring-accent-border outline-none"
                            value={opt.score}
                            onChange={(e) =>
                              handleScoreChange(index, parseInt(e.target.value))
                            }
                          >
                            {[1, 2, 3, 4, 5].map((v) => (
                              <option key={v} value={v}>
                                {v} Poin
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-2xl border flex items-center justify-center cursor-pointer transition-all ${
                              opt.score === 5
                                ? "bg-accent-solid border-accent-border text-white"
                                : "bg-surface border-line text-muted hover:border-accent-border"
                            }`}
                            onClick={() => handleScoreChange(index, 5)}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Pembahasan (Opsional)
                  </label>
                  <textarea
                    aria-label="Pembahasan (Opsional)"
                    className="w-full h-32 bg-surface border border-line rounded-2xl p-6 text-sm font-medium text-ink focus:ring-2 focus:ring-accent-border focus:outline-none resize-none italic"
                    value={currentQuestion.discussion || ""}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        discussion: e.target.value,
                      })
                    }
                    placeholder="Tuliskan pembahasan soal..."
                  />
                </div>
              </form>
            </div>

            <div className="flex-shrink-0 bg-canvas p-6 border-t border-line flex space-x-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 py-7 rounded-2xl font-bold text-muted"
                onClick={() => setIsDrawerOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="question-form"
                className="flex-[2] bg-accent-solid hover:bg-accent-solid py-7 rounded-2xl font-bold shadow-sm "
                disabled={formLoading}
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => itemToDelete && handleDelete(itemToDelete.id)}
        title="Hapus Soal?"
        description="Tindakan ini tidak dapat dibatalkan. Soal akan dihapus permanen dari database."
        confirmText="Ya, Hapus"
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Hapus Massal?"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.size} soal terpilih sekaligus?`}
        confirmText="Ya, Hapus Semua"
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <AdminDialog
          label="Formulir soal"
          onClose={() => setIsImportModalOpen(false)}
        >
          <Card className="relative w-full max-w-xl bg-surface border-line border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-accent-soft rounded-2xl flex items-center justify-center border border-accent-border">
                    <FileSpreadsheet className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Mass Import Soal
                    </h2>
                    <p className="text-xs font-bold text-muted uppercase tracking-wide">
                      Excel / CSV Uploader
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Tutup dialog"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportReplace(false);
                  }}
                  className="text-muted hover:text-ink transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Error List - Enterprise Grade */}
              {importErrors.length > 0 && (
                <div className="mb-6 p-4 bg-danger-soft border border-line rounded-2xl max-h-[150px] overflow-y-auto">
                  <p className="text-xs font-semibold text-danger uppercase tracking-wide mb-2">
                    Daftar Kesalahan Baris:
                  </p>
                  <ul className="space-y-1">
                    {importErrors.map((err, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-danger font-medium leading-relaxed italic"
                      >
                        â€¢ {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleImport} className="space-y-6">
                <div className="space-y-4 p-4 bg-surface border border-line rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent-soft blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> Petunjuk Format
                        Excel
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed max-w-sm">
                        Wajib memiliki kolom:{" "}
                        <code className="text-accent">No</code>,{" "}
                        <code className="text-accent">Segmen</code>{" "}
                        (TWK/TIU/TKP),{" "}
                        <code className="text-accent">Teks Soal</code>,{" "}
                        <code className="text-accent">Opsi A-E</code>, dan{" "}
                        <code className="text-accent">Nilai A-E</code>.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-accent-border text-accent hover:bg-accent-soft flex-shrink-0"
                      onClick={() =>
                        window.open("/template_soal_cpns.xlsx", "_blank")
                      }
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Unduh Template
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Pilih Paket Tujuan
                  </label>
                  <select
                    aria-label="Pilih Paket Tujuan"
                    required
                    className="w-full bg-canvas border border-line rounded-2xl p-4 text-sm font-bold text-ink focus:ring-2 focus:ring-accent-border focus:outline-none"
                    value={importPackageId}
                    onChange={(e) => setImportPackageId(e.target.value)}
                  >
                    <option value="">Pilih Paket...</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="flex items-center space-x-3 p-4 bg-danger-soft border border-line rounded-2xl group cursor-pointer hover:bg-danger-soft transition-all select-none"
                  onClick={() => setImportReplace(!importReplace)}
                >
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${importReplace ? "bg-danger-solid border-danger" : "border-line bg-canvas"}`}
                  >
                    {importReplace && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">
                      Timpa data lama dalam paket ini?
                    </p>
                    <p className="text-xs text-danger font-medium leading-relaxed italic mt-1 uppercase tracking-wide">
                      PERINGATAN: Semua soal, opsi, dan sesi ujian user yang ada
                      akan dihapus permanen!
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    File Soal (.xlsx / .csv)
                  </label>
                  <div
                    className={`border border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
                      importFile
                        ? "border-accent-border bg-accent-soft"
                        : "border-line hover:border-line"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) =>
                        setImportFile(e.target.files?.[0] || null)
                      }
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload
                        className={`w-10 h-10 mb-4 ${importFile ? "text-accent" : "text-muted"}`}
                      />
                      <p className="text-sm font-bold text-muted">
                        {importFile
                          ? importFile.name
                          : "Pilih file atau drag & drop"}
                      </p>
                      <p className="text-xs text-muted mt-2 font-medium">
                        Max size: 10MB
                      </p>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 py-7 rounded-2xl font-bold text-muted"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportReplace(false);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-[2] bg-accent-solid hover:bg-accent-solid py-7 rounded-2xl font-bold shadow-sm "
                    disabled={importLoading || !importFile || !importPackageId}
                  >
                    {importLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    Mulai Import Data
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </AdminDialog>
      )}
    </div>
  );
}
