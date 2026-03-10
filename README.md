# CPNS Platform V2.0 🚀

Platform latihan ujian CPNS (CAT) modern dengan arsitektur *high-performance* dan *latest tech stack*.

## 🏗️ Technology Stack

### Frontend
- **Next.js 16.1 (App Router)**: Framework React terbaru untuk performa maksimal.
- **Tailwind CSS**: Styling utility-first yang modern.
- **Shadcn UI**: Komponen UI premium dan aksesibel.
- **TanStack Query v5**: Manajemen state server dan caching yang robust.

### Backend
- **FastAPI 0.135.1**: Framework Python asinkron berkinerja tinggi.
- **SQLAlchemy 2.0 (Async)**: ORM modern untuk interaksi database asinkron.
- **PostgreSQL 16**: Database relasional utama yang tangguh.
- **Redis 7**: Caching, Real-time Leaderboard (ZSET), dan Autosave.
- **Celery**: Background task processing untuk skoring dan notifikasi.

## 🚀 Fitur Utama
1. **Premium Landing Page**: Beranda modern dengan performa tinggi.
2. **Catalog & Package System**: Manajemen paket soal (TWK, TIU, TKP) dengan caching Redis.
3. **Enterprise Security**: JWT via HttpOnly Cookies untuk perlindungan maksimal.
4. **Real-time CAT Interface**: (In Progress) Antarmuka ujian responsif dengan fitur *autosave* ke Redis.
5. **Leaderboard Nasional**: Peringkat *real-time* berbasis Redis ZSET.

## 🛠️ Cara Menjalankan

### Prasyarat
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Kloning Repositori
```bash
git clone https://github.com/WillyHanafi1/Test-CPNS.git
cd Test-CPNS
```

### 2. Jalankan Infrastruktur (Docker)
```bash
docker-compose up -d
```

### 3. Setup Backend
```powershell
# Jalankan dari folder root (Test-CPNS)
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt

# Jalankan server di port 8001 (Sangat disarankan untuk Windows)
$env:PYTHONPATH = "."; uvicorn backend.main:app --reload --port 8001
```

### 4. Setup Database & Seeding
```powershell
# Jalankan migrasi database
alembic upgrade head

# Seed Data Awal (User & Paket Soal)
$env:PYTHONPATH = "."; python seed_users_initial.py
$env:PYTHONPATH = "."; python seed_package.py
```

### 5. Setup Frontend
Pastikan berkas `frontend/.env.local` mengarah ke port backend yang aktif:
`NEXT_PUBLIC_API_URL=http://localhost:8001`

```bash
cd frontend
npm install
npm run dev
```

## ⚠️ Troubleshooting (Penting)

### 1. ModuleNotFoundError: No module named 'backend'
Seluruh backend menggunakan *absolute imports*. Selalu jalankan `uvicorn` atau skrip python dari **folder root** dengan menyetel `PYTHONPATH`.

### 2. WinError 10013 / Socket Permission
Jika port `8000` ditolak, gunakan port `8001` atau port lain yang tersedia di atas 1024.

### 3. JSON Serialization Error (UUID)
Gunakan `backend.core.redis_service` untuk caching, karena sudah menangani serialisasi `UUID` secara otomatis.

## 📐 Arsitektur Database (ERD)
Dapat dilihat secara detail di berkas `infra/database_erd.md` (Coming Soon).

---
Developed with ❤️ using the latest technology.
