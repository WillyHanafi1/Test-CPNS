# AGENT.md — SOP Eksekusi *Just-In-Time* (Konteks Minimal) untuk AI Agent

Panduan ini memastikan AI Agent menghasilkan paket SKD CPNS 110 soal yang **presisi, terverifikasi matematis, bebas bias, dan tidak mengalami *context drift*** hingga soal ke-110.

> **Aturan Anti-Banjir Konteks:**
> 1. Di awal sesi, baca **HANYA** [RULES.md](file:///d:/Project/Test-CPNS/docs/question-authoring/RULES.md) dan [BLUEPRINT.md](file:///d:/Project/Test-CPNS/docs/question-authoring/BLUEPRINT.md).
> 2. **JANGAN** membaca seluruh `references/*.md` atau seluruh file `Packet 1–15` sekaligus!
> 3. Untuk setiap batch kecil (4–9 soal), panggil `scripts/sample_anchor_questions.py` agar hanya 4–6 contoh tepat topik yang masuk ke konteks, dan buka `references/` secara *on-demand* (grep/potongan baris saja).
> 4. Seluruh pekerjaan berjalan **100% offline** di `data/generated/<kode_paket>/`. Jangan sentuh `backend/` atau `frontend/`.

---

## 1. Struktur Folder Keluaran

```text
data/generated/<kode_paket>/
├── batches/                          # 18 file JSON kecil (4–9 soal/file)
├── used_entities.txt                 # Daftar nama tokoh & instansi terpakai (anti-pengulangan)
├── verify/
│   ├── verify_tiu_math_logic.py      # Pembuktian Python TIU #35–59 (Numerik + Analitis + Silogisme)
│   └── generate_figural.py           # Generator gambar deterministik Pillow/matplotlib #60–65
├── gambar/                           # q60_figural.png–q65_figural.png + diagram pembahasan (q39_pembahasan.png, dst.)
├── cross_audit/                      # 6 berkas dari --export-blind-audit (Review Silang)
├── <kode_paket>-bank-soal.json       # Gabungan 110 soal pra-shuffle
├── <kode_paket>-bank-soal-final.json # Gabungan 110 soal pasca-shuffle
├── <kode_paket>-impor-final.csv      # CSV siap impor (sudah di-shuffle)
├── <kode_paket>-impor-final.xlsx     # Excel siap impor (sheet 'Impor') di /admin/questions
└── audit-report.md                   # Laporan Quality Gate otomatis (vs seluruh Packet 1–15)
```

---

## 2. Alur Eksekusi 5 Langkah Inti

### Langkah 1 — Siapkan Folder & Pilih Profil
Buat `data/generated/<kode_paket>/{batches,verify,gambar}` serta `used_entities.txt` kosong. Pastikan `<kode_paket>` unik (mis. `gen01`, `gen02` — jangan gunakan `vol17`/`vol18`/`vol19` yang sudah dipakai `Packet 1–3`). Pilih profil TIU: `standard` (default) atau `hots` (ala `Packet 11–13`).

### Langkah 2 — Kerjakan 18 Batch Kecil Secara Bertahap (atau Paralel per Segmen)
*Tips anti-context-drift:* Bila lingkungan mendukung subagent, bagi pekerjaan menjadi 4 pekerja terpisah (**TWK `1–30`**, **TIU Non-Figural `31–59`**, **TIU Figural `60–65`**, **TKP `66–110`**) dengan daftar nama tokoh terpisah per segmen agar kualitas TKP `#90–110` tetap setajam soal `#1`.

Untuk setiap batch sesuai [BLUEPRINT.md](file:///d:/Project/Test-CPNS/docs/question-authoring/BLUEPRINT.md):

- **Batch TWK (`TWK-1` s.d. `TWK-5`, nomor `1–30`):**
  1. Ambil contoh tepat topik: `python scripts/sample_anchor_questions.py --batch TWK-X --count 5 --seed <S>`.
  2. Tulis kasus & tokoh baru (catat tokoh ke `used_entities.txt`). Pada `TWK-5`, wajib isi 6 sub-tipe Bahasa Indonesia berbeda (`#25–30`).
  3. Verifikasi pasal/ejaan *on-demand* di `docs/question-authoring/references/`.
  4. Validasi segera: `python scripts/validate_question_pack.py data/generated/<kode_paket>/batches/twk_X.json --partial`.

- **Batch TIU Verbal & Numerik (`TIU-1` s.d. `TIU-6`, nomor `31–59`):**
  1. Ambil contoh tepat sub-jenis: `python scripts/sample_anchor_questions.py --batch TIU-X --profile <standard|hots> --count 5 --seed <S>`.
  2. Parafrase kalimat, ganti konteks/objek, ubah angka dan variasi target pertanyaan. Pastikan `TIU-1` tepat **2 Analogi Kata + 2 Analogi Kalimat** dan Deret memakai **3 pola berbeda**.
  3. **Wajib Python Verifier (`verify/verify_tiu_math_logic.py`):**
     - **Numerik (`#43–59`):** `fractions.Fraction` / `decimal.Decimal` (untuk *Kecukupan Data*, uji seluruh 4 kondisi kecukupan).
     - **Analitis (`#39–42`):** `itertools.permutations` membuktikan **tepat 1 solusi unik**.
     - **Silogisme (`#35–38`):** *truth table* proposisi (implikasi/kontraposisi) atau uji himpunan model terbatas (kuantor Semua/Sebagian) — **dilarang `assert True` kosong**.
     - Jalankan skrip hingga **exit code 0**.
  4. Format rumus dalam KaTeX `$...$` (`0{,}75`, `Rp` di luar `$...$`, tabel Markdown untuk `P vs Q`). **Pembahasan wajib bertahap (anti-wall-of-text):** mulai `Jawaban yang benar adalah **Opsi X**.`, lalu `\n\n` diikuti daftar langkah bernomor (`1.`, `2.`, ...) per baris + `$$...$$` untuk persamaan akhir. Khusus soal Analitis visual (`#39–42` seperti meja bundar/rute graf) dan Deret loncat, buat diagram ilustrasi `gambar/q39_pembahasan.png` (latar `#FFFFFF`, **judul gambar tanpa nomor `(Soal #XX)`** agar tetap cocok pasca-acak nomor) dan sisipkan di pembahasan sebagai `![Diagram pembahasan soal 39](gambar/q39_pembahasan.png)` (ganti URL Supabase pada Langkah 5). Validasi batch dengan `--partial`.

- **Batch TIU Figural (`TIU-7`, nomor `60–65`):**
  1. Ambil contoh referensi pola: `python scripts/sample_anchor_questions.py --batch TIU-7 --count 4 --seed <S>`.
  2. Tulis `verify/generate_figural.py` (Pillow/matplotlib) membuat `q60_figural.png` – `q65_figural.png` (**2 Analogi, 2 Ketidaksamaan, 1 Serial, 1 Matriks 3×3**):
     - Minimal **2 aturan transformasi simultan** per soal.
     - Wajib `assert` keunikan 5 state opsi (`A–E`) di Python sebelum merender PNG.
     - Latar `#FFFFFF`, garis `#111827`, font TrueType `24–32px`, tanpa sorotan warna kunci, zona tengah (`28%–72%`) terpisah dari sudut (`<= 16%`).
  3. **Buka dan periksa visual** seluruh 6 PNG hasil render; perbaiki bila ada garis/simbol bertabrakan atau terlalu tipis.
  4. Tulis JSON batch (opsi `"Gambar A"` s.d. `"Gambar E"`) dan validasi dengan `--partial`.

- **Batch TKP (`TKP-1` s.d. `TKP-6`, nomor `66–110`):**
  1. Ambil contoh tepat aspek: `python scripts/sample_anchor_questions.py --batch TKP-X --count 5 --seed <S>`.
  2. Buat dilema realistis baru (catat instansi & tokoh di `used_entities.txt`), pastikan panjang 5 opsi seimbang (`selisih <= 5 kata`), kontras `5 vs 4` tegas, dan skor `1` tetap terdengar wajar/rasional.
  3. Pembahasan mulai `Jawaban dengan skor tertinggi adalah **Opsi X** (5 poin).` lalu `\n\n` diikuti daftar bullet 5 baris terurut `5 → 1`: `- **Opsi X (5 poin):** ...` sampai `- **Opsi V (1 poin):** ...` (dilarang menggabungkan dalam 1 paragraf padat!).
  4. Validasi tiap batch dengan `--partial` (pastikan **0 Hard Errors** dan **0 warning `tkp_length_bias` / `discussion_key_unexplicit` / `discussion_wall_of_text`**).

### Langkah 3 — Gabungkan, Quality Gate (vs 15 Paket), Shuffle 500× + Acak TKP, & Ekspor `.xlsx`
Gabungkan seluruh 18 batch ke `data/generated/<kode_paket>/<kode_paket>-bank-soal.json` (urut `1..110`), lalu jalankan satu perintah ini:

```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal.json --shuffle --group-by-blocks --seed 42 --export-json data/generated/<kode_paket>/<kode_paket>-bank-soal-final.json --export-csv data/generated/<kode_paket>/<kode_paket>-impor-final.csv --export-xlsx data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx --report data/generated/<kode_paket>/audit-report.md --export-blind-audit data/generated/<kode_paket>/cross_audit/
```

Lalu verifikasi hasil `.xlsx` final:
```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx
```

**Wajib Exit Code 0 (`Hard Errors: 0`)!** Jika ada error atau warning bias/pembahasan, perbaiki batch sumber lalu ulangi Langkah 3.

### Langkah 4 — Review Silang Beda Model (Sangat Disarankan)
Kirim 6 berkas di `cross_audit/` ke model AI berbeda mengikuti [CROSS_MODEL_REVIEW.md](file:///d:/Project/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md).

### Langkah 5 — Upload Figural & Diagram Pembahasan, Spot-Check 15 Menit, & Impor Admin
1. Upload seluruh gambar soal (`gambar/q6*_figural.png`) dan diagram pembahasan (`gambar/q*_pembahasan*.png`) ke bucket publik Supabase `exam-assets` (`figural/<kode_paket>/` & `pembahasan/<kode_paket>/` via `scripts/ops/upload_figural_from_ops_env.py`), perbarui `image_url` serta tautan Markdown `![...](...)` di `discussion`, lalu ekspor ulang `.xlsx`.
2. Ikuti checklist 15 menit di [HUMAN_SPOT_CHECK_SOP.md](file:///d:/Project/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md): impor `.xlsx` ke paket Draft di `/admin/questions`, cek Split-Pane Live Preview, lalu klik **Validasi & Terbitkan** di `/admin/packages`.
