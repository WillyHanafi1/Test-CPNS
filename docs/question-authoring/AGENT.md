# AGENT.md — Panduan Kerja Mandiri AI Agent Pembuat Bank Soal SKD TOCPNS

Dokumen ini adalah **Standard Operating Procedure (SOP) otonom end-to-end** bagi AI Agent (*Antigravity, Claude Code, Codex, Gemini CLI*) untuk memproduksi satu paket lengkap **110 soal SKD CPNS orisinal, terverifikasi deterministik, dan siap impor** ke platform TOCPNS.

> **Batas Ruang Lingkup:** Seluruh alur di dokumen ini berjalan **100% offline** di folder `data/generated/<kode_paket>/` dan `scripts/`. Jangan pernah menambahkan integrasi LLM/AI ke `backend/` atau `frontend/` (lihat `GEMINI.md` § 5C.3).

---

## 1. Bacaan Wajib Sebelum Memulai (Context Bootstrap)

Sebelum menghasilkan 1 butir soal pun, Agent **WAJIB** membaca berkas-berkas berikut secara berurutan:
1. [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) — Hard gate, schema JSON/Excel, standar LaTeX, anti-plagiarisme, dan rubrik TKP.
2. [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md) — Peta slot Nomor `1–110`, proporsi sub-materi, target panjang kata, dan rotasi latar kasus.
3. [kepmenpan_rb_321_2024.md](file:///d:/ProjectAI/Test-CPNS/docs/kepmenpan_rb_321_2024.md) — Kisi-kisi resmi SKD CPNS.
4. **Korpus Hukum & Bahasa Verbatim (`references/`):**
   - [uud_1945_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uud_1945_lengkap.md) — Naskah lengkap UUD 1945 Amandemen I–IV (seluruh Pembukaan, 21 BAB, 73 Pasal, Aturan Peralihan & Tambahan).
   - [uu_20_2023_asn_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uu_20_2023_asn_lengkap.md) — Naskah lengkap UU No. 20 Tahun 2023 tentang ASN (seluruh 77 Pasal + Penjelasan Umum & Pasal demi Pasal).
   - [korpus_bahasa_indonesia_kbbi6_eyd5.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_bahasa_indonesia_kbbi6_eyd5.md) — Kaidah EYD V, 191 kata baku KBBI VI, 90 sinonim/antonim, 62 idiom, 35 pola kalimat efektif, & matriks rotasi Vol.19–Vol.30.
   - [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md) — Pancasila operasional, 9 Nilai Integritas KPK, UU Bela Negara 23/2019, Linimasa Sejarah 1908–2002, & Anti-Radikalisme.
5. **Protokol QA Pasca-Drafting:**
   - [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md) — Review silang beda model (4 batch + Blind-Solve TIU).
   - [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md) — Spot-check manusia 15 menit pra-terbit.
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
├── cross_audit/                    # 6 berkas otomatis (--export-blind-audit) untuk Review Silang
│   ├── audit_01_twk.json
│   ├── audit_02_tiu_blind.json     # Tanpa kunci & pembahasan (Blind-Solve)
│   ├── audit_02_tiu_key.json
│   ├── audit_03_figural_blind.json
│   ├── audit_03_figural_key.json
│   └── audit_04_tkp.json
├── audit-report.md                 # Laporan kelulusan Quality Gate otomatis
├── cross-model-audit.md            # Log hasil Review Silang Beda Model (CROSS_MODEL_REVIEW.md)
└── signoff-checklist.md            # Checklist Spot-Check Manusia 15 Menit (HUMAN_SPOT_CHECK_SOP.md)
```

---

## 3. Alur Kerja Otonom 8 Fase (Wajib Berurutan)

### Fase 1 — Persiapan & Ekstraksi Anchor
1. Tentukan `<kode_paket>` (mis. `vol19`), judul paket, dan profil kesulitan (`standard-bkn` atau `hard`).
2. Buat direktori `data/generated/<kode_paket>/{batches,verify,gambar,cross_audit}`.
3. Ambil 2–3 soal contoh per sub-topik dari `vol17-bank-soal.json` & `vol18-bank-soal.json` **hanya sebagai acuan struktur, panjang kalimat, dan level kesulitan** — catat tema kasus yang sudah dipakai agar tidak diulang.

### Fase 2 — Produksi Batch TWK (`#1–30`, 5 Batch)
- Kerjakan satu per satu sesuai tabel `TWK-1` s.d. `TWK-5` di `BLUEPRINT.md`.
- Setiap klaim hukum/pasal/ASN/sejarah/EYD/KBBI **wajib** mencantumkan referensi verbatim terverifikasi di field `verification.reference` dari `uud_1945_lengkap.md`, `uu_20_2023_asn_lengkap.md`, `korpus_bahasa_indonesia_kbbi6_eyd5.md`, atau `korpus_twk_tkp_lengkap.md`.
- Khusus batch **TWK-5 (Bahasa Indonesia `#26–30`)**, ikuti matriks rotasi di `korpus_bahasa_indonesia_kbbi6_eyd5.md` § 6 agar tidak berulang antar paket.
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

### Fase 6 — Penggabungan, Quality Gate Ketat, & Review Silang Beda Model
1. Gabungkan seluruh 17 batch menjadi `data/generated/<kode_paket>/<kode_paket>-bank-soal.json` (urut `number` `1..110`).
2. Jalankan Quality Gate penuh, ekspor CSV mentah, dan buat paket audit silang 4 batch (`--export-blind-audit`):
   ```powershell
   python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal.json --export-csv data/generated/<kode_paket>/<kode_paket>-impor-raw.csv --export-blind-audit data/generated/<kode_paket>/cross_audit/
   ```
3. **Wajib Exit Code 0** (0 hard error!). Jika ada error/warning kritis (duplikat, similarity `>= 35%`, bias panjang opsi `> 35%`, LaTeX tidak seimbang, bobot TKP tidak unik, pembahasan tidak sinkron), perbaiki sumber JSON lalu ulangi langkah 2 hingga bersih.
4. **Wajib Review Silang Beda Model ([CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md)):**
   - Kirim 4 batch di `data/generated/<kode_paket>/cross_audit/` (`audit_01_twk.json`, `audit_02_tiu_blind.json`, `audit_03_figural_blind.json` + 6 PNG, `audit_04_tkp.json`) ke **keluarga model berbeda** (mis. generator Gemini → auditor Claude/GPT) menggunakan **Prompt 6A–6D**.
   - Tutup 100% temuan **KRITIS (`P0`)** & **MAYOR (`P1`)** (sengketa diputus pakai teks verbatim UU/UUD atau Python solver), simpan log ke `data/generated/<kode_paket>/cross-model-audit.md`, lalu ulangi langkah 2 bila ada soal yang direvisi.

### Fase 7 — Acak Kunci Jawaban & Final Export Excel
1. Jalankan shuffler resmi + ekspor CSV/XLSX final + laporan audit dalam satu perintah:
   ```powershell
   python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal.json --shuffle --export-csv data/generated/<kode_paket>/<kode_paket>-impor-final.csv --export-xlsx data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx --report data/generated/<kode_paket>/audit-report.md --export-blind-audit data/generated/<kode_paket>/cross_audit/
   ```
2. Jalankan validasi akhir pada file `.xlsx` final:
   ```powershell
   python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx
   ```
3. Siapkan template `data/generated/<kode_paket>/signoff-checklist.md` dari [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md) untuk editor manusia.

### Fase 8 — Upload Gambar Figural, Spot-Check Manusia 15 Menit, & Terbitkan
1. **Upload Gambar Figural ke Supabase Storage** bucket publik `exam-assets` pada path `figural/<kode_paket>/q60_figural.png` s.d. `q65_figural.png` (mengikuti SOP `GEMINI.md` § 5F), lalu perbarui kolom `image_url` dengan URL publik Supabase (bukan `127.0.0.1`) dan ekspor ulang `.xlsx` final.
2. **Spot-Check Manusia 15 Menit ([HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md)):**
   - Menit 0–3: Verifikasi `audit-report.md` & `cross-model-audit.md`.
   - Menit 3–7: Inspeksi visual 6 gambar Figural + uji pola & URL publik.
   - Menit 7–12: Uji 10 soal sampel stratifikasi (2 TWK hukum, 1 TWK Bahasa, 2 TIU Analitis/Silogisme, 1 TIU KaTeX, 4 TKP batas 5 vs 4) — pastikan bebas **10 Red Flags**.
   - Menit 12–15: Impor `<kode_paket>-impor-final.xlsx` ke paket **Draft** di `/admin/questions`, cek **Split-Pane Live Preview** (KaTeX + gambar Figural), isi `signoff-checklist.md`, lalu kembali ke `/admin/packages` → klik **Validasi & Terbitkan**!

---

## 4. Perintah Cepat Quality Gate, Audit Bundler, & Export

```powershell
# 1. Validasi batch parsial selama proses drafting (5-10 soal)
python scripts/validate_question_pack.py data/generated/vol19/batches/twk_01_06_nasionalisme.json --partial

# 2. Validasi paket penuh 110 soal + buat 4 batch Review Silang Beda Model (TIU Blind-Solve)
python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json --export-blind-audit data/generated/vol19/cross_audit/

# 3. Validasi + acak kunci jawaban seimbang (non-figural) + ekspor langsung ke CSV, XLSX, & audit-report.md!
python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json --shuffle --export-csv data/generated/vol19/vol19-impor-final.csv --export-xlsx data/generated/vol19/vol19-impor-final.xlsx --report data/generated/vol19/audit-report.md
```
