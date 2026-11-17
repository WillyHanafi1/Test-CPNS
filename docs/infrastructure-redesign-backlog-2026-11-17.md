# Backlog infrastruktur dan UI/UX TOCPNS

Tanggal: 17 November 2026. Branch kerja: `main`; perubahan tetap lokal tanpa membuat branch baru atau melakukan push, sesuai `AGENTS.md`. Checklist berarti selesai pada kode dan pemeriksaan yang tercatat, bukan sudah dirilis ke production. Item parsial tetap terbuka. Bukti dan penyesuaian desain ada di `infrastructure-implementation-2026-11-17.md`.

P0: integritas/akses/keamanan atau blocker rilis. P1: cakupan inti perombakan. P2: penyempurnaan setelah inti stabil. Urutan ditentukan dependensi, bukan hanya nomor.

## A. Keputusan, kontrak, dan baseline

- [ ] **A01 · P0** Tetapkan arti Pro, cakupan seluruh paket, masa berlaku baru, dan aturan legacy. Keluaran: matriks hak, penawaran yang konsisten, serta daftar keputusan bisnis yang memblokir checkout nyata.
- [x] **A02 · P0** Tetapkan satu sesi berjalan per peserta, aturan satu writer, resume saat expiry, deadline, dan pembahasan sesudah Pro berakhir. Keluaran: state machine dan skenario penerimaan.
- [x] **A03 · P1** Peta route dan seluruh dependensi AI peserta/admin. Keluaran: daftar file, endpoint, task, secret, teks, dan pemanggil lama.
- [ ] **A04 · P1** Baseline endpoint/resource dan inventaris schema/aset/sesi aktif. Query production hanya agregat yang diperlukan; hasil berlaku pada waktu pemeriksaan, bukan selamanya.
- [x] **A05 · P1** Tetapkan kontrak API/error/pagination dan mapping URL lama. Keluaran: schema/OpenAPI yang dapat dipakai frontend dengan fixture.

## B. Patch keselamatan mesin yang berjalan

- [x] **B01 · P0 · setelah A02** Periksa hasil request autosave; tampilkan pending/gagal/sukses sebenarnya. Jangan mengklaim durabilitas DB sebelum modul baru siap.
- [x] **B02 · P0 · setelah A02** Perbaiki rumus waktu dan resume; uji sisa 20 menit tidak kembali menjadi 100 menit.
- [x] **B03 · P0 · setelah A01** Satukan pengecekan terbit/aktif/jadwal/hak pada start dan access. Uji pemanggilan API langsung ke draft/arsip.
- [x] **B04 · P0** Tambahkan penolakan teknis paket kosong/tidak sesuai spesifikasi. Isi soal tidak dibetulkan otomatis; tindak publikasi dilakukan terencana tanpa menghapus histori.
- [x] **B05 · P0 · setelah A01** Hilangkan kontradiksi Lifetime/365 hari, pesan payment-success tanpa verifikasi, dan statistik promosi tanpa dasar.

## C. Data, versi, dan mesin sesi

- [ ] **C01 · P0 · setelah A02/A05** Rancang migrasi additive PackageVersion/Question/Option, jawaban sesi, hasil, grant, payment event, dan outbox. Keluaran: diagram relasi, constraint, compatibility notes.
- [x] **C02 · P0 · setelah C01** Uji migrasi dan backfill pada PostgreSQL terisolasi; histori tidak di-rescore dan snapshot legacy tidak dipalsukan.
- [x] **C03 · P0 · setelah C02** Bangun start/resume idempotent dengan lock pengguna, constraint sesi aktif, waktu server, dan versi terikat.
- [x] **C04 · P0 · setelah C03** Simpan jawaban ke PostgreSQL; ACK sesudah commit; validasi opsi/soal/versi/pemilik/deadline.
- [x] **C05 · P0 · setelah C04** Mutation ID, revision, writer epoch, antrean lokal per akun/sesi, retry, dan rekonsiliasi. Uji timeout sesudah commit serta jawaban A→B→C.
- [x] **C06 · P0 · setelah C04** Submit atomik dan outbox scoring; request berulang menghasilkan status/hasil yang konsisten.
- [x] **C07 · P0 · setelah C06** Pisahkan scoring murni, simpan hasil unik per sesi, dedup efek samping, rekonsiliasi pekerjaan tertahan.
- [ ] **C08 · P0 · setelah C07** Failure tests Redis/worker restart, deadline, perubahan jam/sleep, dua tab/perangkat, dan kegagalan DB. Keluaran: bukti jawaban ACK tidak hilang akibat cache/broker mati.
- [ ] **C09 · P1 · setelah C02** Publikasi membuat versi immutable; edit revisi baru; aset versi lama tidak ditimpa atau dihapus sembarangan.
- [x] **C10 · P1 · setelah C07** Adapter histori/route legacy dan perlindungan sesi lama selama cutover.

## D. AI, autentikasi, keanggotaan, pembayaran

