"""
generate_questions.py - AI-Powered CPNS Question Generator
==========================================================
Generates full 110-question exam packages from scratch using Gemini AI,
with configurable difficulty levels (easy/medium/hard/extreme).

Usage:
    python scripts/generate_questions.py --difficulty medium --output data/csv/Latihan_AI_1.csv
    python scripts/generate_questions.py --difficulty hard --segment TWK --output data/csv/TWK_hard.csv
    python scripts/generate_questions.py --difficulty easy --dry-run
    python scripts/generate_questions.py --difficulty extreme --output data/csv/Extreme_1.csv --no-few-shot

Requires: GOOGLE_API_KEY in backend/.env
"""

import asyncio
import argparse
import pandas as pd
import os
import sys
import random
from datetime import datetime
from dotenv import load_dotenv
from collections import OrderedDict

# Fix Windows console encoding for emoji/unicode output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.ai_service import ai_service

# ==============================================================================
# CONSTANTS
# ==============================================================================

# Question distribution per segment/sub_category based on Kepmenpan RB 321/2024
# Figural excluded — slots redistributed to Verbal + Numerik
DISTRIBUTION_MAP = OrderedDict({
    "TWK": OrderedDict({
        "Nasionalisme": 7,
        "Pilar Negara": 7,
        "Integritas": 6,
        "Bela Negara": 6,
        "Bahasa Negara": 4,
    }),
    "TIU": OrderedDict({
        "Analogi": 4,
        "Silogisme": 4,
        "Analitis": 4,
        "Berhitung": 4,
        "Deret Angka": 4,
        "Perbandingan Kuantitatif": 4,
        "Soal Cerita": 5,
    }),
    "TKP": OrderedDict({
        "Pelayanan Publik": 8,
        "Jejaring Kerja": 8,
        "Sosial Budaya": 7,
        "TIK": 8,
        "Profesionalisme": 8,
        "Anti-radikalisme": 6,
    }),
})

# Few-shot examples per segment (sampled from existing CSVs for style reference)
FEW_SHOT_EXAMPLES = {
    "TWK": """
    Contoh gaya soal TWK:
    "Di era digital, gempuran produk impor dengan harga sangat murah melalui platform e-commerce asing mengancam eksistensi UMKM lokal. Sikap nasionalisme ekonomi yang paling tepat dan adaptif bagi seorang ASN dalam menyikapi fenomena ini adalah..."
    Opsi: Panjang 1-2 kalimat per opsi, kontekstual, gunakan bahasa formal birokrasi.
    Pembahasan: Jelaskan konsep dan mengapa jawaban benar paling tepat.
    """,
    "TIU": """
    Contoh gaya soal TIU Verbal:
    "AMNESTI : PIDANA = ... : ..." dengan opsi berupa pasangan kata yang memiliki relasi analog.
    
    Contoh gaya soal TIU Numerik:
    "Berapakah nilai dari $33,33\\% \\times 0,15 + 16,67\\% \\times 0,12$" dengan opsi angka.
    Pembahasan: Jelaskan langkah penyelesaian step-by-step.
    
    Contoh gaya soal TIU Analitis:
    "Lima buah mobil dengan warna berbeda diparkir berderet. Mobil Merah tidak diparkir bersebelangan..." dengan penalaran posisi.
    """,
    "TKP": """
    Contoh gaya soal TKP:
    "Anda bertugas di loket pelayanan. Sistem antrean tiba-tiba *error* dan warga mulai ricuh... Sikap Anda..."
    Opsi TKP: 5 pilihan sikap dengan gradasi dari paling tidak ideal (skor 1) sampai paling ideal (skor 5).
    Pembahasan: Jelaskan aspek kompetensi yang diuji dan mengapa gradasi tersebut logis.
    PENTING: Skor TKP bukan 0/5, melainkan gradasi 1,2,3,4,5 di setiap opsi (unik).
    """,
}

# ==============================================================================
# VALIDATION
# ==============================================================================

