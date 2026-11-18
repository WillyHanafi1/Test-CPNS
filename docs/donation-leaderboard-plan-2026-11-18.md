# Riset, keputusan desain, dan rencana implementasi donasi TOCPNS

## Tujuan dan ruang lingkup

Membuat donasi sukarela mudah ditemukan, mudah dilakukan, dan mudah dipercaya,
tanpa mengganggu latihan. Pemilik memilih ringkasan di bawah konten utama
beranda, sebelum footer, serta halaman Donasi di header. Ringkasan juga tersedia
di dashboard karena itulah beranda peserta yang sudah masuk.

Donasi mendukung operasional/pengembangan TOCPNS. Donasi tidak membeli Pro,
peringkat ujian, akses khusus, atau manfaat pajak. Pembayaran tetap melalui
integrasi DOKU yang sudah berjalan. Tidak ada migrasi database atau perubahan
mekanisme signature, settlement, harga Pro, maupun pemberian akses.

## Temuan riset dan batas penerapannya

| Sumber primer | Temuan yang relevan | Penerapan di TOCPNS |
| --- | --- | --- |
| Shang & Croson, Economic Journal, 2009 | Informasi kontribusi orang lain memengaruhi pemberian dalam eksperimen lapangan; konteks dan kelompok donor penting. | Angka nyata, dukungan terbaru, dan peringkat bulanan yang jujur. Tidak mengarang jumlah pendukung. |
| Reiley & Samek, How Do Suggested Donations Affect Charitable Gifts? | Menu nominal menggeser pilihan. Menaikkan nominal saran juga bisa menurunkan partisipasi. | Mulai Rp5.000; pilihan Rp10.000/Rp25.000/Rp50.000 dan nominal bebas mulai Rp1.000. Tidak memberi label “paling populer” tanpa data. |
| DellaVigna, List & Malmendier, QJE, 2012 | Sebagian pemberian didorong tekanan sosial; kesempatan menghindari ajakan memengaruhi perilaku dan kesejahteraan donor. | Donasi opsional, tanpa popup otomatis, hitung mundur, ajakan berulang saat ujian, atau pesan menyalahkan. |
| Burtch, Ghose & Wattal, eksperimen privasi crowdfunding | Pilihan pengungkapan identitas dan nominal berinteraksi dengan perilaku donor. Privasi bukan sekadar ornamen. | Nama publik menjadi pilihan sadar; nama singkat, tanpa fallback email; donasi anonim tetap dihargai dan dihitung. |
| Nielsen Norman Group, laporan usability nonprofit | Kejelasan tujuan, informasi penting, kepercayaan, dan kemudahan proses menjadi bagian penting pengalaman donor. | Jelaskan tujuan dukungan, progres dari transaksi berhasil, alur DOKU, serta perbedaan donasi/Pro. |
| W3C WAI, Labeling Controls | Form memerlukan label yang terhubung dengan kontrol dan instruksi yang dapat dipahami. | Label nyata, nominal tombol yang jelas, error inline, keyboard, kontras, dan ukuran sentuh mobile. |

Rujukan:

1. https://econweb.ucsd.edu/~jandreon/PhilanthropyAndFundraising/Volume%202/27%20Shang%20Croson%202009.pdf
2. https://s3.amazonaws.com/fieldexperiments-papers2/papers/00422.pdf
3. https://www.nber.org/system/files/working_papers/w15629/w15629.pdf
4. https://arxiv.org/abs/1408.4194
5. https://www.nngroup.com/reports/attracting-donors-and-volunteers-non-profit/
6. https://www.w3.org/WAI/tutorials/forms/labels/

Temuan tersebut berasal dari konteks fundraising yang berbeda. Ini dasar desain,
bukan jaminan kenaikan konversi pada peserta CPNS Indonesia. Pilihan nominal
adalah titik awal yang perlu dinilai dari transaksi nyata TOCPNS.

## Psikologi yang digunakan secara wajar

- **Manfaat yang dipahami:** server, perawatan platform, dan pengembangan latihan.
  Tidak membuat klaim Rp5.000 setara dengan manfaat tertentu tanpa pembukuan.
- **Rasa ikut berkontribusi:** ucapan terima kasih dan pencatatan dukungan,
  termasuk donasi kecil dan anonim.
- **Bukti sosial:** jumlah pendukung dan dukungan terbaru berasal dari pembayaran
  berhasil. Aktivitas terbaru tidak hanya menampilkan pemberi nominal terbesar.
- **Pengakuan opsional:** leaderboard untuk kontribusi bernama yang dipilih donor;
  tidak menggunakan pangkat sosial atau hadiah akses belajar.
- **Pilihan sederhana:** empat nominal saran, satu nominal bebas, pesan opsional,
  satu pilihan privasi, dan tombol dengan nominal yang akan dibayar.
