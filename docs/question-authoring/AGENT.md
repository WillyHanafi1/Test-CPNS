# AGENT.md — SOP Eksekusi *Just-In-Time* (Konteks Minimal) untuk AI Agent

Panduan ini memastikan AI Agent menghasilkan paket SKD CPNS 110 soal yang **presisi, terverifikasi matematis, rapi di desktop & ponsel, bebas bias, dan tidak mengalami *context drift*** hingga soal ke-110.

> **Aturan Anti-Banjir Konteks:**
> 1. Di awal sesi, baca **HANYA** [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) dan [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md).
> 2. **JANGAN** membaca seluruh `references/*.md` atau seluruh file `Packet 1–15` sekaligus!
> 3. Untuk setiap batch kecil (4–9 soal), panggil `scripts/sample_anchor_questions.py` agar hanya 4–6 contoh tepat topik yang masuk ke konteks, dan buka `references/` secara *on-demand* (grep/potongan baris saja).
> 4. Cek ringkas (grep, bukan baca penuh) topik/pasal/kata baku di `data/generated/*/*-bank-soal-final.json` agar paket baru bebas pengulangan dari paket generated sebelumnya.
> 5. Seluruh pekerjaan berjalan **100% offline** di `data/generated/<kode_paket>/`. Jangan sentuh `backend/` atau `frontend/`.

---

## 1. Struktur Folder Keluaran

```text
data/generated/<kode_paket>/
├── batches/                          # 18 file JSON kecil (4–9 soal/file)
├── used_entities.txt                 # Daftar nama tokoh & instansi terpakai (anti-pengulangan)
├── verify/
│   ├── verify_tiu_math_logic.py      # Pembuktian Python TIU #35–59 (Numerik + Analitis + Silogisme)
│   └── generate_figural.py           # Generator 42 PNG Figural terpisah (Pillow/matplotlib) #60–65
├── gambar/
│   ├── diagram_meja_bundar.png       # Diagram pembahasan TIU bebas nomor soal (judul tanpa Soal #XX)
│   ├── diagram_graf_rute.png         # Diagram pembahasan TIU bebas nomor soal
│   ├── diagram_deret_2larik.png      # Diagram pembahasan TIU bebas nomor soal
│   ├── diagram_deret_mundur.png      # Diagram pembahasan TIU bebas nomor soal
│   └── figural/
│       └── q060/..q065/              # Masing-masing: soal.png, opsi-a..e.png, pembahasan.png (42 PNG)
├── cross_audit/                      # 6 berkas dari --export-blind-audit (Review Silang)
├── <kode_paket>-bank-soal.json       # Gabungan 110 soal pra-shuffle
├── <kode_paket>-bank-soal-final.json # Gabungan 110 soal pasca-shuffle & --group-by-blocks
├── <kode_paket>-impor-final.csv      # CSV siap impor (sudah di-shuffle & dikelompokkan per blok)
├── <kode_paket>-impor-final.xlsx     # Excel siap impor (sheet 'Impor') di /admin/questions
└── audit-report.md                   # Laporan Quality Gate otomatis (vs Packet 1–15 + generated/*)
```

---

## 2. Alur Eksekusi 5 Langkah Inti

### Langkah 1 — Siapkan Folder, Pilih Profil, & Tetapkan Seed Unik
Buat `data/generated/<kode_paket>/{batches,verify,gambar/figural}` serta `used_entities.txt` kosong. Pastikan `<kode_paket>` unik (mis. `gen04` — jangan gunakan `vol17`/`vol18`/`vol19` yang sudah dipakai `Packet 1–3`). Pilih profil TIU: `standard` (default) atau `hots` (ala `Packet 11–13`), dan tetapkan `--seed` yang **berbeda dari paket sebelumnya** untuk `--group-by-blocks --shuffle`.

### Langkah 2 — Kerjakan 18 Batch Kecil Secara Bertahap (atau Paralel per Segmen)
*Tips anti-context-drift:* Bila lingkungan mendukung subagent, bagi pekerjaan menjadi 4 pekerja terpisah (**TWK `1–30`**, **TIU Non-Figural `31–59`**, **TIU Figural `60–65`**, **TKP `66–110`**) dengan daftar nama tokoh terpisah per segmen agar kualitas TKP `#90–110` tetap setajam soal `#1`.

Untuk setiap batch sesuai [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md):

