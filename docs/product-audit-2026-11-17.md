# Audit produk, UI/UX, dan penyederhanaan TOCPNS

Tanggal pemeriksaan: 17 November 2026. Basis kode: `main`, commit `7fab08012a104238960e38f14f368ec6959690ef`, sama dengan `origin/main` saat pemeriksaan.

## 1. Keputusan utama

Fokus produk yang disarankan: **latihan CAT yang dapat dipercaya, akses paket yang jelas, dan pembahasan yang membantu peserta memperbaiki hasil.**

Permintaan pemilik: hapus AI peserta; AI admin tetap opsional. Pelanggan aktif memperoleh seluruh paket yang termasuk keanggotaan. Jangan menambah jenjang langganan atau pembelian per paket untuk perubahan pertama.

Hak akses Pro ke semua paket premium sebenarnya sudah ada: `backend/api/v1/endpoints/package_api.py:195` dan `backend/api/v1/endpoints/exam.py:113`. Jadi kebutuhan terbesar adalah menyederhanakan janji produk dan pengalaman pengguna, sekaligus membenahi kualitas paket serta konsistensi pelaksanaannya.

Urutan yang disarankan:

1. Benahi integritas soal, penyimpanan jawaban, timer, aturan akses, dan informasi pembayaran.
2. Hapus AI peserta dari UI, API, task, dan pemasaran; pertahankan analitik berbasis jawaban.
3. Susun ulang dashboard, katalog, hasil, pembahasan, dan navigasi.
4. Rapikan visual dan ukur penggunaan nyata sebelum menambah fitur.

## 2. Metode dan batas pemeriksaan

- Membaca alur frontend Next.js, backend FastAPI, model data, scoring, keanggotaan, pembayaran, AI, dan publikasi admin.
- Memeriksa aplikasi publik: beranda, katalog, detail paket, upgrade, dukungan, login, dan tautan pusat bantuan. Tampilan publik diperiksa pada desktop serta viewport ponsel 390 × 844.
- Melakukan query agregat production dalam transaksi `SET TRANSACTION READ ONLY`, lalu rollback. Tidak mengambil identitas peserta, isi percakapan, atau data transaksi individu.
- Menghitung ulang rumus timer untuk mengonfirmasi contoh ketidaksesuaian sisa waktu. Ini reproduksi rumus, bukan pengujian ujian production.
- Halaman setelah login—dashboard, ujian, hasil, pembahasan, analitik—dinilai dari kode. Tidak ada login sebagai peserta, sesi ujian baru, pembayaran, pengiriman email, atau panggilan AI yang dijalankan untuk audit ini.
- Isi 764 soal tidak dibaca dan diverifikasi akademis satu per satu. Ada pembahasan bukan berarti isinya sudah benar.
- Audit ini bukan uji beban, pentest lengkap, audit WCAG menyeluruh, atau riset perilaku pengguna. Pengaruh desain terhadap konversi masih hipotesis yang perlu diuji.

## 3. Kondisi katalog sebenarnya

| Indikator production | Hasil |
| --- | --- |
| Seluruh paket di database | 27 |
| Terbit dan aktif | 8 |
| Draft/tidak aktif | 19 |
| Paket terbit gratis / premium | 6 / 2 |
| Paket mingguan terbit | 0 |
| Kategori seluruh paket terbit | Mix |
| Soal dalam paket terbit aktif | 764 |
| Soal terbit tanpa pembahasan / subkategori | 0 / 0 |
| Soal terbit dengan lima opsi | 764 |

Jumlah soal per paket:

| Paket mandiri | Soal | TWK / TIU / TKP | Catatan |
| --- | ---: | --- | --- |
| #1–#6, masing-masing | 110 | 30 / 35 / 45 | Struktur jumlah sesuai format SKD yang digunakan aplikasi |
| #7 | 104 | 30 / 29 / 45 | Kurang enam soal TIU dibanding format yang dijanjikan |
| #8 | 0 | 0 / 0 / 0 | Sudah terbit meskipun kosong |

Kartu dan detail tetap menulis 110 soal untuk semua paket (`frontend/src/components/PackageCard.tsx:92`, `frontend/src/app/catalog/[id]/page.tsx:204`). Ini masalah kepercayaan dan hasil latihan, bukan sekadar tampilan.

Ditemukan satu soal TWK dengan seluruh skor opsi 0. Tidak ada jawaban yang menghasilkan poin pada soal itu. Ada juga 29 soal TKP dengan pola skor berbeda dari satu opsi masing-masing bernilai 1–5, termasuk beberapa opsi dengan nilai 5. Ini **kandidat pemeriksaan editorial**, bukan bukti bahwa 29 soal tersebut pasti salah: kebenaran bobot harus diputuskan berdasarkan kebijakan soal dan penilaian yang memang ingin digunakan.

