"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Heart, RefreshCw, Server, Wrench } from "lucide-react";
import { ErrorPanel, Loading } from "@/components/AppShell";
import { DonationPeriod, donationAmount } from "@/lib/donations";
import DonationForm from "./DonationForm";
import { useDonations } from "./DonationDisplay";

import DonationCommunity from "./DonationCommunity";

function DonationQueryForm() {
  const params = useSearchParams();
  const initialAmount = donationAmount(params.get("amount") || "5000") || 5000;
  return <DonationForm initialAmount={initialAmount} />;
}

export default function DonationPage() {
  const [period, setPeriod] = useState<DonationPeriod>("month");
  const { data, error, loading, refreshing, reload } = useDonations(period, 20);
  return (
    <div className="donation-page">
      <div className="donation-page-heading">
        <span className="badge">
          <Heart size={14} />
          Dukungan sukarela
        </span>
        <h1>
          Dukungan kecil.
          <br />
          <span className="donation-accent">Ruang belajar yang terawat.</span>
        </h1>
        <p className="muted">
          Dukungan sukarela membantu biaya server, pemeliharaan sistem,
          perbaikan bug, dan pengembangan kode agar TOCPNS tetap nyaman
          digunakan. Kamu juga bisa meninggalkan pesan semangat untuk sesama
          pejuang CPNS.
        </p>
      </div>
      <div className="donation-layout">
        <section
          id="donation-form"
          className="panel donation-form-panel"
          aria-label="Kirim dukungan"
        >
          <Suspense fallback={<Loading label="Menyiapkan formulir donasi…" />}>
            <DonationQueryForm />
          </Suspense>
        </section>
        <div className="donation-data-column stack">
          <div className="between donation-controls">
            <div
              className="donation-periods"
              role="group"
              aria-label="Periode dukungan"
            >
              <button
                type="button"
                className="filter"
                aria-pressed={period === "month"}
                onClick={() => setPeriod("month")}
              >
                Bulan ini
              </button>
              <button
                type="button"
                className="filter"
                aria-pressed={period === "all"}
                onClick={() => setPeriod("all")}
              >
                Semua waktu
              </button>
            </div>
            <button
              type="button"
              className="button button-small button-quiet"
              aria-label="Muat ulang dukungan"
              disabled={loading || refreshing}
              onClick={reload}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
          {error && <ErrorPanel message={error} retry={reload} />}
          {loading ? (
            <Loading label="Memuat dukungan komunitas…" />
          ) : (
            data && <DonationCommunity data={data} format="overlay" />
          )}
        </div>
      </div>
      <section
        className="donation-purpose"
        aria-labelledby="donation-purpose-title"
      >
        <div>
          <p className="eyebrow">DUKUNGANMU MEMBANTU</p>
          <h2 id="donation-purpose-title">
            Merawat hal-hal di balik latihanmu.
          </h2>
        </div>
        <div className="donation-purpose-grid">
          {[
            {
              icon: Server,
              title: "Platform tetap berjalan",
              text: "Membantu biaya server dan layanan yang digunakan untuk menjalankan TOCPNS.",
            },
            {
              icon: Wrench,
              title: "Maintenance & perbaikan bug",
              text: "Mendukung pemeliharaan sistem, perbaikan bug, dan menjaga kenyamanan saat latihan.",
            },
            {
              icon: BookOpen,
              title: "Pengembangan kode & materi",
              text: "Membantu pembaruan kode, peningkatan fitur, dan penyempurnaan pengalaman belajar.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <article className="panel stack" key={title}>
              <Icon size={23} className="donation-accent" aria-hidden="true" />
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </article>
          ))}
        </div>
        <p className="muted donation-small">
          Target bulanan adalah sasaran dukungan operasional, bukan laporan
          detail pengeluaran yang sudah dibelanjakan.
        </p>
      </section>
      <section
        className="panel donation-faq"
        aria-labelledby="donation-faq-title"
      >
        <h2 id="donation-faq-title">Sebelum mendukung</h2>
        {[
          [
            "Apakah donasi wajib?",
            "Tidak. Dukungan sepenuhnya sukarela. Kamu tetap bisa menggunakan paket yang termasuk dalam akunmu tanpa berdonasi.",
          ],
          [
            "Apakah donasi memberi Paket Pro?",
            "Donasi membantu operasional platform dan tidak mengaktifkan Pro. Paket Pro tersedia terpisah melalui halaman Paket Pro.",
          ],
          [
            "Apakah nama saya harus tampil?",
            "Tidak wajib. Jika centang tampilkan nama aktif, nama profilmu terlihat di halaman donasi publik dan dashboard akun. Jika dimatikan, namamu diganti menjadi Anonim pada kedua tampilan. Nominal dan pesan tetap terlihat, termasuk di leaderboard dan pin jika menjadi pendukung teratas. Pilihan nama ini dapat diubah kapan saja melalui riwayat transaksi di Akun.",
          ],
          [
            "Bagaimana pembayaran dan konfirmasinya?",
            "Masuk akun untuk mengirim donasi. Pembayaran dilakukan melalui DOKU dengan metode yang tersedia di halaman checkout. Setelah pembayaran terverifikasi, dukungan dan pesan masuk ke papan publik serta dashboard, menggunakan nama profil atau Anonim sesuai pilihanmu. Status tersedia di riwayat transaksi akunmu.",
          ],
          [
            "Apakah ini pembayaran berulang?",
            "Tidak. Setiap donasi adalah satu pembayaran. Tidak ada penagihan donasi otomatis.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p className="muted">{answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
