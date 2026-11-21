"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  BookOpen,
  Home,
  History,
  UserRound,
  ArrowUpRight,
  Loader2,
  Heart,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/dashboard", title: "Beranda", icon: Home },
  { href: "/catalog", title: "Paket Soal", icon: BookOpen },
  { href: "/history", title: "Riwayat", icon: History },
  { href: "/account", title: "Akun", icon: UserRound },
];

export default function AppShell({
  children,
  title,
  description,
  action,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const path = usePathname();
  const { user } = useAuth();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const navigation = user
    ? [...links, { href: "/donasi", title: "Donasi", icon: Heart }]
    : [
        { href: "/catalog", title: "Paket Soal", icon: BookOpen },
        { href: "/catalog/upgrade", title: "Paket Pro", icon: UserRound },
        { href: "/faq", title: "Bantuan", icon: Home },
        { href: "/donasi", title: "Donasi", icon: Heart },
      ];
  return (
    <div className="app-surface">
      <a className="skip-link" href="#main-content">
        Langsung ke konten
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link href={user ? "/dashboard" : "/"} className="brand">
            <span className="brand-mark">
              <BookOpen size={20} />
            </span>
            TOCPNS<span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Navigasi utama" className="desktop-nav">
            {navigation.map(({ href, title }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
              >
                {title}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              className="button button-small button-secondary"
              href={user ? "/account" : "/login"}
            >
              {user ? (user.is_pro ? "Pro aktif" : "Akun saya") : "Masuk"}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <nav className="mobile-header-links" aria-label="Navigasi singkat">
          <Link
            href="/catalog"
            aria-current={active("/catalog") ? "page" : undefined}
          >
            Paket soal
          </Link>
          <Link
            href="/donasi"
            aria-current={active("/donasi") ? "page" : undefined}
          >
            <Heart size={14} aria-hidden="true" />
            Donasi
          </Link>
          <Link href="/faq" aria-current={active("/faq") ? "page" : undefined}>
            Bantuan
          </Link>
        </nav>
      </header>
      <main id="main-content" className="app-main">
        {offline && (
          <p className="notice notice-warning" role="status">
            Kamu sedang offline. Periksa koneksi sebelum mengirim atau
            memperbarui data.
          </p>
        )}
        {title && (
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              {description && (
                <p className="muted page-description">{description}</p>
              )}
            </div>
            {action}
          </div>
        )}
        {children}
      </main>
      <footer className="app-footer">
        <span>TOCPNS · Latihan dengan lebih tenang.</span>
        <Link href="/faq">Bantuan</Link>
        <Link href="/support">Kontak</Link>
        <Link href="/donasi">Donasi</Link>
        <Link href="/terms">Ketentuan</Link>
        <Link href="/privacy">Privasi</Link>
      </footer>
      {user && (
        <nav className="mobile-nav" aria-label="Navigasi ponsel">
          {links.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{title}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="empty-state" role="status">
      <Loader2 className="animate-spin" size={24} />
      <p>{label}</p>
    </div>
  );
}
export function ErrorPanel({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{message}</p>
      {retry && (
        <button
          className="button button-small button-secondary"
          onClick={retry}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state panel">
      <BookOpen size={28} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Scores({
  scores,
}: {
  scores: {
    total_score: number;
    score_twk: number;
    score_tiu: number;
    score_tkp: number;
  };
}) {
  return (
    <div className="score-grid">
      {[
        ["TWK", scores.score_twk],
        ["TIU", scores.score_tiu],
        ["TKP", scores.score_tkp],
        ["Total", scores.total_score],
      ].map(([title, value]) => (
        <div key={title}>
          <span className="eyebrow">{title}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
