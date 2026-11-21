# RULES — Aturan Wajib Penyusunan & Validasi Bank Soal TOCPNS

Setiap AI Agent atau editor manusia yang menyusun bank soal baru untuk TOCPNS **WAJIB** mematuhi seluruh aturan dalam dokumen ini. Pelanggaran pada bagian **Hard Gate** otomatis menggagalkan paket sebelum boleh diimpor ke `/admin/questions`.

---

## 1. Kontrak Data & Schema (Kompatibel 100% dengan Server TOCPNS)

### A. Format Output JSON Utama (`<pack>-bank-soal.json`)
```json
{
  "schema_version": "2.0",
  "package": {
    "code": "vol19",
    "title": "Tryout SKD CPNS 2026 #1 - Paket Mandiri",
    "category": "Mix",
    "difficulty_profile": "standard-bkn",
    "created_at": "2026-11-21"
  },
  "questions": [
    {
      "id": "tocpns-vol19-001",
      "number": 1,
      "segment": "TWK",
      "sub_category": "Nasionalisme",
      "content": "Teks soal lengkap (mendukung Markdown & LaTeX $...$)...",
      "image_url": null,
      "options": [
        { "label": "A", "content": "Isi opsi A", "score": 0, "image_url": null },
        { "label": "B", "content": "Isi opsi B", "score": 0, "image_url": null },
        { "label": "C", "content": "Isi opsi C", "score": 5, "image_url": null },
        { "label": "D", "content": "Isi opsi D", "score": 0, "image_url": null },
        { "label": "E", "content": "Isi opsi E", "score": 0, "image_url": null }
      ],
      "discussion": "Jawaban yang benar adalah C. <penjelasan tuntas mengapa C benar dan mengapa pengecoh utama salah>.",
      "verification": {
        "method": "corpus_grounded | python_verified | rubric_checked",
        "reference": "UUD 1945 Pasal 24C ayat (1) / BerAKHLAK / solver script"
      }
    }
  ]
}
```

### B. Format Ekspor Excel / CSV Siap Import (`/admin/questions` → Import Excel/CSV)
Kolom wajib eksak (mengikuti `backend/api/v1/endpoints/admin_import.py`):
`number,segment,content,image_url,discussion,sub_category,option_a,score_a,option_b,score_b,option_c,score_c,option_d,score_d,option_e,score_e`
*(Untuk soal figural yang opsi A–E-nya berupa gambar, tambahkan kolom `option_image_a` sampai `option_image_e`.)*

---

## 2. Hard Gate — Aturan Mutlak (Tidak Boleh Dilanggar)

1. **Komposisi Eksak 110 Soal BKN** (sinkron dengan `backend/services/exams.py` `validation_errors()`):
   - Total tepat **110 soal**, nomor urut kontinu `1` sampai `110` tanpa loncat/duplikat.
   - `TWK = 30`, `TIU = 35`, `TKP = 45`.
   - Setiap soal wajib punya tepat **5 opsi (`A, B, C, D, E`)**, tidak boleh ada opsi kosong (kecuali opsi figural yang memiliki `image_url`), dan **tidak boleh ada 2 opsi dengan teks identik** dalam 1 soal.
   - `content`, `discussion`, dan `sub_category` **wajib terisi** pada seluruh 110 soal.
2. **Integritas Bobot Skor (Zero-Score Tampering):**
   - **TWK & TIU:** Tepat **satu** opsi bernilai `5`, empat opsi lainnya bernilai `0` (`sorted(scores) == [0, 0, 0, 0, 5]`).
   - **TKP:** Wajib menggunakan **5 bobot unik** `{1, 2, 3, 4, 5}` (`sorted(scores) == [1, 2, 3, 4, 5]`). Dilarang memberikan bobot kembar (mis. dua opsi berbobot 3).
3. **Standar Matematika & LaTeX (`GEMINI.md` § 5A):**
   - Seluruh rumus, pecahan, pangkat, akar, pertidaksamaan, dan simbol matematika wajib memakai sintaks KaTeX inline `$...$` atau block `$$...$$` (contoh: `$\frac{3}{4}$`, `$x^2 - 5x + 6 = 0$`, `$\sqrt{144}$`, `$25\%$`).
   - **Dilarang keras** menuliskan notasi mentah seperti `x^2`, `akar(16)`, `3/4` di luar `$...$` pada soal numerik/aljabar, atau tanda `$` yang tidak berpasangan.
   - Harga rupiah (`Rp50.000`) ditulis tanpa simbol `$`.
