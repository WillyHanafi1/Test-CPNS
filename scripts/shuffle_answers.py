"""
shuffle_answers.py — Post-Processing Answer Shuffler for CPNS CAT Questions

Menghilangkan pola siklus kunci jawaban (e.g., C-D-B-A-E berulang)
dengan mengacak posisi opsi jawaban BESERTA memperbarui referensi huruf
opsi di dalam kolom 'discussion' agar tetap konsisten.

Alur kerja:
1. Baca CSV yang sudah tervalidasi
2. Untuk setiap soal (kecuali sub_kategori figural):
   a. Bundel opsi (text, score, image) dan acak posisinya
   b. Buat mapping huruf lama → huruf baru
   c. Terapkan mapping ke teks pembahasan (discussion) menggunakan
      teknik placeholder dua-tahap agar tidak terjadi tabrakan
3. Validasi statistik distribusi kunci jawaban
4. Simpan hasil ke file baru

Penggunaan:
    python scripts/shuffle_answers.py
    python scripts/shuffle_answers.py --files Hard2.csv Medium1.csv
    python scripts/shuffle_answers.py --max-attempts 1000

Referensi SOP: GEMINI.md § G (Zero-Score Tampering dilarang keras)
"""

import pandas as pd
import numpy as np
import random
import re
import os
import sys
import argparse
from collections import Counter

# ============================================================
# CONFIGURATION
# ============================================================
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "csv")

# Default files to process if none specified via CLI
DEFAULT_FILES = [
    "Extreme1_Validated.csv",
    "Hard2.csv",
    "Medium1.csv",
    "Easy.csv",
]

# Sub-categories excluded from shuffling (figural/image-based options)
EXCLUDED_SUB_CATS = [
    "Analogi Gambar",
    "Serial Gambar",
    "Ketidaksamaan Gambar",
    "Figural",
]

# Output suffix
OUTPUT_SUFFIX = "_Shuffled.csv"

# Max shuffle attempts to find balanced distribution
DEFAULT_MAX_ATTEMPTS = 500

# Letters used for options
LETTERS = ['a', 'b', 'c', 'd', 'e']
LETTERS_UPPER = ['A', 'B', 'C', 'D', 'E']

# Keywords in discussion text that precede option letters
# These are all the patterns found across all CSVs
OPTION_KEYWORDS = [
    "Opsi", "opsi",
    "Pilihan", "pilihan",
    "Jawaban", "jawaban",
    "Pengecoh", "pengecoh",
    "Distractor", "distractor",
]


# ============================================================
# CORE: Discussion Text Remapping (v2 — Multi-Level Patterns)
# ============================================================

# --- PHRASE-LEVEL PATTERNS ---
# These handle "Jawaban yang benar adalah B" style multi-word references.
# Must be processed BEFORE simple keyword+letter patterns because they
# are more specific (longer match wins, avoids partial remapping).
#
# Each tuple: (compiled_regex_template, uses_letter_at_end)
# The regex must have group(1) = prefix, and the letter follows it.

def _build_phrase_patterns():
    """
    Build compiled regex patterns for phrase-level option references.
    Returns list of (pattern_template_str,) where {L} will be substituted
    for each letter A-E.
    """
    # All phrase templates discovered from comprehensive CSV scan.
    # {L} = placeholder for the option letter to match.
    templates = [
        # "Jawaban yang benar/tepat/sah/dengan skor tertinggi (5) adalah [opsi] X"
        r'([Jj]awaban\s+(?:[\w()]+\s+){0,6}adalah\s+(?:[Oo]psi\s+)?){L}',
        # "Jawaban paling tepat adalah X"  (already covered above but explicit)
        r'([Jj]awaban\s+paling\s+tepat\s+adalah\s+(?:[Oo]psi\s+)?){L}',
        # "Jawaban ... berada pada opsi X"
        r'([Jj]awaban\s+(?:\w+\s+){0,5}berada\s+pada\s+[Oo]psi\s+){L}',
        # "opsi yang paling akurat/tepat adalah X"
        r'([Oo]psi\s+yang\s+(?:\w+\s+){0,3}adalah\s+){L}',
        # "Pengecoh terbaik/terkuat [adalah] Opsi X"
        r'([Pp]engecoh\s+(?:terbaik|terkuat|utama)\s+(?:adalah\s+)?(?:[Oo]psi\s+)?){L}',
        # "pengecoh utama di opsi X"
        r'([Pp]engecoh\s+utama\s+di\s+[Oo]psi\s+){L}',
        # "Pengecoh: Opsi X"
        r'([Pp]engecoh:\s*[Oo]psi\s+){L}',
        # "Pengecoh opsi X"
        r'([Pp]engecoh\s+[Oo]psi\s+){L}',
    ]
    return templates

