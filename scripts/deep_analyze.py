"""
Deep Analysis Script — Comprehensive comparison of Hard1, Hard2, Hard3 CSV files.
Checks: TIU Verbal purity, Discussion-Score integrity, Answer distribution, Content quality.
"""
import pandas as pd
import re
import sys
from collections import Counter

# ============================================================================
# SHARED PATTERNS
# ============================================================================
OPTION_PATTERN = re.compile(
    r'\b(?:[Jj]awaban|[Oo]psi|[Pp]ilihan|[Kk]unci)\s+([A-Ea-e])\b'
    r'|\(([A-E])\)'
    r'|(?:^|\n|\.\s+|\s+)([A-E])[.)\-]\s'
    r'|(?:,\s*|\bdan\s+|\batau\s+)([A-E])\b(?=\s*(?:salah|benar|bernilai|merupakan|adalah|,|\.|$))'
)
NUMBER_PATTERN = re.compile(r'\d+')
TIU_VERBAL_SUBCATS = ['Analogi', 'Silogisme', 'Analitis']


def analyze_file(file_path):
    """Run full analysis on a single CSV file and return metrics dict."""
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f'  ERROR reading {file_path}: {e}')
        return None

    metrics = {'file': file_path, 'total': len(df)}

    # ========================================================================
    # 1. TIU VERBAL PURITY CHECK
    # ========================================================================
    tiu_verbal_df = df[(df['segment'] == 'TIU') & (df['sub_category'].isin(TIU_VERBAL_SUBCATS))]
    metrics['tiu_verbal_total'] = len(tiu_verbal_df)

    numeric_violations = []
    for _, row in tiu_verbal_df.iterrows():
        content = str(row.get('content', ''))
        options_text = ' '.join([str(row.get(f'option_{o}', '')) for o in 'abcde'])
        combined = content + ' ' + options_text
        nums = NUMBER_PATTERN.findall(combined)
        if len(nums) > 2:
            numeric_violations.append({
                'number': row['number'],
                'sub_cat': row['sub_category'],
                'num_count': len(nums),
                'snippet': content[:100]
            })
    metrics['tiu_verbal_numeric'] = len(numeric_violations)
    metrics['tiu_verbal_violations'] = numeric_violations

    # ========================================================================
    # 2. DISCUSSION-SCORE MISMATCH CHECK (TWK + TIU only — TKP has gradient)
    # ========================================================================
    twk_tiu_df = df[df['segment'].isin(['TWK', 'TIU'])]
    mismatch_list = []
    total_checked = 0

    for _, row in twk_tiu_df.iterrows():
        correct_letter = None
        for o in 'abcde':
            score_val = row.get(f'score_{o}', 0)
            if pd.isna(score_val):
                score_val = 0
            if int(float(score_val)) == 5:
                correct_letter = o.upper()
                break
        if not correct_letter:
            continue

        discussion = str(row.get('discussion', ''))
        mentioned = []
        for m in OPTION_PATTERN.finditer(discussion):
            letter = m.group(1) or m.group(2) or m.group(3) or m.group(4)
            if letter:
                mentioned.append(letter.upper())

        if mentioned:
            total_checked += 1
            if correct_letter not in mentioned:
                mismatch_list.append({
                    'number': row['number'],
                    'correct': correct_letter,
                    'mentioned': mentioned,
                    'snippet': discussion[:120]
                })

    metrics['discussion_checked'] = total_checked
    metrics['discussion_mismatches'] = len(mismatch_list)
    metrics['mismatch_details'] = mismatch_list

    # ========================================================================
    # 3. ANSWER DISTRIBUTION (position of correct/highest-score answer)
    # ========================================================================
    for seg in ['TWK', 'TIU', 'TKP']:
        seg_df = df[df['segment'] == seg]
        pos_counts = Counter()
        for _, row in seg_df.iterrows():
            best_score = -1
            best_pos = None
            for o in 'abcde':
                score_val = row.get(f'score_{o}', 0)
                if pd.isna(score_val):
                    score_val = 0
                s = int(float(score_val))
                if s > best_score:
                    best_score = s
                    best_pos = o.upper()
            if best_pos:
                pos_counts[best_pos] += 1
        metrics[f'dist_{seg}'] = dict(sorted(pos_counts.items()))
        total_seg = len(seg_df)
        if total_seg > 0:
            ideal = total_seg / 5
            max_dev = max(abs(v - ideal) for v in pos_counts.values()) if pos_counts else 0
            metrics[f'dist_{seg}_max_dev'] = round(max_dev, 1)
            metrics[f'dist_{seg}_total'] = total_seg

    # ========================================================================
    # 4. CONTENT QUALITY METRICS
    # ========================================================================
    # Average content length
    df['content_len'] = df['content'].astype(str).str.len()
    df['discussion_len'] = df['discussion'].astype(str).str.len()
    metrics['avg_content_len'] = round(df['content_len'].mean())
    metrics['avg_discussion_len'] = round(df['discussion_len'].mean())

    # Empty fields check
    empty_content = df['content'].isna().sum() + (df['content'] == '').sum()
    empty_discussion = df['discussion'].isna().sum() + (df['discussion'] == '').sum()
    metrics['empty_content'] = int(empty_content)
    metrics['empty_discussion'] = int(empty_discussion)

    # Duplicate content check
    dup_content = df['content'].duplicated().sum()
    metrics['duplicate_content'] = int(dup_content)

    # Score validation (TWK/TIU: exactly one option=5, rest=0; TKP: scores 1-5)
    score_errors = 0
    for _, row in df.iterrows():
        scores = []
        for o in 'abcde':
            sv = row.get(f'score_{o}', 0)
            if pd.isna(sv): sv = 0
            scores.append(int(float(sv)))

        seg = row.get('segment', '')
        if seg in ['TWK', 'TIU']:
            if sorted(scores) != [0, 0, 0, 0, 5]:
                score_errors += 1
        elif seg == 'TKP':
            if sorted(scores) != [1, 2, 3, 4, 5]:
                score_errors += 1
    metrics['score_errors'] = score_errors

    return metrics


