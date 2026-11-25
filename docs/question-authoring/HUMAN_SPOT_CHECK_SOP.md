# HUMAN_SPOT_CHECK_SOP.md — SOP Spot-Check Manusia 15 Menit Pra-Terbit

Dokumen ini adalah **gerbang terakhir manusia (*Final Human Sign-Off*)** yang dilakukan pemilik/editor TOCPNS tepat sebelum mengklik tombol **Terbitkan** di `/admin/packages`.

---

## 1. Alokasi Waktu Terstruktur (Total 15 Menit)

### Menit 0–3 — Audit Dasbor Metrik (`audit-report.md` & `cross-model-audit.md`)
Buka `data/generated/<kode_paket>/audit-report.md` dan `cross-model-audit.md`, lalu verifikasi 6 angka kunci berikut:
- [ ] **Total soal & kuota segmen:** Tepat `110` (`TWK 30 / TIU 35 / TKP 45`), semua 6 aspek TKP terisi seimbang (`>= 5` soal per aspek).
- [ ] **Hard Errors:** `0` (Wajib mutlak). **Warnings:** `0` (termasuk `0 discussion_key_unexplicit`, `0 discussion_wall_of_text`, `0 single_line_display_math`, `0 tkp_length_bias`, `0 tkp_char_length_bias`, `0 tkp_comma_bias`, `0 tkp_boilerplate_discussion`, `0 trailing_hyphen_option`, `0 generic_tiu_sub_category`, `0 diagram_filename_has_number`, `0 latex_rupiah`, `0 key_imbalance`, `0 key_streak`, `0 local_image_url`, dan `0 local_discussion_image_url` setelah upload Supabase).
- [ ] **Kemiripan terhadap seluruh `Packet 1–15` + paket `data/generated/*` sebelumnya:** TWK/TKP `< 50%`, TIU `< 85%` (dan angka/deret berbeda). Kemiripan internal `< 55%`.
- [ ] **Rasio opsi kunci terpanjang:** `<= 35%` (target ideal setara BKN: `12%–25%`).
- [ ] **Distribusi kunci A–E, pengelompokan blok, & label `sub_category`:** Kunci merata (`selisih max - min <= 1` di TWK, TIU non-figural, dan TKP; kunci Figural tersebar lintas `A–E`) tanpa pola siklus berulang. Paket sudah diurutkan dengan `--group-by-blocks` (TWK per blok urutan bervariasi, TIU per rumpun `Verbal → Numerik → Figural` dengan tiap sub-materi utuh dalam 1 sub-blok, TKP per blok aspek urutan bervariasi), seluruh soal memiliki `sub_category` granular kanonik, dan berkas/judul PNG diagram bebas nomor `(Soal #XX)`.
- [ ] **Verifikasi KaTeX & Review Silang Beda Model:** Parser KaTeX frontend `0 .katex-error` & `0 raw $`; `0` temuan KRITIS tersisa, `0` temuan MAYOR terbuka, Blind-Solve TIU `100%` cocok.

---

### Menit 3–7 — Inspeksi Visual Gambar Figural Terpisah & Diagram Pembahasan TIU
Buka seluruh berkas di `data/generated/<kode_paket>/gambar/figural/q06*/{soal,opsi-a..e,pembahasan}.png` **dan** seluruh `data/generated/<kode_paket>/gambar/diagram_*.png` (serta URL publiknya di Supabase `exam-assets/`):
- [ ] **Tebak sendiri dalam 20 detik/soal Figural** sebelum melirik pembahasan (termasuk **Matriks 3×3**): apakah pola geometrisnya adil, menggabungkan ≥ 2 kriteria objektif, dan tidak terlalu dangkal?
- [ ] **Format Gambar Terpisah Ramah Mobile:** `soal.png` hanya berisi panel soal (tanpa opsi A–E menyatu), masing-masing `opsi-a..e.png` tajam & proporsional di lebar ponsel, `option.content = ""`, dan `pembahasan.png` bebas nomor `(Soal #XX)`.
- [ ] **Ketajaman & Nol Tabrakan Visual (Figural + Diagram TIU):** Latar putih bersih (`#FFFFFF`), garis hitam tajam (`#111827`), **tanpa bocoran warna kunci**, tidak ada teks/titik bertabrakan atau terpotong tepi, dan tidak ada 2 opsi gambar tampak kembar.
- [ ] **Kesesuaian URL Publik:** `image_url`, `option_image_a..e`, serta tautan gambar di `discussion` pada `.xlsx` final seluruhnya memakai URL publik HTTPS Supabase `exam-assets/` (bukan `127.0.0.1`, `localhost`, atau path relatif `gambar/`).

---

### Menit 7–12 — Spot-Check 10 Soal Sampel Berisiko Tinggi (Pilih Berdasarkan `sub_category`)
*Karena `--group-by-blocks` merotasi urutan blok antar-paket, pilih sampel berdasarkan kolom **`sub_category`** (bukan mengasumsikan nomor tetap):*

