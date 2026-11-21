# HUMAN_SPOT_CHECK_SOP.md — SOP Spot-Check Manusia 15 Menit Pra-Terbit

Dokumen ini adalah **gerbang terakhir manusia (*Final Human Sign-Off*)** yang dilakukan oleh pemilik/editor TOCPNS tepat sebelum mengklik tombol **Terbitkan** di `/admin/packages`.

Meskipun soal sudah lulus **Quality Gate Python (`validate_question_pack.py`)** dan **Review Silang Beda Model (`CROSS_MODEL_REVIEW.md`)**, pemeriksaan manusia selama **15 menit** tetap krusial untuk menangkap hal yang sering luput dari otomasi: estetika gambar Figural di layar nyata, rasa kewajaran bahasa Indonesia, rendering KaTeX di browser, dan kualitas dilema TKP.

---

## 1. Alokasi Waktu Terstruktur (Total 15 Menit)

### Menit 0–3 — Audit Dasbor Metrik (`audit-report.md` & `cross-model-audit.md`)
Buka `data/generated/<kode_paket>/audit-report.md` dan `cross-model-audit.md`, lalu verifikasi 6 angka kunci berikut dalam 3 menit:
- [ ] **Total soal & kuota segmen:** Tepat `110` (`TWK 30 / TIU 35 / TKP 45`).
- [ ] **Hard Errors:** `0` (Wajib mutlak). **Warnings:** `0` (atau seluruh warning sudah diberi alasan tertulis yang sah).
- [ ] **Kemiripan terhadap `Packet 1` & `Packet 2`:** TWK/TKP `< 50%`, TIU ubah-angka `< 85%` (dan angka berubah). Kemiripan internal `< 55%`.
- [ ] **Rasio opsi kunci terpanjang:** `<= 35%` (target ideal setara BKN: `12%–25%`).
- [ ] **Distribusi kunci A–E per segmen:** Merata tanpa huruf dominan (`selisih max - min <= 2` di TWK, TIU non-figural, dan TKP) dan tanpa pola siklus berulang.
- [ ] **Review Silang Beda Model:** `0` temuan KRITIS tersisa, `0` temuan MAYOR belum ditutup, Blind-Solve TIU `100%` cocok.

---

### Menit 3–7 — Inspeksi Visual 6 Gambar Figural (`#60–65`)
Buka keenam berkas `data/generated/<kode_paket>/gambar/q60_figural.png` s.d. `q65_figural.png` (sekaligus setelah diunggah ke bucket publik Supabase `exam-assets/figural/<kode_paket>/`):
- [ ] **Tebak sendiri dalam 20 detik/gambar** sebelum melirik pembahasan: apakah pola geometrisnya terasa adil, logis, dan tidak terlalu gampang/terlalu abstrak?
- [ ] **Ketajaman & Tipografi:** Latar putih bersih, garis hitam tajam, label `A, B, C, D, E` serta tanda `?` besar, rata tengah, dan terbaca jelas bahkan di layar HP/tablet.
- [ ] **Nol Tabrakan Visual:** Tidak ada titik sudut yang menimpa garis tengah, tidak ada panel terpotong, tidak ada dua opsi gambar yang tampak kembar.
- [ ] **Kesesuaian URL Publik:** Kolom `image_url` di `.xlsx` final sudah memakai URL publik Supabase `https://<project>.supabase.co/storage/v1/object/public/exam-assets/figural/<kode_paket>/q6X_figural.png` (bukan `127.0.0.1` atau path lokal!).

---

### Menit 7–12 — Spot-Check 8–10 Soal Sampel Berisiko Tinggi
Ambil **10 soal sampel stratifikasi** langsung dari `.xlsx` final (atau dari panel `/admin/questions` setelah impor ke paket Draft) dengan komposisi prioritas risiko tertinggi:

| Kelompok Sampel | Jumlah | Fokus Pemeriksaan Editor Manusia |
| :--- | :-: | :--- |
| **TWK Pasal / Hukum (`#1–25`)** | 2 soal | Cek 1 soal Pilar Negara & 1 soal Nasionalisme/Integritas: apakah skenarionya terasa Indonesia & realistis, bukan terjemahan kaku? Cocokkan nomor pasal dengan pembahasan. |
| **TWK Bahasa Indonesia (`#26–30`)** | 1 soal | Baca lantang kalimat pada kunci jawaban: apakah memang efektif, tidak rancu, dan ejaan sesuai EYD V/KBBI VI? |
| **TIU Analitis & Silogisme (`#35–42`)** | 2 soal | Coba pecahkan cepat di kepala/kertas: apakah kalimat premisnya jelas (tidak multitafsir secara bahasa Indonesia)? |
| **TIU Numerik KaTeX (`#43–59`)** | 1 soal | Periksa satuan (jam vs menit, km vs meter, tambahan pekerja vs total pekerja) dan pastikan pembahasan mudah diikuti peserta. |
| **TKP Batas Skor 5 vs 4 (`#66–110`)** | 4 soal | **Area paling krusial!** Baca 4 soal dari sub-topik berbeda (wajib sertakan 1 soal **Anti Radikalisme** & 1 soal **Pelayanan Publik**). Tutup skornya, pilih jawaban terbaik menurut instingmu sendiri — apakah pilihanmu cocok dengan skor 5? Apakah panjang 5 opsi seragam dan opsi skor 1 tidak terdengar seperti penjahat kartun? |

---

### Menit 12–15 — Verifikasi Live Rendering di `/admin/questions` & Terbitkan di `/admin/packages`
1. **Impor ke Paket Draft:**
   - Buka `/admin/packages` → buat paket baru (otomatis **Draft**) dengan judul, deskripsi, tier (Gratis/Pro), dan durasi `100` menit.
   - Buka `/admin/questions` → pilih paket Draft tersebut → klik **Import Excel / CSV** → unggah `<kode_paket>-impor-final.xlsx`.
2. **Cek Split-Pane Live Preview pada 5 Soal di Browser Asli:**
   - [ ] **1 soal TIU pecahan/akar/pangkat (`#43–59`):** Pastikan KaTeX ter-render indah (tidak ada tanda `$` mentah atau teks merah error KaTeX!).
   - [ ] **1 soal TIU Figural (`#60–65`):** Pastikan gambar tampil langsung dari Supabase Storage tanpa broken image (`404`/`403`) dan proporsional.
   - [ ] **1 soal TWK & 1 soal TKP:** Pastikan paragraf rapi, tidak ada karakter aneh (`\n` mentah, mojibake, atau tag HTML bocor).
   - [ ] **Pembahasan & Kunci:** Pastikan badge skor (`5`, `4`, `3`, `2`, `1`) di UI Admin cocok dengan huruf yang disebut di paragraf pembahasan.
3. **Validasi Server & Terbitkan:**
   - Kembali ke `/admin/packages` → klik **Validasi & Terbitkan** pada paket Draft tersebut.
   - Pastikan panel *Pre-publish Validation* dari server TOCPNS melaporkan **0 blocker / siap terbit** → klik **Terbitkan revisi**!

---

## 2. Sepuluh *Red Flags* Instan (Otomatis **NO-GO / Tahan Publikasi**)

Hentikan publikasi segera dan kembalikan paket ke fase perbaikan jika kamu menemukan **SATU SAJA** tanda bahaya berikut selama 15 menit spot-check:

