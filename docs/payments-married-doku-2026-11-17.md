# Pembayaran TOCPNS dengan merchant We Finally Found Us

Integrasi lokal 17 November 2026 menggunakan DOKU Checkout **Non-SNAP Production** dari environment server Married yang sedang berjalan. Produk TOCPNS tetap Pro Rp50.000 untuk 365 hari; pembelian ulang memperpanjang masa aktif. Donasi memakai checkout yang sama tanpa memberikan Pro.

## Sumber dan file privat

- GitHub `origin/main` terbaru yang diambil: `2faac2d`. Checkout aktif server Ujian masih `7fab080`; kode server yang lebih lama tidak menimpa pembaruan GitHub.
- Merge lokal `a450362` mempertahankan commit lokal `743d458`. Perubahan QA/package yang belum di-commit dikembalikan. README memakai versi GitHub terbaru; README lokal sebelumnya dicadangkan lengkap di `.git/codex-backups/2026-11-17-before-pull/README.md` dan `stash@{0}` (`codex-before-pull-2026-11-17`). Stash tidak dihapus.
- Konfigurasi Ujian berasal dari `/home/rusunawa/@docker/Ujian`: `.production.env`, `.secrets/`, dan `.server-notes/`. Sebanyak 237 file (1.812.967 byte) diverifikasi SHA-256 saat transfer. Manifest berada di `.server-notes/local-sync-manifest.json`.
- Credential pembayaran diambil langsung dari `/home/hanafiwilly111/marriedweb/.env.production` lewat SSH operator yang sudah tersedia. Hanya konfigurasi DOKU dan origin sumber yang disimpan dalam `.server-notes/married-payment-source.private.env`.
- Credential diterapkan di `.env` dan `.secrets/application.env`. Konfigurasi frontend publik diselaraskan di `.production.env` dan `frontend/.env.local`. Salinan sebelumnya ada di `.server-notes/local-config-before-payment/`. Akses SSH Ujian tersimpan pada `.secrets/server-access.env`.
- Seluruh file tersebut diabaikan Git. Direktori `.secrets/` dan `.server-notes/` dibatasi ACL Windows untuk akun pemilik dan SYSTEM. Nilai secret tidak ditulis ke dokumen, respons API, atau log aplikasi.
- Kanal mengikuti server Married: QRIS dan 12 VA. BJB, Mandiri, serta BCA tidak ditambahkan ke daftar aktif ini. Daftar itu adalah konfigurasi yang teramati pada server, bukan hasil transaksi baru pada CPNS.

## Pemisahan notifikasi kedua aplikasi

Request CPNS mengirim `additional_info.override_notification_url=https://tocpns.my.id/api/payments/doku/notifications`. Path sama dengan endpoint Married, sedangkan domain berbeda. DOKU mensyaratkan path override sama dengan path Notification URL yang sudah terdaftar. Konfigurasi dashboard merchant serta layanan Married tidak diubah.

Endpoint lama `/api/v1/transactions/webhook` tetap tersedia. Signature diperiksa terhadap path HTTP yang benar-benar menerima request. Invoice, nominal IDR, kanal, lingkungan, dan merchant harus cocok dengan snapshot pesanan CPNS sebelum akses diberikan. Transaksi lama tanpa informasi merchant/lingkungan tidak otomatis dianggap pembayaran merchant baru; periksa secara terpisah bila ada transaksi pending lama.

## Perilaku pembayaran

1. Server menentukan harga dan durasi; alamat kembali hanya boleh `/payment/success` pada origin frontend yang dikonfigurasi.
2. Invoice, merchant, lingkungan, serta body request disimpan sebelum request ke DOKU. UUID transaksi menjadi Request-Id tetap. Timeout meninggalkan pesanan pending yang dapat dicoba ulang dengan invoice dan body identik.
3. Respons Checkout harus mempunyai signature sah, invoice dan nominal yang sama, URL HTTPS DOKU sesuai lingkungan, serta waktu kedaluwarsa valid. Respons replay HTTP 409 hanya diterima jika seluruh korelasi tersebut lulus.
4. Browser kembali ke halaman status. Redirect tidak memberikan akses. Webhook sah atau pemeriksaan status server memberikan Pro sekali di dalam transaksi database dengan row lock.
5. Celery Beat menjalankan `backend.core.tasks.reconcile_payments` setiap menit. Pemeriksaan pertama menunggu minimal 90 detik sejak pembuatan pesanan; pemeriksaan selanjutnya maksimal sekali per lima menit per invoice. Poll browser membaca catatan yang sama dan memakai batas tersebut. Merchant API tidak dipanggil setiap tiga detik.
6. `FAILED` sebuah percobaan kanal tetap pending karena Checkout dapat mencoba kanal lain. `SUCCESS` tidak dapat diturunkan oleh webhook lama. Order expired ditutup, dan pembayaran sukses yang sah terlambat masih dapat diproses.

## Validasi dan penerapan

Pengujian lokal memakai credential sintetis, SQLite terisolasi, dan transport provider tiruan. Cakupan mencakup respons palsu, signature, pemisahan webhook, nominal/lingkungan/kanal salah, timeout, replay, perpanjangan Pro, rekonsiliasi, dan pelestarian data saat migrasi. Tes unit frontend menggunakan loader `tsx` yang sudah tersedia pada dependency proyek Married karena instalasi frontend CPNS belum diperbarui.

Hasil: **92 tes backend lulus, 1 dilewati; 11 tes unit frontend lulus**. Ruff pada file implementasi yang diubah dan pemeriksaan whitespace lulus. Migrasi baru diuji terhadap transaksi SQLite lama dan dirender sebagai SQL PostgreSQL offline (lima kolom tambahan). Docker Desktop lokal tidak berjalan, sehingga rehearsal PostgreSQL melalui Docker belum dilakukan.

Credential Production juga diverifikasi melalui GET status atas satu invoice Production yang sudah ada di server Married: HTTP 200, signature respons sah, status EXPIRED. Pemeriksaan ini tidak membuat invoice atau mencoba pembayaran. Bukti ringkas ada di `.server-notes/payment-provider-verification.json`.

Probe dari Windows ditolak `request_time_out_of_range`: jam Windows terukur sekitar **152 detik tertinggal** dibanding server sumber, sedangkan DOKU meminta timestamp dalam ±60 detik. Sinkronkan jam Windows sebelum menguji API Production langsung dari laptop. Jam sistem tidak diubah oleh pekerjaan ini.

Migrasi baru `e7b2c80d913a` menambahkan lima kolom pembayaran setelah `d8e4a91b2201`. Sebelum menerapkan rilis pada server, lakukan backup dan rehearsal sesuai runbook proyek, lalu jalankan migrasi eksplisit serta pemeriksaan schema. Worker dan Beat harus memakai rilis yang sama. Migrasi, deployment, transaksi uang nyata, dan settlement **belum dijalankan** dalam pekerjaan lokal ini. Tidak ada push ke GitHub.

Rujukan resmi: [Backend Checkout](https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration), [override URL](https://developers.doku.com/get-started-with-doku-api/notification/override-notification-url), [signature respons](https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-componen-from-response-header), [status Non-SNAP](https://developers.doku.com/get-started-with-doku-api/check-status-api/non-snap).
