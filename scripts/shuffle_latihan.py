import pandas as pd
import random
import os
import numpy as np

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
TARGET_FILENAME_SUFFIX = "_shuffled.csv"
TARGET_ROW_COUNT = 110

# EXCLUDED CATEGORIES (Must remain static/unshuffled)
EXCLUDED_SUB_CATS = [
    "Analogi Gambar",
    "Serial Gambar",
    "Ketidaksamaan Gambar"
]

def refined_atomic_shuffle(row):
    """
    Shuffles a single row's options, scores, and images together.
    """
    sub_cat = str(row.get('sub_category', "")).strip()
    if any(ex.lower() == sub_cat.lower() for ex in EXCLUDED_SUB_CATS):
        return row
        
    bundles = []
    for l in ['a', 'b', 'c', 'd', 'e']:
        bundles.append([
            row[f'option_{l}'],
            row[f'score_{l}'],
            row[f'option_image_{l}']
        ])
    
    random.shuffle(bundles)
    
    new_data = {}
    for i, l in enumerate(['a', 'b', 'c', 'd', 'e']):
        new_data[f'option_{l}'] = bundles[i][0]
        new_data[f'score_{l}'] = bundles[i][1]
        new_data[f'option_image_{l}'] = bundles[i][2]
        
    for k, v in new_data.items():
        row[k] = v
    return row

def get_correct_option_distribution(df):
    dist = {'a': 0, 'b': 0, 'c': 0, 'd': 0, 'e': 0}
    for _, row in df.iterrows():
        if pd.isna(row['content']) or str(row['content']).strip() in ["", ".", "KOSONG_ISI_NANTI"]:
            continue
        scores = [pd.to_numeric(row[f'score_{l}'], errors='coerce') for l in ['a', 'b', 'c', 'd', 'e']]
        scores = [0 if pd.isna(s) else s for s in scores]
        if max(scores) > 0:
            max_idx = scores.index(max(scores))
            letter = ['a', 'b', 'c', 'd', 'e'][max_idx]
            dist[letter] += 1
    return dist

def is_balanced(dist, total_valid_rows):
    if total_valid_rows == 0: return True
    ideal = total_valid_rows / 5
    tolerance = max(5, 0.25 * ideal) 
    for val in dist.values():
        if abs(val - ideal) > tolerance: return False
    return True

def process_file(filename):
    filepath = os.path.join(DATA_DIR, filename)
    print(f"Processing {filename}...")
    
    try:
        orig_df = pd.read_csv(filepath)
    except Exception as e:
        print(f"  Error reading {filename}: {e}")
        return

    # Normalize Columns
    for col in ['segment', 'sub_category', 'content', 'image_url', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'score_a', 'score_b', 'score_c', 'score_d', 'score_e', 'discussion', 'option_image_a', 'option_image_b', 'option_image_c', 'option_image_d', 'option_image_e']:
        if col not in orig_df.columns:
            orig_df[col] = ""

    # 1. Create a template for 110 rows to preserve order and handle gaps
    final_rows = []
    # Map existing data by 'number' if it exists, otherwise use row index
    if 'number' in orig_df.columns:
        data_map = {int(row['number']): row for _, row in orig_df.iterrows() if not pd.isna(row['number'])}
    else:
        data_map = {i+1: row for i, row in orig_df.iterrows()}

    for i in range(1, TARGET_ROW_COUNT + 1):
        if i in data_map:
            row = data_map[i].to_dict()
            # If content is empty/dot, mark as placeholder
            if pd.isna(row['content']) or str(row['content']).strip() in ["", "."]:
                row['content'] = "KOSONG_ISI_NANTI"
            final_rows.append(row)
        else:
            # Create a true placeholder for the gap
            r = {col: "" for col in orig_df.columns}
            r['number'] = i
            r['content'] = "KOSONG_ISI_NANTI"
            final_rows.append(r)

    df = pd.DataFrame(final_rows)

    # 2. Masking
    valid_mask = df['content'].apply(lambda x: str(x).strip() not in ["", ".", "KOSONG_ISI_NANTI", "nan"])
    shufflable_mask = valid_mask & df['sub_category'].apply(lambda x: str(x).strip().lower() not in [sc.lower() for sc in EXCLUDED_SUB_CATS])
    
    total_valid = valid_mask.sum()
    total_shufflable = shufflable_mask.sum()
    print(f"  Valid: {total_valid}, Shufflable: {total_shufflable}, Static (Figural/Empty): {TARGET_ROW_COUNT - total_shufflable}")

    # 3. Balanced Shuffling Loop (preserves row order)
    best_df = df.copy()
    min_variance = float('inf')
    found_perfect = False
    
    for attempt in range(1, 501):
        temp_df = df.copy()
        # ONLY apply shuffle internally to shufflable rows (order never change)
        rows_to_shuffle = temp_df[shufflable_mask].apply(refined_atomic_shuffle, axis=1)
        temp_df.update(rows_to_shuffle)
        
        dist = get_correct_option_distribution(temp_df)
        vals = list(dist.values())
        variance = np.var(vals)
        
        if is_balanced(dist, total_valid):
            print(f"  Balanced on attempt {attempt}: {dist}")
            best_df = temp_df
            found_perfect = True
            break
        
        if variance < min_variance:
            min_variance = variance
            best_df = temp_df
            
    if not found_perfect:
        print(f"  Best found (variance {min_variance:.2f}): {get_correct_option_distribution(best_df)}")

    # 4. Save
    output_path = os.path.join(DATA_DIR, filename.replace(".csv", TARGET_FILENAME_SUFFIX))
    best_df.to_csv(output_path, index=False)
    print(f"  Saved to {os.path.basename(output_path)}")

if __name__ == "__main__":
    for f in FILES:
        process_file(f)
    print("\nSUCCESS: All files optimized while preserving row order and Figural static logic.")
