import pandas as pd

df = pd.read_csv('data/csv/Hard3.csv')

# Show TIU Verbal samples
tiu_verbal = df[(df['segment'] == 'TIU') & (df['sub_category'].isin(['Analogi', 'Silogisme', 'Analitis']))]

for _, row in tiu_verbal.iterrows():
    print(f"\n{'='*80}")
    print(f"SOAL #{row['number']} | {row['sub_category']} | Segment: {row['segment']}")
    print(f"{'='*80}")
    print(f"KONTEN:\n{str(row['content'])[:300]}")
    print(f"\nOPSI:")
    for o in 'abcde':
        score = int(float(row.get(f'score_{o}', 0) or 0))
        marker = " ★" if score == 5 else ""
        print(f"  {o.upper()}. {str(row.get(f'option_{o}', ''))[:120]} [skor={score}]{marker}")
    print(f"\nPEMBAHASAN (150 char):\n{str(row.get('discussion', ''))[:150]}...")