def print_comparison(all_metrics):
    """Print a side-by-side comparison table."""
    print('\n' + '=' * 80)
    print('📊 PERBANDINGAN MENDALAM: Hard1 vs Hard2 vs Hard3')
    print('=' * 80)

    headers = [m['file'].split('/')[-1] for m in all_metrics]
    col_w = 18

    def row(label, key, fmt=None, lower_better=True):
        vals = []
        for m in all_metrics:
            v = m.get(key, 'N/A')
            if fmt and v != 'N/A':
                vals.append(fmt.format(v))
            else:
                vals.append(str(v))
        # Determine best
        numeric_vals = []
        for m in all_metrics:
            v = m.get(key, None)
            if isinstance(v, (int, float)):
                numeric_vals.append(v)
            else:
                numeric_vals.append(None)

        best_idx = None
        if all(v is not None for v in numeric_vals):
            if lower_better:
                best_idx = numeric_vals.index(min(numeric_vals))
            else:
                best_idx = numeric_vals.index(max(numeric_vals))

        parts = [f'  {label:<32}']
        for i, v in enumerate(vals):
            marker = ' ✅' if i == best_idx else '   '
            parts.append(f'{v:>{col_w}}{marker}')
        print(''.join(parts))

    # Header
    print(f'\n  {"Metrik":<32}', end='')
    for h in headers:
        print(f'{h:>{col_w}}   ', end='')
    print('\n  ' + '-' * (32 + (col_w + 3) * len(headers)))

    print('\n  === TIU VERBAL PURITY ===')
    row('Total Soal Verbal', 'tiu_verbal_total', lower_better=False)
    row('Verbal Mengandung Angka', 'tiu_verbal_numeric')
    # Verbal purity percentage
    for m in all_metrics:
        total = m.get('tiu_verbal_total', 0)
        bad = m.get('tiu_verbal_numeric', 0)
        m['verbal_purity_pct'] = round((total - bad) / total * 100, 1) if total > 0 else 0
    row('% Verbal MURNI', 'verbal_purity_pct', '{:.1f}%', lower_better=False)

    print('\n  === DISCUSSION-SCORE INTEGRITY ===')
    row('Soal Dicek', 'discussion_checked', lower_better=False)
    row('Mismatch Ditemukan', 'discussion_mismatches')
    for m in all_metrics:
        checked = m.get('discussion_checked', 0)
        mm = m.get('discussion_mismatches', 0)
        m['match_pct'] = round((checked - mm) / checked * 100, 1) if checked > 0 else 0
    row('% Match Akurat', 'match_pct', '{:.1f}%', lower_better=False)

    print('\n  === DISTRIBUSI JAWABAN (Max Deviation dari ideal 20%) ===')
    for seg in ['TWK', 'TIU', 'TKP']:
        row(f'{seg} Max Deviasi', f'dist_{seg}_max_dev')
        # Print distribution inline
        parts = [f'  {"  " + seg + " Distribusi":<32}']
        for m in all_metrics:
            d = m.get(f'dist_{seg}', {})
            s = ' '.join([f'{k}={v}' for k, v in sorted(d.items())])
            parts.append(f'{s:>{col_w}}   ')
        print(''.join(parts))

    print('\n  === KUALITAS KONTEN ===')
    row('Rata-rata Panjang Soal (char)', 'avg_content_len', lower_better=False)
    row('Rata-rata Panjang Pembahasan', 'avg_discussion_len', lower_better=False)
    row('Soal Kosong', 'empty_content')
    row('Pembahasan Kosong', 'empty_discussion')
    row('Duplikat Konten', 'duplicate_content')
    row('Error Skor', 'score_errors')

    # ========================================================================
    # DETAIL MISMATCH
    # ========================================================================
    print('\n' + '=' * 80)
    print('🔍 DETAIL MISMATCH PER FILE')
    print('=' * 80)
    for m in all_metrics:
        fname = m['file'].split('/')[-1]
        mismatches = m.get('mismatch_details', [])
        print(f'\n--- {fname} ({len(mismatches)} mismatch) ---')
        if not mismatches:
            print('  ✅ PERFECT — Tidak ada mismatch!')
        for mm in mismatches[:5]:
            print(f'  Soal #{mm["number"]}: Benar={mm["correct"]}, Disebut={mm["mentioned"]}')
            print(f'    "{mm["snippet"][:100]}..."')

    # ========================================================================
    # DETAIL TIU VERBAL VIOLATIONS
    # ========================================================================
    print('\n' + '=' * 80)
    print('🔍 DETAIL TIU VERBAL VIOLATIONS (mengandung angka)')
    print('=' * 80)
    for m in all_metrics:
        fname = m['file'].split('/')[-1]
        violations = m.get('tiu_verbal_violations', [])
        print(f'\n--- {fname} ({len(violations)} violations) ---')
        if not violations:
            print('  ✅ PERFECT — Semua soal verbal murni tanpa angka!')
        for v in violations:
            print(f'  Soal #{v["number"]} [{v["sub_cat"]}] ({v["num_count"]} angka): "{v["snippet"]}..."')

    # ========================================================================
    # FINAL VERDICT
    # ========================================================================
    print('\n' + '=' * 80)
    print('🏆 VERDICT AKHIR')
    print('=' * 80)
    best = all_metrics[-1]  # assume last is newest
    fname = best['file'].split('/')[-1]
    print(f'\n  File terbaru: {fname}')
    print(f'  Verbal Purity: {best["verbal_purity_pct"]}%')
    print(f'  Discussion Match: {best["match_pct"]}%')
    print(f'  Score Errors: {best["score_errors"]}')
    print(f'  Duplikat: {best["duplicate_content"]}')

    issues = []
    if best['tiu_verbal_numeric'] > 0:
        issues.append(f'{best["tiu_verbal_numeric"]} soal verbal masih mengandung angka')
    if best['discussion_mismatches'] > 0:
        issues.append(f'{best["discussion_mismatches"]} mismatch pembahasan')
    if best['score_errors'] > 0:
        issues.append(f'{best["score_errors"]} error skor')

    if not issues:
        print(f'\n  🎯 SEMPURNA! {fname} lulus semua validasi tanpa masalah.')
    else:
        print(f'\n  ⚠️  Masih ada {len(issues)} isu minor:')
        for iss in issues:
            print(f'    - {iss}')


if __name__ == '__main__':
    files = ['data/csv/Hard1.csv', 'data/csv/Hard2.csv', 'data/csv/Hard3.csv']
    all_metrics = []
    for f in files:
        print(f'Analyzing {f}...')
        m = analyze_file(f)
        if m:
            all_metrics.append(m)

    if len(all_metrics) >= 2:
        print_comparison(all_metrics)
