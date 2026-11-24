# PROMPTS.md — Prompt Presisi, Ringkas, & Terkalibrasi 15 Paket (`Packet 1–15`)

Semua prompt di bawah bebas parameter rumit, mengambil contoh nyata lintas sumber (`Packet 1–15`) secara *Just-In-Time* lewat `scripts/sample_anchor_questions.py`, dan 100% selaras dengan `scripts/validate_question_pack.py` serta `scripts/shuffle_answers.py`.

---

## Prompt 0 — Perintah Tunggal untuk AI Agent Mandiri (Generate 110 Soal)

Salin blok ini, ganti `gen01`, judul paket, seed (`1`), dan pilih profil (`standard` atau `hots`), lalu kirim ke AI Agent di workspace `d:\Project\Test-CPNS`:

```text
Buatkan 1 paket lengkap SKD CPNS (110 soal siap impor ke TOCPNS) secara mandiri:
- Kode paket: gen01
- Judul paket: Tryout SKD CPNS 2026 #1
- Profil TIU: standard   (pilih "standard" ala Packet 1-10/14-15, atau "hots" ala Packet 11-13)
- Seed sampling contoh: 1
- Folder kerja: data/generated/gen01/

Aturan kerja (jaga konteks tetap ringan & presisi!):
1. Baca HANYA docs/question-authoring/RULES.md, docs/question-authoring/BLUEPRINT.md, dan docs/question-authoring/AGENT.md di awal. JANGAN baca seluruh folder references/ maupun file JSON Packet 1-15 secara utuh!
2. Kerjakan per batch kecil (18 batch sesuai BLUEPRINT.md, masing-masing 4–9 soal) di data/generated/gen01/batches/.
   - Sebelum menulis 1 batch, jalankan:
     python scripts/sample_anchor_questions.py --batch <KODE_BATCH> --profile <standard|hots> --count 5 --seed <SEED>
   - Gunakan HANYA contoh dari output skrip tersebut sebagai patokan gaya, panjang, dan kompleksitas!
   - Catat nama tokoh & instansi yang sudah dipakai di data/generated/gen01/used_entities.txt agar tidak ada nama tokoh yang berulang dalam 1 paket.
   - Jika didukung subagent/pekerja paralel, pisahkan pengerjaan per segmen (TWK / TIU Non-Figural / TIU Figural / TKP) agar batch akhir TKP bebas context drift.
3. Cara membuat variasi per segmen:
   - TWK (#1–30): Buat kasus & tokoh baru; patuhi 6 sub-tipe wajib Bahasa Indonesia (#25–30). Cek pasal/ejaan di docs/question-authoring/references/ secara on-demand (grep/potongan baris saja). Pembahasan (~60–110 kata) DILARANG berupa 1 paragraf padat: mulai "Jawaban yang benar adalah **Opsi X**." lalu `\n\n` diikuti penjelasan konsep/pasal, lalu `\n\n` alasan penolakan pengecoh terkuat (bullet `- **Opsi Y:** ...` bila >1 pengecoh).
   - TIU Verbal & Numerik (#31–59): Pertahankan konsep & kompleksitas contoh, tetapi PARAFRASE kalimat, ganti konteks/angka, dan ubah target pertanyaan bila sesuai. TIU-1 wajib 2 Analogi Kata + 2 Analogi Kalimat; Deret wajib 3 pola berbeda (termasuk 1 loncat/2-larik & 1 cari suku awal). Buktikan SELURUH #35–59 di data/generated/gen01/verify/verify_tiu_math_logic.py (Fraction/Decimal untuk numerik, permutations untuk analitis, truth table/uji himpunan nyata untuk silogisme — dilarang assert True kosong!). Semua rumus pakai KaTeX $...$ atau block math $$...$$, desimal 0{,}75, Rupiah di luar $...$, tabel kuantitatif pakai Markdown. Pembahasan TIU WAJIB terstruktur bertahap (anti-wall-of-text): baris 1 "Jawaban yang benar adalah **Opsi X**." lalu `\n\n` diikuti langkah bernomor (`1.`, `2.`, `3.`, ...) per baris + `$$...$$` untuk persamaan akhir. Untuk soal Analitis visual (#39–42 seperti meja bundar/rute graf) dan Deret loncat, buat diagram ilustrasi pembahasan (`q39_pembahasan.png`, dst.) di data/generated/gen01/gambar/ (latar #FFFFFF, tajam, bersih) dan sisipkan di pembahasan via `![Diagram pembahasan soal 39](gambar/q39_pembahasan.png)` (nanti diganti URL publik Supabase saat upload).
   - TIU Figural (#60–65): Ikuti Prompt 3. Buat 6 soal deterministik (2 Analogi, 2 Ketidaksamaan, 1 Serial, 1 Matriks 3×3) dan rencanakan minimal 4 mekanisme penalaran yang berbeda sebelum menggambar. Tiap soal harus memiliki minimal 2 kriteria objektif dan tepat 1 jawaban. Simpan skrip di `data/generated/gen01/verify/generate_figural.py`, gambar di `data/generated/gen01/gambar/`, lalu periksa tampilan soal, lima opsi, dan diagram pembahasan.
   - TKP (#66–110): Buat skenario kerja & tokoh baru, panjang 5 opsi seimbang (selisih skor 5 vs rata-rata lain <= 5 kata), skor 5 vs 4 kontras tegas, skor 1 tetap terdengar rasional (bukan kartun). Pembahasan WAJIB memakai format bullet per baris (anti-wall-of-text): baris 1 "Jawaban dengan skor tertinggi adalah **Opsi X** (5 poin)." lalu `\n\n` diikuti daftar 5 bullet berurutan 5→1: `- **Opsi X (5 poin):** ...` sampai `- **Opsi V (1 poin):** ...`.
4. Validasi setiap batch segera: python scripts/validate_question_pack.py <file_batch> --partial.
5. Setelah 18 batch lulus, gabungkan ke data/generated/gen01/gen01-bank-soal.json lalu jalankan:
   python scripts/validate_question_pack.py data/generated/gen01/gen01-bank-soal.json --shuffle --shuffle-tkp-order --seed 42 --export-json data/generated/gen01/gen01-bank-soal-final.json --export-csv data/generated/gen01/gen01-impor-final.csv --export-xlsx data/generated/gen01/gen01-impor-final.xlsx --report data/generated/gen01/audit-report.md --export-blind-audit data/generated/gen01/cross_audit/
6. Pastikan verify_tiu_math_logic.py exit code 0 dan validasi ulang gen01-impor-final.xlsx menghasilkan 0 Hard Errors (dan 0 warning pembahasan/bias). Jangan ubah backend/ atau frontend/, dan jangan impor ke DB produksi sebelum saya meninjau hasilnya.
```

