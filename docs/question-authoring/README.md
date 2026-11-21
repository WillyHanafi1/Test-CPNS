# TOCPNS Offline Question Authoring Factory

Direktori ini berisi panduan **ringan, langsung pakai, dan bebas kelebihan konteks** untuk menghasilkan paket SKD CPNS 110 soal secara *offline* dengan tingkat kesulitan yang **meniru persis `Packet 1` (`vol17`) & `Packet 2` (`vol18`)**.

---

## 1. Dokumen Inti (Ringkas — Dibaca AI Agent Saat Generate)

| Berkas | Fungsi |
| :--- | :--- |
| [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) | 3 prinsip inti + Hard Gate teknis (110 soal, skor, KaTeX, Python verify TIU, batas anti-salin). |
| [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md) | Peta 17 batch (`#1–110`) dan nomor contoh padanannya di `Packet 1` / `Packet 2`. |
| [AGENT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/AGENT.md) | Alur kerja *Just-In-Time* (konteks minimal per batch) dari generate sampai `.xlsx` siap impor. |
| [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md) | **Prompt 0** (1 perintah ringkas untuk AI Agent mandiri) + **Prompt 1–5** (Web Chat) + **Prompt 6** (Audit). |

## 2. Kamus Referensi *On-Demand* (`references/` — JANGAN Dibaca Semua Sekaligus!)

Buka/cari isi berkas berikut **hanya saat butuh mengecek fakta/pasal/kata baku tertentu** di batch yang sedang ditulis:

| Berkas | Isi |
| :--- | :--- |
| [uud_1945_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uud_1945_lengkap.md) | Naskah lengkap verbatim UUD 1945 (Amandemen I–IV, seluruh Pembukaan & 73 Pasal + Aturan Peralihan/Tambahan). |
| [uu_20_2023_asn_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uu_20_2023_asn_lengkap.md) | Naskah lengkap verbatim UU No. 20/2023 tentang ASN (seluruh 77 Pasal + Penjelasan). |
| [korpus_bahasa_indonesia_kbbi6_eyd5.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_bahasa_indonesia_kbbi6_eyd5.md) | Kaidah EYD V, 191 kata baku KBBI VI, 90 sinonim/antonim, 62 idiom, & 35 pola kalimat efektif. |
| [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md) | 5 Sila operasional, 9 Nilai Integritas KPK, UU Bela Negara 23/2019, Linimasa Sejarah, & Anti-Radikalisme. |

## 3. Tahap QA Opsional Pasca-Generate (Setelah 110 Soal Selesai)

| Berkas | Fungsi |
| :--- | :--- |
| [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md) | Review silang memakai model AI berbeda (`--export-blind-audit` menghasilkan batch TIU tanpa kunci). |
| [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md) | Checklist spot-check manusia 15 menit (metrik, 6 gambar Figural, 10 sampel soal, Live Preview Admin). |

## 4. Skrip Otomasi & Contoh Anchor
- Contoh anchor: `data/Packet 1/outputs/packet1-vol17/vol17-bank-soal.json` & `data/Packet 2/outputs/packet2-vol18/vol18-bank-soal.json`
- Quality Gate, Shuffler, Blind-Audit Bundler & Exporter: [validate_question_pack.py](file:///d:/ProjectAI/Test-CPNS/scripts/validate_question_pack.py)
- Two-pass Answer Shuffler: [shuffle_answers.py](file:///d:/ProjectAI/Test-CPNS/scripts/shuffle_answers.py)
