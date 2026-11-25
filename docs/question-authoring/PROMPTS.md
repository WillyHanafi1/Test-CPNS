# PROMPTS.md — Prompt Presisi, Ringkas, & Terkalibrasi 15 Paket (`Packet 1–15`) + Paket Generated

Semua prompt di bawah bebas parameter rumit, mengambil contoh nyata lintas sumber (`Packet 1–15`) secara *Just-In-Time* lewat `scripts/sample_anchor_questions.py`, dan 100% selaras dengan `scripts/validate_question_pack.py` (termasuk pengelompokan blok `--group-by-blocks`, anti-overlap lintas `Packet 1–15` **dan** `data/generated/*`, serta validasi KaTeX/Figural/TKP) dan `scripts/shuffle_answers.py`.

---

## Prompt 0 — Perintah Tunggal untuk AI Agent Mandiri (Generate 110 Soal)

Salin blok ini, ganti `gen04`, judul paket, seed (`4`), dan pilih profil (`standard` atau `hots`), lalu kirim ke AI Agent di workspace `d:\ProjectAI\Test-CPNS`:

```text
Buatkan 1 paket lengkap SKD CPNS (110 soal siap impor ke TOCPNS) secara mandiri:
- Kode paket: gen04
- Judul paket: Tryout SKD CPNS 2026 #4
- Profil TIU: standard   (pilih "standard" ala Packet 1-10/14-15, atau "hots" ala Packet 11-13)
- Seed sampling contoh: 4
- Seed pengurutan blok & acak kunci: 404   (WAJIB beda dari paket sebelumnya agar urutan blok & kunci tidak sama!)
- Folder kerja: data/generated/gen04/

Aturan kerja (jaga konteks tetap ringan & presisi!):
1. Baca HANYA docs/question-authoring/RULES.md, docs/question-authoring/BLUEPRINT.md, dan docs/question-authoring/AGENT.md di awal. JANGAN baca seluruh folder references/ maupun file JSON Packet 1-15 secara utuh!
2. Cek ringkas daftar topik/pasal/kata baku/pola yang sudah dipakai di paket generated sebelumnya (data/generated/*/*-bank-soal-final.json — cukup grep ringkas judul pasal/kata kunci, jangan baca penuh) agar TIDAK mengulang pasal UUD/UU yang sama, kata baku yang sama, skenario TKP yang sama, atau pola figural yang sama antar-paket!
3. Kerjakan per batch kecil (18 batch sesuai BLUEPRINT.md, masing-masing 4–9 soal) di data/generated/gen04/batches/.
   - Sebelum menulis 1 batch, jalankan:
     python scripts/sample_anchor_questions.py --batch <KODE_BATCH> --profile <standard|hots> --count 5 --seed <SEED>
   - Gunakan HANYA contoh dari output skrip tersebut sebagai patokan gaya, panjang, dan kompleksitas!
   - Catat nama tokoh & instansi yang sudah dipakai di data/generated/gen04/used_entities.txt agar tidak ada nama tokoh yang berulang dalam 1 paket.
   - Setiap soal WAJIB mengisi `sub_category` granular kanonik (persis ejaan RULES.md § 2B — DILARANG kosong atau memakai label umum "Verbal"/"Numerik"), karena badge `sub_category` tampil langsung pada kartu soal di UI Ujian & Pembahasan.
   - Jika didukung subagent/pekerja paralel, pisahkan pengerjaan per segmen (TWK / TIU Non-Figural / TIU Figural / TKP) agar batch akhir TKP bebas context drift.
4. Cara membuat variasi & kualitas per segmen:
   - TWK (#1–30): Buat kasus, instansi, & tokoh baru; patuhi 6 sub-tipe wajib Bahasa Indonesia (Ide Pokok, Inti/Struktur Kalimat, Simpulan/Judul, Kalimat Efektif, Kata Baku/Diksi/Imbuhan, EYD V). Cek pasal/ejaan di docs/question-authoring/references/ secara on-demand (grep/potongan baris saja). Pembahasan (~60–110 kata) DILARANG berupa 1 paragraf padat: mulai "Jawaban yang benar adalah **Opsi X**." lalu `\n\n` diikuti penjelasan konsep/pasal, lalu `\n\n` alasan penolakan pengecoh terkuat (bullet `- **Opsi Y:** ...` bila >1 pengecoh).
   - TIU Verbal & Numerik (#31–59): Pertahankan konsep & kompleksitas contoh, tetapi PARAFRASE kalimat, ganti konteks/angka, dan variasikan target pertanyaan (jangan ulang arketipe persis pada nomor yang sama seperti paket sebelumnya!).
     * TIU-1 wajib 2 Analogi Kata + 2 Analogi Kalimat; Silogisme wajib 3 Kuantor + 1 Implikasi/Kontraposisi; Deret wajib 3 pola berbeda (termasuk 1 loncat/2-larik & 1 cari suku awal `..., a, b`).
     * Buktikan SELURUH #35–59 di data/generated/gen04/verify/verify_tiu_math_logic.py (Fraction/Decimal untuk numerik, permutations untuk analitis, truth table/uji model himpunan nyata untuk silogisme — dilarang assert True kosong!).
     * KaTeX WAJIB kompatibel remark-math v6: gunakan inline `$...$` (desimal `0{,}75`, Rupiah `Rp50.000` DI LUAR `$...$`, tabel kuantitatif pakai Markdown `| P | Q |`). Untuk block math, WAJIB multi-baris (`$$` buka dan `$$` tutup pada baris sendiri, sejajar indentasi bila di dalam daftar bernomor) — DILARANG menulis `$$...$$` dalam 1 baris karena merender inline!
     * Pembahasan TIU WAJIB terstruktur bertahap (anti-wall-of-text): baris 1 "Jawaban yang benar adalah **Opsi X**." lalu `\n\n` diikuti langkah bernomor (`1.`, `2.`, `3.`, ...) per baris + block math multi-baris `$$\n...\n$$` untuk persamaan kunci.
     * Untuk soal Analitis visual (meja bundar, rute/graf) dan Deret loncat/mundur, buat diagram ilustrasi pembahasan berlatar `#FFFFFF` di data/generated/gen04/gambar/ dengan NAMA BERKAS & JUDUL BEBAS NOMOR SOAL (contoh: `diagram_meja_bundar.png`, `diagram_graf_rute.png`, `diagram_deret_2larik.png`, `diagram_deret_mundur.png` — DILARANG menulis `(Soal #39)` di judul PNG atau `q39_pembahasan.png` agar tetap konsisten pasca pengurutan blok!). Sisipkan sebagai `![Diagram ilustrasi meja bundar](gambar/diagram_meja_bundar.png)` (ganti ke URL publik Supabase saat upload).
   - TIU Figural (#60–65): Ikuti Prompt 3. Buat 6 soal deterministik (2 Analogi, 2 Ketidaksamaan, 1 Serial, 1 Matriks 3×3) dengan minimal 4 mekanisme penalaran berbeda & minimal 2 kriteria objektif per soal. WAJIB format gambar TERPISAH ramah mobile di `data/generated/gen04/gambar/figural/q060/{soal,opsi-a,opsi-b,opsi-c,opsi-d,opsi-e,pembahasan}.png` (total 42 PNG B&W `#111827` di atas `#FFFFFF`), `option.content = ""`, `option.image_url = <path/URL>`, buktikan `assert` 5 state unik + 5 SHA-256 PNG opsi unik, dan sebar kunci 6 soal lintas huruf `A–E` (jangan menumpuk di 1–2 huruf!). Simpan skrip di `data/generated/gen04/verify/generate_figural.py`.
   - TKP (#66–110): Buat skenario kerja & tokoh baru; panjang 5 opsi seimbang secara kata MAUPUN karakter (selisih skor 5 vs rata-rata lain <= 5 kata); kontras skor 5 vs 4 tegas; skor 1 tetap terdengar wajar/rasional (bukan kartun); **ANTI-BIAS KOMA**: variasikan kalimat 0-koma (1 klausa) dan berkoma (2–3 aksi) secara merata di semua bobot 5–4–3–2–1 agar tidak kena `tkp_comma_bias`! Pembahasan WAJIB memakai format bullet per baris (anti-wall-of-text): baris 1 "Jawaban dengan skor tertinggi adalah **Opsi X** (5 poin)." lalu `\n\n` diikuti daftar 5 bullet berurutan 5→1 (`- **Opsi X (5 poin):** ...` sampai `1 poin`) dengan alasan SUBSTANTIF spesifik konteks — DILARANG frasa template robotik ("Usulnya adalah...", "Tindakan ini memberi respons terbatas", "mendapat bobot paling rendah dalam rubrik").
   - Pastikan tidak ada tanda hubung `-` menggantung di akhir teks opsi mana pun.
5. INSPEKSI VISUAL WAJIB: Setelah render, buka & periksa langsung SELURUH PNG Figural (42 file / panel kompositnya) DAN seluruh PNG diagram pembahasan TIU untuk memastikan 0 label bertumpuk, 0 garis terpotong, 0 opsi terlihat kembar, dan terbaca jelas di layar ponsel.
6. Validasi setiap batch segera: python scripts/validate_question_pack.py <file_batch> --partial.
7. Setelah 18 batch lulus, gabungkan ke data/generated/gen04/gen04-bank-soal.json lalu jalankan pipeline pengelompokan blok + acak kunci seimbang:
   python scripts/validate_question_pack.py data/generated/gen04/gen04-bank-soal.json --shuffle --group-by-blocks --seed <SEED_BLOK> --export-json data/generated/gen04/gen04-bank-soal-final.json --export-csv data/generated/gen04/gen04-impor-final.csv --export-xlsx data/generated/gen04/gen04-impor-final.xlsx --report data/generated/gen04/audit-report.md --export-blind-audit data/generated/gen04/cross_audit/
   Catatan `--group-by-blocks` (Aturan Baku Urutan Server):
   - TWK (#1–30): 5 blok sub-materi terkumpul utuh, urutan antar-blok berganti antar-paket.
   - TIU (#31–65): 3 rumpun besar berurutan (`Verbal → Numerik → Figural`), tiap sub-materi granular terkumpul utuh dalam 1 blok (tidak pernah terpencar lintas nomor), urutan sub-blok di dalam Verbal & Numerik berganti antar-paket.
   - TKP (#66–110): 6 blok aspek terkumpul utuh, urutan antar-blok berganti antar-paket.
   - Distribusi kunci non-figural merata `A–E` (~20% per huruf, `max - min <= 1`, `max_streak <= 2`, bebas siklus).
8. VERIFIKASI FINAL WAJIB:
   - `verify_tiu_math_logic.py` exit code 0 dan `generate_figural.py` exit code 0.
   - `python scripts/validate_question_pack.py data/generated/gen04/gen04-impor-final.xlsx` menghasilkan **0 Hard Errors dan 0 Warnings** (termasuk anti-overlap terhadap seluruh `Packet 1–15` DAN paket `data/generated/*` sebelumnya!).
   - Uji seluruh teks `content`, `options`, dan `discussion` dengan parser KaTeX frontend (`remark-math` + `rehype-katex`) untuk memastikan **0 `.katex-error`** dan **0 tanda `$` mentah**.
   - Jangan ubah backend/ atau frontend/, dan jangan impor ke DB produksi sebelum saya meninjau hasilnya.
```

---

## Prompt 1 — Batch TWK (Mode Web Chat, Konteks Ringan)

*Jalankan `python scripts/sample_anchor_questions.py --batch TWK-X --count 4` lalu tempel hasilnya di bagian contoh.*

```text
Buatkan tepat [5/6/8] soal TWK sub_category "[Nasionalisme / Integritas / Bela Negara / Pilar Negara / Bahasa Indonesia]" nomor [X–Y] dengan gaya, panjang kalimat, dan tingkat kesulitan setara soal contoh berikut, menggunakan kasus, instansi, dan tokoh yang sepenuhnya baru (juga berbeda dari paket generated sebelumnya).

Aturan wajib:
1. Fakta pasal UUD 1945, UU ASN 20/2023, UU Bela Negara 23/2019, serta ejaan KBBI VI & EYD V wajib 100% akurat (jangan mengarang pasal/ayat, dan jangan mengulang pasal/kata baku yang sudah keluar di paket sebelumnya).
2. Jika Bahasa Indonesia (6 soal), wajib mencakup 6 sub-tipe berbeda: (1) Ide Pokok, (2) Inti/Struktur Kalimat, (3) Simpulan/Judul, (4) Kalimat Efektif, (5) Kata Baku/Diksi/Imbuhan, (6) EYD V (Kapital/Tanda Baca).
3. Isi field `sub_category` persis sesuai nama kanonik di atas (akan tampil sebagai badge di UI Ujian & Pembahasan). Buat 5 opsi (A–E) yang panjangnya relatif seimbang, bebas tanda `-` menggantung di akhir kalimat, dan semua terdengar masuk akal (tepat 1 opsi skor 5, 4 opsi lain skor 0). Jangan mengulang nama tokoh yang sama.
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
Buatkan tepat [4/6/7] soal TIU dengan `sub_category` granular persis "[Analogi / Silogisme / Analitis / Berhitung / Deret Angka / Perbandingan Kuantitatif / Soal Cerita]" (DILARANG pakai label umum "Verbal"/"Numerik") nomor [X–Y] dengan mempertahankan KONSEP dan KOMPLEKSITAS contoh berikut, tetapi WAJIB parafrase struktur kalimat, ganti konteks/objek, ganti seluruh angka, serta buat 4 pengecoh baru yang realistis!

Aturan wajib:
1. Khusus kuota variasi:
   - Jika Analogi (4 soal): wajib tepat 2 Analogi Kata + 2 Analogi Kalimat.
   - Jika Silogisme (4 soal): wajib 3 Kuantor (Semua/Sebagian) + 1 Implikasi/Kontraposisi (Jika–Maka).
   - Jika Analitis (4 soal): wajib 4 skenario berbeda (Meja Bundar/Posisi, Urutan/Peringkat, Jadwal/Seleksi Tabel, Rute/Graf).
   - Jika Deret Angka (3 soal): wajib 3 pola berbeda — (a) loncat/2-larik, (b) operasi bergantian (minimal 1 mencari suku awal "..., a, b"), (c) bertingkat/Fibonacci/deret pecahan.
   - Jika Perbandingan Kuantitatif (4 soal): sajikan P & Q (atau X & Y) dalam tabel Markdown rapi (`| P | Q |`) bila sesuai; variasikan tipe hubungan (`P > Q`, `P < Q`, `P = Q`, `2P > 3Q`, atau "Informasi tidak cukup") dan jangan menaruh pola sama di urutan identik dengan paket lain.
2. Tulis dulu skrip Python pembuktian (`fractions.Fraction` / `decimal.Decimal` untuk hitung & perbandingan, `itertools.permutations` untuk analitis, truth table / uji model himpunan untuk silogisme — DILARANG `assert True` kosong!) guna memastikan tepat 1 jawaban eksak dan ke-5 opsi bernilai unik serta berbeda dari angka contoh.
3. ATURAN KaTeX (`remark-math` v6):
   - Semua pecahan, pangkat, akar, derajat, dan variabel wajib pakai KaTeX inline `$...$` (mis. `$\frac{3}{8}$`, `$x^2$`, `$\sqrt{225}$`, desimal `$0{,}75$`).
   - Rupiah (`Rp50.000`) ditulis DI LUAR `$...$`.
   - Untuk block math, WAJIB multi-baris (`$$` buka dan `$$` tutup pada baris sendiri, sejajar indentasi bila di dalam daftar bernomor):
     $$
     x = \frac{120}{4} = 30
     $$
     DILARANG keras menulis `$$...$$` dalam 1 baris (akan dirender inline, bukan display math!).
4. PEMBAHASAN BERTAHAP & RAMAH BELAJAR (ANTI-WALL-OF-TEXT, ~60–120 kata):
   - DILARANG menulis seluruh langkah hitung/logika dalam 1 paragraf datar!
   - Baris 1: `"Jawaban yang benar adalah **Opsi <HURUF>**."`
   - Pisahkan dengan `\n\n`, lalu pecah langkah hitung/logika ke daftar bernomor (`1.`, `2.`, `3.`, ...) — 1 langkah per baris, akhiri persamaan kunci dengan block math multi-baris `$$\n...\n$$` atau kesimpulan jelas.
   - Khusus soal Analitis visual (meja bundar / rute graf) & Deret loncat/mundur: sertakan skrip Python (matplotlib/Pillow) menghasilkan diagram ilustrasi pembahasan berlatar `#FFFFFF` dengan NAMA BERKAS & JUDUL BEBAS NOMOR SOAL (mis. `diagram_meja_bundar.png`, `diagram_graf_rute.png`, `diagram_deret_2larik.png` — DILARANG `q39_pembahasan.png` atau judul `(Soal #39)`!) dan sisipkan sebagai `![Diagram ilustrasi meja bundar](<URL_ATAU_PATH>)`. Periksa visual PNG agar tidak ada label bertumpuk.
5. Keluarkan: (a) skrip Python verifikasi, lalu (b) array JSON valid sesuai schema TOCPNS (1 opsi skor 5, 4 opsi skor 0; bebas tanda `-` menggantung di akhir opsi).

Contoh soal acuan (dari Packet 1–15):
[TEMPEL 4–5 SOAL CONTOH DARI sample_anchor_questions.py DI SINI]
```

---

## Prompt 2B — Batch TIU Profil HOTS-UTBK (Ala `Packet 11–13`: Kecukupan Data, Kesetaraan Operasi, & Pola Tabel 2D)

*Jalankan `python scripts/sample_anchor_questions.py --batch TIU-4 --profile hots` atau `--batch TIU-5 --profile hots` lalu tempel hasilnya.*

```text
Buatkan tepat [6] soal TIU Profil HOTS-UTBK dengan `sub_category` granular persis "[Kecukupan Data / Kesetaraan Operasi / Pola Bilangan]" nomor [X–Y] setara gaya Packet 11–13 berikut, dengan konteks, tabel, dan angka yang sepenuhnya baru!

Aturan wajib:
1. Jika Kecukupan Data:
   - Gunakan 5 opsi baku UTBK/SNBT ("Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (2) SAJA tidak cukup.", dst.).
   - Buktikan di skrip Python keempat kasus secara eksplisit: (1) saja (uji minimal 2 kasus valid jika tidak cukup), (2) saja, gabungan (1)+(2), sehingga tepat 1 opsi benar mutlak! Variasikan kunci (jangan semua jawab C).
2. Jika Kesetaraan Operasi & Estimasi:
   - Uji number sense (faktorisasi/komutatif: "$36 \times 45$ sama dengan $54 \times 30$" atau estimasi terdekat pecahan besar), buktikan eksak di Python bahwa hanya 1 opsi yang setara/terdekat.
3. Jika Pola Bilangan Tabel/Kotak 2D:
   - Sajikan dalam tabel Markdown rapi; buktikan di Python pola berlaku konsisten di semua baris/kotak contoh dan menghasilkan nilai unik untuk $x$.
4. Semua rumus pakai KaTeX inline `$...$` (desimal `$0{,}5$`; Rupiah di luar `$...$`) dan block math WAJIB multi-baris (`$$` buka & tutup pada baris terpisah — dilarang 1 baris `$$...$$`). Pembahasan WAJIB bertahap (anti-wall-of-text): baris 1 `"Jawaban yang benar adalah **Opsi <HURUF>**."` lalu `\n\n` diikuti daftar langkah bernomor (`1.`, `2.`, ...) atau uji pernyataan `(1)` & `(2)` per baris + block math multi-baris `$$\n...\n$$` untuk persamaan kunci.
5. Keluarkan: (a) skrip Python verifikasi, lalu (b) array JSON valid sesuai schema TOCPNS.

Contoh soal acuan (dari Packet 11–13):
[TEMPEL 4–6 SOAL CONTOH DARI sample_anchor_questions.py --profile hots DI SINI]
```

---

## Prompt 3 — Batch TIU Figural (Generator Kode Python Deterministik, Gambar Terpisah Ramah Mobile, + Matriks 3×3)

```text
Tulis skrip Python (Pillow atau matplotlib) di `data/generated/<kode_paket>/verify/generate_figural.py` untuk membuat 6 soal TIU Figural orisinal dalam FORMAT GAMBAR TERPISAH (ramah mobile, 7 PNG per soal = total 42 PNG) di `data/generated/<kode_paket>/gambar/figural/q060/` s.d. `q065/`:
- q060 & q061: Analogi Gambar (mis. perubahan unsur pada dua kelompok garis, refleksi + komposisi bidang, atau analogi spasial lipatan/muka kubus).
- q062 & q063: Ketidaksamaan Gambar (4 opsi berbagi dua sifat objektif yang dapat diperiksa, mis. keterhubungan & lintasan tertutup, atau simetri & paritas blok; tepat 1 opsi menyimpang).
- q064: Serial Gambar (4 kotak urutan yang diteruskan ke kotak ke-5, mis. penambahan/penghapusan segmen pada dua sub-unsur).
- q065: Matriks 3×3 (tentukan sel kanan-bawah `?` berdasarkan komposisi garis/bidang atau kelengkapan dua kelompok unsur di setiap baris & kolom).

Struktur berkas wajib per soal (`q060`..`q065`):
- `soal.png` (panel soal/prompt saja — tanpa panel opsi A–E di dalamnya!)
- `opsi-a.png`, `opsi-b.png`, `opsi-c.png`, `opsi-d.png`, `opsi-e.png` (5 gambar opsi terpisah rasio persegi/rapi, tanpa teks jawaban di dalamnya)
- `pembahasan.png` (diagram anotasi visual pembahasan, judul BEBAS nomor soal `(Soal #XX)` agar aman saat urutan nomor berubah)

Aturan keras:
1. Petakan minimal 4 mekanisme penalaran berbeda dalam setiap paket (dan hindari mengulang mekanisme identik dari paket generated sebelumnya). Mengganti bentuk, isian, arah, atau letak penanda pada templat yang sama tetap dihitung sebagai satu mekanisme. Batasi rotasi atau pergeseran titik sebagai mekanisme utama maksimal satu soal per paket.
2. Setiap soal harus dapat diselesaikan dengan minimal 2 kriteria objektif yang relevan. Gunakan distraktor yang tampak masuk akal ketika peserta hanya memeriksa satu kriteria. Evaluasi kelima opsi dengan fungsi deterministik yang sama: untuk Ketidaksamaan, tepat 4 opsi memenuhi kedua kriteria dan tepat 1 menyimpang; untuk tipe lain, tepat 1 opsi memenuhi kedua kriteria.
3. Buktikan dengan `assert` di Python bahwa:
   - kelima state opsi A–E berbeda,
   - kelima berkas PNG `opsi-a.png`..`opsi-e.png` memiliki SHA-256 hash yang 100% berbeda,
   - hasil evaluasi cocok dengan kunci.
   Sebar huruf kunci 6 soal figural lintas huruf `A–E` (maksimal 2 soal berbagi huruf kunci yang sama, hindari kunci menumpuk di A/B saja).
4. Palet & keterbacaan mobile: latar putih bersih (`#FFFFFF`), garis hitam tajam (`#111827`), stroke tegas & kontras tinggi (B&W), tanpa bocoran warna kunci pada `soal.png` maupun `opsi-*.png`. WAJIB inspeksi visual semua PNG hasil render pada lebar layar ponsel (0 tabrakan garis, 0 potongan tepi, 0 label buram).
5. Sertakan JSON untuk 6 soal dengan `sub_category: "Figural"`, `image_url` menunjuk ke `soal.png`, setiap opsi memiliki `"content": ""` (kosong, BUKAN teks `"Gambar A"`!) dan `"image_url"` menunjuk ke `opsi-a.png`..`opsi-e.png` (nanti diganti URL HTTPS Supabase `exam-assets/figural/<kode_paket>/q06X/...`). Mulai pembahasan dengan `"Jawaban yang benar adalah **Opsi <HURUF>**."` diikuti `\n\n`, langkah bernomor menjelaskan kedua kriteria, dan sisipan `![Diagram pembahasan figural](<URL_PEMBAHASAN>)`. Gunakan istilah CPNS netral tanpa nama aplikasi, watermark, atau referensi sumber.
```

---

## Prompt 4 — Batch TKP (Kontras Tajam 5→1, Anti-Bias Koma/Panjang, & Anti-Boilerplate)

*Jalankan `python scripts/sample_anchor_questions.py --batch TKP-X --count 5` lalu tempel hasilnya.*

```text
Buatkan tepat [7/8/9] soal TKP dengan `sub_category` persis "[Pelayanan Publik / Jejaring Kerja / Sosial Budaya / Teknologi Informasi dan Komunikasi / Profesionalisme / Anti Radikalisme]" nomor [X–Y] dengan gaya dilema kerja ASN/publik, panjang soal, dan tingkat kesulitan setara contoh berikut, menggunakan latar instansi, profesi, dan situasi yang beragam serta sepenuhnya baru (tidak mengulang kasus/tokoh dari paket sebelumnya).

Aturan wajib:
1. Wajib 5 bobot unik: 5, 4, 3, 2, 1 (tanpa nilai kembar):
   - 5: Proaktif, solutif tuntas, empatik, taat SOP/aturan, menjaga integritas & kolaborasi.
   - 4: Positif, sopan, dan kooperatif, tetapi kurang tuntas atau kurang inisiatif dibanding opsi 5 (HARUS jelas bedanya dari skor 5, tidak boleh ambigu!).
   - 3: Normatif kaku, terlalu formalistik, atau pasif menunggu arahan.
   - 2: Kurang peduli, menunda, atau melempar tanggung jawab ke pihak lain.
   - 1: Reaktif/defensif, melanggar prosedur, atau permisif terhadap pelanggaran/intoleransi — TETAP ditulis dalam bahasa yang wajar/rasional (bukan "penjahat kartun" yang terlalu mudah ditebak).
2. ANTI-BIAS PANJANG, ANTI-KOMA-3-AKSI, & ANTI-KLISE:
   - Panjang ke-5 opsi WAJIB seimbang secara kata MAUPUN karakter (selisih jumlah kata opsi skor 5 terhadap rata-rata 4 opsi lain <= 5 kata; target rasio skor 5 terpanjang <= 35%).
   - DILARANG membuat hanya opsi skor 5 yang memakai daftar 3 aksi berkoma ("melakukan A, B, dan C") sementara skor 1–3 tanpa koma! Variasikan kalimat 0-koma (1 klausa utuh) dan kalimat berkoma secara merata di SEMUA bobot 5–4–3–2–1 agar tidak memicu `tkp_comma_bias` (skor heuristik buta koma < 166/225).
   - Hindari pengulangan frasa klise seperti "berkoordinasi secara proaktif dan humanis" atau "secara objektif", serta pastikan tidak ada tanda `-` menggantung di akhir opsi.
3. PEMBAHASAN SUBSTANTIF, TERVALIDASI OTOMATIS, & RAMAH BACA (ANTI-WALL-OF-TEXT, ~80–130 kata):
   - DILARANG menggabungkan 5 opsi dalam 1 paragraf panjang!
   - Baris 1: `"Jawaban dengan skor tertinggi adalah **Opsi <HURUF>** (5 poin)."`
   - Pisahkan dengan `\n\n`, lalu uraikan kelima opsi terurut 5 → 1 sebagai daftar bullet per baris:
     - **Opsi <H5> (5 poin):** <alasan substantif spesifik kasus>.
     - **Opsi <H4> (4 poin):** <alasan substantif mengapa positif namun belum setuntas skor 5>.
     - **Opsi <H3> (3 poin):** <alasan substantif mengapa terlalu normatif/pasif>.
     - **Opsi <H2> (2 poin):** <alasan substantif mengapa kurang tanggap/melempar tanggung jawab>.
     - **Opsi <H1> (1 poin):** <alasan substantif dampak negatif/pelanggaran prosedur>.
   - DILARANG KERAS memakai kalimat template robotik generik ("Usulnya adalah...", "Tindakan ini memberi respons terbatas", "mendapat bobot paling rendah dalam rubrik", "menjadi perhatian yang belum terjawab")! Setiap poin harus menyebut tindakan konkret pada kasus soal.
   - Pastikan seluruh 5 huruf & bobot cocok 100% dengan objek `options`!
4. Keluarkan HANYA array JSON valid sesuai schema TOCPNS.

Contoh soal acuan (dari Packet 1–15):
[TEMPEL 3–5 SOAL CONTOH DARI sample_anchor_questions.py DI SINI]
```

---

## Prompt 5 — Audit Cepat Silang Model (Pasca-Generate)

> Untuk audit lengkap 110 soal tanpa *context fatigue*, jalankan `--export-blind-audit` lalu pakai **Prompt 6A–6D** di [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md).

Untuk cek cepat satu batch kecil di model AI berbeda:

```text
Kamu adalah auditor soal CPNS yang kritis dan skeptis. Periksa batch soal JSON terlampir dan laporkan HANYA soal yang memiliki cacat nyata:
1. TWK: Salah fakta pasal UUD 1945 / UU ASN 20/2023 / UU 23/2019 / ejaan KBBI VI & EYD V, pengecoh ternyata juga benar, atau mengulang pasal/kasus paket lain.
2. TIU: Salah hitung, jawaban ganda, 2 opsi ekuivalen, soal kurang data, angka identik soal populer, atau `sub_category` masih generik ("Verbal"/"Numerik"). Hitung ulang dari nol!
3. TKP: Opsi skor 4 terasa lebih baik/setara skor 5, skor 5 ketahuan karena jauh paling panjang / paling banyak koma / klise, skor 1 terasa kartun, pembahasan memakai kalimat template robotik, atau rincian Opsi X=5..1 di pembahasan tidak cocok dengan bobot skor.
4. Konsistensi, Visual, & Keterbacaan Pembahasan: Nama tokoh atau huruf kunci di pembahasan berbeda dari soal/skor, ada artefak AI, ada tanda `-` menggantung di akhir opsi, sintaks KaTeX/Rp salah atau memakai `$$...$$` 1 baris, diagram pembahasan masih memuat nomor `(Soal #XX)`, atau pembahasan TIU/TKP masih berupa 1 paragraf padat tanpa langkah bernomor/bullet (`\n`).

Tampilkan dalam tabel: | Nomor | Tingkat (KRITIS/MAYOR) | Masalah | Perbaikan Eksak |
Jika bersih, tulis: "LULUS AUDIT (0 TEMUAN)".
```