---

## Prompt 1 — Batch TWK (Mode Web Chat, Konteks Ringan)

*Jalankan `python scripts/sample_anchor_questions.py --batch TWK-X --count 4` lalu tempel hasilnya di bagian contoh.*

```text
Buatkan tepat [5/6/8] soal TWK sub_category "[Nasionalisme / Integritas / Bela Negara / Pilar Negara / Bahasa Indonesia]" nomor [X–Y] dengan gaya, panjang kalimat, dan tingkat kesulitan setara soal contoh berikut, menggunakan kasus, instansi, dan tokoh yang sepenuhnya baru.

Aturan wajib:
1. Fakta pasal UUD 1945, UU ASN 20/2023, UU Bela Negara 23/2019, serta ejaan KBBI VI & EYD V wajib 100% akurat (jangan mengarang pasal/ayat).
2. Jika Bahasa Indonesia (6 soal), wajib mencakup 6 sub-tipe berbeda: (1) Ide Pokok, (2) Inti/Struktur Kalimat, (3) Simpulan/Judul, (4) Kalimat Efektif, (5) Kata Baku/Diksi/Imbuhan, (6) EYD V (Kapital/Tanda Baca).
3. Buat 5 opsi (A–E) yang panjangnya relatif seimbang dan semua terdengar masuk akal (tepat 1 opsi skor 5, 4 opsi lain skor 0). Jangan mengulang nama tokoh yang sama.
4. Pembahasan (~60–110 kata, WAJIB rapi dengan jeda paragraf `\n\n`):
   - Paragraf 1: Mulai tepat dengan `"Jawaban yang benar adalah **Opsi <HURUF>**."` diikuti dasar konsep/pasal/kaidah.
   - Paragraf 2 (`\n\n`): Jelaskan penolakan pengecoh terkuat (gunakan bullet `- **Opsi <Y>:** ...` bila membandingkan >1 pengecoh). Nama tokoh di pembahasan harus identik dengan soal.
5. Keluarkan HANYA array JSON valid sesuai schema TOCPNS (bebas pembuka meta AI).

Contoh soal acuan (dari Packet 1–15):
[TEMPEL 3–5 SOAL CONTOH DARI sample_anchor_questions.py DI SINI]
```

