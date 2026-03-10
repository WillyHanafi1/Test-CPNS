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
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📐 Arsitektur Database (ERD)
Dapat dilihat secara detail di berkas `infra/database_erd.md` (Coming Soon).

---
Developed with ❤️ using the latest technology.