| Kelompok Sampel (`sub_category`) | Jumlah | Fokus Pemeriksaan Editor Manusia |
| :--- | :-: | :--- |
| **TWK Pasal / Hukum** (`Pilar Negara`, `Nasionalisme`, `Integritas`, `Bela Negara`) | 2 soal | Skenario terasa Indonesia & realistis, nomor pasal akurat terhadap `uud_1945_lengkap.md` / `uu_20_2023_asn_lengkap.md`, dan tidak mengulang pasal dari paket sebelumnya. |
| **TWK `Bahasa Indonesia`** | 1 soal | Baca lantang kalimat pada kunci jawaban: efektif, tidak rancu, dan sesuai EYD V/KBBI VI. |
| **TIU `Analitis` & `Silogisme`** | 2 soal | Pecahkan cepat: premis jelas (tidak multitafsir), hanya ada 1 solusi sah, dan diagram pembahasan (jika ada) cocok dengan teks & tanpa `(Soal #XX)`. |
| **TIU Numerik KaTeX** (`Berhitung` / `Deret Angka` / `Perbandingan Kuantitatif` / `Soal Cerita`) | 1 soal | Periksa satuan (jam vs menit, km vs meter, tambahan pekerja vs total pekerja), tabel Markdown rapi, block math multi-baris (`$$` di baris sendiri), serta desimal & Rupiah benar. |
| **TKP Batas Skor 5 vs 4** (4 aspek berbeda, wajib sertakan `Anti Radikalisme` & `Pelayanan Publik`) | 4 soal | **Area paling krusial!** Tutup skornya, pilih opsi terbaik menurut instingmu — cocok dengan skor 5? Panjang & jumlah koma 5 opsi seimbang? Skor 1 tidak terdengar kartun? Rincian `Opsi X (5..1 poin)` di pembahasan substantif (bebas frasa template robotik) dan cocok 100% dengan skor? |

---

### Menit 12–15 — Verifikasi Live Rendering di `/admin/questions` & Terbitkan di `/admin/packages`
1. **Impor ke Paket Draft:**
   - Buka `/admin/packages` → buat paket baru (**Draft**), isi judul, deskripsi, tier (Gratis/Pro), dan durasi `100` menit.
   - Buka `/admin/questions` → pilih paket Draft → **Import Excel / CSV** → unggah `<kode_paket>-impor-final.xlsx`.
2. **Cek Split-Pane Live Preview pada 5 Soal di Browser Asli (Desktop + Lebar Ponsel):**
   - [ ] **Badge `sub_category`:** Tampil rapi di sebelah badge `TWK`/`TIU`/`TKP` pada kartu soal Ujian & Pembahasan (bukan kosong atau label generik `"Verbal"`/`"Numerik"`).
   - [ ] **1 soal TIU pecahan/akar/tabel & 1 soal Analitis/Deret bergambar:** KaTeX, *block math* `.katex-display`, tabel Markdown, penomoran daftar (`1.`, `2.`, ... tidak terpotong di kiri), dan diagram pembahasan (`![...](...)`, bisa diklik zoom) ter-render rapi tanpa teks merah atau `$` mentah.
   - [ ] **1 soal TIU Figural (`#60–65`):** Gambar soal (`soal.png`), 5 gambar opsi terpisah (`opsi-a..e.png`), dan `pembahasan.png` tampil langsung dari Supabase Storage tanpa `404`/`403` dan nyaman dilihat di ponsel.
   - [ ] **1 soal TWK & 1 soal TKP:** Paragraf rapi, rincian TKP 5→1 berbentuk daftar bullet per baris (bukan tembok teks), bebas tanda `-` menggantung di akhir opsi, dan bebas karakter aneh (`\n` mentah atau tag HTML bocor).
   - [ ] **Pembahasan & Kunci:** Badge skor (`5, 4, 3, 2, 1`) di UI Admin cocok 100% dengan huruf di pembahasan.
3. **Validasi Server & Terbitkan:**
   - Kembali ke `/admin/packages` → klik **Validasi & Terbitkan** → pastikan 0 blocker → klik **Terbitkan revisi**!

---

## 2. Dua Belas *Red Flags* Instan (Otomatis **NO-GO / Tahan Publikasi**)

