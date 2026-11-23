# Packet 7 · Try Out SKD CASN 2026 – Packet 7

Seluruh nomor 1–110 ditemukan secara utuh pada 116 tangkapan layar (`Screenshot 2026-11-23 134032.png` s.d. `Screenshot 2026-11-23 134948.png` ditambah tangkapan ulang nomor 56 `Screenshot 2026-11-23 144934.png`). Enam nomor memiliki dua tangkapan layar yang telah digabungkan (`primary` + `alternates`): tangkapan ulang tabel soal **nomor 56**, dua lanjutan pembahasan figural (**nomor 63** dan **65**), serta tiga tangkapan ulang tabel skor TKP (**nomor 102**, **105**, dan **107**).

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Distribusi topik dan kunci jawaban

| Segmen | Topik | Jumlah |
| --- | --- | ---: |
| TWK | Pilar Negara | 8 |
| TWK | Nasionalisme | 7 |
| TWK | Bahasa Indonesia | 7 |
| TWK | Bela Negara | 4 |
| TWK | Integritas | 4 |
| TIU | Numerik | 15 |
| TIU | Verbal | 11 |
| TIU | Figural | 9 |
| TKP | Jejaring Kerja | 12 |
| TKP | Pelayanan Publik | 9 |
| TKP | Sosial Budaya | 9 |
| TKP | Profesionalisme | 5 |
| TKP | Anti Radikalisme | 5 |
| TKP | Teknologi Informasi dan Komunikasi | 5 |

Distribusi kunci jawaban keseluruhan: `A = 19`, `B = 20`, `C = 38`, `D = 17`, `E = 16` (rasio opsi kunci terpanjang: **`9,9%`**, jauh di bawah ambang `35%`).

## Kelengkapan & penggabungan tangkapan tambahan

| Nomor | Keterangan penggabungan | Berkas utama (`primary`) | Berkas tambahan (`alternates`) |
| --- | --- | --- | --- |
| 56 | Tangkapan awal belum merender tabel nilai peserta; tangkapan ulang memuat tabel lengkap 6 peserta (Arif, Bella, Citra, Dimas, Eka, Fajar). | `Screenshot 2026-11-23 144934.png` | `Screenshot 2026-11-23 134352.png` |
| 63 | Tangkapan kedua memuat diagram dan teks pembahasan figural lengkap. | `Screenshot 2026-11-23 134442.png` | `Screenshot 2026-11-23 134446.png` |
| 65 | Tangkapan kedua memuat dua diagram dan teks pembahasan figural lengkap. | `Screenshot 2026-11-23 134456.png` | `Screenshot 2026-11-23 134459.png` |
| 102 | Tangkapan pertama belum merender tabel skor; tangkapan kedua lengkap. | `Screenshot 2026-11-23 134908.png` | `Screenshot 2026-11-23 134904.png` |
| 105 | Tangkapan pertama belum merender tabel skor; tangkapan kedua lengkap. | `Screenshot 2026-11-23 134922.png` | `Screenshot 2026-11-23 134918.png` |
| 107 | Tangkapan pertama belum merender tabel skor; tangkapan kedua lengkap. | `Screenshot 2026-11-23 134933.png` | `Screenshot 2026-11-23 134930.png` |

## Temuan kualitas pada soal sumber (perlu perhatian)

