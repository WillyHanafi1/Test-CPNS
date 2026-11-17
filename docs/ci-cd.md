# CI/CD otomatis

Push ke `main` menjalankan workflow **CI**. Backend (Python 3.12 + PostgreSQL 16) dan frontend (Node.js 22) diperiksa paralel. Setelah CI sukses, workflow **Deploy** mengirim commit yang sama ke server lewat SSH. Pull request hanya menjalankan CI. Perubahan dokumentasi saja dilewati; tombol **Run workflow** tetap tersedia.

Lint Ruff/ESLint bersifat saran dan tidak menghalangi deploy. Test backend, rehearsal migrasi pada database sementara, kedua suite unit frontend, typecheck, dan build tetap harus lolos. Tidak ada syarat coverage, format, E2E browser, atau persetujuan environment tambahan.

## Pengaturan sekali di GitHub

Buka repository → **Settings → Secrets and variables → Actions**. Isi repository secrets:

| Secret | Isi |
| --- | --- |
| `HOST` | Host/IP SSH server |
| `USERNAME` | User deployment yang sudah memiliki checkout repositori |
| `SSH_KEY` | Private key deployment khusus, tanpa passphrase |
| `SSH_KNOWN_HOSTS` | Baris public host key server yang sudah diverifikasi; untuk port khusus formatnya `[host]:9130 ssh-ed25519 AAAA…` |
| `SSH_PORT` | Opsional, default `9130` |

Verifikasi host key melalui console server/kanal tepercaya sebelum memasukkannya. `SSH_KNOWN_HOSTS` bukan key user dan bukan fingerprint `SHA256:…`; isinya format `known_hosts`. File key sementara di runner dihapus setelah SSH selesai. Tidak ada `StrictHostKeyChecking=no`.

Repository variables opsional:

| Variable | Default / fungsi |
| --- | --- |
| `DEPLOY_ENABLED` | Otomatis aktif jika kosong atau `true`; isi `false` untuk mematikan deploy sementara |
| `DEPLOY_PATH` | `/home/rusunawa/@docker/Ujian` |
| `DEPLOY_RUNNER` | `ubuntu-latest`; isi label unik runner Linux privat, misalnya `ujian-deploy`, jika host tidak dapat dijangkau dari GitHub |

Runner privat harus memiliki Bash, Git, SSH, dan versi runner yang mendukung actions Node.js 24 (minimal 2.327.1). Gunakan runner privat untuk job deploy terpercaya saja; CI pull request tetap memakai runner GitHub. Host SSH privat memerlukan jalur jaringan dari runner; workflow tidak otomatis membuka port atau membuat VPN.

## Persiapan server

- Checkout berada di `main`, bersih, dan dapat melakukan `git fetch origin main` tanpa prompt. Update hanya fast-forward; perubahan lokal tidak ditimpa.
- Docker Engine, Compose yang mendukung `build --builder`, Buildx ≥ 0.14, Python 3, `flock`, dan Bash tersedia. Builder `ujian-ci` dibuat otomatis dengan driver `docker-container`, memori 1536 MB, dan satu build aktif.
- `.production.env`, `.secrets/`, serta `.server-notes/images.env` sudah dipersiapkan menggunakan prosedur deployment proyek. Base image tetap dipin dengan digest.
- User SSH memiliki akses `sudo -n /usr/bin/bash /home/rusunawa/@docker/Ujian/scripts/ops/deploy-ujian.sh release …` sesuai pengaturan deployment proyek. Hak ini memberi kemampuan menjalankan kode rilis dengan Docker; gunakan user/key khusus.
- Schema production sudah sesuai commit kandidat. Migrasi production tetap eksplisit setelah backup/rehearsal sesuai [runbook](redesign-release-runbook.md). CI hanya memigrasikan database uji sekali pakai.
- Jika backend sudah berjalan, revision schema diperiksa secara read-only sebelum build untuk menghindari build yang belum bisa dirilis. Instalasi pertama tetap memeriksa schema melalui image kandidat setelah build.

Setelah konfigurasi tersebut siap, cukup push ke `main`. Tidak perlu menekan tombol deploy. Deploy manual juga hanya menerima commit `main` terbaru yang telah lolos CI. Workflow tidak mengubah pengaturan repository atau secrets.

## Kecepatan dan penyimpanan

- CI lama dibatalkan saat ada push baru; deployment yang sedang berjalan diselesaikan dan tidak diputus di tengah penggantian container. Rilis usang dilewati, termasuk jika `main` berubah sebelum SSH melakukan fetch.
- Cache hanya arsip download pip/npm, dengan key berdasarkan versi runtime dan lockfile. PR hanya membaca cache. `node_modules`, `.next`, browser Playwright, image tar, dan build artifact tidak diunggah.
- Setelah job CI selesai, cache pip/npm lama langsung dihapus, menyisakan satu versi terbaru per manager. Cache bawaan workflow lama juga dihapus setelah penggantinya tersedia. Cache dengan nama lain dipertahankan. Pembersihan gagal hanya memberi peringatan.
- Docker menggunakan builder khusus `ujian-ci`. Cache yang dapat dihapus dipangkas menjadi maksimal 512 MB setelah setiap percobaan rilis, termasuk yang gagal; builder kemudian dihentikan untuk melepaskan RAM. Layer yang sedang dipakai tidak dapat dipangkas. Angka ini tidak mencakup image runtime atau layer aktif selama build.
- Setelah healthcheck sukses, image `ujian-backend`, `ujian-frontend`, dan `ujian-gateway` dibersihkan, menyisakan tag aktif dan satu tag sebelumnya. Image yang masih dirujuk container dipertahankan oleh Docker. Tidak ada pembersihan volume, database, backup, atau image aplikasi lain.
- Manifest sebelum rilis disimpan di `.server-notes/images.previous.env`. Jika build/schema check gagal, manifest lama dipulihkan sebelum penggantian aplikasi. Jika startup/healthcheck gagal, script mencoba menyalakan kembali image sebelumnya dan tetap melaporkan deploy gagal. Bila pemulihan juga gagal, diperlukan pemeriksaan operator.
- Log Docker sudah dibatasi `10m × 3` per container di Compose. Retensi log workflow diatur pada GitHub **Settings → Actions → General**; disarankan 7 hari. Workflow tidak mengunggah artifact baru atau menghapus log historis.

Pembersihan otomatis berlaku saat workflow baru dijalankan di GitHub/server dan dibatasi pada cache serta image aplikasi ini.
