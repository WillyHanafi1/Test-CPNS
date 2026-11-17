"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { api } from "@/lib/api";
function Form() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppShell>
      <section className="panel auth-panel stack">
        <h1>Atur kata sandi baru.</h1>
        {!token ? (
          <>
            <ErrorPanel message="Tautan pemulihan tidak lengkap. Minta tautan baru untuk melanjutkan." />
            <Link className="button" href="/forgot-password">
              Minta tautan baru
            </Link>
          </>
        ) : sent ? (
          <>
            <p className="notice">Kata sandi berhasil diperbarui.</p>
            <Link className="button" href="/login">
              Masuk ke akun
            </Link>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (password !== confirm) {
                setError("Kedua kata sandi belum sama.");
                return;
              }
              setBusy(true);
              try {
                await api("/auth/reset-password", {
                  method: "POST",
                  body: JSON.stringify({ token, new_password: password }),
                });
                setSent(true);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Pemulihan belum berhasil.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Kata sandi baru
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="field">
              Ulangi kata sandi
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && <ErrorPanel message={error} />}
            <button className="button" disabled={busy}>
              {busy ? "Memperbarui…" : "Simpan kata sandi baru"}
            </button>
            <Link className="muted" href="/forgot-password">
              Tautan kedaluwarsa? Minta yang baru
            </Link>
          </form>
        )}
      </section>
    </AppShell>
  );
}
export default function Reset() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <Loading />
        </AppShell>
      }
    >
      <Form />
    </Suspense>
  );
}
