# BLUEPRINT.md — Peta Slot 110 Soal (Cermin 1-ke-1 dari Packet 1 & Packet 2)

Blueprint ini sengaja dibuat **ringkas**: tidak ada pembagian tingkat kesulitan artifisial atau taksonomi rumit. Cukup ikuti **jumlah soal per sub-kategori** dan **tiru tingkat kesulitan dari nomor contoh padanannya** di `vol17` (`Packet 1`) atau `vol18` (`Packet 2`).

---

## 1. Kuota Wajib 110 Soal (Server TOCPNS)

| Segmen | Nomor | Jumlah | Skor | Passing Grade |
| :--- | :---: | :---: | :--- | :---: |
| **TWK** | `1–30` | **30** | Benar `5`, Salah `0` | `65` |
| **TIU** | `31–65` | **35** | Benar `5`, Salah `0` | `80` |
| **TKP** | `66–110` | **45** | Unik `1, 2, 3, 4, 5` | `166` |

---

## 2. Peta 17 Batch Kecil (5–9 Soal per Batch)

Kerjakan **1 batch per langkah** dengan hanya melihat **soal contoh pada nomor padanannya** di `vol17-bank-soal.json` / `vol18-bank-soal.json` agar konteks AI tetap ringan dan fokus.

### A. TWK (`#1–30`, 5 Batch)
*Cara buat: Tiru gaya, panjang, dan tingkat kesulitan soal contoh, lalu ganti cerita/kasus/tokoh. Cek pasal/kata baku seperlunya (on-demand) di `references/`.*

| Batch | Nomor | `sub_category` | Jml | Contoh Padanan (`vol17` / `vol18`) | Kamus *On-Demand* (Buka Seperlunya) |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TWK-1** | `1–6` | `Nasionalisme` | 6 | Vol.17 `#1–6`, Vol.18 `#1–5` | `korpus_twk_tkp_lengkap.md` (Sejarah/Pancasila) |
| **TWK-2** | `7–11` | `Integritas` | 5 | Vol.17 `#12–16`, Vol.18 `#11–15` | `korpus_twk_tkp_lengkap.md` (9 Nilai KPK) & `uu_20_2023_asn_lengkap.md` |
| **TWK-3** | `12–16` | `Bela Negara` | 5 | Vol.17 `#17–21`, Vol.18 `#16–20` | `korpus_twk_tkp_lengkap.md` (UU 23/2019) |
| **TWK-4** | `17–25` | `Pilar Negara` | 9 | Vol.17 `#22–30`, Vol.18 `#21–30` | `uud_1945_lengkap.md` (cari pasal spesifik saja!) |
| **TWK-5** | `26–30` | `Bahasa Indonesia` | 5 | Vol.17 `#7–11`, Vol.18 `#6–10` | `korpus_bahasa_indonesia_kbbi6_eyd5.md` (cari kata/kaidah saja!) |

### B. TIU (`#31–65`, 6 Batch)
*Cara buat: Boleh pakai **pola/rumus/struktur soal yang sama persis** dengan contoh — cukup **ganti angka/nama/pasangan kata**, lalu **hitung ulang jawaban baru & pengecoh baru dengan Python**!*

| Batch | Nomor | `sub_category` | Jml | Contoh Padanan (`vol17` / `vol18`) | Metode Wajib |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TIU-1** | `31–34` | `Analogi` | 4 | Vol.17 `#31–34`, Vol.18 `#31–34` | Pola hubungan sama, ganti pasangan kata/kalimat |
| **TIU-2** | `35–38` | `Silogisme` | 4 | Vol.17 `#35–38`, Vol.18 `#35–38` | Pola logika sama, ganti subjek/predikat + cek Python |
| **TIU-3** | `39–42` | `Analitis` | 4 | Vol.17 `#39–42`, Vol.18 `#39–42` | Pola urutan/kursi/jadwal sama, ganti nama/aturan + **Python `permutations`** (1 jawaban unik) |
| **TIU-4** | `43–51` | `Berhitung` (5) & `Deret Angka` (4) | 9 | Vol.17 `#43–51`, Vol.18 `#43–51` | **Clone pola, ganti angka** + hitung ulang eksak via Python `Fraction`/`Decimal` + LaTeX `$...$` |
| **TIU-5** | `52–59` | `Perbandingan Kuantitatif` (3) & `Soal Cerita` (5) | 8 | Vol.17 `#52–59`, Vol.18 `#52–59` | **Clone pola/rumus, ganti angka & benda** + hitung ulang eksak via Python + LaTeX `$...$` |
| **TIU-6** | `60–65` | `Figural` (2 Analogi, 2 Ketidaksamaan, 2 Serial) | 6 | Vol.17 `#60–65`, Vol.18 `#60–65` | Gambar deterministik via **Python Pillow/matplotlib** + cek visual |

### C. TKP (`#66–110`, 6 Batch)
*Cara buat: Tiru gaya kasus & panjang opsi dari contoh soal, ganti situasi kerja & tokoh, lalu pastikan urutan skor `5 → 4 → 3 → 2 → 1` tegas dan panjang 5 opsi seimbang.*

| Batch | Nomor | `sub_category` | Jml | Contoh Padanan (`vol17` / `vol18`) | Panduan Ringkas Skor 5 → 1 |
| :---: | :---: | :--- | :-: | :--- | :--- |
| **TKP-1** | `66–74` | `Pelayanan Publik` | 9 | Vol.17 `#66–75`, Vol.18 `#66–73` | 5: Solutif tuntas, ramah, taat SOP; 4: Baik tapi kurang tuntas; 3: Pasif/kaku; 2: Menunda/menghindar; 1: Egois/langgar SOP |
| **TKP-2** | `75–82` | `Jejaring Kerja` | 8 | Vol.17 `#76–84`, Vol.18 `#74–80` | 5: Proaktif koordinasi & kolaboratif; 1: Ego sektoral/memutus komunikasi |
| **TKP-3** | `83–88` | `Sosial Budaya` | 6 | Vol.17 `#85–90`, Vol.18 `#81–86` | 5: Menghormati keragaman & merangkul; 1: Diskriminatif/stereotip |
| **TKP-4** | `89–97` | `Teknologi Informasi dan Komunikasi` | 9 | Vol.17 `#91–98`, Vol.18 `#87–96` | 5: Adaptif digital, aman data, bantu rekan; 1: Menolak teknologi/lalai keamanan |
| **TKP-5** | `98–104` | `Profesionalisme` | 7 | Vol.17 `#99–103`, Vol.18 `#97–104` | 5: Tuntas tanggung jawab & jaga integritas; 1: Mengabaikan tugas/rahasia |
| **TKP-6** | `105–110` | `Anti Radikalisme` | 6 | Vol.17 `#104–110`, Vol.18 `#105–110` | 5: Tegas menolak, objektif, edukatif/lapor berjenjang tanpa main hakim sendiri; 1: Permisif/ikut menyebarkan |