---

## Prompt 2A — Batch TIU Standar: Verbal & Numerik (Parafrase Konsep + Verifikasi Python)

*Jalankan `python scripts/sample_anchor_questions.py --batch TIU-X --profile standard --count 5` lalu tempel hasilnya.*

```text
Buatkan tepat [4/6/7] soal TIU sub_category "[Analogi / Silogisme / Analitis / Berhitung / Deret Angka / Perbandingan Kuantitatif / Soal Cerita]" nomor [X–Y] dengan mempertahankan KONSEP dan KOMPLEKSITAS contoh berikut, tetapi WAJIB parafrase struktur kalimat, ganti konteks/objek, ganti seluruh angka, serta buat 4 pengecoh baru yang realistis!

Aturan wajib:
1. Khusus kuota variasi:
   - Jika Analogi (4 soal): wajib tepat 2 Analogi Kata + 2 Analogi Kalimat.
   - Jika Silogisme (4 soal): wajib 3 Kuantor (Semua/Sebagian) + 1 Implikasi/Kontraposisi (Jika–Maka).
   - Jika Deret Angka (3 soal): wajib 3 pola berbeda — (a) loncat/2-larik, (b) operasi bergantian (minimal 1 mencari suku awal "..., a, b"), (c) bertingkat/Fibonacci/deret pecahan.
   - Jika Perbandingan Kuantitatif: sajikan P & Q (atau X & Y) dalam tabel Markdown rapi (| P | Q |) bila sesuai.
2. Tulis dulu skrip Python pembuktian (fractions.Fraction / decimal.Decimal untuk hitung & perbandingan, itertools.permutations untuk analitis, truth table / uji model himpunan untuk silogisme — DILARANG assert True kosong!) guna memastikan tepat 1 jawaban eksak dan ke-5 opsi bernilai unik serta berbeda dari angka contoh.
3. Semua pecahan, pangkat, akar, derajat, dan variabel wajib pakai KaTeX inline $...$ (mis. $\frac{3}{8}$, $x^2$, $\sqrt{225}$, desimal $0{,}75$) dan gunakan block math $$...$$ pada baris sendiri untuk persamaan akhir/panjang. Rupiah (Rp50.000) ditulis DI LUAR $...$.
4. PEMBAHASAN BERTAHAP & RAMAH BELAJAR (ANTI-WALL-OF-TEXT, ~60–120 kata):
   - DILARANG menulis seluruh langkah hitung/logika dalam 1 paragraf datar!
   - Baris 1: "Jawaban yang benar adalah **Opsi <HURUF>**."
   - Pisahkan dengan `\n\n`, lalu pecah langkah hitung/logika ke daftar bernomor (`1.`, `2.`, `3.`, ...) — 1 langkah per baris, akhiri persamaan kunci dengan `$$...$$` atau kesimpulan jelas.
   - Khusus soal Analitis visual (#39–42 seperti meja bundar/rute graf) & Deret loncat: sertakan pula skrip Python (matplotlib/Pillow) untuk menghasilkan diagram ilustrasi pembahasan (`q39_pembahasan.png`, dst., latar `#FFFFFF`) dan sisipkan di pembahasan sebagai `![Diagram pembahasan soal 39](<URL_ATAU_PATH>)`.