- **Otonomi:** tidak ada donasi wajib, langganan tersembunyi, biaya buatan,
  penjualan prioritas latihan, atau identitas yang dipublikasikan diam-diam.

## Arsitektur informasi dan tampilan

### Beranda publik dan dashboard

Ringkasan di akhir konten utama, sebelum footer:

1. Judul “Ruang latihan ini tumbuh bersama.”
2. Tujuan dukungan dalam satu kalimat.
3. Total bulan berjalan, target bulanan dari konfigurasi server, jumlah pendukung.
4. Progres dengan nilai sebenarnya, termasuk progres kecil dan kondisi target nol.
5. Beberapa pendukung/dukungan terbaru dengan penghargaan yang setara.
6. Tautan “Dukung mulai Rp5.000” dan “Lihat papan dukungan”.

Tidak muncul saat mengerjakan ujian. Tidak membuka modal otomatis.

### Header dan navigasi mobile

- Tautan “Donasi” terlihat bagi pengunjung maupun peserta.
- Navigasi desktop tetap ringkas.
- Pada ponsel, tautan header tersedia pada baris pendek di bawah brand/actions;
  empat navigasi inti bawah tetap dipertahankan.
- Footer menyediakan akses Donasi dan Bantuan/Dukungan.

### Halaman /donasi

1. Pengantar singkat, tujuan, dan penegasan bahwa dukungan sukarela.
2. Progres serta angka bulanan yang benar.
3. Form inline yang mudah ditemukan: empat nominal saran, nominal bebas,
   pesan opsional, nama publik opsional, dan CTA dengan nominal.
4. Leaderboard dan dukungan terbaru, dengan pilihan “Bulan ini” / “Semua waktu”.
5. Penjelasan ringkas: penggunaan dukungan, pembayaran DOKU, privasi, donasi/Pro.
6. Kondisi loading, kosong, gagal memuat, retry, dan tombol muat ulang.

Tidak ada podium besar yang mendominasi halaman. Peringkat berdasarkan jumlah
donasi publik berhasil per akun pada periode terpilih. Total sama mendapat
peringkat sama; pengurutan tetap stabil. Daftar terbaru memberi ruang bagi nominal
kecil. Tidak menampilkan contoh donor atau pesan palsu saat belum ada data.

## Data, uang, dan privasi

- Hanya `transaction_type=donation` dan `payment_status=success` yang dihitung.
- Transaksi sandbox tidak masuk data publik. Data legacy berhasil tanpa
  environment tetap dapat dibaca agar sejarah tidak hilang.
- Batas bulan menggunakan Asia/Jakarta, berdasarkan `paid_at` dengan fallback
  legacy `created_at`, konsisten dengan laporan pendapatan yang sudah ada.
- Donasi anonim ikut total/jumlah pendukung dan daftar terbaru sebagai
  “Pendukung anonim”; tidak diakumulasikan sebagai profil anonim di leaderboard.
- Nama publik berupa nama singkat profil, tanpa email, ID akun, ID invoice,
  alamat bank, foto eksternal, atau identitas lain pada payload publik.
- Pesan dirender sebagai teks. Label menjelaskan bahwa pesan tampil publik,
  termasuk ketika nama disembunyikan.
- Donasi baru default anonim; publikasi nama adalah opt-in.
- Donor dapat mengubah keterlihatan nama pada transaksi miliknya melalui akun.
  Perubahan ini tidak mengubah nominal, status pembayaran, atau akses Pro.
- Pilihan anonim yang sudah tersimpan tetap dihormati. Nominal dan nama tidak
  diambil dari respons redirect browser sebagai bukti pembayaran.

## Alur pengunjung dan peserta

Pengunjung dapat melihat semua konten donasi tanpa login. Untuk membayar,
gunakan login Google/email yang sudah tersedia supaya receipt dan kelanjutan
pembayaran tetap aman di akun. Nominal terpilih ikut return URL `/donasi`;
pesan pribadi tidak dimasukkan ke URL. Form pesan/privasi tersedia setelah masuk.

Guest checkout merupakan pengembangan terpisah: saat ini kepemilikan invoice,
riwayat, dan status pembayaran terkait akun. Tidak mengubah kontrak ini secara
diam-diam hanya untuk menghapus satu langkah login.

Peserta memilih nominal → memilih privasi/pesan bila diinginkan → melihat CTA
nominal yang tepat → checkout DOKU → halaman status yang sudah ada → ucapan
terima kasih dan tautan kembali ke Donasi. Tidak membuat pembayaran nyata baru
selama pengujian otomatis.

## Rencana teknis

### 1. Backend dan kontrak

- Buat service agregasi donasi agar ringkasan, peringkat, dan daftar terbaru
  memakai filter periode/status/privacy yang sama.
- Tambahkan endpoint overview publik dengan periode `month|all` dan batas hasil
  kecil. Satu request cukup untuk ringkasan beranda/halaman.
