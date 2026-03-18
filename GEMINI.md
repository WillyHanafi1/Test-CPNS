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

## 5. Lesson Learned & Best Practices (AI Assistants)
Sebagai panduan untuk tugas pengembangan di masa mendatang, berikut adalah standar operasional (SOP) proyek yang wajib dipatuhi:

### A. Penanganan Rendering Matematika (Latex)
- Frontend menggunakan `react-latex-next` dengan konfigurasi KaTeX.
- Server wajib mengirim data matematika menggunakan sintaks **inline math `$...$`** atau **block math `$$...$$`**. Hindari penggunaan notasi matematika mentah (seperti x^2 atau akar(x)) di dalam CSV maupun PostgreSQL.

### B. Pembuatan & Imputasi Soal Figural (End-to-End)
Jika Anda (Asisten AI) diminta untuk memproduksi atau melengkapi soal tipe Figural (Kemampuan Spasial/Matriks):
1. **Gunakan RAVEN-10000 Dataset:** Gunakan kumpulan matriks biner (`.npz`) dari sumber *dataset* RAVEN, yang pola logikanya (Analogi/Serial) sangat cocok dengan regulasi Kepmenpan RB.
2. **Generasi & Pengacakan (Pillow/Numpy):** Ekstrak/gabungkan array gambar menjadi grid masalah 3x3 dan 5 opsi jawaban (1 target benar, 4 salah). Pastikan posisi kunci jawaban selalu diacak dengan distribusi yang merata antar soal.
3. **Stateless CDN via Supabase:** 
   - **JANGAN** pernah memasukkan file gambar fisik base64 ke dalam sistem utama.
   - Gunakan `SUPABASE_SERVICE_ROLE_KEY` dari `.env` untuk melakukan *push upload* gambar secara rekursif (.png) ke *bucket* `exam-assets`.
4. **Markdown Embedding (CSV/DB):**
   - Meskipun sistem database (PostgreSQL) memiliki kolom `image_url` terpisah di tabel `questions`, namun untuk kolom yang fleksibel seperti `content` atau opsi jawaban di tabel `question_options`, gunakan **Sintaks Markdown**: `![Alt Text](URL_Public_Supabase)`. 
   - UI Frontend (*Next.js/ReactMarkdown*) dari struktur sistem ini secara otomatis diarahkan untuk me-*render* url markdown.
5. **Kepatuhan Kepmenpan-RB**: Pastikan distribusi soal figural terbagi rata ke 3 kategori utama: **Analogi Gambar** (perbandingan pola), **Ketidaksamaan Gambar** (mencari yang berbeda), dan **Serial Gambar** (melanjutkan urutan).
6. **Pembahasan Detail (XML Logic)**: Gunakan metadata `.xml` yang tersedia untuk mengekstrak logika ground-truth. Petakan aturan teknis (misal: `Constant`, `Progression`, `Arithmetic`) ke bahasa Indonesia yang mudah dipahami (*Tetap*, *Perkembangan*, *Aritmatika*) untuk menghasilkan kolom `discussion` yang berkualitas tinggi dan edukatif bagi pengguna.

### C. Backend Architecture & High Availability
Berdasarkan analisis mendalam pada core backend:
1. **Redis Optimization**: Gunakan `RedisService` dengan *connection pooling* untuk menangani ribuan koneksi simultan. Pastikan `json_serial` mendukung format `datetime` dan `UUID`.
2. **Security & Auth**:
    - Simpan JWT di **HttpOnly Cookie** untuk mencegah XSS.
    - Implementasikan **Token Blocklist** di Redis untuk fitur *Logout* dan pembatalan sesi yang aman.
    - Gunakan fitur `is_pro_active` pada model `User` untuk memvalidasi akses fitur premium secara *real-time*.
3. **AI Integration (Gemini)**:
    - Gunakan `generate_content_async` untuk menghindari *blocking* pada event loop FastAPI.
    - Selalu sertakan konteks (*question content*, *user answer*, *discussion*) dalam prompt AI Chat Mentor untuk memberikan jawaban yang akurat secara kontekstual.
    - Batasi penggunaan fitur AI (Chat & Mastery Digest) hanya untuk pengguna dengan status `is_pro_active`.
4. **Topic Mastery Analytics**:
    - Agregasikan data jawaban berdasarkan `sub_category` untuk memantau perkembangan belajar pengguna.
    - Identifikasi "Weak Points" secara berkala (misal: sub-kategori dengan skor < 40% setelah 5x pengerjaan).
5. **Rate Limiting**:
    - Implementasikan `slowapi` dengan backend Redis.
    - Gunakan `X-Forwarded-For` untuk mendeteksi IP asli pengguna di balik *reverse proxy* (Nginx/Docker).
