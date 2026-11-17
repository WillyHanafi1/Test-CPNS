"use client";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/lib/useResource";
import { api, dateLabel } from "@/lib/api";
type Offer = {
  price: number;
  duration_days: number;
  environment: string;
  checkout_available: boolean;
};
export default function Upgrade() {
  const { user } = useAuth();
  const { data, error, loading, reload } =
    useResource<Offer>("/membership/offer");
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");
  return (
    <AppShell
      title="Satu keanggotaan. Ruang latihan lebih luas."
      description="Seluruh paket yang tersedia dalam cakupan Pro, dengan hasil dan pembahasan untuk setiap latihan."
    >
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorPanel message={error} retry={reload} />
      ) : (
        <div className="two-column">
          <section className="panel stack">
            <h2>Fokus pada latihanmu.</h2>
            <ul className="check-list">
              {[
                "Akses seluruh paket peserta Pro yang terbit dan siap.",
                "Pembahasan tersedia setelah latihan selesai.",
                "Latihan mandiri dapat diulang; acara terjadwal mengikuti aturannya.",
                "Hasil dan pembahasan sesi sendiri tetap dapat dibaca setelah Pro berakhir.",
              ].map((t) => (
                <li key={t}>
                  <Check size={19} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="muted">
              Tidak ada biaya otomatis bulanan. Perpanjangan dilakukan melalui
              pembelian baru.
            </p>
            <Link className="muted" href="/catalog">
              Lihat paket yang tersedia →
            </Link>
          </section>
          <aside className="panel stack">
            <span className="badge">PRO</span>
            <h2 style={{ fontSize: 40 }}>
              Rp {data.price.toLocaleString("id-ID")}
            </h2>
            <p className="muted">Untuk {data.duration_days} hari akses.</p>
            {data.environment !== "production" && (
              <div className="notice notice-warning">
                Mode sandbox. Pembayaran ini adalah simulasi dan bukan
                pembayaran sungguhan.
              </div>
            )}
            {user?.is_pro && (
              <p className="notice">
                Keanggotaanmu aktif{" "}
                {user.pro_expires_at
                  ? `sampai ${dateLabel(user.pro_expires_at)}`
                  : "tanpa batas waktu"}
                .
              </p>
            )}
            {payError && <ErrorPanel message={payError} />}
            {!user ? (
              <Link className="button" href="/login?next=/catalog/upgrade">
                Masuk untuk melanjutkan
              </Link>
            ) : !user.pro_expires_at && user.is_pro ? (
              <Link className="button" href="/catalog">
                Buka paket soal
              </Link>
            ) : (
              <button
                className="button"
                disabled={busy || !data.checkout_available}
                onClick={async () => {
                  setBusy(true);
                  setPayError("");
                  try {
                    const d = await api<{
                      redirect_url: string;
                      order_id: string;
                    }>(
                      `/transactions/upgrade-pro?callback_url=${encodeURIComponent(window.location.origin + "/payment/success")}`,
                      { method: "POST" },
                    );
                    sessionStorage.setItem("payment_order", d.order_id);
                    window.location.assign(d.redirect_url);
                  } catch (e) {
                    setPayError(
                      e instanceof Error
                        ? e.message
                        : "Pembayaran belum dapat dimulai.",
                    );
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? "Menyiapkan pembayaran…"
                  : !data.checkout_available
                    ? "Pembayaran belum tersedia"
                    : user.is_pro
                      ? "Perpanjang Pro"
                      : "Lanjutkan ke pembayaran"}
              </button>
            )}
            <p className="muted" style={{ fontSize: 13 }}>
              Aktivasi mengikuti verifikasi pembayaran di server. Paket
              terjadwal tetap mengikuti jadwalnya.
            </p>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
