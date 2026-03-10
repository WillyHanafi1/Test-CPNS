# Project Context: CAT CPNS Simulation Platform (Enterprise-Grade)

## 1. Project Overview
Proyek ini adalah platform *Computer Based Test* (CBT) skala besar yang dirancang khusus untuk mensimulasikan ujian CPNS (Seleksi Kompetensi Dasar - SKD dan Seleksi Kompetensi Bidang - SKB). 
Sistem dirancang dengan arsitektur *High Availability* dan *High Scalability* untuk menahan lonjakan *traffic* hingga ribuan pengguna serentak (misal: saat Tryout Akbar nasional), dengan jaminan performa anti-lag dan toleransi putus koneksi (*offline tolerance*).

## 2. Tech Stack Core
Sistem ini mengadopsi tumpukan teknologi modern dengan pemisahan tugas yang ketat:
- **Frontend (UI/UX & SPA):** Next.js / React.js.
- **Styling:** TailwindCSS.
- **State Management:** Zustand / Redux (mengatur UI navigasi soal secara *real-time*).
- **Backend (API & Logic):** Python (FastAPI) dengan *Asynchronous processing*.
- **ORM:** SQLAlchemy (untuk keamanan dari *SQL Injection* & efisiensi *query*).
- **Primary Database:** PostgreSQL (sebagai *Source of Truth*).
- **In-Memory Store & Cache:** Redis (untuk *Autosave* jawaban & Leaderboard ZSET).
- **Message Broker & Background Tasks:** Celery + RabbitMQ / Redis (untuk antrean kalkulasi nilai).
- **Infrastruktur:** Docker (Containerization) di atas VPS (Virtual Private Server).

## 3. Core Business Logic & Features

### A. Autentikasi & Otorisasi
- Menggunakan **JWT (JSON Web Tokens)** yang disimpan secara aman di **HTTP-Only Cookies** (mencegah serangan XSS).
- Terdapat fitur Login standar (bcrypt password hashing) dan OAuth 2.0 (Google Login).
- Pemisahan data: Tabel kredensial (`users`) dipisah dari data publik (`user_profiles`).

### B. Katalog Paket Ujian & Middleware RBAC
- Katalog paket ujian (High Read, Low Write) **wajib di-cache di Redis** dengan teknik *pagination*.
- Akses soal dilindungi oleh **Middleware (Role-Based Access Control)**.
- Middleware akan mengecek tabel `user_transactions` untuk memvalidasi apakah `user_id` memiliki `payment_status: "success"` untuk `package_id` tertentu sebelum membuka gembok akses (HTTP 403 Forbidden jika ditolak).

### C. Engine Ujian (Real-time CAT) - Sisi Frontend
- **Pre-fetching:** Saat ujian dimulai, seluruh 110 soal + opsi jawaban diunduh ke dalam memori *browser* (dan dicadangkan di `localStorage` / `IndexedDB`) dalam format JSON agar pengguna bisa mengerjakan secara *offline* jika koneksi putus.
- **Reaktivitas UI:** Komponen navigasi membaca *State* pengguna:
  - `status: "answered"` $\rightarrow$ render Hijau.
  - `status: "unanswered"` $\rightarrow$ render Merah.
  - `status: "doubt"` $\rightarrow$ render Kuning.

### D. Engine Ujian (Real-time CAT) - Sisi Backend
- **Server-Side Timer:** Waktu di layar (*client-side* `setInterval`) hanya ilusi visual. Validasi waktu murni menggunakan `start_time` dan kalkulasi `end_time` di PostgreSQL. Akses ditutup sepihak oleh server jika waktu server habis.
- **Autosave Anti-Lag (Redis First):** Setiap klik jawaban dari pengguna dikirim via API (Asynchronous) dan **hanya disimpan di Redis (Key-Value)**. Dilarang keras menembak klik jawaban per detik langsung ke PostgreSQL.

### E. Analitik & Skoring (Background Processing)
- Saat peserta klik "Selesai", data jawaban dipindah (*bulk insert*) dari Redis ke antrean Celery. FastAPI langsung merespons *success* ke pengguna, sementara Celery menghitung nilai di latar belakang.
- **Logika Penilaian SKD BKN:**
  - **TWK & TIU:** Benar = 5 poin, Salah/Kosong = 0 poin.
  - **TKP:** Opsi A/B/C/D/E bernilai 1-5 poin. Tidak dijawab = 0 poin.
- **Pre-Calculation Data:** Hasil akhir (Total Skor per kategori, Status Lulus/Tidak Lulus berdasar *Passing Grade*, dan rekap benar/salah) langsung disimpan sebagai format JSON yang sudah matang di PostgreSQL. Halaman "Riwayat Nilai" hanya melakukan *Read* dokumen ini, bukan kalkulasi ulang.

### F. Leaderboard (Peringkat Nasional)
- Dilarang menggunakan SQL Query lambat seperti `SELECT * ORDER BY total_score DESC`.
- Wajib menggunakan fitur **Redis ZSET (Sorted Sets)** untuk mencatat `ZADD` dan menampilkan `ZREVRANGE` klasemen dengan kecepatan kurang dari 5 milidetik.

## 4. Database Schema Guidelines (PostgreSQL)
Rancangan tabel utama (*Entity Relationship*):
1. `users` (id, email, password_hash)
2. `user_profiles` (user_id, full_name, target_instansi)
3. `exam_packages` (id, title, description, price, is_premium)
4. `user_transactions` (id, user_id, package_id, payment_status, access_expires_at)
5. `questions` (id, package_id, category [TWK/TIU/TKP], question_text, image_url, discussion_text)
6. `question_options` (id, question_id, option_label, option_text, score_weight)

*Catatan: File gambar (figural) harus disimpan di Cloud Storage (S3/GCS), database hanya menyimpan URL string.*

## 5. Development Rules for AI Agent
- **DO NOT** execute blocking synchronous SQL queries. Use async SQLAlchemy.
- **DO NOT** save per-question user clicks to PostgreSQL during the exam. ALWAYS use Redis for temporary autosave.
- **DO NOT** trust client-side timestamps for exam validation.
- Focus on zero UI-freezes during the exam via efficient state management.