5. Keluarkan: (a) skrip Python verifikasi, lalu (b) array JSON valid sesuai schema TOCPNS (1 opsi skor 5, 4 opsi skor 0).

Contoh soal acuan (dari Packet 1–15):
[TEMPEL 4–5 SOAL CONTOH DARI sample_anchor_questions.py DI SINI]
```

---

## Prompt 2B — Batch TIU Profil HOTS-UTBK (Ala `Packet 11–13`: Kecukupan Data, Kesetaraan Operasi, & Pola Tabel 2D)

*Jalankan `python scripts/sample_anchor_questions.py --batch TIU-4 --profile hots` atau `--batch TIU-5 --profile hots` lalu tempel hasilnya.*

```text
Buatkan tepat [6] soal TIU Profil HOTS-UTBK sub_category "[Kecukupan Data / Kesetaraan Operasi / Pola Bilangan]" nomor [X–Y] setara gaya Packet 11–13 berikut, dengan konteks, tabel, dan angka yang sepenuhnya baru!

Aturan wajib:
1. Jika Kecukupan Data:
   - Gunakan 5 opsi baku UTBK/SNBT ("Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (2) SAJA tidak cukup.", dst.).
   - Buktikan di skrip Python keempat kasus secara eksplisit: (1) saja (uji minimal 2 kasus valid jika tidak cukup), (2) saja, gabungan (1)+(2), sehingga tepat 1 opsi benar mutlak! Variasikan kunci (jangan semua jawab C).
2. Jika Kesetaraan Operasi & Estimasi:
   - Uji number sense (faktorisasi/komutatif: "$36 \times 45$ sama dengan $54 \times 30$" atau estimasi terdekat pecahan besar), buktikan eksak di Python bahwa hanya 1 opsi yang setara/terdekat.
3. Jika Pola Bilangan Tabel/Kotak 2D:
   - Sajikan dalam tabel Markdown rapi; buktikan di Python pola berlaku konsisten di semua baris/kotak contoh dan menghasilkan nilai unik untuk $x$.
4. Semua rumus pakai KaTeX $...$ (desimal $0{,}5$; Rupiah di luar $...$). Pembahasan WAJIB bertahap (anti-wall-of-text): baris 1 "Jawaban yang benar adalah **Opsi <HURUF>**." lalu `\n\n` diikuti daftar langkah bernomor (`1.`, `2.`, ...) atau uji pernyataan `(1)` & `(2)` per baris + `$$...$$` untuk persamaan kunci.
5. Keluarkan: (a) skrip Python verifikasi, lalu (b) array JSON valid sesuai schema TOCPNS.

Contoh soal acuan (dari Packet 11–13):
[TEMPEL 4–6 SOAL CONTOH DARI sample_anchor_questions.py --profile hots DI SINI]
```

---

## Prompt 3 — Batch TIU Figural (Generator Kode Python Deterministik + Matriks 3×3)

```text
Tulis skrip Python (Pillow atau matplotlib) untuk membuat 6 gambar soal TIU Figural orisinal ke data/generated/<kode_paket>/gambar/:
- q60_figural.png dan q61_figural.png: Analogi Gambar, misalnya perubahan unsur pada dua kelompok garis atau analogi spasial seperti hasil lipatan dan pasangan muka kubus.
- q62_figural.png dan q63_figural.png: Ketidaksamaan Gambar. Empat opsi berbagi dua sifat yang bisa diperiksa, misalnya keterhubungan dan keberadaan lintasan tertutup, atau simetri dan jumlah blok.
- q64_figural.png: Serial Gambar. Empat gambar menunjukkan urutan yang dapat diteruskan, misalnya penambahan dan penghapusan segmen pada dua bagian.
- q65_figural.png: Matriks 3×3. Tentukan kotak kosong berdasarkan komposisi garis atau bidang, atau kelengkapan dua kelompok unsur pada baris dan kolom.