Fondasi yang layak dipertahankan: semua soal terbit mempunyai pembahasan dan subkategori terisi; sistem ujian, riwayat, pemisahan nilai TWK/TIU/TKP, serta pemeriksaan kepemilikan sesi sudah tersedia. Produk tidak perlu dibangun ulang dari nol.

## 4. Temuan paling mendesak

P0 berarti perlu diselesaikan sebelum promosi berbayar atau klaim keandalan diperluas. P1 berarti bagian perombakan inti berikutnya. Prioritas ini penilaian audit, bukan hasil pengukuran jumlah pengguna terdampak.

### P0 — Kualitas paket dan gerbang publikasi

Paket #8 kosong, #7 tidak lengkap, dan satu soal TWK tidak memiliki opsi bernilai positif. Admin dapat mengubah `is_published` tanpa validasi kelengkapan (`backend/api/v1/endpoints/admin_packages.py:136`).

Tindakan yang disarankan:

- Tinjau dan hentikan penawaran paket yang belum siap; simpan data historis, jangan menghapus paket beserta sesi peserta.
- Tolak publikasi simulasi penuh jika jumlah, komposisi, nomor soal, isi opsi, bobot, atau pembahasannya tidak memenuhi aturan paket.
- Bedakan simulasi penuh dan latihan pendek jika kelak benar-benar dibuat. Jangan melabeli 104 soal sebagai simulasi 110 soal.
- Tampilkan jumlah soal aktual dari API, bukan angka tetap di komponen.
- Sediakan laporan validasi di admin: paket mana, soal mana, masalah apa, dan cara memperbaikinya.
- Pisahkan hasil pemeriksaan struktur otomatis dengan persetujuan akademis manusia. AI admin boleh membantu membuat draft, tetapi publikasi tetap melalui peninjauan.

### P0 — Autosave memberi kepastian yang belum dibuktikan

`frontend/src/components/exam/QuestionDisplay.tsx:31` memperbarui state lokal kemudian memanggil `fetch` tanpa `await`, pemeriksaan `response.ok`, atau antrean pengiriman ulang. `try/catch` itu tidak menangkap penolakan Promise asynchronous sebagaimana dimaksud. Respons HTTP 403/429/500 juga tidak otomatis dianggap kegagalan oleh `fetch`.

Namun `frontend/src/components/exam/ExamSidebar.tsx:144` selalu menampilkan titik hijau dan “Jawaban tersimpan otomatis”. Penyelesaian mengirim body kosong (`frontend/src/app/exam/[id]/result/page.tsx:85`); scoring membaca jawaban Redis (`backend/core/tasks.py:78`). Jawaban yang hanya ada di localStorage belum tentu ikut dinilai.

Risiko berdasarkan kode: peserta melihat jawabannya terpilih, tetapi sebagian pilihan belum diterima server. Belum ada pengukuran kehilangan jawaban nyata pada audit ini.

Desain perilaku yang diperlukan:

- Status jujur: **Menyimpan → Tersimpan**, atau **Belum terkirim — akan dicoba lagi**.
- Antrean jawaban per sesi dan soal; pengiriman ulang dengan jeda bertambah; versi jawaban agar permintaan lama tidak menimpa pilihan terbaru ketika respons datang tidak berurutan.
- Bedakan penyimpanan lokal, penerimaan server, dan ketahanan penyimpanan saat Redis/server bermasalah. Jelaskan janji yang benar-benar dapat dijamin.
- Saat selesai manual, selesaikan sinkronisasi sebelum finalisasi dengan aturan batas waktu tetap berlaku di server. Jawaban baru sesudah deadline tidak boleh diterima hanya karena berasal dari antrean.
- Saat koneksi putus, peserta tetap bisa melihat jawaban lokal dan status tertunda. Jangan menjanjikan mode offline penuh sebelum perilaku reconnect dan deadline ditetapkan.
- Uji koneksi terputus, HTTP 429/500, jawaban cepat berubah, dua tab, refresh, serta penekanan Selesai ketika penyimpanan masih berlangsung.

### P0 — Timer resume dapat menampilkan sisa waktu keliru

`frontend/src/store/useExamStore.ts:65` menghitung offset sebagai `end_time - duration - now`. Jika sisa waktu sebenarnya 20 menit tetapi durasi penuh 100 menit, formula itu membentuk waktu acuan seolah sesi baru dimulai: tampilan kembali menjadi 100 menit ketika jalur inisialisasi backend dijalankan pada sesi lama, misalnya pada browser baru.

Reproduksi aritmetika: sisa aktual 20 menit → sisa tampilan 100 menit. Ini tidak berarti server memberi tambahan waktu: endpoint autosave tetap menolak setelah deadline (`backend/api/v1/endpoints/exam.py:260`). Akibatnya tampilan dan penerimaan jawaban bisa bertentangan.

