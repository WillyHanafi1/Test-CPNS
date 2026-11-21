# PROMPTS.md — Koleksi Prompt Produksi Bank Soal SKD TOCPNS

Dokumen ini berisi **prompt siap copy-paste** dalam 3 mode penggunaan:
1. **Prompt 0 (Autonomous Agent Prompt):** Untuk AI Agent berkemampuan baca/tulis file & jalankan Python (*Antigravity, Claude Code, Codex, Gemini CLI*) agar bekerja **mandiri end-to-end** membuat 1 paket penuh 110 soal siap import.
2. **Prompt 1–5 (Batch Prompts Web Chat):** Untuk dipakai manual di **ChatGPT / Gemini Web / Claude Web** jika ingin menghasilkan soal per batch tanpa CLI agent.
3. **Prompt 6 (Adversarial Auditor Prompt):** Untuk menguji silang (*cross-model review*) hasil generate menggunakan model berbeda sebelum masuk produksi.

---

## Prompt 0 — Master Autonomous Agent Prompt (1 Perintah untuk Generate Mandiri 110 Soal)

Salin seluruh blok di bawah, ganti `vol19` dan judul/kesulitan sesuai kebutuhan, lalu kirim langsung ke AI Agent di workspace `d:\ProjectAI\Test-CPNS`:

```text
Jalankan produksi mandiri 1 paket lengkap SKD CPNS (110 soal orisinal siap impor ke TOCPNS) dengan parameter berikut:
- Kode paket: vol19
- Judul paket: Tryout SKD CPNS 2026 #1 - Paket Mandiri (Edisi Orisinal)
- Profil kesulitan: standard-bkn (20% sedang-mudah, 60% standar BKN, 20% HOTS sulit)
- Direktori kerja: data/generated/vol19/

Instruksi wajib:
1. Baca terlebih dahulu seluruh pedoman dan korpus referensi berikut sebelum menulis satu soal pun:
   - docs/question-authoring/AGENT.md
   - docs/question-authoring/RULES.md
   - docs/question-authoring/BLUEPRINT.md
   - docs/kepmenpan_rb_321_2024.md
   - docs/uud_1945_ringkas.md
   - docs/question-authoring/references/korpus_twk_tkp_lengkap.md
   - Ambil 2–3 soal contoh per segmen dari data/Packet 1/outputs/packet1-vol17/vol17-bank-soal.json dan data/Packet 2/outputs/packet2-vol18/vol18-bank-soal.json HANYA sebagai kalibrasi gaya bahasa, panjang kalimat, dan level kesulitan (dilarang menyalin atau memparafrase dangkal!).

2. Eksekusi seluruh 8 fase di docs/question-authoring/AGENT.md secara bertahap dan disiplin:
   - Kerjakan per batch kecil (17 batch sesuai BLUEPRINT.md: 5 batch TWK, 6 batch TIU, 6 batch TKP) di data/generated/vol19/batches/.
   - Validasi setiap batch segera dengan: python scripts/validate_question_pack.py <file_batch> --partial.
   - Untuk TIU #35–59 (Silogisme, Analitis, Berhitung, Deret, Perbandingan Kuantitatif, Soal Cerita), WAJIB tulis dan jalankan data/generated/vol19/verify/verify_tiu_math_logic.py guna membuktikan secara eksak hasil hitung (Fraction/Decimal) dan keunikan jawaban analitis (brute-force permutations).
   - Untuk TIU Figural #60–65 (2 Analogi, 2 Ketidaksamaan, 2 Serial), WAJIB buat gambar deterministik lewat data/generated/vol19/verify/generate_figural.py (Pillow/matplotlib, latar putih bersih, kontras tinggi, label A-E rapi) ke data/generated/vol19/gambar/q60_figural.png s.d. q65_figural.png, lalu periksa hasil gambarnya secara visual.
   - Pastikan seluruh rumus matematika memakai KaTeX $...$ / $$...$$, bobot TKP unik {1,2,3,4,5}, panjang opsi TKP seimbang (tidak bias panjang), dan nama tokoh di soal 100% sama dengan di pembahasan.

3. Setelah 17 batch lengkap, gabungkan ke data/generated/vol19/vol19-bank-soal.json, lalu jalankan Quality Gate penuh + shuffle kunci seimbang + ekspor siap impor:
   python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json --shuffle --export-csv data/generated/vol19/vol19-impor-final.csv --export-xlsx data/generated/vol19/vol19-impor-final.xlsx --report data/generated/vol19/audit-report.md

4. Jangan berhenti sebelum:
   - verify_tiu_math_logic.py lulus 100% (exit code 0),
   - validate_question_pack.py pada vol19-impor-final.xlsx lulus 0 error (exit code 0),
   - Kemiripan teks terhadap Packet 1 & Packet 2 seluruhnya < 35%,
   - Rasio opsi benar terpanjang <= 35%,
   - Distribusi kunci A–E seimbang tanpa pola siklus.

5. Jangan ubah kode aplikasi backend/ atau frontend/, dan jangan lakukan import otomatis ke DB produksi sebelum saya meninjau audit-report.md. Laporkan ringkasan hasil dan lokasi seluruh berkas keluaran setelah selesai.
```

