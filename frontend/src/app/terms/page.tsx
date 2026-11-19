import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  whatsappHref,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: "Ketentuan Layanan — TOCPNS",
  description:
    "Syarat dan ketentuan penggunaan platform latihan simulasi CAT CPNS, keanggotaan Pro, donasi, dan kebijakan transaksi.",
};

export default function TermsPage() {
  return (
    <AppShell
      title="Ketentuan layanan"
      description="Aturan dasar yang sederhana dan transparan agar ruang belajar tetap nyaman bagi semua peserta."
    >
      <div className="stack" style={{ maxWidth: 820 }}>
        <section className="panel stack">
          <h2>1. Ruang lingkup & independensi layanan</h2>
          <p className="muted">
            TOCPNS menyediakan layanan simulasi Computer Assisted Test (CAT),
            rekapitulasi nilai, analisis topik latihan, dan pembahasan soal
            untuk membantu persiapan mandiri peserta seleksi CPNS.
          </p>
          <p className="muted">
            <strong>Pernyataan non-afiliasi:</strong> TOCPNS adalah platform
            edukasi independen dan <strong>bukan</strong> bagian dari Badan
            Kepegawaian Negara (BKN), Kementerian PANRB, maupun instansi
            pemerintah mana pun. Nilai dan status ambang batas pada aplikasi
            merupakan indikator latihan dan bukan hasil seleksi resmi.
          </p>
        </section>

        <section className="panel stack">
          <h2>2. Akun peserta & penggunaan wajar</h2>
          <p className="muted">
            Setiap akun ditujukan untuk penggunaan pribadi satu peserta. Demi
            menjaga kelancaran server bersama, peserta diharapkan tidak
            menyebarkan kredensial akun secara massal, tidak melakukan ekstraksi
            otomatis (*scraping*) terhadap bank soal, serta tidak mengganggu
            jalannya sesi simulasi peserta lain.
          </p>
        </section>

        <section className="panel stack">
          <h2>3. Keanggotaan Pro & pembayaran</h2>
          <p className="muted">
            Keanggotaan Pro membuka seluruh paket latihan peserta Pro yang telah
            terbit dan siap selama masa aktif yang tertera saat pembelian
            (standar <strong>365 hari</strong> sejak pembayaran terverifikasi di
            server).
          </p>
          <ul className="check-list muted">
            <li>
              <span>
                • Pembayaran bersifat <strong>satu kali per masa aktif</strong>{" "}
                melalui DOKU—tidak ada pemotongan atau perpanjangan otomatis
                bulanan/tahunan.
              </span>
            </li>
            <li>
              <span>
                • Paket tryout terjadwal tetap mengikuti jadwal pembukaan dan
                aturan percobaan yang berlaku pada paket tersebut.
              </span>
            </li>
            <li>
              <span>
                • Setelah masa aktif Pro berakhir, hasil dan pembahasan dari
                sesi latihan milik sendiri yang sudah selesai tetap dapat dibaca
                melalui halaman Riwayat.
              </span>
            </li>
          </ul>
        </section>

        <section className="panel stack">
          <h2>4. Dukungan & donasi sukarela</h2>
          <p className="muted">
            Halaman Donasi disediakan bagi pengguna yang ingin membantu biaya
            pemeliharaan server dan pengembangan platform secara sukarela. Donasi
            terpisah dari pembelian Keanggotaan Pro dan tidak diperlukan untuk
            mengakses fitur yang sudah menjadi hak akunmu.
          </p>
        </section>

        <section className="panel stack">
          <h2>5. Kebijakan kendala transaksi & pengembalian dana</h2>
          <p className="muted">
            Apabila terjadi pembayaran ganda (*double payment*) atau dana telah
            terpotong tetapi status transaksi belum aktif setelah proses
            verifikasi server, silakan hubungi kontak resmi kami dengan
            menyertakan <strong>ID Transaksi (Order ID)</strong>, waktu
            pembayaran, dan bukti yang sudah menyamarkan informasi sensitif.
            Kami akan mencocokkan pembayaran dengan catatan DOKU dan memberi
            kabar tentang aktivasi akses atau pengembalian kelebihan bayar.
            Waktu pengembalian mengikuti kanal pembayaran yang digunakan.
          </p>
        </section>

        <section className="panel stack">
          <h2>6. Kontak resmi</h2>
          <p className="muted">
            Jika kamu memiliki pertanyaan mengenai ketentuan ini atau mengalami
            kendala selama menggunakan TOCPNS, silakan hubungi kami melalui:
          </p>
          <p className="muted">
            WhatsApp: <strong>{SUPPORT_WHATSAPP_DISPLAY}</strong> · Email:{" "}
            <strong>{SUPPORT_EMAIL}</strong>
          </p>
          <div className="inline">
            <Link className="button" href="/support">
              Buka halaman kontak
            </Link>
            <a
              className="button button-secondary"
              href={whatsappHref(
                "Halo Admin TOCPNS, saya ingin bertanya mengenai ketentuan layanan...",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Chat WhatsApp
            </a>
            <Link className="button button-secondary" href="/privacy">
              Kebijakan privasi
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