def validate_question(data: dict, segment: str) -> tuple[bool, str]:
    """Validate AI-generated question data. Returns (is_valid, error_message)."""
    
    # 1. Check required keys
    required_keys = ['content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
                     'score_a', 'score_b', 'score_c', 'score_d', 'score_e', 'discussion']
    for key in required_keys:
        if key not in data:
            return False, f"Missing key: {key}"
        if key.startswith('option_') or key in ('content', 'discussion'):
            if not str(data[key]).strip():
                return False, f"Empty value for: {key}"

    # 2. Score validation
    scores = [int(data[f'score_{o}']) for o in 'abcde']
    
    if segment in ('TWK', 'TIU'):
        # Exactly one score = 5, rest = 0
        if scores.count(5) != 1:
            return False, f"TWK/TIU: Expected exactly 1 score=5, got {scores.count(5)} (scores: {scores})"
        if scores.count(0) != 4:
            return False, f"TWK/TIU: Expected 4 scores=0, got {scores.count(0)} (scores: {scores})"
    else:  # TKP
        # Must be a permutation of [1,2,3,4,5]
        if sorted(scores) != [1, 2, 3, 4, 5]:
            return False, f"TKP: Scores must be permutation of [1,2,3,4,5], got {scores}"

    # 3. Length bias check
    if segment in ('TWK', 'TIU'):
        correct_opt = None
        for o in 'abcde':
            if int(data[f'score_{o}']) == 5:
                correct_opt = o
                break
        
        correct_len = len(str(data[f'option_{correct_opt}']))
        wrong_lens = [len(str(data[f'option_{o}'])) for o in 'abcde' if o != correct_opt]
        avg_wrong = sum(wrong_lens) / len(wrong_lens) if wrong_lens else 1
        
        ratio = correct_len / avg_wrong if avg_wrong > 0 else 0
        if ratio > 1.3:
            return False, f"Length bias detected: ratio={ratio:.2f} (correct={correct_len}, avg_wrong={avg_wrong:.0f})"

    # 4. Minimum content length
    if len(str(data['content'])) < 50:
        return False, f"Question content too short ({len(str(data['content']))} chars)"

    return True, "OK"


def check_duplicates(df: pd.DataFrame, threshold: float = 0.8) -> list:
    """Simple duplicate detection based on content similarity (Jaccard)."""
    duplicates = []
    contents = df['content'].tolist()
    
    for i in range(len(contents)):
        for j in range(i + 1, len(contents)):
            words_i = set(str(contents[i]).lower().split())
            words_j = set(str(contents[j]).lower().split())
            
            if not words_i or not words_j:
                continue
                
            intersection = words_i & words_j
            union = words_i | words_j
            similarity = len(intersection) / len(union) if union else 0
            
            if similarity > threshold:
                duplicates.append((i + 1, j + 1, similarity))
    
    return duplicates


# ==============================================================================
# CORE GENERATION
# ==============================================================================

