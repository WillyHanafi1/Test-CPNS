# Empat perbaikan infrastruktur — 18 November 2026

Keempat temuan [audit ulang](infrastructure-review-2026-11-18.md) telah diperbaiki di lokal `main`. Alur peserta tidak mendapat langkah tambahan, aturan password baru, ataupun persyaratan pembayaran tambahan. Tidak ada push, migrasi production, pemasangan timer, atau deployment selama pengerjaan.

## Backup dapat berjalan dengan identitas container

`scripts/ops/prepare_backup.py` membaca UID/GID aktual dari konfigurasi Compose yang telah di-resolve, tanpa menampilkan environment/credential. Helper menyelaraskan ownership direktori privat, file konfigurasi backup yang diperlukan, serta metadata/arsip yang dihasilkan mekanisme ini. Mode direktori tetap 0700 dan file tetap 0600. Arsip manual tidak diubah. File/direktori symlink yang dapat mengalihkan operasi keluar area backup ditolak.

Skrip backup dan installer timer memanggil helper ini otomatis. Sebelum job dimulai, child process memakai UID/GID container untuk membuktikan akses baca konfigurasi, tulis metadata, dan tulis direktori backup. Operator menjalankan perintah sudo yang sama seperti runbook; tidak perlu memperbaiki chown/chmod secara manual.

Pengujian Linux terisolasi mereproduksi folder 0700 dan metadata 0600 milik root, menjalankan persiapan, lalu membuat backup terenkripsi sebagai UID 1000. Metadata berhasil diperbarui dan fallback berhasil ditulis; credential tidak berubah, permission tetap privat, arsip manual tetap utuh. Dua skenario verifikasi Linux lulus.

## Pembayaran terisolasi dari scoring

Service `payment-worker` memakai **image backend yang sama**, antrean `payments`, concurrency satu, batas RAM 256 MB, dan 0,25 CPU. Worker ujian hanya mengambil antrean `celery`. Routing mencakup rekonsiliasi DOKU, retry receipt pembayaran, dan heartbeat pembayaran. Deployment/start/rollback, Compose verification, dan monitor host mengenali service tambahan tersebut; workflow CI dan kebijakan cleanup image tetap dipertahankan.

Rekonsiliasi berhenti mengambil transaksi tambahan setelah anggaran batch 25 detik; transaksi tersisa tetap pending dan dipilih pada siklus berikutnya. Timeout HTTP tetap digunakan, dengan soft/hard time limit task sebagai pengaman terakhir. Pemicu periodik yang sudah usang dapat kedaluwarsa, sedangkan receipt dan status transaksi tetap tersimpan di database. Heartbeat worker pembayaran dipantau terpisah.

