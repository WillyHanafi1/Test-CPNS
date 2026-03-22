import csv, sys, os, re

sys.stdout.reconfigure(encoding="utf-8")

FILES = {
    "L3": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan3 - 80.csv",
    "L4": r"data/csv/Latihan4 - 70.csv",
    "L5": r"data/csv/Latihan5 - 90.csv",
    "L6": r"data/csv/Latihan6 - 100.csv",
}

def audit_tiu():
    for label, path in FILES.items():
        if not os.path.exists(path):
            continue
            
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            
        print(f"\nAudit {label} ({os.path.basename(path)}):")
        for r in rows:
            if r["segment"] != "TIU": continue
            
            content = r["content"]
            disc = r["discussion"]
            num = r["number"]
            sub = r["sub_category"]
            
            # SUSPICIOUS IF:
            # 1. Contains '$$' (placeholder for stripped null byte)
            # 2. Subcategory is 'Berhitung' but no '$' in content
            # 3. Content ends abruptly with '...'
            
            is_suspicious = False
            reasons = []
            
            if "$$" in content or "$$" in disc:
                is_suspicious = True
                reasons.append("Empty formula placeholder '$$' found")
            
            if sub == "Berhitung" and "$" not in content:
                is_suspicious = True
                reasons.append("Berhitung question with no LaTeX '$'")
                
            if content.strip().endswith("adalah...") and len(content) < 50:
                is_suspicious = True
                reasons.append("Suspiciously short content ending in '...'")
            
            if is_suspicious:
                print(f"\n[!] SUSPICIOUS No.{num} ({sub})")
                print(f"    Reasons: {', '.join(reasons)}")
                print(f"    Content   : {content}")
                print(f"    Discussion: {disc}")

if __name__ == "__main__":
    audit_tiu()
