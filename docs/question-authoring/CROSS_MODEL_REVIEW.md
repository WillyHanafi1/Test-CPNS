# CROSS_MODEL_REVIEW.md — Protokol Review Silang Beda Model (Adversarial QA)

Dokumen ini mengatur prosedur **Review Silang Beda Model** (*Cross-Model Adversarial Audit*) sebelum paket soal SKD 110 nomor memasuki tahap Spot-Check Manusia dan publikasi di `/admin/packages`.

---

## 1. Mengapa Wajib Beda Model?

Satu model AI yang mengaudit soal buatannya sendiri memiliki **self-confirmation bias**:
- Pada **TWK**, model cenderung membenarkan pasal UUD/UU atau ejaan KBBI yang ia kira benar dari memori latihnya.
- Pada **TIU Analitis, Silogisme, Numerik, & Kecukupan Data**, model yang melihat kunci jawaban cenderung langsung "setuju" tanpa menguji skenario alternatif atau kasus batas (*counterexample*).
- Pada **TKP**, model punya gaya bahasa khas yang membuat opsi skor 5 terasa kentara bagi dirinya sendiri, padahal ambigu terhadap opsi skor 4 bagi peserta manusia.

Dengan memisahkan **Generator** dan **Auditor** (keluarga model berbeda + sesi baru tanpa riwayat pembuatan), *blind spot* satu model tertangkap sebelum merugikan peserta tryout.

### Matriks Pasangan Model Disarankan

| Model Generator (Pembuat Soal) | Model Auditor Disarankan (Penguji Silang) | Fokus Kekuatan Auditor |
| :--- | :--- | :--- |
| **Gemini Pro** | **Claude Sonnet/Opus** atau **OpenAI o3 / GPT-5** | Claude tajam membedah nuansa TKP & EYD V; o3/GPT-5 tajam menguji *edge-case* logika & kecukupan data TIU. |
| **Claude Sonnet/Opus** | **Gemini Pro** atau **OpenAI o3 / GPT-5** | Gemini kuat memverifikasi korpus panjang (UUD 1945 & UU ASN lengkap dalam 1 konteks); o3 kuat pada pembuktian numerik. |
| **OpenAI GPT-5 / o3** | **Claude Sonnet/Opus** atau **Gemini Pro** | Mendeteksi bahasa terjemahan kaku, bias panjang/koma opsi TKP, dan presisi pasal hukum Indonesia. |

---

## 2. Alur Eksekusi 4 Batch Audit (Anti Context-Fatigue)