PHRASE_TEMPLATES = _build_phrase_patterns()


def remap_discussion(discussion_text: str, letter_mapping: dict) -> str:
    """
    Remap all option letter references in discussion text according
    to the letter_mapping (e.g., {'A': 'C', 'B': 'A', ...}).

    Uses a TWO-PASS PLACEHOLDER approach to prevent collision:
      Pass 1: Replace all letter references → placeholders
      Pass 2: Replace all placeholders → final mapped letters

    Handles TWO levels of patterns:
      Level 1 (PHRASE): "Jawaban yang benar adalah B" → multi-word context
      Level 2 (SIMPLE): "Opsi B", "Pengecoh C" → keyword + letter
    """
    if not discussion_text or not isinstance(discussion_text, str):
        return discussion_text

    # If no actual remapping needed (identity), skip
    if all(letter_mapping.get(l, l) == l for l in LETTERS_UPPER):
        return discussion_text

    result = discussion_text

    # Unique placeholder prefix unlikely to appear in real text
    PH_PREFIX = "__SHFL_PH_"

    # Build placeholder map: letter -> placeholder
    ph_map = {}
    for i, letter_upper in enumerate(LETTERS_UPPER):
        ph_map[letter_upper] = f"{PH_PREFIX}{i}__"

    # --- PASS 1a: PHRASE-level patterns (most specific, process FIRST) ---
    for template in PHRASE_TEMPLATES:
        for letter_upper in LETTERS_UPPER:
            letter_lower = letter_upper.lower()
            placeholder = ph_map[letter_upper]

            # Build regex from template, substituting {L} with the letter
            pat_str_upper = template.replace('{L}', letter_upper) + r'(?![a-zA-Z])'
            pat_str_lower = template.replace('{L}', letter_lower) + r'(?![a-zA-Z])'

            try:
                pat_upper = re.compile(pat_str_upper)
                pat_lower = re.compile(pat_str_lower)
                result = pat_upper.sub(rf'\1{placeholder}', result)
                result = pat_lower.sub(rf'\1{placeholder.lower()}', result)
            except re.error:
                pass  # Skip malformed patterns silently

    # --- PASS 1b: SIMPLE keyword+letter patterns ---
    for keyword in OPTION_KEYWORDS:
        for letter_upper in LETTERS_UPPER:
            letter_lower = letter_upper.lower()
            placeholder = ph_map[letter_upper]

            pattern_upper = re.compile(
                rf'({re.escape(keyword)}\s+){letter_upper}(?![a-zA-Z])'
            )
            pattern_lower = re.compile(
                rf'({re.escape(keyword)}\s+){letter_lower}(?![a-zA-Z])'
            )

            result = pattern_upper.sub(rf'\1{placeholder}', result)
            result = pattern_lower.sub(rf'\1{placeholder.lower()}', result)

    # --- PASS 1c: Compact TKP score summary patterns (e.g., "B=5", "A = 4") ---
    for letter_upper in LETTERS_UPPER:
        placeholder = ph_map[letter_upper]
        pat_score = re.compile(rf'(?<![a-zA-Z0-9_]){letter_upper}(?=\s*=\s*[1-5]\b)')
        result = pat_score.sub(placeholder, result)

    # --- PASS 2: Replace all placeholders with final mapped letters ---
    for letter_upper in LETTERS_UPPER:
        new_letter_upper = letter_mapping[letter_upper]
        new_letter_lower = new_letter_upper.lower()
        placeholder_upper = ph_map[letter_upper]
        placeholder_lower = ph_map[letter_upper].lower()

        result = result.replace(placeholder_upper, new_letter_upper)
        result = result.replace(placeholder_lower, new_letter_lower)

    return result


