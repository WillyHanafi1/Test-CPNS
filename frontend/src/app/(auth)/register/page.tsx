"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell, { ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { safeReturn } from "@/lib/api";
export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppShell>
      <div className="panel auth-panel stack">
        <div>
          <p className="eyebrow">LANGKAH PERTAMA</p>
          <h1>Buat ruang latihanmu.</h1>
          <p className="muted" style={{ marginTop: 12 }}>
            Daftar gratis dan mulai dari satu paket.
          </p>
        </div>
        {error && <ErrorPanel message={error} />}
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await register(email, password, name);
              const next = safeReturn(
                new URLSearchParams(window.location.search).get("next"),
              );
              router.push(
                `/login?registered=true&next=${encodeURIComponent(next)}`,
              );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Pendaftaran belum berhasil.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Nama lengkap
            <input
              className="input"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Email
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Kata sandi
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="muted" style={{ fontSize: 13 }}>
              Gunakan sedikitnya 8 karakter.
            </span>
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Membuat akun…" : "Daftar gratis"}
          </button>
        </form>
        <p className="muted">
          Sudah terdaftar?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>
            Masuk
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
