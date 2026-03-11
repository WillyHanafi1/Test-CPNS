# 📚 LESSON LEARNED — CAT CPNS Platform

> Dokumen ini merangkum semua pelajaran penting, keputusan arsitektural, dan celah keamanan yang ditemukan dan diselesaikan selama pengembangan platform CAT CPNS.
>
> **Tanggal:** 2026-03-11 | **Versi:** 1.0

---

## 🔐 1. Keamanan (Security)

### 1.1 Bocoran Kunci Jawaban via Network Tab

**Masalah:**
Endpoint `GET /packages/{id}` menggunakan skema `PackageWithQuestions` yang menyertakan field `score` (bobot nilai TKP 1–5) di dalam `question_options`. Peserta ujian bisa membuka *Inspect Element → Network Tab* dan membaca semua bobot jawaban sebelum mengerjakan soal.

**Solusi:**
- Buat skema Pydantic terpisah: `OptionPublic`, `QuestionPublic`, `PackagePublic` yang secara eksplisit **menghilangkan** field `score` dan `discussion`.
- Endpoint `GET /packages/{id}` (katalog) hanya mengembalikan info paket (judul, deskripsi, harga) — **tanpa soal sama sekali**.
- Soal hanya dikirim via `POST /exam/start/{id}` yang sudah ter-autentikasi dan menggunakan skema `OptionResponse` (tanpa `score`).

**Aturan Emas:**
> *Never trust the client. Apa pun yang dikirim API ke browser bisa dibaca pengguna.*

---

### 1.2 Manipulasi Waktu via Jam PC (Client-Side Clock Spoofing)

**Masalah:**
Timer ujian hanya mengandalkan `setInterval` dan `Date.now()` di frontend. Peserta bisa memundurkan jam PC mereka 1 jam dan timer tidak pernah mencapai 0.

**Solusi (Multi-Layer):**

| Layer | Implementasi |
|-------|-------------|
| **Frontend - Initial** | `startExam()` menyimpan `serverEndTime` (ISO string dari server) ke Zustand + `localStorage` |
| **Frontend - Offset** | Hitung `serverTimeOffset = serverEndTime - durationMs - Date.now()` saat exam mulai. Semua kalkulasi waktu pakai `realNow = Date.now() + offset` |
| **Frontend - Tick** | Setiap detik recalculate dari `serverEndTime` bukan decrement — **langsung snap ke waktu akurat saat F5** |
| **Backend - Autosave** | Setiap request `/autosave` dicek ke Redis `session_meta:{id}`. Jika `now > end_time` → `403 Forbidden` |
| **Backend - Finish** | `/finish` juga cek `now_utc > session.end_time` sebelum proses — tidak bisa cheat dari sisi finish |

**Aturan Emas:**
> *Server adalah satu-satunya sumber kebenaran waktu (Single Source of Truth). Client hanya menampilkan ilusi visual.*

---

### 1.3 Bypass Autosave setelah Waktu Habis

**Masalah:**
Meskipun frontend timer habis, peserta yang paham API bisa langsung memanggil `POST /autosave/{session_id}` dengan jawaban baru setelah waktu server habis.

**Solusi:**
Saat exam dimulai (`/start`), backend menyimpan `end_time.timestamp()` ke Redis:
```python
await redis_service.redis.setex(f"session_meta:{session.id}", 10800, str(end_time.timestamp()))
```
Setiap autosave wajib validasi dari Redis. Jika waktu sudah habis → `403 Forbidden` langsung — tidak ada query ke PostgreSQL.

---

## 🏗️ 2. Arsitektur (Architecture Decisions)

### 2.1 Redis sebagai Write-Behind Cache untuk Autosave

**Keputusan:** Jawaban ujian **tidak pernah** langsung ditulis ke PostgreSQL saat exam berlangsung.

**Alasan:** Di skenario ujian massal (1.000 peserta, klik setiap 10 detik = 100 QPS hanya untuk jawaban), PostgreSQL akan kewalahan dan koneksinya habis.

**Pola:**
```
Klik Jawaban → Redis HSET (< 1ms) → Celery Worker → PostgreSQL bulk insert (saat finish)
```

**Key Format:**
- `exam_answers:{user_id}:{session_id}` → Hash (question_id → option_id)
- `session_meta:{session_id}` → String (end_time UNIX timestamp, TTL 3 jam)

---

### 2.2 Server-Authoritative Timer

**Keputusan:** Timer di frontend hanya visual. Validasi waktu murni dari `start_time` + `end_time` di PostgreSQL.

**Implementasi:**
- `end_time` dihitung server saat `/start` (bukan dari request client).
- `end_time` dikirim ke frontend sebagai ISO string.
- Frontend menyimpan `serverEndTime` di localStorage untuk restore setelah F5.
- Celery task tetap jalan meski peserta tidak klik "Selesai" (triggered saat `/finish` dipanggil).

---

### 2.3 Schema Segregation (DTO Pattern)

**Keputusan:** Pisahkan skema internal (admin) dan skema publik (peserta).

```python
# INTERNAL (admin) — berisi semua data
class Option(OptionBase):  # termasuk score, discussion
    ...

# PUBLIC (peserta) — hanya data yang aman
class OptionPublic(BaseModel):  # score & discussion DIHAPUS
    id: uuid.UUID
    label: str
    content: str
```

---

### 2.4 RBAC Guard di Katalog

**Keputusan:** Tombol "Mulai Ujian" hanya muncul jika user memiliki transaksi `payment_status = 'success'` yang belum expired.

