# PROMPTS.md — Prompt Ringkas & Bebas Kelebihan Konteks

Semua prompt di bawah sengaja dibuat **padat, langsung ke inti, dan bebas parameter rumit** (tanpa pembagian level kesulitan buatan) agar AI fokus 100% menyamai kualitas soal contoh `Packet 1` & `Packet 2`.

---

## Prompt 0 — Perintah Tunggal untuk AI Agent Mandiri (Generate 110 Soal)

Salin blok ini, ganti `vol19` dan judul paketnya, lalu kirim ke AI Agent di workspace `d:\ProjectAI\Test-CPNS`:

```text
Buatkan 1 paket lengkap SKD CPNS (110 soal siap impor ke TOCPNS) secara mandiri:
- Kode paket: vol19
- Judul paket: Tryout SKD CPNS 2026 #1
- Folder kerja: data/generated/vol19/

Aturan kerja (jaga konteks tetap ringan!):
1. Baca HANYA docs/question-authoring/RULES.md, docs/question-authoring/BLUEPRINT.md, dan docs/question-authoring/AGENT.md di awal. JANGAN baca seluruh folder references/ sekaligus!
2. Kerjakan per batch kecil (17 batch sesuai BLUEPRINT.md) di data/generated/vol19/batches/. Setiap mengerjakan 1 batch, ambil HANYA 5–9 soal contoh padanannya dari data/Packet 1/outputs/packet1-vol17/vol17-bank-soal.json atau data/Packet 2/outputs/packet2-vol18/vol18-bank-soal.json sebagai patokan tunggal gaya, panjang, dan tingkat kesulitan.
3. Cara membuat variasi per segmen:
   - TIU Numerik, Deret, Perbandingan, Cerita, Silogisme, Analitis (#35–59): BOLEH pakai pola/rumus/struktur yang sama persis dengan contoh soal — cukup ganti angka, nama/benda, lalu hitung ulang jawaban & 4 pengecoh baru memakai skrip Python data/generated/vol19/verify/verify_tiu_math_logic.py (Fraction/Decimal/permutations). Semua rumus pakai KaTeX $...$.
   - TIU Figural (#60–65): Buat 6 gambar deterministik via data/generated/vol19/verify/generate_figural.py (Pillow/matplotlib, latar putih, font TrueType 26–32px, tanpa elemen tumpang tindih) ke data/generated/vol19/gambar/q60_figural.png s.d. q65_figural.png, lalu periksa gambarnya secara visual.
   - TWK (#1–30) & TKP (#66–110): Samakan gaya, panjang, dan tingkat kesulitan soal contoh, lalu buat kasus/tokoh baru. Buka/cari pasal atau kata baku di docs/question-authoring/references/ HANYA seperlunya saat memverifikasi soal terkait.
4. Validasi setiap batch segera dengan: python scripts/validate_question_pack.py <file_batch> --partial.
5. Setelah 17 batch selesai, gabungkan ke data/generated/vol19/vol19-bank-soal.json lalu jalankan:
   python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json --shuffle --export-csv data/generated/vol19/vol19-impor-final.csv --export-xlsx data/generated/vol19/vol19-impor-final.xlsx --report data/generated/vol19/audit-report.md --export-blind-audit data/generated/vol19/cross_audit/
6. Pastikan verify_tiu_math_logic.py lulus 100% dan validasi pada vol19-impor-final.xlsx menghasilkan 0 Hard Errors. Jangan ubah kode backend/ atau frontend/, dan jangan import ke DB produksi sebelum saya meninjau hasilnya.
```

---

## Prompt 1 — Batch TWK (Mode Web Chat, Konteks Ringan)

*Tempelkan HANYA 2–3 soal contoh dari `Packet 1`/`Packet 2` untuk sub-topik yang dipilih (jika butuh kepastian pasal/kata baku, tempelkan HANYA potongan pasal/tabel yang relevan, bukan seluruh file).*

```text
Buatkan tepat [5] soal TWK sub-kategori "[Nasionalisme / Integritas / Bela Negara / Pilar Negara / Bahasa Indonesia]" nomor [1–5] dengan gaya, panjang kalimat, dan tingkat kesulitan yang SERUPA dengan soal contoh berikut, tetapi gunakan kasus & tokoh yang baru.

Aturan singkat:
1. Pastikan setiap fakta pasal UUD 1945 / UU ASN 20/2023 / ejaan KBBI VI & EYD V benar akurat (jangan mengarang pasal).
2. Buat 5 opsi (A–E) yang panjangnya relatif seimbang dan semua terdengar masuk akal (tepat 1 opsi skor 5, 4 opsi lain skor 0).
3. Pembahasan mulai dengan: "Jawaban yang benar adalah Opsi <HURUF>." lalu jelaskan singkat alasannya. Nama tokoh di pembahasan harus sama persis dengan di soal.
4. Keluarkan HANYA array JSON valid sesuai schema TOCPNS.

Contoh soal acuan:
[TEMPEL 2–3 SOAL CONTOH DI SINI]
```

---

## Prompt 2 — Batch TIU Numerik & Logika (Clone Pola, Ubah Angka + Verifikasi Python)

*Tempelkan 4–5 soal contoh dari `Packet 1`/`Packet 2` untuk batch yang dipilih.*

