import csv, sys
sys.stdout.reconfigure(encoding="utf-8")

FILES = {
    "L3": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan3 - 80.csv",
    "L4": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan4 - 70.csv",
    "L5": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan5 - 90.csv",
    "L6": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan6 - 100.csv",
}

TARGET = {
    "L3": [47],
    "L4": [43],
    "L5": [],
    "L6": [41, 42, 43, 44, 50, 51],
}

for label, path in FILES.items():
    targets = TARGET.get(label, [])
    if not targets:
        continue
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            if r["segment"] == "TIU" and int(r["number"]) in targets:
                print(f"\n=== {label} No.{r['number']} [{r['sub_category']}] ===")
                print(f"CONTENT: {repr(r['content'])}")
                print(f"OPT_A:   {repr(r['option_a'])}")
                print(f"OPT_B:   {repr(r['option_b'])}")
                print(f"OPT_C:   {repr(r['option_c'])}")
                print(f"OPT_D:   {repr(r['option_d'])}")
                print(f"OPT_E:   {repr(r['option_e'])}")
                print(f"DISC:    {repr(r['discussion'])}")