Perlu `server_now` dan `end_time` yang eksplisit; jangan menebak waktu server dari durasi penuh. Refresh, resume, pergantian tab, waktu perangkat berbeda, dan bangun dari sleep harus diuji. Jalur lokal yang langsung melewati pemeriksaan backend (`frontend/src/app/exam/[id]/page.tsx:45`) juga perlu ditinjau. State lokal perlu dipisahkan per akun dan sesi, lalu direkonsiliasi dengan jawaban server saat melanjutkan.

### P0 — Aturan paket belum konsisten di server

Endpoint katalog memeriksa `is_published`, tetapi tidak `is_active` (`backend/api/v1/endpoints/package_api.py:40`); sementara arsip admin hanya mengubah `is_active=False` (`backend/api/v1/endpoints/admin_packages.py:177`). Artinya arsip belum menjadi larangan tampil yang konsisten.

Endpoint memulai ujian mengambil paket berdasarkan ID dan memeriksa keanggotaan premium, tetapi belum memeriksa status terbit/aktif, kelengkapan, atau jendela jadwal (`backend/api/v1/endpoints/exam.py:92`). Endpoint `/access` memeriksa waktu mulai tetapi punya urutan aturan berbeda dan tidak memeriksa terbit/aktif (`backend/api/v1/endpoints/package_api.py:178`).

Temuan ini berasal dari pembacaan kode; tidak dilakukan percobaan mengerjakan draft di production. Solusinya satu kebijakan akses backend yang dipakai katalog, detail, akses, mulai, dan resume. Tombol UI mengikuti hasil kebijakan tersebut. Akses Pro tidak boleh membuka draft atau meniadakan jadwal tryout resmi secara tidak sengaja.

### P0 — Masa langganan dan konfirmasi pembayaran tidak jelas

- Landing: Rp50.000/tahun (`frontend/src/app/page.tsx:223`).
- Upgrade: “Lifetime Access” dan sekali bayar (`frontend/src/app/catalog/upgrade/page.tsx:158`).
- Fulfillment: menambah 365 hari (`backend/api/v1/endpoints/transactions_api.py:372`).
- Halaman success menulis “Pembayaran Berhasil!” tanpa memeriksa status transaksi ke server (`frontend/src/app/payment/success/page.tsx:80`). Itu tidak membuktikan backend dapat diakali untuk memperoleh Pro; backend masih mengaktifkan hak melalui fulfillment. Masalah yang terkonfirmasi adalah pesan sukses UI tidak didukung verifikasi pada halaman tersebut.
- Tombol Invoice belum memiliki handler dan “Hubungi Support” masih berupa span tanpa tautan (`frontend/src/app/payment/success/page.tsx:109`, `:127`). “Riwayat” mengarah ke riwayat ujian, bukan riwayat transaksi.
- Runtime pembayaran terkonfirmasi masih **DOKU sandbox** saat audit.

Pilih satu masa manfaat yang jelas. Untuk perubahan awal, 12 bulan paling dekat dengan perilaku backend saat ini; ini rekomendasi, belum keputusan harga atau kebijakan baru. Tampilkan harga, durasi, cakupan, tanggal berakhir, dan ketentuan perpanjangan yang sama di semua tempat. Jangan menggunakan “seumur hidup” jika haknya berakhir.

Halaman pembayaran perlu status: **menunggu / sedang diverifikasi / berhasil dan akses aktif / gagal / kedaluwarsa**. Sumbernya status transaksi dan hak akun di backend. Simpan konteks paket sebelum login dan pembayaran agar peserta kembali ke tindakan yang ingin dilakukan. Persiapan menerima pembayaran sungguhan memerlukan konfigurasi production serta uji alur pembayaran/webhook; situs yang dapat diakses publik belum membuktikan kesiapan transaksi nyata.

### P0 — Statistik dan janji promosi harus dapat dibuktikan

`backend/api/v1/endpoints/public_stats.py:42` menambah 120 pada jumlah akun; 94% akurasi dan 99,9% uptime adalah konstanta; fallback kegagalan menampilkan 50rb+ pengguna. Upgrade menulis 5.000+ siswa Pro, 50+ paket, dan 92% tingkat kelulusan sebagai teks tetap (`frontend/src/app/catalog/upgrade/page.tsx:205`). Landing menjanjikan 1.000+ **paket**, padahal paket terbit saat ini 8.

Hapus angka yang tidak memiliki sumber pengukuran. Jumlah akun terdaftar juga berbeda dari peserta aktif; “tingkat kelulusan” membutuhkan definisi dan data hasil seleksi nyata, bukan kelulusan simulasi. Jika query statistik gagal, sembunyikan bagian itu atau tampilkan keterangan belum tersedia.

Enam dari delapan paket terbit gratis, yaitu 75% berdasarkan jumlah paket; klaim 95% gratis tidak mencerminkan katalog sekarang. Janji SKB juga belum tampak pada katalog terbit yang seluruhnya Mix/SKD. Klaim “terbaru”, “24/7”, pembaruan mingguan, dan acuan BKN perlu sesuai layanan serta konten yang benar-benar tersedia.

