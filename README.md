# CPNS Platform V2.0 🚀 (Supabase & Vertex AI Edition)

Platform latihan ujian CPNS (CAT) modern dengan arsitektur *high-performance* dan *latest tech stack*, didukung sepenuhnya oleh **Supabase Cloud**, **Bank BJB SNAP BI Payment**, dan **Google Vertex AI (Gemini 3.1 Pro)**.

## 🏗️ Technology Stack

### Frontend
- **Next.js 16.1 (App Router)**: Framework React terbaru untuk performa maksimal.
- **Tailwind CSS & Shadcn UI**: Styling utility-first dengan komponen UI premium.
- **TanStack Query v5 & Zustand**: Manajemen state server dan state global yang robust.
- **GSAP & Framer Motion**: Micro-animations interaktif.

### Backend
- **FastAPI 0.135.1**: Framework Python asinkron berkinerja tinggi.
- **SQLAlchemy 2.0 (Async)**: ORM modern untuk interaksi database asinkron.
- **Supabase PostgreSQL**: Database relasional utama di cloud.
- **Redis 7**: Caching, Real-time Leaderboard (ZSET), Rate Limiting, dan Autosave Ujian.
- **Celery & RabbitMQ**: Manajemen *background tasks* (kalkulasi skor & asinkron).

### AI & Observability
- **Google Vertex AI**: Menggunakan model `gemini-3.1-pro-preview` dengan fitur *High Thinking* untuk generasi soal Hots (TWK, TIU, TKP) dan AI Mentor Chatbot.
- **LangChain & Langfuse**: Orkestrasi LLM agen dan *observability* (tracing) komprehensif.

## 🚀 Fitur Utama
1. **Real-time CAT Interface**: Antarmuka ujian responsif dengan sinkronisasi statis ke Redis (*autosave* 5 detik).
2. **AI-Powered Question Generation**: *Pipeline* pembuat soal otomatis dengan rasionalisasi matematis akurat.
3. **BJB SNAP BI Payment Integration**: Sistem pembayaran otomatis dengan webhook terproteksi HMAC-SHA512.
4. **Leaderboard Nasional**: Peringkat *real-time* berskala besar berbasis Redis ZSET.
5. **Quality Assurance Framework**: *Test suite* tangguh (E2E, Unit, Component) untuk Backend, Frontend, dan keluaran AI.

## 🧪 Quality Assurance (QA) & Testing

Proyek ini menjunjung tinggi standar kualitas *enterprise-grade* dengan sistem pengujian komprehensif:

- **Backend QA**: Menggunakan `pytest` dengan *SQLite in-memory* terisolasi, dan `pytest-cov` untuk mengecek persentase *coverage*. Pengujian linter otomatis dan super cepat dengan `Ruff`.
- **Frontend QA**: Pengujian komponen (Component Testing) menggunakan `Vitest` + `React Testing Library`. Simulasi antarmuka ujian menggunakan `Playwright` untuk *End-to-End* (E2E) user flow. Linting tingkat lanjut secara ketat via `ESLint`.
- **AI-Specific QA**: Sistem memiliki *test suite* mandiri (`tests/test_ai_evals.py`) yang berdedikasi memvalidasi struktur *output* JSON Vertex AI, kelengkapan format *discussion*, dan jaminan logika skor (TIU/TWK: 0 atau 5, TKP: 1 sampai 5 unik) guna menolak halusinasi bot masuk ke database.
- **CI/CD Pipeline**: Pipeline otomatis di **GitHub Actions** (`qa.yml`) akan menguji seluruh integritas program (*lint & test*) di setiap siklus `Push` dan `Pull Request`.

## 🛠️ Cara Menjalankan

### Prasyarat
- Node.js 20+
- Python 3.11+
- Redis (Lokal atau Cloud)

### 1. Kloning Repositori & Kredensial
```bash
git clone https://github.com/WillyHanafi1/Test-CPNS.git
cd Test-CPNS
```
*(Penting: Dapatkan file kredensial `service_account.json` dari Google Cloud Console dan masukkan ke folder `backend/` untuk akses fungsionalitas Vertex AI).*

### 2. Konfigurasi Environment Backend
```bash
cp backend/.env.example backend/.env
# Buka backend/.env dan isi kredensial Supabase, Redis, Langfuse, Midtrans/BJB, dan Vertex AI Anda.
```

### 3. Setup Backend
```powershell
# Jalankan dari folder Test-CPNS
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt

# Menjalankan server di port 8001
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; uvicorn backend.main:app --reload --port 8001
```

### 4. Setup Frontend
```bash
cd frontend
cp .env.example .env.local
# Pastikan NEXT_PUBLIC_API_URL menunjuk ke backend: NEXT_PUBLIC_API_URL=http://localhost:8001
npm install
npm run dev
```

---

## 📐 Panduan Manajemen Database (Alembic)

Untuk mencegah *error* sinkronisasi, *database crash*, atau munculnya fenomena "Zombie DB" di Supabase:

### 🛑 3 ATURAN EMAS
1. **DILARANG merombak tabel lewat UI Website (Supabase).** Selalu gunakan modifikasi di `backend/models/models.py`.
2. **DILARANG menghapus file `.py` di folder `alembic/versions/` manual** jika file tersebut sudah telanjur di-`upgrade head`.
3. **SELALU `git pull` sebelum memodifikasi `models.py`.** 

### ✅ SOP: Cara Menambah / Mengubah Kolom
1. Ubah kode di `backend/models/models.py`.
2. Generate Migrasi: `$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic revision --autogenerate -m "Pesan perubahan"`
3. Apply Migrasi: `$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic upgrade head`

### 🚑 Mengatasi Error Alembic (Zombie DB)
- **Salah Ketik / Ingin Mundur:** Batalkan efek migrasi dengan memerintahkan `$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic downgrade -1`. Baru setelah itu perbaiki file model dan hapus file versi terakhir.
- **Sinkronisasi Paksa (Target DB not up to date):** Paksa sinkronisasi status lokal dengan remote: `$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic stamp head`
- **Reset Ulang Riwayat (Tanpa Hapus Data):** Hapus semua file `.py` di `versions/`, hapus tabel bernama `alembic_version` dari DBeaver/Supabase UI, jalankan `revision --autogenerate`, lalu diakhiri wajib dengan `stamp head`.

---
Developed with ❤️ using the latest agentic technology.
