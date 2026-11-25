# RULES.md — Aturan Mutlak & Standar Kualitas Bank Soal TOCPNS

Aturan ini dirancang **presisi, terukur, dan bebas jargon** agar setiap paket 110 soal yang dihasilkan langsung lolos Quality Gate otomatis, bebas kesalahan faktual/matematis, rapi saat dirender di web/mobile, dan terasa seperti soal SKD BKN asli.

---

## 1. Tiga Prinsip Inti Produksi Soal

1. **Korpus 15 Paket (`Packet 1–15`) = Satu-Satunya Patokan Kesulitan:**
   - **TIDAK PERLU** label kesulitan buatan (`mudah/sedang/sulit` atau Bloom `C3–C5`).
   - Setiap mengerjakan 1 batch kecil (4–9 soal), panggil `python scripts/sample_anchor_questions.py --batch <ID> --seed <S>` untuk mengambil **4–6 contoh campuran Sumber A (`Packet 1–3`) dan Sumber B (`Packet 4–15`)** yang 100% tepat topik & sub-jenisnya. Samakan panjang, nuansa, dan kompleksitasnya!
2. **Strategi Variasi Orisinal per Segmen (Anti-Plagiat, Anti-Overlap Lintas Paket, & Anti-Monoton):**
   - **Anti-Overlap Lintas Paket Generated:** Selain wajib berbeda dari `Packet 1–15`, setiap paket baru (`gen04`, dst.) juga **dilarang** mengulang pasal UUD/UU yang sama persis, kata baku yang sama, skenario TKP yang sama, atau mekanisme figural yang sama dari paket `data/generated/*` sebelumnya. Validator otomatis membandingkan terhadap seluruh `Packet 1–15` **dan** seluruh `data/generated/*/*-bank-soal-final.json`.
   - **TIU Numerik, Deret, Perbandingan Kuantitatif, Soal Cerita, Silogisme, Analitis (`#35–59`):**
     - Pertahankan **konsep matematis/logika dan kompleksitas** soal contoh, tetapi **WAJIB parafrase struktur kalimat, ganti konteks/objek, ganti seluruh angka**, dan variasikan target pertanyaan (mis. dari *total pekerja* menjadi *tambahan pekerja*, atau deret mundur mencari suku awal `..., a, b`).
     - Hitung ulang jawaban eksak + 4 pengecoh baru via skrip Python (`Fraction`/`Decimal`/`permutations`/truth table).
   - **TIU Analogi (`#31–34`) & Figural (`#60–65`):**
     - Analogi wajib tepat **2 Analogi Kata + 2 Analogi Kalimat**.
     - Figural dibuat deterministik dengan **Python (`Pillow`/`matplotlib`)** dalam **format gambar terpisah ramah mobile** (`soal.png` + `opsi-a..e.png` + `pembahasan.png` = 42 PNG per 6 soal), mencakup **Matriks 3×3**, memakai minimal **4 mekanisme penalaran berbeda per paket**, dan minimal **2 kriteria objektif per soal**. Buktikan dengan `assert` bahwa 5 state opsi **dan 5 SHA-256 hash PNG opsi** seluruhnya unik serta kuncinya tunggal dan tersebar merata lintas `A–E`. Ikuti Prompt 3 di [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md).
   - **TWK (`#1–30`) & TKP (`#66–110`):**
     - Buat kasus/dilema, instansi, dan tokoh yang **sepenuhnya baru** dengan tingkat kesulitan setara contoh.
     - **Buku Catatan Tokoh & Skenario (Anti-Pengulangan):** Catat nama tokoh dan jenis instansi yang sudah dipakai di paket berjalan (`used_entities.txt`); **dilarang** memakai nama tokoh yang sama (mis. Andi/Budi/Rina) lebih dari 1 kali dalam 1 paket 110 soal!
