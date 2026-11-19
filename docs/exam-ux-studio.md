# Studi UX ujian TOCPNS

Buka [Studio desain ujian](http://localhost:3110/ujian/desain). Setiap desain bisa dicoba pada layar **Ujian**, **Hasil**, dan **Pembahasan**. Pilih **LaTeX**, **Teks panjang**, atau **Figural** untuk membandingkan kasus yang sama. Tombol **Uji rumus blok** membuka contoh rumus panjang untuk memeriksa lebar dan pembesaran teks. Saat mengganti desain, soal, pilihan peserta, dan tanda ragu dipertahankan.

## Tata letak yang disarankan

- Gunakan **Panel kanan** sebagai titik awal. Sidebar tersebut biasa disebut *question navigator* atau *question palette*. Kelompokkan nomor berdasarkan TWK, TIU, dan TKP. Tampilkan status aktif, kosong, dijawab, dan ragu dengan bentuk atau ikon berbeda, disertai nama status yang dibaca teknologi bantu. Pada ponsel, buka peta dari tombol **Daftar soal** agar isi soal mendapat lebar penuh. [Moodle](https://docs.moodle.org/501/en/Using_Quiz) · [Panduan CAT BKN](https://www.bkn.go.id/wp-content/uploads/2020/05/2.-Buku-Panduan-utk-Panitia-Instansi-v2.pdf) · [W3C tentang penggunaan warna](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- Susun opsi teks **A–E vertikal**. Satu target klik selebar baris memberi ruang untuk opsi TKP yang panjang dan rumus yang membungkus. Gunakan radio native agar fokus keyboard dan panah antarpilihan mengikuti pola browser. GOV.UK membatasi radio berdampingan pada dua opsi singkat. Untuk TOCPNS, grid lima opsi layak diuji pada gambar atau angka singkat, dengan urutan A–B, C–D, E dan tampilan vertikal pada ponsel. [GOV.UK Design System](https://design-system.service.gov.uk/components/radios/) · [W3C tentang ukuran target](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Geist** untuk soal dan kontrol menjaga konsistensi TOCPNS. Bawaan studio memakai **18 px** untuk pertanyaan, **16 px** untuk opsi dan pembahasan, serta jarak baris sekitar **1,55–1,60**. Gunakan Geist Mono dengan angka tabular untuk waktu dan nomor. Opsi **Mode baca** memberi contoh Georgia dengan pertanyaan 20 px dan jarak baris 1,72. Ukuran ini adalah rekomendasi desain yang bisa dibandingkan langsung dengan pilihan 16, 18, dan 20 px. Uji pembesaran browser hingga 200% dan penyesuaian jarak teks. [Panduan resize text W3C](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) · [Panduan text spacing W3C](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
- Gunakan renderer yang sama untuk stem soal, pilihan, dan penjelasan. Di studio, Markdown dan KaTeX menangani **`$...$`** sebaris serta **`$$...$$`** pada baris tersendiri. Rumus blok yang panjang bisa digeser dalam bloknya. Diagram opsi bisa diperbesar tanpa mengubah jawaban. Saat menyiapkan soal figural, simpan gambar dengan ukuran dan kontras yang bisa dibaca di ponsel serta berikan deskripsi yang setara sejauh tidak membocorkan jawaban. [KaTeX](https://katex.org/docs/options.html)
- Di **Hasil**, mulai dengan skor total, skor dan ambang per segmen, lalu berikan akses langsung ke pembahasan soal yang belum maksimal. Di **Pembahasan**, pertahankan susunan soal dan posisi opsi. Gunakan warna hijau serta label **Jawaban benar**, atau **Bobot tertinggi** untuk TKP. Tunjukkan **Pilihan kamu** secara terpisah dan tampilkan poin semua opsi TKP. Penjelasan tepat di bawah opsi mempertahankan urutan baca dan lebih mudah di ponsel. Varian 6 menguji manfaat penjelasan berdampingan pada layar lebar. [Opsi review Moodle](https://docs.moodle.org/501/en/Adding/editing_a_quiz#Review_options)

## Apa yang ditunjukkan paket #2

| Segmen | Rata-rata panjang opsi | Soal dengan sedikitnya satu opsi di atas 90 karakter |
| --- | ---: | ---: |
| TWK | 108 karakter | 29 dari 30 |
| TIU | 12 karakter | 1 dari 35 |
| TKP | 97 karakter | 45 dari 45 |

Pengukuran memakai teks sumber satu paket, termasuk markup LaTeX, sehingga panjang visual dapat berbeda. Opsi terpanjang mencapai 251 karakter. Itu mendukung daftar vertikal sebagai bawaan, terutama untuk TWK dan TKP. Pada soal TIU singkat, dua kolom memberi peluang membandingkan opsi tanpa banyak menggulir. Susunan per baris paling mudah dipindai karena urutan A–E mengikuti arah baca. Susunan 3 kiri atau 3 kanan mendahulukan kolom. Saat isi opsi memanjang, pasangan antarbaris menghasilkan ruang kosong dan mempersulit perpindahan perhatian dari kiri ke kanan.

Delapan soal figural pada paket ini menempatkan gambar di pertanyaan dan menggunakan label pendek pada opsi. Varian Kartu figural memperbesar diagram sambil membuat opsi singkat mudah dibandingkan. Render satu paket menghasilkan 124 rumus KaTeX dari soal, opsi, dan pembahasan tanpa kesalahan sintaks yang terdeteksi. Uji rumus blok menggunakan contoh terpisah karena paket #2 memakai rumus sebaris.

## Sepuluh varian yang bisa dibandingkan

| Desain | Navigator | Pilihan | Yang diuji |
| --- | --- | --- | --- |
| Panel kanan | Grid dikelompokkan per segmen | Vertikal | Kemudahan memindai progres tanpa kehilangan lebar baca |
| Grid per baris | Kanan, tab segmen | A–B, C–D, E | Kecepatan membandingkan angka atau opsi singkat |
| 3 kiri · 2 kanan | Kiri, semua segmen | A–C kiri, D–E kanan | Urutan baca per kolom dan ruang untuk teks panjang |
| 2 kiri · 3 kanan | Bilah di atas | A–B kiri, C–E kanan | Perubahan pola pindai saat kolom kanan lebih panjang |
| Mode fokus | Laci dari tombol Daftar soal | Vertikal, area baca terpusat | Baca soal panjang dengan gangguan visual minimal |
| Catatan samping | Grid kanan | Vertikal | Penjelasan tetap terlihat di samping opsi pada desktop |
| Navigator bawah | Bilah horizontal per segmen di bawah | Vertikal | Akses nomor tanpa mempersempit area soal |
| Per segmen | Tab TWK, TIU, TKP di kiri | Vertikal, dua area kerja di layar lebar | Pindah segmen dan membandingkan stimulus dengan opsi |
| Kartu figural | Kanan, tab segmen | Grid untuk soal figural dengan opsi bergambar atau label pendek | Ukuran gambar, zoom, dan jarak antarkartu |
| Mode baca | Laci | Vertikal, Georgia | Dampak tipografi pada bacaan dan pembahasan panjang |

Untuk memilih desain dari pengujian peserta, gunakan tugas yang sama. Minta peserta menjawab soal panjang, menandai ragu, melompat ke nomor tertentu, lalu menemukan penjelasan setelah mengumpulkan. Catat waktu, salah klik, dan kemampuan mereka menjelaskan status soal. Mulai dengan **Panel kanan**, **Mode fokus**, dan **Kartu figural** sebagai tiga kandidat dengan perbedaan fungsi paling jelas.

## Menjalankan studio

```powershell
docker compose --profile studio up -d --no-deps --build exam-studio
```

Studio memakai port lokal **3110** dan memiliki jawaban contoh yang bisa dikosongkan. Ekspor lokal paket gratis **Tryout SKD CPNS 2026 #2** dibaca dari `tmp/exam-studio/package.json` melalui mount baca-saja. File itu berada di luar Git dan konteks build. Jika file tidak tersedia, studio otomatis memakai 110 soal sintetis. URL bisa menyimpan varian, nomor soal, dan layar saat ini. Pilihan peserta pada prototipe disimpan selama halaman terbuka.
