"use client";
import { useState } from "react";
import Link from "next/link";
import AppShell, { ErrorPanel } from "@/components/AppShell";
import { api } from "@/lib/api";
export default function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppShell>
      <section className="panel auth-panel stack">
        <h1>Lupa kata sandi?</h1>
        <p className="muted">
          Masukkan email akunmu untuk meminta tautan pemulihan.
        </p>
        {sent ? (
          <p className="notice" role="status">
            Jika alamat tersebut terdaftar, petunjuk pemulihan akan dikirim.
            Periksa juga folder spam.
          </p>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/auth/forgot-password", {
                  method: "POST",
                  body: JSON.stringify({ email }),
                });
                setSent(true);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Permintaan belum berhasil.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
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
            {error && <ErrorPanel message={error} />}
            <button className="button" disabled={busy}>
              {busy ? "Memproses…" : "Kirim petunjuk pemulihan"}
            </button>
          </form>
        )}
        <div className="between">
          <Link className="muted" href="/login">
            ← Kembali ke masuk
          </Link>
          <Link className="muted" href="/support" style={{ fontSize: 13 }}>
            Butuh bantuan admin?
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