## 5. Model produk yang disarankan

Satu janji: **“Akses semua paket latihan yang tersedia, kerjakan simulasi CAT, dan pelajari pembahasannya selama masa keanggotaan.”**

Kata “semua” perlu berarti seluruh paket peserta yang terbit, aktif, dan termasuk cakupan yang ditawarkan. Draft tidak termasuk. Jika paket mingguan dipertahankan, jadwal dan jumlah percobaannya tetap diberitahukan. Paket baru dalam cakupan yang sama dapat ikut tersedia selama keanggotaan aktif; jangan menyiratkan akses abadi setelah masa aktif habis.

| Kemampuan | Gratis | Pro aktif | Pro berakhir |
| --- | --- | --- | --- |
| Melihat katalog dan detail | Ya | Ya | Ya |
| Mengerjakan paket contoh yang ditetapkan gratis | Ya | Ya | Ya |
| Mengerjakan seluruh paket premium yang siap | Tidak | Ya | Tidak untuk sesi baru |
| Melihat hasil dan pembahasan sesi sendiri yang sudah selesai | Ya | Ya | Disarankan tetap ya; backend review saat ini tidak memeriksa Pro |
| Menyelesaikan sesi yang sudah sah dimulai | Sesuai deadline | Sesuai deadline | Disarankan tetap boleh sampai deadline awal |
| AI peserta | Tidak | Tidak | Tidak |
| Tryout terjadwal | Jika memenuhi aturan acara | Jika memenuhi aturan acara | Jika memenuhi aturan acara |

Jumlah paket contoh gratis adalah keputusan produk yang belum dibuat. Satu atau beberapa contoh lengkap cukup sebagai rancangan awal untuk diuji; tidak perlu langsung mencabut akses gratis yang sudah tersedia. Perubahan akses perlu diberitahukan dan hak pembelian lama dijaga.

Penghapusan AI mengurangi salah satu manfaat yang pernah dipromosikan. Jangan diam-diam mengurangi janji bagi pelanggan lama. Inventarisasi hak lama dan komunikasi perubahan; pertimbangkan masa transisi atau kompensasi yang realistis. Audit ini tidak menetapkan kebijakan refund atau mengubah hak akun.

Jangan sekaligus mengganti harga, seluruh cakupan gratis, masa aktif, identitas merek, dan semua navigasi. Perubahan yang terlalu banyak menyulitkan pengujian apakah perbaikan benar-benar membantu.

## 6. Rencana menghapus AI peserta

| Area | Perubahan yang dibutuhkan |
| --- | --- |
| Chat mengambang | Lepas `GlobalChatBubble` dari shell/layout peserta |
| Pembahasan | Lepas tombol Tanya Tutor AI dan `ReviewChatPanel`; pertahankan pembahasan editorial |
| Hasil | Lepas `AIAnalysisCard`, tombol generate, state AI, dan polling AI |
| Mastery Digest | Tutup endpoint peserta `/user/me/mastery/digest` dan pemanggilnya bila ada |
| API chat | Nonaktifkan rute peserta untuk start/message/history; menghapus tombol saja tidak cukup |
| Generate analisis | Nonaktifkan `/exam/{session_id}/ai-generate` dan penjadwalan task peserta |
| Respons API | Hentikan pengiriman `ai_analysis`/`ai_status` ke UI baru setelah memastikan kompatibilitas rollout |
| Pemasaran | Hapus manfaat/upsell AI di beranda, hasil, bantuan, dan teks terkait |
| AI admin opsional | Pertahankan hanya dengan pemeriksaan role admin, batas penggunaan, dan peninjauan hasil |

Referensi: `backend/main.py:75`, `backend/api/v1/endpoints/chat.py`, `backend/api/v1/endpoints/exam.py:727`, `backend/api/v1/endpoints/user_api.py:46`, `backend/core/tasks.py:338`, serta komponen AI di frontend.

Task scoring dan AI masih berada dalam modul task yang sama, dengan import AI di tingkat modul. Pisahkan ketergantungan agar kegagalan konfigurasi AI admin tidak mengganggu scoring. Celery tetap diperlukan untuk pekerjaan lain; jangan ikut menghapus worker hanya karena AI peserta dihapus.

Saat rilis, hentikan enqueue AI peserta baru, tentukan penanganan task AI yang telanjur antre, dan pertahankan task scoring/email. Jangan membersihkan seluruh antrean Celery. Simpan data AI historis sesuai keputusan retensi; jangan langsung drop tabel atau kolom dalam rilis pertama. Kunci provider tetap privat dan hanya digunakan komponen admin yang membutuhkannya.

Ukuran keberhasilan: pengguna gratis maupun Pro tidak melihat AI; endpoint peserta tidak menghasilkan panggilan model; ujian, skor, pembahasan, dan analitik biasa tetap berfungsi; admin tetap dapat menggunakan alat AI jika diaktifkan.

