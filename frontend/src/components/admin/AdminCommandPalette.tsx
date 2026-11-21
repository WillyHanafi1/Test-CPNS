"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plus,
  Search,
  Users,
} from "lucide-react";
import AdminDialog from "./AdminDialog";

interface CommandItem {
  id: string;
  label: string;
  group: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
}

const COMMANDS: CommandItem[] = [
  {
    id: "overview",
    label: "Ringkasan",
    group: "Navigasi",
    hint: "Command center & antrean tindak lanjut",
    href: "/admin",
    icon: LayoutDashboard,
    keywords: "dashboard home beranda overview",
  },
  {
    id: "operations",
    label: "Operasi & Kesehatan Layanan",
    group: "Navigasi",
    hint: "Antrean skoring, worker, dan backup",
    href: "/admin/operations",
    icon: Activity,
    keywords: "ops health queue worker backup server",
  },
  {
    id: "packages",
    label: "Paket Ujian",
    group: "Konten",
    hint: "Kelola paket, validasi 110 soal, terbitkan revisi",
    href: "/admin/packages",
    icon: Package,
    keywords: "paket tryout skd publish draft copy",
  },
  {
    id: "questions",
    label: "Bank Soal",
    group: "Konten",
    hint: "Edit soal, rumus KaTeX, import Excel/CSV",
    href: "/admin/questions",
    icon: BookOpen,
    keywords: "soal twk tiu tkp import excel csv editor",
  },
  {
    id: "transactions",
    label: "Transaksi",
    group: "Keuangan & Komunitas",
    hint: "Riwayat Upgrade Pro, donasi, dan audit DOKU",
    href: "/admin/transactions",
    icon: CreditCard,
    keywords: "pembayaran order doku pro donasi revenue",
  },
  {
    id: "users",
    label: "Pengguna",
    group: "Keuangan & Komunitas",
    hint: "Akun peserta, masa aktif Pro, dan peran admin",
    href: "/admin/users",
    icon: Users,
    keywords: "user peserta akun role pro ban",
  },
  {
    id: "feedback",
    label: "Masukan Peserta",
    group: "Keuangan & Komunitas",
    hint: "Triage bug, koreksi soal, dan saran",
    href: "/admin/feedback",
    icon: MessageSquare,
    keywords: "feedback saran laporan bug koreksi",
  },
  {
    id: "analytics",
    label: "Analitik Platform",
    group: "Analitik",
    hint: "Tren pendapatan, skor TWK/TIU/TKP, paket terpopuler",
    href: "/admin/analytics",
    icon: BarChart3,
    keywords: "statistik grafik skor passing grade",
  },
  {
    id: "action-new-pkg",
    label: "Buat Paket Ujian Baru",
    group: "Aksi Cepat",
    hint: "Buka form pembuatan paket draft baru",
    href: "/admin/packages?action=create",
    icon: Plus,
    keywords: "tambah buat paket baru",
  },
  {
    id: "action-pending-fb",
    label: "Tinjau Masukan Pending",
    group: "Aksi Cepat",
    hint: "Filter masukan yang belum ditangani",
    href: "/admin/feedback?status=pending",
    icon: MessageSquare,
    keywords: "pending feedback belum dibaca",
  },
  {
    id: "action-participant-app",
    label: "Buka Tampilan Peserta",
    group: "Aksi Cepat",
    hint: "Pindah ke dashboard aplikasi peserta",
    href: "/dashboard",
    icon: ArrowUpRight,
    keywords: "participant frontend dashboard",
  },
];

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function AdminCommandPalette({
  open,
  onClose,
}: AdminCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [query]);

  const clampedIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) =>
          filtered.length ? (prev + 1) % filtered.length : 0,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0,
        );
      } else if (event.key === "Enter" && filtered[clampedIndex]) {
        event.preventDefault();
        router.push(filtered[clampedIndex].href);
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, clampedIndex, router, onClose]);

  if (!open) return null;

  return (
    <AdminDialog
      label="Navigasi cepat admin"
      onClose={onClose}
      size="md"
    >
      <div className="w-[calc(100vw-24px)] max-w-xl rounded-2xl border border-line bg-surface text-ink shadow-xl overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 text-muted shrink-0" aria-hidden="true" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Loncat ke halaman atau aksi admin…"
            aria-label="Cari menu atau aksi admin"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none border-0"
          />
          <kbd className="admin-kbd">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Tidak ada menu yang cocok dengan &ldquo;{query}&rdquo;.
            </p>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === clampedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-ink hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        active
                          ? "border-accent-border bg-surface text-accent"
                          : "border-line bg-surface-subtle text-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted truncate">{item.hint}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted shrink-0">
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </AdminDialog>
  );
}
