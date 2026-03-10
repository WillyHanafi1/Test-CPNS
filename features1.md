Untuk membangun platform ujian skala besar yang tahan banting (scalable) dan tidak down saat diakses ribuan orang, kita harus menerapkan Best Practices dalam System Design.

Mari kita bedah kebutuhan teknis (Tech Stack & Requirements) untuk masing-masing fitur yang kamu sebutkan:

1. Autentikasi & Dashboard
Teknologi & Tools:

Backend: Python (FastAPI) + SQLAlchemy (sebagai ORM untuk komunikasi ke database).

Autentikasi: JWT (JSON Web Tokens) untuk login biasa, dan OAuth 2.0 untuk fitur "Login with Google".

Keamanan Sandi: Pustaka bcrypt atau passlib untuk hashing password (jangan pernah menyimpan password dalam bentuk teks asli/ plaintext).

Frontend (Grafik): React/Vue/Next.js dipadukan dengan pustaka grafik seperti Chart.js atau Recharts.

Best Practice:

Keamanan JWT: Jangan simpan token JWT di localStorage karena rawan serangan XSS (Cross-Site Scripting). Simpanlah di HTTP-Only Cookies.

Pemisahan Data: Pisahkan tabel users (data rahasia seperti password) dengan tabel user_profiles (data umum seperti nama, foto, target instansi).

2. Katalog Tryout
Teknologi & Tools:

Database Relasional: PostgreSQL (sangat disarankan dibanding MySQL untuk aplikasi yang butuh relasi data kompleks dan integritas tinggi).

Caching: Redis.

Best Practice:

Gunakan Caching: Karena daftar paket tryout jarang berubah tapi sangat sering dilihat (High Read, Low Write), simpan respons API katalog ini di Redis. Ini akan mengurangi beban database PostgreSQL kamu secara drastis. API akan merespons dalam hitungan milidetik.

Pagination: Jika paket sudah banyak, gunakan teknik pagination (hanya memuat 10-20 paket per halaman) agar website tidak berat saat pertama kali dibuka.

3. Antarmuka Ujian (Real-time CAT) - Bagian Paling Krusial
Teknologi & Tools:

Frontend: Arsitektur Single Page Application (SPA) wajib menggunakan React, Vue, atau Svelte.

State Management: Zustand/Redux (untuk React) atau Pinia (untuk Vue) untuk mengatur warna tombol navigasi soal (Hijau, Merah, Kuning) secara real-time di memori peramban (browser).

Penyimpanan Sementara: localStorage atau IndexedDB di sisi browser, dan Redis di sisi server.

Best Practice:

Timer Hitung Mundur (Wajib Server-Side): Jangan pernah percaya pada jam di komputer user! Catat start_time dan end_time di PostgreSQL. Frontend hanya melakukan countdown visual. Saat waktu habis, server yang memutus akses ujian, bukan frontend.

Autosave Anti-Lag: Setiap user klik jawaban, kirim API request (misal metode PATCH) di belakang layar (asynchronous).

Strategi Menyimpan Jawaban (Sangat Penting): Jangan simpan setiap klik jawaban langsung ke PostgreSQL! Jika ada 1.000 peserta mengklik bersamaan, database akan crash. Simpan jawaban sementara di Redis (In-Memory Store). Nanti, ketika ujian selesai, baru pindahkan (bulk insert) semua jawaban dari Redis ke PostgreSQL sekaligus.

Offline Tolerance: Jika internet user mati di tengah jalan, simpan jawaban mereka di localStorage peramban. Begitu internet menyala kembali, sistem otomatis melakukan sinkronisasi (sync) jawaban ke server.

4. Analitik Hasil & Pembahasan
Teknologi & Tools:

Algoritma Skoring: Logika di backend (Python) yang menghitung poin TWK, TIU, TKP secara asinkron.

Message Broker (Opsional tapi disarankan): Celery + RabbitMQ/Redis (jika proses kalkulasi sangat berat, lemparkan ke background task agar user tidak menunggu loading API terlalu lama).

Best Practice:

Pre-calculation: Segera setelah user klik "Selesai", hitung nilai akhirnya (termasuk status Lulus/Tidak Lulus Passing Grade) dan simpan hasil jadinya (berupa format JSON) di database.

Jangan menghitung ulang nilai setiap kali user membuka halaman riwayat nilai, cukup panggil hasil yang sudah dikalkulasi tadi.

5. Leaderboard (Peringkat Nasional)
Teknologi & Tools:

Struktur Data Khusus: Redis Sorted Sets (ZSET).

Best Practice:

Hindari Query SQL: Jangan pernah menggunakan query seperti SELECT * FROM scores ORDER BY total_score DESC pada PostgreSQL jika pesertamu sudah ribuan. Ini sangat lambat (membuat bottleneck).

Gunakan fitur bawaan Redis ZSET yang memang diciptakan khusus untuk klasemen. Redis bisa mengurutkan ratusan ribu skor peserta dan mencari peringkat seorang user hanya dalam waktu kurang dari 5 milidetik.

Ringkasan Tech Stack Ideal (Modern Stack):

Frontend: Next.js / React (dengan TailwindCSS).

Backend: Python (FastAPI) + SQLAlchemy (sebagai ORM).

Database Utama: PostgreSQL.

Database Cache & Antrean (Wajib): Redis.

Infrastruktur: VPS (contoh: DigitalOcean, AWS EC2, atau IDCloudHost) dan dikemas menggunakan Docker agar mudah dikelola.