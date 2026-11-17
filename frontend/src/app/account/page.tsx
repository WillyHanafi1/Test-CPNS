"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { api, dateLabel } from "@/lib/api";
import Modal from "@/components/Modal";
import { useTheme } from "@/context/ThemeContext";
import { ThemePreference } from "@/lib/theme";
type Transaction = {
  id: string;
  order_id: string;
  amount: number;
  payment_status: string;
  transaction_type: string;
  created_at: string;
  payment_url?: string;
};
export default function Account() {
  const { user, loading, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const router = useRouter();
  const transactions = useResource<Transaction[]>(
    "/transactions/my-transactions",
    !!user,
  );
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
      description="Keanggotaan, transaksi, dan bantuan dalam satu tempat."
    >
      <div className="two-column">
        <div className="stack">
          <section className="panel stack">
            <h2>{user.full_name || "Profil peserta"}</h2>
            <p className="muted">{user.email}</p>
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
                  className="history-row"
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
          </section>
        </div>
        <aside className="panel stack">
          <h2>Tampilan</h2>
          <label className="field">
            Tema aplikasi
            <select
              className="input"
              value={preference}
              onChange={(e) => setPreference(e.target.value as ThemePreference)}
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
          <h2>Bantuan dan masukan</h2>
          <Link className="button button-secondary" href="/faq">
            Buka panduan
          </Link>
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
                    category: "suggestion",
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
              Kirim masukan
              <textarea
                className="input"
                rows={4}
                minLength={10}
                maxLength={3000}
                required
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
          <>
            <p>
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
              Status ini berasal dari catatan transaksi akunmu.
            </p>
            {receipt.payment_status === "pending" && receipt.payment_url && (
              <a className="button" href={receipt.payment_url} rel="noreferrer">
                Lanjutkan pembayaran
              </a>
            )}
          </>
        )}
      </Modal>
    </AppShell>
  );
}
