# Packet 11 · Try Out SKD CASN 2026 – Packet 11

Seluruh nomor 1–110 ditemukan secara utuh pada 128 tangkapan layar (`Screenshot 2026-11-23 181514.png` s.d. `Screenshot 2026-11-23 182209.png`). Delapan belas nomor memiliki dua tangkapan layar yang telah digabungkan (`primary` + `alternates`): satu tangkapan ulang tabel soal **nomor 38**, empat lanjutan pembahasan numerik/analitis (**nomor 44, 48, 50, 55, dan 56**), sembilan lanjutan pembahasan figural (**nomor 57 s.d. 65**), serta tiga lanjutan pembahasan dan tabel skor TKP (**nomor 84, 95, dan 97**).

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Distribusi topik dan kunci jawaban

| Segmen | Topik | Jumlah |
| --- | --- | ---: |
| TWK | Nasionalisme | 8 |
| TWK | Pilar Negara | 6 |
| TWK | Bahasa Indonesia | 6 |
| TWK | Integritas | 5 |
| TWK | Bela Negara | 5 |
| TIU | Numerik | 18 |
| TIU | Figural | 9 |
| TIU | Verbal | 8 |
| TKP | Jejaring Kerja | 11 |
| TKP | Pelayanan Publik | 10 |
| TKP | Sosial Budaya | 10 |
| TKP | Anti Radikalisme | 6 |
| TKP | Profesionalisme | 4 |
| TKP | Teknologi Informasi dan Komunikasi | 4 |

Distribusi kunci jawaban keseluruhan: `A = 23`, `B = 20`, `C = 27`, `D = 23`, `E = 17` (rasio opsi kunci terpanjang: **`19,8%`**, jauh di bawah ambang `35%`).

## Kelengkapan & penggabungan tangkapan tambahan

| Nomor | Keterangan penggabungan | Berkas utama (`primary`) | Berkas tambahan (`alternates`) |
| --- | --- | --- | --- |
| 38 | Tangkapan awal (`181647.png`) belum merender tabel suku barisan bilangan; tangkapan kedua (`181657.png`) memuat tabel lengkap. | `Screenshot 2026-11-23 181657.png` | `Screenshot 2026-11-23 181647.png` |
| 44 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat pembahasan lengkap beserta 2 diagram perbandingan senilai. | `Screenshot 2026-11-23 181719.png` | `Screenshot 2026-11-23 181721.png` |
| 48 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat pembahasan lengkap beserta diagram perbandingan berbalik nilai. | `Screenshot 2026-11-23 181735.png` | `Screenshot 2026-11-23 181738.png` |
| 50 | Tangkapan pertama memuat soal, tabel soal, dan opsi; tangkapan kedua memuat pembahasan lengkap beserta tabel perbandingan berbalik nilai. | `Screenshot 2026-11-23 181747.png` | `Screenshot 2026-11-23 181749.png` |
| 55 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat pembahasan perhitungan waktu tempuh Rute 1 dan Rute 2. | `Screenshot 2026-11-23 181803.png` | `Screenshot 2026-11-23 181805.png` |
| 56 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat pembahasan analitis urutan presentasi 5 peserta. | `Screenshot 2026-11-23 181808.png` | `Screenshot 2026-11-23 181810.png` |
| 57–65 | Tangkapan pertama memuat diagram soal dan kelima kotak opsi figural; tangkapan kedua memuat diagram serta teks pembahasan figural lengkap. | `181813.png` s.d. `181944.png` | `181815.png` s.d. `181948.png` |
| 84 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat tabel `SKOR JAWABAN` dan pembahasan lengkap. | `Screenshot 2026-11-23 182055.png` | `Screenshot 2026-11-23 182056.png` |
| 95 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat tabel `SKOR JAWABAN` dan pembahasan lengkap. | `Screenshot 2026-11-23 182126.png` | `Screenshot 2026-11-23 182128.png` |
| 97 | Tangkapan pertama memuat soal dan opsi; tangkapan kedua memuat tabel `SKOR JAWABAN` dan pembahasan lengkap. | `Screenshot 2026-11-23 182134.png` | `Screenshot 2026-11-23 182136.png` |

## Temuan kualitas pada soal sumber (perlu perhatian)