- **Batch TWK (`TWK-1` s.d. `TWK-5`, nomor awal `1–30`):**
  1. Ambil contoh tepat topik: `python scripts/sample_anchor_questions.py --batch TWK-X --count 5 --seed <S>`.
  2. Tulis kasus & tokoh baru (catat tokoh ke `used_entities.txt`), pastikan `sub_category` kanonik terisi dan tidak mengulang pasal/kata baku dari paket `data/generated/*` sebelumnya. Pada `TWK-5`, wajib isi 6 sub-tipe Bahasa Indonesia berbeda.
  3. Verifikasi pasal/ejaan *on-demand* di `docs/question-authoring/references/`.
  4. Validasi segera: `python scripts/validate_question_pack.py data/generated/<kode_paket>/batches/twk_X.json --partial`.

- **Batch TIU Verbal & Numerik (`TIU-1` s.d. `TIU-6`, nomor awal `31–59`):**
  1. Ambil contoh tepat sub-jenis: `python scripts/sample_anchor_questions.py --batch TIU-X --profile <standard|hots> --count 5 --seed <S>`.
  2. Parafrase kalimat, ganti konteks/objek, ubah angka dan variasi target pertanyaan. Wajib isi `sub_category` **granular** (`Analogi`, `Silogisme`, `Analitis`, `Berhitung`, `Deret Angka`, `Perbandingan Kuantitatif`, `Soal Cerita`, atau HOTS `Kecukupan Data`/`Kesetaraan Operasi`/`Pola Bilangan` — DILARANG `"Verbal"`/`"Numerik"`). Pastikan `TIU-1` tepat **2 Analogi Kata + 2 Analogi Kalimat** dan Deret memakai **3 pola berbeda**.
  3. **Wajib Python Verifier (`verify/verify_tiu_math_logic.py`):**
     - **Numerik (`#43–59`):** `fractions.Fraction` / `decimal.Decimal` (untuk *Kecukupan Data*, uji seluruh 4 kondisi kecukupan).
     - **Analitis (`#39–42`):** `itertools.permutations` membuktikan **tepat 1 solusi unik**.
     - **Silogisme (`#35–38`):** *truth table* proposisi (implikasi/kontraposisi) atau uji himpunan model terbatas (kuantor Semua/Sebagian) — **dilarang `assert True` kosong**.
     - Jalankan skrip hingga **exit code 0**.
  4. **KaTeX & Pembahasan Ramah Belajar (`remark-math` v6):**
     - Inline math `$...$` (`0{,}75`, `Rp` di luar `$...$`, tabel Markdown untuk `P vs Q`).
     - Block math **WAJIB multi-baris** (`$$` buka & tutup pada baris terpisah, sejajar indentasi bila di dalam daftar bernomor — DILARANG `$$...$$` 1 baris!).
     - Mulai `Jawaban yang benar adalah **Opsi X**.`, lalu `\n\n` diikuti daftar langkah bernomor (`1.`, `2.`, ...) per baris.
     - Khusus soal Analitis visual (meja bundar, rute graf) & Deret loncat/mundur, buat diagram ilustrasi berlatar `#FFFFFF` dengan **nama berkas & judul bebas nomor soal** (`gambar/diagram_meja_bundar.png`, `gambar/diagram_graf_rute.png`, `gambar/diagram_deret_2larik.png`, `gambar/diagram_deret_mundur.png` — DILARANG `q39_pembahasan.png` atau judul `(Soal #39)`!) dan sisipkan di pembahasan. **Buka & periksa visual seluruh diagram PNG** agar tidak ada teks bertumpuk.
  5. Validasi batch dengan `--partial`.

- **Batch TIU Figural (`TIU-7`, nomor awal `60–65`):**
  1. Ambil contoh referensi pola: `python scripts/sample_anchor_questions.py --batch TIU-7 --count 4 --seed <S>`.
  2. Tulis `verify/generate_figural.py` (Pillow/matplotlib) membuat **42 PNG terpisah ramah mobile** di `gambar/figural/q060/` s.d. `q065/` (`soal.png`, `opsi-a.png`..`opsi-e.png`, `pembahasan.png` per soal — **2 Analogi, 2 Ketidaksamaan, 1 Serial, 1 Matriks 3×3**):
     - Minimal **4 mekanisme penalaran berbeda** per paket & minimal **2 kriteria objektif** per soal.
     - Wajib `assert` keunikan **5 state opsi** (`A–E`) **DAN 5 SHA-256 hash PNG opsi** sebelum selesai.
     - Sebar huruf kunci 6 soal lintas huruf `A–E` (jangan menumpuk di A/B saja).
     - Latar `#FFFFFF`, garis hitam tajam `#111827`, tanpa bocoran warna kunci pada `soal.png`/`opsi-*.png`, dan judul `pembahasan.png` bebas nomor `(Soal #XX)`.
  3. **Buka dan periksa visual** seluruh PNG hasil render (soal, 5 opsi, dan pembahasan) pada ukuran layar ponsel; perbaiki bila ada garis/simbol bertabrakan, terpotong, atau terlalu tipis.
  4. Tulis JSON batch (`sub_category: "Figural"`, `image_url` ke `soal.png`, setiap opsi `"content": ""` dan `"image_url"` ke `opsi-a..e.png`, pembahasan memuat `pembahasan.png`) dan validasi dengan `--partial`.

