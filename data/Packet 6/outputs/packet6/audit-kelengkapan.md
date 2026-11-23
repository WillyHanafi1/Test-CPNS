# Packet 6 · Try Out SKD CASN 2026 – Packet 6

Seluruh nomor 1–110 ditemukan secara lengkap pada 111 tangkapan layar (`Screenshot 2026-11-23 132739.png` s.d. `Screenshot 2026-11-23 133623.png`). Satu nomor (nomor 40) memiliki dua tangkapan layar: tangkapan pertama (`Screenshot 2026-11-23 133113.png`) belum selesai merender rumus MathJax sehingga dicatat sebagai `alternates`, sedangkan tangkapan kedua (`Screenshot 2026-11-23 133117.png`) yang utuh digunakan sebagai sumber utama (`primary`).

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Distribusi topik dan kunci jawaban

| Segmen | Topik | Jumlah |
| --- | --- | ---: |
| TWK | Pilar Negara | 10 |
| TWK | Nasionalisme | 7 |
| TWK | Bahasa Indonesia | 6 |
| TWK | Bela Negara | 4 |
| TWK | Integritas | 3 |
| TIU | Numerik | 16 |
| TIU | Verbal | 10 |
| TIU | Figural | 9 |
| TKP | Profesionalisme | 12 |
| TKP | Anti Radikalisme | 10 |
| TKP | Sosial Budaya | 9 |
| TKP | Jejaring Kerja | 8 |
| TKP | Pelayanan Publik | 6 |

> **Catatan distribusi topik TKP sumber:** Pada 45 tangkapan layar TKP Packet 6 tidak terdapat label topik `Teknologi Informasi dan Komunikasi` (seluruh 45 soal terbagi ke 5 aspek di atas sesuai label sumber).

Distribusi kunci jawaban keseluruhan: `A = 23`, `B = 29`, `C = 19`, `D = 20`, `E = 19` (rasio opsi kunci terpanjang: **`20,8%`**, paling seimbang di antara seluruh paket dan jauh di bawah ambang `35%`).

## Temuan kualitas pada soal sumber

| Nomor | Temuan |
| --- | --- |
| 40 | Terdapat dua tangkapan layar; tangkapan pertama (`Screenshot 2026-11-23 133113.png`) belum merender MathJax secara lengkap sehingga dicatat pada `alternates`, dan tangkapan kedua (`Screenshot 2026-11-23 133117.png`) dipakai sebagai sumber utama. |
| 65 | Header `Soal Nomor 65 (PG)` dan teks `Perhatikan gambar berikut!` berada di atas tepi tangkapan layar, namun grid matriks 3×3, kelima opsi A–E, teks pembahasan, dan kedua ilustrasi pembahasan tampil utuh. |
| 94 | Tangkapan layar sumber tidak memuat tabel `SKOR JAWABAN`. Bobot skor (`C=5, A=4, B=3, D=2, E=1`) diambil langsung dari uraian pembahasan sumber dan terkonfirmasi cocok dengan opsi hijau **C**. |

## Pembersihan ekstraksi

- Seluruh 111 tangkapan layar ditranskripsi langsung secara visual (0 cacat OCR koma/titik maupun salah baca karakter).
- Perbaikan typo minor sumber tanpa mengubah kunci maupun bobot skor: `layanan dasa` → `layanan dasar.` (nomor 6 opsi E), `ekslusif` → `eksklusif` (nomor 21 opsi A), `kontrakkan` → `kontrakan` (nomor 46), `Skor Presentase` → `Skor Presentasi` (nomor 56), `alam dunia kerja` → `Dalam dunia kerja` & `masing masing` → `masing-masing` (nomor 75), `hati hati` → `hati-hati` (nomor 82), `konerja` → `kinerja` (nomor 88 opsi D), `menyederhankan` → `menyederhanakan` (nomor 107 opsi A), serta `menjelaskan dengan bahwa` → `menjelaskan bahwa` (nomor 110 opsi B).
- Label topik TKP di akhir pertanyaan diekstrak ke kolom `topic` / `sub_category` dan dibersihkan dari teks soal.
- Penanda watermark pihak ketiga pada pembahasan numerik nomor 47 dibersihkan sambil mempertahankan seluruh langkah perhitungan matematisnya.
- JSON dan Excel disinkronkan penuh (`110 soal`, `550 opsi`, `27 gambar`, `0 hard error` pada `scripts/validate_question_pack.py`).

## Format dan verifikasi

`packet6-bank-soal.json` memuat ID stabil (`skd-casn-2026-packet6-001` s.d. `110`), nomor, segmen, topik, lima opsi, bobot, kunci, pembahasan, rujukan tangkapan layar, dan `recorded_answer` (11 jawaban terekam pada nomor 1–11; 99 nilai `null`). `source_details` menyimpan 5 tabel terstruktur untuk soal tabel/kuantitatif (nomor 41, 42, 43, 55, dan 56). Seluruh rumus matematika dan derajat ditulis dalam LaTeX (`$...$`). Sembilan gambar soal figural (`packet6-057-soal.png` s.d. `packet6-065-soal.png`) dan 18 ilustrasi pembahasan (nomor 50–54, 57–60, 63–65; termasuk 6 gambar kotak hasil `*-pembahasan-hasil.png` pada nomor 57, 58, 59, 60, 63, dan 65) tersimpan di folder `gambar` dengan jalur relatif terhadap JSON dan seluruhnya telah diverifikasi secara visual.

`packet6-impor-draft.xlsx` memakai sheet `Impor` dan 16 kolom standar impor TOCPNS seperti Packet 1–5. Kedua berkas (JSON dan Excel) lolos `scripts/validate_question_pack.py` dengan **0 hard error**, kemiripan maksimum terhadap Packet 1 & 2 sebesar `22,9%`, kemiripan internal maksimum `39,3%`, dan bebas duplikat terhadap Packet 1–5.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan impor `packet6-impor-draft.xlsx` ke draft kosong untuk Packet 6.
2. Jalankan server gambar lokal dari root repositori pada port `8770` dan biarkan aktif saat memeriksa pratinjau gambar.
3. Periksa pratinjau nomor 40 untuk rumus LaTeX, nomor 53–54 untuk diagram pembahasan analitis, nomor 57 & 65 untuk soal figural dengan dua ilustrasi pembahasan, serta nomor 66 untuk bobot TKP.

```powershell
python -m http.server 8770 --bind 127.0.0.1 --directory "data/Packet 6/outputs/packet6/gambar"
```