Aturan keras:
1. Petakan minimal 4 mekanisme penalaran berbeda dalam setiap paket. Gunakan contoh Packet 1–15 untuk mempelajari ragam hubungan visual. Buat diagram baru. Mengganti bentuk, isian, arah, atau letak penanda pada templat yang sama tetap dihitung sebagai satu mekanisme. Batasi rotasi atau pergeseran titik sebagai mekanisme utama menjadi maksimal satu soal per paket.
2. Setiap soal harus dapat diselesaikan dengan minimal 2 kriteria objektif yang relevan. Kriteria dapat berupa aturan perubahan, sifat struktur, hasil lipatan, atau relasi antarbidang. Gunakan distraktor yang tampak masuk akal ketika peserta hanya memeriksa satu kriteria. Evaluasi kelima opsi dengan fungsi yang sama. Untuk Ketidaksamaan, tepat 4 opsi memenuhi kedua kriteria dan tepat 1 menyimpang. Untuk tipe lain, tepat 1 opsi memenuhi kedua kriteria.
3. Buktikan dengan `assert` bahwa kelima state A–E berbeda, kelima hasil render berbeda, dan hasil evaluasi cocok dengan kunci. Catat mekanisme, kriteria, dan hasil evaluasi per soal. Periksa semua gambar pada ukuran ponsel dengan latar putih (#FFFFFF), garis gelap (#111827), label yang terbaca, serta ruang untuk tombol perbesar. Simpan indikasi kunci hanya pada pembahasan.
4. Sertakan JSON untuk 6 soal dengan `sub_category: "Figural"`, satu gambar soal, lima gambar opsi, dan label "Gambar A" s.d. "Gambar E". Mulai pembahasan dengan "Jawaban yang benar adalah **Opsi <HURUF>**." diikuti `\n\n` dan langkah bernomor yang menjelaskan kedua kriteria dan temuan pada gambar ini. Sertakan diagram pembahasan bila membantu. Gunakan istilah CPNS yang netral; hindari nama aplikasi, slogan metode, watermark, dan rujukan ke proses penyalinan sumber pada materi peserta.
```

---

## Prompt 4 — Batch TKP (Kontras Tajam 5→1, Anti-Klise, & Format Tervalidasi Otomatis)

*Jalankan `python scripts/sample_anchor_questions.py --batch TKP-X --count 5` lalu tempel hasilnya.*

```text
Buatkan tepat [7/8/9] soal TKP sub_category "[Pelayanan Publik / Jejaring Kerja / Sosial Budaya / Teknologi Informasi dan Komunikasi / Profesionalisme / Anti Radikalisme]" nomor [X–Y] dengan gaya dilema kerja ASN/publik, panjang soal, dan tingkat kesulitan setara contoh berikut, menggunakan latar instansi, profesi, dan situasi yang beragam serta sepenuhnya baru.

Aturan wajib:
1. Wajib 5 bobot unik: 5, 4, 3, 2, 1 (tanpa nilai kembar):
   - 5: Proaktif, solutif tuntas, empatik, taat SOP/aturan, menjaga integritas & kolaborasi.
   - 4: Positif, sopan, dan kooperatif, tetapi kurang tuntas atau kurang inisiatif dibanding opsi 5 (HARUS jelas bedanya dari skor 5, tidak boleh ambigu!).
   - 3: Normatif kaku, terlalu formalistik, atau pasif menunggu arahan.
   - 2: Kurang peduli, menunda, atau melempar tanggung jawab ke pihak lain.
   - 1: Reaktif/defensif, melanggar prosedur, atau permisif terhadap pelanggaran/intoleransi — TETAP ditulis dalam bahasa yang wajar/rasional (bukan "penjahat kartun" yang terlalu mudah ditebak).
2. ANTI-BIAS PANJANG, ANTI-KOMA-3-AKSI, & ANTI-KLISE: Panjang ke-5 opsi WAJIB seimbang secara kata MAUPUN karakter (selisih jumlah kata opsi skor 5 terhadap rata-rata 4 opsi lain <= 5 kata). DILARANG membuat hanya opsi skor 5 yang memakai daftar 3 aksi berkoma ("melakukan A, B, dan C") sementara skor 1–3 tanpa koma — variasikan kalimat 1 klausa dan kalimat berkoma secara merata di semua bobot 5–4–3–2–1! Hindari pengulangan frasa klise seperti "berkoordinasi secara proaktif dan humanis" atau "secara objektif".
3. PEMBAHASAN TERVALIDASI OTOMATIS & RAMAH BACA (ANTI-WALL-OF-TEXT, ~80–130 kata):
   - DILARANG menggabungkan 5 opsi dalam 1 paragraf panjang!
   - Baris 1: "Jawaban dengan skor tertinggi adalah **Opsi <HURUF>** (5 poin)."
   - Pisahkan dengan `\n\n`, lalu uraikan kelima opsi terurut 5 → 1 sebagai daftar bullet per baris:
     - **Opsi <H5> (5 poin):** <alasan singkat>.
     - **Opsi <H4> (4 poin):** <alasan singkat>.
     - **Opsi <H3> (3 poin):** <alasan singkat>.
     - **Opsi <H2> (2 poin):** <alasan singkat>.
     - **Opsi <H1> (1 poin):** <alasan singkat>.
   - Pastikan seluruh 5 huruf & bobot cocok 100% dengan objek options!
4. Keluarkan HANYA array JSON valid sesuai schema TOCPNS.

Contoh soal acuan (dari Packet 1–15):
[TEMPEL 3–5 SOAL CONTOH DARI sample_anchor_questions.py DI SINI]
```

---

## Prompt 5 — Audit Cepat Silang Model (Pasca-Generate)

> Untuk audit lengkap 110 soal tanpa *context fatigue*, jalankan `--export-blind-audit` lalu pakai **Prompt 6A–6D** di [CROSS_MODEL_REVIEW.md](file:///d:/Project/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md).

Untuk cek cepat satu batch kecil di model AI berbeda:

```text
Kamu adalah auditor soal CPNS yang kritis dan skeptis. Periksa batch soal JSON terlampir dan laporkan HANYA soal yang memiliki cacat nyata:
1. TWK: Salah fakta pasal UUD 1945 / UU ASN 20/2023 / UU 23/2019 / ejaan KBBI VI & EYD V, atau pengecoh ternyata juga benar.
2. TIU: Salah hitung, jawaban ganda, 2 opsi ekuivalen, soal kurang data, atau angka masih identik dengan soal populer (hitung ulang dari nol!).
3. TKP: Opsi skor 4 terasa lebih baik/setara skor 5, skor 5 ketahuan karena jauh paling panjang/klise, skor 1 terasa kartun, atau rincian Opsi X=5..1 di pembahasan tidak cocok dengan bobot skor.
4. Konsistensi & Keterbacaan Pembahasan: Nama tokoh atau huruf kunci di pembahasan berbeda dari soal/skor, ada artefak AI, sintaks KaTeX/Rp salah, atau pembahasan TIU/TKP masih berupa 1 paragraf padat tanpa langkah bernomor/bullet (`\n`).

Tampilkan dalam tabel: | Nomor | Tingkat (KRITIS/MAYOR) | Masalah | Perbaikan Eksak |
Jika bersih, tulis: "LULUS AUDIT (0 TEMUAN)".
```
