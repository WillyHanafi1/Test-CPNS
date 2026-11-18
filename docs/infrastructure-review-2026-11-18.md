# Audit ulang infrastruktur — 18 November 2026

**Status lanjutan:** keempat temuan di bawah sudah diperbaiki secara lokal pada 18 November 2026. Bukti pengujian dan langkah aktivasi ada pada [laporan perbaikan](four-infrastructure-fixes-2026-11-18.md). Isi audit berikut mencatat kondisi saat temuan ditemukan; server belum menerima perbaikan ini.

Penilaian kandidat lokal: **sekitar 8/10**, lebih baik daripada penilaian awal sekitar 6–7/10. Angka ini merupakan penilaian engineering berdasarkan kode dan bukti uji, bukan SLA atau bukti bahwa production sudah menjalankan perbaikan. Audit ulang menemukan empat celah tersisa; pekerjaan infrastruktur belum layak dinyatakan sepenuhnya tuntas.

## Kondisi server yang diperiksa kembali

Pemeriksaan read-only pada 18 November 2026 sekitar 06:21 WIB menemukan:

- Tujuh container utama healthy, restart count nol.
- Disk kosong sekitar **15,5 GiB dari 47,93 GiB**.
- Checkout Git sudah `1723b43`, tetapi image aplikasi aktif masih rilis `f01e1169-…-20261116075825`.
- Schema aktif masih `667ecbb432df`; tabel revisi/jawaban/job/payment event/audit baru belum aktif. Ada 83 sesi finished dan tidak ada sesi ongoing/processing pada saat pemeriksaan.
- Timer `ujian-backup.timer` dan `ujian-monitor.timer` belum terpasang. Private operations env dan backup key baru belum ada di server; metadata backup suite baru juga belum ada.
- Log container masih pengaturan lama 10 MB × tiga file. Batas baru 2 MB × dua file berlaku setelah container dibuat ulang memakai konfigurasi baru.

Bukti agregat tanpa credential: `.server-notes/current-infrastructure-audit.json` (privat, diabaikan Git). Tidak ada deployment atau migrasi dilakukan dalam audit ini.

## Temuan yang perlu diperbaiki

### 1. Izin folder backup tidak cocok dengan user container — prioritas tinggi

`backup-store` berjalan dengan `RUN_UID:RUN_GID`, saat ini **1000:1000**. Folder server `.server-notes/backups` ternyata milik **root:root dengan mode 0700**. `backup-ujian.sh` dan `install-operations.sh` hanya membuat folder serta menjalankan chmod; keduanya tidak menyelaraskan ownership. Service systemd berjalan sebagai root secara default, sehingga folder baru juga bisa terbentuk dengan ownership root.

Akibatnya, proses container UID 1000 tidak bisa memakai folder tersebut untuk metadata status atau fallback lokal. Mekanisme kriptografi/upload/restore telah lolos pengujian, tetapi pengujian tersebut belum membuktikan wrapper Compose/systemd beserta permission host production.

Perbaikan: siapkan folder dan private file dengan ownership yang cocok dengan UID/GID operasi, validasi akses sebelum backup, lalu uji alur Compose lengkap. Pertahankan mode 0700/0600; jangan menyelesaikannya dengan membuka akses publik atau chmod 777.

Rujukan: `compose.production.yml:67`, `scripts/ops/backup-ujian.sh:9`, `scripts/ops/install-operations.sh:8`.

### 2. Gangguan DOKU dapat menahan scoring ujian — prioritas tinggi

Worker default hanya memiliki satu proses. Rekonsiliasi pembayaran, pemrosesan scoring, dan heartbeat memakai antrean default yang sama; hanya task AI admin yang memiliki route terpisah. `async_reconcile_payments` memeriksa sampai 25 transaksi secara berurutan. Setiap panggilan status DOKU menggunakan timeout koneksi/baca 5/15 detik.

Saat provider lambat atau tidak tersedia, satu batch dapat menduduki worker selama beberapa menit. Scoring dan heartbeat harus menunggu. Jawaban yang sudah diakui tetap ada di PostgreSQL, tetapi penayangan hasil terlambat dan antrean dapat bertambah. Uji 50 peserta sebelumnya dilakukan tanpa gangguan provider ini.

Perbaikan: isolasi pekerjaan yang mengakses provider dari worker scoring, dengan batas durasi/batch dan retry yang wajar. Tambahkan pengujian provider timeout sementara scoring tetap berjalan. Worker tambahan dapat memakai image backend yang sama sehingga tidak memerlukan salinan image baru.

Rujukan: `backend/core/tasks.py:466`, `backend/core/tasks.py:486`, `backend/core/tasks.py:488`, `backend/core/celery_app.py:17`, `backend/core/doku_service.py:113`, `compose.production.yml:123`.

### 3. Verifikasi Google login masih memblokir event loop API — prioritas sedang

