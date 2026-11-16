# Deployment Ujian

Konfigurasi production yang telah disiapkan memakai `compose.production.yml`.
Lihat [runbook production](production-runbook.md) untuk perintah, pengujian,
aktivasi Cloudflare, cutover, backup dan rollback. Daftar temuan di bawah
merupakan pemeriksaan awal terhadap `docker-compose.yml` pengembangan.

Folder pengembangan lokal tetap `D:\Project\Test-CPNS`. Nama folder aplikasi
di server Rusunawa adalah `/home/rusunawa/@docker/Ujian` (huruf U besar),
sejajar dengan folder aplikasi `HMJ` dan `rusunawa`.

Catatan akses dan inventaris server disimpan hanya di server, pada
`.server-notes/access.md` di dalam folder Ujian. Folder catatan berizin `700`
dan file berizin `600`. Catatan tidak memuat password, private key, atau API
key. Folder `.server-notes/` diabaikan Git; server juga mengecualikannya lewat
`.git/info/exclude` yang tidak ikut push.

## Status persiapan

- Source berasal dari repository `WillyHanafi1/Test-CPNS`, branch `main`.
- Konfigurasi API dan kredensial tetap di lokal selama persiapan. Jangan
  menyalin `.env` lokal ke server karena berisi URL pengembangan dan rahasia.
- Pembuatan folder dan penyalinan source tidak menjalankan container atau
  migrasi database.
- Gunakan nama project Compose `ujian` pada setiap perintah deployment.

## Sebelum menyalakan aplikasi

1. Tentukan domain baru dan alamat API publik. Frontend dan API harus dapat
   diakses pengguna melalui HTTPS; `localhost` hanya untuk pengembangan.
2. Siapkan `.env` production langsung di server, dengan izin file `600`.
   Database Supabase dapat dipertahankan. Amankan data Redis dan selesaikan
   atau hentikan sesi ujian aktif sebelum perpindahan dari server lama.
3. Sesuaikan Compose untuk meneruskan `ENV=production`, `FRONTEND_URL`, dan
   konfigurasi email. Hapus `--reload` untuk production. Sesuaikan build args
   DOKU di Dockerfile frontend dengan variabel yang digunakan source.
4. Periksa port host dan nama container agar tidak bertabrakan dengan aplikasi
   lain. Pada pemeriksaan 16 November 2026, Rusunawa memakai port `8011` dan
   `8012`, sedangkan WAHA memakai `127.0.0.1:3008`. Verifikasi ulang sebelum
   deployment dan atur reverse proxy untuk domain baru.
5. Perbarui origin Google Login, notification URL DOKU, CORS, dan URL reset
   password. Rebuild frontend setelah mengubah `NEXT_PUBLIC_API_URL`.
6. Sebelum memakai GitHub Actions, arahkan secrets `HOST`, `USERNAME`, dan
   `SSH_KEY` ke server ini. Aktifkan repository variable `DEPLOY_ENABLED=true`
   hanya sesudah konfigurasi production siap; job deployment dilewati selama
   variabel tersebut belum bernilai `true`.

Workflow deployment memakai `/home/rusunawa/@docker/Ujian` dan project Compose
`ujian`. Workflow tidak melakukan pembersihan image global pada server bersama.
Jangan menjalankan `down`, restart, atau penghapusan volume pada project lain.
