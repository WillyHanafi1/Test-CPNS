# RULES.md — Aturan Ringkas & Mutlak Bank Soal TOCPNS

Aturan ini sengaja dibuat **singkat dan bebas jargon** agar AI tidak bingung oleh kelebihan konteks. Patuhi 3 prinsip inti dan Hard Gate di bawah.

---

## 1. Tiga Prinsip Inti Produksi Soal

1. **Contoh Soal = Satu-Satunya Patokan Kesulitan:**
   - **TIDAK PERLU** mengatur label kesulitan (`mudah / sedang / sulit`, `20/60/20`, atau taksonomi Bloom `C3–C5`).
   - Cukup samakan gaya bahasa, panjang kalimat, dan tingkat kesulitan **1-ke-1 dengan soal contoh** pada nomor/sub-kategori yang sama di `Packet 1 (vol17)` atau `Packet 2 (vol18)`.
2. **Cara Membuat Variasi Baru per Segmen:**
   - **TIU Numerik, Deret, Perbandingan Kuantitatif, Soal Cerita, Silogisme, Analitis (`#35–59`):**
     - **Boleh memakai pola/rumus yang sama persis** dengan contoh soal!
     - Cukup **ganti angka, nama/benda, dan hitung ulang jawaban baru + 4 pengecoh baru menggunakan Python** (`Fraction`/`Decimal`/`permutations`). Pastikan angka dan hasil akhirnya benar-benar berbeda dari contoh.
   - **TIU Analogi (`#31–34`) & Figural (`#60–65`):**
     - Tiru tipe pola contoh, ganti pasangan kata (Analogi) atau ganti bentuk/arah rotasi/jumlah elemen (Figural via Python Pillow/matplotlib).
   - **TWK (`#1–30`) & TKP (`#66–110`):**
     - Tiru gaya, panjang kalimat, dan tingkat kesulitan soal contoh, lalu buat cerita/kasus/tokoh baru.
3. **Korpus Hukum & Bahasa = Kamus *On-Demand* (JANGAN Dibaca Semua Sekaligus!):**
   - **JANGAN** memuat seluruh isi `references/*.md` ke dalam prompt secara bersamaan (kelebihan konteks justru merusak kualitas jawaban AI!).
   - Buka/cari (`grep`/baca sebagian) berkas di `references/` **hanya saat butuh memastikan** bunyi pasal UUD 1945, pasal UU ASN 20/2023, atau kata baku KBBI VI/EYD V untuk soal yang sedang dikerjakan.

---

## 2. Kontrak Schema (Kompatibel 100% dengan Server TOCPNS)

### A. Format JSON Batch / Paket (`<kode_paket>-bank-soal.json`)
```json
{
  "schema_version": "2.0",
  "package": {
    "code": "vol19",
    "title": "Tryout SKD CPNS 2026 #1",
    "category": "Mix"
  },
  "questions": [
    {
      "id": "tocpns-vol19-001",
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
      "discussion": "Jawaban yang benar adalah Opsi C. <penjelasan ringkas & tepat>."
    }
  ]
}
```

### B. Format Excel / CSV Siap Import (`/admin/questions`)
Kolom wajib persis mengikuti `backend/api/v1/endpoints/admin_import.py`:
`number,segment,content,image_url,discussion,sub_category,option_a,score_a,option_b,score_b,option_c,score_c,option_d,score_d,option_e,score_e`

---

## 3. Hard Gate Teknis (Divalidasi Otomatis oleh `scripts/validate_question_pack.py`)

1. **Kuota Eksak 110 Soal:** Nomor kontinu `1..110` (`TWK = 30`, `TIU = 35`, `TKP = 45`). Setiap soal wajib punya `content`, `discussion`, `sub_category`, dan tepat 5 opsi unik `A–E` (tidak boleh ada 2 opsi identik).
2. **Integritas Bobot Skor:**
   - **TWK & TIU:** Tepat satu opsi skor `5`, empat opsi lain skor `0` (`[0, 0, 0, 0, 5]`).
   - **TKP:** Wajib 5 bobot unik (`[1, 2, 3, 4, 5]`) tanpa bobot kembar.
3. **KaTeX / LaTeX (`GEMINI.md` § 5A):**
   - Semua pecahan, pangkat, akar, variabel, dan ekspresi hitung wajib di dalam `$...$` atau `$$...$$` (mis. `$\frac{3}{4}$`, `$x^2$`, `$\sqrt{144}$`). Jangan tulis `x^2` atau `akar()` mentah di luar `$...$`. Rupiah (`Rp50.000`) ditulis tanpa `$`.
4. **Sinkronisasi Pembahasan ↔ Kunci & Tokoh:**
   - Mulai pembahasan TWK/TIU dengan: `Jawaban yang benar adalah Opsi X.`
   - Mulai pembahasan TKP dengan: `Jawaban dengan skor tertinggi adalah Opsi X (5 poin).` lalu sebut urutan singkat `Opsi X=5, Opsi Y=4, ...` agar remapper shuffler 100% akurat.
   - Nama tokoh di soal dan pembahasan wajib sama persis.
5. **Verifikasi Deterministik TIU:**
   - **TIU Numerik, Deret, Perbandingan, Cerita (`#43–59`) & Analitis/Silogisme (`#35–42`):** Wajib dibuktikan dengan skrip Python (`Fraction`/`Decimal`/`permutations`) sebelum masuk JSON. Dilarang menghitung hanya di kepala.
   - **TIU Figural (`#60–65`):** Gambar dibuat dengan Python (`Pillow`/`matplotlib`, latar putih `#FFFFFF`, font TrueType `26–32px`, zona tengah & sudut terpisah tanpa overlap), **bukan** generator gambar AI. Upload ke bucket Supabase `exam-assets/figural/<kode_paket>/` untuk produksi.
6. **Batas Anti-Salin yang Masuk Akal:**
   - **TIU:** Boleh memakai kerangka kalimat/rumus sama dengan contoh, selama **angka & jawabannya diubah** (hanya diblokir jika salin-tempel identik `>= 85%`).
   - **TWK & TKP:** Kasus/cerita harus baru (kemiripan teks terhadap `Packet 1 & 2` wajib `< 50%`).
7. **Anti-Bias Panjang & Acak Kunci:**
   - Opsi kunci (skor 5) tidak boleh menjadi opsi terpanjang pada lebih dari **35%** soal. Khusus TKP, usahakan panjang ke-5 opsi seimbang.
   - Jalankan `--shuffle` sebelum ekspor `.xlsx` agar kunci `A–E` merata tanpa pola siklus (soal Figural otomatis dikecualikan).

---

## 4. Batas Proyek (`GEMINI.md`)
- Seluruh alur berjalan **100% offline** di `data/generated/<kode_paket>/`. **Jangan** mengubah kode `backend/` atau `frontend/` dan jangan menambahkan fitur AI ke aplikasi produksi.