async def generate_questions_for_subcategory(
    segment: str,
    sub_category: str,
    count: int,
    difficulty: str,
    regulation_context: str,
    use_few_shot: bool = True,
    start_number: int = 1,
) -> list[dict]:
    """Generate `count` questions for a specific segment/sub_category."""
    
    questions = []
    example = FEW_SHOT_EXAMPLES.get(segment, "") if use_few_shot else ""
    
    for i in range(count):
        question_num = start_number + i
        retries = 0
        max_retries = 3
        
        while retries < max_retries:
            print(f"  [GEN] Soal #{question_num} ({segment}/{sub_category}) — attempt {retries + 1}...", end=" ", flush=True)
            
            result = await ai_service.generate_full_question(
                segment=segment,
                sub_category=sub_category,
                difficulty=difficulty,
                regulation_context=regulation_context,
                example_question=example,
            )
            
            if not result:
                print("❌ Empty response", flush=True)
                retries += 1
                await asyncio.sleep(1)
                continue

            # Handle list response (Gemini sometimes returns [ { ... } ])
            if isinstance(result, list):
                if len(result) > 0:
                    result = result[0]
                else:
                    print("❌ Empty list in response", flush=True)
                    retries += 1
                    continue
            
            # Validate
            is_valid, error_msg = validate_question(result, segment)
            
            if is_valid:
                result['number'] = question_num
                result['segment'] = segment
                result['sub_category'] = sub_category
                result['image_url'] = ''  # No figural
                questions.append(result)
                print("✅", flush=True)
                break
            else:
                print(f"⚠️ Validation failed: {error_msg} (Keys: {list(result.keys())})", flush=True)
                if 'content' not in result:
                    # Print first 100 chars of result to see what's happening
                    import json
                    print(f"      DEBUG: {json.dumps(result)[:200]}...", flush=True)
                retries += 1
                await asyncio.sleep(0.5)
        
        if retries >= max_retries:
            print(f"  [SKIP] Soal #{question_num} gagal setelah {max_retries} percobaan.", flush=True)
            # Insert a placeholder so numbering doesn't break
            questions.append({
                'number': question_num,
                'segment': segment,
                'sub_category': sub_category,
                'content': f'[GAGAL GENERATE - {segment}/{sub_category}]',
                'image_url': '',
                'option_a': 'N/A', 'option_b': 'N/A', 'option_c': 'N/A', 'option_d': 'N/A', 'option_e': 'N/A',
                'score_a': 0, 'score_b': 0, 'score_c': 0, 'score_d': 0, 'score_e': 0,
                'discussion': 'Gagal di-generate oleh AI.',
            })
        
        # Cooldown between questions
        await asyncio.sleep(0.5)
    
    return questions


async def generate_full_package(
    difficulty: str,
    segment_filter: str = None,
    use_few_shot: bool = True,
    limit: int = None,
) -> pd.DataFrame:
    """Generate a complete 110-question package (or filtered by segment)."""
    
    # Load regulation context
    regulation_path = os.path.join(os.path.dirname(__file__), '..', 'kepmenpan_rb_321_2024.md')
    try:
        with open(regulation_path, 'r', encoding='utf-8') as f:
            regulation_context = f.read()
    except FileNotFoundError:
        print("⚠️ kepmenpan_rb_321_2024.md tidak ditemukan di root. Menggunakan konteks minimal.", flush=True)
        regulation_context = "Regulasi SKD CPNS berdasarkan Kepmenpan RB 321/2024. Segmen: TWK (30), TIU (35), TKP (45)."
    
    all_questions = []
    current_number = 1
    
    # Filter distribution if segment specified
    distribution = DISTRIBUTION_MAP
    if segment_filter:
        segment_filter = segment_filter.upper()
        if segment_filter not in DISTRIBUTION_MAP:
            print(f"❌ Segment '{segment_filter}' tidak valid. Pilih: TWK, TIU, TKP")
            return pd.DataFrame()
        distribution = {segment_filter: DISTRIBUTION_MAP[segment_filter]}
    
    # Calculate totals
    total_questions = sum(
        sum(min(limit or 999, abs(count)) for count in subs.values()) for subs in distribution.values()
    )
    
    print(f"\n{'='*60}")
    print(f"🚀 CPNS Question Generator")
    print(f"{'='*60}")
    print(f"  Difficulty : {difficulty.upper()}")
    print(f"  Segments   : {', '.join(distribution.keys())}")
    print(f"  Total Soal : {total_questions}")
    print(f"  Model      : {ai_service.model_name}")
    print(f"  Few-shot   : {'Yes' if use_few_shot else 'No'}")
    if limit:
        print(f"  Limit      : {limit} soal/sub-kategori")
    print(f"{'='*60}\n")
    
    for segment, subcategories in distribution.items():
        segment_total = sum(min(limit or 999, c) for c in subcategories.values())
        print(f"\n[SEGMENT] {segment} — {segment_total} soal")
        print(f"{'-'*40}")
        
        for sub_cat, count in subcategories.items():
            actual_count = min(limit or 999, count)
            print(f"\n  📝 {sub_cat} ({actual_count} soal)")
            
            questions = await generate_questions_for_subcategory(
                segment=segment,
                sub_category=sub_cat,
                count=actual_count,
                difficulty=difficulty,
                regulation_context=regulation_context,
                use_few_shot=use_few_shot,
                start_number=current_number,
            )
            
            all_questions.extend(questions)
            current_number += actual_count
    
    # Build DataFrame with exact CSV format matching admin_import.py expectations
    rows = []
    for q in all_questions:
        rows.append({
            'number': q['number'],
            'segment': q['segment'],
            'sub_category': q.get('sub_category', ''),
            'content': q.get('content', ''),
            'image_url': q.get('image_url', ''),
            'option_a': q.get('option_a', ''),
            'option_b': q.get('option_b', ''),
            'option_c': q.get('option_c', ''),
            'option_d': q.get('option_d', ''),
            'option_e': q.get('option_e', ''),
            'score_a': q.get('score_a', 0),
            'score_b': q.get('score_b', 0),
            'score_c': q.get('score_c', 0),
            'score_d': q.get('score_d', 0),
            'score_e': q.get('score_e', 0),
            'discussion': q.get('discussion', ''),
            'option_image_a': '',
            'option_image_b': '',
            'option_image_c': '',
            'option_image_d': '',
            'option_image_e': '',
        })
    
    df = pd.DataFrame(rows)
    return df


