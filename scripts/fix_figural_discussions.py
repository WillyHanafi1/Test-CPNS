"""
fix_figural_discussions.py
Fixes two problems in figural rows of all 4 Latihan CSVs:
1. Removes raw newline chars from discussion (causes broken CSV rendering)
2. Trims discussions longer than 400 chars to first meaningful sentence
"""
import csv
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

CSV_FILES = {
    "Latihan3": (Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan3 - 80.csv"), range(54, 66)),
    "Latihan4": (Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan4 - 70.csv"), range(57, 66)),
    "Latihan5": (Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan5 - 90.csv"), range(58, 66)),
    "Latihan6": (Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan6 - 100.csv"), range(56, 66)),
}

MAX_DISC_LEN = 400  # chars


def clean_discussion(text: str) -> str:
    """
    1. Replace newlines with a single space
    2. Collapse multiple spaces
    3. Trim to MAX_DISC_LEN chars at sentence boundary
    """
    # Flatten newlines
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    # Collapse whitespace
    text = re.sub(r" {2,}", " ", text).strip()

    if len(text) <= MAX_DISC_LEN:
        return text

    # Cut at last sentence boundary before MAX_DISC_LEN
    truncated = text[:MAX_DISC_LEN]
    last_dot = max(truncated.rfind(". "), truncated.rfind("! "), truncated.rfind("? "))
    if last_dot > 100:
        return truncated[:last_dot + 1].strip()
    return truncated.rstrip(",;:- ") + "."


total_fixed = 0

for name, (path, fig_range) in CSV_FILES.items():
    print(f"\n[{name}] Processing...")
    rows = []
    header = None
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames
        for row in reader:
            rows.append(row)

    fixed_count = 0
    for row in rows:
        n = int(row["number"])
        if n not in fig_range:
            continue

        old_disc = row.get("discussion", "")
        new_disc = clean_discussion(old_disc)

        if old_disc != new_disc:
            row["discussion"] = new_disc
            fixed_count += 1
            print(f"  No.{n:>3}: {len(old_disc):>4} -> {len(new_disc):>4} chars")

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  => Fixed {fixed_count} rows in {path.name}")
    total_fixed += fixed_count

print(f"\n[DONE] Total rows fixed: {total_fixed}")
