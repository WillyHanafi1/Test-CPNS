"""
fix_null_bytes.py
Strips null bytes (U+0000) and other non-printable control characters
from ALL fields in the Latihan CSV files.

Root cause: LaTeX expressions like $\sqrt{169+...}$ sometimes get saved
with embedded U+0000 bytes that corrupt CSV parsing and database inserts.
"""
import csv
import sys
import re
import os

sys.stdout.reconfigure(encoding="utf-8")

CSV_FILES = [
    r"d:\ProjectAI\Test-CPNS\data\csv\Latihan4 - 70.csv",
    r"d:\ProjectAI\Test-CPNS\data\csv\Latihan6 - 100.csv",
]

# Also fix L3 and L5 just in case
CSV_FILES_ALL = [
    r"d:\ProjectAI\Test-CPNS\data\csv\Latihan3 - 80.csv",
    r"d:\ProjectAI\Test-CPNS\data\csv\Latihan4 - 70.csv",
    r"d:\ProjectAI\Test-CPNS\data\csv\Latihan5 - 90.csv",
    r"d:\ProjectAI\Test-CPNS\data\csv\Latihan6 - 100.csv",
]


def clean_field(value: str) -> str:
    """
    Remove null bytes and other problematic control characters.
    Preserves newlines inside quoted fields (they are handled by csv module).
    """
    if not value:
        return value
    # Remove null bytes
    value = value.replace("\x00", "")
    # Remove other C0 control chars except tab (\x09)
    # (newlines inside quoted CSV cells are kept by csv module automatically)
    value = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    return value


def fix_csv(filepath: str) -> int:
    """Read, clean, and rewrite a CSV. Returns number of cells fixed."""
    fixed_count = 0

    with open(filepath, "r", encoding="utf-8-sig", newline="") as f:
        raw = f.read()

    # Quick check: does this file even have null bytes?
    has_nulls = "\x00" in raw
    has_ctrl = bool(re.search(r"[\x01-\x08\x0b\x0c\x0e-\x1f]", raw))

    if not has_nulls and not has_ctrl:
        print(f"  [OK] No null/control bytes found: {os.path.basename(filepath)}")
        return 0

    null_count = raw.count("\x00")
    print(f"  [!] Found {null_count} null byte(s) in: {os.path.basename(filepath)}")

    # Re-read using csv module
    with open(filepath, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = []
        for row in reader:
            cleaned_row = {}
            for key, val in row.items():
                cleaned_val = clean_field(val or "")
                if cleaned_val != (val or ""):
                    fixed_count += 1
                cleaned_row[key] = cleaned_val
            rows.append(cleaned_row)

    # Write back
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
            quoting=csv.QUOTE_ALL,
            lineterminator="\r\n",
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"  [FIXED] {fixed_count} cell(s) cleaned in {os.path.basename(filepath)}")
    return fixed_count


def main():
    total_fixed = 0
    for filepath in CSV_FILES_ALL:
        if not os.path.exists(filepath):
            print(f"  [SKIP] File not found: {filepath}")
            continue
        print(f"\nProcessing: {os.path.basename(filepath)}")
        total_fixed += fix_csv(filepath)

    print(f"\n=== DONE. Total cells fixed: {total_fixed} ===")
    if total_fixed > 0:
        print("Re-import the CSVs into the database to apply these fixes.")


if __name__ == "__main__":
    main()
