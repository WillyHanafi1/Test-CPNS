
import csv
import re
from pathlib import Path

BASE_DIR = Path(r"d:\ProjectAI\Test-CPNS")
FILES = [
    "Latihan2.csv",
    "Latihan3 - 80.csv",
    "Latihan4 - 70.csv",
    "Latihan5 - 90.csv",
    "Latihan6 - 100.csv",
]

def audit_files():
    for filename in FILES:
        filepath = BASE_DIR / filename
        if not filepath.exists():
            continue
        
        print(f"\n--- AUDIT: {filename} ---")
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            # Detect header style
            headers = reader.fieldnames
            
            for row in reader:
                segment_raw = row.get("segment")
                segment = segment_raw.strip() if segment_raw else ""
                if segment != "TIU":
                    continue
                
                num = row.get("number", "??")
                discussion = row.get("discussion", "")
                options = [row.get(f"option_{c}", "") for c in "abcde"]
                content = row.get("content", "")
                
                # Targeted check for user-requested questions
                target_keys = {
                    "Latihan2.csv": ["39"],
                    "Latihan3 - 80.csv": ["44"],
                    "Latihan4 - 70.csv": ["41", "42", "44"]
                }
                
                is_target = filename in target_keys and num in target_keys[filename]
                
                if is_target:
                    print(f"\n  >>> TARGETED AUDIT: {filename} Q{num} <<<")
                    print(f"    Content: {content}")
                    print(f"    Options: {options}")
                    print(f"    Discussion: {discussion}")
                    scores = {c: row.get(f"score_{c}") for c in "abcde"}
                    print(f"    Scores: {scores}")
                
                # Look for suspicious strings in discussion
                keywords = ["asumsikan", "tidak ada", "harusnya", "ralat", "kurang", "salah"]
                found_keywords = [k for k in keywords if k in discussion.lower()]
                
                # Check if any option is mentioned as the answer in discussion
                # e.g. "Jawaban C" or "Opsi B"
                ans_match = re.search(r"(?:Jawaban|Opsi)\s+([A-E])", discussion, re.I)
                if ans_match:
                    ans_letter = ans_match.group(1).upper()
                    score_col = f"score_{ans_letter.lower()}"
                    score = row.get(score_col, "0")
                    if str(score) != "5":
                        print(f"  [SCORE ERROR] Q{num}: Discussion says {ans_letter} but {score_col} is {score}")
                
                if found_keywords:
                    print(f"  [POTENTIAL MISSING] Q{num}: Keywords {found_keywords} in discussion")
                    print(f"    Content: {row.get('content')[:100]}...")
                    print(f"    Options: {options}")
                    print(f"    Discussion: {discussion[:200]}...")

if __name__ == "__main__":
    audit_files()
