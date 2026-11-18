"use client";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { whatsappHref } from "@/lib/contact";
export default function Failed() {
  return (
    <AppShell
      title="Pembayaran belum selesai"
      description="Jangan khawatir, kamu dapat memeriksa catatan transaksi atau menghubungi bantuan jika membutuhkan konfirmasi."
    >
      <section className="panel stack" style={{ maxWidth: 620 }}>
        <p className="muted">
          Periksa status transaksi di akun sebelum mencoba pembayaran kembali
          agar tidak terjadi pembayaran ganda.
        </p>
        <div className="inline">
          <Link className="button" href="/account">
            Buka riwayat transaksi
          </Link>
          <Link className="button button-secondary" href="/support">
            Kontak & bantuan
          </Link>
          <a
            className="button button-secondary"
            href={whatsappHref(
              "Halo Admin TOCPNS, saya mengalami kendala saat melakukan pembayaran...",
            )}
            target="_blank"
            rel="noreferrer"
          >
            Chat WhatsApp
          </a>
        </div>
        <Link className="muted" href="/catalog">
          ← Kembali ke paket soal
        </Link>
      </section>
    </AppShell>
  );
}
