# CPNS Platform V2.0 🚀 (Supabase Edition)

Platform latihan ujian CPNS (CAT) modern dengan arsitektur *high-performance* dan *latest tech stack*, kini didukung sepenuhnya oleh **Supabase Cloud**.

## 🏗️ Technology Stack

### Frontend
- **Next.js 16.1 (App Router)**: Framework React terbaru untuk performa maksimal.
- **Tailwind CSS**: Styling utility-first yang modern.
- **Shadcn UI**: Komponen UI premium dan aksesibel.
- **TanStack Query v5**: Manajemen state server dan caching yang robust.

### Backend
- **FastAPI 0.135.1**: Framework Python asinkron berkinerja tinggi.
- **SQLAlchemy 2.0 (Async)**: ORM modern untuk interaksi database asinkron.
- **Supabase PostgreSQL**: Database relasional utama di cloud.
- **Redis 7**: Caching, Real-time Leaderboard (ZSET), dan Autosave.

## 🚀 Fitur Utama
1. **Premium Landing Page**: Beranda modern dengan performa tinggi.
2. **Catalog & Package System**: Manajemen paket soal (TWK, TIU, TKP).
3. **Supabase Integration**: Database cloud yang handal tanpa perlu setup Docker lokal.
4. **Real-time CAT Interface**: Antarmuka ujian responsif dengan fitur *autosave* ke Redis.
5. **Leaderboard Nasional**: Peringkat *real-time* berbasis Redis ZSET.

## 🛠️ Cara Menjalankan

### Prasyarat
- Node.js 20+
- Python 3.12+
- Redis (Lokal atau Cloud)

### 1. Kloning Repositori
```bash
git clone https://github.com/WillyHanafi1/Test-CPNS.git
cd Test-CPNS
```

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` di folder root/backend dan isi sesuai kredensial Supabase Anda:
```bash
cp .env.example backend/.env
```

### 3. Setup Backend
```powershell
# Jalankan dari folder root (Test-CPNS)
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt

# Jalankan server di port 8001
$env:PYTHONPATH = "."; uvicorn backend.main:app --reload --port 8001
```

### 4. Setup Frontend
Pastikan berkas `frontend/.env.local` mengarah ke port backend yang aktif:
`NEXT_PUBLIC_API_URL=http://localhost:8001`

```bash
cd frontend
npm install
npm run dev
```

## 📐 Arsitektur Database
Database menggunakan PostgreSQL di Supabase dengan skema asinkron. Seluruh data soal (110 soal SKD) sudah tersedia secara default setelah migrasi awal ke cloud.

---
Developed with ❤️ using the latest technology.