3. **Korpus Hukum & Bahasa = Kamus *On-Demand* (JANGAN Muat Sekaligus!):**
   - **JANGAN** membaca seluruh isi `docs/question-authoring/references/*.md` di awal sesi.
   - Cari/baca bagian relevan (`grep`/rentang baris) **hanya saat memverifikasi** nomor pasal UUD 1945, UU ASN 20/2023, UU Bela Negara 23/2019, atau kata baku KBBI VI/EYD V pada soal terkait.

---

## 2. Kontrak Schema & Standar `sub_category` Kanonik

### A. Format JSON Batch / Paket (`<kode_paket>-bank-soal.json`)
```json
{
  "schema_version": "2.0",
  "package": {
    "code": "gen04",
    "title": "Tryout SKD CPNS 2026 #4",
    "category": "Mix"
  },
  "questions": [
    {
      "id": "tocpns-gen04-001",
      "number": 1,
      "segment": "TWK",
      "sub_category": "Nasionalisme",
      "content": "Teks soal lengkap (rumus pakai KaTeX $...$)...",
      "image_url": null,
      "options": [
        { "label": "A", "content": "Isi opsi A", "score": 0, "image_url": null },
        { "label": "B", "content": "Isi opsi B", "score": 0, "image_url": null },
        { "label": "C", "content": "Isi opsi C", "score": 5, "image_url": null },
        { "label": "D", "content": "Isi opsi D", "score": 0, "image_url": null },
        { "label": "E", "content": "Isi opsi E", "score": 0, "image_url": null }
      ],
      "discussion": "Jawaban yang benar adalah **Opsi C**.\n\n<Alasan kunci dengan rujukan fakta/pasal>.\n\n- **Opsi A:** <Alasan singkat penolakan pengecoh terkuat>."
    }
  ]
}
```
*Catatan Figural:* Pada soal Figural, `content` berisi instruksi singkat soal, `image_url` menunjuk ke `soal.png`, dan setiap objek di `options` memakai `"content": ""` (kosong) serta `"image_url": "<URL publik opsi-a..e.png>"`.

### B. Daftar `sub_category` Granular Kanonik (Wajib — Tampil Live di Badge UI Ujian & Pembahasan!)

Setiap soal **WAJIB** menggunakan label granular persis ejaannya di bawah ini (dilarang kosong dan dilarang memakai label umum `"Verbal"` / `"Numerik"` pada paket baru — memicu warning `generic_tiu_sub_category`), karena UI Ujian & Pembahasan TOCPNS menampilkan badge `sub_category` langsung di sebelah badge `TWK`/`TIU`/`TKP`, dan dipakai langsung oleh `analytics_service.py` serta `--group-by-blocks`:

| Segmen | `sub_category` Granular Kanonik (Wajib Persis Ejaannya) | Rumpun / Pemetaan |
| :--- | :--- | :--- |
| **TWK** | `Nasionalisme`, `Integritas`, `Bela Negara`, `Pilar Negara`, `Bahasa Indonesia` | 5 blok utuh (urutan blok berganti antar-paket) |
| **TIU (Standar)** | `Analogi`, `Silogisme`, `Analitis`, `Berhitung`, `Deret Angka`, `Perbandingan Kuantitatif`, `Soal Cerita`, `Figural` | Rumpun `Verbal` (`Analogi`, `Silogisme`, `Analitis`) → Rumpun `Numerik` (`Berhitung`, `Deret Angka`, `Perbandingan Kuantitatif`, `Soal Cerita`) → Rumpun `Figural` (`Figural`) |
| **TIU (HOTS)** | Tambahan khusus Profil B: `Kecukupan Data`, `Kesetaraan Operasi`, `Pola Bilangan` | Semua terpetakan ke rumpun `Numerik` |
| **TKP** | `Pelayanan Publik`, `Jejaring Kerja`, `Sosial Budaya`, `Teknologi Informasi dan Komunikasi`, `Profesionalisme`, `Anti Radikalisme` | 6 blok utuh (urutan blok berganti antar-paket) |

