import pandas as pd
import os

file_path = 'd:\\ProjectAI\\Test-CPNS\\data\\csv\\Latihan3 - 100.csv'
df = pd.read_csv(file_path)
subset = df[df['number'].isin([6, 7, 8, 9, 10])]

print(f"{'No':<4} | {'Segment':<8} | {'Ratio':<6} | {'Correct Len':<12} | {'Avg Wrong Len':<14}")
print("-" * 55)

for idx, row in subset.iterrows():
    # Find correct option (score 5)
    correct_opt = None
    for opt in ['a','b','c','d','e']:
        if row.get(f'score_{opt}') == 5 or str(row.get(f'score_{opt}')) == '5.0':
            correct_opt = opt
            break
            
    if correct_opt:
        c_text = str(row[f'option_{correct_opt}'])
        c_len = len(c_text)
        
        w_lens = []
        for o in ['a','b','c','d','e']:
            if o != correct_opt:
                w_text = str(row.get(f'option_{o}', ''))
                if w_text and w_text != 'nan':
                    w_lens.append(len(w_text))
        
        w_avg = sum(w_lens) / len(w_lens) if w_lens else 0
        ratio = c_len / w_avg if w_avg > 0 else 0
        
        print(f"{row['number']:<4} | {row['segment']:<8} | {ratio:<6.2f} | {c_len:<12.1f} | {w_avg:<14.1f}")