# ============================================================
# CORE: Atomic Shuffle with Discussion Remap
# ============================================================
def shuffle_row_with_discussion(row: dict) -> dict:
    """
    Shuffle options for a single question row:
    1. Bundle (option_text, score, option_image) for each A-E
    2. Shuffle the bundles
    3. Build letter_mapping old→new
    4. Remap discussion text
    5. Write back shuffled values
    """
    sub_cat = str(row.get('sub_category', '')).strip()
    if any(ex.lower() == sub_cat.lower() for ex in EXCLUDED_SUB_CATS):
        return row

    # Bundle original options
    original_bundles = []
    for l in LETTERS:
        original_bundles.append({
            'text': row.get(f'option_{l}', ''),
            'score': row.get(f'score_{l}', 0),
            'image': row.get(f'option_image_{l}', ''),
            'original_letter': l.upper(),
        })

    # Shuffle
    shuffled = original_bundles.copy()
    random.shuffle(shuffled)

    # Build mapping: original_letter -> new_letter
    letter_mapping = {}
    for new_idx, bundle in enumerate(shuffled):
        old_letter = bundle['original_letter']
        new_letter = LETTERS_UPPER[new_idx]
        letter_mapping[old_letter] = new_letter

    # Write shuffled values back
    for new_idx, bundle in enumerate(shuffled):
        l = LETTERS[new_idx]
        row[f'option_{l}'] = bundle['text']
        row[f'score_{l}'] = bundle['score']
        row[f'option_image_{l}'] = bundle['image']

    # Remap discussion text
    discussion = row.get('discussion', '')
    if discussion and isinstance(discussion, str):
        row['discussion'] = remap_discussion(discussion, letter_mapping)

    return row


# ============================================================
# DISTRIBUTION ANALYSIS
# ============================================================
def get_answer_distribution(df: pd.DataFrame, segment: str = None) -> dict:
    """Get distribution of correct answer letters (highest score position)."""
    dist = Counter()
    for _, row in df.iterrows():
        if segment and str(row.get('segment', '')).strip().upper() != segment.upper():
            continue
        content = str(row.get('content', '')).strip()
        if content in ['', '.', 'nan', 'KOSONG_ISI_NANTI']:
            continue

        scores = []
        for l in LETTERS:
            s = pd.to_numeric(row.get(f'score_{l}', 0), errors='coerce')
            scores.append(0 if pd.isna(s) else s)

        if max(scores) > 0:
            max_idx = scores.index(max(scores))
            dist[LETTERS_UPPER[max_idx]] += 1

    return dict(dist)


