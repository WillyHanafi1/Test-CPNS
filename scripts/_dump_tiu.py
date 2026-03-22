import csv, sys, os

sys.stdout.reconfigure(encoding="utf-8")

FILES = {
    "L3": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan3 - 80.csv",
    "L4": r"data/csv/Latihan4 - 70.csv",
    "L5": r"data/csv/Latihan5 - 90.csv",
    "L6": r"data/csv/Latihan6 - 100.csv",
}

for label, path in FILES.items():
    if not os.path.exists(path):
        continue
        
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    print(f"\n========================================")
    print(f"FILE: {label} ({os.path.basename(path)})")
    print(f"========================================")
    
    for r in rows:
        if r["segment"] == "TIU":
            num = r["number"]
            cat = r["sub_category"]
            content = r["content"]
            options = f"A: {r['option_a']} | B: {r['option_b']} | C: {r['option_c']} | D: {r['option_d']} | E: {r['option_e']}"
            discussion = r["discussion"]
            
            # Simple heuristic for damage
            is_damaged = ("$$" in content) or ("$$" in discussion)
            marker = " [!!! DAMAGED !!!]" if is_damaged else ""
            
            print(f"\nQuestion No.{num} - {cat}{marker}")
            print(f"Content   : {content}")
            print(f"Options   : {options}")
            print(f"Discussion: {discussion}")
            print("-" * 40)
