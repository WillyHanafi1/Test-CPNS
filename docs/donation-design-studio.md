# Sepuluh format leaderboard donasi

Preview lokal: [http://localhost:3107/donasi/desain](http://localhost:3107/donasi/desain).

```powershell
cd frontend
node node_modules/next/dist/bin/next dev --port 3107
```

Tema, font, header, formulir donasi, dan bagian lain memakai aplikasi yang sudah ada. Hanya struktur papan peringkat yang berganti saat memilih salah satu dari sepuluh format. Statistik dan chat tetap sama. Preview mandiri, tanpa backend; data fiktif dan simulasi tidak membuat pembayaran.

| No. | Format | Perbedaan struktur |
| --- | --- | --- |
| 01 | Podium 3 Besar | Podium 2–1–3 dengan tinggi berbeda, daftar lanjutan di bawah. |
| 02 | Sorotan Donatur | Profil donatur utama yang besar, dua kartu kecil di samping. |
| 03 | Lintasan Dukungan | Grafik batang horizontal menurut total nominal setiap donatur. |
| 04 | Mosaik Pendukung | Mosaik/bento, peringkat satu mengisi dua baris. |
| 05 | Papan Streamer | Pita peringkat dengan angka besar, nama, nominal, dan pesan terakhir setiap donatur, termasuk anonim. |
| 06 | Dua Jalur Peringkat | Dua daftar paralel dengan nomor posisi sebagai penuntun. |
| 07 | Tangga Apresiasi | Kartu berjenjang dengan indentasi dan penghubung antar anak tangga. |
| 08 | Lingkaran Pendukung | Donatur utama di pusat, empat peringkat berikutnya mengelilinginya. |
| 09 | Galeri Kartu | Kartu profil horizontal, bisa digeser dengan sentuhan, keyboard, atau tombol. |
| 10 | Peringkat Interaktif | Buka-tutup rincian pesan dan frekuensi dukungan per peringkat. |

Konsep **05, Papan Streamer + pesan**, sudah diterapkan tetap pada beranda, dashboard, dan `/donasi`, menggunakan API asli. Pemilihan format di studio hanya memengaruhi contoh; preferensi eksperimen browser lama tidak mengganti tampilan aplikasi. URL menyimpan format, skenario, dan versi widget. Tombol **Buka halaman donasi** menuju halaman aplikasi, dan reset mengembalikan studio ke konsep 05. Studio hanya tersedia pada development.

Pada aplikasi, intro beranda berada di atas statistik. Di `/donasi`, formulir berada di bagian atas, lalu kontrol periode, statistik, dan papan komunitas di bawahnya. Papan menggunakan lebar penuh: leaderboard di kiri dan chat di kanan saat ruang mencukupi, lalu tersusun vertikal di layar kecil. Pesan setiap donatur tetap tampil pada baris leaderboard.

Untuk melihat halaman aplikasi dengan data API lokal, jalankan `docker compose up -d --wait`, `docker compose run --rm --build seed`, lalu `docker compose --profile app up -d --build` dari root repositori. Buka [beranda](http://localhost:3107) dan [donasi](http://localhost:3107/donasi). Dataset studio dan seed memakai sumber yang sama, `frontend/src/lib/donation-demo-data.json`. Pilih **Semua waktu** untuk seluruh 20 transaksi; filter bulan mengikuti waktu server. Seed hanya menyentuh database development dan tidak menggandakan transaksi saat diulang. Studio `/donasi/desain` tetap memerlukan server Next development, sedangkan Docker menjalankan build aplikasi.

## Konsep pesan dan pin

Kode `frontend/src/components/WallOfFame.tsx` lama masih tersedia. Di dalamnya ada podium Sultan NIP, statistik operasional, dan Aktivitas Live dengan `message`, nama, nominal, dan waktu. Backend sekarang masih memakai `UserTransaction.message`; endpoint publik membaca pesan yang sudah ada. Pengerjaan ini tidak menghapus pesan atau mengubah database. Keberadaan baris pesan asli di database production belum diverifikasi.

Panel chat mengambil konsep pesan lama dengan perilaku berikut:

- Urutan lama ke baru, pesan terbaru di bawah, pemisah tanggal dan jam dalam WIB.
- Saat dibuka, panel memperlihatkan bagian terbaru. Pembaruan mengikuti bagian bawah selama pengunjung belum menggulir ke riwayat lama.
- Saat membaca pesan lama, kedatangan donasi tidak memindahkan posisi baca. Tombol **Ke pesan terbaru** tersedia.
- Satu pesan pendukung teratas pada periode pilihan dapat dipin di luar alur chat, termasuk jika ia anonim. Cuplikan maksimal dua baris, dapat dibuka dan disembunyikan. Tidak ada pin jika donatur teratas belum menulis pesan.
- Pesan pin berasal dari pesan terakhir yang tidak kosong milik donatur teratas pada periode tersebut. Transaksi berikutnya yang tanpa pesan tidak menghapus pesan sebelumnya.
- Anonim ikut total, riwayat pesan, dan leaderboard dengan nama **Anonim** serta pesan terakhirnya. Dukungan digabung per akun dan pilihan tampil: transaksi anonim dan bernama dari akun yang sama menempati entri berbeda. Akun anonim berbeda tidak disatukan; tidak ada ID akun/email/order yang dikirim lewat leaderboard. Peringkat sama diperbolehkan bila total sama.
- Data asli diperiksa ulang setiap 30 detik selama tab terlihat dan ketika tab kembali aktif. Ini polling API, bukan koneksi WebSocket Chatango.
- Studio menyediakan opsi pin aktif/nonaktif dan **Simulasi pesan masuk**. Simulasi menambah transaksi sintetis pada sesi preview; reset/pergantian skenario mengembalikan 20 data awal.

Pin otomatis berdasarkan peringkat adalah pilihan desain untuk diuji, bukan aturan universal atau kemampuan yang diklaim berasal dari Chatango/Saweria. Pin ringkas menjaga ruang untuk pesan terbaru.

## Data contoh

Dataset dasar tetap 20 transaksi, total Rp 2.946.000 dari 17 akun sintetis. Termasuk nama/pesan panjang, kosong, emoji, dukungan berulang, tiga anonim, batas bulan pukul 23.59/00.00, dan pergantian tahun. Perhitungan memakai Asia/Jakarta.

| Skenario | Transaksi | Total | Target |
| --- | ---: | ---: | ---: |
| Semua data | 20 | Rp 2.946.000 | Tidak ada |
| November 2026 | 8 | Rp 211.000 | Rp 250.000 |
| Oktober 2026 | 6 | Rp 190.000 | Rp 250.000 |
| Desember, bulan baru | 0 | Rp 0 | Rp 250.000 |
| Januari, tahun baru | 3 | Rp 2.510.000 | Rp 250.000 |
| Target terlampaui | 8 | Rp 211.000 | Rp 150.000 |
| Hanya anonim | 3 | Rp 35.000 | Tidak ada |

## Referensi

- [Saweria, custom overlays](https://saweria.co/docs/custom-overlays): pola nama, nominal, dan pesan dukungan; kode dibuat khusus untuk TOCPNS.
- [Chatango Help](https://chatango.com/help): acuan panel percakapan yang bisa dipasang di halaman.
- [YouTube Help, pin live chat](https://support.google.com/youtube/answer/2524549?hl=en): contoh pesan pin sebagai sorotan di luar urutan percakapan. Pin donatur otomatis merupakan keputusan desain TOCPNS.
- Implementasi lama proyek: `frontend/src/components/WallOfFame.tsx`, termasuk riwayat commit `eaad261`, `1ed1603`, dan pembaruan `6cc526f`.

## Pemeriksaan

```powershell
npm run typecheck
npm run test:unit
npm run build
$env:PLAYWRIGHT_BASE_URL='http://localhost:3107'
node node_modules/@playwright/test/cli.js test e2e/donations.spec.ts e2e/donation-studio.spec.ts --workers=2
```

Pengujian mencakup sepuluh struktur berbeda dengan tema yang sama, statistik/chat yang tetap, ponsel 320/390/768px, gelap/terang, riwayat pesan dan pin, datangnya pesan baru saat menggulir, skenario periode, serta regresi login, nominal, privasi dan checkout.

Pada CI, Playwright menguji build production dan mengecualikan suite studio development. Pengujian donasi aplikasi tetap berjalan, termasuk beranda/dashboard, konsep 05 dengan pesan, donatur anonim, data API, dan checkout. Studio diuji secara lokal pada server development.
