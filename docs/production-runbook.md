# Ujian production — tocpns.my.id

Server: `/home/rusunawa/@docker/Ujian`. Lokal tetap `D:\Project\Test-CPNS`.
Gunakan `compose.production.yml` melalui wrapper `scripts/ops/compose.sh`;
`docker-compose.yml` lama adalah konfigurasi pengembangan.

## Arsitektur dan batas akses

```text
Browser HTTPS -> Cloudflare -> tunnel Ujian -> gateway:8080
                                             | /api/* dan /health -> backend:8001
                                             | lainnya          -> frontend:3000
backend / worker / beat -> Redis privat; backend -> PostgreSQL Supabase
```

Frontend/API memakai origin `https://tocpns.my.id`; www dialihkan ke root.
Backend dan Redis tidak mempublikasikan port host. Gateway diagnostik terikat
ke `127.0.0.1:8020`. Tunnel tidak menerima host networking atau Docker socket.

Subnet aplikasi `172.30.42.0/24`, edge `172.30.43.0/24`, sudah diperiksa tidak
bertumpuk dengan jaringan Docker yang ada saat persiapan. Uvicorn hanya
memercayai gateway `.42.2`; gateway hanya menerima IP pengunjung dari tunnel
`.43.3`. Header forwarded dari caller diganti, bukan diteruskan begitu saja.

## File privat dan bootstrap

| File di server | Isi |
| --- | --- |
| `.production.env` | URL dan client ID publik, port loopback, UID/GID |
| `.secrets/application.env` | Database, JWT, Google/email/DOKU |
| `.secrets/cloudflare-token` | Token tunnel Ujian saja |
| `.server-notes/images.env` | Digest base image dan tag release |
| `.server-notes/access.md` | Akses SSH dan inventaris |
| `.server-notes/build.log` | Hasil build |
| `.server-notes/backend-audit.json` | Audit dependency backend |

Folder privat: mode 700; file konfigurasi/token: 600. `.gitignore` dan
`.git/info/exclude` melindunginya dari commit biasa; build context juga
mengabaikan environment/rahasia. Jangan memakai `git add -f` untuk file privat.
Jangan menempel password/private key/token di chat, workflow, atau argumen CLI.

```sh
cd /home/rusunawa/@docker/Ujian
bash scripts/ops/prepare-secrets.sh
sudo bash scripts/ops/lock-images.sh
sudo bash scripts/ops/deploy-ujian.sh build
```

Bootstrap tidak menimpa konfigurasi yang sudah ada dan menghasilkan JWT secret
acak langsung di server. Kredensial lokal tidak disalin selama persiapan.
application.env memakai format raw: karakter `$` tidak diinterpolasi; jangan
menambahkan tanda kutip shell pada nilainya. Base images dikunci oleh digest.
Untuk pembaruan, tinjau/pull image vendor, lock ulang, rebuild, audit dan uji.

## Verifikasi tanpa data production

```sh
sudo bash scripts/ops/verify-images.sh
```

Project `ujian-verify` memakai PostgreSQL tmpfs, Redis sementara, jaringan
internal, tanpa port host atau kredensial production. Script membuat schema
dan akun sintetis hanya pada database `ujian_verify`. Cleanup hanya menghapus
resource project pengujian tersebut. Cakupan: JWT HS256 lama/baru, reset token,
cookie aman, registrasi, profil, katalog, logout, CORS, rate limit, frontend,
gateway, worker dan scheduler. Build frontend juga memeriksa rendering matematika.

```sh
sudo bash scripts/ops/deploy-ujian.sh preview
curl -I -H 'Host: tocpns.my.id' http://127.0.0.1:8020/
```

Preview hanya frontend/gateway lokal. API yang belum aktif menghasilkan 503;
preview bukan bukti aplikasi production berfungsi penuh dan tidak dipublikasikan.

## Konfigurasi production dan cutover

```sh
nano .secrets/application.env
nano .production.env
python3 scripts/ops/preflight.py app
sudo bash scripts/ops/deploy-ujian.sh start
```

Wajib: DATABASE_URL PostgreSQL asyncpg yang benar, JWT secret kuat,
ENV=production, COOKIE_SECURE=true, FRONTEND_URL/CORS origin HTTPS yang tepat.
Samakan Google/DOKU client ID dan mode payment pada kedua environment; rebuild
frontend setelah perubahan nilai publik. Email, Google, Gemini, dan DOKU yang
belum diberi kredensial belum dapat dinyatakan siap. Sandbox bukan pembayaran nyata.

Startup memeriksa revision Alembic secara read-only. Jika berbeda, buat backup
PostgreSQL yang dapat direstore dan tinjau migrasi sebelum menjalankan langkah
eksplisit berikut; jangan menjalankannya hanya untuk melewati preflight:

```sh
sudo bash scripts/ops/compose.sh run --rm --no-deps backend alembic -c backend/alembic.ini upgrade head
```

Database Supabase dapat dipertahankan. Sebelum cutover dari server lama:
selesaikan ujian aktif, drain antrean, amankan/pindahkan Redis, dan hentikan
worker/beat lama secara terencana. Jangan menyalakan dua scheduler production
tanpa rencana cutover. Log request tidak menyimpan query password-reset token.

