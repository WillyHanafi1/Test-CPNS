"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Crown,
  Loader2,
  Shield,
  UserCheck,
  User as UserIcon,
  UserX,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
  type Column,
} from "@/components/admin";
import {
  formatDateJakarta,
  toLocalDatetimeInput,
} from "@/lib/admin-format";
import type { AdminUser, AdminUserList } from "@/types/admin";

const PAGE_SIZE = 15;

function addDaysDatetimeInput(days: number): string {
  const target = new Date(Date.now() + days * 86400 * 1000);
  return toLocalDatetimeInput(target.toISOString());
}

function UsersAdminContent() {
  const { user: currentAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") ?? "",
  );
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") ?? "");
  const [proFilter, setProFilter] = useState(searchParams.get("is_pro") ?? "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "",
  );

  // User Detail & Edit Drawer
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("participant");
  const [editPro, setEditPro] = useState(false);
  const [editProExpiry, setEditProExpiry] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
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
      if (roleFilter) params.set("role", roleFilter);
      if (proFilter === "true" || proFilter === "false") {
        params.set("is_pro", proFilter);
      }
      if (statusFilter === "active") params.set("is_active", "true");
      else if (statusFilter === "inactive") params.set("is_active", "false");

      const data = await api<AdminUserList>(
        `/admin/users?${params.toString()}`,
        { signal: controller.signal },
      );
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pengguna.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, proFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchUsers]);

  const openDrawer = (u: AdminUser) => {
    setSelected(u);
    setEditRole(u.role);
    setEditPro(u.is_pro);
    setEditProExpiry(toLocalDatetimeInput(u.pro_expires_at));
    setEditActive(u.is_active);
  };

  const handleSaveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const payload = {
        role: editRole,
        is_pro: editPro,
        pro_expires_at:
          editPro && editProExpiry
            ? new Date(editProExpiry).toISOString()
            : null,
        is_active: editActive,
      };
      const updated = await api<AdminUser>(`/admin/users/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(`Perubahan akun ${updated.email} disimpan.`);
      setSelected(updated);
      await fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui pengguna.",
      );
    } finally {
      setSaving(false);
    }
  };

  const isSelf = selected?.id === currentAdmin?.id;

  const columns: Column<AdminUser>[] = [
    {
      header: "Pengguna",
      className: "min-w-[250px]",
      render: (u) => {
        const displayName = u.profile?.full_name || "Tanpa nama";
        const initial = (u.profile?.full_name || u.email)
          .charAt(0)
          .toUpperCase();
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold ${
                u.role === "admin"
                  ? "border-accent-border bg-accent-soft text-accent"
                  : "border-line bg-surface-subtle text-muted"
              }`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-ink truncate max-w-[180px]">
                  {displayName}
                </p>
                {u.is_pro && (
                  <AdminBadge tone="warning">
                    <Crown className="h-3 w-3" />
                    Pro
                  </AdminBadge>
                )}
              </div>
              <p className="text-xs text-muted truncate max-w-[220px]">
                {u.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Peran & Akses",
      render: (u) => (
        <div className="flex flex-col items-start gap-1">
          <AdminBadge tone={u.role === "admin" ? "accent" : "neutral"}>
            {u.role === "admin" ? "Admin" : "Peserta"}
          </AdminBadge>
          {u.is_pro && (
            <span className="text-xs text-muted tabular-nums">
              {u.pro_expires_at
                ? `Pro s/d ${formatDateJakarta(u.pro_expires_at)}`
                : "Pro tanpa batas"}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Aktivitas",
      className: "tabular-nums whitespace-nowrap",
      render: (u) => (
        <div className="text-xs text-muted">
          <span className="font-semibold text-ink">{u.total_sessions}</span>{" "}
          sesi ·{" "}
          <span className="font-semibold text-ink">{u.total_transactions}</span>{" "}
          transaksi
        </div>
      ),
    },
    {
      header: "Status",
      render: (u) => (
        <AdminBadge tone={u.is_active ? "success" : "danger"} dot>
          {u.is_active ? "Aktif" : "Nonaktif"}
        </AdminBadge>
      ),
    },
    {
      header: "Terdaftar",
      className: "text-xs text-muted tabular-nums whitespace-nowrap",
      render: (u) => formatDateJakarta(u.created_at),
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap",
      render: (u) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDrawer(u);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover"
        >
          Kelola
        </button>
      ),
    },
  ];

  const hasFilters = Boolean(search || roleFilter || proFilter || statusFilter);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Komunitas"
        title="Pengguna"
        subtitle={`Total ${total} akun terdaftar. Klik baris pengguna untuk mengelola akses Paket Pro, peran, dan status akun.`}
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari email atau nama lengkap…"
        hasActiveFilters={hasFilters}
        onResetFilters={() => {
          setSearch("");
          setDebouncedSearch("");
          setRoleFilter("");
          setProFilter("");
          setStatusFilter("");
          setPage(1);
          router.replace("/admin/users", { scroll: false });
        }}
      >
        <select
          aria-label="Filter peran pengguna"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua peran</option>
          <option value="participant">Peserta</option>
          <option value="admin">Admin</option>
        </select>

        <select
          aria-label="Filter Paket Pro"
          value={proFilter}
          onChange={(e) => {
            setProFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua paket</option>
          <option value="true">Paket Pro</option>
          <option value="false">Gratis</option>
        </select>

        <select
          aria-label="Filter status akun"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-control-line bg-canvas px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </AdminFilterBar>

      {error ? (
        <ErrorPanel message={error} retry={() => void fetchUsers()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyIcon={<UserIcon className="h-6 w-6" />}
          emptyText="Pengguna tidak ditemukan"
          emptyHint="Coba ubah kata kunci pencarian atau reset filter."
          onRowClick={openDrawer}
        />
      )}

      <AdminPagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* User Management Slide-Over Drawer */}
      {selected && (
        <AdminDialog
          variant="drawer"
          size="md"
          label="Detail dan kontrol pengguna"
          title={selected.profile?.full_name || "Pengguna tanpa nama"}
          subtitle={selected.email}
          onClose={() => !saving && setSelected(null)}
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Tutup
              </button>
              <button
                type="submit"
                form="admin-user-edit-form"
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan perubahan
              </button>
            </>
          }
        >
          <form
            id="admin-user-edit-form"
            onSubmit={handleSaveUser}
            className="space-y-5"
          >
            {/* Account Summary */}
            <dl className="rounded-xl border border-line bg-surface-subtle/50 divide-y divide-line text-sm">
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Email</dt>
                <dd className="text-xs font-medium text-ink break-all text-right">
                  {selected.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Target instansi</dt>
                <dd className="text-xs text-ink">
                  {selected.profile?.target_instansi || "Belum diisi"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Metode login</dt>
                <dd className="text-xs font-medium uppercase text-muted">
                  {selected.auth_provider || "local"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Aktivitas</dt>
                <dd className="text-xs text-ink tabular-nums">
                  {selected.total_sessions} sesi ujian ·{" "}
                  {selected.total_transactions} transaksi sukses
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-xs text-muted">Terdaftar</dt>
                <dd className="text-xs text-ink tabular-nums">
                  {formatDateJakarta(selected.created_at)}
                </dd>
              </div>
            </dl>

            {/* Paket Pro Control */}
            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-ink">
                  Keanggotaan Paket Pro
                </h3>
              </div>

              <AdminSwitch
                checked={editPro}
                onChange={(checked) => {
                  setEditPro(checked);
                  if (checked && !editProExpiry) {
                    setEditProExpiry(addDaysDatetimeInput(365));
                  }
                }}
                tone="warning"
                label="Aktifkan Paket Pro"
                description="Membuka akses seluruh paket soal berlabel Pro untuk akun ini."
              />

              {editPro && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      [30, "+30 hari"],
                      [90, "+90 hari"],
                      [365, "+365 hari"],
                    ].map(([days, label]) => (
                      <button
                        key={String(days)}
                        type="button"
                        onClick={() =>
                          setEditProExpiry(addDaysDatetimeInput(Number(days)))
                        }
                        className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-hover"
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditProExpiry("")}
                      className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
                    >
                      Tanpa batas
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted">
                      Berlaku hingga (kosongkan jika tanpa batas)
                    </label>
                    <input
                      type="datetime-local"
                      aria-label="Masa aktif Paket Pro"
                      value={editProExpiry}
                      onChange={(e) => setEditProExpiry(e.target.value)}
                      className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-xs text-ink"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Role Control */}
            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Peran akun</h3>
              </div>
              <select
                aria-label="Peran akun"
                disabled={isSelf}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="h-10 w-full rounded-xl border border-control-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-50"
              >
                <option value="participant">Peserta (Participant)</option>
                <option value="admin">Administrator (Admin)</option>
              </select>
              <p className="text-xs text-muted leading-relaxed">
                {isSelf
                  ? "Demi keamanan, kamu tidak dapat menurunkan peran akun admin yang sedang kamu gunakan."
                  : "Mengubah peran otomatis mencabut sesi login sebelumnya agar hak akses langsung sinkron."}
              </p>
            </section>

            {/* Account Status (Honest Soft-Deactivation) */}
            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                {editActive ? (
                  <UserCheck className="h-4 w-4 text-success" />
                ) : (
                  <UserX className="h-4 w-4 text-danger" />
                )}
                <h3 className="text-sm font-semibold text-ink">Status akun</h3>
              </div>
              <AdminSwitch
                checked={editActive}
                onChange={setEditActive}
                disabled={isSelf}
                tone="success"
                label={editActive ? "Akun aktif" : "Akun dinonaktifkan"}
                description={
                  isSelf
                    ? "Akun admin yang sedang aktif tidak dapat dinonaktifkan sendiri."
                    : "Menonaktifkan akun langsung mencabut sesi login peserta tanpa menghapus catatan transaksi maupun histori ujian."
                }
              />
            </section>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}

export default function UsersAdmin() {
  return (
    <Suspense fallback={<Loading label="Memuat pengguna…" />}>
      <UsersAdminContent />
    </Suspense>
  );
}
