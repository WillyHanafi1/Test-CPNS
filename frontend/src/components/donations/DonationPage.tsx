"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Heart, RefreshCw, Server, Wrench } from "lucide-react";
import { ErrorPanel, Loading } from "@/components/AppShell";
import { DonationPeriod, donationAmount } from "@/lib/donations";
import DonationForm from "./DonationForm";
import {
  DonationProgress,
  RecentList,
  SupporterList,
  useDonations,
} from "./DonationDisplay";

function DonationQueryForm() {
  const params = useSearchParams();
  const initialAmount = donationAmount(params.get("amount") || "5000") || 5000;
  return <DonationForm initialAmount={initialAmount} />;
}

export default function DonationPage() {
  const [period, setPeriod] = useState<DonationPeriod>("month");
  const { data, error, loading, refreshing, reload } = useDonations(period);
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
          Kalau TOCPNS membantu perjalanan belajarmu, kamu bisa ikut merawatnya
          dan meninggalkan pesan semangat untuk sesama pejuang CPNS.
        </p>
      </div>
      <div className="donation-layout">
        <aside className="panel donation-form-panel">
          <Suspense fallback={<Loading label="Menyiapkan formulir donasi…" />}>
            <DonationQueryForm />
          </Suspense>
        </aside>
        <div className="donation-data-column stack">
          <section className="panel stack" aria-label="Dukungan komunitas">
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
            {loading ? (
              <Loading label="Memuat dukungan komunitas…" />
            ) : (
              <>
                {error && <ErrorPanel message={error} retry={reload} />}
                {data && (
                  <DonationProgress
                    stats={data.stats}
                    periodLabel={data.period_label}
                  />
                )}
              </>
            )}
          </section>
          <section className="panel" aria-labelledby="donation-board-title">
            <div>
              <p className="eyebrow">TERIMA KASIH SUDAH IKUT MERAWAT</p>
              <h2 id="donation-board-title">Papan dukungan</h2>
              <p className="muted donation-small">
                Peringkat total donasi publik per akun beserta pesan terbaru
                mereka. Semua nominal sama berartinya.
              </p>
            </div>
            {loading ? (
              <Loading />
            ) : data ? (
              <SupporterList rows={data.top_supporters} />
            ) : (
              <p className="donation-empty muted">
                Daftar belum tersedia. Kamu bisa mencoba muat ulang di atas.
              </p>
            )}
            <p className="muted donation-small donation-board-note">
              Nama dan pesan ditampilkan sesuai pilihan pendukung. Donasi anonim
              ikut total dan tampil di daftar pesan terbaru tanpa membuka nama.
            </p>
          </section>
          <section className="panel" aria-labelledby="donation-recent-title">
            <p className="eyebrow">PESAN & DOA KOMUNITAS</p>
            <h2 id="donation-recent-title">Dukungan terbaru</h2>
            <p className="muted donation-small">
              Besar atau kecil, setiap dukungan dan pesan semangat punya tempat
              di sini.
            </p>
            {loading ? (
              <Loading />
            ) : data ? (
              <RecentList rows={data.recent_supporters} />
            ) : (
              <p className="donation-empty muted">
                Dukungan terbaru belum dapat dimuat.
              </p>
            )}
          </section>
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
              title: "Pengalaman yang dirawat",
              text: "Mendukung pemeliharaan, perbaikan kendala, dan kenyamanan saat latihan.",
            },
            {
              icon: BookOpen,
              title: "Latihan yang berkembang",
              text: "Membantu waktu pengembangan platform dan penyempurnaan pengalaman belajar.",
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
          Target bulanan adalah sasaran dukungan operasional, bukan rincian
          pengeluaran yang sudah dibelanjakan.
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
            "Apakah donasi memberi keanggotaan Pro?",
            "Donasi membantu operasional platform dan tidak mengaktifkan Pro. Keanggotaan tersedia terpisah melalui halaman Keanggotaan.",
          ],
          [
            "Apakah nama saya harus tampil?",
            "Tidak wajib. Secara default nama profilmu ditampilkan agar masuk ke papan dukungan bersama pesanmu. Jika ingin anonim, cukup matikan centang tampilkan nama sebelum membayar atau ubah kapan saja melalui riwayat transaksi di Akun.",
          ],
          [
            "Bagaimana pembayaran dan konfirmasinya?",
            "Pembayaran dilakukan melalui DOKU dengan metode yang tersedia di halaman checkout. Setelah pembayaran berhasil dikonfirmasi, dukungan dan pesan langsung masuk ke papan dukungan. Status juga tersedia di riwayat transaksi akunmu.",
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