- **Batch TKP (`TKP-1` s.d. `TKP-6`, nomor awal `66–110`):**
  1. Ambil contoh tepat aspek: `python scripts/sample_anchor_questions.py --batch TKP-X --count 5 --seed <S>`.
  2. Buat dilema realistis baru (catat instansi & tokoh di `used_entities.txt`), pastikan panjang 5 opsi seimbang secara kata maupun karakter (`selisih <= 5 kata`), variasikan kalimat 0-koma dan berkoma di semua bobot `5–1` (anti `tkp_comma_bias`), kontras `5 vs 4` tegas, dan skor `1` tetap terdengar wajar/rasional.
  3. Pembahasan mulai `Jawaban dengan skor tertinggi adalah **Opsi X** (5 poin).` lalu `\n\n` diikuti daftar bullet 5 baris terurut `5 → 1`: `- **Opsi X (5 poin):** ...` sampai `- **Opsi V (1 poin):** ...` dengan alasan **substantif spesifik konteks** (DILARANG frasa template robotik seperti *"Usulnya adalah..."* atau *"Tindakan ini memberi respons terbatas"*).
  4. Validasi tiap batch dengan `--partial` (pastikan **0 Hard Errors** dan **0 warning** termasuk `tkp_length_bias`, `tkp_comma_bias`, `tkp_boilerplate_discussion`, `trailing_hyphen_option`, `discussion_wall_of_text`).

### Langkah 3 — Gabungkan, Quality Gate (vs `Packet 1–15` + `generated/*`), `--shuffle --group-by-blocks`, & Uji KaTeX Frontend
Gabungkan seluruh 18 batch ke `data/generated/<kode_paket>/<kode_paket>-bank-soal.json` (urut `1..110`), lalu jalankan satu perintah ini dengan `--seed` unik untuk paket tersebut:

```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal.json --shuffle --group-by-blocks --seed <SEED_UNIK> --export-json data/generated/<kode_paket>/<kode_paket>-bank-soal-final.json --export-csv data/generated/<kode_paket>/<kode_paket>-impor-final.csv --export-xlsx data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx --report data/generated/<kode_paket>/audit-report.md --export-blind-audit data/generated/<kode_paket>/cross_audit/
```

Lalu verifikasi hasil `.xlsx` final **dan** uji render KaTeX memakai parser frontend (`remark-math` + `rehype-katex`):
```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-impor-final.xlsx
```

**Wajib Exit Code 0 (`Hard Errors: 0` & `Warnings: 0` pasca upload gambar) serta `0 .katex-error` / `0 raw $` pada parser frontend!** Jika ada error atau warning, perbaiki batch sumber lalu ulangi Langkah 3.

### Langkah 4 — Review Silang Beda Model (Sangat Disarankan)
Kirim 6 berkas di `cross_audit/` ke model AI berbeda mengikuti [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md).

### Langkah 5 — Upload Figural Terpisah & Diagram Pembahasan, Spot-Check 15 Menit, & Impor Admin
1. Upload seluruh 42 gambar Figural (`gambar/figural/q06*/{soal,opsi-a..e,pembahasan}.png`) ke bucket publik Supabase `exam-assets/figural/<kode_paket>/q06*/` dan seluruh diagram pembahasan TIU (`gambar/diagram_*.png`) ke `exam-assets/pembahasan/<kode_paket>/` (via `scripts/ops/upload_figural_from_ops_env.py`), perbarui `image_url`, `option.image_url`, serta tautan Markdown `![...](...)` di `discussion`, lalu ekspor ulang `.xlsx` dan verifikasi ulang **0 Warnings** (`0 local_image_url`, `0 local_discussion_image_url`).
2. Ikuti checklist 15 menit di [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md): impor `.xlsx` ke paket Draft di `/admin/questions`, cek Split-Pane Live Preview (termasuk badge `sub_category`, `.katex-display`, dan tampilan mobile), lalu klik **Validasi & Terbitkan** di `/admin/packages`.
