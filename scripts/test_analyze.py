import pandas as pd
import re

df = pd.read_csv('data/csv/Hard2.csv')

pattern = re.compile(
    r'\b(?:[Jj]awaban|[Oo]psi|[Pp]ilihan|[Kk]unci)\s+([A-Ea-e])\b'
    r'|\(([A-E])\)'
    r'|(?:^|\n|\.\s+|\s+)([A-E])[.)\-]\s'
    r'|(?:,\s*|\bdan\s+|\batau\s+)([A-E])\b(?=\s*(?:salah|benar|bernilai|merupakan|adalah|,|\.|$))'
)

twk_tiu_df = df[df['segment'].isin(['TWK', 'TIU'])]

mismatch_count = 0
for idx, row in twk_tiu_df.iterrows():
    correct_letter = None
    for o in 'abcde':
        if int(float(row.get(f'score_{o}', 0) or 0)) == 5:
            correct_letter = o.upper()
            break
    if not correct_letter: continue
    
    discussion = str(row.get('discussion', ''))
    mentioned = []
    for m in pattern.finditer(discussion):
        letter = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if letter:
            mentioned.append(letter.upper())
            
    if mentioned:
        if correct_letter not in mentioned:
            mismatch_count += 1
            print(f'[MISMATCH] Soal {row["number"]}: Benar {correct_letter}. Mentioned: {mentioned}')
print(f'Total mismatches: {mismatch_count}')