# ==============================================================================
# POST-PROCESSING
# ==============================================================================

def post_process(df: pd.DataFrame) -> pd.DataFrame:
    """Run post-processing checks on the generated DataFrame."""
    
    print(f"\n{'='*60}")
    print(f"🔍 Post-Processing & Quality Checks")
    print(f"{'='*60}")
    
    # 1. Check for failed questions
    failed = df[df['content'].str.contains('GAGAL GENERATE', na=False)]
    if len(failed) > 0:
        print(f"\n  ⚠️ {len(failed)} soal gagal di-generate (ditandai placeholder):")
        for _, row in failed.iterrows():
            print(f"     - Soal #{row['number']} ({row['segment']}/{row['sub_category']})")
    
    # 2. Distribution check
    print(f"\n  📊 Distribusi soal:")
    for segment in ['TWK', 'TIU', 'TKP']:
        seg_df = df[df['segment'] == segment]
        if len(seg_df) > 0:
            print(f"     {segment}: {len(seg_df)} soal")
            for sub in seg_df['sub_category'].unique():
                sub_count = len(seg_df[seg_df['sub_category'] == sub])
                print(f"       └─ {sub}: {sub_count}")
    
    # 3. Score integrity
    score_issues = 0
    for _, row in df.iterrows():
        scores = [int(row[f'score_{o}']) for o in 'abcde']
        segment = row['segment']
        
        if segment in ('TWK', 'TIU'):
            if scores.count(5) != 1 or scores.count(0) != 4:
                score_issues += 1
        elif segment == 'TKP':
            if sorted(scores) != [1, 2, 3, 4, 5]:
                score_issues += 1
    
    if score_issues > 0:
        print(f"\n  ❌ {score_issues} soal memiliki skor tidak valid!")
    else:
        print(f"\n  ✅ Semua skor valid.")
    
    # 4. Length bias check
    bias_count = 0
    for _, row in df.iterrows():
        if row['segment'] in ('TWK', 'TIU') and '[GAGAL' not in str(row['content']):
            correct_opt = None
            for o in 'abcde':
                if int(row[f'score_{o}']) == 5:
                    correct_opt = o
                    break
            if correct_opt:
                correct_len = len(str(row[f'option_{correct_opt}']))
                wrong_lens = [len(str(row[f'option_{o}'])) for o in 'abcde' if o != correct_opt]
                avg_wrong = sum(wrong_lens) / len(wrong_lens) if wrong_lens else 1
                ratio = correct_len / avg_wrong if avg_wrong > 0 else 0
                if ratio > 1.2:
                    bias_count += 1
    
    if bias_count > 0:
        print(f"  ⚠️ {bias_count} soal TWK/TIU memiliki length bias > 1.2")
    else:
        print(f"  ✅ Tidak ada length bias terdeteksi.")
    
    # 5. Duplicate check
    dupes = check_duplicates(df, threshold=0.7)
    if dupes:
        print(f"  ⚠️ {len(dupes)} pasangan soal berpotensi duplikat:")
        for d in dupes[:5]:
            print(f"     - Soal #{d[0]} vs #{d[1]} (similarity: {d[2]:.2f})")
    else:
        print(f"  ✅ Tidak ada duplikat terdeteksi.")
    
    print(f"\n{'='*60}\n")
    return df