def detect_cycles(df: pd.DataFrame, segment: str) -> dict:
    """
    Detect cyclical patterns in answer key sequence for a given segment.
    Returns cycle info dict with pattern length and repetitions found.
    """
    keys = []
    for _, row in df.iterrows():
        if str(row.get('segment', '')).strip().upper() != segment.upper():
            continue
        content = str(row.get('content', '')).strip()
        if content in ['', '.', 'nan', 'KOSONG_ISI_NANTI']:
            continue

        scores = []
        for l in LETTERS:
            s = pd.to_numeric(row.get(f'score_{l}', 0), errors='coerce')
            scores.append(0 if pd.isna(s) else s)

        if max(scores) > 0:
            max_idx = scores.index(max(scores))
            keys.append(LETTERS_UPPER[max_idx])

    if len(keys) < 10:
        return {'has_cycle': False, 'sequence': keys}

    # Check for repeating patterns of length 3-10
    for pattern_len in range(3, min(11, len(keys) // 2 + 1)):
        pattern = keys[:pattern_len]
        matches = 0
        for i in range(0, len(keys) - pattern_len + 1, pattern_len):
            chunk = keys[i:i + pattern_len]
            if chunk == pattern:
                matches += 1

        repetition_rate = matches / (len(keys) / pattern_len)
        if repetition_rate >= 0.8:  # 80%+ repetition = cycle detected
            return {
                'has_cycle': True,
                'pattern': '→'.join(pattern),
                'pattern_len': pattern_len,
                'repetitions': matches,
                'total_questions': len(keys),
                'repetition_rate': f'{repetition_rate:.0%}',
            }

    return {'has_cycle': False, 'total_questions': len(keys)}


def is_balanced(dist: dict, total: int, tolerance_pct: float = 0.30) -> bool:
    """Check if answer distribution is reasonably balanced (within tolerance)."""
    if total == 0:
        return True
    ideal = total / 5
    tolerance = max(3, tolerance_pct * ideal)
    for val in dist.values():
        if abs(val - ideal) > tolerance:
            return False
    return True


# ============================================================
# SCORE INTEGRITY VERIFICATION
# ============================================================
def verify_score_integrity(original_df: pd.DataFrame, shuffled_df: pd.DataFrame) -> bool:
    """
    Verify that shuffling did NOT alter the actual score values —
    only their positions. For each row, the multiset of scores
    before and after must be identical.
    """
    for idx in range(len(original_df)):
        orig_scores = sorted([
            pd.to_numeric(original_df.iloc[idx].get(f'score_{l}', 0), errors='coerce')
            for l in LETTERS
        ])
        shuf_scores = sorted([
            pd.to_numeric(shuffled_df.iloc[idx].get(f'score_{l}', 0), errors='coerce')
            for l in LETTERS
        ])
        orig_scores = [0 if pd.isna(s) else s for s in orig_scores]
        shuf_scores = [0 if pd.isna(s) else s for s in shuf_scores]

        if orig_scores != shuf_scores:
            print(f"  ⚠️ SCORE INTEGRITY VIOLATION at row {idx + 1}!")
            print(f"     Original scores: {orig_scores}")
            print(f"     Shuffled scores: {shuf_scores}")
            return False
    return True


def verify_discussion_consistency(df: pd.DataFrame) -> list:
    """
    Verify that the discussion text's claimed correct answer matches
    the actual highest-score option. Returns list of mismatch details.
    
    This catches any patterns the remapper might have missed.
    """
    mismatches = []
    
    # Patterns that claim a specific letter is correct
    correct_answer_patterns = [
        re.compile(r'[Jj]awaban\s+(?:\w+\s+){0,6}adalah\s+(?:[Oo]psi\s+)?([A-Ea-e])(?![a-zA-Z])'),
        re.compile(r'[Jj]awaban\s+paling\s+tepat\s+(?:adalah\s+)?(?:[Oo]psi\s+)?([A-Ea-e])(?![a-zA-Z])'),
    ]
    
    for idx, row in df.iterrows():
        content = str(row.get('content', '')).strip()
        if content in ['', '.', 'nan', 'KOSONG_ISI_NANTI']:
            continue
            
        discussion = str(row.get('discussion', ''))
        if not discussion:
            continue
        
        # Find actual highest-score letter
        scores = {}
        for l in LETTERS:
            s = pd.to_numeric(row.get(f'score_{l}', 0), errors='coerce')
            scores[l.upper()] = 0 if pd.isna(s) else s
        
        if max(scores.values()) == 0:
            continue
            
        actual_correct = max(scores, key=scores.get)
        
        # Find claimed correct in discussion
        for pattern in correct_answer_patterns:
            match = pattern.search(discussion)
            if match:
                claimed = match.group(1).upper()
                if claimed != actual_correct:
                    mismatches.append({
                        'row': int(row.get('number', idx + 1)),
                        'actual_correct': actual_correct,
                        'actual_score': scores[actual_correct],
                        'claimed_correct': claimed,
                        'claimed_score': scores[claimed],
                        'snippet': match.group(0)[:60],
                    })
                break  # Only check first match per row
    
    return mismatches


# ============================================================
# MAIN PROCESSOR
# ============================================================
def process_file(filename: str, max_attempts: int = DEFAULT_MAX_ATTEMPTS):
    """Process a single CSV file: shuffle + validate + save."""
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        print(f"  ❌ File not found: {filepath}")
        return False

    print(f"\n{'='*60}")
    print(f"📄 Processing: {filename}")
    print(f"{'='*60}")

    # Read original
    original_df = pd.read_csv(filepath)

    # Ensure all required columns exist
    required_cols = ['segment', 'sub_category', 'content', 'discussion']
    for l in LETTERS:
        required_cols.extend([f'option_{l}', f'score_{l}', f'option_image_{l}'])
    for col in required_cols:
        if col not in original_df.columns:
            original_df[col] = ''

    # Pre-shuffle analysis
    print("\n📊 PRE-SHUFFLE Analysis:")
    for seg in ['TWK', 'TIU', 'TKP']:
        dist = get_answer_distribution(original_df, seg)
        cycle = detect_cycles(original_df, seg)
        status = "🔴 CYCLE DETECTED" if cycle.get('has_cycle') else "🟢 No cycle"
        print(f"  {seg}: {dist}  {status}")
        if cycle.get('has_cycle'):
            print(f"       Pattern: {cycle['pattern']} (repeats {cycle['repetitions']}x)")

    # Determine which rows can be shuffled
    valid_mask = original_df['content'].apply(
        lambda x: str(x).strip() not in ['', '.', 'nan', 'KOSONG_ISI_NANTI']
    )
    excluded_mask = original_df['sub_category'].apply(
        lambda x: any(ex.lower() == str(x).strip().lower() for ex in EXCLUDED_SUB_CATS)
    )
    shufflable_mask = valid_mask & ~excluded_mask
    total_valid = valid_mask.sum()
    total_shufflable = shufflable_mask.sum()
    total_static = len(original_df) - total_shufflable

    print(f"\n  Total rows: {len(original_df)}")
    print(f"  Valid (has content): {total_valid}")
    print(f"  Shufflable: {total_shufflable}")
    print(f"  Static (figural/empty): {total_static}")

    # Balanced shuffle loop
    best_df = None
    best_variance = float('inf')
    found_balanced = False

    for attempt in range(1, max_attempts + 1):
        # Work on a fresh copy each attempt
        temp_df = original_df.copy()

        # Apply shuffle only to shufflable rows
        for idx in temp_df[shufflable_mask].index:
            row_dict = temp_df.loc[idx].to_dict()
            shuffled_row = shuffle_row_with_discussion(row_dict)
            for key, val in shuffled_row.items():
                temp_df.at[idx, key] = val

        # Check overall distribution
        overall_dist = get_answer_distribution(temp_df)
        vals = [overall_dist.get(l, 0) for l in LETTERS_UPPER]
        variance = np.var(vals)

        if is_balanced(overall_dist, total_valid):
            # Also check per-segment for no cycles
            has_any_cycle = False
            for seg in ['TWK', 'TIU', 'TKP']:
                cycle = detect_cycles(temp_df, seg)
                if cycle.get('has_cycle'):
                    has_any_cycle = True
                    break

            if not has_any_cycle:
                print(f"\n  ✅ Balanced & cycle-free on attempt {attempt}")
                best_df = temp_df
                found_balanced = True
                break

        if variance < best_variance:
            best_variance = variance
            best_df = temp_df

    if not found_balanced:
        print(f"\n  ⚠️ Best found after {max_attempts} attempts (variance: {best_variance:.2f})")

    # Post-shuffle analysis
    print("\n📊 POST-SHUFFLE Analysis:")
    for seg in ['TWK', 'TIU', 'TKP']:
        dist = get_answer_distribution(best_df, seg)
        cycle = detect_cycles(best_df, seg)
        status = "🔴 CYCLE DETECTED" if cycle.get('has_cycle') else "🟢 No cycle"
        print(f"  {seg}: {dist}  {status}")
        if cycle.get('has_cycle'):
            print(f"       Pattern: {cycle['pattern']} (repeats {cycle['repetitions']}x)")

    overall = get_answer_distribution(best_df)
    print(f"  Overall: {overall}")

    # Score integrity check (CRITICAL — Zero-Score Tampering prevention)
    print("\n🔒 Score Integrity Check:")
    if verify_score_integrity(original_df, best_df):
        print("  ✅ All scores preserved — no tampering detected.")
    else:
        print("  ❌ CRITICAL: Score tampering detected! Aborting save.")
        return False

    # Discussion consistency check (catches missed remap patterns)
    print("\n📝 Discussion Consistency Check:")
    mismatches = verify_discussion_consistency(best_df)
    if mismatches:
        print(f"  ⚠️ {len(mismatches)} discussion-score mismatch(es) found:")
        for m in mismatches:
            print(f"    Soal {m['row']}: discussion says '{m['claimed_correct']}' "
                  f"(score={m['claimed_score']}) but actual correct is "
                  f"'{m['actual_correct']}' (score={m['actual_score']})")
            print(f"      Snippet: \"{m['snippet']}\"")
        print("  ⚠️ File saved but needs manual review for these rows!")
    else:
        print("  ✅ All discussion references match score data.")

    # Save
    output_filename = filename.replace('.csv', OUTPUT_SUFFIX)
    output_path = os.path.join(DATA_DIR, output_filename)
    best_df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"\n💾 Saved to: {output_filename}")

    return True


# ============================================================
# CLI ENTRY POINT
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description='Shuffle CPNS CAT answer options & remap discussion references'
    )
    parser.add_argument(
        '--files', nargs='+', default=DEFAULT_FILES,
        help='CSV filenames to process (relative to data/csv/)'
    )
    parser.add_argument(
        '--max-attempts', type=int, default=DEFAULT_MAX_ATTEMPTS,
        help=f'Max shuffle attempts for balanced distribution (default: {DEFAULT_MAX_ATTEMPTS})'
    )
    parser.add_argument(
        '--seed', type=int, default=None,
        help='Random seed for reproducibility'
    )
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        np.random.seed(args.seed)
        print(f"🎲 Random seed set to: {args.seed}")

    print("=" * 60)
    print("🔀 CPNS Answer Shuffler with Discussion Remapping")
    print("=" * 60)
    print(f"  Data directory: {DATA_DIR}")
    print(f"  Files: {args.files}")
    print(f"  Max attempts: {args.max_attempts}")

    results = {}
    for f in args.files:
        success = process_file(f, max_attempts=args.max_attempts)
        results[f] = "✅ Success" if success else "❌ Failed"

    print(f"\n{'='*60}")
    print("📋 SUMMARY")
    print(f"{'='*60}")
    for f, status in results.items():
        print(f"  {f}: {status}")


if __name__ == '__main__':
    main()
