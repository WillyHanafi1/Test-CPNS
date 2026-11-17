"use client";
import Link from "next/link";
import AppShell from "@/components/AppShell";
export default function Failed() {
  return (
    <AppShell title="Pembayaran belum selesai">
      <section className="panel stack">
        <p className="muted">
          Periksa status transaksi di akun sebelum mencoba pembayaran kembali.
        </p>
        <Link className="button" href="/account">
          Buka riwayat transaksi
        </Link>
        <Link className="muted" href="/catalog">
          Kembali ke paket soal
        </Link>
      </section>
    </AppShell>
  );
}