- Pertahankan endpoint stats/top/wall lama melalui service bersama.
- Hilangkan fallback potongan email; nama yang menyerupai email memakai label
  generik. Ringkas nama profil untuk publik.
- Tambahkan rank, jumlah dukungan, dan info periode yang diperlukan UI.
- Tambahkan endpoint perubahan visibility yang terautentikasi dan memeriksa
  kepemilikan transaksi. Catat audit perubahan privasi.
- Gunakan model/kolom yang sudah ada; tidak memerlukan migrasi production.

### 2. Komponen frontend

- Utility bersama: tipe data, format rupiah, validasi nominal, serta login return.
- `DonationForm`: dipakai halaman dan wrapper modal lama supaya alurnya satu.
- `DonationSection`: ringkasan untuk beranda dan dashboard.
- Konten halaman Donasi: form, panel data, filter, transparansi, FAQ singkat.
- Navigasi header/footer dan akses dari halaman Dukungan.
- Riwayat akun: perubahan keterlihatan nama untuk donasi milik pengguna.
- Halaman sukses: tautan kembali ke komunitas Donasi.
- Token warna/tipografi yang sudah ada; light/dark, 320 px hingga desktop,
  tanpa library UI atau aset eksternal baru.

### 3. Pengujian

Backend:

- Status pending/failed, pembelian Pro, dan sandbox tidak masuk agregasi publik.
- Batas bulan WIB dan fallback legacy benar; total tidak berganda karena join.
- Donasi berulang dijumlahkan per pengguna, ranking sama untuk nominal sama.
- Donasi anonim dihitung tanpa membuka identitas atau mengaitkan profilnya.
- Tidak ada email, UUID pengguna, atau invoice dalam output publik.
- Parameter periode/batas hasil divalidasi; kondisi kosong/target nol benar.
- Visibility hanya dapat diubah pemilik, bukan akun lain atau transaksi Pro.
- Nominal/message divalidasi; idempotensi checkout dan uji webhook tetap lulus.

Frontend/E2E:

- Header Donasi dapat ditemukan pada desktop/mobile, guest dan peserta.
- Ringkasan berada setelah konten utama dan sebelum footer.
- Filter periode, data kosong, error/retry, nama panjang, serta anonim.
- Nominal Rp5.000/default, nominal bebas, nominal tidak valid, klik ganda.
- Login return menjaga nominal; admin juga menghormati tujuan kembali eksplisit.
- Privasi default anonim dan payload publik opt-in sesuai pilihan.
- Pesan tidak menjadi HTML, private storage yang diblokir tidak menghambat bayar.
- Perubahan visibility dalam akun dan CTA kembali dari halaman sukses.
- Tidak ada horizontal overflow di 320/390/768/1280 px; keyboard/dialog jelas,
  light/dark, tanpa error JavaScript.

### 4. Rilis dan verifikasi

- Jalankan backend, unit frontend, lint, TypeScript, build, dan Playwright relevan.
- Periksa diff serta kebocoran konfigurasi privat.
- Commit/push ke main sesuai instruksi lanjutan pemilik untuk memicu CI/CD.
- Tambahkan pemeriksaan Playwright pada workflow CI untuk rilis berikutnya.
- Pemilik meminta tidak memantau deployment. Pemeriksaan production berikut
  merupakan tindak lanjut terpisah setelah rilis: `/`, `/dashboard`, `/donasi`, `/support`, data publik, status
  DOKU Production, health, worker, serta backup/monitor.
- Verifikasi terhadap donasi nyata yang sudah ada tanpa membuat donasi baru.
- Catat hasil dan batas pengujian dalam dokumen ini/catatan hasil.

Implementasi menggunakan judul publik **Papan dukungan**. Pilihan nama dan pesan
diletakkan dalam bagian opsional agar formulir awal tetap ringkas. Batas nominal
atas mengikuti kapasitas kolom Integer yang sudah ada. Penjelasan tujuan dan FAQ
tersedia dalam HTML awal; hanya formulir yang membaca nominal dari URL menunggu
bagian interaktif siap.

## Ukuran keberhasilan setelah peluncuran

- Checkout donasi yang dibuat dibanding pembayaran berhasil (data transaksi).
- Jumlah pendukung unik, median nominal, proporsi anonim, dan donor berulang.
- Lama konfirmasi serta receipt review/error; jangan mengorbankan keandalan
  demi variasi tampilan.
- Kemudahan menemukan Donasi dan menyelesaikan pembayaran melalui umpan balik.
- CTR dapat diukur pada fase berikutnya jika telemetry yang proporsional disepakati;
  fase ini tidak menambahkan pelacak pihak ketiga atau profil psikologis pengguna.

Jangan mengklaim kenaikan konversi dari satu donasi uji. Evaluasi pilihan nominal
dan penempatan setelah data yang memadai tersedia; ubah satu faktor per percobaan.
