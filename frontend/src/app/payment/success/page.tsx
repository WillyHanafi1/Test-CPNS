"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/context/AuthContext";
import { dateLabel, recalledPayment } from "@/lib/api";
import { whatsappHref } from "@/lib/contact";
function Status() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, refreshSession } = useAuth();
  const [order, setOrder] = useState("");
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() =>
      setOrder(
        params.get("order_id") || (user ? recalledPayment(user.id) : ""),
      ),
    );
  }, [params, user]);
  useEffect(() => {
    if (!authLoading && !user)
      router.replace(
        `/login?next=${encodeURIComponent("/payment/success" + (order ? "?order_id=" + order : ""))}`,
      );
  }, [authLoading, user, order, router]);
  const { data, error, loading, reload } = useResource<{
    status: string;
    is_pro: boolean;
    expires_at: string | null;
    order_id: string;
    transaction_type: string;
    amount: number;
    payment_url: string | null;
    payment_expires_at: string | null;
  }>(`/transactions/status/${encodeURIComponent(order)}`, !!order && !!user);
  useEffect(() => {
    if (data?.status === "success") {
      refreshSession().catch(() => {});
      return;
    }
    if (data?.status !== "pending" || slow) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > 120000) setSlow(true);
      else reload();
    }, 3000);
    return () => clearInterval(t);
  }, [data?.status, reload, slow, refreshSession]);
  return (
    <AppShell
      title="Status pembayaran"
      description="Kami memeriksa catatan transaksi di server."
    >
      {authLoading || (loading && !data) ? (
        <Loading label="Memverifikasi transaksi…" />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : !order ? (
        <section className="panel stack">
          <h2>Pilih transaksi yang ingin diperiksa.</h2>
          <p className="muted">Tidak ada ID transaksi pada halaman ini.</p>
          <div className="inline">
            <Link className="button" href="/account">
              Buka riwayat transaksi
            </Link>
            <Link className="button button-secondary" href="/support">
              Kontak & dukungan
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel stack" style={{ maxWidth: 650 }}>
          <ol className="payment-steps" aria-label="Progres pembayaran">
            <li>✓ Pesanan dibuat</li>
            <li aria-current={data?.status === "pending" ? "step" : undefined}>
              2. Pembayaran
            </li>
            <li aria-current={data?.status === "success" ? "step" : undefined}>
              3. Terverifikasi
            </li>
          </ol>
          <span
            className={`badge ${data?.status === "success" ? "badge-green" : "badge-amber"}`}
          >
            {data?.status === "success"
              ? "Terverifikasi"
              : data?.status === "pending"
                ? "Menunggu"
                : "Belum berhasil"}
          </span>
          <h2>
            {data?.status === "success"
              ? data.transaction_type === "donation"
                ? "Terima kasih atas dukunganmu."
                : "Pembayaran berhasil diverifikasi."
              : data?.status === "pending"
                ? "Pembayaran masih menunggu konfirmasi."
                : "Pembayaran belum berhasil."}
          </h2>
          <p className="muted">
            {data?.status === "success"
              ? data.transaction_type === "donation"
                ? "Dukunganmu sudah tercatat. Terima kasih telah membantu ruang latihan ini tetap berjalan."
                : data.is_pro
                  ? `Pro aktif ${data.expires_at ? "sampai " + dateLabel(data.expires_at) : "tanpa batas waktu"}.`
                  : "Transaksi tercatat berhasil. Periksa detail akses melalui akun."
              : "Kembali dari halaman penyedia pembayaran tidak otomatis berarti pembayaran berhasil. Periksa kembali atau lanjutkan melalui riwayat transaksi."}
          </p>
          {data?.amount && (
            <p>
              <strong>Rp {data.amount.toLocaleString("id-ID")}</strong> ·{" "}
              {data.transaction_type === "donation"
                ? "Dukungan komunitas"
                : "Keanggotaan Pro"}
            </p>
          )}
          {slow && data?.status === "pending" && (
            <p className="notice" role="status">
              Konfirmasi membutuhkan waktu lebih lama. Kamu boleh menutup
              halaman ini dan memeriksa lewat Akun. Hindari membayar ulang
              sebelum statusnya jelas.
            </p>
          )}
          <p className="muted transaction-id" style={{ fontSize: 13 }}>
            ID: {order}
          </p>
          <div className="inline">
            {data?.status === "pending" && data.payment_url && (
              <a className="button" href={data.payment_url} rel="noreferrer">
                Lanjutkan pembayaran
              </a>
            )}
            {data?.status === "success" ? (
              <>
                <Link
                  className="button"
                  href={
                    data.transaction_type === "donation"
                      ? "/donasi"
                      : "/catalog"
                  }
                >
                  {data.transaction_type === "donation"
                    ? "Lihat dukungan komunitas"
                    : "Buka paket soal"}
                </Link>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => window.print()}
                >
                  Cetak bukti
                </button>
              </>
            ) : (
              <button
                className="button"
                onClick={() => {
                  setSlow(false);
                  reload();
                }}
              >
                Periksa lagi
              </button>
            )}
            <Link className="button button-secondary" href="/account">
              Riwayat transaksi
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Ada kendala verifikasi?{" "}
            <a
              href={whatsappHref(
                `Halo Admin TOCPNS, mohon bantu periksa transaksi saya dengan ID: ${order}`,
              )}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent)" }}
            >
              Chat WhatsApp Admin
            </a>{" "}
            atau buka{" "}
            <Link href="/support" style={{ color: "var(--accent)" }}>
              halaman bantuan
            </Link>
            .
          </p>
        </section>
      )}
    </AppShell>
  );
}
export default function Payment() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <Loading />
        </AppShell>
      }
    >
      <Status />
    </Suspense>
  );
}
