# Packet 3 · Tryout SKD Vol. 19

Seluruh nomor 1–110 ditemukan pada 111 tangkapan layar. Nomor 77 memiliki satu tangkapan tambahan. Isi opsi A–E nomor 46 belum tersedia pada tangkapan sumber.

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Kelengkapan sumber

| Nomor | Bagian yang perlu dilengkapi atau dikonfirmasi | Tangkapan layar |
| --- | --- | --- |
| 46 | Label A–E tampil tanpa isi. Kunci C dan hasil perhitungan 1 3/5 terlihat. Isi kelima opsi masih kosong di Excel dan JSON. | `Screenshot 2026-11-22 112210.png` |
| 59 | Perhitungan Toko E terlihat di tepi bawah. Kelanjutan pembahasan setelah baris tersebut belum dapat dipastikan. | `Screenshot 2026-11-22 112300.png` |

Nomor 77 memakai `Screenshot 2026-11-22 112435.png` sebagai sumber utama dan `Screenshot 2026-11-22 112406.png` sebagai sumber tambahan.

## Temuan pada soal

| Nomor | Temuan |
| --- | --- |
| 12 | Penanda Jawaban Benar adalah C. Pembahasan menyebut B, tetapi uraiannya sesuai dengan isi C. |
| 24 | Opsi D juga menghilangkan pleonasme dengan kalimat yang lebih ringkas. Kunci sumber C. |
| 31 | Opsi C paling dekat jika kategori harus berupa kelas taksonomi. Opsi D juga cocok jika cukup memakai kategori bersama karena paus dan cumi-cumi sama-sama hewan air. |
| 35 | Opsi B dan D ekuivalen secara logika. Pembahasan sumber menyatakan keduanya. Kunci sumber D. |
| 37 | Opsi D menyatakan kemungkinan. Premis tidak menentukan pekerjaan atau status kesehatan Tania. |
| 38 | Pembahasan membalik implikasi «meningkat hanya jika padat». Kunci sumber D tidak mengikuti premis. |
| 39 | Kunci B menghitung 5 rute, termasuk jalur langsung yang rawan longsor. Jika pertanyaan dimaksudkan hanya untuk jalur alternatif yang lebih aman, ada 4 rute. |
| 40 | Susunan sumber melanggar petunjuk bahwa Bu Nila tidak duduk di dekat Bu Tia. Urutan Salim, Nila, Jufri, Tini, Harto, Tia memenuhi petunjuk dan menghasilkan B. Kunci sumber C. |
| 58 | Pembahasan menghitung berapa kali tiap toko paling murah per barang. Penjumlahan harga mengonfirmasi kunci A. |
| 59 | Pembuka menyebut empat toko, sedangkan tabel dan opsi memuat lima. |

## Format dan verifikasi

`vol19-bank-soal.json` menyimpan ID stabil, topik, lima opsi, bobot, kunci, pembahasan, dan sumber per soal. `source_details` menyimpan delapan tabel terstruktur dan penanda pembahasan yang perlu dikonfirmasi. `recorded_answer` memuat 13 pilihan yang terlihat pada Jawaban Kamu, dengan 97 nilai `null`. Rumus memakai LaTeX. Enam gambar soal dan lima ilustrasi pembahasan merujuk ke jalur relatif di `gambar`.

`vol19-impor-draft.xlsx` memakai kolom impor TOCPNS seperti Packet 1 dan 2. Pengujian dengan basis data sementara berhasil mengimpor 110 baris dan 550 opsi ke draft. Validasi penerbitan menandai nomor 46 karena isi opsi kosong. Tinjau juga temuan pada kunci dan premis sebelum menerbitkan paket.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan gunakan draft kosong untuk Vol. 19.
2. Jalankan server gambar dari root repositori dan biarkan aktif saat memeriksa gambar di pratinjau.
3. Periksa nomor 47 untuk pecahan, 58 untuk data tabel, 60 untuk gambar soal dan pembahasan, serta 66 untuk bobot TKP.

```powershell
python -m http.server 8767 --bind 127.0.0.1 --directory "data/Packet 3/outputs/packet3-vol19/gambar"
```
