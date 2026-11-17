"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell, { Loading, ErrorPanel } from "@/components/AppShell";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/context/AuthContext";
import { dateLabel } from "@/lib/api";
function Status() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, refreshSession } = useAuth();
  const [order, setOrder] = useState("");
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() =>
      setOrder(
        params.get("order_id") || sessionStorage.getItem("payment_order") || "",
      ),
    );
  }, [params]);
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
      {authLoading || loading ? (
        <Loading label="Memverifikasi transaksi…" />
      ) : error ? (
        <ErrorPanel message={error} retry={reload} />
      ) : !order ? (
        <section className="panel stack">
          <h2>Pilih transaksi yang ingin diperiksa.</h2>
          <p className="muted">Tidak ada ID transaksi pada halaman ini.</p>
          <Link className="button" href="/account">
            Buka riwayat transaksi
          </Link>
        </section>
      ) : (
        <section className="panel stack" style={{ maxWidth: 650 }}>
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
              ? "Pembayaran berhasil diverifikasi."
              : data?.status === "pending"
                ? "Pembayaran masih menunggu konfirmasi."
                : "Pembayaran belum berhasil."}
          </h2>
          <p className="muted">
            {data?.status === "success"
              ? data.is_pro
                ? `Pro aktif ${data.expires_at ? "sampai " + dateLabel(data.expires_at) : "tanpa batas waktu"}.`
                : "Transaksi tercatat berhasil. Periksa detail akses melalui akun."
              : "Kembali dari halaman penyedia pembayaran tidak otomatis berarti pembayaran berhasil. Periksa kembali atau lanjutkan melalui riwayat transaksi."}
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            ID: {order}
          </p>
          <div className="inline">
            {data?.status === "success" ? (
              <Link className="button" href="/catalog">
                Buka paket soal
              </Link>
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
