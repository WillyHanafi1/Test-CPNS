"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Heart,
  Loader2,
  LockKeyhole,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, rememberPayment } from "@/lib/api";
import {
  donationAmount,
  DONATION_AMOUNTS,
  donationLoginHref,
  donationTier,
  dokuCheckoutUrl,
  loadDonationDraft,
  QUICK_DONATION_MESSAGES,
  rupiah,
  saveDonationDraft,
  supporterName,
} from "@/lib/donations";

const subscribeToHydration = () => () => {};

export default function DonationForm({
  initialAmount = 5000,
  demo = false,
}: {
  initialAmount?: number;
  demo?: boolean;
}) {
  const { user: sessionUser, loading: sessionLoading } = useAuth();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const user = !demo && hydrated ? sessionUser : null;
  const loading = !demo && (!hydrated || sessionLoading);
  const router = useRouter();
  const id = useId();
  const [preset, setPreset] = useState(initialAmount);
  const [custom, setCustom] = useState(
    DONATION_AMOUNTS.includes(initialAmount) ? "" : String(initialAmount),
  );
  const [message, setMessage] = useState("");
  const [showName, setShowName] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoReceipt, setDemoReceipt] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (demo) return;
    const draft = loadDonationDraft();
    if (!draft) return;
    Promise.resolve().then(() => {
      if (typeof draft.message === "string" && draft.message) {
        setMessage(draft.message.slice(0, 150));
      }
      if (typeof draft.showName === "boolean") {
        setShowName(draft.showName);
      }
    });
  }, [demo]);

  const amount = custom.trim() ? donationAmount(custom) : preset;
  const activeTier = donationTier(amount || preset || 5000);
  const previewName = showName
    ? user
      ? supporterName(user.full_name)
      : demo
        ? "Namamu di sini"
        : "Nama Profilmu"
    : "Pendukung anonim";

  return (
    <form
      className="donation-form stack"
      aria-label="Form donasi"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current || loading) return;
        setError("");
        setDemoReceipt("");
        if (!amount) {
          setError(
            "Masukkan nominal bulat mulai Rp 1.000, misalnya 5000 atau 5.000.",
          );
          return;
        }
        if (demo) {
          setDemoReceipt(
            `Simulasi berhasil: ${rupiah(amount)} dari ${showName ? "Namamu di sini" : "Pendukung anonim"}. Tidak ada pembayaran atau data yang dikirim.`,
          );
          return;
        }
        if (!user) {
          saveDonationDraft({ message: message.trim(), showName });
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
      <div className="donation-form-heading">
        <p className="eyebrow">DUKUNG SESUAI KEMAMPUANMU</p>
        <h2>Kirim dukungan & pesan semangat.</h2>
        <p className="muted donation-small">
          {demo
            ? "Coba pilih nominal dan titip pesan. Ini simulasi, tanpa pembayaran atau pengiriman data."
            : "Pesan dan namamu langsung tampil di papan dukungan setelah pembayaran terverifikasi."}
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
          name="amount"
          autoComplete="off"
          value={custom}
          placeholder="Contoh: 5.000 atau 15000"
          maxLength={24}
          aria-describedby={`${id}-amount-help`}
          aria-invalid={Boolean(custom && !amount)}
          onChange={(event) => {
            setCustom(event.target.value);
            setError("");
          }}
        />
        <p id={`${id}-amount-help`} className="muted donation-small">
          Mulai Rp 1.000. Boleh ketik 10000, 10.000, atau Rp 10.000.
        </p>
      </fieldset>

      <div className="donation-message-section stack" style={{ gap: 14 }}>
        <div className="field">
          <div className="between">
            <label htmlFor={`${id}-message`}>Pesan untuk komunitas</label>
            <span className="muted donation-small">
              {message.length}/150 · tampil di papan
            </span>
          </div>
          <textarea
            id={`${id}-message`}
            className="input"
            rows={2}
            name="message"
            maxLength={150}
            value={message}
            disabled={busy}
            placeholder="Tulis doa, harapan lulus CPNS, atau semangat untuk teman-teman pejuang NIP…"
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <div className="donation-quick-chips" aria-label="Contoh pesan cepat">
          {QUICK_DONATION_MESSAGES.map((template) => (
            <button
              key={template}
              type="button"
              className="donation-chip"
              disabled={busy}
              onClick={() => setMessage(template)}
            >
              + {template}
            </button>
          ))}
        </div>
        <div className="donation-privacy">
          <label className="inline" htmlFor={`${id}-name`}>
            <input
              id={`${id}-name`}
              type="checkbox"
              name="showName"
              checked={showName}
              disabled={busy}
              aria-describedby={`${id}-privacy-help`}
              onChange={(event) => setShowName(event.target.checked)}
            />
            Tampilkan nama singkat saya
          </label>
          <p id={`${id}-privacy-help`} className="muted donation-small">
            {showName
              ? `${previewName} akan tampil di leaderboard & papan pesan.`
              : "Nama tampil sebagai Pendukung anonim. Nominal dan pesan tetap terlihat."}{" "}
            Bisa diubah kapan saja lewat riwayat transaksi.
          </p>
        </div>
      </div>

      {(error || demoReceipt) && (
        <div className="donation-form-feedback">
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          {demoReceipt && (
            <p className="notice" role="status">
              {demoReceipt}
            </p>
          )}
        </div>
      )}
      <div
        className="donation-live-preview"
        data-tier={activeTier.key}
        aria-label="Pratinjau kartu dukungan"
      >
        <div className="between donation-preview-header">
          <span className="eyebrow" style={{ margin: 0 }}>
            PRATINJAU TAMPILAN DI PAPAN
          </span>
          <span className="donation-tier-pill" data-tier={activeTier.key}>
            <Sparkles size={12} aria-hidden="true" />
            {activeTier.label}
          </span>
        </div>
        <div className="donation-row" style={{ padding: "8px 0 4px" }}>
          <div className="donation-person">
            <strong>{previewName}</strong>
          </div>
          <strong className="donation-row-amount">
            {rupiah(amount || preset || 5000)}
          </strong>
        </div>
        <div className="donation-chat-bubble" style={{ marginTop: 6 }}>
          <MessageSquareQuote
            size={14}
            className="donation-chat-icon"
            aria-hidden="true"
          />
          <p className="donation-message-text">
            {message.trim() ||
              "Pesan atau doa yang kamu tulis akan tampil di sini…"}
          </p>
        </div>
      </div>

      <div className="donation-form-actions stack" style={{ gap: 12 }}>
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
              : demo
                ? `Coba dukungan · ${rupiah(amount || 0)}`
                : user
                  ? amount
                    ? `Lanjutkan · ${rupiah(amount)}`
                    : "Periksa nominal"
                  : "Masuk & lanjutkan donasi"}
        </button>
        {!user && !loading && !demo && (
          <p className="muted donation-small">
            Masuk dengan Google atau email agar donasi dan pesanmu tercatat.
            Nominal serta pesan yang kamu isi tetap tersimpan.
          </p>
        )}
        <p className="muted donation-small inline">
          <LockKeyhole size={14} aria-hidden="true" />
          {demo
            ? "Mode contoh · Tidak memproses pembayaran"
            : "Pembayaran melalui DOKU · Sekali bayar"}
        </p>
        <p className="muted donation-small">
          Donasi sukarela dan terpisah dari keanggotaan Pro.
        </p>
      </div>
    </form>
  );
}