### C. Format Excel / CSV Siap Import (`/admin/questions`)
Sheet bernama **`Impor`** dengan kolom wajib sesuai [admin_import.py](file:///d:/ProjectAI/Test-CPNS/backend/api/v1/endpoints/admin_import.py):
`number,segment,content,image_url,discussion,sub_category,option_a,score_a,option_b,score_b,option_c,score_c,option_d,score_d,option_e,score_e` (plus `option_image_a`..`option_image_e` otomatis saat ada opsi bergambar Figural).

---

## 3. Standar Pembahasan, KaTeX, & Hard Gate Teknis

Seluruh aturan berikut diverifikasi otomatis oleh [validate_question_pack.py](file:///d:/ProjectAI/Test-CPNS/scripts/validate_question_pack.py):

1. **Kuota Eksak 110 Soal & Kebersihan Opsi:**
   - Nomor kontinu `1..110` (`TWK = 30`, `TIU = 35`, `TKP = 45`). Setiap soal wajib memiliki `content`, `discussion`, `sub_category` granular kanonik, dan 5 opsi unik `A–E` (tidak boleh ada 2 opsi identik).
   - Pastikan tidak ada tanda hubung `-` menggantung di akhir opsi (memicu warning `trailing_hyphen_option`).
2. **Integritas Bobot Skor:**
   - **TWK & TIU:** Tepat `[0, 0, 0, 0, 5]`.
   - **TKP:** Tepat 5 bobot unik `[1, 2, 3, 4, 5]`.
3. **KaTeX & Markdown (`GEMINI.md` § 5A — Kompatibel `remark-math` v6):**
   - Semua pecahan, pangkat, akar, variabel, sudut derajat, dan operasi matematika wajib di dalam inline `$...$` atau block math multi-baris `$$\n...\n$$` (mis. `$\frac{3}{4}$`, `$x^2$`, `$\sqrt{144}$`, `$90^\circ$`).
   - **WAJIB Block Math Multi-Baris:** Di frontend `remark-math` v6, `$$a + b = c$$` dalam **1 baris** akan dirender sebagai *inline math* biasa (bukan `.katex-display`) dan memicu warning `single_line_display_math`! Selalu tulis `$$` pembuka dan `$$` penutup pada **baris terpisah** (sejajar indentasi bila berada di dalam daftar bernomor):
     ```markdown
     1. Substitusikan nilai yang diketahui:

        $$
        x = \frac{120}{4} = 30
        $$
     ```
   - Desimal di dalam KaTeX ditulis `0{,}75` agar KaTeX tidak menyisipkan spasi setelah koma.
   - **Rupiah (`Rp50.000`, `Rp1.250.000,00`) wajib ditulis di luar `$...$`** (menaruh `Rp` di dalam `$...$` memicu warning `latex_rupiah`).
   - Soal *Perbandingan Kuantitatif* (`P` vs `Q`) dan *Interpretasi Data* dianjurkan memakai **tabel Markdown rapi** (`| P | Q |`).
   - Wajib verifikasi akhir memakai parser frontend (`remark-math` + `rehype-katex`) dengan target **0 `.katex-error`** dan **0 tanda `$` mentah**.
4. **Standar Pembahasan Ramah Belajar (Anti-Wall-of-Text, Anti-Boilerplate, & Sinkron Shuffler):**
   - Gunakan istilah materi yang umum. Tulis langkah penyelesaian secara langsung dan periksa teks serta gambar agar atribusi internal, jargon merek, dan watermark tidak masuk ke materi peserta.
   - **Dilarang menulis pembahasan sebagai 1 paragraf padat tanpa jeda baris!** Gunakan Markdown standar dengan paragraf (`\n\n`), daftar bernomor (`1.`, `2.`, ...), bullet (`- ...`), penebalan (`**...**`), dan *block math* multi-baris (`$$\n...\n$$`).
   - **TWK (`~60–110 kata`):**
     - Paragraf 1: Mulai tepat dengan `Jawaban yang benar adalah **Opsi X**.` diikuti alasan kunci (rujukan pasal/konsep/kaidah EYD V/KBBI VI).
     - Paragraf 2 (`\n\n`): Jelaskan penolakan pengecoh terkuat (bisa 1 paragraf ringkas atau bullet `- **Opsi Y:** ...`).
   - **TIU Numerik, Analitis, & Silogisme (`~60–120 kata`, wajib bertahap per baris):**
     - Baris 1: `Jawaban yang benar adalah **Opsi X**.`
     - Pisahkan dengan `\n\n`, lalu uraikan langkah hitung/logika dalam **daftar bernomor `1.`, `2.`, `3.`, ...** (1 langkah = 1 baris). Untuk persamaan akhir atau langkah panjang, gunakan *block math* multi-baris `$$\n...\n$$`.
     - **Ilustrasi Diagram Pembahasan (Disarankan kuat untuk Analitis visual seperti meja bundar/rute graf, Deret loncat/mundur, dan Figural):** Buat PNG latar putih (`#FFFFFF`) via Python dengan **NAMA BERKAS & JUDUL GAMBAR BEBAS NOMOR SOAL** (contoh: `diagram_meja_bundar.png`, `diagram_graf_rute.png`, `diagram_deret_2larik.png`, `diagram_deret_mundur.png` — **DILARANG** `q39_pembahasan.png` atau judul `(Soal #39)` agar tidak pernah bentrok saat `--group-by-blocks` mengubah nomor soal! Nama `qXX_pembahasan` memicu warning `diagram_filename_has_number`). Unggah ke bucket publik Supabase `exam-assets/pembahasan/<kode_paket>/`, lalu sisipkan di `discussion` sebagai `![Diagram ilustrasi meja bundar](https://.../exam-assets/pembahasan/<kode_paket>/diagram_meja_bundar.png)`.
   - **TKP (`~80–130 kata`, wajib daftar bullet per opsi `5 → 1`, ANTI-BOILERPLATE):**
     - Baris 1: `Jawaban dengan skor tertinggi adalah **Opsi X** (5 poin).`
     - Pisahkan dengan `\n\n`, lalu tulis rincian kelima opsi terurut `5 → 1` dalam bullet per baris:
       ```markdown
       - **Opsi X (5 poin):** <alasan substantif spesifik kasus>.
       - **Opsi Y (4 poin):** <alasan substantif spesifik kasus>.
       - **Opsi Z (3 poin):** <alasan substantif spesifik kasus>.
       - **Opsi W (2 poin):** <alasan substantif spesifik kasus>.
       - **Opsi V (1 poin):** <alasan substantif spesifik kasus>.
       ```
     - **Larangan Frasa Template Robotik:** Dilarang menulis *"Usulnya adalah..."*, *"Tindakan ini memberi respons terbatas"*, *"mendapat bobot paling rendah dalam rubrik"*, atau *"menjadi perhatian yang belum terjawab"* (memicu warning `tkp_boilerplate_discussion`). Setiap poin wajib menjelaskan konsekuensi konkret tindakan pada skenario soal!
     - Validator mengecek kecocokan **seluruh 5 pasang huruf & bobot** serta memberi warning `discussion_wall_of_text` bila pembahasan TIU/TKP tidak memiliki jeda baris (`\n`). Shuffler mendukung penuh remap format bold `**Opsi X (5 poin):**` maupun `Opsi X=5`.
   - **Bebas Artefak AI:** Dilarang menulis *"Sebagai AI..."*, *"Berikut adalah pembahasannya:"*, atau placeholder `[...]`. Nama tokoh di soal dan pembahasan wajib identik.
5. **Verifikasi Deterministik TIU & Inspeksi Visual Wajib:**
   - **TIU `#35–59`:** Wajib dibuktikan via `verify/verify_tiu_math_logic.py` (`Fraction`/`Decimal` untuk numerik, `itertools.permutations` untuk analitis, **tabel kebenaran / uji model himpunan nyata** untuk silogisme — dilarang `assert True` kosong!).
   - **TIU Figural (`#60–65`):** Gambar dibuat deterministik via `verify/generate_figural.py` dalam format **gambar terpisah ramah mobile** (`gambar/figural/q06X/{soal,opsi-a..e,pembahasan}.png` — latar putih `#FFFFFF`, garis hitam tajam `#111827`, tanpa bocoran warna kunci, `option.content = ""`, `option.image_url = <HTTPS>`, wajib `assert` 5 state unik + 5 SHA-256 PNG unik, dan sebar kunci lintas `A–E`).
   - **Inspeksi Visual Wajib:** Seluruh PNG Figural **dan** seluruh PNG diagram pembahasan TIU wajib dibuka dan diperiksa visualnya (0 teks bertumpuk, 0 terpotong tepi, terbaca di layar ponsel).
6. **Anti-Plagiarisme Lintas Seluruh `Packet 1–15` DAN Paket Generated (`data/generated/*`):**
   - Validator otomatis membandingkan setiap soal terhadap **seluruh 1.650 soal di `Packet 1–15` ditambah seluruh paket `data/generated/*/*-bank-soal-final.json` sebelumnya**.
   - **TWK & TKP:** Kemiripan `< 50%` terhadap referensi dan `< 55%` internal.
   - **TIU:** Kemiripan `< 85%`, serta **dilarang menyalin urutan angka yang sama** (termasuk deret angka).
7. **Anti-Bias Panjang, Anti-Bias Sintaksis Koma TKP, Acak Kunci 500×, & Pengelompokan Blok (`--group-by-blocks`):**
   - Opsi kunci (skor 5) tidak boleh jadi opsi terpanjang (secara kata maupun karakter) pada `> 35%` soal; pada TKP, selisih panjang opsi skor 5 terhadap rata-rata 4 opsi lain harus `<= 5 kata` (warning di `> 7 kata`).
   - **Anti-Bias Koma / Pola 3-Aksi Paralel TKP:** Jangan hanya memakai struktur daftar berkoma (`"melakukan A, B, serta C"`) pada opsi skor 5 sementara skor 1–3 berupa 1 klausa tanpa koma! Variasikan struktur 1 klausa (0 koma) dan 2–3 klausa berkoma secara merata di seluruh bobot `5–4–3–2–1` (validator otomatis memicu `tkp_comma_bias` bila heuristik buta "koma terbanyak" `>= 166/225` atau rasio koma terbanyak di skor 5 `> 35%`).
   - Jalankan `--shuffle --group-by-blocks --seed <SEED_UNIK_PAKET>` sebelum ekspor `.xlsx` agar:
     1. Distribusi kunci `A–E` seimbang di setiap segmen (`spread <= 1`, bebas siklus, `max_streak <= 2`).
     2. **TWK (`#1–30`)** berkelompok utuh sesuai 5 blok sub-materi, dengan urutan antar-blok berganti antar-paket.
     3. **TIU (`#31–65`)** berkelompok sesuai rumpun (`Verbal → Numerik → Figural`), dengan setiap sub-materi granular (mis. seluruh *Deret Angka*, seluruh *Berhitung*, seluruh *Analogi*) terkumpul utuh dalam 1 blok dan urutan antar sub-blok berganti antar-paket.
     4. **TKP (`#66–110`)** berkelompok utuh sesuai 6 blok aspek, dengan urutan antar-blok berganti antar-paket.
     5. Gunakan `--seed` berbeda antar-paket agar arketipe khas (seperti *Meja Bundar*, *Informasi tidak cukup*, *Matriks 3×3*) tidak jatuh pada nomor yang sama persis di paket berturut-turut.

---

## 4. Batas Proyek (`GEMINI.md`)
- Seluruh proses produksi konten berjalan **100% offline** di `data/generated/<kode_paket>/`. **Jangan** mengubah kode `backend/` atau `frontend/` dan **jangan** menambah fitur AI ke aplikasi produksi.
