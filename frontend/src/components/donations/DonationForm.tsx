"use client";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Heart, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, rememberPayment } from "@/lib/api";
import {
  donationAmount,
  DONATION_AMOUNTS,
  donationLoginHref,
  dokuCheckoutUrl,
  rupiah,
  supporterName,
} from "@/lib/donations";

const subscribeToHydration = () => () => {};

export default function DonationForm({
  initialAmount = 5000,
}: {
  initialAmount?: number;
}) {
  const { user: sessionUser, loading: sessionLoading } = useAuth();
  // A surrounding Suspense boundary may hydrate after the auth provider updates.
  // Use the server's anonymous/loading snapshot for this component's first render.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const user = hydrated ? sessionUser : null;
  const loading = !hydrated || sessionLoading;
  const router = useRouter();
  const id = useId();
  const [preset, setPreset] = useState(initialAmount);
  const [custom, setCustom] = useState(
    DONATION_AMOUNTS.includes(initialAmount) ? "" : String(initialAmount),
  );
  const [message, setMessage] = useState("");
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const amount = custom.trim() ? donationAmount(custom) : preset;
  return (
    <form
      className="donation-form stack"
      aria-label="Form donasi"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current || loading) return;
        setError("");
        if (!amount) {
          setError(
            "Masukkan nominal bulat mulai Rp 1.000, misalnya 5000 atau 5.000.",
          );
          return;
        }
        if (!user) {
          router.push(donationLoginHref(amount));
          return;
        }
        submitting.current = true;
        setBusy(true);
        try {
          const result = await api<{ redirect_url: string; order_id: string }>(
            "/transactions/donate",
            {
              method: "POST",
              body: JSON.stringify({
                amount,
                message: message.trim() || null,
                is_anonymous: !showName,
                callback_url: `${window.location.origin}/payment/success?return_to=%2Fdonasi`,
              }),
            },
          );
          if (!result.redirect_url || !result.order_id)
            throw new Error(
              "Tautan pembayaran belum tersedia. Silakan coba lagi.",
            );
          const target = dokuCheckoutUrl(result.redirect_url);
          rememberPayment(result.order_id, user.id);
          window.location.assign(target);
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Pembayaran belum dapat disiapkan. Silakan coba lagi.",
          );
        } finally {
          submitting.current = false;
          setBusy(false);
        }
      }}
    >
      <div>
        <p className="eyebrow">DUKUNG SESUAI KEMAMPUANMU</p>
        <h2>Mulai dari hal kecil.</h2>
        <p className="muted donation-small">
          Setiap dukungan membantu merawat ruang latihan ini.
        </p>
      </div>
      <fieldset disabled={busy}>
        <legend className="field">Pilih nominal donasi</legend>
        <div className="donation-amounts">
          {DONATION_AMOUNTS.map((value) => (
            <button
              className="filter"
              type="button"
              key={value}
              aria-pressed={!custom && preset === value}
              onClick={() => {
                setPreset(value);
                setCustom("");
                setError("");
              }}
            >
              {rupiah(value)}
            </button>
          ))}
        </div>
        <label className="field" htmlFor={`${id}-amount`}>
          Nominal lain (rupiah)
        </label>
        <input
          id={`${id}-amount`}
          className="input"
          inputMode="numeric"
          autoComplete="off"
          value={custom}
          placeholder="Contoh: 5.000"
          maxLength={24}
          aria-describedby={`${id}-amount-help`}
          aria-invalid={Boolean(custom && !amount)}
          onChange={(event) => {
            setCustom(event.target.value);
            setError("");
          }}
        />
        <p id={`${id}-amount-help`} className="muted donation-small">
          Mulai Rp 1.000. Bebas pilih nominal.
        </p>
      </fieldset>
      {user && (
        <details className="donation-optional">
          <summary>Nama & pesan (opsional)</summary>
          <div className="stack" style={{ gap: 18 }}>
            <label className="field" htmlFor={`${id}-message`}>
              Pesan untuk komunitas{" "}
              <span className="muted donation-small">
                Opsional · tampil publik
              </span>
              <textarea
                id={`${id}-message`}
                className="input"
                rows={2}
                maxLength={150}
                value={message}
                disabled={busy}
                placeholder="Semangat untuk teman-teman yang sedang berjuang."
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <div className="donation-privacy">
              <label className="inline" htmlFor={`${id}-name`}>
                <input
                  id={`${id}-name`}
                  type="checkbox"
                  checked={showName}
                  disabled={busy}
                  aria-describedby={`${id}-privacy-help`}
                  onChange={(event) => setShowName(event.target.checked)}
                />
                Tampilkan nama singkat saya
              </label>
              <p id={`${id}-privacy-help`} className="muted donation-small">
                {showName
                  ? `${supporterName(user.full_name)} akan tampil di papan pendukung.`
                  : "Nama tampil sebagai Pendukung anonim. Nominal dan pesan tetap terlihat."}{" "}
                Pilihan nama bisa diubah lewat riwayat transaksi.
              </p>
            </div>
          </div>
        </details>
      )}
      {user && (
        <p className="muted donation-small">
          {showName
            ? `Nama publik: ${supporterName(user.full_name)}.`
            : "Nama disembunyikan secara default. Kamu bisa memilih tampil lewat Nama & pesan."}
        </p>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="stack" style={{ gap: 12 }}>
        <button
          className="button donation-submit"
          type="submit"
          disabled={busy || loading}
        >
          {busy || loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : user ? (
            <Heart size={18} />
          ) : (
            <ArrowUpRight size={18} />
          )}
          {busy
            ? "Menyiapkan pembayaran…"
            : loading
              ? "Memeriksa akun…"
              : user
                ? amount
                  ? `Lanjutkan · ${rupiah(amount)}`
                  : "Periksa nominal"
                : "Masuk & lanjutkan donasi"}
        </button>
        {!user && !loading && (
          <p className="muted donation-small">
            Masuk dengan Google atau email agar donasi dan status pembayarannya
            tersimpan di akunmu. Nominal pilihanmu tetap dibawa.
          </p>
        )}
        <p className="muted donation-small inline">
          <LockKeyhole size={14} aria-hidden="true" />
          Pembayaran melalui DOKU · Sekali bayar
        </p>
        <p className="muted donation-small">
          Donasi sukarela dan terpisah dari keanggotaan Pro.
        </p>
      </div>
    </form>
  );
}
