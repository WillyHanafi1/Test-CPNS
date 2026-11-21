# AGENT.md — SOP Ringkas & Fokus (Konteks Minimal) untuk AI Agent

Panduan ini dirancang agar AI Agent bekerja **cepat, akurat, dan tidak tenggelam oleh kelebihan konteks**.

> **Aturan Anti-Banjir Konteks:**
> 1. Di awal sesi, baca **HANYA** [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) dan [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md).
> 2. **JANGAN** membaca seluruh `references/*.md` atau seluruh 220 soal contoh sekaligus di awal!
> 3. Kerjakan **1 batch kecil (5–9 soal)** dalam satu waktu: ambil **hanya 5–9 soal contoh padanannya** dari `vol17-bank-soal.json` / `vol18-bank-soal.json`, lalu cari pasal/kata baku di `references/` **hanya saat diperlukan** (on-demand).
> 4. Seluruh pekerjaan berjalan **100% offline** di `data/generated/<kode_paket>/`. Jangan sentuh `backend/` atau `frontend/`.

---

## 1. Struktur Folder Keluaran

```text
data/generated/<kode_paket>/
├── batches/                        # 17 file JSON kecil (5–9 soal/file)
├── verify/
│   ├── verify_tiu_math_logic.py    # Pembuktian Python TIU #35–59
│   └── generate_figural.py         # Generator gambar Pillow/matplotlib #60–65
├── gambar/                         # q60_figural.png s.d. q65_figural.png
├── cross_audit/                    # Opsional: 6 berkas dari --export-blind-audit
├── <kode_paket>-bank-soal.json     # Gabungan 110 soal
├── <kode_paket>-impor-final.csv    # CSV siap impor (sudah di-shuffle)
├── <kode_paket>-impor-final.xlsx   # Excel siap impor di /admin/questions
└── audit-report.md                 # Laporan Quality Gate otomatis
```

---

## 2. Alur Eksekusi Ringkas (5 Langkah Inti)

### Langkah 1 — Siapkan Folder & Tentukan Kode Paket
Buat `data/generated/<kode_paket>/{batches,verify,gambar}`. Tidak perlu memilih profil kesulitan — tingkat kesulitan mengikuti 1-ke-1 soal contoh di `Packet 1` (`vol17`) & `Packet 2` (`vol18`).

### Langkah 2 — Kerjakan 17 Batch Kecil Secara Bertahap (Just-In-Time Context)

Untuk setiap batch sesuai `BLUEPRINT.md`:

- **Batch TWK (`TWK-1` s.d. `TWK-5`, nomor `1–30`):**
  1. Ekstrak hanya 5–9 soal contoh padanannya dari `vol17` / `vol18`.
  2. Tiru gaya, panjang, dan tingkat kesulitannya, lalu ganti kasus/cerita/tokoh menjadi baru.
  3. Untuk cek cepat pasal atau ejaan baku, cari/grep bagian yang dibutuhkan saja di `docs/question-authoring/references/` (`uud_1945_lengkap.md`, `uu_20_2023_asn_lengkap.md`, `korpus_bahasa_indonesia_kbbi6_eyd5.md`, `korpus_twk_tkp_lengkap.md`).
  4. Langsung validasi batch: `python scripts/validate_question_pack.py <file_batch> --partial`.

- **Batch TIU Verbal & Numerik (`TIU-1` s.d. `TIU-5`, nomor `31–59`):**
  1. Ekstrak soal contoh padanannya dari `vol17` / `vol18`.
  2. **Strategi Clone & Ubah Angka/Variabel:** Gunakan **pola/rumus/struktur yang sama persis** dengan contoh soal, cukup **ganti angka, nama tokoh/benda, atau pasangan kata**, sehingga tingkat kesulitannya otomatis sama!
  3. **Wajib Python Verifier (`verify/verify_tiu_math_logic.py`):** Hitung ulang seluruh jawaban eksak `#43–59` dengan `fractions.Fraction`/`decimal.Decimal`, buat 4 distraktor baru yang berbeda nilainya, dan buktikan keunikan solusi `#39–42` dengan `itertools.permutations` serta `#35–38` secara logika formal. Jalankan hingga **exit code 0**.
  4. Bungkus seluruh rumus/pecahan/pangkat/akar dalam KaTeX `$...$`. Validasi batch dengan `--partial`.

- **Batch TIU Figural (`TIU-6`, nomor `60–65`):**
  1. Tulis `verify/generate_figural.py` (Pillow/matplotlib) membuat 6 gambar (`q60_figural.png` – `q65_figural.png`: 2 Analogi, 2 Ketidaksamaan, 2 Serial) dengan pola selevel `vol17`/`vol18`, latar `#FFFFFF`, font TrueType `26–32px`, dan pemisahan zona tengah (`28%–72%`) vs sudut (`<= 16%`) agar tidak tumpang tindih.
  2. Buka & periksa secara visual keenam PNG tersebut.
  3. Isi `content` ringkas dan opsi `A–E` dengan `"Gambar A"` s.d. `"Gambar E"`. Validasi `--partial`.

- **Batch TKP (`TKP-1` s.d. `TKP-6`, nomor `66–110`):**
  1. Ekstrak soal contoh padanannya dari `vol17` / `vol18`.
  2. Tiru gaya dilema & panjang opsinya, ganti konteks kerja/tokoh menjadi baru.
  3. Pastikan 5 bobot unik `{5, 4, 3, 2, 1}`, panjang ke-5 opsi seimbang, dan pembahasan menyebut `Jawaban dengan skor tertinggi adalah Opsi X (5 poin).` + urutan `Opsi X=5, Opsi Y=4, ...`.
  4. Validasi tiap batch dengan `--partial`.

### Langkah 3 — Gabungkan, Quality Gate, Shuffle Kunci, & Ekspor `.xlsx`
Gabungkan 17 batch ke `data/generated/<kode_paket>/<kode_paket>-bank-soal.json` (urut `1..110`), lalu jalankan satu perintah ini:

```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal.json --shuffle --export-csv data/generated/<kode_paket>/<kode_paket>-impor-final.csv --export-xlsx data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx --report data/generated/<kode_paket>/audit-report.md --export-blind-audit data/generated/<kode_paket>/cross_audit/
```

Lalu verifikasi hasil `.xlsx` final:
```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx
```

**Wajib Exit Code 0 (`Hard Errors: 0`)!** Jika ada error, perbaiki sumber JSON lalu ulangi.

### Langkah 4 — Review Silang Beda Model (Opsional / Sangat Disarankan)
Bila pemilik ingin audit tambahan bebas *blind spot*, kirim berkas di `cross_audit/` ke model AI berbeda mengikuti [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md).

### Langkah 5 — Upload Figural, Spot-Check 15 Menit, & Impor Admin
1. Upload 6 gambar `gambar/q60_figural.png` – `q65_figural.png` ke bucket publik Supabase `exam-assets/figural/<kode_paket>/`, perbarui `image_url`, lalu ekspor ulang `.xlsx`.
2. Ikuti checklist 15 menit di [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md): impor `.xlsx` ke paket Draft di `/admin/questions`, cek Split-Pane Live Preview, lalu klik **Validasi & Terbitkan** di `/admin/packages`.
