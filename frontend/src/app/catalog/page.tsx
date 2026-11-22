"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import AppShell, {
  Loading,
  ErrorPanel,
  EmptyState,
} from "@/components/AppShell";
import { PackageCard } from "@/components/PackageCard";
import { useResource } from "@/lib/useResource";
import { PackageInfo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
export default function Catalog() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("Semua");
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, error, loading, reload } = useResource<PackageInfo[]>(
    `/packages?limit=12&skip=${page * 12}&search=${encodeURIComponent(query)}${filter === "Semua" ? "" : "&progress=" + (filter === "Selesai" ? "finished" : "unattempted")}`,
  );
  const items = data || [];
  return (
    <AppShell
      title="Paket soal"
      description="Seluruh paket berisi soal HOTS sesuai referensi peserta ujian CPNS sebelumnya. Kerjakan dengan tenang, lalu pelajari pembahasannya."
      action={
        !user?.is_pro ? (
          <Link className="button button-secondary" href="/catalog/upgrade">
            Upgrade Pro
          </Link>
        ) : (
          <span className="badge badge-green">Akses semua paket Pro aktif</span>
        )
      }
    >
      <div className="hots-strip" role="note">
        <Sparkles size={15} aria-hidden="true" />
        <span>
          <strong>Standar Soal HOTS</strong> · Disusun mengikuti pola penalaran
          dan referensi peserta ujian CPNS sebelumnya.
        </span>
      </div>
      <label className="field" style={{ maxWidth: 510 }}>
        Cari paket
        <input
          className="input"
          placeholder="Nama paket latihan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="filters" aria-label="Status latihan">
        {(user ? ["Semua", "Belum dikerjakan", "Selesai"] : ["Semua"]).map(
          (f) => (
            <button
              className="filter"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setPage(0);
              }}
              key={f}
            >
              {f}
            </button>
          ),
        )}
      </div>
      {error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : loading ? (
        <Loading label="Menyiapkan paket latihan…" />
      ) : items.length ? (
        <div className="package-grid">
          {items.map((p) => (
            <PackageCard key={p.id} {...p} />
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada paket pada pilihan ini">
          <p>Coba kata kunci lain atau lihat semua status pada halaman ini.</p>
        </EmptyState>
      )}
      <div
        className="inline"
        style={{ justifyContent: "center", marginTop: 30 }}
      >
        <button
          className="button button-secondary"
          disabled={page === 0 || loading}
          onClick={() => setPage((n) => n - 1)}
        >
          Sebelumnya
        </button>
        <span className="muted">Halaman {page + 1}</span>
        <button
          className="button button-secondary"
          disabled={loading || !data || data.length < 12}
          onClick={() => setPage((n) => n + 1)}
        >
          Berikutnya
        </button>
      </div>
    </AppShell>
  );
}