# ==============================================================================
# CLI & MAIN
# ==============================================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="🚀 AI CPNS Question Generator — Generate soal CPNS dari nol menggunakan Gemini AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/generate_questions.py --difficulty medium --output data/csv/Latihan_AI_1.csv
  python scripts/generate_questions.py --difficulty hard --segment TWK
  python scripts/generate_questions.py --difficulty extreme --dry-run
  python scripts/generate_questions.py --difficulty easy --no-few-shot
        """
    )
    
    parser.add_argument(
        '--difficulty', '-d',
        choices=['easy', 'medium', 'hard', 'extreme'],
        required=True,
        help='Tingkat kesulitan soal'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Path output CSV (default: data/csv/Generated_{difficulty}_{timestamp}.csv)'
    )
    parser.add_argument(
        '--segment', '-s',
        type=str,
        default=None,
        choices=['TWK', 'TIU', 'TKP', 'twk', 'tiu', 'tkp'],
        help='Filter hanya segment tertentu (opsional)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview distribusi tanpa generate (tidak memanggil AI)'
    )
    parser.add_argument(
        '--no-few-shot',
        action='store_true',
        help='Disable few-shot examples di prompt'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Maksimal jumlah soal per sub-kategori (untuk testing)'
    )
    
    return parser.parse_args()


async def main():
    args = parse_args()
    
    # Dry-run: show distribution only
    if args.dry_run:
        distribution = DISTRIBUTION_MAP
        if args.segment:
            seg = args.segment.upper()
            distribution = {seg: DISTRIBUTION_MAP[seg]}
        
        total = 0
        print(f"\n📋 Distribusi soal (difficulty: {args.difficulty.upper()}):\n")
        for segment, subs in distribution.items():
            seg_total = sum(subs.values())
            print(f"  {segment} ({seg_total} soal):")
            for sub, count in subs.items():
                print(f"    └─ {sub}: {count}")
            total += seg_total
        print(f"\n  TOTAL: {total} soal")
        print(f"\n  ℹ️ Jalankan tanpa --dry-run untuk mulai generate.\n")
        return
    
    # Check AI service
    if not ai_service.client:
        print("❌ GOOGLE_API_KEY tidak tersedia. Pastikan backend/.env sudah diisi.")
        return
    
    # Generate
    start_time = datetime.now()
    
    df = await generate_full_package(
        difficulty=args.difficulty,
        segment_filter=args.segment,
        use_few_shot=not args.no_few_shot,
        limit=args.limit,
    )
    
    if df.empty:
        print("❌ Tidak ada soal yang berhasil di-generate.")
        return
    
    # Post-process
    df = post_process(df)
    
    # Determine output path
    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        seg_suffix = f"_{args.segment.upper()}" if args.segment else ""
        output_path = f"data/csv/Generated_{args.difficulty}{seg_suffix}_{timestamp}.csv"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save
    df.to_csv(output_path, index=False)
    
    elapsed = (datetime.now() - start_time).total_seconds()
    valid_count = len(df[~df['content'].str.contains('GAGAL GENERATE', na=False)])
    failed_count = len(df[df['content'].str.contains('GAGAL GENERATE', na=False)])
    
    print(f"{'='*60}")
    print(f"📦 SUMMARY")
    print(f"{'='*60}")
    print(f"  Output    : {output_path}")
    print(f"  Difficulty: {args.difficulty.upper()}")
    print(f"  Generated : {valid_count} soal ✅")
    if failed_count > 0:
        print(f"  Failed    : {failed_count} soal ❌")
    print(f"  Duration  : {elapsed:.1f} detik ({elapsed/60:.1f} menit)")
    print(f"  Status    : Siap import via Admin Panel 🎯")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    load_dotenv('backend/.env')
    asyncio.run(main())
