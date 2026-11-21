"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import Modal from "@/components/Modal";
import { Loading } from "@/components/AppShell";
import { AdminCommandPalette } from "@/components/admin";
import { api } from "@/lib/api";
import type { AdminActionSummary } from "@/types/admin";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  badgeKey?: "ops" | "drafts" | "transactions" | "feedback";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operasional",
    items: [
      { name: "Ringkasan", icon: LayoutDashboard, href: "/admin" },
      {
        name: "Operasi",
        icon: Activity,
        href: "/admin/operations",
        badgeKey: "ops",
      },
    ],
  },
  {
    label: "Konten Ujian",
    items: [
      {
        name: "Paket ujian",
        icon: Package,
        href: "/admin/packages",
        badgeKey: "drafts",
      },
      { name: "Bank soal", icon: BookOpen, href: "/admin/questions" },
    ],
  },
  {
    label: "Komunitas & Data",
    items: [
      {
        name: "Transaksi",
        icon: CreditCard,
        href: "/admin/transactions",
        badgeKey: "transactions",
      },
      { name: "Pengguna", icon: Users, href: "/admin/users" },
      {
        name: "Masukan",
        icon: MessageSquare,
        href: "/admin/feedback",
        badgeKey: "feedback",
      },
      { name: "Analitik", icon: BarChart3, href: "/admin/analytics" },
    ],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Ringkasan",
  "/admin/operations": "Operasi",
  "/admin/packages": "Paket ujian",
  "/admin/questions": "Bank soal",
  "/admin/transactions": "Transaksi",
  "/admin/users": "Pengguna",
  "/admin/feedback": "Masukan",
  "/admin/analytics": "Analitik",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [badges, setBadges] = useState<AdminActionSummary | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/admin");
    else if (!loading && user?.role !== "admin") router.replace("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadBadges = useCallback(async () => {
    try {
      const data = await api<AdminActionSummary>(
        "/admin/analytics/action-summary",
      );
      if (data && typeof data.pending_feedback === "number") {
        setBadges(data);
      }
    } catch {
      /* Badge summary is non-blocking; pages still work normally. */
    }
  }, []);

  useEffect(() => {
    if (loading || user?.role !== "admin") return;
    const timer = setTimeout(() => {
      void loadBadges();
    }, 0);
    return () => clearTimeout(timer);
  }, [loading, user?.role, pathname, loadBadges]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-surface">
        <Loading label="Memverifikasi akses admin…" />
      </div>
    );
  }

  const resolveBadge = (
    key?: NavItem["badgeKey"],
  ): { count: number; tone?: "warning" | "danger" } | null => {
    if (!badges || !key) return null;
    if (key === "ops" && badges.ops_issues_count > 0) {
      return { count: badges.ops_issues_count, tone: "danger" };
    }
    if (key === "feedback" && badges.pending_feedback > 0) {
      return { count: badges.pending_feedback, tone: "warning" };
    }
    if (key === "transactions") {
      const total =
        (badges.review_payment_events || 0) +
        (badges.pending_transactions || 0);
      if (total > 0) {
        return {
          count: total,
          tone: badges.review_payment_events > 0 ? "danger" : "warning",
        };
      }
    }
    if (key === "drafts" && badges.draft_packages > 0) {
      return { count: badges.draft_packages };
    }
    return null;
  };

  const currentPageTitle = ROUTE_TITLES[pathname] ?? "Panel admin";

  const navContent = (
    <div className="admin-nav-groups">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="admin-nav-group-title">{group.label}</p>
          <nav
            className="admin-navigation"
            aria-label={`Navigasi ${group.label}`}
          >
            {group.items.map(({ name, icon: Icon, href, badgeKey }) => {
              const badge = resolveBadge(badgeKey);
              return (
                <Link
                  href={href}
                  key={href}
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon size={17} aria-hidden={true} />
                    <span className="truncate">{name}</span>
                  </span>
                  {badge && (
                    <span
                      className="admin-nav-badge"
                      data-tone={badge.tone}
                      aria-label={`${badge.count} perlu perhatian`}
                    >
                      {badge.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <div className="app-surface admin-shell">
      <a className="skip-link" href="#admin-content">
        Langsung ke konten
      </a>

      <aside className="admin-sidebar">
        <div className="flex items-center justify-between gap-2 px-1">
          <Link href="/admin" className="brand">
            <span className="brand-mark">
              <BookOpen size={19} />
            </span>
            TOCPNS<span className="brand-dot">.</span>
          </Link>
          <span className="rounded-md border border-accent-border bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            Admin
          </span>
        </div>

        {navContent}

        <div className="admin-sidebar-footer">
          <div className="px-1 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">
              {user.full_name || "Administrator"}
            </p>
            <p className="text-xs text-muted truncate" title={user.email}>
              {user.email}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-xs font-semibold text-ink hover:bg-surface-hover"
            onClick={() => void logout()}
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-toolbar">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="theme-toggle admin-menu-button"
              aria-label="Buka navigasi admin"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <nav
              aria-label="Breadcrumb admin"
              className="flex items-center gap-2 text-sm min-w-0"
            >
              <Link
                href="/admin"
                className="text-muted hover:text-ink hidden sm:inline"
              >
                Admin
              </Link>
              <span className="text-muted hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-ink truncate">
                {currentPageTitle}
              </span>
            </nav>
          </div>

          <div className="header-actions">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Buka pencarian cepat admin"
              className="hidden md:inline-flex h-9 items-center gap-2.5 rounded-xl border border-line bg-canvas px-3 text-xs text-muted hover:border-control-line hover:text-ink"
            >
              <Search size={14} aria-hidden="true" />
              <span>Cari cepat…</span>
              <kbd className="admin-kbd">Ctrl K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Cari cepat"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-canvas text-muted hover:text-ink"
            >
              <Search size={16} aria-hidden="true" />
            </button>
            <ThemeToggle />
            <Link
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface-hover whitespace-nowrap"
              href="/dashboard"
            >
              <span className="hidden sm:inline">Lihat aplikasi</span>
              <span className="sm:hidden">Aplikasi</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main id="admin-content" className="admin-main">
          {children}
        </main>
      </div>

      <Modal
        open={mobileOpen}
        title="Navigasi admin"
        onClose={() => setMobileOpen(false)}
      >
        {navContent}
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void logout()}
        >
          <LogOut size={16} />
          Keluar
        </button>
      </Modal>

      <AdminCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
