# Packet 2 · Tryout SKD Vol. 18

Ekstraksi awal mencakup 110 nomor dari 110 tangkapan layar. Tangkapan tambahan nomor 1, 20, dan 36 melengkapi paket.

Pemeriksaan ulang pada 22 November 2026 mencocokkan dua tangkapan baru dengan nomor 64 dan 65. Semua nomor memiliki isi soal, lima opsi, kunci, bobot, dan pembahasan. Bank menyimpan rujukan ke 110 tangkapan lama yang tidak tersedia di folder lokal saat pemeriksaan ulang.

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

| Nomor yang dilengkapi | Topik | Kunci | Tangkapan layar |
| --- | --- | --- | --- |
| 1 | Nasionalisme | D | Screenshot 2026-11-19 204803.png |
| 20 | Pilar Negara | C | Screenshot 2026-11-19 204815.png |
| 36 | Verbal | E | Screenshot 2026-11-19 204823.png |
| 64 | Figural | E | Screenshot 2026-11-22 115815.png |
| 65 | Figural | D | Screenshot 2026-11-22 115820.png |

Tangkapan baru nomor 64 memperlihatkan diagram gabungan keempat bangun. Tangkapan nomor 65 memperlihatkan aturan penggabungan dan inversi warna sampai akhir kalimat.

## Temuan pada soal

| Nomor | Temuan |
| --- | --- |
| 36 | Ejaan “inggis” di kalimat pertama diselaraskan menjadi “Inggris”. |
| 41 | Kunci sumber B (Tono). Alternatif yang juga memenuhi semua petunjuk adalah baris depan Rani, Dika, Fira, Lala dan baris belakang Budi, Maya, Tono, Soni. Dalam susunan alternatif tersebut, Maya berada di belakang Dika. |
| 47 | Opsi B dan E sama-sama bernilai 1 5/8. Sumber memakai dua bentuk penulisan pecahan. Kunci sumber tetap C. |

## Isi JSON

Setiap soal memiliki ID, nomor, segmen, topik, opsi A–E, bobot, kunci, pembahasan, dan nama tangkapan layar sumber. Rumus ditulis dalam LaTeX. Sembilan tabel tersimpan sebagai kolom dan baris. File JSON merujuk ke enam gambar soal dan empat ilustrasi pembahasan di folder `gambar`.

`recorded_answer` menyimpan pilihan yang terlihat pada **Jawaban Kamu**. Ada pilihan yang terekam pada 68 tangkapan layar. Bobot pilihan di JSON diambil dari opsi pada soal tersebut. Tangkapan yang belum dijawab memiliki nilai `null`.

Uji impor draft pada basis data sementara berhasil memuat 110 soal dan 550 opsi. Semua baris lolos validasi struktur penerbitan TOCPNS. Pemeriksa mutu repositori masih menandai opsi duplikat pada nomor 47.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan impor `vol18-impor-draft.xlsx` ke draft kosong Vol. 18.
2. Jika draft sudah berisi 107 soal, gunakan hanya baris 1, 20, dan 36 dari Excel lengkap. Impor tiga soal tersebut ke draft yang sama dengan **Replace** dimatikan.
3. Cek nomor 47 untuk pecahan, 58 untuk tabel, dan 60 untuk gambar soal serta pembahasan.

Excel memakai tautan gambar lokal melalui port 8766. Jalankan server gambar dari root repositori di PowerShell.

```powershell
python -m http.server 8766 --bind 127.0.0.1 --directory "data/Packet 2/outputs/packet2-vol18/gambar"
```
