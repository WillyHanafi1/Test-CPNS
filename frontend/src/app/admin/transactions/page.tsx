"use client";
import PaymentAudit from "@/components/admin/PaymentAudit";
import AdminDialog from "@/components/admin/AdminDialog";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Search,
  Filter,
  CreditCard,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Clock,
  Ban,
  TrendingUp,
  Package as PackageIcon,
  User as UserIcon,
  Crown,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function TransactionsAdmin() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");

  // Modals state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, packageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchTransactions();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/packages`, {
        credentials: "include",
      });
      const data = await response.json();
      setPackages(data.items || []);
    } catch (error) {
      console.error("Fetch packages error:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/transactions/summary`,
        { credentials: "include" },
      );
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Fetch summary error:", error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/transactions?page=${page}&size=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (packageFilter) url += `&package_id=${packageFilter}`;

      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      setTransactions(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Fetch transactions error:", error);
      toast.error("Gagal mengambil data transaksi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTransaction) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/transactions/${selectedTransaction.id}/status?new_status=${newStatus}`,
        {
          method: "PUT",
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Status transaksi diperbarui");
        setIsStatusModalOpen(false);
        fetchTransactions();
        fetchSummary();
      } else {
        toast.error("Gagal update status");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Order ID / Tanggal",
      render: (t) => (
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-tighter">
            ORDER: {t.order_id || t.id.substring(0, 8)}
          </p>
          <p className="text-xs font-bold text-ink">
            {new Date(t.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            })}
          </p>
        </div>
      ),
    },
    {
      header: "Pengguna",
      render: (t) => (
        <div className="flex items-center space-x-2">
          <UserIcon className="w-4 h-4 text-muted" />
          <p className="text-sm font-medium text-ink">{t.user.email}</p>
        </div>
      ),
    },
    {
      header: "Paket / Type",
      render: (t) => (
        <div className="flex items-center space-x-2">
          {t.transaction_type === "pro_upgrade" ? (
            <>
              <Crown className="w-4 h-4 text-warning" />
              <p className="text-sm font-bold text-warning">PRO ACCOUNT</p>
            </>
          ) : (
            <>
              <PackageIcon className="w-4 h-4 text-accent" />
              <p className="text-sm font-bold text-ink">{t.package?.title}</p>
            </>
          )}
        </div>
      ),
    },
    {
      header: "Amount",
      render: (t) => (
        <span className="font-semibold text-ink">
          Rp {t.amount.toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      header: "Status",
      render: (t) => (
        <Badge
          className={`rounded-full px-3 py-1 text-[9px] font-semibold tracking-tighter ${
            t.payment_status === "success"
              ? "bg-success-soft text-success"
              : t.payment_status === "pending"
                ? "bg-warning-soft text-warning"
                : "bg-danger-soft text-danger"
          }`}
        >
          {t.payment_status.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Aksi",
      className: "text-center",
      render: (t) => (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-surface-hover hover:text-ink"
            onClick={() => {
              setSelectedTransaction(t);
              setIsDetailModalOpen(true);
            }}
          >
            <CreditCard className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-surface-hover hover:text-ink"
            onClick={() => {
              setSelectedTransaction(t);
              setIsStatusModalOpen(true);
            }}
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
        title="Riwayat Transaksi"
        subtitle="Pantau pendapatan dan akses pengguna"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-surface border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Total Revenue
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-success">
              Rp {summary?.total_revenue.toLocaleString("id-ID") || "0"}
            </h3>
            <TrendingUp className="w-5 h-5 text-success opacity-50" />
          </div>
        </Card>
        <Card className="bg-surface border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Success Orders
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-ink">
              {summary?.success_count || "0"}
            </h3>
            <CheckCircle2 className="w-5 h-5 text-success opacity-50" />
          </div>
        </Card>
        <Card className="bg-surface border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Pending Orders
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-ink">
              {summary?.pending_count || "0"}
            </h3>
            <Clock className="w-5 h-5 text-warning opacity-50" />
          </div>
        </Card>
        <Card className="bg-surface border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Failed Orders
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-ink">
              {summary?.failed_count || "0"}
            </h3>
            <Ban className="w-5 h-5 text-danger opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="bg-surface border-line rounded-2xl overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" />
              <Input
                placeholder="Cari user email..."
                className="pl-12 bg-surface border-line rounded-2xl py-7 font-medium md:text-lg focus:ring-accent-border focus:border-accent-border text-ink"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center min-w-[150px]">
                <Filter className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none pr-10"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua Status</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center min-w-[150px]">
                <PackageIcon className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none pr-10"
                  value={packageFilter}
                  onChange={(e) => {
                    setPackageFilter(e.target.value);
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
        data={transactions}
        loading={loading}
        emptyIcon={<CreditCard className="w-12 h-12 text-muted" />}
        emptyText="Belum ada transaksi ditemukan"
      />

      <AdminPagination
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Detail Modal */}
      {isDetailModalOpen && selectedTransaction && (
        <AdminDialog
          label="Dialog pengelolaan"
          onClose={() => setIsDetailModalOpen(false)}
        >
          <Card className="relative w-full max-w-lg bg-surface border-line border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Detail Transaksi
                </h2>
                <button
                  aria-label="Tutup dialog"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-muted hover:text-ink transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      Transaction ID
                    </span>
                    <span className="text-xs font-mono text-ink">
                      {selectedTransaction.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      Snap Token
                    </span>
                    <span className="text-xs font-mono text-accent">
                      {selectedTransaction.snap_token || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-4">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      Type
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs uppercase font-semibold"
                    >
                      {selectedTransaction.transaction_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      User Email
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {selectedTransaction.user.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      Paket
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {selectedTransaction.package?.title || "GLOBAL PRO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      Status
                    </span>
                    <Badge
                      className={`rounded-xl py-0.5 px-3 font-semibold text-[9px] ${
                        selectedTransaction.payment_status === "success"
                          ? "bg-success-soft text-success"
                          : selectedTransaction.payment_status === "pending"
                            ? "bg-warning-soft text-warning"
                            : "bg-danger-soft text-danger"
                      }`}
                    >
                      {selectedTransaction.payment_status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">
                      Expires At
                    </span>
                    <span className="text-sm font-bold text-muted">
                      {selectedTransaction.access_expires_at
                        ? new Date(
                            selectedTransaction.access_expires_at,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <PaymentAudit id={selectedTransaction.id} />

                <div className="flex space-x-3 pt-2">
                  <Button
                    className="flex-1 py-7 rounded-2xl bg-surface-hover hover:bg-surface-hover font-bold"
                    onClick={() => setIsDetailModalOpen(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </AdminDialog>
      )}

      {/* Status Override Modal */}
      {isStatusModalOpen && selectedTransaction && (
        <AdminDialog
          label="Dialog pengelolaan"
          onClose={() => setIsStatusModalOpen(false)}
        >
          <Card className="relative w-full max-w-sm bg-surface border-line border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-warning-soft rounded-2xl flex items-center justify-center border border-line">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Ubah Status
                  </h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-wide">
                    Override Payment Status
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className={`w-full py-8 rounded-2xl font-semibold transition-all ${selectedTransaction.payment_status === "success" ? "bg-success" : "bg-surface-hover"}`}
                  onClick={() => handleUpdateStatus("success")}
                  disabled={actionLoading}
                >
                  SET SUCCESS
                </Button>
                <Button
                  className={`w-full py-8 rounded-2xl font-semibold transition-all ${selectedTransaction.payment_status === "pending" ? "bg-warning" : "bg-surface-hover"}`}
                  onClick={() => handleUpdateStatus("pending")}
                  disabled={actionLoading}
                >
                  SET PENDING
                </Button>
                <Button
                  className={`w-full py-8 rounded-2xl font-semibold transition-all ${selectedTransaction.payment_status === "failed" ? "bg-danger-solid" : "bg-surface-hover"}`}
                  onClick={() => handleUpdateStatus("failed")}
                  disabled={actionLoading}
                >
                  SET FAILED
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full mt-4 py-6 rounded-2xl font-bold text-muted"
                onClick={() => setIsStatusModalOpen(false)}
              >
                Batal
              </Button>
            </div>
          </Card>
        </AdminDialog>
      )}
    </div>
  );
}
