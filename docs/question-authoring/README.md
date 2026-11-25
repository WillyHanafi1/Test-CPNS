# TOCPNS Offline Question Authoring Factory

Direktori ini berisi panduan **ringkas, presisi, dan bebas kelebihan konteks** untuk menghasilkan paket SKD CPNS **110 soal** secara *offline* yang menyamai kualitas, variasi, dan standar psikometri seluruh korpus referensi **`Packet 1–15` (1.650 soal nyata)** — baik **Profil Standar SKD BKN** (gabungan terbaik `Packet 1–10, 14–15`) maupun **Profil HOTS / Penalaran Lanjutan** (`Packet 11–13`) — sekaligus bebas overlap terhadap paket-paket `data/generated/*` sebelumnya.

---

## 1. Dokumen Inti (Dibaca AI Agent di Awal Sesi)

| Berkas | Fungsi |
| :--- | :--- |
| [RULES.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/RULES.md) | 3 prinsip inti, standar `sub_category` granular kanonik (tampil live di badge UI), format pembahasan anti-boilerplate, KaTeX multi-baris (`remark-math` v6), Figural 42 PNG terpisah, & Hard Gate teknis. |
| [BLUEPRINT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/BLUEPRINT.md) | Peta **18 batch kecil (4–9 soal/batch)** untuk Profil Standar & Profil HOTS-UTBK + aturan pengelompokan blok `--group-by-blocks` + perintah sampling contoh otomatis. |
| [AGENT.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/AGENT.md) | Alur eksekusi *Just-In-Time* (konteks ringan per batch) dari sampling contoh, pembuktian Python, render Figural terpisah & diagram bebas nomor, `--shuffle --group-by-blocks`, uji KaTeX frontend, hingga `.xlsx` siap impor. |
| [PROMPTS.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/PROMPTS.md) | **Prompt 0** (Agent mandiri 110 soal) + **Prompt 1–4** (Web Chat per segmen, termasuk **Prompt 2B HOTS-UTBK** & **Prompt 3 Figural terpisah**) + **Prompt 5** (Audit cepat). |

## 2. Kamus Referensi *On-Demand* (`references/` — JANGAN Dibaca Semua Sekaligus!)

Buka/cari isi berkas berikut **hanya saat butuh memverifikasi pasal/fakta/kata baku tertentu** di batch yang sedang ditulis:

| Berkas | Isi |
| :--- | :--- |
| [uud_1945_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uud_1945_lengkap.md) | Naskah lengkap verbatim UUD 1945 (Amandemen I–IV, Pembukaan & 73 Pasal + Aturan Peralihan/Tambahan). |
| [uu_20_2023_asn_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/uu_20_2023_asn_lengkap.md) | Naskah lengkap verbatim UU No. 20/2023 tentang ASN (77 Pasal + Penjelasan). |
| [korpus_bahasa_indonesia_kbbi6_eyd5.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_bahasa_indonesia_kbbi6_eyd5.md) | Kaidah EYD V, 191 kata baku KBBI VI, 90 sinonim/antonim, 62 idiom, & 35 pola kalimat efektif. |
| [korpus_twk_tkp_lengkap.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/references/korpus_twk_tkp_lengkap.md) | 5 Sila operasional, 9 Nilai Integritas KPK, UU Bela Negara 23/2019, Linimasa Sejarah, & Anti-Radikalisme. |

## 3. Tahap QA Pasca-Generate (Setelah 110 Soal Selesai)

| Berkas | Fungsi |
| :--- | :--- |
| [CROSS_MODEL_REVIEW.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/CROSS_MODEL_REVIEW.md) | Review silang memakai model AI berbeda (`--export-blind-audit` mengupas kunci TIU untuk *blind-solve* dari nol). |
| [HUMAN_SPOT_CHECK_SOP.md](file:///d:/ProjectAI/Test-CPNS/docs/question-authoring/HUMAN_SPOT_CHECK_SOP.md) | Checklist spot-check manusia 15 menit (dasbor metrik, inspeksi visual Figural terpisah & diagram TIU, 10 soal sampel per `sub_category`, Live Preview Admin & badge UI). |

## 4. Skrip Otomasi & Korpus Anchor (`Packet 1–15` + `data/generated/*`)

- **Korpus referensi:** Seluruh `data/Packet 1` s.d. `data/Packet 15` (`1.650 soal` — Sumber A `Packet 1–3`, Sumber B1 Standar `Packet 4–10, 14–15`, Sumber B2 HOTS-UTBK `Packet 11–13`) **ditambah** seluruh paket final sebelumnya di `data/generated/*/*-bank-soal-final.json` (otomatis dicek anti-overlap tanpa bentrok diri sendiri).
- **Multi-Source Anchor Sampler (*Just-In-Time*):** [sample_anchor_questions.py](file:///d:/ProjectAI/Test-CPNS/scripts/sample_anchor_questions.py) — mengambil 4–6 contoh yang 100% tepat topik & sub-jenis tanpa memuat file JSON utuh.
- **Quality Gate, Balanced Shuffler, Block Grouper (`--group-by-blocks`), Blind-Audit & Exporter:** [validate_question_pack.py](file:///d:/ProjectAI/Test-CPNS/scripts/validate_question_pack.py)
- **Two-Pass Balanced Answer Shuffler:** [shuffle_answers.py](file:///d:/ProjectAI/Test-CPNS/scripts/shuffle_answers.py)
