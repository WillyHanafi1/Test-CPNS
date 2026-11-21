# TOCPNS Offline Question Authoring Factory

Direktori ini berisi seluruh pedoman, aturan kualitas, blueprint 110 soal, korpus referensi terverifikasi, dan koleksi prompt untuk menghasilkan paket tryout SKD CPNS secara **mandiri, terukur, orisinal, dan bebas halusinasi** secara *offline* (tanpa menambahkan dependensi AI ke aplikasi produksi TOCPNS).

## Daftar Dokumen

| Berkas | Fungsi Utama |
| :--- | :--- |
| [AGENT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/AGENT.md) | SOP otonom 8-fase end-to-end untuk AI Agent (Antigravity, Claude Code, Codex, Gemini CLI). |
| [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) | Aturan keras (*Hard Gate*), schema JSON/Excel, standar KaTeX, anti-plagiarisme, dan rubrik TKP 5→1. |
| [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md) | Peta slot eksak Nomor `1–110` (30 TWK, 35 TIU, 45 TKP) hasil ekstraksi DNA `Packet 1` & `Packet 2`. |
| [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md) | Master Prompt otonom (1 perintah), 5 Batch Prompt untuk Web Chat, dan Prompt Auditor Adversarial. |
| [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md) | Korpus terverifikasi pelengkap: Pembukaan & Pasal 35–37 UUD 1945, 5 Sila operasional, UU ASN 20/2023 BerAKHLAK, UU Bela Negara 23/2019, 9 Nilai Integritas KPK, Linimasa Sejarah, EYD V / KBBI VI, dan Anti-Radikalisme. |

## Referensi & Skrip Terkait di Repositori
- Kisi-kisi resmi: [kepmenpan_rb_321_2024.md](file:///d:/ProjectAI/Test-CPNS/docs/kepmenpan_rb_321_2024.md)
- UUD 1945 ringkas: [uud_1945_ringkas.md](file:///d:/ProjectAI/Test-CPNS/docs/uud_1945_ringkas.md)
- Sample anchor kalibrasi: `data/Packet 1/outputs/packet1-vol17/vol17-bank-soal.json` & `data/Packet 2/outputs/packet2-vol18/vol18-bank-soal.json`
- Quality Gate, Shuffler & Exporter: [validate_question_pack.py](file:///d:/ProjectAI/Test-CPNS/scripts/validate_question_pack.py)
- Two-pass Answer Shuffler: [shuffle_answers.py](file:///d:/ProjectAI/Test-CPNS/scripts/shuffle_answers.py)

## Cara Menjalankan Cepat (Otonom)
1. Buka sesi AI Agent di workspace `d:\ProjectAI\Test-CPNS`.
2. Salin **Prompt 0** dari [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md), sesuaikan kode paket (`vol19`, `vol20`, dst.).
3. Setelah selesai, tinjau `data/generated/<kode_paket>/audit-report.md` dan 6 gambar figural di `gambar/`.
4. Upload gambar figural ke bucket Supabase `exam-assets` (`figural/<kode_paket>/`), lalu import file `<kode_paket>-impor-final.xlsx` lewat **Admin → Bank soal → Import Excel / CSV** ke paket Draft dan klik **Validasi & Terbitkan**.
