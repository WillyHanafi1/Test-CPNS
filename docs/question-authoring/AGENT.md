# AGENT.md — Panduan Kerja Mandiri AI Agent Pembuat Bank Soal SKD TOCPNS

Dokumen ini adalah **Standard Operating Procedure (SOP) otonom end-to-end** bagi AI Agent (*Antigravity, Claude Code, Codex, Gemini CLI*) untuk memproduksi satu paket lengkap **110 soal SKD CPNS orisinal, terverifikasi deterministik, dan siap impor** ke platform TOCPNS.

> **Batas Ruang Lingkup:** Seluruh alur di dokumen ini berjalan **100% offline** di folder `data/generated/<kode_paket>/` dan `scripts/`. Jangan pernah menambahkan integrasi LLM/AI ke `backend/` atau `frontend/` (lihat `GEMINI.md` § 5C.3).

---

## 1. Bacaan Wajib Sebelum Memulai (Context Bootstrap)

Sebelum menghasilkan 1 butir soal pun, Agent **WAJIB** membaca berkas-berkas berikut secara berurutan:
1. [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) — Hard gate, schema JSON/Excel, standar LaTeX, anti-plagiarisme, dan rubrik TKP.
2. [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md) — Peta slot Nomor `1–110`, proporsi sub-materi, target panjang kata, dan rotasi latar kasus.
3. [kepmenpan_rb_321_2024.md](file:///d:/ProjectAI/Test-CPNS/docs/kepmenpan_rb_321_2024.md) — Kisi-kisi resmi SKD CPNS.
4. [uud_1945_ringkas.md](file:///d:/ProjectAI/Test-CPNS/docs/uud_1945_ringkas.md) — Ringkasan pasal UUD 1945 Amandemen I–IV.
5. [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md) — Pasal 35–37, Pancasila operasional, UU ASN 20/2023 BerAKHLAK, UU Bela Negara 23/2019, 9 Nilai Integritas KPK, Linimasa Sejarah, EYD V / KBBI VI, dan Anti-Radikalisme.
6. **Sample Anchor Kalibrasi Kesulitan** (baca 2–3 contoh soal per segmen dari):
   - [vol17-bank-soal.json](file:///d:/ProjectAI/Test-CPNS/data/Packet%201/outputs/packet1-vol17/vol17-bank-soal.json)
   - [vol18-bank-soal.json](file:///d:/ProjectAI/Test-CPNS/data/Packet%202/outputs/packet2-vol18/vol18-bank-soal.json)

---

## 2. Struktur Folder Keluaran per Paket

Untuk setiap paket baru (mis. `vol19`), buat seluruh keluaran di:

```text
data/generated/<kode_paket>/
├── batches/
│   ├── twk_01_06_nasionalisme.json
│   ├── twk_07_11_integritas.json
│   ├── twk_12_16_bela_negara.json
│   ├── twk_17_25_pilar_negara.json
│   ├── twk_26_30_bahasa_indonesia.json
│   ├── tiu_31_34_analogi.json
│   ├── tiu_35_38_silogisme.json
│   ├── tiu_39_42_analitis.json
│   ├── tiu_43_51_berhitung_deret.json
│   ├── tiu_52_59_perbandingan_cerita.json
│   ├── tiu_60_65_figural.json
│   ├── tkp_66_74_pelayanan_publik.json
│   ├── tkp_75_82_jejaring_kerja.json
│   ├── tkp_83_88_sosial_budaya.json
│   ├── tkp_89_97_tik.json
│   ├── tkp_98_104_profesionalisme.json
│   └── tkp_105_110_anti_radikalisme.json
├── verify/
│   ├── verify_tiu_math_logic.py    # Skrip Python pembuktian eksak TIU #35-59
│   └── generate_figural.py         # Skrip Python deterministik pembuat gambar #60-65
├── gambar/
│   ├── q60_figural.png ... q65_figural.png
├── <kode_paket>-bank-soal.json     # Gabungan 110 soal tervalidasi
├── <kode_paket>-impor-raw.csv      # Ekspor sebelum shuffle
├── <kode_paket>-impor-shuffled.csv # Setelah acak kunci A-E + remap pembahasan
├── <kode_paket>-impor-final.xlsx   # File final siap upload di /admin/questions
└── audit-report.md                 # Laporan kelulusan Quality Gate + checklist review
```

---

## 3. Alur Kerja Otonom 8 Fase (Wajib Berurutan)

### Fase 1 — Persiapan & Ekstraksi Anchor
1. Tentukan `<kode_paket>` (mis. `vol19`), judul paket, dan profil kesulitan (`standard-bkn` atau `hard`).
2. Buat direktori `data/generated/<kode_paket>/{batches,verify,gambar}`.
3. Ambil 2–3 soal contoh per sub-topik dari `vol17-bank-soal.json` & `vol18-bank-soal.json` **hanya sebagai acuan struktur, panjang kalimat, dan level kesulitan** — catat tema kasus yang sudah dipakai agar tidak diulang.

### Fase 2 — Produksi Batch TWK (`#1–30`, 5 Batch)
- Kerjakan satu per satu sesuai tabel `TWK-1` s.d. `TWK-5` di `BLUEPRINT.md`.
- Setiap klaim hukum/sejarah/EYD **wajib** mencantumkan referensi terverifikasi di field `verification.reference` dari `uud_1945_ringkas.md` atau `korpus_twk_tkp_lengkap.md`.
- Setelah setiap batch selesai, jalankan:
  ```powershell
  python scripts/validate_question_pack.py data/generated/<kode_paket>/batches/twk_01_06_nasionalisme.json --partial
  ```
- Perbaiki langsung jika ada peringatan bias panjang opsi, kemiripan `>= 35%`, atau pembahasan tidak menyebut kunci.

### Fase 3 — Produksi & Pembuktian Python TIU Verbal & Numerik (`#31–59`, 5 Batch)
- **Aturan Wajib:** Agent **DILARANG** mengandalkan hitung di kepala untuk soal `#35–59`.
- Tulis skrip `data/generated/<kode_paket>/verify/verify_tiu_math_logic.py` yang:
  1. Menghitung secara eksak seluruh 17 soal **Numerik (`#43–59`)** menggunakan `fractions.Fraction` / `decimal.Decimal` dan mengecek bahwa tepat 1 opsi sama dengan hasil eksak serta ke-5 opsi bernilai berbeda satu sama lain.
  2. Menyelesaikan secara *brute-force* seluruh 4 soal **Analitis (`#39–42`)** (`itertools.permutations`) dan membuktikan (`assert`) bahwa dari semua permutasi valid yang memenuhi seluruh premis, **jawaban pada opsi kunci selalu benar dan unik** (0 ambiguitas!).
  3. Memverifikasi ekuivalensi logika formal untuk 4 soal **Silogisme (`#35–38`)** (tabel kebenaran / himpunan).
- Jalankan `python data/generated/<kode_paket>/verify/verify_tiu_math_logic.py` hingga **exit code 0 (`ALL VERIFIED`)**.
- Validasi tiap batch JSON dengan `--partial`.

### Fase 4 — Produksi Deterministik TIU Figural (`#60–65`, 1 Batch)
- Tulis skrip `data/generated/<kode_paket>/verify/generate_figural.py` menggunakan `Pillow` (`PIL`) atau `matplotlib` untuk menggambar 6 gambar soal figural (2 Analogi Gambar, 2 Ketidaksamaan Gambar, 2 Serial Gambar) ke `data/generated/<kode_paket>/gambar/q60_figural.png` s.d. `q65_figural.png`.
- Setiap gambar harus memuat panel soal + 5 opsi `A, B, C, D, E` berlabel rapi, latar putih bersih (`#FFFFFF`), garis kontras tinggi (`#111827`), dan aturan transformasi geometris eksak (rotasi, pencerminan, penambahan titik/sisi, pergeseran posisi).
- **Standar Tata Letak & Tipografi Figural:** Gunakan font TrueType beresolusi jelas (mis. `arial.ttf` / `DejaVuSans-Bold.ttf` ukuran `24–32px`, atau `matplotlib`; hindari `ImageFont.load_default()` tanpa ukuran), dan pisahkan zona motif tengah (`28%–72%` area kotak) dari zona penanda sudut (`<= 16%` dari tepi) agar elemen visual tidak pernah bertabrakan.
- **Wajib Inspeksi Visual:** Buka dan lihat sendiri setiap PNG yang dihasilkan (jika tool membaca gambar tersedia) untuk memastikan tidak ada label terpotong, bentuk tumpang tindih, atau opsi ganda!
- Isi `content` dengan pengantar singkat (mis. *"Perhatikan pola perubahan gambar berikut. Gambar yang tepat untuk melengkapi tanda tanya (?) adalah..."*) dan teks opsi `A`–`E` dengan `"Gambar A"` s.d. `"Gambar E"` agar lulus validasi teks wajib TOCPNS.

### Fase 5 — Produksi Batch TKP (`#66–110`, 6 Batch)
- Kerjakan per sub-topik (`TKP-1` s.d. `TKP-6`, 6–9 soal/batch) menggunakan korpus **BerAKHLAK** & **Anti-Radikalisme**.
- Sebelum menulis opsi A–E, susun dulu gradasi perilaku `5 → 4 → 3 → 2 → 1` secara tegas sesuai `RULES.md` § 3C, lalu samakan panjang kata ke-5 opsi (`selisih skor 5 vs rata-rata lain ≤ 5 kata`).
- Validasi setiap batch dengan `--partial` segera setelah ditulis.

### Fase 6 — Penggabungan, Quality Gate Ketat, & Adversarial Audit
1. Gabungkan seluruh 17 batch menjadi `data/generated/<kode_paket>/<kode_paket>-bank-soal.json` (urut `number` `1..110`).
2. Jalankan Quality Gate penuh & ekspor CSV mentah:
   ```powershell
   python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal.json --export-csv data/generated/<kode_paket>/<kode_paket>-impor-raw.csv
   ```
3. **Wajib Exit Code 0** (0 hard error!). Jika ada error/warning kritis (duplikat, similarity `>= 35%`, bias panjang opsi `> 35%`, LaTeX tidak seimbang, bobot TKP tidak unik, pembahasan tidak sinkron), perbaiki sumber JSON lalu ulangi langkah 2 hingga bersih.
4. Lakukan **Adversarial Self-Audit** (lihat Prompt 6 di `PROMPTS.md`) minimal terhadap seluruh soal berkategori Sulit/HOTS, seluruh TIU Analitis/Silogisme, dan 10 sampel acak TKP untuk mengecek celah ambiguitas.

### Fase 7 — Acak Kunci Jawaban & Final Export Excel
1. Jalankan shuffler resmi TOCPNS (otomatis mengecualikan `Figural` dan me-remap huruf opsi di pembahasan dengan placeholder dua-tahap):
   ```powershell
   python scripts/shuffle_answers.py --files ..\generated\<kode_paket>\<kode_paket>-impor-raw.csv
   ```
   *(Atau jalankan opsi `--shuffle` bawaan di `scripts/validate_question_pack.py` — lihat perintah lengkap di bawah — yang otomatis mengacak non-figural, me-remap pembahasan, memvalidasi ulang, dan langsung menghasilkan `.xlsx` final!)*
2. Jalankan validasi akhir pada file `.xlsx` final:
   ```powershell
   python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx
   ```
3. Tulis `data/generated/<kode_paket>/audit-report.md` berisi ringkasan metrik (distribusi segmen, distribusi kunci A–E, max similarity terhadap Vol.17 & Vol.18, rasio panjang opsi benar, status verifikasi Python TIU, dan daftar 6 gambar figural).

### Fase 8 — Upload Gambar Figural & Import ke Panel Admin TOCPNS
1. **Upload Gambar Figural ke Supabase Storage** bucket publik `exam-assets` pada path `figural/<kode_paket>/q60_figural.png` s.d. `q65_figural.png` (mengikuti SOP `GEMINI.md` § 5F), lalu perbarui kolom `image_url` dengan URL publik Supabase (bukan `127.0.0.1`).
2. **Import ke TOCPNS:**
   - Login ke `/admin/packages` → **Buat paket baru** (otomatis berstatus **Draft**).
   - Buka `/admin/questions` → **Import Excel / CSV** → pilih paket Draft tujuan → unggah `<kode_paket>-impor-final.xlsx`.
   - Spot-check 5 soal di **Split-Pane Live Preview** (1 TWK, 1 TIU rumus KaTeX, 1 TIU Figural bergambar, 1 TIU Analitis, 1 TKP) untuk memastikan rendering KaTeX dan gambar sempurna.
   - Kembali ke `/admin/packages` → klik **Validasi & Terbitkan** → pastikan 0 catatan error → **Terbitkan revisi**!

---

## 4. Perintah Cepat Quality Gate & Export

```powershell
# 1. Validasi batch parsial selama proses drafting (5-10 soal)
python scripts/validate_question_pack.py data/generated/vol19/batches/twk_01_06_nasionalisme.json --partial

# 2. Validasi paket penuh 110 soal + cek anti-plagiarisme terhadap Packet 1 & 2
python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json

# 3. Validasi + acak kunci jawaban seimbang (non-figural) + ekspor langsung ke CSV & XLSX siap import!
python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json --shuffle --export-csv data/generated/vol19/vol19-impor-final.csv --export-xlsx data/generated/vol19/vol19-impor-final.xlsx --report data/generated/vol19/audit-report.md
```
