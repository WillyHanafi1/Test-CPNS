import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  whatsappHref,
} from "@/lib/contact";

export default function Help() {
  return (
    <AppShell
      title="Ada yang ingin ditanyakan?"
      description="Panduan singkat agar latihanmu tetap lancar."
    >
      <div className="stack" style={{ maxWidth: 780 }}>
        {[
          [
            "Bagaimana cara mulai latihan?",
            "Pilih paket pada katalog, masuk ke akun, lalu baca persiapan dan tekan Mulai ujian. Timer baru dimulai setelah sesi dibuat.",
          ],
          [
            "Apa yang termasuk dalam Paket Pro?",
            "Semua paket soal peserta yang terbit dan siap selama masa aktif (365 hari sejak pembayaran terverifikasi). Tidak ada tagihan berulang otomatis. Jadwal dan aturan percobaan tryout terjadwal tetap berlaku.",
          ],
          [
            "Bagaimana jika koneksi terputus saat ujian?",
            "Pilihan yang belum mendapat konfirmasi ditandai sebagai tertunda dan dicoba lagi ketika koneksi pulih. Waktu tetap berjalan di server. Setelah waktu habis, kamu akan melihat hasil berdasarkan jawaban yang sudah diterima dan pemberitahuan jika ada pilihan terakhir dari tab ini yang belum tercatat.",
          ],
          [
            "Apakah hasil latihan berarti lulus seleksi resmi?",
            "Simulasi memakai acuan kebutuhan umum SKD CPNS 2024 dari KepmenPANRB Nomor 321 Tahun 2024 (TWK 65 · TIU 80 · TKP 166). Untuk seleksi resmi, ikuti aturan tahun dan formasi yang kamu lamar.",
          ],
          [
            "Di mana pembahasan dan analisis kelemahan topik tersedia?",
            "Buka Riwayat, pilih sesi yang selesai, lalu tekan Pembahasan. Untuk melihat tren nilai dan sub-topik yang perlu diperkuat, buka halaman Statistik & Topik dari Beranda atau Riwayat. Hasil latihan sendiri tetap dapat dibaca sesudah masa Pro berakhir.",
          ],
          [
            "Bagaimana pembayaran diverifikasi dan bagaimana jika tertunda?",
            "Status transaksi diperiksa langsung di server melalui DOKU. Kembali dari halaman pembayaran tidak otomatis berarti transaksi berhasil. Jika status masih menunggu atau mengalami kendala, buka Riwayat Transaksi di Akun atau hubungi kami dengan menyertakan ID Transaksi (Order ID).",
          ],
          [
            "Bagaimana jika lupa password atau kesulitan masuk akun?",
            "Gunakan link Lupa password pada halaman Masuk untuk menerima link reset password melalui email, atau masuk menggunakan akun Google yang terdaftar. Jika masih terkendala, hubungi WhatsApp atau Email admin kami tanpa perlu masuk akun.",
          ],
        ].map(([title, description]) => (
          <details className="panel" key={title}>
            <summary style={{ cursor: "pointer", fontWeight: 650 }}>
              {title}
            </summary>
            <p className="muted" style={{ marginTop: 14 }}>
              {description}
            </p>
          </details>
        ))}
        <section className="panel stack">
          <div>
            <h2>Masih butuh bantuan?</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Untuk kendala soal, gunakan tombol{" "}
              <strong>Laporkan masalah soal</strong> pada halaman Pembahasan.
              Untuk kendala akun, transaksi, atau pertanyaan lain, hubungi kami
              langsung melalui WhatsApp ({SUPPORT_WHATSAPP_DISPLAY}) atau email (
              {SUPPORT_EMAIL}).
            </p>
          </div>
          <div className="inline">
            <Link href="/support" className="button">
              Kontak & Bantuan
            </Link>
            <a
              href={whatsappHref("Halo Admin TOCPNS, saya ingin bertanya...")}
              target="_blank"
              rel="noreferrer"
              className="button button-secondary"
            >
              Chat WhatsApp
            </a>
            <Link href="/account" className="button button-secondary">
              Buka akun
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