Isolasi mengikuti [panduan routing Celery](https://docs.celeryq.dev/en/stable/userguide/routing.html); [panduan task Celery](https://docs.celeryq.dev/en/stable/userguide/tasks.html) menganjurkan timeout I/O dan worker berbeda untuk pekerjaan yang dapat lama memblokir.

Uji dengan worker Celery, Redis, dan PostgreSQL asli pada jaringan Docker internal membuat provider sintetis menahan worker pembayaran selama 12 detik. **Scoring dan heartbeat worker ujian selesai dalam 0,218 detik**, sebelum panggilan provider selesai; hasil benar dan pembayaran yang belum terverifikasi tidak mengaktifkan Pro. Bukti privat: `.server-notes/four-fixes-payment-isolation.log`. Ini simulasi lokal, bukan gangguan pada DOKU/server production.

## Google login tetap responsif ketika provider lambat

Verifikasi token Google dijalankan melalui thread agar I/O sinkron tidak menahan event loop API. Transport memiliki timeout koneksi/baca 3/5 detik, dan endpoint menunggu maksimal 10 detik. Session HTTP ditutup setelah verifikasi selesai. Jika Google lambat/tidak tersedia, pengguna menerima pesan yang dapat dicoba ulang dengan HTTP 503; token tidak valid tetap ditolak dan login yang valid mengikuti perilaku akun sebelumnya.

Tes regresi membuktikan endpoint lain tetap merespons sementara verifikasi Google tertahan, timeout transport diteruskan, deadline endpoint berlaku, dan akun Google yang valid tetap dapat masuk. Tidak ada captcha atau tahapan login tambahan.

## Rekap memakai waktu pembayaran terkonfirmasi

Migration additive **`c3d9e25b4a60`** menambah `user_transactions.paid_at` yang nullable dan berindeks, setelah `f4c7b91a026e`. Kolom diisi sekali pada transisi pertama menjadi sukses, baik untuk Pro maupun donasi. Webhook/reconciliation memakai `transaction.date` terautentikasi dari DOKU jika valid dan sesuai rentang pesanan; bila tidak tersedia/masuk akal, dipakai waktu konfirmasi server. Receipt ringkas mempertahankan tanggal itu agar retry tidak menghilangkannya. Replay webhook/perubahan status berikutnya tidak memindahkan tanggal pembayaran.

[Dokumentasi notifikasi DOKU Non-SNAP](https://developers.doku.com/get-started-with-doku-api/notification/http-notification-sample-non-snap) dan [status Non-SNAP](https://developers.doku.com/get-started-with-doku-api/check-status-api/non-snap) mendefinisikan `transaction.date` sebagai waktu penyelesaian transaksi dalam ISO 8601 UTC. Timestamp tanpa offset dari format ini diperlakukan sebagai UTC.

Donasi bulanan dan tren pendapatan admin memakai `paid_at`, dengan batas bulan/hari **Asia/Jakarta**. Pesanan akhir bulan yang dibayar awal bulan berikutnya masuk bulan pembayaran. Daftar donasi terbaru diurutkan menurut waktu pembayaran; API juga menyediakan `paid_at` tanpa mengganti makna `created_at`.

**Data sukses historis tidak diberi tanggal settlement rekaan.** `paid_at` tetap NULL dan laporan memakai tanggal pembuatan sebagai fallback untuk data tersebut. Tanggal baru tidak me-rescore ujian, mengubah nominal, atau memberikan ulang akses Pro. Pembaruan manual legacy yang benar-benar berpindah dari pending/failed menjadi sukses mencatat waktu konfirmasi baru.

## Verifikasi

- Suite backend PostgreSQL: **123 tes lulus**, termasuk tanggal pembayaran bertanda tangan/replay, pergantian bulan WIB, tren harian, fallback legacy, migrasi, Google lambat, routing, dan regresi sebelumnya.
- Rehearsal dari schema production lama `667ecbb432df` sampai **`c3d9e25b4a60`** lulus dalam 1,52 detik pada database disposable. User lama dan transaksi donasi sukses tetap utuh; `paid_at` historis tetap NULL.
- Dua skenario Linux untuk ownership/backup terenkripsi lulus; uji isolasi worker nyata lulus.
- Sembilan tes operasi/deployment lulus setelah penambahan service pembayaran pada daftar start/recovery.
- Image production berhasil dibangun, Compose tervalidasi tanpa menampilkan secret, sintaks shell/Ruff/diff check lulus.

Untuk mengulang skenario provider macet pada stack disposable yang disediakan proyek, gunakan `RUN_PAYMENT_OUTAGE_CHECK=1 bash scripts/ops/verify-images.sh` setelah menyiapkan image kandidat. Profil `faults` mengganti sementara payment worker pada project `ujian-verify`; kode injeksi memeriksa nama/URI database synthetic dan tidak dijalankan pada Compose production.

## Saat rilis

Ikuti [runbook rilis](redesign-release-runbook.md): backup terlebih dahulu, migrasi eksplisit ke `c3d9e25b4a60`, lalu hidupkan backend/frontend/gateway, worker ujian, **payment-worker**, dan Beat. Script deployment sudah menyertakan payment-worker; container ini memakai tag backend yang sama dan tidak memerlukan build image tersendiri.

Pasang private operations env/key dan jalankan installer timer seperti biasa. Helper ownership berjalan otomatis, termasuk ketika backup dipanggil systemd sebagai root. Validasi satu backup production serta status/heartbeat kedua worker setelah rilis. Pembayaran nyata sampai settlement, email reset/Google domain production, dan uji beban sepanjang durasi ujian tetap termasuk pembuktian operasional setelah rilis; pengujian lokal tidak menggantikannya.
