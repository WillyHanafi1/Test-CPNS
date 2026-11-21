"""
validate_question_pack.py — Deterministic Quality Gate, Shuffler, & Exporter for TOCPNS Question Packs.

Memvalidasi paket soal offline (JSON / CSV / XLSX) sebelum diimpor ke TOCPNS:
1. Struktur BKN (110 soal: 30 TWK, 35 TIU, 45 TKP, nomor kontinu 1..110) — atau mode --partial untuk batch kecil.
2. Integritas opsi (5 opsi A-E lengkap, tidak ada opsi kosong kecuali figural bergambar, tidak ada 2 opsi identik).
3. Integritas bobot skor (TWK/TIU: tepat [0,0,0,0,5]; TKP: tepat 5 bobot unik [1,2,3,4,5]).
4. Konsistensi pembahasan <-> kunci jawaban (menyebut huruf kunci tertinggi secara eksplisit & bebas kontradiksi).
5. Kebersihan LaTeX ($ berpasangan, deteksi notasi mentah x^2 atau akar() di luar $...$).
6. Audit bias panjang opsi (opsi benar/skor 5 tidak boleh terlalu sering jadi opsi terpanjang).
7. Audit anti-plagiarisme / kemiripan teks terhadap Packet 1 (vol17) & Packet 2 (vol18) serta duplikasi internal.
8. Audit gambar figural (image_url wajib terisi, peringatan jika masih memakai 127.0.0.1).
9. Opsional: --shuffle (mengacak kunci A-E non-figural + two-pass discussion remap via shuffle_answers.py),
   --export-csv, --export-xlsx, dan --report (Markdown audit report).

Penggunaan:
    python scripts/validate_question_pack.py data/generated/vol19/batches/twk_01_06.json --partial
    python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json
    python scripts/validate_question_pack.py data/generated/vol19/vol19-bank-soal.json --shuffle --export-xlsx data/generated/vol19/vol19-impor-final.xlsx --report data/generated/vol19/audit-report.md
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REFERENCES = [
    REPO_ROOT / "data" / "Packet 1" / "outputs" / "packet1-vol17" / "vol17-bank-soal.json",
    REPO_ROOT / "data" / "Packet 2" / "outputs" / "packet2-vol18" / "vol18-bank-soal.json",
]

LETTERS = ["A", "B", "C", "D", "E"]
REQUIRED_SEGMENTS = {"TWK": 30, "TIU": 35, "TKP": 45}
FIGURAL_HINTS = ("figural", "analogi gambar", "serial gambar", "ketidaksamaan gambar")

STOPWORDS_ID = {
    "yang", "dan", "di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "atau",
    "adalah", "itu", "ini", "sebagai", "oleh", "tersebut", "akan", "dapat", "tidak",
    "jika", "agar", "secara", "lebih", "paling", "karena", "namun", "tetapi", "seorang",
    "anda", "sebagai", "saat", "ketika", "suatu", "hari", "bahwa", "berikut", "manakah",
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
    errors: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)


def normalize_text(text: str) -> str:
    # Keep math expressions inside $...$ as tokens so distinct formulas do not collide
    cleaned = (text or "").lower()
    cleaned = re.sub(r"\\[a-z]+", " ", cleaned)  # strip latex commands like \frac, \begin
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
    # Weighted blend emphasizes shared multi-word phrasing while catching heavy paraphrases
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


def check_latex(text: str) -> list[str]:
    problems: list[str] = []
    if not text:
        return problems
    # Strip escaped \$ before counting delimiters
    cleaned = text.replace(r"\$", "")
    # Remove block $$...$$ first
    block_count = len(re.findall(r"\$\$", cleaned))
    if block_count % 2 != 0:
        problems.append("Tanda block LaTeX $$ tidak berpasangan.")
    no_block = re.sub(r"\$\$.*?\$\$", " ", cleaned, flags=re.DOTALL)
    inline_count = no_block.count("$")
    if inline_count % 2 != 0:
        problems.append("Tanda inline LaTeX $ tidak berpasangan.")
    outside_math = re.sub(r"\$.*?\$", " ", no_block, flags=re.DOTALL)
    if re.search(r"\b[a-zA-Z0-9]+\^[0-9a-zA-Z(]", outside_math):
        problems.append("Terdeteksi pangkat mentah (mis. x^2) di luar $...$.")
    if re.search(r"\bakar\s*\(", outside_math, flags=re.IGNORECASE):
        problems.append("Terdeteksi notasi akar(...) mentah di luar $...$ (gunakan $\\sqrt{...}$).")
    return problems


def extract_claimed_key(discussion: str) -> str | None:
    if not discussion:
        return None
    patterns = [
        r"(?:jawaban|opsi|pilihan|kunci)\s+(?:yang\s+)?(?:paling\s+)?(?:benar|tepat|terbaik|tertinggi|sah|utama)(?:\s*\(\s*5\s*\))?\s*(?:adalah|yaitu|:)\s*(?:opsi|pilihan)?\s*\(?([A-E])\)?\b",
        r"(?:jawaban|kunci)\s*(?:dengan\s+skor\s+tertinggi\s*\(5\)\s*)?(?:adalah|:)\s*(?:opsi\s*)?\(?([A-E])\)?\b",
        r"^\s*(?:opsi|pilihan|jawaban)\s*\(?([A-E])\)?\s*(?:benar|tepat|bernilai\s*5)",
    ]
    for pat in patterns:
        m = re.search(pat, discussion, flags=re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return None


def validate_pack(
    questions: list[dict[str, Any]],
    *,
    partial: bool = False,
    reference_questions: list[tuple[str, dict[str, Any]]] | None = None,
    similarity_threshold: float = 0.35,
    internal_similarity_threshold: float = 0.55,
) -> ValidationSummary:
    summary = ValidationSummary(total_questions=len(questions))
    ref_list = reference_questions or []

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
        if not q["sub_category"]:
            summary.warnings.append(Issue("WARNING", num, "missing_sub_category", "sub_category kosong (diperlukan untuk Topic Mastery Analytics)."))

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
                    # Preserve capitalization so EYD huruf kapital questions are not falsely flagged
                    norm_opts.append((o["label"], re.sub(r"\s+", " ", o["content"].strip())))
            text_counter = Counter(t for _, t in norm_opts)
            for dup_txt, cnt in text_counter.items():
                if cnt > 1:
                    dup_labels = [lbl for lbl, t in norm_opts if t == dup_txt]
                    summary.errors.append(Issue("ERROR", num, "duplicate_option", f"Opsi {' & '.join(dup_labels)} memiliki teks identik."))

            # Score integrity
            scores = sorted(o["score"] for o in opts)
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
                    summary.warnings.append(
                        Issue("WARNING", num, "discussion_key_unexplicit", f"Pembahasan tidak menyebut kunci '{best_letter}' secara eksplisit (disarankan mulai dengan 'Jawaban yang benar adalah {best_letter}.').")
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
            for prob in check_latex(txt):
                summary.errors.append(Issue("ERROR", num, "latex_syntax", f"[{field_name}] {prob}"))

        # Figural image check
        if fig:
            has_any_img = bool(q["image_url"]) or any(o.get("image_url") for o in opts)
            if not has_any_img:
                summary.errors.append(Issue("ERROR", num, "figural_missing_image", "Soal Figural wajib memiliki image_url soal atau gambar opsi."))
            if q["image_url"] and "127.0.0.1" in q["image_url"]:
                summary.warnings.append(Issue("WARNING", num, "local_image_url", "image_url masih menunjuk ke 127.0.0.1 (ganti ke URL Supabase exam-assets sebelum produksi)."))

        # Originality vs reference corpus (Packet 1 & Packet 2)
        if not fig and ref_list:
            q_blob = q["content"] + " " + " ".join(o["content"] for o in opts)
            best_sim = 0.0
            best_ref_id = ""
            for ref_label, ref_q in ref_list:
                ref_blob = ref_q["content"] + " " + " ".join(o["content"] for o in ref_q["options"])
                sim = text_similarity(q_blob, ref_blob)
                if sim > best_sim:
                    best_sim = sim
                    best_ref_id = f"{ref_label}#{ref_q['number']}"
            if best_sim > summary.max_ref_similarity:
                summary.max_ref_similarity = best_sim
            if best_sim >= similarity_threshold:
                summary.errors.append(
                    Issue("ERROR", num, "high_reference_similarity", f"Kemiripan terlalu tinggi ({best_sim*100:.1f}%) dengan soal referensi {best_ref_id} (batas < {similarity_threshold*100:.0f}%).")
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

    # Global length bias ratio
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


def shuffle_pack_in_memory(questions: list[dict[str, Any]], max_attempts: int = 500) -> list[dict[str, Any]]:
    """Use scripts/shuffle_answers.py two-pass remapper for balanced, cycle-free key distribution."""
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import shuffle_answers as shuf  # type: ignore

    df = to_dataframe(questions)
    # Capture original score integrity
    best_df = shuf.shuffle_dataframe(df, max_attempts=max_attempts) if hasattr(shuf, "shuffle_dataframe") else None
    if best_df is None:
        # Fallback clean balanced shuffle using shuf.remap_discussion
        import random

        rng = random.Random(42)
        shuffled_qs = []
        for q in sorted(questions, key=lambda x: x["number"]):
            q_copy = json.loads(json.dumps(q))
            if is_figural(q_copy):
                shuffled_qs.append(q_copy)
                continue
            old_opts = sorted(q_copy["options"], key=lambda o: o["label"])
            perm = list(range(5))
            rng.shuffle(perm)
            letter_map = {}
            new_opts = []
            for new_idx, old_idx in enumerate(perm):
                old_lbl = LETTERS[old_idx]
                new_lbl = LETTERS[new_idx]
                letter_map[old_lbl] = new_lbl
                opt = dict(old_opts[old_idx])
                opt["label"] = new_lbl
                new_opts.append(opt)
            q_copy["options"] = new_opts
            q_copy["discussion"] = shuf.remap_discussion(q_copy["discussion"], letter_map)
            shuffled_qs.append(q_copy)
        return shuffled_qs

    # Re-parse dataframe back into normalized question list
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
        out.append(
            {
                "id": f"q-{int(row['number']):03d}",
                "number": int(row["number"]),
                "segment": str(row["segment"]),
                "sub_category": str(row.get("sub_category", "")),
                "content": str(row["content"]),
                "image_url": str(row.get("image_url", "")).strip() or None,
                "discussion": str(row["discussion"]),
                "options": opts,
            }
        )
    return out


def render_markdown_report(source: Path, summary: ValidationSummary) -> str:
    status = "LULUS (0 ERROR)" if not summary.errors else f"GAGAL ({len(summary.errors)} ERROR)"
    lines = [
        f"# Audit Quality Gate — `{source.name}`",
        "",
        f"- **Status:** **{status}**",
        f"- **Total Soal:** `{summary.total_questions}` ({summary.segment_counts})",
        f"- **Rasio Opsi Kunci Terpanjang:** `{summary.longest_correct_ratio*100:.1f}%` *(target `<= 35%`)*",
        f"- **Kemiripan Maksimum vs Referensi (Packet 1 & 2):** `{summary.max_ref_similarity*100:.1f}%` *(batas `< 35%`)*",
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


def main() -> int:
    parser = argparse.ArgumentParser(description="TOCPNS Question Pack Quality Gate & Exporter")
    parser.add_argument("input_file", help="Path ke file JSON, CSV, atau XLSX paket soal.")
    parser.add_argument("--partial", action="store_true", help="Mode batch parsial (tidak wajib 110 soal penuh).")
    parser.add_argument("--no-ref", action="store_true", help="Lewati cek kemiripan terhadap Packet 1 & 2.")
    parser.add_argument("--similarity-threshold", type=float, default=0.35, help="Ambang batas kemiripan referensi (default 0.35).")
    parser.add_argument("--shuffle", action="store_true", help="Acak posisi opsi non-figural & remap pembahasan sebelum ekspor.")
    parser.add_argument("--export-csv", help="Path keluaran CSV siap import TOCPNS.")
    parser.add_argument("--export-xlsx", help="Path keluaran XLSX siap import TOCPNS.")
    parser.add_argument("--report", help="Path keluaran laporan audit Markdown.")
    args = parser.parse_args()

    source = Path(args.input_file)
    if not source.exists():
        print(f"[ERROR] File tidak ditemukan: {source}", file=sys.stderr)
        return 2

    questions = load_questions(source)

    ref_questions: list[tuple[str, dict[str, Any]]] = []
    if not args.no_ref:
        resolved_source = source.resolve()
        for ref_path in DEFAULT_REFERENCES:
            if ref_path.exists() and ref_path.resolve() != resolved_source:
                label = ref_path.parent.name
                for rq in load_questions(ref_path):
                    ref_questions.append((label, rq))

    if args.shuffle:
        questions = shuffle_pack_in_memory(questions)

    summary = validate_pack(
        questions,
        partial=args.partial,
        reference_questions=ref_questions,
        similarity_threshold=args.similarity_threshold,
    )

    print(f"=== TOCPNS Quality Gate: {source.name} ===")
    print(f"Total soal      : {summary.total_questions} {summary.segment_counts}")
    print(f"Distribusi kunci: {summary.key_distribution}")
    print(f"Opsi kunci terpanjang: {summary.longest_correct_ratio*100:.1f}% (target <= 35%)")
    print(f"Max similarity vs Packet 1 & 2: {summary.max_ref_similarity*100:.1f}% (batas < {args.similarity_threshold*100:.0f}%)")
    print(f"Max similarity internal       : {summary.max_internal_similarity*100:.1f}% (batas < 55%)")
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
            df.to_excel(xp, index=False)
            print(f"Ekspor XLSX: {xp}")

    return 0 if not summary.errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
