"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Package,
  CreditCard,
  Users,
  BarChart3,
  LogOut,
  Menu,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import Modal from "@/components/Modal";
import { Loading } from "@/components/AppShell";

const navigation = [
  { name: "Ringkasan", icon: LayoutDashboard, href: "/admin" },
  { name: "Bank soal", icon: BookOpen, href: "/admin/questions" },
  { name: "Paket ujian", icon: Package, href: "/admin/packages" },
  { name: "Transaksi", icon: CreditCard, href: "/admin/transactions" },
  { name: "Pengguna", icon: Users, href: "/admin/users" },
  { name: "Masukan", icon: MessageSquare, href: "/admin/feedback" },
  { name: "Analitik", icon: BarChart3, href: "/admin/analytics" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/admin");
    else if (!loading && user?.role !== "admin") router.replace("/dashboard");
  }, [loading, user, router]);
  if (loading || !user || user.role !== "admin")
    return (
      <div className="app-surface">
        <Loading label="Memverifikasi akses admin…" />
      </div>
    );
  const nav = (
    <nav className="admin-navigation" aria-label="Navigasi admin">
      {navigation.map(({ name, icon: Icon, href }) => (
        <Link
          href={href}
          key={href}
          aria-current={pathname === href ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Icon size={19} aria-hidden="true" />
          {name}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="app-surface admin-shell">
      <a className="skip-link" href="#admin-content">
        Langsung ke konten
      </a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="brand">
          <span className="brand-mark">
            <BookOpen size={20} />
          </span>
          TOCPNS<span className="brand-dot">.</span>
        </Link>
        <p className="eyebrow" style={{ marginTop: 18 }}>
          Ruang admin
        </p>
        {nav}
        <div className="admin-sidebar-footer">
          <p className="muted truncate" title={user.email}>
            {user.email}
          </p>
          <button
            className="button button-secondary"
            onClick={() => void logout()}
          >
            <LogOut size={17} />
            Keluar
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-toolbar">
          <div className="inline">
            <button
              className="theme-toggle admin-menu-button"
              aria-label="Buka navigasi admin"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">Panel admin</span>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              className="button button-small button-secondary"
              href="/dashboard"
            >
              Lihat aplikasi
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        <main id="admin-content" className="admin-main">
          {children}
        </main>
      </div>
      <Modal open={open} title="Navigasi admin" onClose={() => setOpen(false)}>
        {nav}
        <button
          className="button button-secondary"
          onClick={() => void logout()}
        >
          <LogOut size={17} />
          Keluar
        </button>
      </Modal>
    </div>
  );
}
