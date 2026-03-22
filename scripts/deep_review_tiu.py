"""
deep_review_tiu.py
Deep analysis of TIU rows in all 4 Latihan CSVs.
Checks: null/empty fields, score validity, image URL presence,
discussion length, content formatting issues.
"""
import csv
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

CSV_FILES = {
    "Latihan3": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan3 - 80.csv"),
    "Latihan4": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan4 - 70.csv"),
    "Latihan5": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan5 - 90.csv"),
    "Latihan6": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan6 - 100.csv"),
}

REQUIRED_FIELDS = ["number", "segment", "sub_category", "content",
                   "option_a", "option_b", "option_c", "option_d", "option_e",
                   "score_a", "score_b", "score_c", "score_d", "score_e",
                   "discussion"]

SCORE_FIELDS = ["score_a", "score_b", "score_c", "score_d", "score_e"]

issues = []

def flag(file, row_no, field, issue):
    issues.append({"file": file, "no": row_no, "field": field, "issue": issue})

for name, path in CSV_FILES.items():
    with open(path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    tiu_rows = [r for r in rows if r.get("segment", "").strip().upper() == "TIU"]
    print(f"\n{'='*60}")
    print(f"  {name} — {len(tiu_rows)} TIU rows")
    print(f"{'='*60}")

    for r in tiu_rows:
        no = r.get("number", "?")

        # 1. Check required fields for empty / None / 'None'
        for field in REQUIRED_FIELDS:
            val = r.get(field, "").strip()
            if val in ("", "None", "nan"):
                flag(name, no, field, f"EMPTY/NULL (got: '{val}')")

        # 2. Score validation: exactly one should be 5, rest 0
        score_vals = []
        for sf in SCORE_FIELDS:
            try:
                score_vals.append(int(float(r.get(sf, 0))))
            except:
                score_vals.append(-1)
                flag(name, no, sf, f"NOT NUMERIC (got: '{r.get(sf)}')")

        fives = score_vals.count(5)
        if fives == 0:
            flag(name, no, "scores", f"NO correct answer (5) found: {score_vals}")
        elif fives > 1:
            flag(name, no, "scores", f"MULTIPLE correct answers: {score_vals}")
        # Check non-answer scores are not 5
        for i, sf in enumerate(SCORE_FIELDS):
            if score_vals[i] not in (0, 5, 1, 2, 3, 4) and score_vals[i] != -1:
                flag(name, no, sf, f"Unexpected score value: {score_vals[i]}")

        # 3. image_url check (only for figural)
        sub = r.get("sub_category", "").strip()
        img = r.get("image_url", "").strip()
        if sub in ("Analogi Gambar", "Ketidaksamaan Gambar", "Serial Gambar"):
            if not img.startswith("http"):
                flag(name, no, "image_url", f"Figural without http img (got: '{img[:60]}')")

        # 4. Content empty check
        content = r.get("content", "").strip()
        if len(content) < 5:
            flag(name, no, "content", f"Very short content: '{content}'")

        # 5. Discussion length warning (not an error, just FYI)
        disc = r.get("discussion", "").strip()
        if len(disc) > 800:
            flag(name, no, "discussion", f"LONG discussion ({len(disc)} chars) — consider trimming")

        # 6. Print row summary
        score_letter = next(
            (["A","B","C","D","E"][i] for i, v in enumerate(score_vals) if v == 5),
            "NONE"
        )
        img_tag = "IMG" if img.startswith("http") else "   "
        disc_tag = f"{len(disc):>4}c"
        content_short = content[:55].replace("\n", " ")
        print(f"  {no:>3} | {sub:<22} | {img_tag} | ans={score_letter} | disc={disc_tag} | {content_short}")

# ── Issues Summary ──────────────────────────────────────────────
print(f"\n\n{'='*60}")
print(f"  ISSUES FOUND: {len(issues)}")
print(f"{'='*60}")
if not issues:
    print("  No issues detected!")
else:
    for iss in issues:
        print(f"  [{iss['file']}] No.{iss['no']:>3} | {iss['field']:<18} | {iss['issue']}")
