Membedah bagian **Antarmuka Ujian (Real-time CAT)** ini adalah langkah yang paling seru sekaligus krusial. Di sinilah letak perbedaan antara website ujian abal-abal yang sering *error* dengan platform profesional yang tangguh menahan ribuan peserta sekaligus.

Mari kita kupas tuntas teknis di balik layar dari keempat poin tersebut.

### 1. Pemuatan Soal (Frontend): Taktik *Pre-fetching* & *Offline Tolerance*

Ketika peserta mengklik tombol "Mulai Ujian", inilah urutan sistematis yang terjadi:

* **The API Call:** Frontend (misalnya menggunakan React.js atau Vue.js) memanggil *endpoint* API khusus, contohnya `GET /api/exams/123/start`.
* **Payload JSON:** Server tidak mengirimkan satu soal per satu halaman, melainkan **seluruh 110 soal** beserta opsi jawabannya dalam satu format data JSON sekaligus (data teks ini sangat ringan, hanya dalam hitungan Kilobyte).
* **Local Storage & State:** Data JSON ini langsung disimpan ke dalam memori *browser* menggunakan sistem manajemen status (*State Management* seperti Redux atau Zustand) dan dicadangkan secara otomatis ke **`localStorage`** atau **`IndexedDB`** di dalam *browser* peserta.
* **Keuntungan Ekstrim:** Karena semua soal sudah "diunduh" ke memori perangkat peserta, mereka bisa melompat dari soal nomor 1 ke nomor 110 secara instan tanpa perlu me-*reload* halaman. Hebatnya lagi, jika koneksi Wi-Fi mereka tiba-tiba mati total di tengah ujian, mereka tetap bisa membaca soal dan memilih jawaban sampai selesai seolah-olah tidak terjadi apa-apa!

### 2. Timer Hitung Mundur: Sinkronisasi Layar dan Server

Ini adalah permainan keamanan (*security*) agar peserta nakal tidak bisa memanipulasi waktu ujian dengan memundurkan jam di laptop mereka.

* **Sisi Layar (Client-Side):** Aplikasi murni menggunakan fungsi bawaan JavaScript `setInterval` yang mengurangi sisa detik sebanyak 1 angka setiap 1000 milidetik. Ini murni hanya untuk tampilan visual antarmuka (UX) agar peserta bisa mengatur ritme pengerjaan.
* **Sisi Server (Source of Truth):**
* Saat API `start` dipanggil di awal, server langsung mencatat `start_time` (misal: 08:00:00) dan menghitung patokan `end_time` (misal: 09:40:00) ke dalam *database* PostgreSQL.
* Server sama sekali **tidak peduli** dengan angka waktu yang tampil di layar peserta. Ketika jam sistem di server menyentuh pukul 09:40:00, server akan secara sepihak **menutup akses** (mengubah status sesi menjadi *finished*) dan menolak semua pengiriman jawaban yang masuk setelah detik tersebut.



### 3. Navigasi Soal (Manajemen Status / State Management)

Dalam pengembangan aplikasi modern (*Single Page Application*), tampilan visual adalah cerminan langsung dari data (State) di balik layar.

* **Struktur Data:** Daftar soal dan jawaban peserta direpresentasikan dalam bentuk susunan data (*Array of Objects*).
* **Mekanisme Reaktivitas:** Panel navigasi di sisi layar (kotak-kotak berisi angka 1-110) diprogram untuk "membaca" data tersebut secara *real-time*.
* Jika pada soal nomor 5 terdeteksi `status: "answered"`, maka kode komponen antarmuka otomatis menerapkan *class* CSS berlatar belakang **Hijau**.
* Jika peserta mencentang kotak "Ragu-ragu" pada soal nomor 12, fungsi *handler* akan mengubah nilai `status` di nomor tersebut menjadi `doubt`. Detik itu juga, kotak navigasi nomor 12 langsung berubah warna menjadi **Kuning** tanpa ada proses *loading* halaman sama sekali.



### 4. Autosave Jawaban (Krusial): Peran Vital Redis

Ini adalah jantung stabilitas sistem CAT. Bayangkan jika ada 10.000 peserta ujian serentak, dan masing-masing peserta mengklik jawaban setiap 10 detik. Artinya, akan ada bombardir **1.000 permintaan masuk ke server setiap detiknya!**

* **Asynchronous Request:** Saat peserta memilih opsi "B", fungsi di latar belakang (seperti menggunakan Fetch API atau Axios) mengirimkan pilihan tersebut ke server secara diam-diam (*asynchronous*). UI tidak akan membeku (*freeze*) dan peserta bisa langsung lanjut membaca soal berikutnya.
* **Mengapa Wajib Menggunakan Redis?** Jika 1.000 klik jawaban per detik tadi langsung dijejalkan ke *database* utama (PostgreSQL/MySQL), *database* akan mengalami *bottleneck* (tersedak), penggunaan CPU melonjak 100%, dan website akan seketika *down*.
* **Cara Kerja Penyelamatan:**
1. Redis adalah *In-Memory Database*. Ia menyimpan data di dalam RAM server, bukan di Hardisk/SSD. Kecepatan baca-tulis ke RAM ribuan kali lipat lebih cepat.
2. Saat jawaban masuk, server hanya melemparnya ke Redis dalam format sederhana (Key-Value). Contohnya: `exam_session:user_789` disematkan nilai `{"12": "B"}`. Proses ini hanya memakan waktu hitungan mikrodetik.
3. Jika laptop peserta mati mendadak karena kehabisan baterai, lalu ia *login* ulang dari HP, sistem saat itu juga akan menarik data *cache* terakhir dari Redis dan merender kembali seluruh jawaban yang sudah diklik tanpa ada yang hilang (termasuk sisa waktu).
4. **Penyimpanan Permanen:** Barulah ketika peserta menekan tombol final "Kumpulkan Ujian" (atau waktu di server habis), sistem akan mengambil seluruh jawaban secara utuh dari kotak Redis, menghitung skor totalnya, lalu menyimpannya dengan rapi ke dalam *database* PostgreSQL secara permanen, sekaligus menghapus data sementaranya dari memori Redis untuk menghemat ruang.



---
