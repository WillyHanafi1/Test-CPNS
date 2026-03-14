import csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'd:\ProjectAI\Test-CPNS\soal_skd_110.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

print(f"Header ({len(header)}): {header}")
print(f"Total rows: {len(rows)}")

segments = {}
for row in rows:
    segments[row[1]] = segments.get(row[1], 0) + 1
print("\nDistribution:")
for s, c in sorted(segments.items()): print(f"  {s}: {c}")

numbers = [int(r[0]) for r in rows]
dupes = [n for n in set(numbers) if numbers.count(n) > 1]
print(f"\nDuplicates: {dupes if dupes else 'None'}")
print(f"Range: {min(numbers)}-{max(numbers)}")

errors = []
for row in rows:
    n, seg = int(row[0]), row[1]
    scores = [int(row[8]), int(row[9]), int(row[10]), int(row[11]), int(row[12])]
    if seg in ['TWK','TIU']:
        if 5 not in scores: errors.append(f"#{n}({seg}): no 5 in {scores}")
        if scores.count(5) > 1: errors.append(f"#{n}({seg}): multi 5 in {scores}")
    elif seg == 'TKP':
        if sorted(scores) != [1,2,3,4,5]: errors.append(f"#{n}(TKP): bad scores {scores}")
    if not row[2].strip(): errors.append(f"#{n}: empty content")
    for j,l in enumerate('ABCDE'):
        if not row[3+j].strip(): errors.append(f"#{n}: empty opt {l}")

bad = [(i+2, len(r)) for i,r in enumerate(rows) if len(r) != len(header)]
if bad: errors.extend([f"Line {l}: {c} cols" for l,c in bad])

print(f"\nErrors: {len(errors)}")
for e in errors: print(f"  {e}")
if not errors: print("ALL VALID!")