1. **Tanda `$` atau `\frac` mentah muncul di Live Preview** (kesalahan sintaks KaTeX).
2. **Gambar Figural broken (`404`) atau masih URL `127.0.0.1` / `localhost`**.
3. **Nama tokoh berubah** antara soal dan pembahasan (mis. soal *"Bu Rina"*, pembahasan *"Pak Budi"*).
4. **Huruf kunci di pembahasan tidak cocok** dengan opsi berskor 5 (tanda salah remap).
5. **Satu saja soal TKP yang opsi skor 4-nya terasa lebih bijak/taat aturan daripada skor 5**.
6. **Pola klise TKP mencolok:** 3 dari 4 soal sampel TKP langsung ketahuan skor 5-nya hanya karena paling panjang atau selalu memakai kalimat sakti *"segera berkoordinasi secara proaktif dan humanis..."*.
7. **Soal TWK menyebut nomor pasal yang ternyata tidak ada / salah ayat** saat dicek cepat di `uud_1945_lengkap.md` atau `uu_20_2023_asn_lengkap.md`.
8. **Soal TIU menanyakan "tambahan pekerja" tetapi kunci menjawab "total pekerja"** (kesalahan baca target pertanyaan).
9. **Ada jejak artefak AI** seperti *"Berikut adalah pembahasannya:"*, *"Sebagai AI..."*, *"Opsi yang benar berdasarkan konteks di atas..."*, atau markdown bintang ganda `**` yang bocor tidak rapi.
10. **Satu saja gambar Figural memiliki 2 opsi tampak identik** atau elemen visual saling bertumpuk.

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
- [ ] **Menit 0–3:** `audit-report.md` (0 hard error, similarity < 35%, bias panjang <= 35%) & `cross-model-audit.md` (0 KRITIS, 0 MAYOR terbuka).
- [ ] **Menit 3–7:** Seluruh 6 gambar Figural (`#60–65`) tajam, tanpa overlap, pola logis, dan URL publik Supabase aktif.
- [ ] **Menit 7–12:** 10 soal sampel stratifikasi diperiksa (Nomor yang dicek: TWK `#__, #__, #__`; TIU `#__, #__, #__`; TKP `#__, #__, #__, #__`) — bebas 10 Red Flags.
- [ ] **Menit 12–15:** Split-Pane Live Preview di `/admin/questions` (KaTeX + gambar Figural) & Pre-publish Validation di `/admin/packages` hijau.

## Keputusan Akhir
- **Status:** [ ] GO — TERBITKAN  |  [ ] NO-GO — KEMBALIKAN KE REVISI
- **Catatan Editor:** <isi temuan minor atau "Siap terbit tanpa catatan">
```

---

## 4. Siklus Kalibrasi Pasca-Terbit (*Post-Launch Psychometric Loop*)

Setelah paket dipublikasikan dan dikerjakan oleh minimal **50–100 peserta nyata**, lakukan evaluasi berkala lewat data analitik TOCPNS (`/admin/analytics` & `exam_responses`):

| Indikator Empiris Peserta | Arti Psikometris | Tindakan Editorial |
| :--- | :--- | :--- |
| **Tingkat benar `> 90%`** (TWK/TIU) atau **rata-rata skor `> 4,6`** (TKP) | Soal terlalu mudah / pengecoh terlalu lemah / skor 5 terlalu klise. | Pertajam pengecoh pada paket-paket berikutnya (atau buat revisi versi baru paket). |
| **Tingkat benar `< 15%`** (TWK/TIU) atau **rata-rata skor `< 2,5`** (TKP) | Kemungkinan besar soal ambigu, pengecoh lebih meyakinkan, atau kunci salah. | **Audit darurat nomor tersebut!** Perbaiki soal jika memang cacat/ambigu. |
| **Banyak peserta memilih 1 pengecoh tertentu (`> 50%` memilih pengecoh X)** | Pengecoh X mungkin memiliki tafsir sah yang terlewat saat review. | Verifikasi ulang terhadap korpus hukum/Python solver; perjelas redaksi soal. |
| **Waktu pengerjaan rata-rata `> 95` menit (banyak soal kosong di akhir)** | Teks soal secara keseluruhan terlalu panjang dibanding standar BKN. | Turunkan batas panjang kata per soal di `BLUEPRINT.md` untuk paket berikutnya. |
