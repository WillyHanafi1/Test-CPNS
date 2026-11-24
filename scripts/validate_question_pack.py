"""
validate_question_pack.py — Deterministic Quality Gate, Shuffler, & Exporter for TOCPNS Question Packs.

Memvalidasi paket soal offline (JSON / CSV / XLSX) sebelum diimpor ke TOCPNS:
1. Struktur BKN (110 soal: 30 TWK, 35 TIU, 45 TKP, nomor kontinu 1..110) — atau mode --partial untuk batch kecil.
2. Integritas opsi (5 opsi A-E lengkap, tidak ada opsi kosong kecuali figural bergambar, tidak ada 2 opsi identik).
3. Integritas bobot skor (TWK/TIU: tepat [0,0,0,0,5]; TKP: tepat 5 bobot unik [1,2,3,4,5]).
4. Konsistensi pembahasan <-> kunci jawaban (TWK/TIU/TKP — termasuk verifikasi seluruh 5 bobot TKP Opsi X=5..1).
5. Kebersihan LaTeX ($ berpasangan, deteksi pangkat/akar mentah di luar $...$, deteksi Rp di dalam $...$).
6. Deteksi artefak AI ("Sebagai AI...", "Berikut adalah pembahasannya:", dsb.) & validasi sub_category kanonik.
7. Audit bias panjang opsi (opsi skor tertinggi tidak boleh terlalu sering jadi opsi terpanjang).
8. Audit anti-plagiarisme / kemiripan teks terhadap SELURUH paket referensi (Packet 1 s.d. Packet 15) + duplikasi internal + deteksi salin angka deret.
9. Audit gambar figural (image_url wajib terisi, peringatan jika masih memakai 127.0.0.1).
10. Opsional:
    - --shuffle: mengacak kunci A-E non-figural secara seimbang (500 percobaan, bebas siklus, streak <= 3) + two-pass discussion remap.
    - --shuffle-tkp-order: mengacak urutan nomor soal TKP (#66-110) agar tidak berkelompok per aspek (meniru CAT BKN asli).
    - --export-csv, --export-xlsx (sheet 'Impor'), --report, --export-blind-audit.

Penggunaan:
    python scripts/validate_question_pack.py data/generated/gen01/batches/twk_01_06.json --partial
    python scripts/validate_question_pack.py data/generated/gen01/gen01-bank-soal.json
    python scripts/validate_question_pack.py data/generated/gen01/gen01-bank-soal.json --shuffle --shuffle-tkp-order --export-csv data/generated/gen01/gen01-impor-final.csv --export-xlsx data/generated/gen01/gen01-impor-final.xlsx --report data/generated/gen01/audit-report.md --export-blind-audit data/generated/gen01/cross_audit/
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent


def _natural_sort_key(path: Path) -> list[Any]:
    return [int(tok) if tok.isdigit() else tok.lower() for tok in re.split(r"(\d+)", str(path))]


def discover_default_references() -> list[Path]:
    """Discover all reference bank-soal JSONs across data/Packet 1..N."""
    data_dir = REPO_ROOT / "data"
    if not data_dir.exists():
        return []
    found = sorted(data_dir.glob("Packet */outputs/**/*-bank-soal.json"), key=_natural_sort_key)
    return found


DEFAULT_REFERENCES = discover_default_references()

LETTERS = ["A", "B", "C", "D", "E"]
REQUIRED_SEGMENTS = {"TWK": 30, "TIU": 35, "TKP": 45}
FIGURAL_HINTS = ("figural", "analogi gambar", "serial gambar", "ketidaksamaan gambar")

CANONICAL_SUB_CATEGORIES: dict[str, set[str]] = {
    "TWK": {
        "Nasionalisme",
        "Integritas",
        "Bela Negara",
        "Pilar Negara",
        "Bahasa Indonesia",
    },
    "TIU": {
        # Granular TOCPNS production standard (data/csv/*.csv & BLUEPRINT.md)
        "Analogi",
        "Silogisme",
        "Analitis",
        "Berhitung",
        "Deret Angka",
        "Perbandingan Kuantitatif",
        "Soal Cerita",
        "Figural",
        # HOTS-UTBK profile (Packet 11-13 style)
        "Kecukupan Data",
        "Kesetaraan Operasi",
        "Pola Bilangan",
        # Macro labels used in Packet 1-15 extractions (kept valid)
        "Verbal",
        "Numerik",
        "Analogi Gambar",
        "Serial Gambar",
        "Ketidaksamaan Gambar",
    },
    "TKP": {
        "Pelayanan Publik",
        "Jejaring Kerja",
        "Sosial Budaya",
        "Teknologi Informasi dan Komunikasi",
        "Profesionalisme",
        "Anti Radikalisme",
    },
}

AI_ARTIFACT_PATTERNS = [
    (r"\bsebagai\s+(?:model\s+)?ai\b", "Terdeteksi frasa meta 'Sebagai AI'."),
    (r"^\s*(?:tentu,?\s+)?berikut\s+(?:adalah|merupakan)\s+(?:soal|pembahasan|jawaban)", "Terdeteksi pembuka meta AI ('Berikut adalah...')."),
    (r"\bsilakan\s+(?:pilih|periksa)\s+jawaban\s+di\s+bawah\b", "Terdeteksi frasa instruksi chat AI."),
    (r"\[TEMPEL\s+.+?\]", "Terdeteksi placeholder prompt yang belum diisi."),
]

STOPWORDS_ID = {
    "yang", "dan", "di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "atau",
    "adalah", "itu", "ini", "sebagai", "oleh", "tersebut", "akan", "dapat", "tidak",
    "jika", "agar", "secara", "lebih", "paling", "karena", "namun", "tetapi", "seorang",
    "anda", "saat", "ketika", "suatu", "hari", "bahwa", "berikut", "manakah",
}


@dataclass
class Issue:
    severity: str  # ERROR | WARNING
    number: int | None
    code: str
    message: str


@dataclass
class ValidationSummary:
    total_questions: int = 0
    segment_counts: dict[str, int] = field(default_factory=dict)
    key_distribution: dict[str, dict[str, int]] = field(default_factory=dict)
    longest_correct_ratio: float = 0.0
    max_ref_similarity: float = 0.0
    max_internal_similarity: float = 0.0
    ref_pack_count: int = 0
    errors: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)


def normalize_text(text: str) -> str:
    cleaned = (text or "").lower()
    cleaned = re.sub(r"\\[a-z]+", " ", cleaned)
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def tokenize(text: str) -> list[str]:
    return [t for t in normalize_text(text).split() if (len(t) > 2 or t.isdigit()) and t not in STOPWORDS_ID]


def ngrams(tokens: list[str], n: int = 3) -> set[tuple[str, ...]]:
    if len(tokens) < n:
        return {tuple(tokens)} if tokens else set()
    return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def text_similarity(text_a: str, text_b: str) -> float:
    tok_a, tok_b = tokenize(text_a), tokenize(text_b)
    if len(tok_a) < 5 or len(tok_b) < 5:
        return 0.0
    set_a, set_b = set(tok_a), set(tok_b)
    jaccard_words = len(set_a & set_b) / max(1, len(set_a | set_b))
    ng_a, ng_b = ngrams(tok_a, 3), ngrams(tok_b, 3)
    jaccard_3 = len(ng_a & ng_b) / max(1, len(ng_a | ng_b))
    return round(0.55 * jaccard_words + 0.45 * jaccard_3, 4)


def word_count(text: str) -> int:
    return len(re.findall(r"\S+", (text or "").strip()))


def is_figural(q: dict[str, Any]) -> bool:
    sub = str(q.get("sub_category") or "").lower()
    return any(h in sub for h in FIGURAL_HINTS)


def _normalize_option_list(raw_opts: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_opts, list):
        return []
    out = []
    for item in raw_opts:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "label": str(item.get("label") or "").strip().upper(),
                "content": str(item.get("content") or "").strip(),
                "score": int(float(item.get("score") or 0)),
                "image_url": (item.get("image_url") or item.get("image") or None),
            }
        )
    return sorted(out, key=lambda o: o["label"])


def load_questions(path: Path) -> list[dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        with path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        items = raw if isinstance(raw, list) else raw.get("questions") or raw.get("items") or []
        normalized = []
        for idx, item in enumerate(items, 1):
            sub_cat = (
                item.get("sub_category")
                or item.get("topic")
                or item.get("materi")
                or ""
            )
            img = item.get("image_url")
            if img is None and item.get("image"):
                img = item.get("image")
            normalized.append(
                {
                    "id": str(item.get("id") or f"q-{idx:03d}"),
                    "number": int(item.get("number") or idx),
                    "segment": str(item.get("segment") or "").strip().upper(),
                    "sub_category": str(sub_cat).strip(),
                    "content": str(item.get("content") or "").strip(),
                    "image_url": str(img).strip() if img else None,
                    "discussion": str(item.get("discussion") or "").strip(),
                    "options": _normalize_option_list(item.get("options")),
                }
            )
        return normalized

    if suffix in (".csv", ".xlsx", ".xls"):
        df = pd.read_csv(path) if suffix == ".csv" else pd.read_excel(path)
        df = df.fillna("")
        cols = {str(c).lower().strip(): c for c in df.columns}

        def pick(candidates: list[str]) -> str | None:
            for c in candidates:
                if c in cols:
                    return cols[c]
            return None

        c_num = pick(["number", "no", "nomor"])
        c_seg = pick(["segment", "segmen"])
        c_con = pick(["content", "teks soal", "soal"])
        c_img = pick(["image_url", "url gambar soal", "gambar_soal"])
        c_dis = pick(["discussion", "teks pembahasan", "pembahasan"])
        c_sub = pick(["sub_category", "materi", "sub materi", "topic"])

        out = []
        for idx, row in df.iterrows():
            options = []
            for lbl in ["a", "b", "c", "d", "e"]:
                c_oc = pick([f"option_{lbl}", f"opsi {lbl}"])
                c_os = pick([f"score_{lbl}", f"nilai {lbl}"])
                c_oi = pick([f"option_image_{lbl}", f"url gambar opsi {lbl}"])
                raw_score = row[c_os] if c_os else 0
                try:
                    sc = int(float(raw_score)) if str(raw_score).strip() != "" else 0
                except ValueError:
                    sc = 0
                oi_val = str(row[c_oi]).strip() if c_oi and str(row[c_oi]).strip() else None
                options.append(
                    {
                        "label": lbl.upper(),
                        "content": str(row[c_oc]).strip() if c_oc else "",
                        "score": sc,
                        "image_url": oi_val,
                    }
                )
            num_val = int(float(row[c_num])) if c_num and str(row[c_num]).strip() != "" else idx + 1
            img_val = str(row[c_img]).strip() if c_img and str(row[c_img]).strip() else None
            out.append(
                {
                    "id": f"row-{num_val:03d}",
                    "number": num_val,
                    "segment": str(row[c_seg]).strip().upper() if c_seg else "",
                    "sub_category": str(row[c_sub]).strip() if c_sub else "",
                    "content": str(row[c_con]).strip() if c_con else "",
                    "image_url": img_val,
                    "discussion": str(row[c_dis]).strip() if c_dis else "",
                    "options": options,
                }
            )
        return out

    raise ValueError(f"Format file tidak didukung: {path.suffix}")


def check_latex(text: str) -> tuple[list[str], list[str]]:
    """Returns (errors, warnings) for LaTeX hygiene."""
    errors: list[str] = []
    warnings: list[str] = []
    if not text:
        return errors, warnings
    cleaned = text.replace(r"\$", "")
    block_count = len(re.findall(r"\$\$", cleaned))
    if block_count % 2 != 0:
        errors.append("Tanda block LaTeX $$ tidak berpasangan.")
    no_block = re.sub(r"\$\$.*?\$\$", " ", cleaned, flags=re.DOTALL)
    inline_count = no_block.count("$")
    if inline_count % 2 != 0:
        errors.append("Tanda inline LaTeX $ tidak berpasangan.")
    for math_span in re.findall(r"\$(.+?)\$", no_block, flags=re.DOTALL):
        if re.search(r"\bRp\.?\s*\d", math_span):
            warnings.append("Format Rupiah (Rp...) berada di dalam $...$; tulis Rupiah di luar KaTeX.")
            break
    outside_math = re.sub(r"\$.*?\$", " ", no_block, flags=re.DOTALL)
    if re.search(r"\b[a-zA-Z0-9]+\^[0-9a-zA-Z(]", outside_math):
        errors.append("Terdeteksi pangkat mentah (mis. x^2) di luar $...$.")
    if re.search(r"\bakar\s*\(", outside_math, flags=re.IGNORECASE):
        errors.append("Terdeteksi notasi akar(...) mentah di luar $...$ (gunakan $\\sqrt{...}$).")
    return errors, warnings


def extract_claimed_key(discussion: str) -> str | None:
    if not discussion:
        return None
    patterns = [
        # "Jawaban yang benar adalah Opsi C." / "Pilihan paling tepat: B"
        r"(?:jawaban|opsi|pilihan|kunci)\s+(?:yang\s+)?(?:paling\s+)?(?:benar|tepat|terbaik|tertinggi|sah|utama)(?:\s*\(\s*5(?:\s*poin)?\s*\))?\s*(?:adalah|yaitu|:)\s*(?:opsi|pilihan)?\s*\(?([A-E])\)?(?![a-zA-Z])",
        # "Jawaban dengan skor tertinggi adalah Opsi B (5 poin)." / "Jawaban dengan skor tertinggi (5) adalah B"
        r"(?:jawaban|opsi|pilihan|kunci)\s+(?:dengan\s+)?(?:skor|poin|nilai)\s+tertinggi(?:\s*\(\s*5(?:\s*poin)?\s*\))?\s*(?:adalah|yaitu|:)\s*(?:opsi|pilihan)?\s*\(?([A-E])\)?(?![a-zA-Z])",
        # "Jawaban: C" / "Kunci jawaban: C"
        r"(?:^|\n)\s*(?:jawaban|kunci(?:\s+jawaban)?)\s*:\s*(?:opsi|pilihan)?\s*\(?([A-E])\)?(?![a-zA-Z])",
        # "Opsi B benar / bernilai 5"
        r"^\s*(?:opsi|pilihan|jawaban)\s*\(?([A-E])\)?\s*(?:benar|tepat|bernilai\s*5|memperoleh\s*skor\s*5)",
    ]
    for pat in patterns:
        m = re.search(pat, discussion, flags=re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return None


def extract_tkp_claimed_scores(discussion: str) -> dict[str, int]:
    """Extract compact TKP score mappings like 'Opsi B=5' or 'B = 4' from discussion."""
    if not discussion:
        return {}
    found: dict[str, int] = {}
    for m in re.finditer(r"(?:(?:opsi|pilihan)\s+)?(?<![a-zA-Z0-9_])([A-E])\s*=\s*([1-5])(?![0-9])", discussion):
        ltr = m.group(1).upper()
        sc = int(m.group(2))
        if ltr not in found:
            found[ltr] = sc
    return found


def check_ai_artifacts(text: str) -> list[str]:
    hits: list[str] = []
    if not text:
        return hits
    for pat, msg in AI_ARTIFACT_PATTERNS:
        if re.search(pat, text, flags=re.IGNORECASE):
            hits.append(msg)
    return hits


def validate_pack(
    questions: list[dict[str, Any]],
    *,
    partial: bool = False,
    reference_questions: list[tuple[str, dict[str, Any]]] | None = None,
    ref_pack_count: int = 0,
    similarity_threshold: float = 0.50,
    tiu_similarity_threshold: float = 0.85,
    internal_similarity_threshold: float = 0.55,
) -> ValidationSummary:
    summary = ValidationSummary(total_questions=len(questions), ref_pack_count=ref_pack_count)
    ref_list = reference_questions or []

    # Pre-index reference tokenized blobs & numeric sequences for fast checks across 15+ packs
    ref_indexed: list[tuple[str, dict[str, Any], set[str], set[tuple[str, ...]], list[str]]] = []
    for ref_label, ref_q in ref_list:
        ref_blob = ref_q["content"] + " " + " ".join(o["content"] for o in ref_q["options"])
        toks = tokenize(ref_blob)
        ref_nums = re.findall(r"-?\d+(?:[.,]\d+)?", ref_q["content"])
        ref_indexed.append((ref_label, ref_q, set(toks), ngrams(toks, 3), ref_nums))

    seg_counter = Counter(q["segment"] for q in questions)
    summary.segment_counts = dict(seg_counter)

    # 1. Full pack count & contiguous numbering
    numbers = [q["number"] for q in questions]
    if len(set(numbers)) != len(numbers):
        dups = [n for n, c in Counter(numbers).items() if c > 1]
        summary.errors.append(Issue("ERROR", None, "duplicate_numbers", f"Nomor soal duplikat: {dups}"))

    if not partial:
        if len(questions) != 110:
            summary.errors.append(Issue("ERROR", None, "question_count", f"Total soal harus 110; ditemukan {len(questions)}."))
        if sorted(numbers) != list(range(1, 111)):
            summary.errors.append(Issue("ERROR", None, "number_sequence", "Nomor soal harus berurutan kontinu 1 sampai 110."))
        for seg, expected in REQUIRED_SEGMENTS.items():
            actual = seg_counter.get(seg, 0)
            if actual != expected:
                summary.errors.append(Issue("ERROR", None, "segment_quota", f"Komposisi {seg} harus {expected} soal; ditemukan {actual}."))

    # Per-question validation
    longest_correct_hits = 0
    non_figural_count = 0
    key_by_seg: dict[str, list[str]] = {"TWK": [], "TIU": [], "TKP": []}

    for q in questions:
        num = q["number"]
        seg = q["segment"]
        opts = q["options"]
        fig = is_figural(q)

        if seg not in REQUIRED_SEGMENTS:
            summary.errors.append(Issue("ERROR", num, "invalid_segment", f"Segmen '{seg}' tidak valid (harus TWK/TIU/TKP)."))
        if not q["content"]:
            summary.errors.append(Issue("ERROR", num, "empty_content", "Teks pertanyaan kosong."))
        if not q["discussion"]:
            summary.errors.append(Issue("ERROR", num, "empty_discussion", "Pembahasan wajib diisi."))

        sub_cat = q["sub_category"]
        if not sub_cat:
            summary.warnings.append(Issue("WARNING", num, "missing_sub_category", "sub_category kosong (diperlukan untuk Topic Mastery Analytics)."))
        elif seg in CANONICAL_SUB_CATEGORIES and sub_cat not in CANONICAL_SUB_CATEGORIES[seg]:
            summary.warnings.append(
                Issue("WARNING", num, "non_canonical_sub_category", f"sub_category '{sub_cat}' di luar daftar kanonik {seg}.")
            )

        # AI artifact check
        for field_name, txt in [("soal", q["content"]), ("pembahasan", q["discussion"])]:
            for msg in check_ai_artifacts(txt):
                summary.errors.append(Issue("ERROR", num, "ai_artifact", f"[{field_name}] {msg}"))

        # Options completeness & uniqueness
        labels = [o["label"] for o in opts]
        if sorted(labels) != LETTERS:
            summary.errors.append(Issue("ERROR", num, "invalid_option_labels", f"Opsi A–E harus lengkap dan unik; ditemukan {labels}."))
        else:
            norm_opts = []
            for o in opts:
                if not o["content"] and not o["image_url"]:
                    summary.errors.append(Issue("ERROR", num, "empty_option", f"Opsi {o['label']} kosong (tanpa teks maupun gambar)."))
                if o["content"]:
                    norm_opts.append((o["label"], re.sub(r"\s+", " ", o["content"].strip())))
            text_counter = Counter(t for _, t in norm_opts)
            for dup_txt, cnt in text_counter.items():
                if cnt > 1:
                    dup_labels = [lbl for lbl, t in norm_opts if t == dup_txt]
                    summary.errors.append(Issue("ERROR", num, "duplicate_option", f"Opsi {' & '.join(dup_labels)} memiliki teks identik."))

            # Score integrity
            scores = sorted(o["score"] for o in opts)
            score_map = {o["label"]: o["score"] for o in opts}
            if seg in ("TWK", "TIU") and scores != [0, 0, 0, 0, 5]:
                summary.errors.append(Issue("ERROR", num, "invalid_score", f"Bobot {seg} harus tepat [0,0,0,0,5]; ditemukan {scores}."))
            elif seg == "TKP" and scores != [1, 2, 3, 4, 5]:
                summary.errors.append(Issue("ERROR", num, "invalid_tkp_score", f"Bobot TKP harus 5 nilai unik [1,2,3,4,5]; ditemukan {scores}."))

            # Key tracking & discussion alignment
            max_score = max((o["score"] for o in opts), default=0)
            best_opts = [o for o in opts if o["score"] == max_score]
            if len(best_opts) == 1 and max_score == 5:
                best_letter = best_opts[0]["label"]
                if seg in key_by_seg and not fig:
                    key_by_seg[seg].append(best_letter)

                claimed = extract_claimed_key(q["discussion"])
                if claimed and claimed != best_letter:
                    summary.errors.append(
                        Issue("ERROR", num, "discussion_key_mismatch", f"Pembahasan menyebut kunci '{claimed}', tetapi skor 5 ada di opsi '{best_letter}'.")
                    )
                elif not claimed:
                    hint = (
                        f"Jawaban dengan skor tertinggi adalah Opsi {best_letter} (5 poin)."
                        if seg == "TKP"
                        else f"Jawaban yang benar adalah Opsi {best_letter}."
                    )
                    summary.warnings.append(
                        Issue("WARNING", num, "discussion_key_unexplicit", f"Pembahasan tidak menyebut kunci '{best_letter}' secara eksplisit (disarankan mulai dengan '{hint}').")
                    )

                # TKP full 5-score breakdown consistency check (e.g. Opsi B=5, Opsi A=4, ...)
                if seg == "TKP":
                    claimed_scores = extract_tkp_claimed_scores(q["discussion"])
                    if claimed_scores:
                        bad_pairs = [
                            f"{ltr}: pembahasan={sc} vs bobot={score_map[ltr]}"
                            for ltr, sc in sorted(claimed_scores.items())
                            if score_map.get(ltr) != sc
                        ]
                        if bad_pairs:
                            summary.errors.append(
                                Issue("ERROR", num, "tkp_discussion_score_mismatch", f"Rincian bobot TKP di pembahasan tidak cocok dengan tabel skor ({'; '.join(bad_pairs)}).")
                            )

                # Length bias check (non-figural)
                if not fig:
                    non_figural_count += 1
                    wc_map = {o["label"]: word_count(o["content"]) for o in opts}
                    best_wc = wc_map[best_letter]
                    other_wcs = [w for lbl, w in wc_map.items() if lbl != best_letter]
                    if other_wcs and best_wc > max(other_wcs):
                        longest_correct_hits += 1
                    if seg == "TKP" and other_wcs:
                        avg_other = sum(other_wcs) / len(other_wcs)
                        if best_wc - avg_other > 7:
                            summary.warnings.append(
                                Issue("WARNING", num, "tkp_length_bias", f"Opsi skor 5 ({best_wc} kata) jauh lebih panjang dari rata-rata 4 opsi lain ({avg_other:.1f} kata).")
                            )

        # LaTeX check on content, options, discussion
        for field_name, txt in [
            ("soal", q["content"]),
            ("pembahasan", q["discussion"]),
            *[(f"opsi {o['label']}", o["content"]) for o in opts],
        ]:
            l_errs, l_warns = check_latex(txt)
            for prob in l_errs:
                summary.errors.append(Issue("ERROR", num, "latex_syntax", f"[{field_name}] {prob}"))
            for wprob in l_warns:
                summary.warnings.append(Issue("WARNING", num, "latex_rupiah", f"[{field_name}] {wprob}"))

        # Figural image check
        if fig:
            has_any_img = bool(q["image_url"]) or any(o.get("image_url") for o in opts)
            if not has_any_img:
                summary.errors.append(Issue("ERROR", num, "figural_missing_image", "Soal Figural wajib memiliki image_url soal atau gambar opsi."))
            if q["image_url"] and "127.0.0.1" in q["image_url"]:
                summary.warnings.append(Issue("WARNING", num, "local_image_url", "image_url masih menunjuk ke 127.0.0.1 (ganti ke URL Supabase exam-assets sebelum produksi)."))

        # Originality vs reference corpus (all Packet 1..N)
        if not fig and ref_indexed:
            q_blob = q["content"] + " " + " ".join(o["content"] for o in opts)
            q_toks = tokenize(q_blob)
            q_set = set(q_toks)
            q_ng = ngrams(q_toks, 3)
            q_nums = re.findall(r"-?\d+(?:[.,]\d+)?", q["content"])

            best_sim = 0.0
            best_ref_id = ""
            best_ref_nums: list[str] = []
            exact_seq_ref = ""

            for ref_label, ref_q, ref_set, ref_ng, ref_nums in ref_indexed:
                if ref_q["segment"] != seg:
                    continue
                # Catch verbatim copied number sequences (e.g. Deret Angka) even if stem has < 5 word tokens
                if seg == "TIU" and len(q_nums) >= 5 and q_nums == ref_nums and not exact_seq_ref:
                    exact_seq_ref = f"{ref_label}#{ref_q['number']}"
                if len(q_toks) < 5 or len(ref_set) < 5:
                    continue
                j_w = len(q_set & ref_set) / max(1, len(q_set | ref_set))
                j_3 = len(q_ng & ref_ng) / max(1, len(q_ng | ref_ng))
                sim = round(0.55 * j_w + 0.45 * j_3, 4)
                if sim > best_sim:
                    best_sim = sim
                    best_ref_id = f"{ref_label}#{ref_q['number']}"
                    best_ref_nums = ref_nums

            if best_sim > summary.max_ref_similarity:
                summary.max_ref_similarity = best_sim

            seg_limit = tiu_similarity_threshold if seg == "TIU" else similarity_threshold
            if exact_seq_ref:
                summary.errors.append(
                    Issue("ERROR", num, "unchanged_tiu_numbers", f"Urutan angka soal TIU identik dengan {exact_seq_ref} ({q_nums[:6]}); ubah angka serta hitung ulang jawabannya.")
                )
            elif best_sim >= seg_limit:
                summary.errors.append(
                    Issue("ERROR", num, "high_reference_similarity", f"Kemiripan terlalu tinggi ({best_sim*100:.1f}%) dengan soal referensi {best_ref_id} (batas {seg} < {seg_limit*100:.0f}%).")
                )
            elif seg == "TIU" and best_sim >= 0.65 and q_nums and q_nums == best_ref_nums:
                summary.errors.append(
                    Issue("ERROR", num, "unchanged_tiu_numbers", f"Soal TIU mirip {best_ref_id} ({best_sim*100:.1f}%) dan angka-angkanya masih identik ({q_nums}); ubah angka serta hitung ulang jawabannya.")
                )

    # Internal duplicate / near-duplicate check
    non_fig_qs = [q for q in questions if not is_figural(q)]
    for i in range(len(non_fig_qs)):
        blob_i = non_fig_qs[i]["content"]
        for j in range(i + 1, len(non_fig_qs)):
            sim = text_similarity(blob_i, non_fig_qs[j]["content"])
            if sim > summary.max_internal_similarity:
                summary.max_internal_similarity = sim
            if sim >= internal_similarity_threshold:
                summary.errors.append(
                    Issue(
                        "ERROR",
                        non_fig_qs[j]["number"],
                        "internal_duplicate",
                        f"Soal #{non_fig_qs[j]['number']} terlalu mirip ({sim*100:.1f}%) dengan soal #{non_fig_qs[i]['number']} di paket yang sama.",
                    )
                )

    # Global length bias ratio + TKP structural comma & char-length bias audit
    if non_figural_count > 0:
        summary.longest_correct_ratio = round(longest_correct_hits / non_figural_count, 4)
        if non_figural_count >= 10 and summary.longest_correct_ratio > 0.35:
            summary.warnings.append(
                Issue(
                    "WARNING",
                    None,
                    "option_length_bias",
                    f"Opsi skor tertinggi adalah opsi terpanjang pada {summary.longest_correct_ratio*100:.1f}% soal ({longest_correct_hits}/{non_figural_count}; target <= 35%).",
                )
            )

    tkp_qs = [q for q in questions if q["segment"] == "TKP" and len(q["options"]) == 5]
    if len(tkp_qs) >= 10:
        tkp_char_longest = 0
        tkp_comma_strict_max = 0
        comma_heuristic_expected = 0.0
        for q in tkp_qs:
            opts = q["options"]
            best = max(opts, key=lambda o: o["score"])
            others = [o for o in opts if o is not best]
            if len(best["content"]) > max(len(o["content"]) for o in others):
                tkp_char_longest += 1
            comma_counts = [(o["content"].count(","), o["score"], o is best) for o in opts]
            max_c = max(c for c, _, _ in comma_counts)
            top_c_items = [item for item in comma_counts if item[0] == max_c]
            comma_heuristic_expected += sum(item[1] for item in top_c_items) / len(top_c_items)
            if len(top_c_items) == 1 and top_c_items[0][2]:
                tkp_comma_strict_max += 1
        char_ratio = tkp_char_longest / len(tkp_qs)
        comma_ratio = tkp_comma_strict_max / len(tkp_qs)
        scaled_score = comma_heuristic_expected * (45.0 / len(tkp_qs))
        if char_ratio > 0.35:
            summary.warnings.append(
                Issue(
                    "WARNING",
                    None,
                    "tkp_char_length_bias",
                    f"Opsi skor 5 TKP paling panjang secara karakter pada {char_ratio*100:.1f}% soal ({tkp_char_longest}/{len(tkp_qs)}; target <= 35%).",
                )
            )
        if comma_ratio > 0.35 or scaled_score >= 166.0:
            summary.warnings.append(
                Issue(
                    "WARNING",
                    None,
                    "tkp_comma_bias",
                    f"Kebocoran sinyal koma/3-aksi paralel pada TKP: skor 5 memiliki koma terbanyak pada {comma_ratio*100:.1f}% soal (heuristik buta koma = {scaled_score:.1f}/225; target < 166 & rasio <= 35%).",
                )
            )

    # Key distribution & consecutive streaks
    for seg, keys in key_by_seg.items():
        if not keys:
            continue
        dist = {ltr: keys.count(ltr) for ltr in LETTERS}
        summary.key_distribution[seg] = dist
        if not partial and len(keys) >= 20:
            max_streak = 1
            cur = 1
            for idx in range(1, len(keys)):
                if keys[idx] == keys[idx - 1]:
                    cur += 1
                    max_streak = max(max_streak, cur)
                else:
                    cur = 1
            if max_streak >= 4:
                summary.warnings.append(Issue("WARNING", None, "key_streak", f"Segmen {seg} memiliki {max_streak} kunci huruf sama berturut-turut (jalankan --shuffle)."))
            spread = max(dist.values()) - min(dist.values())
            if spread > 5:
                summary.warnings.append(Issue("WARNING", None, "key_imbalance", f"Distribusi kunci {seg} kurang seimbang: {dist} (jalankan --shuffle)."))

    return summary


def to_dataframe(questions: list[dict[str, Any]]) -> pd.DataFrame:
    has_opt_images = any(o.get("image_url") for q in questions for o in q["options"])
    rows = []
    for q in sorted(questions, key=lambda x: x["number"]):
        opt_by_lbl = {o["label"]: o for o in q["options"]}
        row: dict[str, Any] = {
            "number": q["number"],
            "segment": q["segment"],
            "content": q["content"],
            "image_url": q["image_url"] or "",
            "discussion": q["discussion"],
            "sub_category": q["sub_category"],
        }
        for lbl in LETTERS:
            o = opt_by_lbl.get(lbl, {"content": "", "score": 0, "image_url": None})
            low = lbl.lower()
            row[f"option_{low}"] = o["content"]
            row[f"score_{low}"] = o["score"]
            if has_opt_images:
                row[f"option_image_{low}"] = o.get("image_url") or ""
        rows.append(row)
    return pd.DataFrame(rows)


def shuffle_pack_in_memory(
    questions: list[dict[str, Any]],
    max_attempts: int = 500,
    seed: int = 42,
) -> list[dict[str, Any]]:
    """Use scripts/shuffle_answers.py balanced 500-attempt shuffler with two-pass discussion remap."""
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import shuffle_answers as shuf  # type: ignore

    df = to_dataframe(questions)
    best_df = shuf.shuffle_dataframe(df, max_attempts=max_attempts, seed=seed)

    id_by_num = {q["number"]: q["id"] for q in questions}
    out = []
    for _, row in best_df.iterrows():
        opts = []
        for lbl in LETTERS:
            low = lbl.lower()
            opts.append(
                {
                    "label": lbl,
                    "content": str(row.get(f"option_{low}", "")),
                    "score": int(float(row.get(f"score_{low}", 0) or 0)),
                    "image_url": str(row.get(f"option_image_{low}", "")).strip() or None,
                }
            )
        num = int(row["number"])
        out.append(
            {
                "id": id_by_num.get(num, f"q-{num:03d}"),
                "number": num,
                "segment": str(row["segment"]),
                "sub_category": str(row.get("sub_category", "")),
                "content": str(row["content"]),
                "image_url": str(row.get("image_url", "")).strip() or None,
                "discussion": str(row["discussion"]),
                "options": opts,
            }
        )
    return out


def shuffle_tkp_question_order(questions: list[dict[str, Any]], seed: int = 42) -> list[dict[str, Any]]:
    """
    Interleave TKP question order (#66-110) so topics are mixed like authentic BKN CAT
    (avoiding consecutive topic clumping), while preserving TWK (#1-30) and TIU (#31-65).
    """
    non_tkp = [q for q in questions if q["segment"] != "TKP"]
    tkp = [q for q in questions if q["segment"] == "TKP"]
    if len(tkp) < 6:
        return questions

    tkp_numbers = sorted(q["number"] for q in tkp)
    rng = random.Random(seed)
    best_order = list(tkp)
    best_adjacent = len(tkp)

    for _ in range(300):
        cand = list(tkp)
        rng.shuffle(cand)
        adj = sum(
            1 for i in range(1, len(cand))
            if (cand[i].get("sub_category") or "") == (cand[i - 1].get("sub_category") or "")
        )
        if adj < best_adjacent:
            best_adjacent = adj
            best_order = cand
            if adj == 0:
                break

    reordered_tkp = []
    for new_num, q in zip(tkp_numbers, best_order):
        q_copy = dict(q)
        q_copy["number"] = new_num
        reordered_tkp.append(q_copy)

    return sorted(non_tkp + reordered_tkp, key=lambda x: x["number"])


def render_markdown_report(source: Path, summary: ValidationSummary) -> str:
    status = "LULUS (0 ERROR)" if not summary.errors else f"GAGAL ({len(summary.errors)} ERROR)"
    ref_label = f"{summary.ref_pack_count} paket referensi (Packet 1–{summary.ref_pack_count})" if summary.ref_pack_count else "tanpa referensi"
    lines = [
        f"# Audit Quality Gate — `{source.name}`",
        "",
        f"- **Status:** **{status}**",
        f"- **Total Soal:** `{summary.total_questions}` ({summary.segment_counts})",
        f"- **Rasio Opsi Kunci Terpanjang:** `{summary.longest_correct_ratio*100:.1f}%` *(target `<= 35%`)*",
        f"- **Kemiripan Maksimum vs {ref_label}:** `{summary.max_ref_similarity*100:.1f}%` *(batas TWK/TKP `< 50%`, TIU `< 85%`)*",
        f"- **Kemiripan Maksimum Internal:** `{summary.max_internal_similarity*100:.1f}%` *(batas `< 55%`)*",
        "",
        "## Distribusi Kunci Jawaban (Non-Figural)",
        "",
        "| Segmen | A | B | C | D | E |",
        "| :--- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for seg in ("TWK", "TIU", "TKP"):
        d = summary.key_distribution.get(seg)
        if d:
            lines.append(f"| {seg} | {d['A']} | {d['B']} | {d['C']} | {d['D']} | {d['E']} |")

    lines.append("")
    lines.append(f"## Hard Errors ({len(summary.errors)})")
    if not summary.errors:
        lines.append("- Tidak ada error keras.")
    else:
        for e in summary.errors:
            prefix = f"Soal #{e.number}" if e.number is not None else "Paket"
            lines.append(f"- **[{e.code}]** {prefix}: {e.message}")

    lines.append("")
    lines.append(f"## Warnings ({len(summary.warnings)})")
    if not summary.warnings:
        lines.append("- Tidak ada peringatan.")
    else:
        for w in summary.warnings:
            prefix = f"Soal #{w.number}" if w.number is not None else "Paket"
            lines.append(f"- **[{w.code}]** {prefix}: {w.message}")
    lines.append("")
    return "\n".join(lines)


def _strip_answers(q: dict[str, Any]) -> dict[str, Any]:
    return {
        "number": q["number"],
        "segment": q["segment"],
        "sub_category": q["sub_category"],
        "content": q["content"],
        "image_url": q["image_url"],
        "options": [
            {
                "label": o["label"],
                "content": o["content"],
                "image_url": o.get("image_url"),
            }
            for o in q["options"]
        ],
    }


def _extract_key_entry(q: dict[str, Any]) -> dict[str, Any]:
    best = [o["label"] for o in q["options"] if o["score"] == 5]
    return {
        "number": q["number"],
        "sub_category": q["sub_category"],
        "answer_key": best[0] if len(best) == 1 else best,
        "discussion": q["discussion"],
    }


def export_blind_audit_bundles(questions: list[dict[str, Any]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    twk = [q for q in questions if q["segment"] == "TWK"]
    tiu_nonfig = [q for q in questions if q["segment"] == "TIU" and not is_figural(q)]
    tiu_fig = [q for q in questions if q["segment"] == "TIU" and is_figural(q)]
    tkp = [q for q in questions if q["segment"] == "TKP"]

    bundles = {
        "audit_01_twk.json": twk,
        "audit_02_tiu_blind.json": [_strip_answers(q) for q in tiu_nonfig],
        "audit_02_tiu_key.json": [_extract_key_entry(q) for q in tiu_nonfig],
        "audit_03_figural_blind.json": [_strip_answers(q) for q in tiu_fig],
        "audit_03_figural_key.json": [_extract_key_entry(q) for q in tiu_fig],
        "audit_04_tkp.json": tkp,
    }
    for fname, payload in bundles.items():
        (out_dir / fname).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="TOCPNS Question Pack Quality Gate & Exporter")
    parser.add_argument("input_file", help="Path ke file JSON, CSV, atau XLSX paket soal.")
    parser.add_argument("--partial", action="store_true", help="Mode batch parsial (tidak wajib 110 soal penuh).")
    parser.add_argument("--no-ref", action="store_true", help="Lewati cek kemiripan terhadap seluruh paket referensi.")
    parser.add_argument("--similarity-threshold", type=float, default=0.50, help="Ambang batas kemiripan TWK/TKP terhadap referensi (default 0.50; TIU otomatis < 0.85).")
    parser.add_argument("--shuffle", action="store_true", help="Acak posisi opsi A-E non-figural secara seimbang (500x) & remap pembahasan.")
    parser.add_argument("--shuffle-tkp-order", action="store_true", help="Acak urutan nomor soal TKP (#66-110) agar tidak berkelompok per aspek.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed deterministik untuk --shuffle dan --shuffle-tkp-order.")
    parser.add_argument("--export-json", help="Opsional: path keluaran JSON final setelah shuffle.")
    parser.add_argument("--export-csv", help="Path keluaran CSV siap import TOCPNS.")
    parser.add_argument("--export-xlsx", help="Path keluaran XLSX siap import TOCPNS (sheet 'Impor').")
    parser.add_argument("--report", help="Path keluaran laporan audit Markdown.")
    parser.add_argument("--export-blind-audit", help="Direktori keluaran 6 berkas JSON untuk Review Silang Beda Model.")
    args = parser.parse_args()

    source = Path(args.input_file)
    if not source.exists():
        print(f"[ERROR] File tidak ditemukan: {source}", file=sys.stderr)
        return 2

    questions = load_questions(source)

    ref_questions: list[tuple[str, dict[str, Any]]] = []
    ref_pack_count = 0
    if not args.no_ref:
        resolved_source = source.resolve()
        for ref_path in discover_default_references():
            if ref_path.exists() and ref_path.resolve() != resolved_source:
                # Use folder name like 'Packet 10' for readable error messages
                pkt_label = next((p for p in ref_path.parts if p.lower().startswith("packet ")), ref_path.parent.name)
                ref_pack_count += 1
                for rq in load_questions(ref_path):
                    ref_questions.append((pkt_label, rq))

    if args.shuffle_tkp_order:
        questions = shuffle_tkp_question_order(questions, seed=args.seed)

    if args.shuffle:
        questions = shuffle_pack_in_memory(questions, seed=args.seed)

    summary = validate_pack(
        questions,
        partial=args.partial,
        reference_questions=ref_questions,
        ref_pack_count=ref_pack_count,
        similarity_threshold=args.similarity_threshold,
    )

    print(f"=== TOCPNS Quality Gate: {source.name} ===")
    print(f"Total soal      : {summary.total_questions} {summary.segment_counts}")
    print(f"Distribusi kunci: {summary.key_distribution}")
    print(f"Opsi kunci terpanjang: {summary.longest_correct_ratio*100:.1f}% (target <= 35%)")
    print(f"Max similarity vs {ref_pack_count} paket ref: {summary.max_ref_similarity*100:.1f}% (batas TWK/TKP < {args.similarity_threshold*100:.0f}%, TIU < 85%)")
    print(f"Max similarity internal        : {summary.max_internal_similarity*100:.1f}% (batas < 55%)")
    print(f"Hard Errors: {len(summary.errors)} | Warnings: {len(summary.warnings)}")

    for issue in summary.errors[:25]:
        prefix = f"#{issue.number}" if issue.number is not None else "PACK"
        print(f"  [ERROR:{issue.code}] {prefix} - {issue.message}")
    if len(summary.errors) > 25:
        print(f"  ... dan {len(summary.errors) - 25} error lainnya.")

    for issue in summary.warnings[:15]:
        prefix = f"#{issue.number}" if issue.number is not None else "PACK"
        print(f"  [WARN:{issue.code}]  {prefix} - {issue.message}")
    if len(summary.warnings) > 15:
        print(f"  ... dan {len(summary.warnings) - 15} warning lainnya.")

    if args.report:
        rp = Path(args.report)
        rp.parent.mkdir(parents=True, exist_ok=True)
        rp.write_text(render_markdown_report(source, summary), encoding="utf-8")
        print(f"Laporan audit disimpan ke: {rp}")

    if args.export_blind_audit:
        audit_dir = Path(args.export_blind_audit)
        export_blind_audit_bundles(questions, audit_dir)
        print(f"Paket Review Silang Beda Model (6 berkas) disimpan ke: {audit_dir}")

    if args.export_json:
        jp = Path(args.export_json)
        jp.parent.mkdir(parents=True, exist_ok=True)
        jp.write_text(json.dumps({"questions": questions}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Ekspor JSON: {jp}")

    if args.export_csv or args.export_xlsx:
        df = to_dataframe(questions)
        if args.export_csv:
            cp = Path(args.export_csv)
            cp.parent.mkdir(parents=True, exist_ok=True)
            df.to_csv(cp, index=False, encoding="utf-8-sig")
            print(f"Ekspor CSV: {cp}")
        if args.export_xlsx:
            xp = Path(args.export_xlsx)
            xp.parent.mkdir(parents=True, exist_ok=True)
            with pd.ExcelWriter(xp, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="Impor", index=False)
            print(f"Ekspor XLSX (sheet 'Impor'): {xp}")

    return 0 if not summary.errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