```text
Buatkan tepat [5] soal TIU sub-kategori "[Berhitung / Deret Angka / Perbandingan Kuantitatif / Soal Cerita / Analitis / Silogisme]" nomor [43–47] dengan MENIRU PERSIS pola/rumus dan tingkat kesulitan soal contoh berikut — cukup UBAH ANGKA, NAMA, atau KONTEKS SINGKATNYA, lalu hitung ulang jawaban baru dan 4 opsi pengecoh baru!

Aturan wajib:
1. Tulis dulu skrip Python (pakai fractions.Fraction / decimal.Decimal untuk hitungan, atau itertools.permutations untuk analitis) guna membuktikan jawaban eksak baru dan memastikan ke-5 opsi bernilai BERBEDA serta bukan angka yang sama dengan contoh.
2. Semua pecahan, pangkat, akar, dan variabel wajib pakai KaTeX inline $...$ (mis. $\frac{3}{8}$, $x^2$, $\sqrt{225}$).
3. Pembahasan mulai dengan: "Jawaban yang benar adalah Opsi <HURUF>." diikuti langkah hitung singkat sesuai hasil Python.
4. Keluarkan: (a) skrip Python verifikasi, lalu (b) array JSON valid sesuai schema TOCPNS (1 opsi skor 5, 4 opsi skor 0).

Contoh soal acuan:
[TEMPEL 4–5 SOAL CONTOH DI SINI]
```

---

## Prompt 3 — Batch TIU Figural (Generator Kode Python)

```text
Tulis skrip Python (Pillow atau matplotlib) untuk membuat 6 gambar soal TIU Figural orisinal ke data/generated/<kode_paket>/gambar/:
- q60_figural.png & q61_figural.png: Analogi Gambar (A : B = C : ?)
- q62_figural.png & q63_figural.png: Ketidaksamaan Gambar (pilih 1 dari 5 yang berbeda aturan)
- q64_figural.png & q65_figural.png: Serial Gambar (4 kotak berurutan → kotak ke-5)

Aturan:
1. Setiap soal punya aturan geometris pasti (mis. rotasi + penambahan elemen, atau pergeseran sudut + perubahan isi hitam/putih) dengan tepat 1 jawaban benar pada opsi A–E.
2. Latar putih (#FFFFFF), garis hitam tajam (#111827, 3–4px), pakai font TrueType besar (arial.ttf/DejaVuSans-Bold.ttf size 26–32px — jangan default font kecil), dan pisahkan zona motif tengah (28%–72% kotak) dari penanda sudut (<= 16% tepi) agar tidak bertabrakan.
3. Sertakan JSON 6 soal (#60–65) dengan opsi teks "Gambar A" s.d. "Gambar E" dan pembahasan yang mulai dengan "Jawaban yang benar adalah Opsi <HURUF>."
```

---

## Prompt 4 — Batch TKP (Tiru Gaya & Panjang Contoh, Rubrik 5→1)

*Tempelkan 2–3 soal contoh TKP sub-topik yang sama dari `Packet 1`/`Packet 2`.*

```text
Buatkan tepat [6] soal TKP sub-kategori "[Pelayanan Publik / Jejaring Kerja / Sosial Budaya / Teknologi Informasi dan Komunikasi / Profesionalisme / Anti Radikalisme]" nomor [66–71] dengan gaya dilema, panjang soal, dan tingkat kesulitan yang SERUPA dengan contoh berikut, tetapi gunakan situasi & tokoh baru.

Aturan:
1. Wajib punya 5 bobot unik: 5, 4, 3, 2, 1 (tanpa nilai kembar).
   - 5: Proaktif, solutif tuntas, empatik, taat SOP.
   - 4: Positif & sopan tapi kurang tuntas/kurang inisiatif.
   - 3: Normatif kaku atau pasif menunggu arahan.
   - 2: Kurang peduli atau menunda tanggung jawab.
   - 1: Reaktif, egois, melanggar SOP, atau permisif pada intoleransi.
2. Panjang ke-5 opsi HARUS seimbang (jangan buat opsi skor 5 jauh paling panjang) dan nada bahasanya tetap wajar/profesional.
3. Pembahasan mulai dengan: "Jawaban dengan skor tertinggi adalah Opsi <HURUF> (5 poin)." diikuti ringkasan singkat "Opsi X=5 (...), Opsi Y=4 (...), Opsi Z=3 (...), Opsi W=2 (...), Opsi V=1 (...)."
4. Keluarkan HANYA array JSON valid sesuai schema TOCPNS.

Contoh soal acuan:
[TEMPEL 2–3 SOAL CONTOH DI SINI]
```

---

## Prompt 5 — Audit Cepat Silang Model (Opsional Pasca-Generate)

> Untuk audit lengkap 110 soal tanpa *context fatigue*, jalankan `--export-blind-audit` lalu pakai **Prompt 6A–6D** di [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md).

Untuk cek cepat satu batch kecil di model AI berbeda:

```text
Kamu adalah auditor soal CPNS yang kritis. Periksa batch soal JSON terlampir dan laporkan HANYA soal yang punya kesalahan nyata:
1. Salah fakta pasal/hukum/ejaan KBBI VI & EYD V (TWK).
2. Salah hitung, jawaban ganda, atau 2 opsi bernilai sama (TIU — hitung ulang dari nol!).
3. Opsi skor 4 terasa lebih baik/sama baiknya dengan skor 5, atau skor 5 ketahuan karena jauh paling panjang (TKP).
4. Nama tokoh atau huruf kunci di pembahasan tidak cocok dengan soal/skor.

Tampilkan dalam tabel: | Nomor | Tingkat (KRITIS/MAYOR) | Masalah | Perbaikan Eksak |
Jika bersih, tulis: "LULUS AUDIT (0 TEMUAN)".
```
