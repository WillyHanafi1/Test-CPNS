import pandas as pd
df = pd.read_csv('data/csv/Hard2.csv')
for num in [3, 4, 6]:
    row = df[df['number'] == num].iloc[0]
    correct = None
    for o in 'abcde':
        if int(float(row.get(f'score_{o}', 0) or 0)) == 5:
            correct = o.upper()
    print(f'\n--- SOAL {num} ---')
    print(f'Skor Benar: {correct}')
    print(f'Pembahasan:\n{row.get("discussion", "")}')