## 7. UI/UX: apa yang perlu dirombak

### Navigasi

Gunakan empat tujuan tetap untuk peserta: **Beranda — Paket Soal — Riwayat — Akun**. Ringkasan progres bisa berada di Beranda/Riwayat; tidak perlu tab baru hanya karena ada grafik. Akun memuat status keanggotaan, tanggal berakhir, transaksi, dan bantuan.

Peringkat menjadi menu sekunder atau konteks hasil tryout. Donasi, Wall of Fame, dan profil pengembang pindah ke halaman dukungan/footer. Saat ujian, gunakan shell khusus tanpa navigasi promosi.

Saat ini Navbar umum masih membawa Fitur Utama/Harga/Dukung Kami, dashboard memiliki navbar berbeda, dan detail paket mempunyai navbar sendiri. Shell peserta bersama akan mengurangi perbedaan istilah dan posisi kontrol (`frontend/src/components/Navbar.tsx`, `frontend/src/app/dashboard/page.tsx:101`, detail paket `:124`).

### Dashboard: satu tindakan utama berdasarkan keadaan

Urutan:

1. Ada sesi berjalan: **Lanjutkan ujian**, judul, progres, dan sisa waktu server.
2. Belum pernah mencoba: **Mulai tryout pertama**, dengan paket contoh yang jelas.
3. Baru selesai: **Pelajari pembahasan**, terutama jawaban salah/kosong.
4. Sudah belajar: rekomendasi sederhana dari data aktual, misalnya topik dengan perolehan poin terendah dan jumlah jawaban yang mendasarinya.

Setelah itu tampilkan skor terakhir, perkembangan beberapa sesi, dan satu akses ke katalog. Tidak perlu empat panel promosi yang sama kuat.

Kode dashboard sekarang memuat hero besar, widget kesiapan, kartu donasi, Wall of Fame dengan jarak atas besar, dan MagicBento (`frontend/src/app/dashboard/page.tsx:350`, `:413`, `:430`). Kartu donasi juga menyatakan platform gratis untuk semua, padahal ada akses berbayar. Penyederhanaan hierarki ini lebih berguna daripada sekadar mengganti warna.

Sketsa informasi, bukan data peserta asli:

```text
TOCPNS                  Beranda  Paket Soal  Riwayat  Akun

Keanggotaan aktif sampai [tanggal]

Lanjutkan tryout [nama paket]          [Lanjutkan]
[jumlah dijawab] / [jumlah soal] · Sisa [waktu server]

Hasil terakhir
TWK [nilai]    TIU [nilai]    TKP [nilai]    Total [nilai]
[Lihat pembahasan]

Latihan berikutnya
[Paket yang belum dikerjakan]          [Lihat paket]
```

### Katalog: bantu memilih, jangan memaksa membaca brosur

Tampilan publik sudah memiliki grid dan pencarian yang dapat dipakai. Masalahnya: kartu panjang, spesifikasi diulang dalam deskripsi dan metadata, label “Harga PREMIUM” tidak menyatakan hak pengguna, dan urutan paket tidak jelas.

Kartu ideal cukup memuat judul, jenis latihan, jumlah soal aktual, durasi, status pengerjaan, dan satu tombol. Untuk Pro aktif gunakan **“Termasuk keanggotaan”**, bukan simbol gembok yang menyiratkan harus membeli lagi.

Contoh status/tombol:

| Keadaan | Label / tindakan |
| --- | --- |
| Pro, belum dikerjakan | Termasuk keanggotaan · Mulai |
| Sesi berjalan | Sedang dikerjakan · Lanjutkan |
| Sudah selesai | Selesai · Lihat hasil; Ulangi sebagai tindakan sekunder |
| Gratis, paket premium | Termasuk Pro · Lihat keanggotaan |
| Belum mulai jadwalnya | Mulai [tanggal/jam] · tombol mulai belum aktif |

Masalah implementasi yang ikut perlu dibenahi:

- Kartu “Lihat Hasil” dan “Lanjutkan” tetap menuju halaman detail paket, bukan hasil/sesi yang sesuai (`frontend/src/components/PackageCard.tsx:115`).
- Cache anonim dibaca sebelum pengecekan pengguna; jika cache hangat, status personal dapat hilang meskipun komentar kode menyatakan cache dilewati bagi pengguna login (`backend/api/v1/endpoints/package_api.py:35`).
- Jika ada sesi selesai dan sesi berjalan pada paket yang sama, pemetaan status mendahulukan selesai (`package_api.py:69`), berlawanan dengan kebutuhan melanjutkan latihan terkini.
- Backend memakai default limit 10; frontend tidak mengirim pagination/load-more. Saat katalog lebih dari 10 paket, “semua paket” berpotensi berarti hanya halaman pertama (`package_api.py:25`, `frontend/src/app/catalog/page.tsx:50`).
- Frontend menyiapkan bagian mingguan, tetapi endpoint katalog justru mengecualikan mingguan (`catalog/page.tsx:170`, `package_api.py:40`).
- Filter TWK/TIU/TKP memfilter kategori paket, sedangkan semua paket terbit adalah Mix. Pengguna yang mencari soal TIU bisa mendapat daftar kosong walaupun setiap paket memuat TIU. Untuk rilis sederhana gunakan istilah “Simulasi SKD”; tampilkan filter kategori lain saat kontennya tersedia.
- Parsing tanggal dengan menambahkan `Z` perlu ditinjau untuk nilai ISO yang sudah mempunyai offset (`PackageCard.tsx:25`). Ini risiko pada paket terjadwal; saat audit belum ada paket mingguan terbit.