---

## Prompt 1 — Batch TWK (Untuk Web Chat: Gemini Pro / Claude / ChatGPT)

*Lampirkan `docs/uud_1945_ringkas.md`, `docs/question-authoring/references/korpus_twk_tkp_lengkap.md`, dan 2 contoh soal dari Packet 1/2 untuk sub-topik yang dipilih.*

```text
Peran: Kamu adalah penyusun soal senior SKD CPNS BKN spesialis Tes Wawasan Kebangsaan (TWK) level HOTS (C4–C5).

Tugas: Susun tepat [JUMLAH, mis. 5] soal TWK orisinal untuk sub-kategori "[Nasionalisme / Integritas / Bela Negara / Pilar Negara / Bahasa Indonesia]" dengan nomor urut [MIS. 1–5].

Aturan Ketat:
1. GROUNDING WAJIB: Gunakan HANYA fakta hukum, pasal UUD 1945, UU ASN 20/2023, UU Bela Negara 23/2019, nilai Pancasila, sejarah, dan kaidah EYD V/KBBI VI yang ada pada dokumen referensi terlampir. Dilarang mengarang pasal atau tahun sejarah.
2. ORISINALITAS: Soal contoh terlampir HANYA acuan tingkat kesulitan dan gaya kalimat. Buat skenario kasus, latar instansi, dan tokoh yang sepenuhnya baru (kemiripan teks harus < 35%).
3. HOTS STUDI KASUS: Minimal 80% soal berupa studi kasus nyata (30–55 kata), bukan hafalan definisi mentah.
4. DISTRAKTOR TAJAM: Buat 5 opsi (A–E) yang semuanya terdengar rasional dan profesional. Minimal 2 pengecoh harus tampak positif tetapi keliru pilar/wewenang/prinsip konstitusinya.
5. ANTI-BIAS PANJANG: Jangan membuat opsi jawaban benar secara konsisten paling panjang. Jaga panjang kelima opsi relatif seimbang (±5 kata).
6. PEMBAHASAN: Mulai kalimat pertama dengan persis: "Jawaban yang benar adalah <HURUF>." Jelaskan dasar pasal/nilai/kaidah dan mengapa 1–2 pengecoh terkuat salah. Pastikan nama tokoh identik dengan soal.

Keluarkan HANYA array JSON valid mengikuti schema berikut tanpa teks tambahan:
[
  {
    "id": "tocpns-vol19-001",
    "number": 1,
    "segment": "TWK",
    "sub_category": "<Nama Sub-Kategori>",
    "content": "<Teks soal>",
    "image_url": null,
    "options": [
      {"label": "A", "content": "...", "score": 0, "image_url": null},
      {"label": "B", "content": "...", "score": 0, "image_url": null},
      {"label": "C", "content": "...", "score": 5, "image_url": null},
      {"label": "D", "content": "...", "score": 0, "image_url": null},
      {"label": "E", "content": "...", "score": 0, "image_url": null}
    ],
    "discussion": "Jawaban yang benar adalah C. ...",
    "verification": {"method": "corpus_grounded", "reference": "<Pasal/Kaidah>"}
  }
]
```