- [x] **D01 · P0 · setelah A03** Pisahkan task core dari import provider AI. API/worker core start tanpa key AI.
- [x] **D02 · P1 · setelah D01** Tutup seluruh generasi AI peserta dan enqueue baru; pilih respons stabil untuk client lama. Jangan purge antrean bersama.
- [x] **D03 · P1 · setelah D02** Hapus komponen chat/analisis/polling/digest serta teks pemasaran AI. Data historis tetap privat, belum drop schema.
- [x] **D04 · P1 · setelah D01** AI admin opsional default mati, role enforcement, queue/profile/secret terpisah, hasil tetap draft.
- [x] **D05 · P0 · setelah A01/C02** Membership service dan grant per order unik; pertahankan pengguna legacy tanpa expiry; backend menjadi satu sumber hak.
- [ ] **D06 · P0 · setelah D05** Order snapshot, event webhook terverifikasi/dedup, fulfillment atomik, rekonsiliasi konflik, dan status payment dari backend.
- [x] **D07 · P0** `/me` terlepas dari localStorage, proteksi role/ownership, CSRF/Origin, return path aman, dan logout lintas tab dengan penanganan jawaban tertunda.
- [ ] **D08 · P1 · setelah D06/D07** E2E Google/email/reset dan pembayaran sandbox. Aktivasi production menjadi langkah operasional tersendiri setelah kesiapan bisnis/provider jelas.

## E. Desain dan halaman peserta

- [x] **E01 · P1 · setelah A05** Token warna/teks/spasi/radius, shell, dan komponen state dasar; ukur kontras, fokus, target sentuh.
- [x] **E02 · P1 · setelah E01** Prototipe desktop/ponsel Beranda, Paket, Ujian. Review hierarki, keterbacaan, tema, dan keadaan error sebelum seluruh halaman dibangun.
- [x] **E03 · P1 · setelah E02** Empat navigasi utama, shell peserta/ujian/admin, Bahasa Indonesia, branding/metadata/lang halaman yang konsisten.
- [x] **E04 · P1 · setelah E03/C03** Dashboard berdasarkan keadaan: lanjutkan, latihan pertama, pembahasan terbaru; keluarkan donasi/developer dari fokus utama.
- [x] **E05 · P1 · setelah E03/A05** Katalog ringkas, pagination, pencarian aman dari response lama, status personal terpisah dari cache publik, CTA menuju sesi yang benar.
- [x] **E06 · P1 · setelah E05/C03** Detail/persiapan dengan spesifikasi aktual, alasan akses, return path login, dan Mulai eksplisit.
- [ ] **E07 · P0 · setelah E02/C05** UI ujian: timer, status simpan, opsi/navigator, konflik writer, koneksi putus, login ulang, keyboard, diagram/rumus.
- [x] **E08 · P1 · setelah E07/C06** Konfirmasi selesai berisi progres/pending; hasil pending/gagal/final tidak menampilkan angka palsu atau submit ulang pada GET error.
- [x] **E09 · P1 · setelah E08/C09** Pembahasan versi benar, filter salah/kosong/TKP parsial, laporan soal berkonteks.
- [x] **E10 · P1 · setelah E08** Riwayat ringkas, grafik faktual, mastery TKP berbasis poin, preview admin dikecualikan.
- [x] **E11 · P1 · setelah D05/D06/E03** Akun, expiry, transaksi, bukti pembayaran, bantuan, dan kontak berfungsi.
- [x] **E12 · P1 · setelah E03/D03** Landing/keanggotaan/FAQ baru, hilangkan janji AI/angka tidak berdasar dan tautan mati.
- [ ] **E13 · P1 · setelah E04–E12** QA responsive, zoom, pembaca layar dasar, reduced motion, state kosong/loading/error, judul panjang, rumus/gambar.
- [x] **E14 · P2 · setelah E13** Pertimbangkan tema gelap kedua dan penyempurnaan motion hanya setelah tema pertama stabil dan kebutuhan terbukti.

## F. Admin sebagai fondasi kualitas soal berikutnya

- [ ] **F01 · P1 · setelah C09** Alur draft/validasi/preview/publish-version/archive dan laporan validasi yang dapat ditindaklanjuti.
- [x] **F02 · P1 · setelah F01** Validasi jumlah/komposisi/nomor/opsi/bobot sesuai spesifikasi; pisahkan error struktur dan keputusan akademis.
- [ ] **F03 · P1 · setelah E09** Inbox laporan masalah dengan versi/soal/sesi, status penanganan, dan audit perubahan.
- [x] **F04 · P0 · setelah F01** Preview admin tidak masuk metrik/ranking peserta; penerbitan revisi tidak mengubah sesi yang sudah berjalan.

## G. CI, staging, operasi, dan rilis

