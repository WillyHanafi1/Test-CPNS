"use client";
import AdminDialog from "@/components/admin/AdminDialog";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  MessageSquare,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  Search,
  MessageCircle,
  Bug,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Flag,
  MoreVertical,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AdminPageHeader,
  AdminDataTable,
  AdminPagination,
  ConfirmModal,
  Column,
} from "@/components/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function FeedbackAdmin() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    priority: "",
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    status: "",
    priority: "",
    admin_notes: "",
  });

  useEffect(() => {
    fetchFeedback();
  }, [page, filters]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/feedback?page=${page}&size=10`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.priority) url += `&priority=${filters.priority}`;

      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      if (Array.isArray(data)) {
        setFeedbackList(data);
        setTotal(data.length);
      } else {
        setFeedbackList(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Fetch feedback error:", error);
      toast.error("Gagal mengambil data saran");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/feedback/${selectedFeedback.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Saran berhasil diperbarui");
        setIsEditModalOpen(false);
        fetchFeedback();
      } else {
        toast.error("Gagal memperbarui saran");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!selectedFeedback) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/feedback/${selectedFeedback.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Saran berhasil dihapus");
        setIsDeleteModalOpen(false);
        fetchFeedback();
      } else {
        toast.error("Gagal menghapus saran");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return {
          color: "bg-success-soft text-success",
          label: "RESOLVED",
          icon: CheckCircle,
        };
      case "in_progress":
        return {
          color: "bg-accent-soft text-accent",
          label: "IN PROGRESS",
          icon: Clock,
        };
      case "reviewed":
        return {
          color: "bg-accent-soft text-accent",
          label: "REVIEWED",
          icon: Search,
        };
      default:
        return {
          color: "bg-surface-hover text-muted",
          label: "PENDING",
          icon: AlertCircle,
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return { color: "bg-danger-solid text-white", label: "URGENT" };
      case "high":
        return { color: "bg-warning-soft text-warning", label: "HIGH" };
      case "medium":
        return { color: "bg-accent-soft text-accent", label: "MEDIUM" };
      default:
        return { color: "bg-surface-hover text-muted", label: "LOW" };
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Pengguna & Konteks",
      className: "w-[250px]",
      render: (f) => (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-surface-hover border border-line flex items-center justify-center font-bold text-xs text-accent">
              {f.user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-ink truncate">
                {f.user?.email || "Unknown"}
              </p>
              <p className="text-xs text-muted font-medium">
                {new Date(f.created_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                })}
              </p>
            </div>
          </div>
          {f.path_context && (
            <div className="flex items-center h-5 px-2 bg-surface rounded-md border border-line w-fit">
              <ExternalLink className="w-2.5 h-2.5 text-muted mr-1.5" />
              <span className="text-xs text-muted font-mono truncate max-w-[180px]">
                {f.path_context}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Kategori",
      className: "w-32",
      render: (f) => {
        const cat = f.category?.toLowerCase();
        return (
          <div className="flex flex-col space-y-1.5">
            <Badge
              className={`rounded-lg py-1 px-2 font-bold text-[9px] border-none tracking-wide w-fit ${
                cat === "bug"
                  ? "bg-danger-soft text-danger"
                  : cat === "correction"
                    ? "bg-success-soft text-success"
                    : cat === "suggestion"
                      ? "bg-accent-soft text-accent"
                      : "bg-surface-hover text-muted"
              }`}
            >
              {f.category?.toUpperCase()}
            </Badge>
            <Badge
              className={`rounded-lg py-0.5 px-2 font-semibold text-[8px] border-none tracking-wide w-fit ${getPriorityConfig(f.priority).color}`}
            >
              {getPriorityConfig(f.priority).label}
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Isi Pesan & Catatan",
      className: "min-w-[300px]",
      render: (f) => (
        <div className="space-y-2">
          <div className="p-3 bg-surface rounded-xl border border-line">
            <p className="text-sm font-medium text-ink leading-relaxed italic line-clamp-2">
              "{f.content}"
            </p>
          </div>
          {f.admin_notes && (
            <div className="flex items-start space-x-2 px-1">
              <Shield className="w-3 h-3 text-accent mt-0.5" />
              <p className="text-[11px] text-muted font-medium italic line-clamp-1">
                Note: {f.admin_notes}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      className: "w-32",
      render: (f) => {
        const config = getStatusConfig(f.status);
        return (
          <Badge
            className={`rounded-xl py-1.5 px-3 font-semibold text-xs border-none tracking-[0.1em] ${config.color} flex items-center gap-1.5 w-fit`}
          >
            <config.icon className="w-3 h-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: "Aksi",
      className: "text-center w-24",
      render: (f) => (
        <div className="flex items-center justify-center space-x-1">
          <Button
            aria-label="Kelola masukan"
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-xl hover:bg-accent-soft hover:text-accent transition-all border border-transparent hover:border-accent-border"
            onClick={() => {
              setSelectedFeedback(f);
              setEditForm({
                status: f.status,
                priority: f.priority,
                admin_notes: f.admin_notes || "",
              });
              setIsEditModalOpen(true);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          <Button
            aria-label="Hapus"
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-xl hover:bg-danger-soft hover:text-danger transition-all"
            onClick={() => {
              setSelectedFeedback(f);
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      <AdminPageHeader
        title="Masukan peserta"
        subtitle="Manajemen feedback pelanggan dengan workflow profesional"
      />

      {/* Advanced Filters */}
      <Card className="bg-surface border-line rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <CardContent className="p-5 md:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                Kategori
              </label>
              <div className="bg-surface border border-line rounded-2xl px-4 py-2.5 flex items-center">
                <Filter className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none"
                  value={filters.category}
                  onChange={(e) => {
                    setFilters({ ...filters, category: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">Semua Kategori</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug Report</option>
                  <option value="correction">Koreksi Soal</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                Status
              </label>
              <div className="bg-surface border border-line rounded-2xl px-4 py-2.5 flex items-center text-success">
                <CheckCircle className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none"
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                Prioritas
              </label>
              <div className="bg-surface border border-line rounded-2xl px-4 py-2.5 flex items-center text-danger">
                <Flag className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none"
                  value={filters.priority}
                  onChange={(e) => {
                    setFilters({ ...filters, priority: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">Semua Prioritas</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="pb-1.5 pl-2">
              <p className="text-[11px] font-bold text-muted">
                Ditemukan <span className="text-accent">{total}</span> pesan
                masuk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable
        columns={columns}
        data={feedbackList}
        loading={loading}
        emptyIcon={<MessageSquare className="w-16 h-16 text-muted" />}
        emptyText="Database saran masih kosong"
      />

      <AdminPagination
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Management Modal */}
      {isEditModalOpen && (
        <AdminDialog
          label="Kelola masukan"
          onClose={() => setIsEditModalOpen(false)}
        >
          <Card className="w-full max-w-lg bg-surface border-line shadow-sm rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-line flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-soft rounded-xl">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink tracking-tight">
                    Kelola Feedback
                  </h3>
                  <p className="text-xs text-muted font-medium">
                    Update status dan berikan catatan internal
                  </p>
                </div>
              </div>
              <button
                aria-label="Tutup dialog"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-xl text-muted hover:text-ink transition-colors"
                disabled={actionLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="p-4 bg-surface rounded-2xl border border-line space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-muted uppercase tracking-[0.2em]">
                    Pesan User
                  </p>
                  <Badge className="bg-accent-soft text-accent border-none text-[8px]">
                    {selectedFeedback?.category?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-ink italic">
                  "{selectedFeedback?.content}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Set Status
                  </label>
                  <select
                    aria-label="Set Status"
                    className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm font-bold text-ink focus:ring-2 focus:ring-accent-border transition-all outline-none appearance-none"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                    Prioritas
                  </label>
                  <select
                    aria-label="Prioritas"
                    className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm font-bold text-ink focus:ring-2 focus:ring-accent-border transition-all outline-none appearance-none"
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide ml-1">
                  Catatan Admin (Internal)
                </label>
                <textarea
                  aria-label="Catatan Admin (Internal)"
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink min-h-[100px] focus:ring-2 focus:ring-accent-border transition-all outline-none resize-none"
                  placeholder="Tuliskan catatan perbaikan atau progres untuk tim..."
                  value={editForm.admin_notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, admin_notes: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 py-6 rounded-2xl border-line bg-transparent text-muted hover:bg-surface-hover hover:text-ink font-bold"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={actionLoading}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 py-6 rounded-2xl bg-accent-solid hover:bg-accent-solid text-white font-bold shadow-sm "
                  onClick={handleUpdateFeedback}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </AdminDialog>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteFeedback}
        title="Hapus Saran?"
        description="Apakah Anda yakin ingin menghapus saran ini secara permanen?"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