---

## Prompt 2 — Batch TIU Verbal (Analogi, Silogisme, Analitis)

```text
Peran: Kamu adalah pakar psikometri penyusun soal TIU Verbal SKD CPNS BKN.

Tugas: Susun tepat [4] soal TIU Verbal sub-kategori "[Analogi / Silogisme / Analitis]" dengan nomor urut [MIS. 39–42].

Aturan Ketat:
1. Untuk ANALITIS (posisi duduk/urutan/jadwal):
   - Rancang premis (5–6 petunjuk) yang memiliki TEPAT SATU jawaban pasti tak terbantahkan pada semua permutasi valid.
   - Wajib sertakan skrip Python singkat (itertools.permutations) di akhir respon untuk membuktikan bahwa hanya tepat 1 opsi yang selalu benar!
2. Untuk SILOGISME:
   - Gunakan logika formal ketat (kuantor Semua/Sebagian/Tidak ada, implikasi p -> q, kontraposisi ~q -> ~p, modus tollens). Hindari kesesatan logika informal.
3. Untuk ANALOGI:
   - Pastikan arah relasi kedua pasang kata 100% sejajar (tidak terbalik urutan sebab-akibat atau kategori-anggota).
4. ORISINALITAS: Jangan salin nama, konteks, atau pasangan kata dari contoh referensi.
5. PEMBAHASAN: Mulai dengan "Jawaban yang benar adalah <HURUF>." lalu uraikan deduksi langkah demi langkah secara runtut.
6. Format output: JSON array persis sesuai schema TOCPNS (score 5 untuk 1 jawaban benar, 0 untuk 4 opsi lain) diikuti blok kode Python verifikasi.
```

---

## Prompt 3 — Batch TIU Numerik (Berhitung, Deret, Perbandingan Kuantitatif, Soal Cerita)

```text
Peran: Kamu adalah penyusun soal TIU Numerik SKD CPNS BKN dengan standar akurasi matematis absolut.

Tugas: Susun tepat [5] soal TIU Numerik sub-kategori "[Berhitung / Deret Angka / Perbandingan Kuantitatif / Soal Cerita]" dengan nomor urut [MIS. 43–47].

Alur Wajib (Chain-of-Thought + Verifikasi Kode):
1. Rancang pola soal setara contoh referensi (pecahan/persen/aljabar/deret 2 larik/perbandingan berbalik nilai/kecepatan/tabel X vs Y), tetapi gunakan konteks & angka baru sepenuhnya.
2. Sebelum menulis JSON, buat skrip Python (memakai fractions.Fraction atau decimal.Decimal) untuk menghitung:
   - Nilai jawaban eksak (kunci),
   - 4 distraktor yang berasal dari kesalahan hitung manusiawi nyata (mis. lupa membalik perbandingan berbalik nilai, salah konversi satuan, lupa kali 2),
   - Assertion bahwa ke-5 opsi memiliki nilai matematis BERBEDA (tidak boleh ada bentuk ekuivalen seperti 1 1/2 dan 1,5 pada dua opsi terpisah!).
3. FORMAT LATEX WAJIB: Bungkus semua pecahan, pangkat, akar, variabel, dan ekspresi hitung dalam KaTeX inline $...$ (contoh: $\frac{3}{8}$, $x^2$, $\sqrt{225}$, $12,5\%$). Jangan tulis x^2 atau akar() mentah di luar $...$.
4. PEMBAHASAN: Mulai dengan "Jawaban yang benar adalah <HURUF>." diikuti langkah perhitungan eksplisit dalam LaTeX yang 100% cocok dengan hasil skrip Python.
5. Outputkan: (a) blok Python verifikasi, lalu (b) JSON array valid sesuai schema TOCPNS.
```

