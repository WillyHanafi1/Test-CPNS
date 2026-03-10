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

## 🛠️ Panduan Manajemen Database (Alembic)

Proyek ini menggunakan **SQLAlchemy** (sebagai ORM) dan **Alembic** (sebagai alat migrasi) yang terhubung ke satu **Cloud Database** (Supabase/Neon). 

Untuk mencegah *error* sinkronisasi, *database crash*, atau munculnya "Zombie DB", patuhi Standard Operating Procedure (SOP) di bawah ini.

### 🛑 3 ATURAN EMAS (PANTANGAN)
1. **DILARANG KERAS merombak tabel lewat UI Website (Supabase/Neon).** Jangan pernah menambah, menghapus, atau mengubah nama kolom lewat *dashboard* *browser*. Jika dilakukan, Alembic akan kebingungan dan menyebabkan *error* permanen. **Semua perubahan struktur WAJIB dilakukan dari file `models.py`**.
2. **DILARANG KERAS menghapus file `.py` di folder `alembic/versions/` secara manual** jika kamu sudah telanjur menembakkannya ke *database* (`alembic upgrade head`). Gunakan prosedur **Downgrade** jika terjadi kesalahan (lihat bagian *Troubleshooting*).
3. **SELALU `git pull` sebelum mengubah `models.py`.** Jika kamu berpindah dari PC ke Laptop, pastikan kodemu selalu versi paling baru sebelum memodifikasi struktur tabel untuk mencegah "cabang migrasi ganda" (*Multiple Heads*).

---

### ✅ SOP: Cara Menambah / Mengubah Kolom Database
Lakukan urutan ini setiap kali kamu mengubah isi file `models.py` (misal: menambah kolom baru).

**1. Ubah Kode di `models.py`**
Silakan tambah atau modifikasi kolom sesuai kebutuhan di `backend/models/models.py`. Simpan file.

**2. Buat Catatan Revisi (Generate Migration)**
Buka terminal, pastikan berada di folder *root* proyek, dan jalankan:
```bash
# Untuk Windows PowerShell:
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic revision --autogenerate -m "Pesan perubahan kamu, misal: tambah kolom KTP"

# Untuk Mac/Linux/GitBash:
PYTHONPATH=. alembic revision --autogenerate -m "Pesan perubahan"

```

*(Perintah ini akan membuat file `.py` baru di dalam folder `backend/alembic/versions/`)*

**3. Terapkan ke Cloud Database (Apply Migration)**
Tembakkan perubahan tersebut ke Supabase/Neon dengan perintah:

```bash
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic upgrade head

```

**4. Simpan ke GitHub**
Agar Laptop/PC lain tahu ada perubahan struktur:

```bash
git add .
git commit -m "Migrasi DB: tambah kolom KTP"
git push origin main

```

---

### 💻 SOP: Pindah Perangkat (PC ↔ Laptop)

Karena kita menggunakan Cloud Database, struktur DB di internet sudah berubah saat kamu melakukan SOP di atas. Saat kamu berpindah perangkat, kamu **TIDAK PERLU** melakukan migrasi lagi.

1. Buka Laptop/PC tujuan.
2. Tarik kode terbaru: `git pull origin main`
3. Nyalakan server: `uvicorn backend.main:app --reload`
*(Selesai! Aplikasi langsung berjalan normal karena kodemu dan Supabase sudah tersinkronisasi).*

---

### 🚑 KOTAK P3K: Mengatasi Error Alembic (Zombie DB)

Jika kamu melakukan kesalahan dan Alembic menolak untuk berjalan, jangan panik. Gunakan salah satu dari 3 jurus ini:

#### Kasus 1: "Saya salah ketik nama kolom di `models.py` tapi telanjur di `upgrade head`!"

**Solusi: Jurus Mundur 1 Langkah (Downgrade)**
Jangan hapus file migrasinya secara manual! Suruh Alembic membatalkan efeknya di database terlebih dahulu:

```bash
# Mundur satu langkah (menghapus efek migrasi terakhir di DB)
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic downgrade -1

```

Setelah perintah di atas sukses:

1. Hapus file `.py` terakhir yang salah di folder `alembic/versions/` secara manual.
2. Perbaiki *typo* di `models.py`.
3. Ulangi SOP (buat `revision --autogenerate` dan `upgrade head` baru).

#### Kasus 2: "Target database is not up to date" / "Multiple head revisions"

Ini terjadi jika kamu lupa `git pull` atau menghapus file revisi secara paksa dari *folder*, sehingga catatan DB (Supabase) dan kodemu (Lokal) tidak sinkron.
**Solusi: Jurus Cuci Otak Database (Stamping)**

```bash
# Memaksa DB melupakan masa lalu dan mencocokkan statusnya dengan file kode terbarumu
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic stamp head

```

#### Kasus 3: Kiamat Sinkronisasi (File Migrasi Berantakan Parah)

Jika file di folder `versions/` sudah sangat kacau, banyak yang *error*, and kamu ingin mereset riwayat migrasi menjadi 1 file saja **TANPA MENGHAPUS DATA PENGGUNA/SOAL**:

1. Hapus SEMUA file `.py` di dalam folder `backend/alembic/versions/`. (Biarkan foldernya kosong).
2. Buka DBeaver / TablePlus / UI Supabase. Cari tabel bernama `alembic_version`.
3. Klik kanan tabel `alembic_version` dan pilih **DROP/HAPUS TABEL**. (Ingat: Hanya tabel `alembic_version`, JANGAN hapus tabel `users` atau `questions`).
4. Buka terminal dan buat migrasi awal yang baru:
```bash
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic revision --autogenerate -m "Reset Awal Migrasi"

```


5. **JANGAN DI-UPGRADE!** (Karena tabel aslinya sudah ada di DB, upgrade akan menyebabkan error "Table already exists"). Sebagai gantinya, paksa Alembic for sync menggunakan `stamp`:
```bash
$env:PYTHONPATH = "d:\ProjectAI\Test-CPNS"; alembic stamp head

```



Sekarang riwayat DB-mu kembali bersih dan suci!

---
Developed with ❤️ using the latest technology.
