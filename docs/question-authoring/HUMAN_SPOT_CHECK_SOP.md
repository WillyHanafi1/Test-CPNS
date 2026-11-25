# HUMAN_SPOT_CHECK_SOP.md — SOP Spot-Check Manusia 15 Menit Pra-Terbit

Dokumen ini adalah **gerbang terakhir manusia (*Final Human Sign-Off*)** yang dilakukan pemilik/editor TOCPNS tepat sebelum mengklik tombol **Terbitkan** di `/admin/packages`.

---

## 1. Alokasi Waktu Terstruktur (Total 15 Menit)

### Menit 0–3 — Audit Dasbor Metrik (`audit-report.md` & `cross-model-audit.md`)
Buka `data/generated/<kode_paket>/audit-report.md` dan `cross-model-audit.md`, lalu verifikasi 6 angka kunci berikut:
- [ ] **Total soal & kuota segmen:** Tepat `110` (`TWK 30 / TIU 35 / TKP 45`), semua 6 aspek TKP terisi seimbang (`>= 5` soal per aspek).
- [ ] **Hard Errors:** `0` (Wajib mutlak). **Warnings:** `0` (termasuk 0 `discussion_key_unexplicit`, 0 `discussion_wall_of_text`, 0 `tkp_length_bias`, 0 `latex_rupiah`, 0 `key_imbalance`, 0 `key_streak`, 0 `local_image_url`, dan 0 `local_discussion_image_url` setelah upload Supabase).
- [ ] **Kemiripan terhadap seluruh `Packet 1–15` (1.650 soal):** TWK/TKP `< 50%`, TIU `< 85%` (dan angka/deret berbeda). Kemiripan internal `< 55%`.
- [ ] **Rasio opsi kunci terpanjang:** `<= 35%` (target ideal setara BKN: `12%–25%`).
- [ ] **Distribusi kunci A–E & urutan soal per segmen:** Merata (`selisih max - min <= 2` di TWK, TIU non-figural, dan TKP) tanpa pola siklus berulang. Urutan nomor di dalam TWK `#1–30`, TIU `#31–59` & `#60–65`, dan TKP `#66–110` sudah teracak (`--shuffle-all-orders`) serta judul gambar diagram bebas nomor `(Soal #XX)`.
- [ ] **Review Silang Beda Model:** `0` temuan KRITIS tersisa, `0` temuan MAYOR terbuka, Blind-Solve TIU `100%` cocok.

---

### Menit 3–7 — Inspeksi Visual Gambar Figural (`#60–65` atau `#58–65`)
Buka seluruh berkas `data/generated/<kode_paket>/gambar/q6X_figural.png` (serta URL publiknya di Supabase `exam-assets/figural/<kode_paket>/`):
- [ ] **Tebak sendiri dalam 20 detik/gambar** sebelum melirik pembahasan (termasuk **Matriks 3×3**): apakah pola geometrisnya adil, menggabungkan ≥ 2 transformasi logis, dan tidak terlalu dangkal?
- [ ] **Ketajaman & Tipografi:** Latar putih bersih, garis hitam tajam, label `A.` s.d. `E.` serta tanda `?` besar dan rata tengah, **tanpa bocoran warna kunci**.
- [ ] **Nol Tabrakan Visual:** Tidak ada titik sudut menimpa garis tengah, tidak ada panel terpotong, dan tidak ada 2 opsi gambar tampak kembar.
- [ ] **Kesesuaian URL Publik:** Kolom `image_url` di `.xlsx` final memakai URL publik Supabase `https://<project>.supabase.co/storage/v1/object/public/exam-assets/figural/<kode_paket>/q6X_figural.png` (bukan `127.0.0.1`!).

---

### Menit 7–12 — Spot-Check 10 Soal Sampel Berisiko Tinggi
Ambil **10 soal sampel stratifikasi** dari `.xlsx` final (sheet `Impor`) atau dari panel `/admin/questions`:

| Kelompok Sampel | Jumlah | Fokus Pemeriksaan Editor Manusia |
| :--- | :-: | :--- |
| **TWK Pasal / Hukum (`#1–24`)** | 2 soal | Cek 1 soal Pilar Negara & 1 soal Nasionalisme/Integritas: skenario terasa Indonesia & realistis, nomor pasal akurat terhadap `uud_1945_lengkap.md` / `uu_20_2023_asn_lengkap.md`. |
| **TWK Bahasa Indonesia (`#25–30`)** | 1 soal | Baca lantang kalimat pada kunci jawaban: efektif, tidak rancu, dan sesuai EYD V/KBBI VI. |
| **TIU Analitis & Silogisme (`#35–42`)** | 2 soal | Pecahkan cepat: kalimat premis jelas (tidak multitafsir) dan hanya ada 1 solusi sah. |
| **TIU Numerik KaTeX (`#43–59`)** | 1 soal | Periksa satuan (jam vs menit, km vs meter, tambahan pekerja vs total pekerja), tabel Markdown rapi, serta desimal & Rupiah benar. |
| **TKP Batas Skor 5 vs 4 (`#66–110`)** | 4 soal | **Area paling krusial!** Ambil 4 aspek berbeda (wajib sertakan **Anti Radikalisme** & **Pelayanan Publik**). Tutup skornya, pilih opsi terbaik menurut instingmu — cocok dengan skor 5? Panjang 5 opsi seragam? Skor 1 tidak terdengar kartun? Rincian `Opsi X=5..1` di pembahasan cocok 100%? |

