import pandas as pd
import os

# Config
DATA_DIR = r"d:\ProjectAI\Test-CPNS\data\csv"
FILES = [
    "Latihan3 - 80.csv",
    "Latihan4 - 70.csv",
    "Latihan5 - 90.csv",
    "Latihan6 - 100.csv",
    "Latihan7 - 85.csv",
    "Latihan8 - 90.csv",
    "Latihan9 - 100.csv"
]

def analyze_file(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        print(f"Error: {filename} not found.")
        return
        
    df = pd.read_csv(filepath)
    total_rows = len(df)
    
    # Identify empty rows or placeholders
    # In our standardized format, placeholders have "KOSONG_ISI_NANTI"
    empty_rows = df[df['content'].isna() | (df['content'].astype(str).str.strip().isin(["", ".", "KOSONG_ISI_NANTI"]))].index.tolist()
    
    # Calculate distribution
    # Only for non-empty questions
    valid_df = df[~df['content'].astype(str).str.strip().isin(["", ".", "KOSONG_ISI_NANTI", "nan"])]
    
    dist = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
    for _, row in valid_df.iterrows():
        # Get scores A-E
        scores = [pd.to_numeric(row[f'score_{l}'], errors='coerce') for l in ['a', 'b', 'c', 'd', 'e']]
        # Handle NaN scores as 0
        scores = [0 if pd.isna(s) else s for s in scores]
        
        if max(scores) > 0:
            max_idx = scores.index(max(scores))
            letter = ['A', 'B', 'C', 'D', 'E'][max_idx]
            dist[letter] += 1
            
    # Print results
    print(f"\nFile: {filename}")
    print(f"  Total Rows: {total_rows} (Standardized)")
    print(f"  Empty questions / Placeholders: {len(empty_rows)}")
    
    total_valid = len(valid_df)
    if total_valid > 0:
        print(f"  Correct Answer (Score 5) Distribution among {total_valid} valid questions:")
        for k, v in dist.items():
            perc = (v / total_valid) * 100
            print(f"    {k}: {v} ({perc:.1f}%)")
    else:
        print("  No valid questions found.")

if __name__ == "__main__":
    print("--- FINAL DATASET VERIFICATION REPORT ---")
    for f in FILES:
        analyze_file(f)