**JANGAN** melempar 110 soal sekaligus dalam 1 prompt tunggal ke Auditor! Di atas 40 soal sekaligus, ketelitian LLM turun drastis (*lost-in-the-middle effect*). Pecah audit menjadi **4 sesi terpisah** memakai generator paket audit otomatis di [validate_question_pack.py](file:///d:/ProjectAI/Test-CPNS/scripts/validate_question_pack.py):

```powershell
python scripts/validate_question_pack.py data/generated/<kode_paket>/<kode_paket>-bank-soal-final.json --export-blind-audit data/generated/<kode_paket>/cross_audit/
```

Perintah di atas otomatis menghasilkan 6 berkas di `data/generated/<kode_paket>/cross_audit/`:

| Berkas | Isi | Mode Audit | Lampiran Wajib untuk Auditor |
| :--- | :--- | :--- | :--- |
| `audit_01_twk.json` | Nomor `1–30` (lengkap dengan kunci & pembahasan) | **Verifikasi Fakta & Hukum** | `uud_1945_lengkap.md`, `uu_20_2023_asn_lengkap.md`, `korpus_twk_tkp_lengkap.md`, `korpus_bahasa_indonesia_kbbi6_eyd5.md` |
| `audit_02_tiu_blind.json` | Nomor `31–59` (**TANPA `score` dan TANPA `discussion`!**) | **Blind-Solve dari Nol** | Tidak perlu korpus hukum; Auditor wajib mengerjakan sendiri semua 29 soal lalu dicocokkan ke `audit_02_tiu_key.json`! |
| `audit_03_figural_blind.json` | Nomor `60–65` (atau `58–65`) (**TANPA `score` & `discussion`**) + PNG Figural terpisah (`soal.png` & `opsi-a..e.png`) | **Audit Visual Multimodal** | Unggah semua PNG Figural (`soal.png` + `opsi-a..e.png`) langsung ke model multimodal berbeda, minta pecahkan pola dari nol lalu cocokkan ke `audit_03_figural_key.json`! |
| `audit_04_tkp.json` | Nomor `66–110` (lengkap dengan bobot 5→1 & pembahasan) | **Audit Rubrik & Anti-Bias** | `uu_20_2023_asn_lengkap.md` (Pasal 2, 3, 4) & `korpus_twk_tkp_lengkap.md` |

> **Aturan Khusus TIU Blind-Solve (`audit_02_tiu_blind.json`):**
> Setelah Auditor selesai menjawab secara buta, cocokkan jawaban Auditor dengan `audit_02_tiu_key.json`. Setiap nomor yang jawabannya **berbeda** (atau ditandai "ambigu / lebih dari 1 jawaban") otomatis menjadi **Temuan KRITIS (`P0`)** dan wajib dibuktikan ulang lewat skrip Python!

---

## 3. Prompt Audit Khusus per Batch

### 3.1 Prompt 6A — Audit TWK (`#1–30`, Verifikasi Korpus Hukum & Bahasa)
```text
Peran: Kamu adalah Auditor Senior TWK CPNS BKN yang sangat kritis dan skeptis. Tugasmu BUKAN memuji, melainkan mencari kesalahan hukum, halusinasi pasal/sejarah, kesalahan KBBI VI/EYD V, ambiguitas, atau pengecoh lemah pada 30 soal TWK terlampir (audit_01_twk.json).

Aturan Audit Ketat:
1. COCOKKAN VERBATIM KE KORPUS TERLAMPIR:
   - Setiap nomor Pasal/Ayat UUD 1945 cocokkan ke uud_1945_lengkap.md.
   - Setiap norma/pasal ASN/BerAKHLAK cocokkan ke uu_20_2023_asn_lengkap.md.
   - Setiap fakta sejarah, Bela Negara, & KPK cocokkan ke korpus_twk_tkp_lengkap.md.
   - Setiap kata baku, huruf kapital, tanda baca, idiom, & kalimat efektif cocokkan ke korpus_bahasa_indonesia_kbbi6_eyd5.md (EYD V & KBBI VI, termasuk aturan "Yang Maha Kuasa" terpisah dan 14 konjungsi "-pun" serangkai).
2. SERANG KUNCI, LABEL, & PENGECOH:
   - Adakah opsi pengecoh yang SEBENARNYA juga bisa dibenarkan secara hukum/bahasa?
   - Apakah 6 soal pada blok `sub_category: "Bahasa Indonesia"` benar-benar mencakup 6 sub-tipe yang bervariasi tanpa pengulangan?
   - Apakah seluruh `sub_category` kanonik & cocok dengan isi soal, bebas tanda `-` menggantung di akhir opsi, serta nama tokoh, instansi, dan huruf kunci di soal 100% cocok dengan pembahasan?
3. Outputkan HANYA soal bermasalah dalam tabel:
   | Nomor | Tingkat (KRITIS / MAYOR / MINOR) | Kategori Cacat | Bukti Spesifik (Rujuk Pasal/Kaidah) | Saran Perbaikan Eksak |
   Jika seluruh 30 soal benar-benar bersih tanpa cacat, tulis: "LULUS AUDIT SILANG TWK (0 TEMUAN KRITIS, 0 MAYOR)".
```

### 3.2 Prompt 6B — Audit TIU Verbal & Numerik (`#31–59`, Mode Blind-Solve)
```text
Peran: Kamu adalah peserta uji coba jenius sekaligus Auditor Psikometri TIU SKD CPNS.

Terlampir file audit_02_tiu_blind.json berisi soal TIU non-figural TANPA kunci jawaban dan TANPA pembahasan.

Tugasmu (WAJIB KERJAKAN DARI NOL):
1. Selesaikan setiap soal secara mandiri dengan langkah ringkas.
2. Untuk setiap soal, tentukan:
   - Jawaban pilihanmu (A/B/C/D/E), ATAU tulis "TIDAK ADA OPSI TEPAT" / "AMBIGU (mis. B dan D sama-sama benar)".
   - Tingkat keyakinan (PASTI / RAGU).
   - Catatan cacat jika ada (soal kurang informasi, salah satuan, premis analitis multi-solusi, kesesatan silogisme, pernyataan kecukupan data ternyata cukup/tidak cukup, dua opsi bernilai ekuivalen seperti 1,5 dan 3/2, atau `sub_category` tidak sesuai isi soal).
3. Sajikan hasil dalam tabel rapi:
   | Nomor | Jawaban Auditor | Keyakinan | Catatan Cacat / Ambiguitas (isi "-" jika bersih) |
```

### 3.3 Prompt 6C — Audit TIU Figural (`#60–65`, Multimodal Visual Blind-Solve)
```text
Peran: Kamu adalah Auditor Visual Soal TIU Figural SKD CPNS.

Terlampir paket gambar terpisah soal Figural (`soal.png` dan 5 opsi `opsi-a.png`..`opsi-e.png`, mencakup Analogi, Ketidaksamaan, Serial, dan Matriks 3×3) beserta teks soal tanpa kunci.
Untuk SETIAP soal, lakukan hal berikut SEBELUM melihat kunci:
1. Sebutkan pola transformasi geometris yang kamu lihat secara objektif (rotasi, pencerminan, garis acuan, jumlah sisi/garis, posisi sudut, pergantian warna/arsiran, aturan matriks baris/kolom).
2. Pilih 1 opsi jawaban (A/B/C/D/E) yang paling tepat menurut analisismu.
3. Audit kualitas visual ramah mobile: apakah ada garis/titik bertabrakan, simbol buram/terpotong di tepi, kotak tidak simetris, bocoran warna kunci, atau dua gambar opsi tampak kembar?
4. Outputkan dalam tabel:
   | Nomor | Jawaban Auditor | Pola yang Teridentifikasi | Cacat Visual / Ambiguitas (isi "-" jika bersih) |
```

### 3.4 Prompt 6D — Audit TKP (`#66–110`, Audit Rubrik 5→1, Anti-Bias, & Anti-Boilerplate)
```text
Peran: Kamu adalah Asesor Psikologi ASN Senior & Auditor TKP BKN yang sangat kritis terhadap soal Situational Judgment Test (SJT).

Terlampir audit_04_tkp.json berisi 45 soal TKP (#66–110) beserta bobot 5–4–3–2–1 dan pembahasannya, serta rujukan Pasal 4 UU No. 20/2023 (BerAKHLAK).

Serang dan periksa seluruh 45 soal terhadap 7 kriteria keras berikut:
1. KEDUDUKAN SKOR 5 vs SKOR 4 (KRITIS): Apakah opsi skor 5 BENAR-BENAR tak terbantahkan lebih unggul daripada opsi skor 4? Tandai KRITIS jika opsi skor 4 terasa sama baiknya atau justru lebih realistis/taat SOP!
2. HIERARKI 3 → 2 → 1: Apakah urutan gradasi skor 3, 2, dan 1 masuk akal secara psikologis dan etika ASN (tidak terbalik)?
3. ANTI-BIAS PANJANG, ANTI-KOMA-3-AKSI, & ANTI-KLISE: Apakah opsi skor 5 langsung ketahuan karena paling panjang, selalu memakai daftar 3 aksi berkoma sementara skor 1–3 tanpa koma, atau memakai frasa klise berulang? Apakah opsi skor 1 terdengar seperti penjahat kartun?
4. DILEMA NYATA & KERAGAMAN: Apakah skenario cukup realistis di lingkungan instansi Indonesia, cocok dengan `sub_category`-nya, dan tidak mengulang nama tokoh/kasus soal sebelumnya?
5. ANTI-RADIKALISME: Apakah opsi skor 5 menempuh jalur tegas, objektif, edukatif/prosedural tanpa main hakim sendiri dan tanpa sikap permisif?
6. KONSISTENSI PEMBAHASAN: Apakah seluruh 5 huruf opsi & bobot (5,4,3,2,1) di pembahasan cocok 100% dengan tabel skor?
7. ANTI-BOILERPLATE: Apakah pembahasan memberikan alasan substantif spesifik kasus (bukan kalimat template robotik seperti "Usulnya adalah...", "Tindakan ini memberi respons terbatas", atau "mendapat bobot paling rendah dalam rubrik")?

Outputkan HANYA soal yang bermasalah dalam tabel:
| Nomor | Tingkat (KRITIS / MAYOR / MINOR) | Masalah Spesifik (mis. "Skor 4 vs 5 ambigu") | Saran Revisi Eksak |
Jika seluruh 45 soal bersih tanpa masalah kritis/mayor, tulis: "LULUS AUDIT SILANG TKP (0 TEMUAN KRITIS, 0 MAYOR)".
```

---

## 4. Klasifikasi Temuan, Ambang Kelulusan, & Resolusi Sengketa

### 4.1 Klasifikasi Tingkat Keparahan

| Tingkat | Definisi | Tindakan Wajib |
| :--- | :--- | :--- |
| **KRITIS (`P0`)** | Salah pasal/fakta hukum/kata baku KBBI VI; salah hitung TIU; TIU Analitis punya `> 1` solusi valid; jawaban Blind-Solve berbeda dan kunci ternyata salah; dua opsi identik/ekuivalen; gambar Figural salah pola/tabrakan parah; TKP skor 4 lebih baik dari skor 5; bobot TKP tidak unik atau salah remap. | **WAJIB REVISI 100%** (Blokir publikasi mutlak!). Setelah direvisi, ulangi validasi Python & cek ulang nomor terkait. |
| **MAYOR (`P1`)** | Soal TWK terlalu hafalan dangkal; pengecoh terlalu mudah ditebak; opsi skor 5 TKP terasa terlalu klise/kepanjangan/bias koma; pembahasan TKP memakai kalimat template robotik; nama tokoh berulang; typo/tanda `-` menggantung; gambar Figural kurang tajam tapi pola masih benar; `sub_category` tidak sesuai. | **WAJIB REVISI** seluruh temuan mayor sebelum finalisasi `.xlsx`. |
| **MINOR (`P2`)** | Saran gaya bahasa opsional atau tambahan penjabaran pengecoh di pembahasan. | Boleh diperbaiki jika sempat; tidak memblokir publikasi. |

### 4.2 Protokol Resolusi Sengketa (Jika Generator ≠ Auditor)
Selesaikan secara objektif dengan **Hierarki Kebenaran**:
1. **TWK Hukum/ASN:** Cek teks verbatim di `uud_1945_lengkap.md` atau `uu_20_2023_asn_lengkap.md`. Teks undang-undang menang mutlak.
2. **TWK Bahasa Indonesia:** Cek `korpus_bahasa_indonesia_kbbi6_eyd5.md` (EYD V & KBBI VI).
3. **TIU Numerik / Analitis / Silogisme / Kecukupan Data:** Jalankan skrip Python pembuktian deterministik (`Fraction`, `permutations`, *truth table*). Eksekusi Python menang mutlak.
4. **TKP (SJT):** Jika dua model berbeda pendapat tajam soal skor 5 vs 4, artinya soal memang ambigu bagi manusia — **pertajam kontras opsi skor 4** hingga kedua model sepakat 100%.

### 4.3 Ambang Kelulusan Review Silang
- **Temuan KRITIS (`P0`) tersisa:** `0`
- **Temuan MAYOR (`P1`) belum diselesaikan:** `0`
- **Akurasi Blind-Solve TIU (non-figural + figural):** `100%` cocok dengan kunci setelah seluruh sengketa diselesaikan.
- **File `data/generated/<kode_paket>/cross-model-audit.md` tersimpan** berisi log temuan & perbaikan.
