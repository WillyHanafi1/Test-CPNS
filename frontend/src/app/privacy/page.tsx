import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — TOCPNS",
  description:
    "Penjelasan mengenai data yang dikumpulkan, penyimpanan sesi latihan, visibilitas peringkat dan donasi, serta perlindungan privasi di TOCPNS.",
};

export default function PrivacyPage() {
  return (
    <AppShell
      title="Kebijakan privasi"
      description="Kami hanya mengumpulkan data yang benar-benar diperlukan untuk menjalankan simulasi dan mencatat progres belajarmu."
    >
      <div className="stack" style={{ maxWidth: 820 }}>
        <section className="panel stack">
          <h2>1. Data yang kami kumpulkan</h2>
          <p className="muted">
            Saat kamu membuat akun dan berlatih di TOCPNS, kami menyimpan:
          </p>
          <ul className="check-list muted">
            <li>
              <span>
                • <strong>Data profil dasar:</strong> nama tampilan, alamat
                email, kata sandi yang di-hash dengan bcrypt (atau identitas
                email terverifikasi saat masuk dengan Google), serta nomor
                telepon dan target instansi jika kamu mengisinya secara opsional
                di halaman Akun.
              </span>
            </li>
            <li>
              <span>
                • <strong>Data latihan:</strong> waktu mulai dan selesai sesi,
                pilihan jawaban, skor TWK/TIU/TKP, serta laporan koreksi soal
                atau masukan yang kamu kirimkan.
              </span>
            </li>
            <li>
              <span>
                • <strong>Data transaksi:</strong> ID pesanan (`order_id`),
                nominal, jenis transaksi (Pro atau donasi), waktu dan status
                verifikasi pembayaran dari penyedia pembayaran resmi (DOKU). Kami
                tidak menyimpan nomor kartu kredit/debit atau kredensial
                perbankanmu di server kami.
              </span>
            </li>
          </ul>
        </section>

        <section className="panel stack">
          <h2>2. Bagaimana data digunakan</h2>
          <p className="muted">
            Data tersebut digunakan semata-mata untuk menyediakan pengalaman
            simulasi CAT, menyimpan jawaban selama ujian berlangsung,
            menampilkan hasil dan pembahasan, menyajikan analisis perkembangan
            topik belajarmu, memverifikasi masa aktif keanggotaan Pro, serta
            mengirimkan tautan pemulihan kata sandi saat kamu memintanya.
          </p>
        </section>

        <section className="panel stack">
          <h2>3. Visibilitas pada peringkat & papan donasi</h2>
          <p className="muted">
            Kami menjaga agar alamat email dan nomor teleponmu tidak pernah
            ditampilkan ke publik:
          </p>
          <ul className="check-list muted">
            <li>
              <span>
                • <strong>Peringkat latihan (`/leaderboard`):</strong> hanya
                menampilkan nama profil dan perolehan skor pada versi paket yang
                sama agar peserta dapat melihat perbandingan hasil latihan.
              </span>
            </li>
            <li>
              <span>
                • <strong>Papan dukungan (`/donasi`):</strong> kamu bebas memilih
                untuk menampilkan nama profil atau tampil sebagai{" "}
                <strong>Anonim</strong> saat mengirim dukungan, dan pilihan
                tersebut dapat diubah kapan saja melalui riwayat transaksi di
                halaman Akun (`/account`).
              </span>
            </li>
          </ul>
        </section>

        <section className="panel stack">
          <h2>4. Cookie & penyimpanan lokal</h2>
          <p className="muted">
            TOCPNS menggunakan <em>HttpOnly Cookie</em> untuk menjaga keamanan
            sesi masuk, serta penyimpanan lokal browser (`localStorage` dan
            `sessionStorage`) untuk menyimpan pilihan tema tampilan (Terang /
            Gelap / Sistem) dan cadangan sementara antrean jawaban ujian ketika
            koneksi terputus. Cadangan jawaban lokal otomatis dibersihkan saat
            kamu keluar dari akun.
          </p>
        </section>

        <section className="panel stack">
          <h2>5. Pengelolaan & penghapusan data</h2>
          <p className="muted">
            Kamu dapat memperbarui nama lengkap, nomor telepon, dan target
            instansi kapan saja melalui halaman <strong>Akun</strong>. Apabila
            kamu ingin meminta koreksi data atau penghapusan akun beserta
            seluruh riwayatnya, hubungi kami melalui{" "}
            <strong>{SUPPORT_EMAIL}</strong> atau WhatsApp{" "}
            <strong>{SUPPORT_WHATSAPP_DISPLAY}</strong>.
          </p>
          <div className="inline">
            <Link className="button" href="/account">
              Kelola profil akun
            </Link>
            <Link className="button button-secondary" href="/support">
              Kontak & dukungan
            </Link>
            <Link className="button button-secondary" href="/terms">
              Ketentuan layanan
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
