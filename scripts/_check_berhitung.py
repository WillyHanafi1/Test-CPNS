import csv, sys
sys.stdout.reconfigure(encoding="utf-8")

FILES = {
    "L4": r"data/csv/Latihan4 - 70.csv",
    "L6": r"data/csv/Latihan6 - 100.csv",
}

for label, path in FILES.items():
    with open(path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"\n--- {label}: total {len(rows)} soal ---")
    for r in rows:
        if r["segment"] != "TIU":
            continue
        num = r["number"]
        sub = r["sub_category"]
        content = r["content"]
        disc = r["discussion"]
        # flag soal yang kemungkinan formulanya rusak
        damaged = ("$$" in content) or (content.count("$") == 0 and sub == "Berhitung")
        marker = " <<< FORMULA RUSAK" if damaged else ""
        print(f"  No.{num:>3} [{sub:<30}] {content[:75]}{marker}")
