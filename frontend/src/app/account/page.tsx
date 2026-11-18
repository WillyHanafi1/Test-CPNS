"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { api, dateLabel } from "@/lib/api";
import Modal from "@/components/Modal";
import DonationVisibility from "@/components/donations/DonationVisibility";
import { useTheme } from "@/context/ThemeContext";
import { ThemePreference } from "@/lib/theme";
import {
  FEEDBACK_CATEGORIES,
  FeedbackCategory,
  whatsappHref,
} from "@/lib/contact";

type Transaction = {
  id: string;
  order_id: string;
  amount: number;
  payment_status: string;
  transaction_type: string;
  created_at: string;
  payment_url?: string;
  is_anonymous?: boolean;
};

export default function Account() {
  const { user, loading, logout, refreshSession } = useAuth();
  const { preference, setPreference } = useTheme();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const transactions = useResource<Transaction[]>(
    `/transactions/my-transactions?limit=20&offset=${page * 20}`,
    !!user,
  );

  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [targetInstansi, setTargetInstansi] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");

  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/account");
  }, [loading, user, router]);

  if (loading || !user)
    return (
      <AppShell>
        <Loading />
      </AppShell>
    );

  return (
    <AppShell
      title="Akunmu"
      description="Profil, keanggotaan, transaksi, dan bantuan dalam satu tempat."
    >
      <div className="two-column">
        <div className="stack">
          <section className="panel stack">
            <div className="between">
              <div>
                <h2>{user.full_name || "Profil peserta"}</h2>
                <p className="muted">{user.email}</p>
              </div>
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={() => {
                  if (!editingProfile) {
                    setFullName(user.full_name || "");
                    setPhoneNumber(user.phone_number || "");
                    setTargetInstansi(user.target_instansi || "");
                  }
                  setEditingProfile((v) => !v);
                  setProfileNotice("");
                  setProfileError("");
                }}
              >
                {editingProfile ? "Tutup" : "Ubah profil"}
              </button>
            </div>
            {(user.phone_number || user.target_instansi) && !editingProfile && (
              <div className="inline muted" style={{ fontSize: 13 }}>
                {user.phone_number && <span>HP/WA: {user.phone_number}</span>}
                {user.phone_number && user.target_instansi && <span>·</span>}
                {user.target_instansi && (
                  <span>Target: {user.target_instansi}</span>
                )}
              </div>
            )}
            {profileNotice && !editingProfile && (
              <p className="notice" role="status">
                {profileNotice}
              </p>
            )}
            {editingProfile && (
              <form
                className="stack"
                style={{
                  paddingTop: 12,
                  borderTop: "1px solid var(--line)",
                }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setProfileBusy(true);
                  setProfileNotice("");
                  setProfileError("");
                  try {
                    await api("/user/me/profile", {
                      method: "PUT",
                      body: JSON.stringify({
                        full_name: fullName,
                        phone_number: phoneNumber || null,
                        target_instansi: targetInstansi || null,
                      }),
                    });
                    await refreshSession();
                    setEditingProfile(false);
                    setProfileNotice("Profil berhasil diperbarui.");
                  } catch (e) {
                    setProfileError(
                      e instanceof Error
                        ? e.message
                        : "Profil belum berhasil disimpan.",
                    );
                  } finally {
                    setProfileBusy(false);
                  }
                }}
              >
                <label className="field">
                  Nama lengkap
                  <input
                    className="input"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Nomor HP / WhatsApp (opsional)
                  <input
                    className="input"
                    type="tel"
                    maxLength={20}
                    placeholder="Contoh: 0812-3456-7890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </label>
                <label className="field">
                  Target instansi (opsional)
                  <input
                    className="input"
                    maxLength={255}
                    placeholder="Contoh: Kementerian Keuangan / Pemprov..."
                    value={targetInstansi}
                    onChange={(e) => setTargetInstansi(e.target.value)}
                  />
                </label>
                {profileError && <ErrorPanel message={profileError} />}
                <div className="inline">
                  <button className="button button-small" disabled={profileBusy}>
                    {profileBusy ? "Menyimpan…" : "Simpan profil"}
                  </button>
                  <button
                    type="button"
                    className="button button-small button-secondary"
                    onClick={() => setEditingProfile(false)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
            <div className="notice">
              <div>
                <strong>{user.is_pro ? "Pro aktif" : "Akun gratis"}</strong>
                <p>
                  {user.is_pro
                    ? `Aktif ${user.pro_expires_at ? "sampai " + dateLabel(user.pro_expires_at) : "tanpa batas waktu"}`
                    : "Paket gratis tersedia untuk memulai latihan."}
                </p>
              </div>
              <Link className="button button-secondary" href="/catalog/upgrade">
                {user.is_pro ? "Detail keanggotaan" : "Lihat Pro"}
              </Link>
            </div>
          </section>

          <section className="panel stack">
            <div className="between">
              <h2>Riwayat transaksi</h2>
              <button
                className="button button-small button-secondary"
                onClick={transactions.reload}
              >
                Perbarui
              </button>
            </div>
            {transactions.loading ? (
              <Loading />
            ) : transactions.error ? (
              <ErrorPanel
                message={transactions.error}
                retry={transactions.reload}
              />
            ) : !transactions.data?.length ? (
              <p className="muted">Belum ada transaksi.</p>
            ) : (
              transactions.data.map((t) => (
                <div
                  key={t.id}
                  className="history-row transaction-row"
                  style={{
                    paddingBottom: 16,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div>
                    <strong>
                      {t.transaction_type === "pro_upgrade"
                        ? "Keanggotaan Pro"
                        : "Dukungan"}
                    </strong>
                    <p className="muted" style={{ fontSize: 13 }}>
                      {dateLabel(t.created_at)} · Rp{" "}
                      {t.amount.toLocaleString("id-ID")}
                    </p>
                    <span
                      className={`badge ${t.payment_status === "success" ? "badge-green" : "badge-neutral"}`}
                    >
                      {t.payment_status === "success"
                        ? "Berhasil"
                        : t.payment_status === "pending"
                          ? "Menunggu pembayaran"
                          : "Tidak berhasil"}
                    </span>
                  </div>
                  <div className="inline">
                    <button
                      className="button button-small button-secondary"
                      onClick={() => setReceipt(t)}
                    >
                      Rincian
                    </button>
                    {t.transaction_type === "donation" && t.order_id && (
                      <DonationVisibility
                        key={`${t.order_id}:${t.is_anonymous}`}
                        orderId={t.order_id}
                        anonymous={t.is_anonymous ?? true}
                        onUpdated={transactions.reload}
                      />
                    )}
                    {t.payment_status === "pending" && t.order_id && (
                      <Link
                        className="button button-small"
                        href={`/payment/success?order_id=${encodeURIComponent(t.order_id)}`}
                      >
                        Periksa
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
            <div className="between">
              <button
                className="button button-small button-secondary"
                disabled={page === 0 || transactions.loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Sebelumnya
              </button>
              <span className="muted">Halaman {page + 1}</span>
              <button
                className="button button-small button-secondary"
                disabled={
                  transactions.loading || (transactions.data?.length || 0) < 20
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </button>
            </div>
          </section>
        </div>

        <aside className="panel stack">
          <h2>Tampilan</h2>
          <label className="field">
            Tema aplikasi
            <select
              className="input"
              value={preference}
              onChange={(e) =>
                setPreference(e.target.value as ThemePreference)
              }
            >
              <option value="system">Ikuti perangkat</option>
              <option value="dark">Gelap</option>
              <option value="light">Terang</option>
            </select>
          </label>
          <p className="muted">
            Pilihan tersimpan di browser ini dan berlaku di seluruh halaman.
          </p>
          <hr style={{ borderColor: "var(--line)" }} />
          <h2>Keamanan akun</h2>
          <Link className="button button-secondary" href="/forgot-password">
            Ubah kata sandi melalui email
          </Link>
          <p className="muted">
            Mengganti kata sandi akan mengakhiri sesi masuk lama.
          </p>
          <hr style={{ borderColor: "var(--line)" }} />
          <h2>Bantuan dan masukan</h2>
          <div className="inline">
            <Link className="button button-small button-secondary" href="/faq">
              Panduan (FAQ)
            </Link>
            <Link
              className="button button-small button-secondary"
              href="/support"
            >
              Kontak admin
            </Link>
          </div>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setNotice("");
              setError("");
              try {
                await api("/user/feedback", {
                  method: "POST",
                  body: JSON.stringify({
                    category,
                    content: message,
                    path_context: "/account",
                  }),
                });
                setMessage("");
                setNotice("Masukan terkirim. Terima kasih.");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Masukan belum terkirim.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Kategori masukan
              <select
                className="input"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as FeedbackCategory)
                }
              >
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Pesan masukan
              <textarea
                className="input"
                rows={4}
                minLength={5}
                maxLength={3000}
                required
                placeholder="Sampaikan saran, kendala teknis, atau pertanyaan transaksi…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Mengirim…" : "Kirim masukan"}
            </button>
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            {error && <ErrorPanel message={error} />}
          </form>
          <button
            className="button button-secondary"
            onClick={() => logout().catch((e) => setError(e.message))}
          >
            Keluar dari akun
          </button>
        </aside>
      </div>
      <Modal
        open={!!receipt}
        title="Rincian transaksi"
        onClose={() => setReceipt(null)}
      >
        {receipt && (
          <div className="stack" style={{ gap: 14 }}>
            <p className="transaction-id">
              <strong>{receipt.order_id}</strong>
            </p>
            <p>
              {dateLabel(receipt.created_at)} · Rp{" "}
              {receipt.amount.toLocaleString("id-ID")}
            </p>
            <p>
              Status:{" "}
              {receipt.payment_status === "success"
                ? "Berhasil"
                : receipt.payment_status === "pending"
                  ? "Menunggu"
                  : "Tidak berhasil"}
            </p>
            <p className="muted">
              Status ini berasal dari catatan transaksi akunmu di server.
            </p>
            <div className="inline">
              {receipt.payment_status === "pending" && receipt.payment_url && (
                <a className="button" href={receipt.payment_url} rel="noreferrer">
                  Lanjutkan pembayaran
                </a>
              )}
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={() => window.print()}
              >
                Cetak bukti
              </button>
              <a
                className="button button-small button-secondary"
                href={whatsappHref(
                  `Halo Admin TOCPNS, mohon bantu periksa transaksi saya dengan ID: ${receipt.order_id}`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Tanya admin
              </a>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
