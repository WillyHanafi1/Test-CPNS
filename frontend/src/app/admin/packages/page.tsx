"use client";
import AdminDialog from "@/components/admin/AdminDialog";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Filter,
  Settings,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Eye,
  Package,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function PackagesAdmin() {
  const [validation, setValidation] = useState<{
    id: string;
    errors: string[];
    valid: boolean;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
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
  });

  // Helper to format Date for datetime-local input (YYYY-MM-DDThh:mm)
  const formatForInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    // Adjust to local time offset for input
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, includeArchived, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [debouncedSearch, category, includeArchived]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/packages?page=${page}&size=10`;
      if (debouncedSearch)
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (category) url += `&category=${category}`;
      if (includeArchived) url += `&include_archived=true`;

      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      setPackages(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Fetch packages error:", error);
      toast.error("Gagal mengambil data paket");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedPackage(null);
    setFormData({
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
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setSelectedPackage(pkg);
    setFormData({
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      category: pkg.category,
      is_premium: pkg.is_premium,
      is_published: pkg.is_published,
      is_active: pkg.is_active,
      is_weekly: pkg.is_weekly || false,
      start_at: formatForInput(pkg.start_at),
      end_at: formatForInput(pkg.end_at),
    });
    setIsFormModalOpen(true);
  };

  const handleRestore = async (pkgId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/packages/${pkgId}/restore`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (response.ok) {
        toast.success("Paket berhasil dikembalikan");
        fetchPackages();
      } else {
        toast.error("Gagal mengembalikan paket");
      }
    } catch (error) {
      toast.error("Kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const isEdit = !!selectedPackage;
    const url = isEdit
      ? `${API_URL}/api/v1/admin/packages/${selectedPackage.id}`
      : `${API_URL}/api/v1/admin/packages`;

    // Process payload for Weekly Tryout dates
    const payload = {
      ...formData,
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
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (response.ok) {
        toast.success(
          isEdit ? "Paket berhasil diperbarui" : "Paket baru berhasil dibuat",
        );
        setIsFormModalOpen(false);
        fetchPackages();
      } else {
        const data = await response.json();
        toast.error(
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.errors?.join(" ") || "Terjadi kesalahan",
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Gagal menghubungi server");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    setFormLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/packages/${selectedPackage.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Paket berhasil diarsipkan");
        setShowDeleteModal(false);
        fetchPackages();
      } else {
        toast.error("Gagal mengarsipkan paket");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setFormLoading(false);
    }
  };

  const handlePreviewPackage = async (pkgId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/packages/${pkgId}/quick-preview`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Gagal membuat pratinjau");
      }

      const data = await response.json();
      toast.success("Pratinjau berhasil dibuat! Mengalihkan...");

      // Redirect to the result page of the newly created mock session
      router.push(`/exam/${data.session_id}/result`);
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error.message || "Gagal membuat pratinjau");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Informasi Paket",
      className: "max-w-xs",
      render: (pkg) => (
        <div
          className={`flex items-center space-x-3 ${!pkg.is_active ? "opacity-40" : ""}`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              !pkg.is_active
                ? "bg-surface-hover border-line"
                : "bg-accent-soft border-accent-border"
            }`}
          >
            <Package
              className={`w-5 h-5 ${!pkg.is_active ? "text-muted" : "text-accent"}`}
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p
                className={`font-bold ${!pkg.is_active ? "text-muted" : "text-ink"}`}
              >
                {pkg.title}
                {!pkg.is_active && (
                  <span className="ml-2 text-[8px] border border-line px-1 rounded uppercase tracking-tighter">
                    Arsip
                  </span>
                )}
              </p>
              {pkg.is_active &&
                (pkg.is_published ? (
                  <div
                    className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    title="Published"
                  />
                ) : (
                  <div
                    className="w-2 h-2 rounded-full bg-surface-hover"
                    title="Draft"
                  />
                ))}
            </div>
            <p className="text-xs text-muted truncate max-w-[150px]">
              {pkg.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Kategori",
      render: (pkg) => (
        <Badge
          className={`rounded-xl py-1 px-3 font-bold text-xs border-none tracking-wide ${
            pkg.category === "TWK"
              ? "bg-accent-soft text-accent"
              : pkg.category === "TIU"
                ? "bg-accent-soft text-accent"
                : pkg.category === "TKP"
                  ? "bg-warning-soft text-warning"
                  : "bg-surface-hover text-muted"
          }`}
        >
          {pkg.category}
        </Badge>
      ),
    },
    {
      header: "Harga",
      render: (pkg) => (
        <span className="font-semibold text-ink">
          {pkg.price === 0
            ? "GRATIS"
            : `Rp ${pkg.price.toLocaleString("id-ID")}`}
        </span>
      ),
    },
    {
      header: "Status",
      render: (pkg) => (
        <Badge
          className={`rounded-full px-3 py-1 text-[9px] font-semibold tracking-tighter ${
            pkg.is_premium
              ? "bg-warning-soft text-warning"
              : "bg-surface-hover text-muted"
          }`}
        >
          {pkg.is_premium ? "PREMIUM" : "REGULER"}
        </Badge>
      ),
    },
    {
      header: "Jumlah Soal",
      className: "text-center",
      render: (pkg) => (
        <span className="font-bold text-muted">
          {pkg.question_count || 0} Soal
        </span>
      ),
    },
    {
      header: "Aksi",
      className: "text-center",
      render: (pkg) => (
        <div className="flex items-center justify-center space-x-2">
          {pkg.is_active ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const data = await api<{
                      valid: boolean;
                      errors: string[];
                    }>(`/admin/packages/${pkg.id}/validation`);
                    setValidation({ id: pkg.id, ...data });
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Validasi gagal.",
                    );
                  }
                }}
              >
                Validasi & terbitkan
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Pratinjau Hasil & Pembahasan"
                className="w-10 h-10 rounded-xl hover:bg-accent-soft hover:text-accent transition-all"
                onClick={() => handlePreviewPackage(pkg.id)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Ubah"
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl hover:bg-surface-hover hover:text-ink transition-all"
                onClick={() => handleOpenEdit(pkg)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Hapus"
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl hover:bg-danger-soft hover:text-danger transition-all"
                onClick={() => {
                  setSelectedPackage(pkg);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-line hover:bg-success-soft hover:text-success text-xs font-bold h-8"
              onClick={() => handleRestore(pkg.id)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      <AdminPageHeader
        title="Paket Ujian"
        subtitle={`Manajemen ${total} Paket Tryout`}
        actions={
          <Button
            className="bg-accent-solid hover:bg-accent-solid rounded-2xl py-6 px-10 font-bold shadow-sm "
            onClick={handleOpenCreate}
          >
            <Plus className="w-5 h-5 mr-2" />
            Buat Paket Baru
          </Button>
        }
      />

      {/* Filters & Search */}
      <Card className="bg-surface border-line rounded-2xl overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" />
              <Input
                placeholder="Cari judul paket..."
                className="pl-12 bg-surface border-line rounded-2xl py-7 font-medium md:text-lg focus:ring-accent-border focus:border-accent-border text-ink"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center min-w-[150px]">
                <Filter className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua Kategori</option>
                  <option value="TWK">TWK</option>
                  <option value="TIU">TIU</option>
                  <option value="TKP">TKP</option>
                  <option value="Mix">Mix / Campuran</option>
                </select>
              </div>
              {/* Archive Toggle */}
              <div
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl border cursor-pointer transition-all ${
                  includeArchived
                    ? "bg-surface-hover border-line text-ink"
                    : "bg-surface border-line text-muted hover:border-line"
                }`}
                onClick={() => setIncludeArchived(!includeArchived)}
              >
                <Trash2
                  className={`w-4 h-4 ${includeArchived ? "text-danger" : ""}`}
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Lihat Arsip
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable
        columns={columns}
        data={packages}
        loading={loading}
        emptyIcon={<Package className="w-12 h-12 text-muted" />}
        emptyText="Belum ada paket tersedia"
      />

      <AdminPagination
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Form Modal */}
      {isFormModalOpen && (
        <AdminDialog
          label="Formulir paket ujian"
          onClose={() => setIsFormModalOpen(false)}
        >
          <Card className="relative w-full max-w-xl bg-surface border-line border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-accent-soft rounded-2xl flex items-center justify-center border border-accent-border">
                    <Plus className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {selectedPackage ? "Edit Paket" : "Buat Paket Baru"}
                    </h2>
                    <p className="text-xs font-bold text-muted uppercase tracking-wide">
                      Detail Informasi Paket
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Tutup dialog"
                  onClick={() => setIsFormModalOpen(false)}
                  className="text-muted hover:text-ink transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Nama Paket
                  </label>
                  <Input
                    aria-label="Nama Paket"
                    required
                    className="bg-canvas border-line rounded-2xl p-6 font-bold"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Contoh: Paket Tryout SKD 01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Deskripsi Singkat
                  </label>
                  <textarea
                    aria-label="Deskripsi Singkat"
                    required
                    className="w-full bg-canvas border border-line rounded-2xl p-4 text-sm font-medium text-ink focus:ring-2 focus:ring-accent-border focus:outline-none min-h-[100px]"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Jelaskan isi paket ini..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                      Kategori
                    </label>
                    <select
                      aria-label="Kategori"
                      className="w-full bg-canvas border border-line rounded-2xl p-4 text-sm font-bold text-ink focus:ring-2 focus:ring-accent-border focus:outline-none appearance-none"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      <option value="Mix">Mix</option>
                      <option value="TWK">TWK</option>
                      <option value="TIU">TIU</option>
                      <option value="TKP">TKP</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                      Harga (Rp)
                    </label>
                    <Input
                      aria-label="Harga (Rp)"
                      type="number"
                      className="bg-canvas border-line rounded-2xl p-6 font-bold"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-line">
                  <div>
                    <p className="text-sm font-bold text-ink">Akses Premium</p>
                    <p className="text-xs text-muted">
                      Kunci paket untuk pengguna berbayar
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Akses Premium"
                    aria-checked={formData.is_premium}
                    className="relative inline-flex flex-shrink-0 items-center cursor-pointer p-2 -m-2 rounded-xl"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        is_premium: !formData.is_premium,
                      })
                    }
                  >
                    <div
                      className={`w-12 h-6 rounded-full transition-colors ${formData.is_premium ? "bg-accent-solid" : "bg-surface-hover"}`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_premium ? "translate-x-6" : ""}`}
                      />
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-line">
                  <div>
                    <p className="text-sm font-bold text-ink">
                      Tryout Mingguan
                    </p>
                    <p className="text-xs text-muted">
                      Jadwalkan sebagai Tryout Live Mingguan
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Tryout Mingguan"
                    aria-checked={formData.is_weekly}
                    className="relative inline-flex flex-shrink-0 items-center cursor-pointer p-2 -m-2 rounded-xl"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        is_weekly: !formData.is_weekly,
                      })
                    }
                  >
                    <div
                      className={`w-12 h-6 rounded-full transition-colors ${formData.is_weekly ? "bg-warning" : "bg-surface-hover"}`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_weekly ? "translate-x-6" : ""}`}
                      />
                    </div>
                  </button>
                </div>

                {formData.is_weekly && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                        Waktu Mulai
                      </label>
                      <Input
                        aria-label="Waktu Mulai"
                        type="datetime-local"
                        className="bg-canvas border-line rounded-2xl p-6 font-bold text-xs"
                        value={formData.start_at}
                        onChange={(e) =>
                          setFormData({ ...formData, start_at: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                        Waktu Berakhir
                      </label>
                      <Input
                        aria-label="Waktu Berakhir"
                        type="datetime-local"
                        className="bg-canvas border-line rounded-2xl p-6 font-bold text-xs"
                        value={formData.end_at}
                        onChange={(e) =>
                          setFormData({ ...formData, end_at: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-line">
                  <div>
                    <p className="text-sm font-bold text-ink">Publish Paket</p>
                    <p className="text-xs text-muted">
                      Munculkan paket ini di katalog publik
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Publish Paket"
                    aria-checked={formData.is_published}
                    className="relative inline-flex flex-shrink-0 items-center cursor-pointer p-2 -m-2 rounded-xl"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        is_published: !formData.is_published,
                      })
                    }
                  >
                    <div
                      className={`w-12 h-6 rounded-full transition-colors ${formData.is_published ? "bg-success" : "bg-surface-hover"}`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_published ? "translate-x-6" : ""}`}
                      />
                    </div>
                  </button>
                </div>

                <div className="pt-4 flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 py-7 rounded-2xl font-bold text-muted"
                    onClick={() => setIsFormModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-[2] bg-accent-solid hover:bg-accent-solid py-7 rounded-2xl font-bold shadow-sm "
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : selectedPackage ? (
                      <CheckCircle className="w-5 h-5 mr-2" />
                    ) : (
                      <Plus className="w-5 h-5 mr-2" />
                    )}
                    {selectedPackage ? "Update Paket" : "Buat Paket"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </AdminDialog>
      )}

      <Modal
        open={!!validation}
        title="Validasi publikasi"
        onClose={() => setValidation(null)}
      >
        <p>
          Validasi struktur tidak menggantikan pemeriksaan akademis. Penerbitan
          menyimpan revisi yang tidak mengubah sesi yang sudah dimulai.
        </p>
        {validation?.errors.length ? (
          <ul className="check-list">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        ) : (
          <p className="notice">Struktur paket siap diterbitkan.</p>
        )}
        <button
          className="button"
          disabled={!validation?.valid || publishing}
          onClick={async () => {
            if (!validation) return;
            setPublishing(true);
            try {
              await api(`/admin/packages/${validation.id}`, {
                method: "PUT",
                body: JSON.stringify({ is_published: true }),
              });
              toast.success("Revisi paket diterbitkan.");
              setValidation(null);
              fetchPackages();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Penerbitan gagal.");
            } finally {
              setPublishing(false);
            }
          }}
        >
          {publishing ? "Menerbitkan…" : "Terbitkan revisi"}
        </button>
      </Modal>
      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Arsipkan Paket?"
        description={`Apakah Anda yakin ingin mengarsipkan paket "${selectedPackage?.title}"? Paket akan disembunyikan dari daftar utama tetapi data sejarah pengerjaan tetap tersimpan.`}
        variant="danger"
        loading={formLoading}
      />
    </div>
  );
}