## Cloudflare Tunnel dan domain

Nameserver yang diberikan untuk domain ini: `earl.ns.cloudflare.com` dan
`princess.ns.cloudflare.com`. Tunggu zone Active sebelum pengujian publik.

1. Di akun Cloudflare pemilik domain, buka Networking > Tunnels. Pada sebagian
   UI: Zero Trust > Networks > Connectors > Cloudflare Tunnels.
2. Buat tunnel terpisah bernama `ujian-tocpns`, connector cloudflared/Docker.
   Jangan mengubah tunnel HMJ/Rusunawa.
3. Ambil token dari perintah instalasi; simpan langsung melalui SSH dengan
   input tersembunyi. Script menerima token atau perintah Docker lengkap;
   script hanya mengekstrak token, tidak menjalankan perintah yang ditempel:

   ```sh
   bash scripts/ops/install-tunnel-token.sh
   ```

4. Untuk menampilkan connector sebagai Connected/Healthy pada dashboard,
   sebelum membuat route hostname publik:

   ```sh
   sudo bash scripts/ops/deploy-ujian.sh connect
   ```

   Langkah ini hanya menghubungkan connector; tidak membuat DNS/route domain
   dan tidak menjalankan backend/worker ke database production. Biarkan route
   publik belum dibuat sampai konfigurasi production dan pemeriksaan API siap.

   Sesudah `start`, revision schema, dan health API lulus, pemeriksaan akhir:

   ```sh
   sudo bash scripts/ops/deploy-ujian.sh tunnel
   ```

5. Tambahkan Published Application Routes:

   | Hostname | Type | Service URL |
   | --- | --- | --- |
   | `tocpns.my.id` | HTTP | `gateway:8080` |
   | `www.tocpns.my.id` | HTTP | `gateway:8080` |

   Saat route siap, ganti record A lama root/www yang konflik dengan record
   tunnel di Cloudflare. Pertahankan MX/TXT email. Jangan arahkan DNS ke IP
   private, atau origin Docker ke localhost:8020: localhost adalah connector
   itu sendiri, bukan gateway.
6. Periksa connector Healthy, sertifikat edge aktif, dan Always Use HTTPS.
   Jangan gunakan cache-all untuk API, health, login atau data peserta.

Token dimount sebagai secret hanya pada tunnel; tidak ada pada environment
atau argumen container. Readiness tunnel menguji koneksi, bukan sekadar proses.
Egress TCP 7844 ke kedua endpoint Cloudflare sudah diuji. Koneksi end-to-end
tetap memerlukan token dan route yang benar.

## Pemeriksaan publik sebelum peluncuran

- HTTPS root/www dan `/health` (database/Redis ok).
- Registrasi/login/logout, cookie Secure/HttpOnly/SameSite=Lax.
- Google Login: tambahkan origin domain HTTPS pada OAuth client.
- SMTP/reset password terkirim dan link memakai domain baru.
- Ujian, autosave, submit, nilai, riwayat, dan leaderboard.
- DOKU notification URL: `https://tocpns.my.id/api/v1/transactions/webhook`;
  uji callback/idempotensi dan samakan environment sebelum memakai uang nyata.
- AI diuji setelah GOOGLE_API_KEY production tersedia.

## Backup, pemantauan, rollback

Redis memakai AOF everysec dan noeviction untuk melindungi jawaban/antrean.
AOF everysec masih memiliki jendela kehilangan sekitar satu detik saat crash.

```sh
sudo bash scripts/ops/backup-redis.sh
sudo bash scripts/ops/deploy-ujian.sh status
sudo bash scripts/ops/compose.sh logs --tail=100 backend worker beat tunnel
```

Template timer/service di `infra/systemd` menjadwalkan snapshot harian 02:30 WIB;
pasang setelah Redis production aktif. Backup pada host yang sama belum cukup:
tentukan salinan terenkripsi di luar host, retensi dan uji restore. Backup
PostgreSQL/Storage Supabase harus mencakup data dan aset; Redis bukan penggantinya.

Simpan tag release lama beserta image-nya. Rollback aplikasi memakai tag lama
pada images.env lalu start; jangan downgrade database otomatis, periksa
kompatibilitas schema. Pantau health, disk, RAM/swap, Redis, antrean, dan backup.

Server bersama memiliki RAM sekitar 4 GB. Build diserialkan; runtime memiliki
batas resource dan rotasi log. Load test tetap diperlukan sebelum tryout besar;
konfigurasi ini tidak menjamin kapasitas ribuan peserta serentak.

GitHub Actions masih dijaga DEPLOY_ENABLED. Runner GitHub-hosted tidak otomatis
dapat menjangkau IP SSH private: siapkan jalur runner/VPN/Access yang sesuai
sebelum mengaktifkannya. Workflow tidak melakukan prune global, reset destruktif,
atau migrasi diam-diam. Perubahan persiapan belum di-commit/push; sinkronkan
source secara terencana sebelum memakai CI.