---

## Prompt 4 — Batch TIU Figural (Generator Kode Python Deterministik)

```text
Peran: Kamu adalah engineer visual & psikometrikus pembuat soal TIU Figural SKD CPNS.

Tugas: Tulis skrip Python (menggunakan Pillow / PIL atau matplotlib) untuk menghasilkan 6 gambar soal TIU Figural orisinal ke folder data/generated/<kode_paket>/gambar/:
- q60_figural.png & q61_figural.png: Analogi Gambar (A : B = C : ?)
- q62_figural.png & q63_figural.png: Ketidaksamaan Gambar (pilih 1 dari 5 yang tidak mengikuti aturan)
- q64_figural.png & q65_figural.png: Serial Gambar (4 kotak berurutan → tentukan kotak ke-5)

Aturan Ketat:
1. Setiap soal wajib memiliki aturan transformasi matematis yang 100% tegas dan dapat dibuktikan secara logis (kombinasi 2 aturan sekaligus agar setara kesulitan BKN, mis. rotasi 90° searah jarum jam + pergantian arsiran hitam/putih, atau pergeseran titik sudut + penambahan 1 sisi poligon).
2. Pastikan tepat 1 dari opsi A–E memenuhi seluruh aturan (dan untuk Ketidaksamaan, tepat 4 opsi memenuhi aturan yang sama sedangkan 1 opsi melanggar secara jelas).
3. Estetika Gambar: Latar putih murni (#FFFFFF), garis gelap kontras tinggi (#111827, stroke 2.5–3px), margin rapi, kotak panel simetris, gunakan font TrueType besar (mis. arial.ttf / DejaVuSans-Bold.ttf size 26–32px atau matplotlib — JANGAN ImageFont.load_default() ukuran mini) untuk label A, B, C, D, E dan tanda ?, pisahkan zona motif tengah (28%–72% kotak) dari penanda sudut (<= 16% tepi) agar tidak pernah tumpang tindih, resolusi min. 1100×460px.
4. Sertakan juga JSON 6 soal (nomor 60–65) dengan pembahasan rinci yang menjelaskan aturan transformasi tiap langkah dan alasan 4 opsi lain salah.
```

---

## Prompt 5 — Batch TKP (Situational Judgment Test — Rubrik 5→1)

*Lampirkan bagian BerAKHLAK & Anti-Radikalisme dari `docs/question-authoring/references/korpus_twk_tkp_lengkap.md` dan 2 contoh soal TKP dari Packet 1/2.*

