import pandas as pd
import re
import sys

def analyze_csv(file_path):
    print(f'\n==================================================')
    print(f'--- Analisis {file_path} ---')
    print(f'==================================================')
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f'Error reading file: {e}')
        return

    # 1. TIU Verbal Check
    tiu_verbal_subcats = ['Analogi', 'Silogisme', 'Analitis']
    tiu_verbal_df = df[(df['segment'] == 'TIU') & (df['sub_category'].isin(tiu_verbal_subcats))]
    
    print(f'\n[1] TIU Verbal Check (Sub-kategori: {tiu_verbal_subcats})')
    print(f'Total Soal TIU Verbal: {len(tiu_verbal_df)}')
    
    number_pattern = re.compile(r'\d+')
    numeric_count = 0
    for idx, row in tiu_verbal_df.iterrows():
        content = str(row.get('content', ''))
        # Check if there are many numbers in the content (indicating math question)
        if len(number_pattern.findall(content)) > 2:
            numeric_count += 1
            
    print(f'Soal TIU Verbal yang (salah) mengandung angka (>2 digit): {numeric_count} dari {len(tiu_verbal_df)} soal')
    if len(tiu_verbal_df) > 0:
        print('\nContoh Konten TIU Verbal (3 teratas):')
        for idx, row in tiu_verbal_df.head(3).iterrows():
            print(f'  - [{row.get("sub_category")}] {str(row.get("content", ""))[:120]}...')

    # 2. Discussion-Score Mismatch Check
    print(f'\n[2] Discussion-Score Match Check')
    mismatch_count = 0
    total_checked = 0
    
    twk_tiu_df = df[df['segment'].isin(['TWK', 'TIU'])]
    
    # Pattern to find all option letter references in discussion
    discussion_pattern = re.compile(
        r'\b(?:[Jj]awaban|[Oo]psi|[Pp]ilihan|[Kk]unci)\s+([A-Ea-e])\b'
        r'|\(([A-E])\)'
        r'|(?:^|\n|\.\s+|\s+)([A-E])[.)\-]\s'
        r'|(?:,\s*|\bdan\s+|\batau\s+)([A-E])\b(?=\s*(?:salah|benar|bernilai|merupakan|adalah|,|\.|$))'
    )
    
    for idx, row in twk_tiu_df.iterrows():
        # Find correct answer from scores
        correct_letter = None
        for o in 'abcde':
            if int(float(row.get(f'score_{o}', 0) or 0)) == 5:
                correct_letter = o.upper()
                break
                
        if not correct_letter:
            continue
            
        discussion = str(row.get('discussion', ''))
        
        # Extract all option letters mentioned in the discussion
        mentioned_options = []
        for m in discussion_pattern.finditer(discussion):
            letter = m.group(1) or m.group(2) or m.group(3) or m.group(4)
            if letter:
                mentioned_options.append(letter.upper())
        
        if mentioned_options:
            total_checked += 1
            # Check if the correct_letter is mentioned at all as an option in the discussion
            if correct_letter not in mentioned_options:
                mismatch_count += 1
                if mismatch_count <= 3: # Print first 3 mismatches
                     print(f'  [MISMATCH] Soal {row.get("number")}: Skor Benar=({correct_letter}), Pembahasan TDK menyebut {correct_letter} sbg opsi. Teks: "{discussion[:120]}..."')

    print(f'\nTotal Soal TWK/TIU dengan format pembahasan yang bisa dicek: {total_checked}')
    print(f'Total Mismatch Ditemukan: {mismatch_count}')
    if mismatch_count == 0 and total_checked > 0:
        print(f'[PASS] PERFECT! Tidak ada mismatch pada {file_path}.')
    elif mismatch_count > 0:
        print(f'[FAIL] GAGAL! Ditemukan {mismatch_count} mismatch pada {file_path} (AI tidak membahas opsi jawaban benar secara eksplisit).')

if __name__ == "__main__":
    analyze_csv('data/csv/Hard1.csv')
    analyze_csv('data/csv/Hard2.csv')
