
import csv
import shutil
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path(r"d:\ProjectAI\Test-CPNS")
FILES = [
    "Latihan3 - 80.csv",
    "Latihan4 - 70.csv",
    "Latihan5 - 90.csv",
    "Latihan6 - 100.csv",
]
SCORE_COLS = ["score_a", "score_b", "score_c", "score_d", "score_e"]

MANUAL_FIXES = {
    ("Latihan3 - 80.csv", 38): {"score_a": 0, "score_b": 0, "score_c": 0, "score_d": 5, "score_e": 0},
    ("Latihan3 - 80.csv", 39): {"score_a": 0, "score_b": 0, "score_c": 0, "score_d": 5, "score_e": 0},
    ("Latihan3 - 80.csv", 40): {"score_a": 5, "score_b": 0, "score_c": 0, "score_d": 0, "score_e": 0},
    ("Latihan3 - 80.csv", 44): {"score_a": 0, "score_b": 0, "score_c": 5, "score_d": 0, "score_e": 0},
    ("Latihan4 - 70.csv", 39): {"score_a": 0, "score_b": 0, "score_c": 5, "score_d": 0, "score_e": 0},
    ("Latihan4 - 70.csv", 44): {"score_a": 0, "score_b": 0, "score_c": 5, "score_d": 0, "score_e": 0},
    ("Latihan5 - 90.csv", 38): {"score_a": 5, "score_b": 0, "score_c": 0, "score_d": 0, "score_e": 0},
    ("Latihan5 - 90.csv", 42): {"score_a": 0, "score_b": 0, "score_c": 0, "score_d": 0, "score_e": 5},
    ("Latihan6 - 100.csv", 39): {"score_a": 0, "score_b": 0, "score_c": 5, "score_d": 0, "score_e": 0},
}

def fix_file(filename):
    filepath = BASE_DIR / filename
    backup_path = BASE_DIR / (filename + ".backup")
    if not filepath.exists():
        print(f"  [ERROR] Not found: {filepath}")
        return
    # Only backup if no backup yet (avoid overwriting original backup with already-fixed file)
    if not backup_path.exists():
        shutil.copy2(filepath, backup_path)
        print(f"  [BACKUP] {backup_path.name}")
    else:
        print(f"  [SKIP BACKUP] Backup already exists")

    rows = []
    auto_fixes = 0
    manual_fixes = 0

    with open(filepath, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            # Skip empty/null rows
            if row is None:
                continue
            segment_raw = row.get("segment")
            if segment_raw is None:
                rows.append(row)
                continue
            segment = segment_raw.strip()
            
            num_raw = row.get("number", "")
            try:
                number = int(num_raw) if num_raw else 0
            except (ValueError, TypeError):
                rows.append(row)
                continue

            key = (filename, number)
            if key in MANUAL_FIXES:
                for col, val in MANUAL_FIXES[key].items():
                    row[col] = str(val)
                manual_fixes += 1
                print(f"  [MANUAL] Q{number} {segment}: skor direkonstruksi")
            elif segment == "TIU":
                scores = {}
                for c in SCORE_COLS:
                    raw = row.get(c, "0")
                    try:
                        scores[c] = int(raw) if raw else 0
                    except ValueError:
                        scores[c] = 0
                max_score = max(scores.values()) if scores else 0
                if max_score == 1:
                    for col in SCORE_COLS:
                        if scores[col] == 1:
                            row[col] = "5"
                            auto_fixes += 1
                            print(f"  [FIX]    Q{number} TIU: {col} 1->5")
                            break
            rows.append(row)

    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  Result: Auto-fix={auto_fixes}, Manual={manual_fixes}")
    print(f"  Saved : {filename}\n")

print("=" * 55)
print("  FIX SKOR TIU - LATIHAN 3, 4, 5, 6")
print("=" * 55)
for fn in FILES:
    print(f"\n[FILE] {fn}")
    fix_file(fn)
print("=" * 55)
print("  DONE. Backup files: *.backup")
print("=" * 55)