### Detail paket dan onboarding

Pada ponsel, manfaat generik dan informasi ambang batas muncul sebelum tombol masuk/mulai. Pindahkan ringkasan serta tindakan utama ke atas. Detail panjang bisa dibuka jika perlu. Gunakan bahasa Indonesia yang konsisten; login sekarang mencampur Welcome Back/Sign In/Register here dengan Google berbahasa Indonesia.

Pertahankan konteks: katalog → paket → masuk/daftar → kembali ke paket yang dipilih. Auth saat ini mengarahkan peserta ke dashboard (`frontend/src/context/AuthContext.tsx:101`), sementara tombol login detail tidak membawa tujuan kembali (`frontend/src/app/catalog/[id]/page.tsx:238`).

Sebelum timer dimulai, tampilkan aturan ringkas dan tombol eksplisit **Mulai ujian**. Saat ini membuka halaman `/exam/[id]` dapat langsung membuat sesi melalui POST. Peserta perlu memahami durasi, aturan pengulangan, serta konsekuensi keluar terlebih dahulu.

### Halaman ujian

Pertahankan elemen yang membantu fokus: pertanyaan, opsi, timer, ragu-ragu, navigasi nomor, dan konfirmasi selesai. Ragu-ragu dan zoom gambar sudah ada dan berguna.

Perbaiki perilaku penyimpanan/timer lebih dahulu. Setelah itu:

- Susun jawaban teks secara vertikal untuk bacaan panjang; pola dua kolom berisiko mempersulit pemindaian. Gambar boleh memakai tata letak yang sesuai ukurannya.
- Sediakan Sebelumnya/Berikutnya dan akses navigator yang mudah dijangkau di ponsel. Hindari dua kontrol navigator yang menduplikasi satu sama lain atau tombol mengambang yang menutupi konten.
- Konfirmasi selesai menampilkan jumlah dijawab, kosong, ragu-ragu, serta jawaban belum tersinkron. Saat ini hanya pesan umum (`frontend/src/components/exam/ExamHeader.tsx:79`).
- Jawaban yang diberi ragu-ragu tetap dihitung sebagai “sudah dijawab” bila opsi dipilih. Sidebar sekarang menguranginya dari jumlah dijawab (`ExamSidebar.tsx:67`). Jadikan ragu sebagai penanda tambahan, bukan kategori yang menyembunyikan progres sebenarnya.
- Beri nama aksesibel pada tombol ikon, status teks selain warna, fokus keyboard yang jelas, dan modal dengan fokus/penutupan yang benar.

### Hasil dan pembahasan

Hasil sebaiknya menjawab: **berapa nilai saya, bagian mana yang belum memenuhi target latihan, dan apa yang saya pelajari berikutnya?**

Urutan: skor total/per bagian → perbandingan dengan acuan yang dinyatakan → tombol **Pelajari pembahasan** → ringkasan soal bermasalah → latihan berikutnya. Peringkat menjadi informasi tambahan.

Gunakan “Memenuhi ambang batas latihan” alih-alih menyiratkan pasti lulus seleksi. Dashboard/riwayat saat ini memakai “LULUS (P/L)” dan “TIDAK LULUS”, yang mudah dibaca sebagai hasil seleksi resmi. Acuan ambang batas harus punya tahun/jenis peserta yang jelas dan sumber yang diperiksa ketika aturan berubah; audit ini tidak memvalidasi peraturan CPNS terbaru.

Pengganti terbaik chat AI adalah pembahasan yang lebih mudah dipakai: filter **Semua / Salah / Kosong / Poin TKP belum maksimal**, tautan langsung ke soal terkait, penjelasan alasan pilihan terbaik, serta **Laporkan masalah soal** yang membawa ID paket/soal. Kanal pelaporan ini rekomendasi fitur; bukan temuan bahwa UI sekarang sudah memilikinya.

Pembahasan historis mengambil soal dan bobot yang berlaku saat ini (`backend/api/v1/endpoints/exam.py:450`). Jika admin mengedit soal atau opsi, penjelasan lama bisa berbeda dari konteks saat ujian. Pertimbangkan versi paket atau snapshot ketika mulai; perubahan tidak boleh diam-diam mengubah makna hasil lama. Prioritaskan perlindungan ini sebelum pembaruan bank soal besar.