| Nomor | Temuan |
| --- | --- |
| **44** | Antarmuka sumber pada `Screenshot 2026-11-23 181719.png` menyorot opsi **D** berwarna hijau, bertentangan dengan pembuktian matematis maupun simpulan eksplisit pembahasan pada `Screenshot 2026-11-23 181721.png` (`Pernyataan (1) saja tidak cukup`, `Pernyataan (2) saja tidak cukup`, keduanya bersama-sama menghasilkan waktu penuh $30 + 54 = 84\text{ menit} = 1{,}4\text{ jam} < 1{,}5\text{ jam}$, `Jawaban: C`). Kunci jawaban dan bobot skor `5` diselaraskan ke **C** sesuai perhitungan matematis dan teks pembahasan. |
| **29 & 30** | Kedua nomor sengaja menggunakan bacaan 8 kalimat yang sama di sumber asli (`Screenshot 2026-11-23 181619.png` dan `181621.png`), namun menanyakan aspek berbeda: **nomor 29** menanyakan *penulisan huruf kapital yang salah* (kunci **D**: `Selat (kalimat 4)`), sedangkan **nomor 30** menanyakan *penulisan kata yang tidak baku* (kunci **A**: `Jadual (kalimat 3)`). Hal ini memicu penanda `internal_duplicate` (`94,7%`) pada `scripts/validate_question_pack.py`, yang terverifikasi berasal dari pemakaian wacana bersama pada paket sumber. |
| **72 & 84** | Pada sumber asli, pembahasan **nomor 72** (`182028.png`) menduplikasi kalimat terakhir tentang pilihan E sebanyak 2×, dan pembahasan **nomor 84** (`182056.png`) menempelkan seluruh paragraf pembahasan sebanyak 2× berturut-turut (`...dan Profesional.Situasi ini menguji...`). Kedua duplikasi tempelan tersebut telah dibersihkan tanpa mengubah isi maupun bobot skor. |
| **94** | Teks soal sumber (`182123.png`) menulis kalimat penutup ganda `Sikap Anda adalah.... Sikap Anda adalah ... (Sosial Budaya)`. Duplikasi frasa penutup tersebut telah dinormalisasi menjadi satu `Sikap Anda adalah ...`. |

## Pembersihan ekstraksi

- Seluruh 128 tangkapan layar diverifikasi secara visual terhadap hasil OCR gabungan (Windows OCR & Tesseract), termasuk pemulihan baris kedua opsi/pembahasan pada nomor **5** (opsi C), **33** (pembahasan), **79** (pembahasan), **94** (opsi A), dan **95** (pembahasan).
- Pada soal figural **nomor 57–60** dan **63–65** yang menempatkan gambar opsi di dalam bilah vertikal A–E pada sumber, kelima kotak opsi telah dikompilasi secara bersih berjajar horizontal dengan label `A.` s.d. `E.` di bawah diagram soal (tanpa membocorkan warna hijau kunci jawaban) agar mandiri saat ditampilkan melalui kolom tunggal `image_url` TOCPNS.
- Penanda watermark pihak ketiga (`Trik Alfaiz`, `Al Faiz HTW`) pada pembahasan numerik nomor **48** dan **49** telah dibersihkan sambil mempertahankan seluruh langkah perhitungan matematisnya.
- Label topik TKP di akhir pertanyaan diekstrak ke kolom `topic` / `sub_category` dan dibersihkan dari teks soal.
- JSON dan Excel disinkronkan penuh (`110 soal`, `550 opsi`, `33 gambar`, lolos 100% pada `tmp/packet-audit.py`).

## Format dan verifikasi

`packet11-bank-soal.json` memuat ID stabil (`skd-casn-2026-packet11-001` s.d. `110`), nomor, segmen, topik, lima opsi, bobot, kunci, pembahasan, rujukan tangkapan layar, dan `recorded_answer` (`null` pada seluruh 110 nomor karena seluruh soal berstatus `Tidak Dijawab`). `source_details` menyimpan 9 tabel terstruktur pada 7 soal (`#38`, `#39` [soal & pembahasan], `#50` [soal & pembahasan], `#53`, `#63`, `#64`, dan `#65`). Seluruh rumus matematika dan satuan derajat ditulis dalam LaTeX (`$...$`). Sembilan gambar soal figural (`packet11-057-soal.png` s.d. `packet11-065-soal.png`) dan 24 ilustrasi pembahasan (nomor 44 [2 ilustrasi], 47, 48, 50, 51, 57, 58, 59 [2 ilustrasi], 60 [3 ilustrasi], 61 [2 ilustrasi], 63 [3 ilustrasi], 64 [3 ilustrasi], dan 65 [3 ilustrasi]) tersimpan di folder `gambar` dan seluruhnya telah diverifikasi secara visual.

`packet11-impor-draft.xlsx` memakai sheet `Impor` dan 16 kolom standar impor TOCPNS seperti Packet 1–7. Kedua berkas (JSON dan Excel) lolos `tmp/packet-audit.py` (`Validasi publikasi: []`, `33 gambar lolos pemeriksaan`, `0 opsi kosong`), dengan kemiripan maksimum terhadap Packet 1 & 2 sebesar `22,7%` dan kemiripan internal maksimum (di luar pasangan wacana bersama `#29–#30`) sebesar `23,5%`.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan impor `packet11-impor-draft.xlsx` ke draft kosong untuk Packet 11.
2. Jalankan server gambar lokal dari root repositori pada port `8775` dan biarkan aktif saat memeriksa pratinjau gambar.
3. Periksa pratinjau nomor 38–39 (tabel deret & hubungan kolom), nomor 44 (kunci C selaras perhitungan matematis & 2 diagram pembahasan), nomor 57–65 (gambar soal figural & ilustrasi pembahasan), serta nomor 84, 95, & 97 (pembahasan TKP dari tangkapan lanjutan).

```powershell
python -m http.server 8775 --bind 127.0.0.1 --directory "data/Packet 11/outputs/packet11/gambar"
```
