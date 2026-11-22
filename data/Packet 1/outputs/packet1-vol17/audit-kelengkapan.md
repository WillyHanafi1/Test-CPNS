# Hasil ekstraksi Packet 1 — Tryout SKD Vol. 17

Ekstraksi awal mencakup 110 nomor dari 118 tangkapan layar. Tangkapan tambahan nomor 1, 9, 41, dan 63 melengkapi paket. Delapan tangkapan lain merupakan salinan atau versi lain dari nomor yang sama.

Pemeriksaan ulang pada 22 November 2026 mencocokkan tiga tangkapan baru dengan nomor 56, 60, dan 65. Semua nomor memiliki isi soal, lima opsi, kunci, bobot, dan pembahasan. Bank menyimpan rujukan ke 118 tangkapan lama yang tidak tersedia di folder lokal saat pemeriksaan ulang.

| Segmen | Jumlah soal | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Soal yang dilengkapi dari tangkapan tambahan

| Nomor | Hasil | Berkas sumber utama |
| --- | --- | --- |
| 1 | TWK · Nasionalisme · Kunci D. | Screenshot 2026-11-19 193817.png |
| 9 | TWK · Bahasa Indonesia · Kunci A. Kedua bagian rumpang dipertahankan. | Screenshot 2026-11-19 193826.png |
| 41 | TIU · Verbal · Kunci A. Kalimat pembuka dan enam petunjuk terbaca lengkap. | Screenshot 2026-11-19 193839.png |
| 63 | TIU · Figural · Kunci B. Gambar utama dan pilihan A–E dipotong dari tangkapan baru. | Screenshot 2026-11-19 193854.png |
| 56 | Tabel ambang batas dan kesimpulan terbaca. Rina dan Dedi lolos wawancara. | Screenshot 2026-11-22 115714.png |
| 60 | Aturan rotasi dan inversi serta ketiga simbol pembahasan terlihat. Kunci C. | Screenshot 2026-11-22 115722.png |
| 65 | Kalimat tentang kelengkapan bentuk, garis, dan warna terbaca utuh. Kunci E. | Screenshot 2026-11-22 115727.png |

## Kualitas soal sumber

| Nomor | Yang perlu ditinjau |
| --- | --- |
| 9 | Kunci sumber A. Pada D, kedua bentuk kata baku. Pembeda utamanya adalah nuansa makna yang dijelaskan dalam pembahasan. |
| 10 | Kunci sumber B. Pembahasan menolak opsi C dengan mengasumsikan percakapan langsung, sementara konteks itu tidak disebutkan di soal. Perjelas konteks agar pilihan B bisa dibedakan dari C. |
| 20 | Soal menggambarkan pengujian perda di Mahkamah Konstitusi. Pembahasannya menyebut Mahkamah Agung untuk perda. Selaraskan skenario dengan pembahasan sumber. |
| 22 | Penanda **Jawaban Benar** adalah D dan uraian menjelaskan pengujian undang-undang sesuai isi D. Kalimat pembuka pembahasan justru menulis “opsi (c)”. Kunci D dipertahankan. |
| 39 | Kunci sumber D (Adit). Premis juga membolehkan urutan Adit, Fani, Cika, Eko, Dira, Beni jika dibaca dari Adit ke kiri. Pada susunan itu Fani berhadapan dengan Dira. Perlu satu petunjuk tambahan agar jawaban unik. |
| 42 | Opsi A dan B sama persis. Kunci C tetap seperti pada sumber. |
| 66 | Opsi A dan B sama persis dengan bobot berbeda, yaitu 1 dan 2. Kedua bobot asli dipertahankan. Peserta bisa menerima nilai berbeda untuk pilihan yang isinya sama. |
| 70 | Bobot sumber A–E adalah 1, 4, 3, 3, 5. Dua opsi berbobot 3. Validasi TOCPNS menerima bobot tersebut dan kunci tetap E. |
| 71 | Tokoh di soal bernama Andi, sedangkan pembahasan menyebut Dinda. Kedua nama mengikuti tangkapan layar. |

## Format untuk analisis

Gunakan `vol17-bank-soal.json` sebagai data utama. Satu objek per soal menyimpan ID, nomor, topik, lima opsi, bobot, kunci, pembahasan, rujukan ke tangkapan layar, dan catatan tinjauan bila ada. Teks mendukung Markdown dan LaTeX. Gambar ada di folder `gambar` dengan jalur relatif terhadap JSON, sehingga keduanya bisa dipindah bersama.

Kolom `discussion_images` memuat rujukan ilustrasi pembahasan. Untuk 23 soal, `source_details` memuat transkripsi langkah yang terlihat sebelum diringkas, keterangan bahwa pembahasan berupa gambar, atau tabel sumber. Delapan tabel tersimpan sebagai kolom dan baris, termasuk tabel soal dan pembahasan nomor 55 dan 56.

Gunakan `vol17-impor-draft.xlsx` sebagai hasil ekspor untuk impor TOCPNS. Jika ingin mengukur tingkat kesulitan, daya pembeda, atau pola pilihan, hubungkan ID soal dengan data hasil ujian. Tabel respons peserta bisa diekspor sebagai CSV dengan satu baris per jawaban. Temuan kualitas isi dapat ditinjau langsung dari JSON.

Uji impor draft pada basis data sementara berhasil memuat 110 soal dan 550 opsi. Semua baris lolos validasi struktur penerbitan TOCPNS. Pemeriksa mutu repositori masih menandai opsi duplikat pada nomor 42 dan 66 serta bobot TKP berulang pada nomor 70.

## Impor dan gambar lokal

1. Buka **Admin → Soal → Import Excel** di TOCPNS lokal. Pilih file Excel dari folder ini dan pilih draft kosong untuk Vol. 17.
2. Jika draft lama sudah berisi 106 soal, ambil hanya baris 1, 9, 41, dan 63 dari file lengkap. Impor empat baris tersebut dengan **Replace** dimatikan agar nomor lama tetap tersimpan.
3. Periksa pratinjau nomor 43 untuk rumus, nomor 63 untuk soal bergambar, dan nomor 78 untuk bobot TKP.

Kolom gambar dan tautan diagram pembahasan memakai alamat lokal 127.0.0.1 port 8765. Jalankan server gambar dari root repositori di PowerShell.

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory "data/Packet 1/outputs/packet1-vol17/gambar"
```

Ada 6 gambar soal dan 7 ilustrasi pembahasan. Soal figural yang hanya menampilkan gambar memakai teks pengantar singkat agar sesuai dengan kolom wajib TOCPNS. Pecahan dan rumus dibaca ulang dari tangkapan layar dan ditulis dalam LaTeX. Beberapa pembahasan numerik diringkas dengan mempertahankan perhitungan dan kesimpulan yang terlihat, termasuk tabel 55–56 dan diagram deret 58–59. Transkripsi teks menggunakan OCR lokal, dengan pemeriksaan silang untuk kunci dan bobot serta pembacaan visual pada rumus, tabel, diagram, dan teks yang menyentuh tepi.