### Analitik tanpa AI

Pertahankan skor per kategori, perkembangan nilai, konsistensi latihan, serta topik yang perlu diperkuat. Semua ini bisa berbasis data biasa.

Namun perhitungan juga perlu benar:

- `backend/core/analytics_service.py:28` menganggap `points_earned > 0` sebagai benar. Pada TKP, pilihan bernilai 1 dapat dihitung sama benarnya dengan nilai 5. Lebih jujur memakai persentase poin dari skor maksimum, atau membedakan pilihan optimal dan parsial.
- Query mastery belum mengecualikan sesi preview admin, berbeda dari beberapa endpoint analitik lain. Konsistenkan sumber data.
- Indikator kesiapan mengalikan nilai berdasarkan kesulitan yang diparse dari deskripsi teks (`backend/api/v1/endpoints/analytics.py:23`, `:196`). Kesulitan editorial bukan bukti bahwa peluang lolos dapat diprediksi.
- `confidence_score` dihitung dari jumlah sesi, bukan kalibrasi statistik. Jangan menampilkan persentase itu seolah probabilitas lulus atau akurasi prediksi.
- Untuk rilis sederhana, tampilkan nilai asli dan periode sampel; ganti label seperti “Legenda”/“siap instansi mana pun” dengan fakta latihan. Tampilkan ukuran sampel dan status “data belum cukup” jika perlu.

### Visual dan aksesibilitas

Tema gelap dan aksen ungu masih dapat dipertahankan. Tidak ada bukti bahwa mengganti seluruh identitas visual akan memperbaiki hasil belajar. Yang perlu ditertibkan: heading besar, jarak vertikal berlebih, banyak glow/gradient/pulse, teks penjelas kecil dan redup, serta terlalu banyak gaya kartu.

