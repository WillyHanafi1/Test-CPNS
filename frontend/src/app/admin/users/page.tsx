"use client";
import AdminDialog from "@/components/admin/AdminDialog";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Shield,
  User as UserIcon,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  UserX,
  UserCheck,
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

export default function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/users?page=${page}&size=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (roleFilter) url += `&role=${roleFilter}`;
      if (statusFilter !== "") url += `&is_active=${statusFilter === "active"}`;

      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      setUsers(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Gagal mengambil data pengguna");
    } finally {
      setLoading(true); // Small hack to re-trigger pulse
      setTimeout(() => setLoading(false), 100);
    }
  };

  const handleToggleStatus = async (user: any) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
        credentials: "include",
      });

      if (response.ok) {
        toast.success(
          `User ${!user.is_active ? "diaktifkan" : "dinonaktifkan"}`,
        );
        fetchUsers();
      } else {
        toast.error("Gagal mengubah status user");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/users/${selectedUser.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Role user berhasil diupdate");
        setIsRoleModalOpen(false);
        fetchUsers();
      } else {
        toast.error("Gagal update role");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePro = async (user: any) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pro: !user.is_pro }),
        credentials: "include",
      });

      if (response.ok) {
        toast.success(
          `User ${!user.is_pro ? "dijadikan PRO" : "dikembalikan ke Standard"}`,
        );
        fetchUsers();
      } else {
        toast.error("Gagal mengubah status PRO");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/users/${selectedUser.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("User berhasil dihapus");
        setIsDeleteModalOpen(false);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Gagal menghapus user");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Pengguna",
      className: "max-w-xs",
      render: (u) => (
        <div className="flex items-center space-x-3">
          <div
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-semibold border tracking-tighter ${
              u.role === "admin"
                ? "bg-accent-soft border-accent-border text-accent"
                : "bg-surface-hover border-line text-muted"
            }`}
          >
            {u.profile?.full_name?.charAt(0).toUpperCase() ||
              u.email.charAt(0).toUpperCase()}
            {u.is_pro && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center border border-line">
                <Crown className="w-2 h-2 text-white fill-white" />
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-ink flex items-center gap-2">
              {u.profile?.full_name || "No Name"}
              {u.is_pro && (
                <Badge className="bg-warning-soft text-warning border-0 text-[8px] h-4 px-1">
                  PRO
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted font-medium">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      render: (u) => (
        <Badge
          className={`rounded-xl py-1 px-3 font-bold text-xs border-none tracking-wide ${
            u.role === "admin"
              ? "bg-danger-soft text-danger"
              : "bg-surface-hover text-muted"
          }`}
        >
          {u.role.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Stats",
      render: (u) => (
        <div className="flex space-x-4 text-[11px] font-bold">
          <div>
            <span className="text-muted block">SESSIONS</span>
            <span className="text-ink">{u.total_sessions}</span>
          </div>
          <div>
            <span className="text-muted block">ORDERS</span>
            <span className="text-ink">{u.total_transactions}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (u) => (
        <div className="flex items-center space-x-3">
          <Badge
            className={`rounded-full px-3 py-1 text-[9px] font-semibold tracking-tighter ${
              u.is_active
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger"
            }`}
          >
            {u.is_active ? "ACTIVE" : "BANNED"}
          </Badge>
          <button
            onClick={() => handleToggleStatus(u)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              u.is_active
                ? "hover:bg-danger-soft text-muted hover:text-danger"
                : "hover:bg-success-soft text-muted hover:text-success"
            }`}
            title={u.is_active ? "Ban User" : "Unban User"}
          >
            {u.is_active ? (
              <UserX className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </button>
        </div>
      ),
    },
    {
      header: "Registered",
      render: (u) => (
        <span className="text-xs font-medium text-muted">
          {new Date(u.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          })}
        </span>
      ),
    },
    {
      header: "Aksi",
      className: "text-center",
      render: (u) => (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded-xl transition-all ${
              u.is_pro
                ? "bg-warning-soft text-warning hover:bg-warning-soft"
                : "hover:bg-surface-hover"
            }`}
            onClick={() => handleTogglePro(u)}
            disabled={actionLoading}
            title={u.is_pro ? "Downgrade to Standard" : "Upgrade to PRO"}
          >
            <Crown className={`w-4 h-4 ${u.is_pro ? "fill-amber-500" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-surface-hover hover:text-ink"
            onClick={() => {
              setSelectedUser(u);
              setIsRoleModalOpen(true);
            }}
            title="Ubah Role"
          >
            <Shield className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl hover:bg-danger-soft hover:text-danger transition-all"
            onClick={() => {
              setSelectedUser(u);
              setIsDeleteModalOpen(true);
            }}
            title="Hapus User"
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
        title="Pengguna"
        subtitle={`Daftar ${total} Pengguna Terdaftar`}
      />

      {/* Filters & Search */}
      <Card className="bg-surface border-line rounded-2xl overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" />
              <Input
                placeholder="Cari email atau nama..."
                className="pl-12 bg-surface border-line rounded-2xl py-7 font-medium md:text-lg focus:ring-accent-border focus:border-accent-border text-ink"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center min-w-[150px]">
                <Shield className="w-4 h-4 text-muted mr-2" />
                <select
                  className="bg-transparent text-sm font-bold text-ink focus:outline-none w-full appearance-none pr-10"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua Role</option>
                  <option value="participant">Participant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
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
                  <option value="active">Active Only</option>
                  <option value="inactive">Banned Only</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyIcon={<UserIcon className="w-12 h-12 text-muted" />}
        emptyText="Belum ada pengguna ditemukan"
      />

      <AdminPagination
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Role Change Modal */}
      {isRoleModalOpen && (
        <AdminDialog
          label="Ubah peran pengguna"
          onClose={() => setIsRoleModalOpen(false)}
        >
          <Card className="relative w-full max-w-sm bg-surface border-line border rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-danger-soft rounded-2xl flex items-center justify-center border border-line">
                  <Shield className="w-6 h-6 text-danger" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Ubah Role
                  </h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-wide">
                    Akses Kontrol User
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted mb-8 font-medium">
                Ubah role untuk <strong>{selectedUser?.email}</strong>. Admin
                memiliki akses penuh ke dashboard ini.
              </p>

              <div className="space-y-3">
                <Button
                  className={`w-full py-8 rounded-2xl font-semibold transition-all ${selectedUser?.role === "admin" ? "bg-danger-solid" : "bg-surface-hover hover:bg-surface-hover"}`}
                  onClick={() => handleUpdateRole("admin")}
                  disabled={actionLoading}
                >
                  ADMIN ACCESS
                </Button>
                <Button
                  className={`w-full py-8 rounded-2xl font-semibold transition-all ${selectedUser?.role === "participant" ? "bg-accent-solid" : "bg-surface-hover hover:bg-surface-hover"}`}
                  onClick={() => handleUpdateRole("participant")}
                  disabled={actionLoading}
                >
                  PARTICIPANT
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full mt-4 py-6 rounded-2xl font-bold text-muted"
                onClick={() => setIsRoleModalOpen(false)}
              >
                Batal
              </Button>
            </div>
          </Card>
        </AdminDialog>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Hapus Pengguna?"
        description={`Apakah Anda yakin ingin menghapus user "${selectedUser?.email}"? Seluruh data riwayat ujian dan profil akan hilang permanen.`}
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
