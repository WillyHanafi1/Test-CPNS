# TOCPNS Offline Question Authoring Factory

Direktori ini berisi seluruh pedoman, aturan kualitas, blueprint 110 soal, korpus referensi terverifikasi, dan koleksi prompt untuk menghasilkan paket tryout SKD CPNS secara **mandiri, terukur, orisinal, dan bebas halusinasi** secara *offline* (tanpa menambahkan dependensi AI ke aplikasi produksi TOCPNS).

## Daftar Dokumen

| Berkas | Fungsi Utama |
| :--- | :--- |
| [AGENT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/AGENT.md) | SOP otonom 8-fase end-to-end untuk AI Agent (Antigravity, Claude Code, Codex, Gemini CLI). |
| [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) | Aturan keras (*Hard Gate*), schema JSON/Excel, standar KaTeX, anti-plagiarisme, dan rubrik TKP 5→1. |
| [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md) | Peta slot eksak Nomor `1–110` (30 TWK, 35 TIU, 45 TKP) hasil ekstraksi DNA `Packet 1` & `Packet 2`. |
| [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md) | Master Prompt otonom (1 perintah), 5 Batch Prompt untuk Web Chat, dan Prompt Auditor Adversarial (6A–6D). |
| [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md) | Protokol Review Silang Beda Model (4 batch audit, TIU Blind-Solve otomatis via `--export-blind-audit`, ambang kelulusan, resolusi sengketa, & template `cross-model-audit.md`). |
| [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md) | SOP Spot-Check Manusia 15 Menit pra-terbit (menit-demi-menit, 10 Red Flags, template `signoff-checklist.md`, & kalibrasi psikometris pasca-terbit). |

## Korpus Referensi Terverifikasi (`references/`)
| Berkas Korpus | Cakupan & Kegunaan (Mendukung 10+ Paket Tanpa Pengulangan) |
| :--- | :--- |
| [uud_1945_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uud_1945_lengkap.md) | **Naskah lengkap verbatim UUD NRI Tahun 1945 (Amandemen I–IV):** Pembukaan, seluruh 21 BAB & 73 Pasal Batang Tubuh, Aturan Peralihan, Aturan Tambahan, penanda perubahan `*)–****)`, & indeks cepat TWK. |
| [uu_20_2023_asn_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uu_20_2023_asn_lengkap.md) | **Naskah lengkap verbatim UU No. 20 Tahun 2023 tentang ASN:** Konsiderans, 14 BAB, seluruh 77 Pasal Batang Tubuh (termasuk BerAKHLAK Pasal 3–4, Hak & Kewajiban Pasal 21–24, BUP Pasal 55, Non-ASN Pasal 65–66) + Penjelasan Umum & Pasal demi Pasal. |
| [korpus_bahasa_indonesia_kbbi6_eyd5.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_bahasa_indonesia_kbbi6_eyd5.md) | **Korpus Bahasa Indonesia EYD V & KBBI VI:** Kaidah pembaruan EYD V (`maha-` Tuhan, 14 konjungsi `-pun`, peluluhan KTSP), 191 pasangan kata baku–tidak baku, 90 sinonim/antonim akademik, 62 idiom kontekstual, 35 pola kalimat efektif, & matriks rotasi paket Vol.19–Vol.30. |
| [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md) | **Korpus Terpadu TWK & TKP:** 5 Sila operasional Pancasila, 9 Nilai Integritas KPK & gratifikasi, UU Bela Negara 23/2019, Linimasa Sejarah 1908–2002, serta Anti-Radikalisme & Moderasi Beragama. |

## Referensi & Skrip Terkait di Repositori
- Kisi-kisi resmi: [kepmenpan_rb_321_2024.md](file:///d:/ProjectAI/Test-CPNS/docs/kepmenpan_rb_321_2024.md)
- UUD 1945 ringkas (referensi cepat): [uud_1945_ringkas.md](file:///d:/ProjectAI/Test-CPNS/docs/uud_1945_ringkas.md)
- Sample anchor kalibrasi: `data/Packet 1/outputs/packet1-vol17/vol17-bank-soal.json` & `data/Packet 2/outputs/packet2-vol18/vol18-bank-soal.json`
- Quality Gate, Blind-Audit Bundler, Shuffler & Exporter: [validate_question_pack.py](file:///d:/ProjectAI/Test-CPNS/scripts/validate_question_pack.py)
- Two-pass Answer Shuffler: [shuffle_answers.py](file:///d:/ProjectAI/Test-CPNS/scripts/shuffle_answers.py)

## Cara Menjalankan Cepat (End-to-End)
1. Buka sesi AI Agent di workspace `d:\ProjectAI\Test-CPNS`, salin **Prompt 0** dari [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md), sesuaikan kode paket (`vol19`, `vol20`, dst.).
2. Jalankan **Review Silang Beda Model** memakai paket audit di `data/generated/<kode_paket>/cross_audit/` sesuai [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md) (tutup semua temuan KRITIS & MAYOR).
3. Upload 6 gambar figural ke bucket Supabase `exam-assets` (`figural/<kode_paket>/`) dan perbarui `image_url`, lalu ekspor ulang `.xlsx` final.
4. Lakukan **Spot-Check Manusia 15 Menit** sesuai [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md): impor `<kode_paket>-impor-final.xlsx` lewat **Admin → Bank soal → Import Excel / CSV** ke paket Draft, cek Split-Pane Live Preview, lalu klik **Validasi & Terbitkan** di `/admin/packages`.