**Endpoint:** `GET /packages/{id}/access` → `{has_access: bool}`

**Flow:**
```
User klik Detail Paket → Frontend cek /access → 
  has_access=true  → Tampilkan "Mulai Ujian"
  has_access=false → Tampilkan "Beli Sekarang" (Midtrans)
  not logged in    → Tampilkan "Login Dulu"
```

---

## 🐛 3. Bug Kritis yang Ditemukan & Diperbaiki

| Bug | File | Dampak | Fix |
|-----|------|--------|-----|
| `sessionId` null saat autosave | `QuestionDisplay.tsx` | API dipanggil dengan `null` di URL | Guard: skip jika `!sessionId` |
| Double-finish race condition | `exam/[id]/page.tsx` | Skor dihitung dua kali | `useRef` guard + `isSubmitting` state |
| History → Result redirect null | `history/page.tsx` | Result page tidak bisa tampil | Set Zustand state sebelum `router.push()` |
| Timer reset saat F5 | `useExamStore.ts` | Peserta dapat waktu tambahan | Restore dari `serverEndTime` di localStorage |
| Typo "LUUD" di result | `result/page.tsx` | Tampilan status salah | Fix ke "LULUS" |
| Client-side search saja | `catalog/page.tsx` | Scale buruk, cari besar data lambat | Server-side ILIKE via `?search=` param |
| `datetime.utcnow()` deprecated | `exam.py`, `tasks.py`, `package_api.py` | Error di Python 3.12+ | Ganti ke `datetime.now(timezone.utc)` |
| Memory leak di polling | `result/page.tsx` | `setState` di unmounted component | `AbortController` abort saat cleanup |
| `useParams()` tidak type-safe | 4 halaman | Array ID bisa crash | `Array.isArray(id) ? id[0] : id` |
| `calculate_exam_score.delay()` unhandled | `exam.py` | 500 error jika Celery worker mati | `try/except` + fallback synchronous scoring |
| `end_time.timestamp()` naive UTC | `exam.py` | 403 Forbidden di `/autosave` karena timezone local | `.replace(tzinfo=timezone.utc).timestamp()` |
| Missing fallback import `async_run_scoring` | `exam.py` | 500 unhandled error saat Celery mati | Tambahkan impor dari `backend.core.tasks` + try/except log |
| `DuplicatePreparedStatementError` 500 API Crash | `tasks.py` | 500 error no CORS header saat endpoint `finish` dijalankan | Set `async_run_scoring` untuk menggunakan global `async_session_maker` yg dikonfigurasi `statement_cache_size: 0` khusus PgBouncer (Supabase) |

---

## ⚙️ 4. Operasional (Operational Lessons)

### 4.1 Alembic harus dijalankan dari Root Project

**Pelajaran:** `alembic` harus dijalankan dari direktori root (`d:\Project\Test-CPNS`), bukan dari dalam folder `backend`, karena model menggunakan `from backend.xxx import ...`.

```bash
# ❌ SALAH (dari dalam /backend)
cd backend && alembic upgrade head

# ✅ BENAR (dari root)
alembic -c backend/alembic.ini upgrade head
```

### 4.2 Stamp Alembic jika Tabel Sudah Ada Manual

Jika tabel sudah dibuat manual (bukan via Alembic migrations), jalankan:
```bash
alembic -c backend/alembic.ini stamp head
```
Ini memberitahu Alembic bahwa DB sudah dalam state terkini tanpa menjalankan migration apapun.

### 4.3 DATABASE_URL harus di-set sebelum Alembic

`config.py` membaca `DATABASE_URL` via `pydantic-settings` dari `.env`. Jika `.env` tidak ada di direktori yang benar, set sebagai environment variable sebelum menjalankan:
```powershell
$env:DATABASE_URL = "postgresql+asyncpg://..."
alembic -c backend/alembic.ini stamp head
```

### 4.4 Supabase pakai `timestamptz` — Model harus aware

Supabase menyimpan semua timestamp sebagai `TIMESTAMPTZ` (timezone-aware). Model SQLAlchemy menggunakan `DateTime` (timezone-naive). Gunakan `.replace(tzinfo=None)` saat membandingkan untuk menghindari error `.

```python
# ✅ Safe comparison
now = datetime.now(timezone.utc).replace(tzinfo=None)
if session.end_time and now > session.end_time:
    ...
```

### 4.5 Redis KEYS vs SCAN

**Masalah:** `KEYS packages:*` adalah operasi **blocking** di Redis — berbahaya di production karena Redis single-threaded.

**Solusi:** Gunakan `SCAN` atau batasi dengan TTL (expire) agar key otomatis terhapus. Untuk cache invallidation kecil, `DEL` dengan key spesifik lebih aman.

---

## 🚀 5. Next Steps

- [ ] **Midtrans Integration** — Implement Snap token generation + webhook callback untuk update `payment_status`
- [ ] **Redis SCAN** — Ganti semua `clear_pattern` (pakai `KEYS`) dengan SCAN-based implementation
- [ ] **RLS Supabase** — Enable Row Level Security di semua tabel produksi
- [ ] **Testing** — Unit test untuk scoring logic (TWK/TIU/TKP) dan integration test untuk exam flow
- [ ] **Celery Worker** — Setup Celery + Redis broker untuk background score calculation
- [ ] **Rate Limiting** — Tambahkan rate limit di `/autosave` (max 10 req/detik per user)

---

*Dokumen ini akan terus diupdate seiring pengembangan platform.*
