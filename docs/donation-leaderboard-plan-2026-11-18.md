# Riset Mendalam, Psikologi Streamer Donation, dan Rencana Perombakan Leaderboard & Papan Pesan Donasi TOCPNS

## 1. Latar Belakang & Tujuan Perombakan

Implementasi awal halaman `/donasi` dan seksi komunitas di bawah beranda (`/` serta `/dashboard`) sudah menghubungkan pembayaran DOKU Production dan pencatatan database, namun masih memiliki beberapa kelemahan UX dan psikologis:

1. **Pesan/chat pendukung tidak tampil di tempat strategis:**
   - Pada `SupporterList` (*Papan dukungan* / Leaderboard), query backend hanya mengambil `full_name`, `total_amount`, `donation_count`, dan `rank` tanpa mengambil `message` terbaru dari pendukung tersebut. Akibatnya, pendukung peringkat teratas (#1, #2, #3) tidak memiliki ruang bagi pesan/doa mereka di leaderboard.
   - Pada seksi bawah beranda (`DonationSection.tsx`), komponen `<RecentList compact />` menyembunyikan seluruh pesan (`!compact && row.message`), sehingga pengunjung di halaman utama sama sekali tidak melihat chat/doa dari para donatur.
2. **Form terlalu kaku (*strict*) dan menyembunyikan fitur utama:**
   - Kolom pesan dan opsi nama disembunyikan di dalam elemen `<details>` (*Nama & pesan (opsional)*) yang tertutup secara default, serta hanya dirender setelah pengguna login.
   - Pilihan identitas disetel anonim secara default (`showName = false` / `is_anonymous = true`), sehingga donatur yang langsung membayar tanpa membuka accordion tidak masuk ke leaderboard nama.
   - Input nominal menolak format umum yang sering diketik pengguna seperti `"Rp 10.000"`, `"10,000"`, atau `"10 000"`.
   - Nama profil dipotong paksa menjadi inisial belakang (`"Budi Santoso"` → `"Budi S."`), mengurangi rasa personal pada papan apresiasi.

Tujuan perombakan ini adalah menghadirkan **kepuasan psikologis ala donasi streamer (Saweria, Trakteer, YouTube Super Chat, Ko-fi)**—di mana **pesan/chat tampil menonjol**, **peringkat memberi kebanggaan visual**, dan **form sangat mudah (tidak strict)**—namun tetap mempertahankan **bahasa desain TOCPNS yang simpel, bersih, hangat, dan elegan** (tanpa elemen ramai yang mengganggu fokus belajar).

---

## 2. Riset Mendalam & Benchmark Platform (Saweria, Trakteer, YouTube Super Chat, Ko-fi)

### A. Mengapa Orang Puas Saat Berdonasi di Platform Streamer?
Berdasarkan literatur perilaku ekonomi (*Shang & Croson 2009*; *DellaVigna et al. 2012*) dan pola UX pada **YouTube Super Chat**, **Twitch Cheers**, **Saweria**, **Trakteer**, serta **Ko-fi**:

| Mekanisme Psikologis | Praktik Terbaik di Saweria / Super Chat / Ko-fi | Penerapan Elegan di TOCPNS |
| :--- | :--- | :--- |
| **1. *The Spotlight Effect* & Suara di Komunitas** | Donatur tidak sekadar mengirim uang; mereka membeli "panggung" agar pesan, doa, atau semangat mereka dibaca komunitas. | **Chat selalu tampil** baik di kartu *Live Support Stream* maupun sebagai **kutipan tersemat (*pinned message*)** langsung di kartu Leaderboard (*Top Supporters*), baik di `/donasi` maupun di bawah beranda (`/`). |
| **2. *Tiered Visual Recognition* (Gradasi Apresiasi)** | Super Chat dan Saweria membedakan warna/badge kartu berdasarkan nominal agar donasi yang lebih besar terasa lebih spesial tanpa meremehkan donasi kecil. | **4 Tier Apresiasi Elegan** berbasis token semantik (mendukung Light & Dark mode): **Pendukung** (Rp1rb+), **Penyemangat** (Rp10rb+), **Pejuang Utama** (Rp25rb+), dan **Sponsor Belajar** (Rp50rb+). |
| **3. *Ordinal Rank & Podium Pride*** | Peringkat #1, #2, #3 pada leaderboard bulanan/sepanjang masa diberi penanda visual (mahkota/medali) dan sorotan kartu yang membanggakan. | Kartu peringkat **#1, #2, #3** memiliki aksen medali (`#1`, `#2`, `#3`), badge frekuensi dukungan, nominal total, dan kutipan pesan terbaru mereka. |
| **4. *Immediate Preview & Ownership* (Pratinjau Langsung)** | Sebelum menekan tombol bayar, pengguna melihat bagaimana kartu pesan & tier mereka akan tampil di layar. | **Live Card Preview** di dalam `DonationForm`: saat pengguna memilih nominal dan mengetik pesan, pratinjau kartu langsung berubah secara *real-time*. |
| **5. *Frictionless Micro-Interaction* (Rendah Hambatan)** | Form langsung terbuka, menyediakan *quick message chips*, nama tampil secara default (dengan *toggle* anonim 1 klik), dan input uang fleksibel. | Textarea pesan langsung terbuka, tersedia **3 tombol template pesan/doa cepat**, checkbox tampilkan nama **aktif secara default** (bisa di-uncheck kapan saja), dan parser nominal menerima `5.000`, `5,000`, `Rp 5.000`. |

### B. Prinsip "Simple Tetapi Elegan" (Batas Etika & Estetika TOCPNS)
- **Tidak mengganggu ujian:** Tidak ada popup otomatis, suara/TTS yang mengejutkan, atau banner berjalan di dalam ruang simulasi CAT.
- **Kejujuran data:** Seluruh angka, peringkat, dan pesan murni berasal dari transaksi `success` di database production (bukan data palsu/dummy).
- **Privasi tetap dihormati:** Meskipun tampil nama aktif secara default agar memudahkan pengguna masuk leaderboard, pengguna dapat mematikan checkbox dalam 1 klik sebelum membayar atau mengubahnya kapan saja dari halaman **Akun (`/account`)**. Email dan ID akun tidak pernah ditampilkan ke publik.

---

## 3. Rencana Arsitektur & Teknis

### 1. Backend (`backend/services/donations.py` & `backend/schemas/transaction.py`)
- **Default `is_anonymous = False` pada `DonationRequest`:**
  - Memudahkan donatur tampil di leaderboard secara default tanpa harus mencari opsi tersembunyi, sambil tetap menghormati nilai `is_anonymous: true` jika pengguna memilih tampil sebagai `"Pendukung anonim"`.
- **Pesan Tersemat (*Pinned Message*) pada `TopSupporter`:**
  - Tambahkan field `message: Optional[str] = None` pada schema `TopSupporter`.
  - Pada `donations.top_supporters()`, ambil pesan terbaru yang tidak kosong (`message IS NOT NULL AND trim(message) <> ''`) milik masing-masing `user_id` dari transaksi donasi publik yang terkonfirmasi pada periode tersebut, sehingga setiap pendukung di leaderboard menampilkan pesan/doa terbaik mereka.
- **Nama Publik yang Ramah & Aman (`public_name`):**
  - Menampilkan nama profil yang rapi dan natural (hingga 40 karakter, spasi dinormalisasi, misalnya `"Budi Santoso"` atau `"Willy"`), bukan memotong paksa kata kedua menjadi satu huruf, namun tetap memfilter string yang mengandung `@`, `://`, atau `www.` menjadi `"Pendukung TOCPNS"`.

### 2. Frontend Utilities (`frontend/src/lib/donations.ts`)
- **Parser Nominal yang Tidak Strict (`donationAmount`):**
  - Menerima input `"5000"`, `"5.000"`, `"5,000"`, `"Rp 5.000"`, `"Rp5000"`, `"5 000"`.
  - Tetap menolak angka desimal bersen (`"5000.5"`, `"5000,50"`), notasi ilmiah (`"5e3"`), angka negatif, atau nilai di luar rentang `1.000` – `2.147.483.647`.
- **Sistem Tier Apresiasi (`donationTier`):**
  - `>= 50.000`: `{ key: "gold", label: "Sponsor Belajar" }`
  - `>= 25.000`: `{ key: "indigo", label: "Pejuang Utama" }`
  - `>= 10.000`: `{ key: "teal", label: "Penyemangat" }`
  - `< 10.000`: `{ key: "base", label: "Pendukung" }`
- **Template Pesan Cepat (`QUICK_DONATION_MESSAGES`):**
  - `"Bismillah lulus CPNS tahun ini!"`
  - `"Semangat pejuang NIP, pantang menyerah!"`
  - `"Terima kasih sudah merawat ruang latihan ini."`

### 3. Komponen UI (`DonationDisplay.tsx`, `DonationForm.tsx`, `DonationPage.tsx`, `DonationSection.tsx`)
- **`SupporterList` (Leaderboard Pendukung Teratas):**
  - Menampilkan badge peringkat (`#1`, `#2`, `#3` dengan aksen podium elegan), nama pendukung, badge tier & jumlah kali dukungan, total nominal donasi, serta **gelembung pesan/chat (`donation-leaderboard-quote`)** jika pendukung meninggalkan pesan.
- **`RecentList` (Stream Pesan & Dukungan Terbaru):**
  - Menampilkan kartu bergaya *Super Chat / Saweria* dengan aksen warna tier (`data-tier`), badge tier + nominal, tanggal WIB, dan **gelembung chat yang selalu tampil** baik di halaman `/donasi` maupun di seksi beranda (`DonationSection.tsx`).
- **`DonationForm` (Formulir Donasi Interaktif):**
  - Tombol preset nominal menampilkan nominal sekaligus label tier (`Rp 5.000 · Pendukung`, `Rp 10.000 · Penyemangat`, `Rp 25.000 · Pejuang Utama`, `Rp 50.000 · Sponsor Belajar`).
  - Kolom pesan langsung terbuka bagi semua pengunjung (termasuk sebelum login) lengkap dengan *quick message chips*.
  - Checkbox `Tampilkan nama saya di papan dukungan` aktif secara default (`checked`).
  - Menyertakan **Pratinjau Kartu Dukungan** secara langsung (*live preview*) di dalam form.
  - Menyimpan draf pesan & pilihan privasi di `sessionStorage` (dengan fallback aman bila storage diblokir) saat pengunjung diarahkan ke halaman login.

### 4. Pengujian & Verifikasi
- Suite `pytest backend/tests` (termasuk `test_donation_community.py`).
- Unit test kontrak frontend (`frontend/tests/donations.test.mts`) & Vitest.
- TypeScript `tsc --noEmit`, ESLint `lint:participant`, dan `next build`.
- Playwright E2E (`frontend/e2e/donations.spec.ts`, `auth.spec.ts`, `reliability.spec.ts`) pada desktop & mobile (`320px`, `390px`, `768px`, `1280px`) dalam mode Light & Dark.
- Commit dan `git push origin main` untuk memicu CI/CD otomatis sampai ter-deploy di `https://tocpns.my.id`.
