# Panduan Penggunaan Pipeline Quality Audit CPNS

Dokumen ini menjelaskan cara menggunakan dan memahami cara kerja sistem **Two-Pass Hybrid Quality Assurance Pipeline** yang dirancang untuk memastikan soal-soal CPNS hasil *generate* AI memiliki kualitas tinggi, akurat, dan tidak memiliki cacat logika sebelum masuk ke *database* utama.

## 1. Konsep Utama: Two-Pass Hybrid QA

Pipeline ini dirancang untuk mencegah *self-reinforcement bias* (di mana AI merasa selalu benar terhadap buatannya sendiri) dengan memisahkan tugas audit menjadi dua agen berbeda:

1.  **Pass 1: AI Judge (Auditor)**
    *   Tugas: Mengkritik dan mencari kesalahan.
    *   Cara Kerja: Diberikan instruksi sebagai *Senior BKN Reviewer*, AI ini akan menilai setiap soal berdasarkan 6 dimensi:
        1. Konsistensi Pembahasan (apakah teks dan skor cocok?)
        2. Akurasi Substansi (apakah fakta sejarah/hukum benar?)
        3. Kualitas Pengecoh (apakah opsi lain masuk akal?)
        4. Kejelasan Bahasa (apakah ambigu atau terlalu panjang?)
        5. Bloom's Taxonomy (apakah tingkat kesulitan sesuai?)
        6. Format CAT (apakah bisa dirender di layar dengan baik?)
    *   Output: Skor rata-rata (1-5) dan rekomendasi perbaikan. Jika skor di bawah *threshold* (default: 4.0), soal di-**FLAG**.
2.  **Pass 2: AI Fixer (Remediator)**
    *   Tugas: Memperbaiki soal yang di-FLAG oleh Judge.
    *   Cara Kerja: Menerima soal yang cacat beserta daftar kritik dari Judge. AI Fixer akan meregenerasi narasi soal, teks opsi, atau teks pembahasan.
    *   **Aturan Emas:** AI Fixer **DILARANG KERAS** mengubah bobot nilai (`score_a` sampai `score_e`). Hanya redaksi teks yang boleh diubah untuk mencocokkan logika dengan skor yang sudah ditetapkan.

## 2. Cara Menggunakan `quality_audit.py`

Script utama berada di `scripts/quality_audit.py`.

### Perintah Dasar
Untuk menjalankan audit saja (tanpa perbaikan otomatis):
```bash
python scripts/quality_audit.py data/csv/NamaFile.csv
```

Untuk menjalankan audit **dan otomatis memperbaiki** soal yang di-flag (Sangat Disarankan):
```bash
python scripts/quality_audit.py data/csv/NamaFile.csv --fix
```

### Opsi Lanjutan
*   `--threshold <angka>`: Mengatur batas nilai minimal. Default: `4.0`. Semakin tinggi angka ini, semakin ketat auditnya.
*   `--model <nama_model>`: Memilih model AI yang digunakan. Default: `gemini-3.1-pro-preview` (Direkomendasikan karena *reasoning* yang kuat).

## 3. Fitur Keamanan dan Stabilitas (Rate Limiting)

Saat memperbaiki puluhan soal secara paralel, API Gemini sering kali mengembalikan error `429 Resource Exhausted`. Untuk mencegah sistem *crash*, pipeline ini dilengkapi dengan perlindungan 3 lapis:

1.  **Global Token Bucket Rate Limiter**
    *   Membatasi pemanggilan API maksimal **20 Request Per Minute (RPM)**.
    *   Jika kuota habis, script akan otomatis *pause* (menunggu dalam hitungan detik) sampai *window* menit berikutnya terbuka.
2.  **Exponential Backoff pada Error 429**
    *   Jika server API tetap menolak koneksi karena terlalu sibuk, sistem akan *backoff* (mundur teratur) dengan jeda 35 detik, lalu 45 detik, lalu 55 detik, sebelum menyerah.
3.  **Wave Processing (Sistem Gelombang)**
    *   Alih-alih mengirim 50 perbaikan soal secara bersamaan, sistem akan memecahnya menjadi "Gelombang" (Wave).
    *   Setiap Wave berisi 10 soal. Setelah 10 soal selesai, sistem akan *cooldown* selama 15 detik sebelum melanjutkan ke Wave berikutnya.

## 4. Pola Kesalahan yang Sering Diperbaiki (Common Fixes)

Sistem ini sangat efektif dalam memperbaiki pola kesalahan berikut:
*   **Ketidaksesuaian Opsi Pembahasan (Mismatch):** Pembahasan menyebut "Jawaban yang benar adalah A", namun `score_a` = 0 dan `score_d` = 5.
*   **Penyebutan Opsi Ganda:** Pembahasan berbunyi "Opsi C dan C" alih-alih merinci semua opsi secara berurutan.
*   **TIU Verbal Bernomor:** Soal Analogi atau Silogisme yang mengandung angka (diharamkan dalam spesifikasi BKN murni verbal).
*   **Stem Soal TWK Terlalu Panjang:** Memangkas narasi sejarah yang melebihi 100 kata agar ramah layar ujian CAT.

## 5. Output dan Laporan

Setelah selesai, script akan menghasilkan **2 file baru**:
1.  `data/csv/NamaFile_audit_report.json`: Laporan lengkap alasan setiap soal di-flag beserta skor rinci dari AI Judge. Berguna untuk analisis manual.
2.  `data/csv/NamaFile_Fixed.csv`: Berkas CSV final yang sudah dibersihkan dan siap di-*import* ke dalam database Supabase. Menggunakan *suffix* `_Fixed`.
