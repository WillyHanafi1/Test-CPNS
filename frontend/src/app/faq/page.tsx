import Link from "next/link";
import AppShell from "@/components/AppShell";
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
            "Apa yang termasuk dalam Pro?",
            "Seluruh paket peserta yang terbit dan siap dalam cakupan keanggotaan selama masa aktif. Jadwal dan aturan percobaan tryout tetap berlaku.",
          ],
          [
            "Bagaimana jika koneksi terputus?",
            "Pilihan yang belum mendapat konfirmasi ditandai sebagai tertunda dan dicoba lagi ketika koneksi pulih. Waktu tetap berjalan; jawaban yang belum diterima sebelum deadline tidak dapat dinilai.",
          ],
          [
            "Apakah hasil latihan berarti lulus seleksi?",
            "Hasil hanya menggambarkan performa simulasi berdasarkan aturan latihan yang ditampilkan. Keputusan seleksi resmi tidak ditentukan oleh aplikasi.",
          ],
          [
            "Di mana pembahasan tersedia?",
            "Buka Riwayat, pilih sesi yang selesai, lalu Pembahasan. Hasil latihan sendiri tetap dapat dibaca sesudah masa Pro berakhir.",
          ],
          [
            "Bagaimana pembayaran diverifikasi?",
            "Status transaksi diperiksa di server. Kembali dari halaman pembayaran tidak otomatis berarti transaksi berhasil. Bila pembayaran masih sandbox, transaksi bukan pembayaran sungguhan.",
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
        <section className="notice">
          <p>
            Untuk kendala soal, gunakan Laporkan masalah pada pembahasan. Untuk
            masukan lain, buka halaman Akun.
          </p>
          <Link href="/account" className="button button-secondary">
            Buka akun
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
