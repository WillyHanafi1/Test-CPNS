# Packet 5 · Try Out SKD CASN 2026 – Packet 5

Seluruh nomor 1–110 ditemukan secara lengkap dan berurutan pada 110 tangkapan layar (`Screenshot 2026-11-23 130651.png` s.d. `Screenshot 2026-11-23 131550.png`). Semua nomor memiliki isi soal, lima opsi A–E, kunci jawaban, bobot skor, dan pembahasan yang terverifikasi secara visual terhadap tangkapan layar asli.

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Distribusi topik dan kunci jawaban

| Segmen | Topik | Jumlah |
| --- | --- | ---: |
| TWK | Pilar Negara | 9 |
| TWK | Nasionalisme | 7 |
| TWK | Bahasa Indonesia | 6 |
| TWK | Bela Negara | 5 |
| TWK | Integritas | 3 |
| TIU | Numerik | 16 |
| TIU | Verbal | 10 |
| TIU | Figural | 9 |
| TKP | Jejaring Kerja | 9 |
| TKP | Pelayanan Publik | 8 |
| TKP | Profesionalisme | 8 |
| TKP | Anti Radikalisme | 7 |
| TKP | Teknologi Informasi dan Komunikasi | 7 |
| TKP | Sosial Budaya | 6 |

Distribusi kunci jawaban keseluruhan: `A = 20`, `B = 19`, `C = 28`, `D = 21`, `E = 22` (rasio opsi kunci terpanjang: `23,8%`, di bawah ambang `35%`).

## Temuan kualitas pada soal sumber

| Nomor | Temuan |
| --- | --- |
| 29 | Soal menanyakan *kata bercetak tebal*, namun pada tangkapan layar asli kelima kata uji (`kreatif`, `handal`, `analisis`, `hierarki`, `komprehensif`) tidak dicetak tebal. Kunci sumber tetap **B** (`handal` → baku: `andal`). |
| 32 | Secara logika silogisme formal, dari `Semua p → q` dan `Sebagian q → r` tidak pasti mengikuti `Sebagian p → r`. Kunci sumber **D** tetap dipertahankan sesuai tangkapan layar. |
| 60 | Subjudul pembahasan sumber tertulis `Pola gambar (1) ke gambar (2)`, padahal ilustrasi dan uraian di bawahnya membahas gambar `(3)` ke gambar `(4)`. Kunci sumber tetap **E**. |
| 63 | Teks pembahasan sumber kurang satu kata (`berlawanan arah jarum.` tanpa `jam`). Header soal tergulir di atas tepi tangkapan layar, tetapi diagram, opsi, dan pembahasan utuh. Kunci **C**. |
| 64 | Pembahasan sumber menyebut `pada kolom ke-3`, padahal tanda tanya (`?`) pada matriks 3×3 berada di baris ke-3 kolom ke-2. Diagram, opsi, dan pembahasan utuh. Kunci **B**. |
| 65 | Teks pembahasan sumber tertulis `berputar sebesar 90° arah jarum.` dan menyebut `pada kolom ke-3`, padahal tanda tanya (`?`) berada di baris ke-3 kolom ke-1. Diagram, opsi, dan pembahasan utuh. Kunci **A**. |

## Pembersihan ekstraksi

- Seluruh 110 tangkapan layar ditranskripsi langsung secara visual (bebas cacat OCR koma/titik maupun salah baca huruf).
- Normalisasi minor tanda baca dan spasi tanpa mengubah kunci maupun bobot skor: `diatas` → `di atas` (nomor 15), elipsis `..` → `...` (nomor 10, 12), `pel ayanan` → `pelayanan` (nomor 95 opsi D), `yan g` → `yang` (nomor 88 opsi C), serta titik ganda `skor 1..` → `skor 1.` (nomor 102).
- Label topik TKP di akhir pertanyaan (seperti `(Profesionalisme)`, `(TIK)`, `(Sosial Budaya)`) diekstrak ke kolom `topic` / `sub_category` (dengan `(TIK)` dinormalisasi menjadi `Teknologi Informasi dan Komunikasi`) dan dibersihkan dari teks soal.
- Penanda watermark pihak ketiga pada pembahasan numerik nomor 46, 48, dan 49 dibersihkan sambil mempertahankan seluruh langkah perhitungan matematisnya.
- JSON dan Excel disinkronkan penuh (`110 soal`, `550 opsi`, `0 hard error` pada `scripts/validate_question_pack.py`).

## Format dan verifikasi

`packet5-bank-soal.json` memuat ID stabil (`skd-casn-2026-packet5-001` s.d. `110`), nomor, segmen, topik, lima opsi, bobot, kunci, pembahasan, rujukan tangkapan layar, dan `recorded_answer` (9 jawaban terekam pada nomor 1–8 dan 11; 101 nilai `null`). `source_details` menyimpan 12 tabel terstruktur untuk soal kuantitatif/tabel (nomor 41, 42, 43, 45, 46, 48, 49, dan 56), di luar 45 tabel bobot TKP yang tersimpan langsung pada opsi. Seluruh rumus dan pecahan ditulis dalam LaTeX (`$...$`). Sembilan gambar soal figural (`packet5-057-soal.png` s.d. `packet5-065-soal.png`) dan 15 ilustrasi pembahasan (`packet5-050` s.d. `055`, `057` s.d. `065`) tersimpan di folder `gambar` dengan jalur relatif terhadap JSON dan telah diperiksa secara visual.

`packet5-impor-draft.xlsx` memakai sheet `Impor` dan 16 kolom standar impor TOCPNS seperti Packet 1–4. Kedua berkas (JSON dan Excel) lolos `scripts/validate_question_pack.py` dengan **0 hard error**, kemiripan maksimum terhadap Packet 1 & 2 sebesar `30,9%`, dan tanpa duplikat soal/figural terhadap Packet 1–4.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan impor `packet5-impor-draft.xlsx` ke draft kosong untuk Packet 5.
2. Jalankan server gambar lokal dari root repositori pada port `8769` dan biarkan aktif saat memeriksa pratinjau gambar.
3. Periksa pratinjau nomor 38 untuk rumus LaTeX, nomor 53 untuk diagram urutan pembahasan, nomor 57 dan 65 untuk gambar figural, serta nomor 66 untuk bobot TKP.

```powershell
python -m http.server 8769 --bind 127.0.0.1 --directory "data/Packet 5/outputs/packet5/gambar"
```
