# Hasil implementasi papan dukungan — 18 November 2026

## Status

Implementasi dan pengujian lokal selesai di branch `main`. Pemilik kemudian
meminta commit/push untuk memicu CI/CD, tanpa memantau sampai deployment selesai.
Deploy otomatis dijalankan setelah CI sukses; hasil production belum diverifikasi
dalam catatan ini. Tidak ada migrasi database untuk perubahan ini.

Riset dan rencana lengkap tersedia di
[rencana donasi](donation-leaderboard-plan-2026-11-18.md).

## Perilaku yang tersedia

- Menu Donasi di header desktop/mobile serta footer; halaman `/donasi`.
- Ringkasan setelah konten latihan di beranda/dashboard, sebelum footer.
- Total donasi terkonfirmasi, jumlah pendukung unik, progres target bulanan,
  papan dukungan, dukungan terbaru, dan periode bulanan/semua waktu.
- Hanya pembayaran donasi berhasil production atau riwayat legacy tanpa
  penanda environment yang dihitung; sandbox/pending/failed/Pro dikecualikan.
- Peringkat menjumlahkan donasi publik per akun; nominal sama mendapat
  peringkat sama. Donasi anonim masuk total dan dukungan terbaru.
- Nama anonim secara default untuk donasi baru; nama singkat publik opsional,
  tanpa fallback email. Pilihan nama dapat diubah pemilik dari riwayat Akun.
- Nominal Rp5.000/Rp10.000/Rp25.000/Rp50.000 dan nominal bebas mulai Rp1.000.
  Nominal pilihan bertahan saat pengguna perlu login dahulu.
- Pesan opsional ditampilkan sebagai teks. Form mencegah pengiriman ganda,
  menyediakan error/retry, dan tetap bekerja ketika storage browser diblokir.
- Tujuan dukungan, sifat sekali bayar/sukarela, dan perbedaan dengan Pro jelas.
  Target operasional tidak diklaim sebagai rincian pengeluaran aktual.
- Tampilan light/dark responsif; penjelasan tujuan/FAQ tersedia di HTML awal.
- Workflow CI disiapkan untuk menguji browser terhadap build production lokal.

## Bukti pengujian lokal

| Pemeriksaan | Hasil |
| --- | --- |
| Seluruh backend `pytest backend/tests` | 153 lulus, 4 dilewati (khusus PostgreSQL; lokal SQLite) |
| Suite komunitas donasi setelah perbaikan timestamp UTC | 22 lulus |
| Ruff empat file backend yang berubah | Lulus |
| Unit kontrak frontend | 21 lulus |
| Vitest | 8 lulus |
| TypeScript | Lulus, tanpa error |
| Lint participant | 0 error; 6 peringatan `no-img-element` pada fitur ujian yang sudah ada |
| Next.js production build | Lulus; `/donasi` berhasil diprerender |
| Playwright seluruh alur terhadap build production | 15 lulus, 27,9 detik |
| Lebar 320/390/768/1280 px | Tanpa horizontal overflow pada halaman donasi |
| Pemeriksaan HTML awal | Hero, judul papan dukungan, dan FAQ tersedia di luar script |
| `git diff --check` | Lulus |
| Pemeriksaan kebocoran konfigurasi privat | `private_config_value_matches: []` |

Playwright memeriksa login return termasuk admin, default anonim, opt-in nama,
input uang tidak valid, klik ganda, retry gangguan sementara, pergantian periode,
pesan yang menyerupai HTML, pengaturan nama di Akun, dan navigasi/header mobile.

Screenshot lokal desktop dan mobile tersimpan dalam
`.server-notes/ui-qa/donations-desktop.png` dan `donations-mobile.png`.
Angka/nama di screenshot adalah fixture pengujian, bukan data production.

## Batas dan pemeriksaan sesudah rilis

Tidak ada checkout, pembayaran, atau perubahan privasi production yang dibuat
untuk pengujian ini. Integrasi DOKU nyata tetap menggunakan alur pembayaran
yang sudah ada; tes browser memakai respons checkout tiruan.

Sesudah rilis oleh pemilik, verifikasi API overview dan halaman `/donasi`
terhadap donasi nyata yang sudah ada, lalu periksa health container/worker.
Tes khusus PostgreSQL dan workflow CI baru belum dijalankan pada remote untuk
perubahan ini. Kenaikan partisipasi donasi belum diukur dan tidak dijanjikan.
