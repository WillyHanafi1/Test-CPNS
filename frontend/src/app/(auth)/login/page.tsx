"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { api, safeReturn } from "@/lib/api";
function Form() {
  const { user, login, refreshSession } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturn(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user) router.replace(user.role === "admin" ? "/admin" : next);
  }, [user, router, next]);
  return (
    <AppShell>
      <div className="panel auth-panel stack">
        <div>
          <p className="eyebrow">SELAMAT DATANG KEMBALI</p>
          <h1>Masuk ke ruang latihan.</h1>
          <p className="muted" style={{ marginTop: 12 }}>
            Lanjutkan perjalanan belajarmu.
          </p>
        </div>
        {params.get("registered") && (
          <p className="notice">Akun berhasil dibuat. Silakan masuk.</p>
        )}
        {error && <ErrorPanel message={error} />}
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await login(email, password);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Koneksi belum tersedia.",
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
          <label className="field">
            Kata sandi
            <div className="inline" style={{ flexWrap: "nowrap" }}>
              <input
                className="input"
                aria-label="Kata sandi"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="button button-secondary button-small"
                type="button"
                aria-pressed={show}
                onClick={() => setShow((v) => !v)}
              >
                {show ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </label>
          <Link href="/forgot-password" className="muted">
            Lupa kata sandi?
          </Link>
          <button className="button" disabled={busy}>
            {busy ? "Sedang masuk…" : "Masuk"}
          </button>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <p className="muted" style={{ textAlign: "center" }}>
              atau gunakan akun Google
            </p>
            <GoogleLogin
              onSuccess={async (credential) => {
                setBusy(true);
                setError("");
                try {
                  await api("/auth/google", {
                    method: "POST",
                    body: JSON.stringify({ token: credential.credential }),
                  });
                  await refreshSession();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Belum berhasil masuk melalui Google.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
              onError={() => setError("Belum berhasil masuk melalui Google.")}
            />
          </>
        )}
        <p className="muted">
          Belum punya akun?{" "}
          <Link
            style={{ color: "var(--accent)" }}
            href={`/register?next=${encodeURIComponent(next)}`}
          >
            Daftar gratis
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
export default function Login() {
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
