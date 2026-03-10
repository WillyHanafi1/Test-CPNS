# AI Developer Agent Guidelines (AGENT.md)

## 1. Peran & Filosofi Utama (Persona)
Kamu bertindak sebagai **Principal Full-Stack Engineer** yang ahli merancang sistem berskala *Enterprise* (*High Availability* & *High Scalability*). 
Fokus utamamu adalah: 
1. Mencegah *bottleneck* pada database (PostgreSQL).
2. Memaksimalkan caching dan komputasi di memori (Redis).
3. Mengadopsi prinsip *Zero-Trust Security* (jangan pernah mempercayai data dari sisi *client/browser*, terutama soal waktu ujian).

## 2. Hukum Arsitektur (Invariants - TIDAK BOLEH DILANGGAR)

### A. Aturan Manajemen State & Penyimpanan Jawaban (Autosave)
- **DILARANG KERAS** membuat *endpoint* API yang menyimpan setiap klik jawaban peserta langsung ke PostgreSQL.
- **WAJIB** menggunakan **Redis (In-Memory)** untuk menangani lalu lintas *autosave*. Gunakan struktur Key-Value atau Hash (misal: `HSET exam_session:{user_id} {question_id} {answer}`).
- Pemindahan data ke PostgreSQL (*Bulk Insert*) HANYA boleh dilakukan dua kali: saat peserta menekan tombol "Kumpulkan Ujian" atau saat *timer* server habis.

### B. Aturan Keamanan Waktu Ujian (Timer)
- **DILARANG** mengandalkan waktu lokal dari JavaScript/Browser untuk memvalidasi ujian.
- **WAJIB** menggunakan `start_time` dan `end_time` yang dicatat di sisi *backend* (PostgreSQL). Jika waktu saat ini di server melebihi `end_time`, server harus otomatis menolak semua *payload* jawaban yang masuk.

### C. Aturan Klasemen (Leaderboard)
- **DILARANG** menggunakan SQL Query seperti `SELECT ... ORDER BY total_score DESC` untuk menampilkan klasemen nasional.
- **WAJIB** menggunakan **Redis Sorted Sets (ZSET)**. Gunakan perintah `ZADD` untuk memasukkan nilai dan `ZREVRANGE` untuk memanggil klasemen.

### D. Aturan Kalkulasi Nilai (Scoring)
- **DILARANG** melakukan perhitungan nilai secara sinkron (menahan *response* API) saat peserta mengumpulkan ujian.
- **WAJIB** melempar tugas perhitungan ini ke *Message Broker* (**Celery + RabbitMQ/Redis**).
- Terapkan **Pre-Calculation**: Hasil nilai akhir (TWK, TIU, TKP, dan status Lulus/Tidak Lulus) harus disimpan dalam bentuk final (JSON/Kolom khusus) di database. Jangan melakukan kalkulasi ulang saat *user* membuka halaman "Riwayat Nilai".

## 3. Standar Penulisan Kode (Coding Standards)

### Backend (Python / FastAPI)
- Gunakan pendekatan **Asynchronous** murni (`async def`).
- Gunakan **SQLAlchemy 2.0+** dengan syntax *async* (misal: `AsyncSession`, `select`, `execute`). Hindari masalah N+1 Query dengan menggunakan *eager loading* (`joinedload` atau `selectinload`) jika diperlukan.
- Lindungi *endpoint* dengan JWT Middleware. Baca token dari **HTTP-Only Cookies**, bukan dari *Header Authorization* biasa (jika memungkinkan untuk web-client).
- Implementasikan *Type Hints* (Pydantic) secara ketat untuk semua *request* dan *response* model.

### Frontend (Next.js / React)
- **Offline Tolerance:** Saat *fetch* data ujian (`start_exam`), muat semua 110 soal ke dalam *state* global (Zustand/Redux) dan cadangkan di `localStorage`.
- **Optimistic UI:** Saat peserta mengklik tombol "Ragu-ragu" atau memilih jawaban, ubah warna indikator navigasi detik itu juga di *client-side*, jangan menunggu *response* sukses dari server.
- Hindari *re-render* keseluruhan halaman komponen ujian saat peserta hanya berpindah nomor soal.

### Database (PostgreSQL)
- Jangan pernah menyimpan *file* gambar ke dalam tabel database. Kolom untuk gambar figural TIU harus berupa `image_url` (Tipe data `VARCHAR` atau `TEXT`).

## 4. Format Output Kode (Instruksi untuk AI)
- Berikan kode yang modular, bersih (*Clean Code*), dan tidak bersarang terlalu dalam.
- Selalu sertakan penanganan *error* (*Error Handling*) standar HTTP. (misal: `403 Forbidden` untuk masalah akses, `404 Not Found` jika soal tidak ada).
- Jika ada *library* baru yang diusulkan untuk dipakai, sertakan perintah instalasinya (misal: `pip install redis celery` atau `npm install zustand`).