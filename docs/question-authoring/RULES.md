# RULES.md — Aturan Mutlak & Standar Kualitas Bank Soal TOCPNS

Aturan ini dirancang **presisi, terukur, dan bebas jargon** agar setiap paket 110 soal yang dihasilkan langsung lolos Quality Gate otomatis, bebas kesalahan faktual/matematis, dan terasa seperti soal SKD BKN asli.

---

## 1. Tiga Prinsip Inti Produksi Soal

1. **Korpus 15 Paket (`Packet 1–15`) = Satu-Satunya Patokan Kesulitan:**
   - **TIDAK PERLU** label kesulitan buatan (`mudah/sedang/sulit` atau Bloom `C3–C5`).
   - Setiap mengerjakan 1 batch kecil (4–9 soal), panggil `python scripts/sample_anchor_questions.py --batch <ID> --seed <S>` untuk mengambil **4–6 contoh campuran Sumber A (`Packet 1–3`) dan Sumber B (`Packet 4–15`)** yang 100% tepat topik & sub-jenisnya. Samakan panjang, nuansa, dan kompleksitasnya!
2. **Strategi Variasi Orisinal per Segmen (Anti-Plagiat & Anti-Monoton):**
   - **TIU Numerik, Deret, Perbandingan Kuantitatif, Soal Cerita, Silogisme, Analitis (`#35–59`):**
     - Pertahankan **konsep matematis/logika dan kompleksitas** soal contoh, tetapi **WAJIB parafrase struktur kalimat, ganti konteks/objek, ganti seluruh angka**, dan bila cocok tambahkan *twist* target pertanyaan (mis. dari *total pekerja* menjadi *tambahan pekerja*, atau deret mundur mencari suku awal `..., a, b`).
     - Hitung ulang jawaban eksak + 4 pengecoh baru via skrip Python (`Fraction`/`Decimal`/`permutations`/truth table).
   - **TIU Analogi (`#31–34`) & Figural (`#60–65`):**
     - Analogi wajib tepat **2 Analogi Kata + 2 Analogi Kalimat**.
     - Figural wajib **programatik Python (`Pillow`/`matplotlib`)**, minimal **2 transformasi simultan** (mis. rotasi + inversi warna), menyertakan **Matriks 3×3**, dan wajib `assert` keunikan 5 state opsi `A–E`.
   - **TWK (`#1–30`) & TKP (`#66–110`):**
     - Buat kasus/dilema, instansi, dan tokoh yang **sepenuhnya baru** dengan tingkat kesulitan setara contoh.
     - **Buku Catatan Tokoh & Skenario (Anti-Pengulangan):** Catat nama tokoh dan jenis instansi yang sudah dipakai di paket berjalan; **dilarang** memakai nama tokoh yang sama (mis. Andi/Budi/Rina) lebih dari 1 kali dalam 1 paket 110 soal!
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
    "code": "gen01",
    "title": "Tryout SKD CPNS 2026 #1",
    "category": "Mix"
  },
  "questions": [
    {
      "id": "tocpns-gen01-001",
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
      "discussion": "Jawaban yang benar adalah Opsi C. <alasan kunci dengan rujukan fakta/pasal>. Opsi A kurang tepat karena <alasan singkat penolakan pengecoh terkuat>."
    }
  ]
}
```

### B. Daftar `sub_category` Kanonik (Kompatibel 100% dengan `analytics_service.py` & `data/csv/*.csv`)

| Segmen | `sub_category` Kanonik (Wajib Persis Ejaannya) | Pemetaan terhadap `topic` di `Packet 1–15` |
| :--- | :--- | :--- |
| **TWK** | `Nasionalisme`, `Integritas`, `Bela Negara`, `Pilar Negara`, `Bahasa Indonesia` | Identik 1-ke-1 |
| **TIU (Standar)** | `Analogi`, `Silogisme`, `Analitis`, `Berhitung`, `Deret Angka`, `Perbandingan Kuantitatif`, `Soal Cerita`, `Figural` | `Analogi/Silogisme/Analitis` → `Verbal`; `Berhitung/Deret/Perb.Kuant/Cerita` → `Numerik`; `Figural` → `Figural` |
| **TIU (HOTS)** | Tambahan khusus Profil B: `Kecukupan Data`, `Kesetaraan Operasi`, `Pola Bilangan` | Semua terpetakan ke `Numerik` |
| **TKP** | `Pelayanan Publik`, `Jejaring Kerja`, `Sosial Budaya`, `Teknologi Informasi dan Komunikasi`, `Profesionalisme`, `Anti Radikalisme` | Identik 1-ke-1 |

### C. Format Excel / CSV Siap Import (`/admin/questions`)
Sheet bernama **`Impor`** dengan 16 kolom wajib sesuai [admin_import.py](file:///d:/Project/Test-CPNS/backend/api/v1/endpoints/admin_import.py):
`number,segment,content,image_url,discussion,sub_category,option_a,score_a,option_b,score_b,option_c,score_c,option_d,score_d,option_e,score_e`

---

## 3. Standar Pembahasan, KaTeX, & Hard Gate Teknis

Seluruh aturan berikut diverifikasi otomatis oleh [validate_question_pack.py](file:///d:/Project/Test-CPNS/scripts/validate_question_pack.py):

1. **Kuota Eksak 110 Soal:** Nomor kontinu `1..110` (`TWK = 30`, `TIU = 35`, `TKP = 45`). Setiap soal wajib memiliki `content`, `discussion`, `sub_category` kanonik, dan 5 opsi unik `A–E` (tidak boleh ada 2 opsi identik).
2. **Integritas Bobot Skor:**
   - **TWK & TIU:** Tepat `[0, 0, 0, 0, 5]`.
   - **TKP:** Tepat 5 bobot unik `[1, 2, 3, 4, 5]`.
3. **KaTeX & Markdown (`GEMINI.md` § 5A):**
   - Semua pecahan, pangkat, akar, variabel, sudut derajat, dan operasi matematika wajib di dalam `$...$` atau `$$...$$` (mis. `$\frac{3}{4}$`, `$x^2$`, `$\sqrt{144}$`, `$90^\circ$`).
   - Desimal di dalam KaTeX ditulis `0{,}75` agar KaTeX tidak menyisipkan spasi setelah koma.
   - **Rupiah (`Rp50.000`, `Rp1.250.000,00`) wajib ditulis di luar `$...$`** (menaruh `Rp` di dalam `$...$` memicu warning).
   - Soal *Perbandingan Kuantitatif* (`P` vs `Q`) dan *Interpretasi Data* dianjurkan memakai **tabel Markdown rapi** (`| P | Q |`).
4. **Standar Pembahasan Ramah Belajar (Anti-Wall-of-Text & Sinkron Shuffler):**
   - **Dilarang menulis pembahasan sebagai 1 paragraf padat tanpa jeda baris!** Gunakan Markdown standar dengan paragraf (`\n\n`), daftar bernomor (`1.`, `2.`, ...), bullet (`- ...`), penebalan (`**...**`), dan *block math* (`$$...$$`) agar mudah dipindai mata peserta di desktop maupun ponsel (di JSON gunakan `\n\n` untuk paragraf baru dan `\n` antar-item daftar; di Excel gunakan Alt+Enter / `\n`).
   - **TWK (`~60–110 kata`):**
     - Paragraf 1: Mulai tepat dengan `Jawaban yang benar adalah **Opsi X**.` diikuti alasan kunci (rujukan pasal/konsep/kaidah EYD V/KBBI VI).
     - Paragraf 2 (`\n\n`): Jelaskan penolakan pengecoh terkuat (bisa 1 paragraf ringkas atau bullet `- **Opsi Y:** ...`).
   - **TIU Numerik, Analitis, & Silogisme (`~60–120 kata`, wajib bertahap per baris):**
     - Baris 1: `Jawaban yang benar adalah **Opsi X**.`
     - Pisahkan dengan `\n\n`, lalu uraikan langkah hitung/logika dalam **daftar bernomor `1.`, `2.`, `3.`, ...** (1 langkah = 1 baris). Untuk persamaan akhir atau langkah panjang, gunakan *block math* `$$\n...\n$$` agar rumus tidak berdesakan dengan teks.
     - **Ilustrasi Diagram Pembahasan (Disarankan kuat untuk Analitis `#39–42` seperti meja bundar/rute graf, Deret loncat/bertingkat, dan Figural):** Buat PNG latar putih (`#FFFFFF`) via Python (`q39_pembahasan.png`, dst.), unggah ke bucket publik Supabase `exam-assets/pembahasan/<kode_paket>/`, lalu sisipkan di `discussion` sebagai `![Diagram pembahasan soal 39](https://.../exam-assets/pembahasan/<kode_paket>/q39_pembahasan.png)`. Frontend otomatis memberi bingkai putih (aman di Dark Mode) dan fitur *click-to-zoom*.
   - **TKP (`~80–130 kata`, wajib daftar bullet per opsi `5 → 1`):**
     - Baris 1: `Jawaban dengan skor tertinggi adalah **Opsi X** (5 poin).`
     - Pisahkan dengan `\n\n`, lalu tulis rincian kelima opsi terurut `5 → 1` dalam bullet per baris:
       ```markdown
       - **Opsi X (5 poin):** <alasan singkat>.
       - **Opsi Y (4 poin):** <alasan singkat>.
       - **Opsi Z (3 poin):** <alasan singkat>.
       - **Opsi W (2 poin):** <alasan singkat>.
       - **Opsi V (1 poin):** <alasan singkat>.
       ```
     - Validator mengecek kecocokan **seluruh 5 pasang huruf & bobot** serta memberi warning `discussion_wall_of_text` bila pembahasan TIU/TKP tidak memiliki jeda baris (`\n`). Shuffler mendukung penuh remap format bold `**Opsi X (5 poin):**` maupun `Opsi X=5`.
   - **Bebas Artefak AI:** Dilarang menulis *"Sebagai AI..."*, *"Berikut adalah pembahasannya:"*, atau placeholder `[...]`. Nama tokoh di soal dan pembahasan wajib identik.
5. **Verifikasi Deterministik TIU:**
   - **TIU `#35–59`:** Wajib dibuktikan via `verify/verify_tiu_math_logic.py` (memakai `Fraction`/`Decimal` untuk numerik, `itertools.permutations` untuk analitis, dan **tabel kebenaran / uji model himpunan nyata** untuk silogisme — dilarang `assert True` kosong!).
   - **TIU Figural (`#60–65`):** Gambar dibuat deterministik via `verify/generate_figural.py` (latar putih `#FFFFFF`, garis hitam tajam `#111827`, font TrueType `26–32px`, zona tengah `28%–72%` terpisah dari sudut `<= 16%`, tanpa bocoran warna kunci, wajib `assert` 5 state opsi unik, dan wajib diperiksa visual).
6. **Anti-Plagiarisme Lintas Seluruh 15 Paket (`Packet 1–15`):**
   - Validator otomatis membandingkan setiap soal terhadap **seluruh 1.650 soal di `Packet 1–15`**.
   - **TWK & TKP:** Kemiripan `< 50%` terhadap referensi dan `< 55%` internal.
   - **TIU:** Kemiripan `< 85%`, serta **dilarang menyalin urutan angka yang sama** (termasuk deret angka).
7. **Anti-Bias Panjang, Anti-Bias Sintaksis Koma TKP, Acak Kunci 500×, & Acak Urutan TKP:**
   - Opsi kunci (skor 5) tidak boleh jadi opsi terpanjang (secara kata maupun karakter) pada `> 35%` soal; pada TKP, selisih panjang opsi skor 5 terhadap rata-rata 4 opsi lain harus `<= 5 kata` (warning di `> 7 kata`).
   - **Anti-Bias Koma / Pola 3-Aksi Paralel TKP:** Jangan hanya memakai struktur daftar berkoma (`"melakukan A, B, serta C"`) pada opsi skor 5 sementara skor 1–3 berupa 1 klausa tanpa koma! Variasikan struktur 1 klausa dan 2–3 klausa berkoma secara merata di seluruh bobot `5–4–3–2–1` (validator otomatis memicu `tkp_comma_bias` bila heuristik buta "koma terbanyak" `>= 166/225` atau rasio koma terbanyak di skor 5 `> 35%`).
   - Jalankan `--shuffle --shuffle-tkp-order` sebelum ekspor `.xlsx` agar distribusi kunci `A–E` seimbang di setiap segmen (`spread <= 1`, bebas siklus, `max_streak <= 2`) dan urutan TKP `#66–110` teracak alami seperti CAT BKN!

---

## 4. Batas Proyek (`GEMINI.md`)
- Seluruh proses berjalan **100% offline** di `data/generated/<kode_paket>/`. **Jangan** mengubah kode `backend/` atau `frontend/` dan **jangan** menambah fitur AI ke aplikasi produksi.