---

### Menit 12–15 — Verifikasi Live Rendering di `/admin/questions` & Terbitkan di `/admin/packages`
1. **Impor ke Paket Draft:**
   - Buka `/admin/packages` → buat paket baru (**Draft**), isi judul, deskripsi, tier (Gratis/Pro), dan durasi `100` menit.
   - Buka `/admin/questions` → pilih paket Draft → **Import Excel / CSV** → unggah `<kode_paket>-impor-final.xlsx`.
2. **Cek Split-Pane Live Preview pada 5 Soal di Browser Asli:**
   - [ ] **1 soal TIU pecahan/akar/tabel (`#43–59`) & Analitis bergambar (`#39–42`):** KaTeX, *block math* `$$...$$`, tabel Markdown, langkah bernomor (`1.`, `2.`, ...), dan diagram pembahasan (`![...](...)`, bisa diklik zoom) ter-render rapi tanpa teks merah atau `$` mentah.
   - [ ] **1 soal TIU Figural (`#60–65`):** Gambar soal & diagram pembahasan tampil langsung dari Supabase Storage tanpa `404`/`403`.
   - [ ] **1 soal TWK & 1 soal TKP:** Paragraf rapi, rincian TKP 5→1 berbentuk daftar bullet per baris (bukan tembok teks), bebas karakter aneh (`\n` mentah atau tag HTML bocor).
   - [ ] **Pembahasan & Kunci:** Badge skor (`5, 4, 3, 2, 1`) di UI Admin cocok 100% dengan huruf di pembahasan.
3. **Validasi Server & Terbitkan:**
   - Kembali ke `/admin/packages` → klik **Validasi & Terbitkan** → pastikan 0 blocker → klik **Terbitkan revisi**!

---

## 2. Sepuluh *Red Flags* Instan (Otomatis **NO-GO / Tahan Publikasi**)

1. **Tanda `$` atau `\frac` mentah muncul di Live Preview** (kesalahan sintaks KaTeX).
2. **Gambar Figural broken (`404`) atau masih URL `127.0.0.1` / `localhost`**.
3. **Nama tokoh berubah** antara soal dan pembahasan, atau nama tokoh yang sama diulang di banyak soal.
4. **Huruf kunci atau rincian skor `5..1` di pembahasan tidak cocok** dengan bobot opsi.
5. **Satu saja soal TKP yang opsi skor 4-nya terasa lebih bijak/taat SOP daripada skor 5**.
6. **Pola klise TKP mencolok:** 3 dari 4 soal sampel TKP langsung ketahuan skor 5-nya karena jauh paling panjang atau mengulang frase klise sama.
7. **Soal TWK menyebut nomor pasal yang salah/tidak ada** di `uud_1945_lengkap.md` / `uu_20_2023_asn_lengkap.md`.
8. **Soal TIU menanyakan "tambahan pekerja" tetapi kunci menjawab "total pekerja"**.
9. **Ada jejak artefak AI** (*"Berikut adalah pembahasannya:"*, *"Sebagai AI..."*, dsb.).
10. **Satu saja gambar Figural memiliki 2 opsi tampak identik**, ada bocoran warna kunci, atau elemen visual saling bertumpuk.

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
- [ ] **Menit 0–3:** `audit-report.md` (0 hard error, 0 warning kritikal, similarity vs Packet 1–15 TWK/TKP < 50% & TIU < 85%, bias panjang <= 35%) & `cross-model-audit.md` (0 KRITIS, 0 MAYOR terbuka).
- [ ] **Menit 3–7:** Seluruh gambar Figural tajam, ≥ 2 transformasi logis, tanpa overlap/bocoran kunci, dan URL publik Supabase aktif.
- [ ] **Menit 7–12:** 10 soal sampel stratifikasi diperiksa (TWK `#__, #__, #__`; TIU `#__, #__, #__`; TKP `#__, #__, #__, #__`) — bebas 10 Red Flags.
- [ ] **Menit 12–15:** Split-Pane Live Preview di `/admin/questions` (KaTeX + Tabel + Figural) & Pre-publish Validation di `/admin/packages` hijau.

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
