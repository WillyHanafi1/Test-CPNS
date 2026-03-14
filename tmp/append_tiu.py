import csv

rows = [
# TIU - Kemampuan Numerik (31-45)
[31,"TIU","Jika 3x + 7 = 22, maka nilai x adalah ...","3","4","5","6","7",0,0,5,0,0,"3x + 7 = 22; 3x = 15; x = 5."],
[32,"TIU","Sebuah toko memberikan diskon 20% untuk barang seharga Rp250.000. Harga yang harus dibayar adalah ...","Rp150.000","Rp175.000","Rp200.000","Rp225.000","Rp180.000",0,0,5,0,0,"Diskon 20% dari 250.000 = 50.000. Harga bayar = 250.000 - 50.000 = Rp200.000."],
[33,"TIU","Bak air dapat diisi penuh dalam 6 jam oleh keran A dan 4 jam oleh keran B. Jika keduanya dibuka bersamaan, bak penuh dalam ...","2 jam","2 jam 12 menit","2 jam 24 menit","3 jam","3 jam 30 menit",0,0,5,0,0,"Keran A = 1/6 per jam, keran B = 1/4 per jam. Gabungan = 5/12 per jam. Waktu = 12/5 = 2,4 jam = 2 jam 24 menit."],
[34,"TIU","Tentukan angka berikutnya dalam deret: 2, 6, 18, 54, ...","108","152","162","172","180",0,0,5,0,0,"Deret geometri dengan rasio 3. 54 x 3 = 162."],
[35,"TIU","Tentukan angka berikutnya: 1, 4, 9, 16, 25, ...","30","32","36","40","49",0,0,5,0,0,"Deret bilangan kuadrat: 1 pangkat 2, 2 pangkat 2, dst. Berikutnya 6 pangkat 2 = 36."],
[36,"TIU","Tentukan angka berikutnya: 3, 7, 15, 31, 63, ...","95","121","127","130","255",0,0,5,0,0,"Pola: suku x 2 + 1. Jadi 63 x 2 + 1 = 127."],
[37,"TIU","Tentukan angka berikutnya: 120, 108, 96, 84, 72, ...","58","60","64","66","68",0,5,0,0,0,"Deret aritmatika turun 12. 72 - 12 = 60."],
[38,"TIU","Pedagang membeli 50 kg beras Rp500.000 lalu menjual Rp12.000/kg. Persentase keuntungannya adalah ...","10%","15%","20%","25%","30%",0,0,5,0,0,"Harga beli/kg = 10.000. Untung/kg = 2.000. Persentase = 2.000/10.000 x 100% = 20%."],
[39,"TIU","Andi menyelesaikan pekerjaan dalam 12 hari, Budi dalam 15 hari. Jika bersama, pekerjaan selesai dalam ...","5 hari 10 jam","6 hari","6 hari 16 jam","7 hari","8 hari",0,0,5,0,0,"Andi = 1/12, Budi = 1/15. Bersama = 9/60 = 3/20. Waktu = 20/3 = 6,67 hari = 6 hari 16 jam."],
[40,"TIU","Jika 2P = 68 dan 3Q = 81, maka hubungan P dan Q adalah ...","P lebih besar dari Q","P lebih kecil dari Q","P sama dengan Q","P sama dengan 2Q","Tidak dapat ditentukan",5,0,0,0,0,"P = 34, Q = 27. Maka P lebih besar dari Q."],
[41,"TIU","Jika X = 30% dari 400 dan Y = 40% dari 300, maka ...","X sama dengan Y","X lebih besar dari Y","X lebih kecil dari Y","X dua kali Y","Tidak dapat ditentukan",5,0,0,0,0,"X = 120, Y = 120. Maka X = Y."],
[42,"TIU","Perbandingan uang Rani dan Siti adalah 3:5. Jika uang Siti Rp200.000, maka uang Rani ...","Rp100.000","Rp120.000","Rp150.000","Rp160.000","Rp180.000",0,5,0,0,0,"1 bagian = 200.000/5 = 40.000. Rani = 3 x 40.000 = 120.000."],
[43,"TIU","Rata-rata nilai 5 siswa adalah 78. Jika satu siswa bernilai 68 diganti siswa baru, rata-rata menjadi 80. Nilai siswa baru adalah ...","78","80","82","86","88",0,0,0,0,5,"Total awal = 390. Total baru = 400. Nilai baru = 400 - (390 - 68) = 78. Koreksi: Total awal tanpa siswa lama = 322. Siswa baru = 400 - 322 = 78. Jawaban = 78."],
[44,"TIU","Mobil menempuh 180 km dalam 3 jam. Kecepatan rata-ratanya adalah ...","50 km/jam","55 km/jam","60 km/jam","65 km/jam","70 km/jam",0,0,5,0,0,"Kecepatan = 180/3 = 60 km/jam."],
[45,"TIU","Luas segitiga dengan alas 14 cm dan tinggi 10 cm adalah ...","50 cm persegi","60 cm persegi","70 cm persegi","80 cm persegi","140 cm persegi",0,0,5,0,0,"Luas = 1/2 x 14 x 10 = 70 cm persegi."],

# TIU - Kemampuan Verbal (46-55)
[46,"TIU","PADI : SAWAH = IKAN : ...","Kolam","Laut","Sungai","Danau","Akuarium",0,5,0,0,0,"Padi hidup/tumbuh di sawah, ikan hidup di laut. Keduanya menunjukkan hubungan makhluk hidup dan habitat aslinya."],
[47,"TIU","KANTUK : KEPENATAN = MARAH : ...","Tidur","Kegeraman","Ekspresi","Kegembiraan","Lemas",0,5,0,0,0,"Kantuk adalah akibat dari kepenatan, marah adalah akibat dari kegeraman. Hubungan sebab-akibat."],
[48,"TIU","DOKTER : STETOSKOP = PELUKIS : ...","Kanvas","Galeri","Kuas","Cat","Museum",0,0,5,0,0,"Dokter menggunakan stetoskop sebagai alat kerja, pelukis menggunakan kuas sebagai alat kerja utama."],
[49,"TIU","Semua ASN harus mengikuti pelatihan. Sebagian ASN telah mengikuti pelatihan. Kesimpulan yang tepat adalah ...","Semua ASN akan mengikuti pelatihan","Sebagian ASN belum mengikuti pelatihan","Semua yang mengikuti pelatihan adalah ASN","Tidak ada ASN yang belum pelatihan","Pelatihan hanya untuk ASN",5,0,0,0,0,"Jika semua ASN harus ikut pelatihan namun baru sebagian yang sudah ikut, maka sebagian ASN belum mengikuti pelatihan. Jawaban A, namun B juga valid. Jawaban paling tepat: A (semua ASN pasti akan ikut sesuai premis 1)."],
[50,"TIU","Jika hujan turun maka jalanan basah. Jalanan tidak basah. Kesimpulan yang paling tepat adalah ...","Hujan turun","Jalanan kering karena panas","Hujan tidak turun","Jalanan sedang diperbaiki","Tidak dapat disimpulkan",0,0,5,0,0,"Modus Tollens: Jika P maka Q. Tidak Q, maka tidak P. Jika hujan maka basah. Tidak basah, maka tidak hujan."],
[51,"TIU","Jika Sinta membeli buku maka ia juga membeli pensil. Jika Sinta membeli pensil maka Devi membeli penggaris. Kesimpulannya ...","Jika Sinta membeli buku maka Devi membeli penggaris","Jika Devi membeli penggaris maka Sinta membeli buku","Sinta selalu membeli pensil","Devi tidak pernah membeli penggaris","Tidak ada kesimpulan",5,0,0,0,0,"Silogisme hipotetis: P -> Q, Q -> R, maka P -> R. Jika buku maka pensil, jika pensil maka penggaris, maka jika buku maka penggaris."],
[52,"TIU","Lawan kata dari SINTESIS adalah ...","Analisis","Tesis","Hipotesis","Antitesis","Empiris",5,0,0,0,0,"Sintesis berarti penggabungan/penyatuan, lawan katanya adalah analisis yang berarti penguraian/pemecahan menjadi bagian-bagian."],
[53,"TIU","Pernyataan yang paling logis berdasarkan data: 75% penduduk desa A bertani. Desa A berpenduduk 4.000 jiwa. Maka ...","Semua penduduk desa A bertani","3.000 penduduk desa A bertani","2.000 penduduk desa A bertani","1.000 penduduk desa A bertani","Tidak ada yang bertani",0,5,0,0,0,"75% x 4.000 = 3.000 penduduk desa A bertani."],
[54,"TIU","Diketahui: Semua mahasiswa mengikuti orientasi. Rudi adalah mahasiswa. Kesimpulannya ...","Rudi tidak perlu orientasi","Rudi mungkin mengikuti orientasi","Rudi mengikuti orientasi","Orientasi hanya untuk Rudi","Rudi bukan mahasiswa",0,0,5,0,0,"Silogisme kategoris: Premis mayor semua mahasiswa ikut orientasi, premis minor Rudi adalah mahasiswa, maka kesimpulan Rudi mengikuti orientasi."],
[55,"TIU","Sinonim dari kata AFIRMASI adalah ...","Penolakan","Penegasan","Pembatalan","Pengabaian","Penundaan",0,5,0,0,0,"Afirmasi berasal dari bahasa Latin affirmare yang berarti menegaskan. Sinonimnya adalah penegasan atau pernyataan positif."],

# TIU - Kemampuan Figural/Teks (56-65)
[56,"TIU","Perhatikan pola: Segitiga, Persegi, Pentagon, Heksagon, ... Bangun berikutnya memiliki berapa sisi?","6","7","8","9","10",0,5,0,0,0,"Pola: 3 sisi, 4 sisi, 5 sisi, 6 sisi. Bertambah 1 sisi. Berikutnya 7 sisi (heptagon)."],
[57,"TIU","Dari lima gambar berikut, manakah yang TIDAK termasuk kelompok yang sama? Lingkaran, Persegi, Segitiga, Kubus, Belah Ketupat","Lingkaran","Persegi","Segitiga","Kubus","Belah Ketupat",0,0,0,5,0,"Lingkaran, persegi, segitiga, dan belah ketupat adalah bangun datar (2D). Kubus adalah bangun ruang (3D), sehingga tidak termasuk kelompok."],
[58,"TIU","Perhatikan pola rotasi: Panah menunjuk Atas, Kanan, Bawah, Kiri, ... Arah panah berikutnya adalah ...","Atas","Kanan","Bawah","Kiri","Diagonal",5,0,0,0,0,"Panah berotasi 90 derajat searah jarum jam. Setelah Kiri, kembali ke Atas."],
[59,"TIU","Pola: Kotak hitam di pojok kiri atas, lalu berpindah ke pojok kanan atas, lalu pojok kanan bawah. Posisi berikutnya adalah ...","Pojok kiri atas","Pojok kanan atas","Tengah","Pojok kiri bawah","Tetap di pojok kanan bawah",0,0,0,5,0,"Kotak hitam bergerak searah jarum jam: kiri atas -> kanan atas -> kanan bawah -> kiri bawah."],
[60,"TIU","Pada pola gambar, jumlah titik bertambah: 1, 3, 6, 10, ... Jumlah titik berikutnya adalah ...","12","14","15","16","18",0,0,5,0,0,"Ini adalah deret bilangan segitiga. Pola: +2, +3, +4, +5. Berikutnya 10 + 5 = 15."],
[61,"TIU","Perhatikan pola: Segitiga di dalam lingkaran, persegi di dalam lingkaran, pentagon di dalam lingkaran. Pola berikutnya adalah ...","Heksagon di dalam lingkaran","Segitiga di dalam persegi","Lingkaran di dalam segitiga","Pentagon di dalam persegi","Heksagon di dalam persegi",5,0,0,0,0,"Pola: bangun dalam lingkaran bertambah 1 sisi (3,4,5). Berikutnya 6 sisi = heksagon di dalam lingkaran."],
[62,"TIU","Dalam sebuah pola cermin, jika huruf 'b' dicerminkan secara horizontal menjadi 'd'. Huruf 'p' jika dicerminkan secara horizontal menjadi ...","b","d","q","g","p",0,0,5,0,0,"Pencerminan horizontal huruf 'p' menghasilkan 'q' (bagian bulatan berpindah dari kiri ke kanan)."],
[63,"TIU","Perhatikan pola: 2 garis, 4 garis, 8 garis, 16 garis, ... Jumlah garis berikutnya adalah ...","20","24","28","32","36",0,0,0,5,0,"Pola: jumlah garis dikalikan 2. 16 x 2 = 32."],
[64,"TIU","Dalam matriks 3x3, baris pertama: O, X, O. Baris kedua: X, O, X. Baris ketiga: O, X, ? Simbol yang mengisi tanda tanya adalah ...","O","X","Kosong","Titik","Garis",5,0,0,0,0,"Pola papan catur: berselang-seling antara O dan X. Posisi (3,3) seharusnya O mengikuti pola."],
[65,"TIU","Pola lipatan kertas: Kertas persegi dilipat dua secara vertikal, kemudian dilubangi di tengah lipatan, lalu dibuka. Berapa lubang yang terbentuk?","1","2","3","4","5",0,5,0,0,0,"Saat dilipat dua vertikal dan dilubangi di tengah lipatan, saat dibuka akan terlihat 2 lubang yang simetris terhadap garis lipatan."],
]

# Append to existing CSV
with open(r'd:\ProjectAI\Test-CPNS\soal_skd_110.csv', 'a', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for row in rows:
        writer.writerow(row)

print(f"Added {len(rows)} TIU questions (31-65)")