| Nomor | Temuan |
| --- | --- |
| **48** | Sumber asli hanya memuat **4 opsi (A–D)** tanpa opsi E. Untuk memenuhi format wajib 5 opsi impor TOCPNS (`option_e`/`score_e`), ditambahkan distraktor salah `$2X < Y$` berbobot `0` (kunci tetap **B**, $X = Y = 3\text{ jam}$). |
| **28** | **Duplikat 100% dengan Packet 5 nomor 28** (TWK Bahasa Indonesia). Pertimbangkan mengganti salah satunya jika kedua paket dipublikasikan bersama. |
| **109** | Tabel `SKOR JAWABAN` sumber menukar skor D dan E (`D=4, E=1`), bertentangan dengan narasi pembahasan maupun makna opsi (opsi D apatis secara eksplisit dibahas berskor `1`, opsi E melapor ke pimpinan berskor `4`). Bobot diselaraskan menjadi `D=1, E=4` mengikuti narasi pembahasan (`answer_key` tetap **B = 5**). |
| 29 | Pertanyaan menyebut *kata bercetak tebal*, tetapi tidak ada kata dicetak tebal di sumber; opsi C juga menulis `Hierarki (kalimat 4)` padahal kata `hierarki` muncul di kalimat `(3)`. |
| 96 | Label topik dalam tanda kurung tidak tertulis di sumber; ditetapkan `Profesionalisme` sesuai blok nomor 96–100 dan konteks kasus. |
| 103, 106, 108 | Tabel `SKOR JAWABAN` tidak ter-render pada tangkapan layar, namun kelima bobot skor tertulis eksplisit di narasi pembahasan dan terverifikasi cocok dengan opsi hijau. |

## Pembersihan ekstraksi

- Seluruh 115 tangkapan layar ditranskripsi langsung secara visual (0 cacat OCR koma/titik maupun salah baca huruf).
- Pembersihan duplikasi paragraf tempelan di sumber asli tanpa mengubah makna maupun bobot skor pada nomor **68** (paragraf pembahasan terduplikasi penuh 2×), **73** (tempelan ekor duplikat di akhir pembahasan), dan **81** (tempelan paragraf di tengah kalimat).
- Perbaikan minor sumber: `1)` → `(1)` (nomor 26), hapus tanda kutip penutup yatim (nomor 37), dan `efsien` → `efisien` (nomor 66).
- Label topik TKP di akhir pertanyaan diekstrak ke kolom `topic` / `sub_category` dan dibersihkan dari teks soal.
- JSON dan Excel disinkronkan penuh (`110 soal`, `550 opsi`, `26 gambar`, `0 hard error` pada `scripts/validate_question_pack.py`).

## Format dan verifikasi

`packet7-bank-soal.json` memuat ID stabil (`skd-casn-2026-packet7-001` s.d. `110`), nomor, segmen, topik, lima opsi, bobot, kunci, pembahasan, rujukan tangkapan layar, dan `recorded_answer` (11 jawaban terekam pada nomor 1–11; 99 nilai `null`). `source_details` menyimpan 6 tabel terstruktur (nomor 45, 46, 47, 48, 55, dan 56). Seluruh rumus matematika dan derajat ditulis dalam LaTeX (`$...$`). Sembilan gambar soal figural (`packet7-057-soal.png` s.d. `packet7-065-soal.png`) dan 17 ilustrasi pembahasan (nomor 39–41, 47, 54, 57, 58 [3 ilustrasi], 59 [2 ilustrasi], 60–63, dan 65 [2 ilustrasi]) tersimpan di folder `gambar` dan seluruhnya telah diverifikasi secara visual.

`packet7-impor-draft.xlsx` memakai sheet `Impor` dan 16 kolom standar impor TOCPNS seperti Packet 1–6. Kedua berkas (JSON dan Excel) lolos `scripts/validate_question_pack.py` dengan **0 hard error**, kemiripan maksimum terhadap Packet 1 & 2 sebesar `30,6%`, dan kemiripan internal maksimum `39,3%`.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan impor `packet7-impor-draft.xlsx` ke draft kosong untuk Packet 7.
2. Jalankan server gambar lokal dari root repositori pada port `8771` dan biarkan aktif saat memeriksa pratinjau gambar.
3. Periksa pratinjau nomor 47–48 (tabel perbandingan & opsi E tambahan), nomor 56 (tabel nilai 6 peserta), nomor 58 (3 ilustrasi pembahasan), serta nomor 63 & 65 (ilustrasi dari tangkapan lanjutan).

```powershell
python -m http.server 8771 --bind 127.0.0.1 --directory "data/Packet 7/outputs/packet7/gambar"
```