Endpoint Google login didefinisikan async, tetapi memanggil `id_token.verify_oauth2_token(..., google_requests.Request(), ...)` secara sinkron. Pengambilan sertifikat/verifikasi yang lambat dapat menahan proses API yang sama dan membuat request peserta lain ikut menunggu.

Perbaikan: jalankan verifikasi sinkron di thread dengan batas waktu yang jelas, kemudian lanjutkan operasi database pada konteks async semula. Verifikasi email/audience dan aturan akun yang sudah ada tetap dipertahankan. Uji Google lambat sambil memastikan endpoint peserta tetap merespons.

Rujukan: `backend/api/v1/endpoints/auth.py:285`, `backend/api/v1/endpoints/auth.py:294`.

### 4. Rekap bulanan masih mengikuti waktu pembuatan pesanan — prioritas sedang

Statistik donasi bulanan menggunakan `UserTransaction.created_at` dan status success. Jika pesanan dibuat pada akhir bulan dan dibayar bulan berikutnya, atribusi bulannya dapat melenceng. Total donasi sukses tetap terlindungi oleh status transaksi, tetapi laporan periode belum mengikuti waktu pembayaran terkonfirmasi. Belum ada timestamp pembayaran umum untuk donasi; `granted_at` hanya diisi ketika akses Pro diberikan.

Perbaikan: simpan waktu pembayaran terkonfirmasi sekali dan gunakan waktu tersebut untuk agregat keuangan. Data lama perlu diberi fallback yang jelas; jangan mengarang tanggal settlement historis.

Rujukan: `backend/api/v1/endpoints/transactions_api.py:159`, `backend/api/v1/endpoints/transactions_api.py:172`, `backend/services/payments.py:111`.

## Yang telah meningkat dan terbukti

- Penyimpanan jawaban database, versioning, replay/konflik, pencabutan sesi reset password, receipt webhook, audit status dan retry mempunyai pengujian yang relevan.
- Suite PostgreSQL **113 lulus**; frontend **23 tes unit** dan **empat skenario browser** lulus; TypeScript dan production build lulus. Tes tersebut tidak mencakup empat celah di atas secara lengkap. Lint admin lama masih memiliki utang teknis.
- Beban 50 peserta: 120 detik, 400 autosave tambahan terverifikasi, 50/50 sesi selesai dinilai. Ini jalur backend Docker lokal, bukan pembuktian performa CDN/gateway/database production atau ujian 100 menit.
- Backup dump sintetis melewati enkripsi, Supabase privat, download/hash, dekripsi dan restore database baru. Restore produksi dan wrapper operasi pada permission host belum dibuktikan.
- Penghematan storage: log terbatasi, hasil Celery tidak disimpan, dependency/image runtime dirampingkan, arsip backup normal melalui RAM/Supabase dan fallback dibatasi. Kebijakan cache/image CI tersendiri tetap berlaku.

## Skor kandidat lokal

| Aspek | Skor | Batas utama |
| --- | --- | --- |
| Mesin ujian dan penyimpanan jawaban | 8,5 | Belum diuji sepanjang durasi ujian di jalur production |
| Scoring dan hasil | 8 | Isolasi dari gangguan pembayaran belum selesai |
| Pembayaran Pro | 8 | Belum checkout sampai settlement dan webhook nyata di CPNS |
| Donasi dan laporan | 7,5 | Timestamp periode pembayaran perlu dirapikan |
| Leaderboard nilai | 8,5 | Versi dan privasi sudah konsisten |
| UI/UX | 8,5 | Pengujian perangkat/aksesibilitas masih terbatas |
| Keamanan akun | 8 | Verifikasi Google perlu dikeluarkan dari event loop |
| Operasi admin | 7,5 | Fitur baru siap lokal, belum aktif di server |
| Pengujian/build/CI | 8,5 | Lint admin dan beberapa skenario gangguan tersisa |
| Kapasitas dan ketahanan gangguan | 7,5 | Soak 100 menit dan gangguan provider belum dijalankan |
| Monitoring dan alert | 7 | Timer dan tujuan notifikasi belum aktif; monitor host sendiri tidak mendeteksi saat seluruh host mati |
| Backup dan pemulihan | 6,5 | Ownership host dan backup/restore produksi belum ditutup |
| Efisiensi storage | 8,5 | Batas baru belum diterapkan pada container production |

## Keputusan praktis

Fondasi sudah memadai untuk melanjutkan pengembangan soal, tetapi empat celah implementasi tersebut sebaiknya ditutup terlebih dahulu sebelum menyatakan pekerjaan infrastruktur selesai. Tidak diperlukan perombakan besar.

Aktivasi rilis tetap meliputi migrasi eksplisit, pemasangan timer/private config, pembuktian backup production yang dapat dipulihkan, dan smoke test pembayaran/login/reset email di domain sebenarnya. Detail langkah ada pada [runbook rilis](redesign-release-runbook.md) dan [catatan implementasi](reliability-worklog-2026-11-17.md). Perubahan tetap lokal di `main`, tanpa push.