Gunakan satu sistem jarak, ukuran teks, tombol, badge, dan status yang konsisten. Satu tombol utama per area keputusan. Usulkan target sentuh utama sekitar 44 × 44 CSS px sebagai pilihan desain untuk kenyamanan; WCAG 2.2 AA menetapkan minimum 24 × 24 atau pengecualian jarak tertentu, bukan mewajibkan semua kontrol 44 px. [W3C: Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Ukur kontras teks normal terhadap target 4,5:1; teks besar 3:1. Audit ini belum mengukur semua pasangan warna. Status simpan/gagal perlu disampaikan ke teknologi bantu, misalnya melalui semantik status yang tepat tanpa memindahkan fokus. [W3C: Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

Prinsip yang mendasari perubahan: status sistem harus terlihat, istilah dan tindakan harus konsisten, serta informasi sekunder tidak mendominasi tugas utama. Itu sejalan dengan heuristik Nielsen; heuristik memberi arah evaluasi, bukan bukti kuantitatif bahwa desain ini pasti meningkatkan konversi. [Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/).

## 8. Hal yang dipindahkan, dipertahankan, dan ditunda

| Area | Keputusan yang disarankan |
| --- | --- |
| Simulasi, skor, pembahasan, riwayat | Pertahankan dan perkuat keandalannya |
| AI peserta | Hapus dari seluruh perjalanan peserta |
| AI admin | Opsional, terpisah dari dependensi ujian, hasil wajib ditinjau |
| Ringkasan progres | Pertahankan dalam bentuk lebih ringkas dan faktual |
| Peringkat | Sekunder; paling masuk akal pada acara/paket yang sebanding |
| Donasi dan Wall of Fame | Pindahkan dari dashboard ke halaman dukungan |
| MagicBento/profil pengembang | Pindahkan ke Tentang/footer atau kurangi |
| Tryout mingguan | Jangan menjadi pusat navigasi sebelum ada jadwal/konten operasional |
| SKB | Jangan dipromosikan sebagai tersedia sebelum paket dan aturan penilaiannya siap |
| Mode latihan singkat, streak, gamifikasi baru | Tunda sampai alur inti terbukti dipakai dengan baik |
| Rewrite framework, microservices, aplikasi native | Tidak diperlukan untuk memenuhi kebutuhan yang ditemukan |

Pusat bantuan `/faq` terkonfirmasi 404. Footer menyebut `support@catcpnspro.com`, sedangkan domain publik sudah `tocpns.my.id`; belum dibuktikan alamat lama menerima pesan. FAQ juga masih menyebut Midtrans walaupun implementasi memakai DOKU. Rapikan tautan dan kontak nyata sebelum menambah promosi.

## 9. Tahapan pengerjaan dan kriteria selesai

### Tahap A — Kepercayaan dan integritas

Perbaiki/arsipkan konten yang belum siap; gerbang publikasi; penyimpanan dan timer; satu kebijakan akses; harga/durasi/promosi; status pembayaran.

Kriteria selesai:

- Paket kosong/tidak lengkap tidak ditawarkan sebagai simulasi penuh; aturan opsi/bobot tervalidasi.
- Status “tersimpan” hanya tampil setelah konfirmasi server; pengiriman ulang dan finalisasi teruji.
- Resume tidak memulai ulang timer; deadline server dan tampilan konsisten.
- Draft/arsip/jadwal tidak dapat dilewati lewat endpoint mulai; Pro yang sah tetap memperoleh seluruh paket yang semestinya.
- Tidak ada informasi lifetime versus 365 hari yang bertentangan; status sukses pembayaran berasal dari server.
- Statistik dan kontak dapat dipertanggungjawabkan. Sandbox tidak disalahartikan sebagai transaksi sungguhan.

### Tahap B — Fokus produk dan penghapusan AI

Hapus AI peserta dan manfaatnya; pertahankan AI admin opsional; tampilkan status keanggotaan/tanggal berakhir; sederhanakan navigasi dan CTA paket.

Kriteria selesai:

- Tidak ada tombol, upsell, polling, atau endpoint generasi AI yang masih dapat dipakai peserta.
- Semua paket aktif yang siap dapat dikerjakan Pro tanpa pembayaran per paket.
- Hasil lama, pembahasan, dan hak pelanggan lama dipertahankan sesuai kebijakan yang disepakati.
- Paket yang dipilih sebelum login/pembayaran tetap menjadi tujuan setelah selesai.
- Pro berakhir, sesi berjalan, pembayaran tertunda, dan pengulangan paket mempunyai perilaku eksplisit.

### Tahap C — UI/UX inti

Bangun shell peserta bersama; dashboard berdasarkan keadaan; katalog ringkas dengan pagination; hasil yang berorientasi pembahasan; pembahasan dengan filter kesalahan.

Uji tugas di ponsel dan desktop: pengguna baru mencoba satu paket, Pro membuka paket premium, pengguna melanjutkan sesi, menyelesaikan saat koneksi lambat, mencari pembahasan jawaban salah, dan memeriksa masa keanggotaan. Libatkan beberapa calon peserta dengan kemampuan perangkat berbeda; catat kebingungan dan kegagalan tugas, bukan hanya preferensi warna.

### Tahap D — Operasional dan pengukuran

Pantau error penyimpanan, scoring yang tertahan, ketidaksesuaian pembayaran, dan kesiapan konten. Uji Google login, reset password, serta pembayaran/webhook pada lingkungan yang sesuai. Belum ada pengukuran performa browser atau uji beban baru dalam audit ini.

Tidak perlu mengganti arsitektur server untuk memulai. Gunakan deployment yang ada, perubahan bertahap, backup dan rollback yang sudah teruji, serta pisahkan konfigurasi rahasia dari Git.

## 10. Ukuran keberhasilan

| Metrik | Definisi praktis |
| --- | --- |
| Aktivasi belajar | Akun baru yang memulai ujian valid / akun baru yang memenuhi syarat |
| Penyelesaian | Sesi valid selesai / sesi valid dimulai, dengan periode pengamatan yang jelas |
| Pemakaian pembahasan | Sesi selesai yang pembahasannya dibuka / sesi selesai |
| Latihan berulang | Peserta yang kembali memulai latihan pada periode berikutnya / peserta aktif pada periode awal |
| Kegagalan autosave | Permintaan gagal, jawaban tertunda, dan konflik versi; jangan menganggap semua request gagal berarti jawaban akhirnya hilang |
| Konsistensi finalisasi | Perbedaan jawaban terkonfirmasi sebelum deadline dengan jawaban yang dinilai |
| Aktivasi pembayaran | Transaksi sukses terverifikasi yang hak Pro-nya belum aktif setelah batas operasional yang ditetapkan |
| Kualitas paket | Paket lolos validasi struktur, laporan masalah terbuka, serta waktu penyelesaian koreksi |

Pisahkan data admin/preview/sandbox dan kegiatan pengujian dari metrik peserta. Jangan menambah klaim keberhasilan atau target persentase sebelum baseline tersedia. Hindari memasukkan email, isi jawaban, atau isi chat ke event analitik umum.

Sederhana berarti peserta tahu langkah berikutnya dan dapat mempercayai hasilnya. Untuk aplikasi ini, investasi pertama adalah mutu soal, keandalan ujian, dan janji keanggotaan yang jelas; visual menyusul untuk membuat ketiganya mudah digunakan.

## 11. Status keluaran audit

Laporan ini adalah rekomendasi dan bukti pemeriksaan, bukan perubahan produk yang sudah dirilis. Tidak ada kode aplikasi, hak langganan, konfigurasi pembayaran, atau data production yang diubah. Tidak ada commit/push/deploy perombakan. Skrip pemeriksaan lokal berada di folder sementara yang diabaikan Git dan tidak berisi kredensial.
