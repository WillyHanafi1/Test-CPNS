# Packet 4 · Try Out SKD CASN 2026 – Part 27

Seluruh nomor 1–110 ditemukan pada 115 tangkapan layar. Setelah pemeriksaan ulang pada 22 November 2026, semua nomor memiliki isi soal, lima opsi, kunci, bobot, dan pembahasan.

| Segmen | Jumlah | Rentang |
| --- | ---: | --- |
| TWK | 30 | 1–30 |
| TIU | 35 | 31–65 |
| TKP | 45 | 66–110 |
| **Total** | **110** | **1–110** |

## Kelengkapan sumber

| Nomor | Bagian yang dilengkapi | Tangkapan layar tambahan |
| --- | --- | --- |
| 45 | Perbandingan A : B, tabel evaluasi opsi, dan baris kunci. | `Screenshot 2026-11-22 113430.png` |
| 46 | Pembahasan terlihat sampai baris Jawaban C yang mengonfirmasi hasil 56 unit. | `Screenshot 2026-11-22 115614.png` |
| 57 | Penjelasan lanjutan, gambar kelima, dan baris Jawaban A tersimpan. Tangkapan awal tetap menjadi sumber bagian soal. | `Screenshot 2026-11-22 115625.png` |
| 64 | Kelanjutan penjelasan, diagram baris ketiga, dan kunci. | `Screenshot 2026-11-22 113641.png` |
| 65 | Pembahasan dan seluruh diagram jawaban. | `Screenshot 2026-11-22 113654.png` |

## Temuan pada soal

| Nomor | Temuan |
| --- | --- |
| 32 | Premis tidak memastikan bahwa karyawan yang mendapat teguran tanpa potongan insentif termasuk kelompok karyawan yang terlambat. Kunci sumber D tidak mengikuti premis. |
| 41, 42 | Pemeriksa repositori menandai kemiripan format. Nilai awal, rumus, pilihan, dan hasil berbeda. |
| 70 | Tabel memberi D = 1 dan E = 4. Uraian memberi D = 4 serta menempatkan E terendah. Uraian C membahas verifikasi dokumen meskipun soal membahas komentar di media sosial. |
| 86 | Tabel memberi C = 3 dan D = 2. Uraian memberi C = 2 dan D = 3. |
| 88 | Tabel memberi A = 2 dan B = 3. Uraian memberi A = 3 dan B = 2 serta menukar deskripsi keduanya. |

Excel dan JSON mempertahankan kunci sumber serta bobot dari tabel SKOR JAWABAN. Topik mengikuti label jika terlihat. Topik TWK dan TIU serta topik nomor 110 ditetapkan dari isi soal dan pola segmen.

## Format dan verifikasi

`part27-bank-soal.json` memuat ID stabil, nomor, topik, opsi, bobot, kunci, pembahasan, dan nama tangkapan layar. `source_details` memuat 13 tabel terstruktur, di luar 45 tabel bobot TKP yang tersimpan langsung pada opsi. `recorded_answer` memuat 11 jawaban yang tampak, dengan 99 nilai `null`. Rumus ditulis dalam LaTeX. Sembilan gambar soal dan 21 ilustrasi pembahasan tersimpan di `gambar`.

`part27-impor-draft.xlsx` memakai kolom impor TOCPNS seperti paket sebelumnya. Pengujian pada basis data sementara berhasil mengimpor 110 baris dan 550 opsi. Seluruh baris lolos validasi struktur penerbitan. Temuan kualitas pada premis dan bobot tercatat di atas.

## Impor ke TOCPNS lokal

1. Pilih **Admin → Soal → Import Excel** dan gunakan draft kosong untuk Part 27.
2. Jalankan server gambar dari root repositori dan biarkan aktif saat memeriksa gambar di pratinjau.
3. Periksa nomor 43 untuk rumus, 53 untuk data tabel, 64 untuk gambar soal dan pembahasan, serta 66 untuk bobot TKP.

```powershell
python -m http.server 8768 --bind 127.0.0.1 --directory "data/Packet 4/outputs/packet4-part27/gambar"
```
