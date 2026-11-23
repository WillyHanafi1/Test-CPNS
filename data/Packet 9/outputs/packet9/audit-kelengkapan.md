# Packet 9 · Try Out SKD CASN 2026 – Packet 9

Seluruh nomor 1–110 ditemukan secara utuh pada 113 tangkapan layar (`Screenshot 2026-11-23 175918.png` s.d. `Screenshot 2026-11-23 180540.png`). Tiga nomor figural memiliki dua tangkapan layar yang telah digabungkan (`primary` + `alternates`), yaitu lanjutan pembahasan figural matriks pada **nomor 63**, **64**, dan **65**.

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Distribusi topik dan kunci jawaban

| Segmen | Topik | Jumlah |
| --- | --- | ---: |
| TWK | Nasionalisme | 9 |
| TWK | Pilar Negara | 7 |
| TWK | Bahasa Indonesia | 6 |
| TWK | Bela Negara | 4 |
| TWK | Integritas | 4 |
| TIU | Numerik | 15 |
| TIU | Verbal | 11 |
| TIU | Figural | 9 |
| TKP | Jejaring Kerja | 10 |
| TKP | Anti Radikalisme | 9 |
| TKP | Teknologi Informasi dan Komunikasi | 9 |
| TKP | Pelayanan Publik | 9 |
| TKP | Sosial Budaya | 4 |
| TKP | Profesionalisme | 4 |

Distribusi kunci jawaban keseluruhan: `A = 28`, `B = 17`, `C = 24`, `D = 21`, `E = 20` (rasio opsi kunci terpanjang: **`13,9%`**, jauh di bawah ambang `35%`).

## Kelengkapan & penggabungan tangkapan tambahan

| Nomor | Keterangan penggabungan | Berkas utama (`primary`) | Berkas tambahan (`alternates`) |
| --- | --- | --- | --- |
| 63 | Tangkapan kedua memuat dua diagram dan teks pembahasan figural matriks lengkap. | `Screenshot 2026-11-23 180243.png` | `Screenshot 2026-11-23 180246.png` |
| 64 | Tangkapan kedua memuat dua diagram dan teks pembahasan figural matriks lengkap. | `Screenshot 2026-11-23 180248.png` | `Screenshot 2026-11-23 180250.png` |
| 65 | Tangkapan kedua memuat dua diagram dan teks pembahasan figural matriks lengkap. | `Screenshot 2026-11-23 180255.png` | `Screenshot 2026-11-23 180258.png` |

## Temuan kualitas pada soal sumber (perlu perhatian)

| Nomor | Temuan |
| --- | --- |
| **28** | Pertanyaan menyebut *penggunaan kata bercetak tebal yang salah*, tetapi di tangkapan layar sumber tidak ada kata yang dicetak tebal pada paragraf (`andal`, `standardisasi`, `acuh`, `bergeming`, `produktivitas` dirujuk pada opsi A–E beserta nomor kalimatnya). |
| **46** | Pembahasan sumber membulatkan sisa waktu kerja pecahan $h = \frac{828}{30} = 27{,}6\text{ hari}$ ke atas menjadi $28\text{ hari}$ sehingga total waktu menjadi $61 + 28 = 89\text{ hari}$ (kunci **B**). |
| **74** | Tangkapan layar sumber menduplikasi seluruh paragraf pembahasan sebanyak 2× secara berimpit (`...sehingga mendapat skorPilihan D paling tepat karena...sehingga mendapat skor`) dan memotong angka `1.` di akhir kalimat terakhir. Duplikasi telah dibersihkan dan akhiran `sehingga mendapat skor 1.` dilengkapi sesuai tabel skor (`E = 1`). |
| **94** | Kalimat pertama soal sumber memuat kata ganda *“Anda mengikuti merupakan kepala petugas administrasi kependudukan di desa terpencil.”*; dinormalisasi menjadi *“Anda merupakan kepala petugas administrasi kependudukan di desa terpencil.”*. |

## Pembersihan ekstraksi

- Seluruh 113 tangkapan layar diverifikasi secara visual dan disilangkan antara pembacaan Windows OCR serta Tesseract (0 cacat OCR koma/titik, huruf tergabung, maupun baris terlewat).
- Pembersihan watermark pihak ketiga pada pembahasan numerik (**nomor 46**, **48**, dan **49**) dengan tetap mempertahankan seluruh langkah matematika.
- Pemulihan baris pembahasan yang sempat terlewat pada draf awal (**nomor 26**, **56**, dan **99**) serta perbaikan opsi kombinasi pernyataan/pecahan hasil verifikasi visual (**nomor 7**, **11**, **14**, **19**, **20**, **38–40**, **45**, **49**, **51**, dan **52**).
- Label topik TKP di akhir pertanyaan diekstrak ke kolom `topic` / `sub_category` dan dibersihkan dari teks soal.
- JSON dan Excel disinkronkan penuh (`110 soal`, `550 opsi`, `27 gambar`, `0 hard error` pada `scripts/validate_question_pack.py`).

## Format dan verifikasi

`packet9-bank-soal.json` memuat ID stabil (`skd-casn-2026-packet9-001` s.d. `110`), nomor, segmen, topik, lima opsi, bobot, kunci, pembahasan, rujukan tangkapan layar, dan `recorded_answer` (20 jawaban terekam pada nomor 1–20; 90 nilai `null`). `source_details` menyimpan 4 tabel terstruktur (nomor 41, 42, 43, dan 53). Seluruh rumus matematika, pecahan, pangkat, persentase, dan derajat ditulis dalam LaTeX (`$...$`). Sembilan gambar soal figural (`packet9-057-soal.png` s.d. `packet9-065-soal.png`) dan 18 ilustrasi pembahasan (nomor 50–52, 54–59, 60 [2 ilustrasi], 62, 63 [2 ilustrasi], 64 [2 ilustrasi], dan 65 [2 ilustrasi]) tersimpan di folder `gambar` dan seluruhnya telah diverifikasi secara visual.

`packet9-impor-draft.xlsx` memakai sheet `Impor` dan 16 kolom standar impor TOCPNS seperti Packet 1–8. Kedua berkas (JSON dan Excel) lolos `scripts/validate_question_pack.py` dengan **0 hard error**, kemiripan maksimum terhadap Packet 1 & 2 sebesar `34,4%`, dan kemiripan internal maksimum `50,6%`.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan impor `packet9-impor-draft.xlsx` ke draft kosong untuk Packet 9.
2. Jalankan server gambar lokal dari root repositori pada port `8773` dan biarkan aktif saat memeriksa pratinjau gambar.
3. Periksa pratinjau nomor 41–43 dan 53 (tabel perbandingan kuantitas & tabel nilai/usia), nomor 50–52 dan 54–56 (diagram pembahasan deret dan penalaran analitis), serta nomor 57–65 (gambar soal figural dan ilustrasi pembahasan termasuk tangkapan lanjutan nomor 63–65).

```powershell
python -m http.server 8773 --bind 127.0.0.1 --directory "data/Packet 9/outputs/packet9/gambar"
```