4. **Konsistensi Pembahasan ↔ Kunci Jawaban & Nama Tokoh:**
   - Kalimat pembuka pembahasan wajib menyebut secara eksplisit huruf opsi dengan skor tertinggi:
     - TWK/TIU: `Jawaban yang benar adalah Opsi X.`
     - TKP: `Jawaban dengan skor tertinggi adalah Opsi X (5 poin).` diikuti ringkasan bobot kelima opsi (`Opsi X=5, Opsi Y=4, Opsi Z=3, ...`) agar peserta paham gradasinya dan remapper shuffler bekerja 100% akurat.
   - Nama tokoh di pembahasan **wajib sama persis** dengan nama tokoh di teks soal.
   - Format penyebutan huruf opsi menggunakan kata kunci standar (`Opsi A`, `Jawaban yang benar adalah C`) agar kompatibel 100% dengan remapper dua-tahap di [shuffle_answers.py](file:///d:/ProjectAI/Test-CPNS/scripts/shuffle_answers.py).
5. **Anti-Plagiarisme & Orisinalitas:**
   - Dilarang menyalin atau sekadar memparafrase dangkal soal dari `Packet 1 (vol17)`, `Packet 2 (vol18)`, atau CSV lama di `data/csv/`.
   - **Batas keras:** Kemiripan teks (*word 3-gram / Jaccard similarity*) terhadap seluruh 220 soal di `Packet 1` & `Packet 2` wajib **`< 35%`** (diperiksa otomatis oleh `scripts/validate_question_pack.py`).
   - Kemiripan antar-soal di dalam paket yang sama juga wajib `< 55%`.
6. **Anti-Bias Panjang Opsi & Anti-Pola Kunci:**
   - Opsi benar / skor 5 **tidak boleh** menjadi opsi terpanjang pada lebih dari **35%** soal dalam satu paket (khususnya TKP, selisih panjang kata antara opsi skor 5 dan rata-rata 4 opsi lain disarankan `≤ 5` kata).
   - Sebelum import final, wajib menjalankan `shuffle_answers.py` (kecuali soal figural) agar distribusi kunci `A–E` seimbang di setiap segmen (TWK: 5–7 per huruf, TIU non-figural: 5–7 per huruf, TKP: 8–10 per huruf) dan bebas pola siklus (tidak ada huruf sama muncul 3× berturut-turut).

---

## 3. Aturan Khusus per Segmen

### A. Aturan TWK (Nomor 1–30)
1. **Wajib *Corpus-Grounded*:** Seluruh rujukan pasal UUD 1945, wewenang lembaga negara, peristiwa sejarah, UU ASN 20/2023, UU Bela Negara 23/2019, dan kata baku KBBI VI **harus** cocok dengan [uud_1945_ringkas.md](file:///d:/ProjectAI/Test-CPNS/docs/uud_1945_ringkas.md) dan [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md).
2. **Minimal 80% Studi Kasus (HOTS):** Hindari pertanyaan hafalan mentah seperti *"Isi Pasal 31 ayat (4) adalah..."*. Ubah menjadi studi kasus kebijakan publik, dinamika birokrasi, atau dilema warga negara yang menuntut penalaran penerapan nilai/pasal.
3. **Pengecoh Bernilai Tinggi (*Plausible Distractors*):** Minimal 2 pengecoh harus terdengar positif/masuk akal tetapi keliru dari sisi pilar, kewenangan lembaga, atau prinsip konstitusi. Hindari pengecoh yang terlalu konyol/ekstrem.
4. **Bahasa Indonesia (5 soal):** Setiap soal wajib punya 1 kunci tak terbantahkan berdasarkan kaidah EYD V & KBBI VI — dilarang membuat soal yang dua opsinya sama-sama baku tanpa pembeda konteks yang jelas.

### B. Aturan TIU (Nomor 31–65)
1. **Zero Mental Math (Wajib Verifikasi Python):**
   - Setiap soal **Berhitung, Deret Angka, Perbandingan Kuantitatif, dan Soal Cerita** (17 soal) **WAJIB** diverifikasi oleh eksekusi skrip Python (`fractions.Fraction` / `decimal` / `sympy`) sebelum ditulis ke JSON final!
   - Setiap soal **Analitis** (4 soal: posisi duduk, urutan, jadwal) **WAJIB** dicek dengan Python brute-force solver bahwa **tepat satu opsi** bernilai selalu benar (atau tepat satu susunan unik menjawab pertanyaan), sehingga tidak pernah muncul jawaban ganda.
   - Setiap soal **Silogisme** (4 soal) wajib valid secara logika formal (hindari kesesatan *affirming the consequent* atau menarik simpulan "sebagian" dari dua premis partikular).
2. **Distraktor Berbasis Kesalahan Hitung Nyata:**
   - 4 opsi salah pada soal numerik harus berasal dari kesalahan umum peserta (mis. salah rumus berbalik nilai vs senilai, lupa membagi 2, salah konversi menit↔jam, salah tanda negatif) dan **tidak boleh ada dua opsi bernilai matematis sama** (mis. `1 5/8` dan `13/8` di opsi berbeda).
3. **Figural (6 soal) — Deterministik Kode, Bukan Image AI:**
   - Dilarang memakai generative AI image (Imagen/DALL-E/Midjourney) untuk soal figural.
   - Buat gambar figural menggunakan skrip Python (`Pillow` atau `SVG → PNG`) berbasis aturan transformasi matematis pasti (rotasi sudut eksak, refleksi, pergeseran posisi searah/berlawanan jarum jam, perubahan jumlah sisi/titik/arsiran, operasi XOR garis).
   - Setiap gambar figural harus berlatar putih bersih (`#FFFFFF`), kontras tinggi (`#111827`), resolusi jelas (mis. `900×320px` untuk soal deret/analogi atau `240×240px` per panel), dan dapat diverifikasi visualnya secara langsung.
   - Untuk produksi, upload ke bucket Supabase `exam-assets` pada folder `figural/<kode_paket>/` (`GEMINI.md` § 5F) lalu isi kolom `image_url` dengan URL publiknya (bukan `127.0.0.1`!).

### C. Aturan TKP (Nomor 66–110)
1. **Skenario Dilema Nyata ASN:** Setiap soal harus menempatkan peserta sebagai ASN/pegawai yang menghadapi konflik ringan namun nyata (keterbatasan waktu, tekanan warga/atasan, keterbatasan teknologi, keragaman budaya, atau indikasi intoleransi/radikalisme).
2. **Rubrik Gradasi Ketat `5 → 4 → 3 → 2 → 1`:**
   - **Skor 5:** Proaktif, solutif tuntas, empatik/ramah, taat SOP/aturan, berorientasi kepentingan publik/kolaborasi, menggerakkan solusi nyata.
   - **Skor 4:** Etis dan positif, namun kurang inisiatif/kurang tuntas (mis. sekadar menyarankan atau melimpahkan ke atasan tanpa langkah awal yang membantu).
   - **Skor 3:** Normatif kaku, pasif menunggu perintah, atau kompromi setengah jalan tanpa menyelesaikan akar masalah.
   - **Skor 2:** Kurang peduli, menghindar secara halus, menunda, atau menyalahkan keadaan/rekan.
   - **Skor 1:** Reaktif, emosional, egois, diskriminatif, melanggar SOP/integritas, atau permisif terhadap paham radikalisme.
3. **Keseimbangan Panjang & Nada Bahasa:**
   - Kelima opsi wajib memiliki rentang panjang hampir sama (mis. 12–20 kata per opsi) dan ditulis dalam bahasa profesional natural — **dilarang** memakai kata-kata klise yang langsung membocorkan skor 1 (seperti *"marah-marah dan mengusir"*) kecuali proporsional, atau membuat skor 5 dua kali lebih panjang daripada skor 1–4.

---

## 4. Aturan Lingkungan Produksi TOCPNS (`GEMINI.md`)
- Seluruh proses AI authoring ini dijalankan **100% offline** (di mesin lokal / sesi AI agent developer). **Dilarang keras** menambahkan SDK LLM, API key AI, atau endpoint generator AI ke dalam kode aplikasi `backend/` maupun `frontend/`.
- File hasil paket mentah disimpan di `data/generated/<kode_paket>/` (bukan di root repositori atau folder `backend/`).
