import csv, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

files = {
    'Latihan3': (Path('d:/ProjectAI/Test-CPNS/data/csv/Latihan3 - 80.csv'), range(54,66)),
    'Latihan4': (Path('d:/ProjectAI/Test-CPNS/data/csv/Latihan4 - 70.csv'), range(57,66)),
    'Latihan5': (Path('d:/ProjectAI/Test-CPNS/data/csv/Latihan5 - 90.csv'), range(58,66)),
    'Latihan6': (Path('d:/ProjectAI/Test-CPNS/data/csv/Latihan6 - 100.csv'), range(56,66)),
}
for name, (path, rng) in files.items():
    with open(path, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        n = int(r['number'])
        if n not in rng:
            continue
        disc = r.get('discussion','')
        has_nl = '\n' in disc or '\r' in disc
        first = disc[:80].replace('\n','[LF]').replace('\r','[CR]')
        print(f'{name} No.{n:>3}: newline={has_nl}, len={len(disc):>4}, start={first}')
