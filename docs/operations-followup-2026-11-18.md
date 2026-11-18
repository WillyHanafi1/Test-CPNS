# Perbaikan integrasi dan operasi, 18 November 2026

## Hasil yang dibuktikan

- Google OAuth: pemilik menambahkan origin `https://tocpns.my.id` dan berhasil login.
- SMTP Gmail: autentikasi server berhasil; pemilik menerima email reset password.
- DOKU: konfigurasi server dan build frontend disamakan ke Production. Kredensial
  yang sama ditolak Sandbox dengan `invalid_client_id` dan diterima Production.
- Donasi nyata Rp5.000 melalui QRIS menghasilkan invoice
  `DONATE-110d88c30dcf46928b89fc7b`. API status DOKU mengembalikan `SUCCESS`,
  nominal 5.000, kanal `QRIS`, dan waktu bayar 18 November 2026 12:35:28 WIB.
  Signature respons diverifikasi oleh client aplikasi. Database mencatat satu
  perubahan status dan tidak memberikan Pro untuk donasi.
- Backup database dan konfigurasi terenkripsi berhasil diunggah ke bucket privat
  Supabase, diunduh kembali, diperiksa SHA-256, dan diautentikasi AES-GCM. Salinan
  terenkripsi serta kunci pemulihan terpisah tersedia di komputer pemilik.
- Rehearsal restore backup pada PostgreSQL 17 disposable berhasil: revision
  `c3d9e25b4a60`, 17 tabel aplikasi, 17 pengguna, 2.567 soal, dan 83 sesi ujian.
  Restore memerlukan extension `uuid-ossp`/`pgcrypto` pada schema `extensions`.
- Timer backup harian 02:40 WIB dengan jitter maksimal lima menit dan monitor
  setiap menit sudah diaktifkan. Status operasi tanpa masalah berhasil dibuktikan
  sebelum uji donasi; receipt QRIS yang tertahan harus diproses ulang sesudah
  deployment perbaikan kanal.

## Bug webhook QRIS

DOKU Checkout dan API status mengidentifikasi metode sebagai `QRIS`, sementara
notifikasi pembayaran QRIS menggunakan `QRIS_DOKU`. Perbandingan string langsung
menahan receipt sah dengan `DOKU_PAYMENT_CHANNEL_MISMATCH`. Rekonsiliasi status
otomatis tetap mengonfirmasi donasi, tetapi konfirmasi langsung webhook tertunda.

Perbaikan menyamakan `QRIS_DOKU` dengan `QRIS` hanya untuk pemeriksaan metode yang
diizinkan pada snapshot pesanan. Receipt asli tetap disimpan. Pemeriksaan signature,
merchant, environment, invoice, nominal, dan idempotensi tetap berlaku. Kanal lain
tidak diterima melalui prefix atau wildcard. Regression test mencakup donasi nyata
Rp5.000, replay webhook, aktivasi Pro sekali, nominal salah, kanal tidak dikenal,
dan pesanan yang tidak menawarkan QRIS.

Rujukan: [contoh notifikasi Non-SNAP DOKU](https://developers.doku.com/get-started-with-doku-api/notification/http-notification-sample-non-snap).

## Perbaikan backup dan setup

- Nilai `tmpfs` dengan koma harus dikutip dalam flow sequence YAML.
- Hanya service backend yang mempunyai definisi build; worker dan backup memakai
  image aplikasi yang sama. Backup tidak boleh memicu build image tak sengaja.
- URI dari environment `PGDATABASE` tidak diperluas libpq menjadi koneksi.
  Persiapan backup sekarang menghasilkan field `PGHOST`, `PGPORT`, `PGUSER`,
  `PGPASSWORD`, dan nama database dalam file privat berformat raw.
- UID numerik membutuhkan fallback `PGUSER`; identitas database sebenarnya
  tetap berasal dari konfigurasi koneksi privat.
- Supabase membutuhkan root CA database sendiri. TLS tetap `verify-full` dan
  backup memakai session pooler 5432.
- Setup interaktif mempertahankan kunci enkripsi yang sudah ada, memverifikasi
  bucket privat, menerima secret key baru maupun legacy `service_role`, dan
  tidak mencetak kredensial. Monitoring dapat dipasang terpisah dari backup.
- Installer melepaskan unit kompatibilitas privat ketika source yang sudah
  diperbaiki dipasang. Jangan menjalankan unit kompatibilitas bersamaan dengan
  unit normal.

## Validasi

- Backend setelah hotfix kanal: 131 passed, 4 skipped pada SQLite lokal; skip
  mencakup pengujian khusus PostgreSQL yang dijalankan CI.
- Tes pembayaran setelah hotfix kanal: 37 passed, 1 skipped.
- Unit test script operasi: 12 passed.
- Frontend: 15 contract tests, 8 Vitest tests, TypeScript, dan 6 Playwright E2E
  lulus. Lint peserta tanpa error, dengan enam warning `no-img-element` yang ada.
- Chrome production: tujuh halaman pada desktop dan mobile, seluruh respons 200,
  tanpa error JS, 5xx, error origin Google, atau horizontal overflow.
- Build frontend production menghasilkan 27 halaman statis. Audit dependency
  production frontend tidak menemukan advisori pada saat pemeriksaan.
- Pemeriksaan kebocoran nilai konfigurasi privat dan whitespace lulus.

Pemilik memberikan izin tetap untuk commit/push `main` pada sesi ini;
`AGENTS.md` diselaraskan. Source tidak dikerjakan di branch lain.