```text
Peran: Kamu adalah psikolog industri/asesor ASN senior spesialis penyusunan soal Tes Karakteristik Pribadi (TKP) SKD CPNS berbasis nilai ASN BerAKHLAK.

Tugas: Susun tepat [6] soal TKP orisinal untuk sub-kategori "[Pelayanan Publik / Jejaring Kerja / Sosial Budaya / Teknologi Informasi dan Komunikasi / Profesionalisme / Anti Radikalisme]" dengan nomor urut [MIS. 66–71].

Aturan Ketat:
1. DILEMA NYATA ASN (40–60 kata): Setiap soal menghadirkan konflik ringan namun realistis di lingkungan kerja instansi Indonesia (variasikan instansi: Dukcapil, Puskesmas, Kecamatan, Dinas Sosial, Inspektorat, BPS, KUA, dll.).
2. RUBRIK GRADASI KETAT (Wajib 5 bobot unik: 5, 4, 3, 2, 1 — tanpa nilai kembar):
   - Skor 5: Proaktif, solutif tuntas, empatik, tetap taat SOP/aturan, berorientasi pelayanan/kolaborasi/nilai kebangsaan.
   - Skor 4: Positif & etis, tetapi kurang tuntas/kurang inisiatif (mis. sekadar menyarankan atau melimpahkan tanpa langkah awal).
   - Skor 3: Normatif kaku, pasif menunggu arahan, atau kompromi setengah jalan.
   - Skor 2: Kurang peduli, menghindar halus, atau menunda tanggung jawab.
   - Skor 1: Reaktif, egois, melanggar SOP/etika, atau permisif pada intoleransi/radikalisme.
3. ANTI-BIAS PANJANG & ANTI-KLISE (SANGAT PENTING):
   - Panjang kelima opsi HARUS seragam (12–19 kata per opsi; selisih panjang opsi skor 5 terhadap rata-rata 4 opsi lain maksimal 4 kata!).
   - Tulis seluruh 5 opsi dengan nada bahasa profesional yang wajar (jangan buat skor 1 terdengar seperti penjahat kartun agar tingkat kesulitan tetap menantang seperti BKN).
   - Jangan ada dua opsi yang maknanya identik.
4. PEMBAHASAN: Mulai dengan "Jawaban dengan skor tertinggi adalah Opsi <HURUF> (5 poin)." lalu jelaskan urutan poin ke-5 opsi secara ringkas (mis. "Opsi C=5 (solutif & taat SOP), Opsi A=4 (...), Opsi E=3 (...), Opsi B=2 (...), Opsi D=1 (...).") dan kaitkan dengan nilai BerAKHLAK / sub-topiknya.
5. Outputkan HANYA JSON array valid sesuai schema TOCPNS.
```

---

## Prompt 6 — Adversarial QA Auditor Prompt (Uji Silang Model Berbeda)

Gunakan prompt ini pada **sesi chat baru / model berbeda** (mis. soal dibuat Gemini → diaudit oleh Claude atau GPT) untuk menyerang dan menemukan celah sebelum paket diterbitkan:

```text
Peran: Kamu adalah Auditor Kualitas Soal CPNS yang sangat kritis dan skeptis. Tugasmu BUKAN memuji, melainkan mencari kesalahan, ambiguitas, salah hitung, halusinasi fakta, atau kelemahan soal berikut.

Periksa setiap soal JSON yang dilampirkan terhadap 7 kriteria berikut:
1. AKURASI FAKTA (TWK): Apakah ada nomor pasal UUD/UU, wewenang lembaga, peristiwa sejarah, atau kata baku KBBI yang keliru atau tidak didukung referensi?
2. AKURASI HITUNG & KEUNIKAN SOLUSI (TIU): Hitung ulang dari nol tanpa melihat pembahasan! Apakah hasilmu sama dengan kunci? Untuk soal analitis/silogisme, adakah skenario lain yang juga memenuhi premis tetapi menghasilkan jawaban berbeda?
3. KUALITAS TKP (5→1): Apakah skor 5 benar-benar tak terbantahkan lebih baik daripada skor 4? Apakah ada opsi skor 4 yang terasa sama bagusnya atau lebih baik? Apakah opsi skor 5 ketahuan hanya karena paling panjang/paling normatif?
4. KONSISTENSI INTERNAL: Apakah nama tokoh, angka, dan huruf kunci di soal 100% cocok dengan pembahasan? Adakah dua opsi yang identik atau ekuivalen?
5. STANDAR LATEX & BAHASA: Adakah salah ketik, kalimat tidak efektif, atau notasi matematika mentah di luar $...$?

Outputkan daftar temuan HANYA untuk soal yang bermasalah dalam tabel:
| Nomor | Tingkat (KRITIS / MAYOR / MINOR) | Temuan Spesifik | Saran Perbaikan Eksak |
Jika semua soal benar-benar bersih tanpa cacat, tulis: "LULUS AUDIT ADVERSARIAL (0 TEMUAN KRITIS)".
```
