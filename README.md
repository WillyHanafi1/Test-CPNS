# TOCPNS

Aplikasi latihan CAT CPNS: pilih paket, kerjakan ujian, lihat hasil, pelajari pembahasan. Peserta Pro dapat mengakses seluruh paket yang terbit, aktif, siap, dan sesuai jadwal selama keanggotaannya berlaku. Fitur AI peserta dihentikan; alat AI admin opsional dan mati secara default.

Stack yang digunakan tercatat dalam `frontend/package-lock.json` dan `backend/requirements.txt`: Next.js/React, FastAPI, PostgreSQL, Redis, dan Celery. PostgreSQL menjadi sumber jawaban ujian baru yang sudah dikonfirmasi tersimpan. Redis dipakai untuk broker/cache/revokasi token, serta kompatibilitas sesi lama sampai selesai.

## Menjalankan preview lokal

Gunakan Node.js 22, Python 3.12, dan Docker Compose. Jalankan dari root repositori. Preview tidak memakai database Supabase atau provider pembayaran/email/AI production.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
npm --prefix frontend ci
docker compose -f infra/development/compose.yml up -d --wait
python scripts/ops/development.py seed
```

Buka tiga terminal terpisah dengan virtualenv aktif:

```powershell
python scripts/ops/development.py api
python scripts/ops/development.py worker
python scripts/ops/development.py web
```

Buka `http://localhost:3107`. Akun sintetis: `demo@example.com` dan `admin@example.com`, password preview **PreviewOnly123!**. Gunakan hanya pada database preview lokal. Seed berisi tiga simulasi sintetis untuk menguji infrastruktur, bukan materi pembelajaran siap terbit.

Untuk membandingkan leaderboard tanpa menjalankan backend, jalankan `node node_modules/next/dist/bin/next dev --port 3107` dari folder `frontend`, lalu buka [10 format papan donasi](http://localhost:3107/donasi/desain). Tema mengikuti aplikasi yang sudah ada. Preview memuat 20 transaksi fiktif, statistik, pesan bergaya chat, opsi pin, dan skenario pergantian bulan/tahun. Panduan: [Studio leaderboard lokal](docs/donation-design-studio.md).

Untuk menjalankan seluruh aplikasi melalui Docker, termasuk 20 donasi contoh yang sama dengan studio:

```powershell
docker compose up -d --wait
docker compose run --rm --build seed
docker compose --profile app up -d --build
```

Buka [beranda lokal](http://localhost:3107) atau [halaman donasi lokal](http://localhost:3107/donasi). Pilih **Semua waktu** di halaman donasi untuk melihat seluruh 20 transaksi (Rp 2.946.000 dari 17 akun); **Bulan ini** mengikuti tanggal server dan hanya menampilkan transaksi bulan berjalan. Contoh mencakup donasi berulang, anonim, tanpa pesan, serta batas pergantian bulan dan tahun dalam WIB. Seed dapat dijalankan ulang tanpa menggandakan data.

`docker-compose.yml` menyediakan profil `app` untuk backend/frontend/worker/beat development dan layanan `seed` yang dijalankan secara eksplisit. Image backend memakai daftar dependensi runtime yang sama dengan production; build Dockerfile langsung tetap menyertakan alat development secara default. Konfigurasi ini hanya menggunakan PostgreSQL/Redis development, dengan kredensial pembayaran/email/AI kosong. Container aplikasi tidak melakukan migrasi otomatis. Helper seed memakai `create_all` hanya pada database bernama `tocpns_dev` di loopback atau host Compose `postgres` dengan opsi `--docker`; ini bukan pengganti Alembic untuk production.

## Verifikasi

```powershell
$env:TEST_DATABASE_URL='postgresql+asyncpg://tocpns:development-only@127.0.0.1:55439/tocpns_test'
python -m pytest backend/tests -q
npm --prefix frontend run lint:participant
npm --prefix frontend run test:unit
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Uji migrasi memakai database lokal khusus yang **harus kosong**:

```powershell
python scripts/ops/verify_migration.py
```

Script menolak menimpa database rehearsal yang sudah terisi. SQLite dapat dipakai untuk unit test cepat tanpa `TEST_DATABASE_URL`; pengujian konkurensi row lock memerlukan PostgreSQL.

## Aturan data dan rilis

CI/CD otomatis pada push `main`, pengaturan SSH, dan kebijakan cache/image: [docs/ci-cd.md](docs/ci-cd.md). Lint memberi saran; test dan build menjaga rilis. Deploy menunggu CI sukses dan schema production yang sesuai.

- Publikasi membuat snapshot privat paket. Sesi baru terikat pada snapshot; kunci dan pembahasan tidak dikirim sebelum ujian selesai.
- Ubah soal melalui draft, validasi, lalu terbitkan revisi. Paket dengan histori legacy disalin untuk penyuntingan; histori lama tidak dipalsukan menjadi snapshot atau dihapus saat impor.
- Client mesin ujian baru mengirim `X-Exam-Protocol: 2` pada start/resume. Bundle lama ditolak dengan `update_required` untuk sesi mesin baru; adapter sesi legacy tetap tersedia.
- Satu peserta memiliki satu sesi aktif dan satu writer. Jawaban diterima setelah commit, dengan mutation ID, revisi, dan antrean lokal per tab. Waktu berasal dari deadline server.
- Submit menyimpan pekerjaan scoring di PostgreSQL. Rekonsiliasi berkala memulihkan pekerjaan yang belum selesai ketika broker/worker sempat gagal.
- Harga dan durasi penawaran datang dari backend. Grant pembayaran dilindungi lock dan deduplikasi per order. Akun lama tanpa expiry tetap dipertahankan. Pembayaran nyata membutuhkan pengujian provider tersendiri.
- Production memakai `compose.production.yml`, image dengan digest, container tanpa root, konfigurasi privat, dan Cloudflare Tunnel. Detail akses/token berada di `.server-notes/`/`.secrets/` yang diabaikan Git.
- Migrasi adalah langkah rilis eksplisit setelah backup dan rehearsal. Jangan memakai `stamp head`, menghapus sejarah Alembic, atau melakukan downgrade destruktif untuk menyembunyikan ketidakcocokan schema. Migrasi jawaban baru sengaja menolak downgrade yang akan menghapus data.

Laporan implementasi dan batas validasi: [docs/infrastructure-implementation-2026-11-17.md](docs/infrastructure-implementation-2026-11-17.md). Prosedur cutover: [docs/redesign-release-runbook.md](docs/redesign-release-runbook.md). Rencana dan backlog tetap tersedia di folder `docs`.

## Tampilan

Tema terang, gelap, atau mengikuti perangkat tersedia di seluruh aplikasi. Gunakan tombol matahari/bulan pada header, atau pilih mode sistem melalui Akun → Tampilan. Preferensi disimpan pada browser. Audit 30 halaman, pengukuran kontras, dan screenshot ada di [docs/dark-theme-review-2026-11-17.md](docs/dark-theme-review-2026-11-17.md).
