

Bagian **Analitik Hasil & Pembahasan** ini adalah "otak" dari aplikasi ujianmu. Di sinilah data mentah berupa klik jawaban diubah menjadi nilai akhir dan status kelulusan. Mari kita bedah teknisnya secara mendalam!

### 1. Algoritma Skoring (Python Backend Logic)

Saat waktu habis atau peserta mengklik "Kumpulkan", *backend* (misal menggunakan Python dengan FastAPI) akan menerima daftar jawaban peserta. Algoritma skoring tidak sekadar menjumlahkan angka, tapi harus melalui logika bersyarat *(conditional logic)* sesuai aturan BKN.

**Alur Logikanya:**

1. **Pemisahan Kategori:** Sistem memisahkan 110 jawaban menjadi 3 kelompok: TWK (30 soal), TIU (35 soal), dan TKP (45 soal).
2. **Kalkulasi Poin per Soal:**
* **TWK & TIU:** Sistem mencocokkan jawaban dengan kunci. Jika `jawaban_user == kunci_jawaban`, poin = 5. Jika salah atau kosong, poin = 0.
* **TKP:** Sistem mencari bobot nilai dari opsi yang dipilih (A/B/C/D/E di TKP punya nilai 1, 2, 3, 4, atau 5). Tidak ada nilai 0 kecuali peserta tidak menjawab.


3. **Validasi *Passing Grade* (Ambang Batas):**
Sistem akan menjumlahkan total per kategori dan mengeceknya menggunakan logika *IF/ELSE* sederhana:
* Apakah Total TWK $\ge$ 65?
* Apakah Total TIU $\ge$ 80?
* Apakah Total TKP $\ge$ 166?
* Jika **KETIGA** syarat tersebut terpenuhi (menggunakan operator logika `AND`), maka `status_kelulusan = "LULUS"`. Jika ada satu saja yang di bawah batas, otomatis `"TIDAK LULUS"`.



---

### 2. Message Broker (Menghindari "Server Macet")

Bayangkan kamu sedang mengadakan *Tryout Akbar* gratis yang diikuti 10.000 peserta secara serentak. Pada pukul 10:00 WIB, waktu ujian habis secara bersamaan. Jika server FastAPI kamu disuruh menghitung 10.000 data $\times$ 110 soal pada detik yang sama, server pasti akan *crash* atau *Time Out*.

Di sinilah **Celery** dan **RabbitMQ / Redis** masuk sebagai pahlawan penyelamat.

* **Analogi Restoran:** * **FastAPI** adalah pelayan (menerima pesanan/jawaban dari peserta).
* **RabbitMQ/Redis (Message Broker)** adalah rel/papan antrean pesanan di dapur.
* **Celery Workers** adalah para koki di dapur (yang menghitung nilai).


* **Cara Kerjanya:**
Saat 10.000 ujian dikumpulkan bersamaan, FastAPI tidak langsung menghitung nilainya. Ia hanya menerimanya dan menaruhnya di "papan antrean" (Message Broker) lalu langsung membalas ke *browser* peserta: *"Jawaban diterima, sedang diproses!"*.
Di belakang layar, koki-koki (Celery Workers) akan mengambil antrean tersebut satu per satu dan menghitungnya secepat mungkin tanpa mengganggu tugas FastAPI yang harus melayani peserta lain.

---

### 3. Best Practice: *Pre-Calculation* (Kalkulasi di Awal)

Ini adalah aturan emas dalam merancang *database* untuk aplikasi analitik atau riwayat nilai.

**Praktik Buruk (Jangan Dilakukan):**
Menyimpan hanya jawaban mentah (A, B, C) di *database*, lalu setiap kali peserta membuka halaman "Riwayat Nilai", sistem menjalankan rumus *query* matematika yang berat untuk mencocokkan kunci jawaban dan menghitung ulang skornya saat itu juga. Ini sangat membebani *database*.

**Praktik Terbaik (Pre-Calculation):**
Segera setelah koki (Celery) selesai menghitung nilai ujian, sistem langsung menyusun satu dokumen JSON atau beberapa kolom khusus di *database* yang berisi **hasil akhir yang sudah matang**.

Contoh data yang disimpan secara permanen:

* `skor_twk`: 100
* `skor_tiu`: 120
* `skor_tkp`: 180
* `total_skor`: 400
* `status`: "LULUS"
* `jawaban_detail`: (JSON berisi nomor soal, jawaban user, kunci, dan status benar/salah).

**Keuntungannya:**
Ketika peserta sewaktu-waktu membuka halaman "Riwayat Nilai" atau "Pembahasan", server hanya perlu memanggil (*read*) data yang sudah matang tersebut. Prosesnya memakan waktu kurang dari 10 milidetik dan sangat hemat biaya *server*.

---
?