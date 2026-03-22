import csv
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

files = {
    "Latihan3": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan3 - 80.csv"),
    "Latihan4": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan4 - 70.csv"),
    "Latihan5": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan5 - 90.csv"),
    "Latihan6": Path("d:/ProjectAI/Test-CPNS/data/csv/Latihan6 - 100.csv"),
}

ranges = {
    "Latihan3": range(54, 66),
    "Latihan4": range(57, 66),
    "Latihan5": range(58, 66),
    "Latihan6": range(56, 66),
}

for name, path in files.items():
    print(f"\n=== {name} ===")
    with open(path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    figural = [r for r in rows if int(r["number"]) in ranges[name]]
    for r in figural:
        has_img = "YES" if r["image_url"].startswith("http") else "NO"
        correct = next(
            (k.upper() for k in ["score_a","score_b","score_c","score_d","score_e"]
             if str(r[k]) == "5"),
            "NONE"
        )
        print(f"  No.{r['number']:>3} | {r['sub_category']:<22} | img={has_img} | correct={correct}")
