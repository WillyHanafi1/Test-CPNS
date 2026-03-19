import os
import pandas as pd
from pathlib import Path

DATA_DIR = Path("d:/ProjectAI/Test-CPNS/data/csv")
OLD_HOST = "https://kthjlyrqhryhryhryhry.supabase.co"
NEW_HOST = "https://upykjfjmfpwegqrbgeoa.supabase.co"

files_to_fix = [
    "Latihan4_final.csv",
    "Latihan5_final.csv",
    "Latihan6_final.csv"
]

def fix_urls_in_file(file_path: Path):
    if not file_path.exists():
        print(f"Skipping {file_path.name}, not found.")
        return
        
    print(f"Processing {file_path.name}...")
    
    # Read CSV
    df = pd.read_csv(file_path)
    
    # Iterate over all columns to be safe
    for col in df.columns:
        if df[col].dtype == 'object':
            # First replace host
            df[col] = df[col].str.replace(OLD_HOST, NEW_HOST, regex=False)
            
            # Then fix the path if it's missing 'figural/'
            # We look for /exam-assets/latihanX and replace with /exam-assets/figural/latihanX
            # But only if 'figural/' isn't already there
            def fix_path(val):
                if isinstance(val, str) and "/public/exam-assets/latihan" in val and "/public/exam-assets/figural/" not in val:
                    return val.replace("/public/exam-assets/latihan", "/public/exam-assets/figural/latihan")
                return val
            
            df[col] = df[col].apply(fix_path)

    # Save back
    df.to_csv(file_path, index=False)
    print(f"Fixed {file_path.name}")

def main():
    for filename in files_to_fix:
        fix_urls_in_file(DATA_DIR / filename)

if __name__ == "__main__":
    main()