- [x] **G01 · P0** CI lint/type/build + backend unit + PostgreSQL/Redis integration; tes transaksi nyata melengkapi SQLite/mock yang ada.
- [ ] **G02 · P0 · setelah G01** Staging terisolasi untuk DB/Redis/storage/secret/sandbox; periksa anggaran resource server bersama sebelum menjalankannya.
- [ ] **G03 · P1 · setelah G02** E2E/failure suite dan load bertahap 10/25/50 sebagai pengukuran, bukan janji kapasitas.
- [ ] **G04 · P0** Backup DB/aset/config di luar host, inventaris PITR yang benar-benar tersedia, dan restore rehearsal; tetapkan RPO/RTO dari bukti.
- [ ] **G05 · P1** Log aman/request ID, metrik save/scoring/payment/outbox, resource/backup, dan readiness yang sesuai dampak.
- [ ] **G06 · P0 · setelah G01/G04** Build sekali, tag/digest/manifest, image rollback, secret scan, dan strategi schema-compatible rollback.
- [ ] **G07 · P0 · setelah C08/C10/D08/E13/F04/G03–G06** Rehearsal cutover: stop start baru, drain sesi/pekerjaan legacy, switch mesin baru, smoke test, rollback tanpa writer lama.
- [ ] **G08 · P0 · setelah G07** Deployment production terencana; cek ulang sesi aktif tepat sebelum cutover; pantau dan siapkan penghentian sesi baru jika perlu.
- [ ] **G09 · P1 · setelah G08** Observasi dan perbarui runbook sesuai yang benar-benar dirilis. Pekerjaan kualitas soal baru dimulai setelah kriteria infrastruktur disepakati tercapai.
- [ ] **G10 · P2** Bersihkan route/dependency/schema legacy setelah masa kompatibilitas dan retensi yang ditetapkan; bukan bagian deploy awal.

## Urutan delivery yang disarankan

1. **Kontrak + patch keselamatan:** A, B; mulai desain token dan prototipe E01–E02.
2. **Fondasi data dan fitur:** C, D, fondasi G; lanjut F setelah versi siap.
3. **Pengalaman peserta:** E03–E13 berdasarkan kontrak/API baru.
4. **Kesiapan rilis:** integrasi G03–G07 dan penanganan blocker.
5. **Cutover dan observasi:** G08–G09; P2 menunggu bukti kebutuhan.

Tidak ada jadwal kalender palsu atau anggapan pekerjaan sudah selesai karena kotaknya tercantum. Tiap item ditutup bersama bukti implementasi, pengujian yang relevan, dan catatan batasnya.


## Catatan cakupan yang tetap terbuka

| Item | Sudah ada | Sisa yang harus dibuktikan |
|---|---|---|
| A01/A04 | Offer terpusat mengikuti harga/durasi existing, hak Pro dan legacy, pembacaan schema/resource saat audit | Persetujuan komersial sebelum pembayaran nyata, baseline sebelum/sesudah yang sebanding dan inventaris cutover terbaru |
| C01/C09 | Migrasi additive, JSON snapshot privat per revision, response/job unik, grant per order | Desain sengaja lebih sederhana dari normalisasi tiga tabel dan ledger event terpisah; perlindungan aset/SQL manual dan seluruh aset legacy perlu inventaris rilis |
| C08 | Uji Redis cache loss, retry/CAS/deadline/empat start bersamaan/takeover | Restart database/worker saat traffic, fault injection jaringan, pengamatan failure yang lebih panjang |
| D06/D08 | Signature/client/target/amount, replay-safe grant, status owner; provider call timeout dan callback aman | Ledger event provider terpisah, rekonsiliasi status provider, E2E Google/email/reset/DOKU sandbox deployment |
| E07/E13 | Mesin ujian baru, login ulang dengan pending tetap ada, radio keyboard/native dialog, desktop/mobile dan reduced motion | Audit screen reader/zoom/kontras terukur dan matriks perangkat/koneksi yang lebih luas |
| F01/F03 | Draft/validasi/publish/archive/immutable preview; feedback dengan sesi/question/revision, inbox dan status existing | Audit perubahan konten terstruktur, laporan dengan FK eksplisit dan perbaikan alur admin menyeluruh |
| G02/G03 | DB/Redis lokal terpisah dan image integration disposable di server, tanpa provider production | Persistent staging/provider terpisah; hasil load terbatas dicatat dalam laporan setelah run final, bukan klaim kapasitas production |
| G04 | Script backup privat dan dump/restore sintetis lokal berhasil | Backup production, lokasi terenkripsi off-host, aset/config/PITR dan restore production-copy terisolasi, RPO/RTO berdasarkan bukti |
| G05/G06 | Request ID/durasi log, ops aggregate admin, image/schema gate/non-root dan review build terpisah | Alert/heartbeat, manifest final commit+digest, off-host recovery dan latihan rollback yang sesuai mesin baru |
| G07/G08 | Runbook cutover/rollback tertulis | Drain nyata, migration dan switch production, observasi pascarilis |
| E14 | Tema terang utama | Tema gelap kedua bersifat opsional setelah kebutuhan terbukti |


Pembaruan tema 17 November 2026: mode terang/gelap/sistem dan penyempurnaan seluruh halaman telah diimplementasikan lokal di `main` atas permintaan pemilik. Bukti dan matriks halaman ada di `dark-theme-review-2026-11-17.md`. Ini tidak mengubah status gate deployment production.
