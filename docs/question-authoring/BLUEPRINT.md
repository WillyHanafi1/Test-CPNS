# BLUEPRINT.md — Peta Slot 110 Soal (Terkalibrasi dari 15 Paket Nyata `Packet 1–15`)

Blueprint ini dirancang berdasarkan audit empiris terhadap seluruh **1.650 soal (`Packet 1–15`)** tanpa label tingkat kesulitan artifisial. Tingkat kesulitan dikalibrasi 1-ke-1 dengan mengambil contoh lintas sumber (`Packet 1–3` Sumber A + `Packet 4–15` Sumber B) melalui skrip [sample_anchor_questions.py](file:///d:/ProjectAI/Test-CPNS/scripts/sample_anchor_questions.py) — **jangan lagi menebak contoh berdasarkan rentang nomor mentah**, karena urutan topik di `vol17`/`vol18` bergeser dan TKP-nya teracak!

> **Catatan Penting Penomoran Blok (`--group-by-blocks`):**
> Nomor soal di tabel batch bawah ini (`#1–30`, `#31–65`, `#66–110`) adalah **nomor authoring awal per batch** agar mudah disusun & diverifikasi. Pada tahap finalisasi, jalankan `--shuffle --group-by-blocks --seed <SEED_UNIK_PAKET>` sehingga:
> - **TWK (`#1–30`):** 5 blok `sub_category` tetap berkelompok utuh, tetapi **urutan antar-blok berganti antar-paket**.
> - **TIU (`#31–65`):** 3 rumpun besar berurutan **`Verbal → Numerik → Figural`**, dengan setiap sub-materi granular terkumpul utuh dalam 1 sub-blok (tidak pernah terpencar lintas nomor seperti Deret di `#31` & `#65`) dan **urutan sub-blok di dalam Verbal & Numerik berganti antar-paket** (mencegah arketipe sama jatuh di nomor identik antar-paket seperti `#39` selalu Meja Bundar atau `#52` selalu Informasi tidak cukup).
> - **TKP (`#66–110`):** 6 blok aspek tetap berkelompok utuh, tetapi **urutan antar-blok berganti antar-paket**.

---

## 1. Kuota Wajib 110 Soal (Server TOCPNS & KepmenPAN-RB 321/2024)

| Segmen | Nomor | Jumlah | Skor | Passing Grade |
| :--- | :---: | :---: | :--- | :---: |
| **TWK** | `1–30` | **30** | Benar `5`, Salah `0` | `65` |
| **TIU** | `31–65` | **35** | Benar `5`, Salah `0` | `80` |
| **TKP** | `66–110` | **45** | 5 bobot unik `1, 2, 3, 4, 5` | `166` |

---

## 2. Profil A — Standar SKD BKN (Default, 18 Batch Kecil: 4–9 Soal/Batch)

Menggabungkan standar terbaik **Sumber A (`Packet 1–3`)** dan **Sumber B1 (`Packet 4–10, 14–15`)**. Setiap batch hanya 4–9 soal agar AI tetap tajam dan bebas *context fatigue*. Setiap soal **wajib** mengisi `sub_category` granular persis sesuai kolom tabel (ditampilkan langsung sebagai badge pada kartu soal di UI Ujian & Pembahasan).

### A. TWK (`#1–30`, 5 Batch = 30 Soal)
*Target gaya: ~45%–55% HOTS studi kasus situasional Indonesia, ~45%–55% konseptual/pasal/analisis bacaan. Verifikasi fakta/pasal/ejaan secara **on-demand** di `references/`, dan hindari mengulang pasal/kata baku dari paket `data/generated/*` sebelumnya.*

| Batch | Nomor Awal | `sub_category` | Jml | Perintah Ambil Contoh (`Packet 1–15`) | Komposisi Sub-Materi Wajib |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TWK-1** | `1–6` | `Nasionalisme` | 6 | `python scripts/sample_anchor_questions.py --batch TWK-1 --count 5 --seed <S>` | 2 Sejarah & Pergerakan Nasional, 2 Identitas/Budaya/Globalisasi, 2 Kebangsaan Kontemporer |
| **TWK-2** | `7–11` | `Integritas` | 5 | `python scripts/sample_anchor_questions.py --batch TWK-2 --count 5 --seed <S>` | 2 Antikorupsi/Gratifikasi/Konflik Kepentingan, 3 Implementasi 9 Nilai Integritas & Etika ASN (UU 20/2023) |
| **TWK-3** | `12–16` | `Bela Negara` | 5 | `python scripts/sample_anchor_questions.py --batch TWK-3 --count 5 --seed <S>` | 2 Ancaman Nonmiliter/Siber/Sishankamrata (UU 23/2019), 2 Implementasi 5 Nilai Dasar, 1 Peran Profesi/ASN |
| **TWK-4** | `17–24` | `Pilar Negara` | 8 | `python scripts/sample_anchor_questions.py --batch TWK-4 --count 6 --seed <S>` | 3 UUD 1945 & Ketatanegaraan/Lembaga Negara, 3 Pancasila (Nilai/Sila/Ideologi), 2 Bhinneka Tunggal Ika & NKRI |
| **TWK-5** | `25–30` | `Bahasa Indonesia` | 6 | `python scripts/sample_anchor_questions.py --batch TWK-5 --count 6 --seed <S>` | **Wajib 6 sub-tipe berbeda:** Ide Pokok, Inti/Struktur/Kepaduan Kalimat, Simpulan/Judul Bacaan, Kalimat Efektif, Kata Baku/Diksi/Imbuhan (KBBI VI), EYD V (Kapital/Tanda Baca) |

---

### B. TIU (`#31–65`, 7 Batch = 35 Soal)
*Strategi variasi: Pertahankan **konsep & tingkat kompleksitas** soal contoh, lalu **parafrase struktur kalimat, ganti konteks/tokoh/angka, dan ubah target pertanyaan bila sesuai**. Semua hitungan & logika `#35–59` **wajib dibuktikan Python** (`Fraction`/`Decimal`/`permutations`/truth table), seluruh block math memakai format multi-baris `$$\n...\n$$`, dan diagram ilustrasi memakai nama berkas serta judul bebas nomor soal (`diagram_meja_bundar.png`, dst.).*

| Batch | Nomor Awal | `sub_category` | Jml | Perintah Ambil Contoh (`Packet 1–15`) | Komposisi Sub-Jenis & Metode Verifikasi Wajib |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TIU-1** | `31–34` | `Analogi` | 4 | `python scripts/sample_anchor_questions.py --batch TIU-1 --count 4 --seed <S>` | **Wajib 2 Analogi Kata + 2 Analogi Kalimat** (hubungan setara antarkalimat) |
| **TIU-2** | `35–38` | `Silogisme` | 4 | `python scripts/sample_anchor_questions.py --batch TIU-2 --count 4 --seed <S>` | **Wajib 3 Silogisme Kuantor (`Semua/Sebagian`) + 1 Implikasi/Kontraposisi (`Jika…maka…`)** — buktikan dengan *truth table* / uji model himpunan di Python |
| **TIU-3** | `39–42` | `Analitis` | 4 | `python scripts/sample_anchor_questions.py --batch TIU-3 --count 4 --seed <S>` | **Wajib 4 tipe beragam:** 1 Posisi/Duduk Melingkar, 1 Urutan/Peringkat, 1 Jadwal/Seleksi Tabel, 1 Rute/Graf — buktikan **tepat 1 solusi unik** via `itertools.permutations` + diagram bebas nomor (`diagram_meja_bundar.png`, `diagram_graf_rute.png`) |
| **TIU-4** | `43–48` | `Berhitung` (3) & `Deret Angka` (3) | 6 | `python scripts/sample_anchor_questions.py --batch TIU-4 --count 6 --seed <S>` | **Berhitung (3):** pecahan/desimal/persen/aljabar (`Fraction`/`Decimal`).<br>**Deret Angka (3) wajib 3 pola berbeda:** 1 loncat/2-larik, 1 operasi bergantian (minimal 1 soal mencari suku awal `..., a, b`), 1 bertingkat/Fibonacci/deret pecahan + diagram bebas nomor (`diagram_deret_2larik.png`, `diagram_deret_mundur.png`) |
| **TIU-5** | `49–52` | `Perbandingan Kuantitatif` | 4 | `python scripts/sample_anchor_questions.py --batch TIU-5 --count 4 --seed <S>` | Bandingkan kuantitas `P` vs `Q` atau `X` vs `Y` (pakai tabel Markdown rapi `\| P \| Q \|`, variasikan `P > Q`, `P < Q`, `2P > 3Q`, atau *"Informasi tidak cukup"* — buktikan dengan `Fraction`) |
| **TIU-6** | `53–59` | `Soal Cerita` | 7 | `python scripts/sample_anchor_questions.py --batch TIU-6 --count 6 --seed <S>` | 3 Perbandingan Senilai/Berbalik Nilai/Pekerja (termasuk 1 proyek terhenti), 1–2 Jarak–Kecepatan–Waktu (susul/berpapasan), 1 Aritmetika Sosial (diskon/untung/bunga), 1–2 Interpretasi Tabel Data / Statistika |
| **TIU-7** | `60–65` | `Figural` | 6 | `python scripts/sample_anchor_questions.py --batch TIU-7 --count 4 --seed <S>` | **Wajib 4 tipe:** 2 Analogi Gambar, 2 Ketidaksamaan Gambar, 1 Serial Gambar, 1 **Matriks 3×3**. Format **gambar terpisah ramah mobile** (`soal.png` + `opsi-a..e.png` + `pembahasan.png` = 42 PNG; `option.content = ""`). Minimal 4 mekanisme penalaran per paket, 2 kriteria objektif per soal, `assert` 5 state & 5 SHA-256 PNG unik, dan sebar kunci lintas `A–E`. |

> **Opsi Varian 8-Figural (`#58–65`, ala `Packet 4–15`):** Bila ingin porsi Figural lebih besar (8 soal seperti `Packet 8, 14, 15`), kurangi `TIU-6` menjadi 5 Soal Cerita (`#53–57`) dan perluas `TIU-7` menjadi 8 Figural (`#58–65`: 2 Serial, 2 Analogi, 2 Ketidaksamaan, 2 Matriks 3×3 — 56 PNG terpisah).

---

### C. TKP (`#66–110`, 6 Batch = 45 Soal)
*Semua 6 aspek wajib terisi seimbang (7–9 soal/aspek; larangan keras 0 soal di satu aspek). Variasikan struktur kalimat 0-koma dan berkoma di semua bobot `5–1`, jaga panjang 5 opsi seimbang, dan tulis pembahasan substantif bebas frasa boilerplate!*

| Batch | Nomor Awal | `sub_category` | Jml | Perintah Ambil Contoh (`Packet 1–15`) | Fokus Rubrik Skor `5 → 1` |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TKP-1** | `66–74` | `Pelayanan Publik` | 9 | `python scripts/sample_anchor_questions.py --batch TKP-1 --count 5 --seed <S>` | `5` Proaktif, solutif tuntas, empatik, taat SOP; `4` Sopan/baik tapi belum tuntas; `3` Normatif kaku; `2` Menunda/melempar; `1` Abai/melanggar SOP |
| **TKP-2** | `75–82` | `Jejaring Kerja` | 8 | `python scripts/sample_anchor_questions.py --batch TKP-2 --count 5 --seed <S>` | `5` Membangun sinergi & alur komunikasi lintas pihak secara objektif; `1` Ego sektoral / memutus koordinasi |
| **TKP-3** | `83–89` | `Sosial Budaya` | 7 | `python scripts/sample_anchor_questions.py --batch TKP-3 --count 5 --seed <S>` | `5` Inklusif, menghormati adat/keragaman, merangkul tanpa diskriminasi; `1` Stereotip / eksklusif |
| **TKP-4** | `90–96` | `Teknologi Informasi dan Komunikasi` | 7 | `python scripts/sample_anchor_questions.py --batch TKP-4 --count 5 --seed <S>` | `5` Adaptif sistem digital, menjaga keamanan data/privasi, membantu transisi tim; `1` Menolak sistem / lalai keamanan |
| **TKP-5** | `97–103` | `Profesionalisme` | 7 | `python scripts/sample_anchor_questions.py --batch TKP-5 --count 5 --seed <S>` | `5` Tuntas target, disiplin mutu, jaga kerahasiaan & integritas; `1` Mengabaikan target / konflik kepentingan |
| **TKP-6** | `104–110` | `Anti Radikalisme` | 7 | `python scripts/sample_anchor_questions.py --batch TKP-6 --count 5 --seed <S>` | `5` Tegas menolak paham ekstrem/hoaks, edukatif/tabayyun & lapor berjenjang tanpa main hakim sendiri; `1` Permisif / ikut menyebarkan |

---

## 3. Profil B — HOTS / Penalaran Kuantitatif Lanjutan (Terinspirasi `Packet 11–13`)

Gunakan profil ini khusus untuk paket seri **HOTS / Penalaran Lanjutan**. TWK (`#1–30`), TIU Verbal (`#31–42`), TIU Figural (`#60–65`), dan TKP (`#66–110`) mengikuti Profil A; **hanya blok TIU Numerik (`#43–59`, 17 soal)** yang berubah:

| Batch (HOTS) | Nomor Awal | `sub_category` | Jml | Perintah Ambil Contoh (`Packet 11–13`) | Karakteristik Wajib |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TIU-4 (HOTS)** | `43–48` | `Kesetaraan Operasi` (3) & `Pola Bilangan` (3) | 6 | `python scripts/sample_anchor_questions.py --batch TIU-4 --profile hots --count 6 --seed <S>` | 2 Kesetaraan perkalian/pembagian (`a×b = c×d`) + 1 Estimasi terdekat; 3 **Pola Bilangan Tabel/Kotak 2D** |
| **TIU-5 (HOTS)** | `49–54` | `Kecukupan Data` | 6 | `python scripts/sample_anchor_questions.py --batch TIU-5 --profile hots --count 6 --seed <S>` | 5 opsi baku kecukupan data (*"Pernyataan (1) SAJA cukup..."* s.d. *"tidak cukup"*) — buktikan 4 kombinasi `(1), (2), (1)+(2), tidak cukup` di Python! |
| **TIU-6 (HOTS)** | `55–59` | `Berhitung` (1) & `Soal Cerita` (4) | 5 | `python scripts/sample_anchor_questions.py --batch TIU-6 --profile hots --count 5 --seed <S>` | 1 Hitung cepat aljabar/pecahan + 4 Soal Cerita multi-tahap / interpretasi tabel |

---

## 4. Lampiran — Peta Nomor Terverifikasi `vol17` (`Packet 1`) & `vol18` (`Packet 2`)

*Hanya sebagai rujukan cadangan jika bekerja manual tanpa `sample_anchor_questions.py` (sudah diaudit 100% akurat terhadap JSON asli):*
- **`vol17` (`Packet 1`):** TWK: `#1–6` Nasionalisme, `#7–11` Bahasa Indonesia, `#12–16` Bela Negara, `#17–25` Pilar Negara, `#26–30` Integritas | TIU: `#31–34` Analogi (2 Kata+2 Kalimat), `#35–42` Silogisme & Analitis, `#43–45` Berhitung, `#46–49` Perbandingan Kuantitatif, `#50–56` Soal Cerita & Tabel, `#57–59` Deret Angka, `#60–65` Figural | TKP `#66–110`: **diacak penuh** (filter berdasarkan field `topic`).
- **`vol18` (`Packet 2`):** TWK: `#1–5` Nasionalisme, `#6–10` Bela Negara, `#11–20` Pilar Negara, `#21–25` Integritas, `#26–30` Bahasa Indonesia | TIU: `#31–34` Analogi (2 Kata+2 Kalimat), `#35–39` Silogisme, `#40–42` Analitis, `#43–45` Deret Angka, `#46–48` Berhitung, `#49–52` Perb. Kuantitatif & Cerita, `#53–59` Soal Cerita & Tabel, `#60–65` Figural | TKP `#66–110`: **diacak penuh** (filter berdasarkan field `topic`).
