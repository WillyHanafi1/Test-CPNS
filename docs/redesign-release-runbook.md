# Runbook rilis perombakan TOCPNS

Berlaku untuk perubahan additive `667ecbb432df → d8e4a91b2201`. Production saat ini harus tetap berjalan sampai gate di bawah dipenuhi. Jangan menggabungkan migrasi schema, deployment, dan uji provider menjadi satu startup container otomatis.

## 1. Kandidat yang dapat ditinjau

- Review perubahan lokal di `main`, kontrak Pro, UX, migration, dan laporan implementasi. Jangan membuat branch baru atau melakukan push, sesuai `AGENTS.md`.
- CI PostgreSQL, frontend lint/unit/type/build serta rehearsal migrasi harus lulus pada commit kandidat. Record commit/image digests di catatan privat rilis; image/tag review adalah artefak uji, belum konfigurasi production.
- Jalankan `scripts/ops/verify-images.sh` dengan pinned images pada folder review terpisah. Gunakan `RUN_LOAD_CHECK=1` untuk uji beban terbatas; hanya database disposable `ujian_verify` yang diterima script. Subnet `172.31.142.0/24` dan `172.31.143.0/24` tidak boleh bentrok dengan jaringan host.
- Uji nyata Google login, reset email, dan sandbox DOKU pada lingkungan dengan callback yang disetujui. Jangan mengganti sandbox menjadi production sebagai bagian perombakan ini.

## 2. Backup yang benar-benar dapat dipulihkan

1. Periksa major PostgreSQL dan jalur koneksi yang mendukung `pg_dump`; pooler transaksi tidak selalu cocok untuk operasi backup. Jangan menampilkan URI/kredensial dalam terminal/log.
2. Pin `POSTGRES_BACKUP_IMAGE` yang kompatibel dengan server ke digest pada `.server-notes/images.env` privat. Backup script menolak image tanpa pin. Pastikan UID/GID volume cocok.
3. Jalankan `bash scripts/ops/backup-postgres.sh`. Script menggunakan mode read-only, TLS verify-full, file sementara atomik, permission 600, dan pemeriksaan daftar arsip. File hanya ditulis ke `.server-notes/backups/`.
4. Buat salinan terenkripsi di luar host yang telah ditentukan pemilik. Catat lokasi privat, checksum, waktu, dan kunci pemulihan di tempat terpisah. Keberadaan arsip lokal tidak memenuhi gate ini.
5. Restore ke database terisolasi yang baru, bukan database production atau development yang berisi pekerjaan. Periksa jumlah/constraint users, transaksi, sesi/jawaban legacy, soal/aset; uji login dan pembahasan dengan akun uji yang diizinkan.
6. Backup juga konfigurasi privat dan aset/Storage yang tidak tercakup `pg_dump`. Verifikasi kemampuan PITR berdasarkan paket provider aktual; jangan mengasumsikan tersedia.

## 3. Drain sesi lama dan migrasi eksplisit

1. Ambil agregat terbaru ongoing/processing/job, status worker/beat, scheduler ganda, serta deadline maksimum. Jangan memakai angka audit lama untuk memutuskan cutover.
2. Pada jendela rilis, hentikan start baru di gateway/maintenance sementara; tetap layani autosave/finish/read sesi lama. Bila maintenance belum bisa dibatasi ke start, jadwalkan pemberitahuan dan tunggu semua sesi aktif selesai sebelum downtime terukur.
3. Pastikan seluruh sesi legacy sudah selesai dan antrean scoring lama tidak tertahan. Jangan purge Redis/antrean bersama. Hentikan writer/scheduler lama setelah drain sebelum menyalakan writer baru.
4. Jalankan migration kandidat **sekali** melalui job/container backend yang mengarah ke database terverifikasi. Gunakan `alembic -c backend/alembic.ini upgrade head` hanya dalam konteks release yang sudah diatur. Jangan menyalin command berisi DSN ke chat.
5. Jalankan `python -m backend.ops.check_schema`; revision harus `d8e4a91b2201`. Periksa tabel tambahan dan constraint. Histori tidak di-rescore dan tidak di-backfill dengan snapshot palsu.
6. Validasi paket lama. Paket yang tidak memenuhi spesifikasi tidak boleh dibetulkan bobot/kuncinya otomatis. Publikasikan salinan/revisi yang ditinjau; paket siap lama dapat dibekukan saat start pertama, tetapi penyuntingan histori legacy tetap diblokir.

## 4. Switch aplikasi dan smoke test

- Catat manifest image lama dan kandidat. `deploy-ujian.sh start` menolak schema drift dan tidak melakukan migrasi.
- Nyalakan backend/frontend/gateway/worker/beat kandidat; cek health dan satu instance beat yang benar. AI admin default mati; jangan mengaktifkan profil admin-ai tanpa secret terpisah dan kebutuhan admin yang nyata.
- Periksa client protocol: frontend baru mengirim `X-Exam-Protocol: 2`; client lama mendapat 409 `update_required` pada start/resume mesin baru. Ini gate kompatibilitas, bukan mekanisme autentikasi. Client legacy tetap boleh menyelesaikan sesi legacy yang sudah berjalan; lakukan refresh halaman saat cutover.
- Smoke: domain apex, www canonical, login, katalog/hak, mulai akun uji, jawaban ACK, refresh, submit/scoring, hasil, pembahasan, logout. Gunakan data/account uji yang disepakati; jangan membuat transaksi uang nyata.
- Periksa `Cache-Control`, cookie Secure/HttpOnly, tidak ada kunci sebelum selesai, tidak ada port DB/Redis publik, dan request ID/durasi log tanpa query/token.
- Buka start baru setelah smoke lulus; awasi 5xx/429, latency autosave, pending job/umur tertua, DB connections, memory/swap/disk dan status tunnel. Sinyal database saja tidak membuktikan worker sehat; periksa heartbeat/proses worker dan job selesai.

## 5. Rollback

Migrasi ini additive. `downgrade` sengaja menolak penghapusan tabel jawaban. Jangan memaksa downgrade atau mengembalikan database backup hanya untuk membatalkan UI, karena itu akan menghilangkan jawaban/transaksi setelah waktu backup.

Rollback frontend dapat menggunakan image sebelumnya selama kontrak API kompatibel. Frontend sebelum protocol V2 tidak dapat memulai/resume sesi mesin baru; jangan menganggap semua image frontend lama kompatibel. Setelah sesi baru memakai revision/response, backend lama berbasis Redis tidak dapat menjadi writer/scorer bagi sesi tersebut. Pertahankan backend baru yang bisa membaca/menyelesaikan sesi baru, hentikan start baru bila perlu, dan perbaiki maju. Revert backend penuh hanya boleh dipertimbangkan sebelum ada sesi mesin baru, dengan verifikasi database dan jalur histori.

Deployment aplikasi otomatis setelah CI push `main` sukses, dengan secrets SSH dan konektivitas runner yang dijelaskan di [panduan CI/CD](ci-cd.md). Migrasi production tetap eksplisit dan schema gate tetap berlaku. Gate pembayaran nyata, backup off-host, dan cutover tidak boleh ditandai selesai dari hasil unit test saja.
