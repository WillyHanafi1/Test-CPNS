# Blueprint Paket SKD CPNS 110 Soal (Berbasis Packet 1 Vol. 17 & Packet 2 Vol. 18)

Dokumen ini memetakan **struktur eksak 110 soal** yang harus dipenuhi setiap paket baru (`Vol. 19`, `Vol. 20`, dst.) agar tingkat kesulitan, ritme membaca, proporsi sub-materi, dan formatnya sejalan dengan standar BKN ([kepmenpan_rb_321_2024.md](file:///d:/ProjectAI/Test-CPNS/docs/kepmenpan_rb_321_2024.md)) serta tolok ukur [Packet 1 Vol. 17](file:///d:/ProjectAI/Test-CPNS/data/Packet%201/outputs/packet1-vol17/vol17-bank-soal.json) dan [Packet 2 Vol. 18](file:///d:/ProjectAI/Test-CPNS/data/Packet%202/outputs/packet2-vol18/vol18-bank-soal.json).

---

## 1. Ringkasan Komposisi Wajib (Divalidasi Otomatis oleh Server TOCPNS)

| Segmen | Nomor Soal | Jumlah | Bobot Nilai | Passing Grade BKN |
| :--- | :---: | :---: | :--- | :---: |
| **TWK** | `1–30` | **30** | Benar = `5`, Salah/Kosong = `0` (tepat 1 opsi bernilai 5) | **65** |
| **TIU** | `31–65` | **35** | Benar = `5`, Salah/Kosong = `0` (tepat 1 opsi bernilai 5) | **80** |
| **TKP** | `66–110` | **45** | Skala unik `1, 2, 3, 4, 5` per soal (tanpa nilai 0) | **166** |
| **Total** | `1–110` | **110** | Maksimal `550` (TWK `150` + TIU `175` + TKP `225`) | **311** *(minimal per subtes)* |

---

## 2. Peta Slot Detail per Segmen & Batch Pembuatan

AI Agent **wajib menghasilkan soal per batch kecil (5–10 soal)** sesuai tabel slot berikut — **dilarang menghasilkan 110 soal dalam satu respon sekaligus**.

### A. TWK — Nomor 1–30 (5 Batch × 5–10 Soal)

| Batch | Nomor | `sub_category` | Jumlah | Target Panjang Soal | Level Kognitif | Fokus Materi & Variasi Kasus | Anchor Referensi |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **TWK-1** | `1–6` | `Nasionalisme` | 6 | 25–45 kata | C4 Analisis | Nasionalisme inklusif vs chauvinisme, ekonomi lokal di era global, persatuan lintas daerah, kebanggaan identitas bangsa tanpa eksklusivisme. | Vol.17 `#1–6`, Vol.18 `#1–5` |
| **TWK-2** | `7–11` | `Integritas` | 5 | 35–55 kata | C4–C5 Evaluasi | Konflik kepentingan ASN, penolakan gratifikasi (30 hari kerja KPK), konsistensi di luar pengawasan, kejujuran laporan anggaran, whistleblowing prosedural. | Vol.17 `#12–16`, Vol.18 `#11–15` |
| **TWK-3** | `12–16` | `Bela Negara` | 5 | 30–50 kata | C4 Analisis | 5 nilai dasar bela negara (UU 23/2019), ancaman non-militer (hoaks/siber/ekonomi/budaya), peran profesi sipil, pengorbanan kepentingan pribadi demi negara. | Vol.17 `#17–21`, Vol.18 `#16–20` |
| **TWK-4** | `17–25` | `Pilar Negara` | 9 | 35–55 kata | C4–C5 Evaluasi | Pancasila (kasus sila 1–5), UUD 1945 verbatim (`uud_1945_lengkap.md`: MK vs MA, DPR/DPD/MPR, Pasal 7A–7C, Pasal 14, HAM 28A–28J, APBN 23–23G, Pasal 33–37), UU ASN 20/2023 (`uu_20_2023_asn_lengkap.md`), NKRI & Bhinneka Tunggal Ika. | Vol.17 `#22–30`, Vol.18 `#21–30` |
| **TWK-5** | `26–30` | `Bahasa Indonesia` | 5 | 40–70 kata | C3–C4 Aplikasi | Ikuti matriks rotasi `korpus_bahasa_indonesia_kbbi6_eyd5.md` § 6: `#26` EYD V kapital/kata terikat/`-pun`, `#27` KBBI VI kata baku/peluluhan KTSP, `#28` kalimat efektif (7 tipe cacat), `#29` ide pokok/simpulan bacaan, `#30` diksi/sinonim akademik/idiom kontekstual. | Vol.17 `#7–11`, Vol.18 `#6–10` |

### B. TIU — Nomor 31–65 (6 Batch)

| Batch | Nomor | `sub_category` | Jumlah | Target Panjang Soal | Metode Verifikasi | Pola Wajib & Proporsi | Anchor Referensi |
| :---: | :---: | :--- | :---: | :---: | :--- | :--- | :--- |
| **TIU-1** | `31–34` | `Analogi` | 4 | 8–25 kata | Manual semantik | 2 soal pola pasangan `A : B = C : D` (atau 3 unsur `A : B : C`), 2 soal pola kalimat hubungan setara. | Vol.17 `#31–34`, Vol.18 `#31–34` |
| **TIU-2** | `35–38` | `Silogisme` | 4 | 25–45 kata | **Python Logic Check** | Kuantor (*Semua/Sebagian/Tidak ada*), implikasi ($p \to q$), modus ponens/tollens, ekuivalensi kontraposisi ($\neg q \to \neg p$), ekuivalensi negasi. | Vol.17 `#35–38`, Vol.18 `#35–38` |
| **TIU-3** | `39–42` | `Analitis` | 4 | 55–90 kata | **Python Brute-Force Solver** | 1 urutan linier/peringkat, 1 posisi melingkar/baris depan-belakang, 1 jadwal/penugasan bersyarat, 1 pengelompokan/kombinasi syarat. **Wajib tepat 1 jawaban unik!** | Vol.17 `#39–42`, Vol.18 `#39–42` |
| **TIU-4** | `43–51` | `Berhitung` & `Deret Angka` | 9 | 10–35 kata | **Python Exact (`fractions`/`sympy`)** | 5 soal **Berhitung** (pecahan campuran, desimal, persen, akar/pangkat, aljabar sederhana — tulis rumus pakai `$...$`) + 4 soal **Deret Angka** (1 larik bertingkat, 2 larik selang-seling, Fibonacci/perkalian, pola gabungan). | Vol.17 `#43–51`, Vol.18 `#43–51` |
| **TIU-5** | `52–59` | `Perbandingan Kuantitatif` & `Soal Cerita` | 8 | 30–65 kata | **Python Exact Calculation** | 3 soal **Perbandingan Kuantitatif** (tabel $X$ vs $Y$: $X>Y$, $X<Y$, $X=Y$, atau relasi linier) + 5 soal **Soal Cerita** (perbandingan senilai/berbalik nilai pekerja-waktu, kecepatan-papasan/susul, diskon/untung-rugi, rata-rata gabungan, peluang/kombinasi). | Vol.17 `#52–59`, Vol.18 `#52–59` |
| **TIU-6** | `60–65` | `Figural` | 6 | 8–20 kata + gambar | **Python SVG/Pillow Generator** | 2 **Analogi Gambar**, 2 **Ketidaksamaan Gambar**, 2 **Serial Gambar**. Gambar soal (dan/atau opsi) dibuat deterministik dengan kode Python, bukan generative image AI! | Vol.17 `#60–65`, Vol.18 `#60–65` |

### C. TKP — Nomor 66–110 (6 Batch × 6–9 Soal)

| Batch | Nomor | `sub_category` | Jumlah | Target Panjang Soal | Panjang Opsi Target | Dilema Inti yang Diuji | Anchor Referensi |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **TKP-1** | `66–74` | `Pelayanan Publik` | 9 | 40–60 kata | 12–20 kata/opsi (seragam) | Antrean membludak, kelompok rentan/difabel, komplain warga marah, permintaan percepatan non-SOP, keterbatasan loket/sistem error saat jam layanan. | Vol.17 `#66–75`, Vol.18 `#66–73` |
| **TKP-2** | `75–82` | `Jejaring Kerja` | 8 | 40–60 kata | 12–20 kata/opsi (seragam) | Koordinasi lintas dinas lambat, ego sektoral, anggota tim tidak aktif, perbedaan gaya kerja mitra eksternal, berbagi data antar-unit. | Vol.17 `#76–84`, Vol.18 `#74–80` |
| **TKP-3** | `83–88` | `Sosial Budaya` | 6 | 40–60 kata | 12–20 kata/opsi (seragam) | Penempatan di daerah adat/bahasa berbeda, konflik kebiasaan antar-rekan, kegiatan keagamaan/budaya warga, stereotip daerah di lingkungan kantor. | Vol.17 `#85–90`, Vol.18 `#81–86` |
| **TKP-4** | `89–97` | `Teknologi Informasi dan Komunikasi` | 9 | 40–60 kata | 12–20 kata/opsi (seragam) | Migrasi aplikasi digital baru, rekan senior gagap teknologi, keamanan data/phishing/password instansi, gangguan jaringan saat tenggat, otomasi arsip. | Vol.17 `#91–98`, Vol.18 `#87–96` |
| **TKP-5** | `98–104` | `Profesionalisme` | 7 | 40–60 kata | 12–20 kata/opsi (seragam) | Benturan urusan pribadi vs deadline kantor, mutasi mendadak, kesalahan rekan/atasan, pekerjaan di luar jobdesc saat darurat, menjaga rahasia jabatan. | Vol.17 `#99–103`, Vol.18 `#97–104` |
| **TKP-6** | `105–110` | `Anti Radikalisme` | 6 | 40–60 kata | 12–20 kata/opsi (seragam) | Grup WA kantor menyebar narasi anti-Pancasila, ajakan intoleransi terhadap minoritas, kajian tertutup bernuansa ekstrem, narasi menjelekkan konstitusi/NKRI, deteksi dini tanpa main hakim sendiri. | Vol.17 `#104–110`, Vol.18 `#105–110` |

---

## 3. Matriks Rotasi Latar Kasus (Antar Volume)

Agar `Vol. 19`, `Vol. 20`, `Vol. 21`, dst. tidak terasa repetitif bagi peserta yang mengerjakan berulang:
- **Gunakan variasi latar instansi:** Dukcapil, Puskesmas/RSUD, Kantor Pajak/Keuangan, Dinas Pendidikan/Sekolah, Imigrasi, Dinas Perhubungan, Kecamatan/Kelurahan, Inspektorat, BPS, KUA/Kemenag, Dinas Sosial, BKD/BKPSDM, Kantor Pertanahan (BPN).
- **Variasi nama tokoh Indonesia natural** (hindari mengulang nama yang sama dalam 1 paket; pastikan nama di soal **100% sama** dengan nama di pembahasan — mencegah cacat seperti Vol.17 `#71` Andi vs Dinda).
- **Target Tingkat Kesulitan Paket:**
  - `20%` Sedang-Mudah (pemanasan, 1 langkah penalaran)
  - `60%` Standar BKN / Menengah-Tinggi (2 langkah penalaran, pengecoh tipis namun tegas)
  - `20%` Sulit / HOTS (kasus multi-variabel, jebakan halus antar-pilar atau dilema TKP skor 5 vs 4 yang sangat tipis)
