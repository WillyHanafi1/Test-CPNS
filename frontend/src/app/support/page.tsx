"use client";
import Link from "next/link";
import AppShell from "@/components/AppShell";
export default function Support() {
  return (
    <AppShell
      title="Dukungan untuk ruang latihan"
      description="Masukanmu membantu kami merawat pengalaman belajar."
    >
      <section className="panel stack" style={{ maxWidth: 700 }}>
        <h2>Setiap perbaikan dimulai dari masukan.</h2>
        <p className="muted">
          Laporkan soal melalui pembahasan agar konteksnya tercatat. Untuk
          kendala aplikasi atau transaksi, kirim masukan melalui halaman akun.
        </p>
        <div className="inline">
          <Link className="button" href="/account">
            Kirim masukan
          </Link>
          <Link className="button button-secondary" href="/faq">
            Panduan aplikasi
          </Link>
        </div>
        <hr style={{ borderColor: "var(--line)" }} />
        <h3>Dukungan sukarela</h3>
        <p className="muted">
          Dukungan sukarela terpisah dari pembelian keanggotaan dan tidak
          diperlukan untuk menggunakan paket yang sudah termasuk dalam akunmu.
        </p>
        <Link className="button button-secondary" href="/donasi">
          Buka halaman donasi
        </Link>
      </section>
    </AppShell>
  );
}
