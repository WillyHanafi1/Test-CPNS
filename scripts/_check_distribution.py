import csv
import glob
import os

csv_files = glob.glob('d:/ProjectAI/Test-CPNS/data/csv/Latihan*.csv')
csv_files.sort()

for file_path in csv_files:
    filename = os.path.basename(file_path)
    distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
    total_questions = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_questions += 1
                try:
                    score_a = float(row.get('score_a', 0) or 0)
                    score_b = float(row.get('score_b', 0) or 0)
                    score_c = float(row.get('score_c', 0) or 0)
                    score_d = float(row.get('score_d', 0) or 0)
                    score_e = float(row.get('score_e', 0) or 0)
                except ValueError:
                    continue
                
                # We are looking for the answer that gives 5 points
                if score_a == 5.0: distribution['A'] += 1
                elif score_b == 5.0: distribution['B'] += 1
                elif score_c == 5.0: distribution['C'] += 1
                elif score_d == 5.0: distribution['D'] += 1
                elif score_e == 5.0: distribution['E'] += 1
        
        print(f"File: {filename} (Total: {total_questions})")
        print(f"  A: {distribution['A']} ({(distribution['A']/total_questions*100) if total_questions else 0:.1f}%)")
        print(f"  B: {distribution['B']} ({(distribution['B']/total_questions*100) if total_questions else 0:.1f}%)")
        print(f"  C: {distribution['C']} ({(distribution['C']/total_questions*100) if total_questions else 0:.1f}%)")
        print(f"  D: {distribution['D']} ({(distribution['D']/total_questions*100) if total_questions else 0:.1f}%)")
        print(f"  E: {distribution['E']} ({(distribution['E']/total_questions*100) if total_questions else 0:.1f}%)")
        print("-" * 40)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