1. **Tanda `$` atau `\frac` mentah muncul di Live Preview** atau block math `$$...$$` ditulis 1 baris sehingga gagal tampil sebagai `.katex-display`.
2. **Gambar Figural atau diagram pembahasan broken (`404`)** atau masih memakai URL `127.0.0.1` / `localhost` / path lokal `gambar/`.
3. **Nama tokoh berubah** antara soal dan pembahasan, atau nama tokoh yang sama diulang di banyak soal.
4. **Huruf kunci atau rincian skor `5..1` di pembahasan tidak cocok** dengan bobot opsi.
5. **Satu saja soal TKP yang opsi skor 4-nya terasa lebih bijak/taat SOP daripada skor 5**.
6. **Pola klise/bias TKP mencolok:** 3 dari 4 soal sampel TKP langsung ketahuan skor 5-nya karena paling panjang, paling banyak koma, klise berulang, atau pembahasannya memakai kalimat template robotik (*"Usulnya adalah..."*, *"Tindakan ini memberi respons terbatas"*).
7. **Soal TWK menyebut nomor pasal yang salah/tidak ada** di `uud_1945_lengkap.md` / `uu_20_2023_asn_lengkap.md`, atau menduplikasi pasal/kasus paket sebelumnya.
8. **Soal TIU menanyakan "tambahan pekerja" tetapi kunci menjawab "total pekerja"**.
9. **Ada jejak artefak AI** (*"Berikut adalah pembahasannya:"*, *"Sebagai AI..."*, dsb.) atau tanda `-` menggantung di akhir teks opsi.
10. **Satu saja gambar Figural memiliki 2 opsi tampak identik**, ada bocoran warna kunci, elemen visual saling bertumpuk, atau opsi masih digabung 1 gambar komposit.
11. **Judul/nama berkas diagram pembahasan memuat nomor soal yang salah** (`(Soal #39)` padahal soal sudah berada di nomor lain pasca `--group-by-blocks`).
12. **Sub-materi terpencar lintas nomor** (mis. Deret Angka di `#31` dan `#58`) atau `sub_category` masih kosong / generik (`"Verbal"`/`"Numerik"`).

---

## 3. Template Lembar Sign-Off (`signoff-checklist.md`)

Salin template ini ke `data/generated/<kode_paket>/signoff-checklist.md` setiap kali merilis paket baru:

```markdown
# Human Spot-Check Sign-Off — <kode_paket>

- **Paket:** <Judul Paket>
- **Reviewer:** <Nama Editor>
- **Tanggal & Jam (WIB):** YYYY-MM-DD HH:MM WIB
- **Durasi Review:** ~15 menit

## Checklist Go / No-Go
- [ ] **Menit 0–3:** `audit-report.md` (0 hard error, 0 warning, similarity vs Packet 1–15 + generated/* aman, bias panjang <= 35%, 0 `tkp_comma_bias`, 0 `single_line_display_math`, `--group-by-blocks` aktif), KaTeX AST frontend 0 error, & `cross-model-audit.md` (0 KRITIS, 0 MAYOR terbuka).
- [ ] **Menit 3–7:** Seluruh 42 PNG Figural terpisah + PNG diagram pembahasan TIU tajam di layar ponsel, bebas nomor `(Soal #XX)`, tanpa overlap/bocoran kunci, dan URL publik Supabase aktif.
- [ ] **Menit 7–12:** 10 soal sampel stratifikasi per `sub_category` diperiksa (TWK `#__, #__, #__`; TIU `#__, #__, #__`; TKP `#__, #__, #__, #__`) — bebas 12 Red Flags.
- [ ] **Menit 12–15:** Split-Pane Live Preview di `/admin/questions` (badge `sub_category`, `.katex-display`, Tabel, Figural terpisah) & Pre-publish Validation di `/admin/packages` hijau.

## Keputusan Akhir
- **Status:** [ ] GO — TERBITKAN  |  [ ] NO-GO — KEMBALIKAN KE REVISI
- **Catatan Editor:** <isi temuan minor atau "Siap terbit tanpa catatan">
```

---

## 4. Siklus Kalibrasi Pasca-Terbit (*Post-Launch Psychometric Loop*)

Setelah paket dikerjakan minimal **50–100 peserta nyata**, evaluasi lewat `/admin/analytics` & `exam_responses`:

| Indikator Empiris Peserta | Arti Psikometris | Tindakan Editorial |
| :--- | :--- | :--- |
| **Tingkat benar `> 90%`** (TWK/TIU) atau **rata-rata skor `> 4,6`** (TKP) | Soal terlalu mudah / pengecoh lemah / skor 5 klise. | Pertajam pengecoh pada paket berikutnya atau revisi versi paket. |
| **Tingkat benar `< 15%`** (TWK/TIU) atau **rata-rata skor `< 2,5`** (TKP) | Kemungkinan ambigu, pengecoh lebih meyakinkan, atau kunci salah. | **Audit darurat nomor tersebut!** Perbaiki soal jika memang cacat/ambigu. |
| **Banyak peserta memilih 1 pengecoh (`> 50%` memilih pengecoh X)** | Pengecoh X mungkin memiliki tafsir sah yang terlewat. | Verifikasi ulang terhadap korpus hukum/Python solver; perjelas redaksi soal. |
| **Waktu pengerjaan rata-rata `> 95` menit (banyak soal kosong di akhir)** | Teks soal secara keseluruhan terlalu panjang dibanding standar BKN. | Ringkas panjang skenario di batch paket berikutnya. |
