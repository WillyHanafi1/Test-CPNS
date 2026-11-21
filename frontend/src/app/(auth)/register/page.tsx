"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { api, loginDestination, safeReturn } from "@/lib/api";

function RegisterForm() {
  const { user, register, refreshSession } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturn(params.get("next"));
  const destination = loginDestination(
    user?.role || "participant",
    params.get("next"),
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) router.replace(destination);
  }, [user, router, destination]);

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
            setError("");
            try {
              const signedIn = await register(email, password, name);
              if (signedIn) {
                router.replace(destination);
              } else {
                router.push(
                  `/login?registered=true&next=${encodeURIComponent(next)}`,
                );
              }
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
            <div className="inline" style={{ flexWrap: "nowrap" }}>
              <input
                className="input"
                aria-label="Kata sandi"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
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
            <span className="muted" style={{ fontSize: 13 }}>
              Gunakan sedikitnya 8 karakter.
            </span>
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Membuat akun…" : "Daftar gratis"}
          </button>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <p className="muted" style={{ textAlign: "center" }}>
              atau daftar cepat dengan Google
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
                      : "Belum berhasil mendaftar melalui Google.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
              onError={() =>
                setError("Belum berhasil mendaftar melalui Google.")
              }
            />
          </>
        )}
        <p className="muted" style={{ fontSize: 13 }}>
          Dengan mendaftar, kamu menyetujui{" "}
          <Link href="/terms" style={{ color: "var(--accent)" }}>
            Ketentuan Layanan
          </Link>{" "}
          dan{" "}
          <Link href="/privacy" style={{ color: "var(--accent)" }}>
            Kebijakan Privasi
          </Link>
          .
        </p>
        <p className="muted">
          Sudah terdaftar?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            style={{ color: "var(--accent)" }}
          >
            Masuk
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

export default function Register() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <Loading />
        </AppShell>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
