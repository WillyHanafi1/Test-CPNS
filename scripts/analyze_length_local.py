import pandas as pd
import glob
import os

files = sorted(glob.glob('data/csv/Latihan[1-6]*.csv'))

print(f"{'File':<25} | {'Correct Len':<12} | {'Wrong Len':<10} | {'Ratio':<6}")
print("-" * 60)

for f in files:
    try:
        df = pd.read_csv(f)
        results = []
        for index, row in df.iterrows():
            correct_opt = None
            # Find the option with score 5
            for opt in ['a','b','c','d','e']:
                score_val = row.get(f'score_{opt}')
                if score_val == 5 or str(score_val) == '5.0':
                    correct_opt = opt
                    break
            
            if correct_opt:
                content_correct = str(row.get(f'option_{correct_opt}', ''))
                len_correct = len(content_correct)
                
                wrong_lens = []
                for o in ['a','b','c','d','e']:
                    if o != correct_opt:
                        content_wrong = str(row.get(f'option_{o}', ''))
                        if content_wrong and content_wrong != 'nan':
                            wrong_lens.append(len(content_wrong))
                
                if wrong_lens:
                    avg_wrong = sum(wrong_lens) / len(wrong_lens)
                    results.append((len_correct, avg_wrong))
        
        if results:
            avg_c = sum(r[0] for r in results) / len(results)
            avg_w = sum(r[1] for r in results) / len(results)
            ratio = avg_c / avg_w if avg_w > 0 else 0
            print(f"{os.path.basename(f):<25} | {avg_c:<12.1f} | {avg_w:<10.1f} | {ratio:<6.2f}")
    except Exception as e:
        print(f"Error {os.path.basename(f)}: {e}")
