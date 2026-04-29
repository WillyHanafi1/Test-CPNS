"""
quality_audit.py — AI-Powered Self-Healing Quality Audit Pipeline
=================================================================
Two-pass system that evaluates CPNS question quality using AI-as-Judge,
then auto-remediates flagged questions via AI-as-Fixer.

Pass 1 (Screening): Send all questions per segment to AI Judge → get scores + flags
Pass 2 (Remediation): For flagged questions, send to AI Fixer with critique → regenerate

Usage:
    python scripts/quality_audit.py data/csv/Hard3.csv
    python scripts/quality_audit.py data/csv/Hard3.csv --fix               # Auto-fix flagged questions
    python scripts/quality_audit.py data/csv/Hard3.csv --fix --max-retries 3
    python scripts/quality_audit.py data/csv/Hard3.csv --threshold 3.5     # Custom flag threshold
    python scripts/quality_audit.py data/csv/Hard3.csv --segment TWK       # Only audit TWK

Requires: GOOGLE_API_KEY in backend/.env
"""

import asyncio
import argparse
import pandas as pd
import json
import os
import sys
import re
import time
# traceback removed — retry loops handle errors inline
from datetime import datetime
from dotenv import load_dotenv

# Fix Windows console encoding for emoji/unicode output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.ai_service import ai_service
from google.genai import types
from google.genai.errors import ClientError


# ==============================================================================
# RATE LIMITER (Token Bucket)
# ==============================================================================

class RateLimiter:
    """Token-bucket rate limiter to respect Gemini API's 25 RPM quota.
    
    We cap at RPM_LIMIT (default 20) to leave headroom for retries.
    Before each API call, acquire() will async-wait until a slot is available.
    """
    
    def __init__(self, rpm: int = 20):
        self.rpm = rpm
        self.window = 60.0  # 1 minute window
        self._timestamps: list[float] = []
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        """Wait until a rate-limit slot is available, then consume it."""
        while True:
            async with self._lock:
                now = time.monotonic()
                # Purge timestamps older than the window
                self._timestamps = [t for t in self._timestamps if now - t < self.window]
                
                if len(self._timestamps) < self.rpm:
                    self._timestamps.append(now)
                    return  # Slot acquired
                
                # Calculate wait time until the oldest slot expires
                wait_time = self._timestamps[0] + self.window - now + 0.5
            
            print(f"    ⏳ Rate limit ({self.rpm} RPM): waiting {wait_time:.0f}s...", flush=True)
            await asyncio.sleep(wait_time)


# Global rate limiter instance
rate_limiter = RateLimiter(rpm=20)

# ==============================================================================
# CONSTANTS & PROMPTS
# ==============================================================================

JUDGE_SYSTEM_PROMPT = """Kamu adalah Senior Reviewer Soal CPNS dengan pengalaman 15 tahun di BKN.
Tugasmu adalah MENGAUDIT kualitas soal-soal berikut secara KRITIS dan KETAT.

Untuk SETIAP soal, evaluasi berdasarkan 6 dimensi (skor 1-5 per dimensi):

### D1: Konsistensi Pembahasan-Skor
- Cek apakah SETIAP huruf opsi (A/B/C/D/E) yang disebut di pembahasan COCOK dengan data skor.
- Cek apakah ada DUPLIKASI huruf (misal: "Opsi D dan D").
- Cek apakah pembahasan menyebut opsi dengan skor tertinggi sebagai jawaban benar.
- Skor 1 = ada mismatch fatal. Skor 5 = 100% konsisten.

### D2: Akurasi Faktual
- Apakah fakta/data/pasal/UU yang disebut di soal BENAR?
- Untuk TWK: cek kebenaran pasal UUD, nama lembaga, sejarah.
- Untuk TIU: cek kebenaran logika, perhitungan matematika.
- Untuk TKP: cek kewajaran skenario ASN.
- Skor 1 = ada kesalahan fatal. Skor 5 = 100% akurat.

### D3: Kualitas Pengecoh (Distractor)
- Apakah 4 opsi salah MASUK AKAL dan bisa mengecoh?
- Apakah ada 2 opsi yang TERLALU MIRIP sehingga ambigu?
- Apakah ada opsi yang JELAS SALAH sehingga bisa dieliminasi langsung?
- Skor 1 = pengecoh asal-asalan. Skor 5 = semua pengecoh plausibel.

### D4: Kejelasan Bahasa & Narasi
- Apakah stem soal TERLALU PANJANG (>150 kata)?
- Apakah ada kalimat AMBIGU atau DOUBLE NEGASI yang membingungkan?
- Apakah bahasa Indonesia BAKU dan tidak bertele-tele?
- Skor 1 = sulit dipahami. Skor 5 = jelas dan ringkas.

### D5: Level Kognitif (Bloom's Taxonomy)
- Untuk difficulty "hard": soal HARUS minimal C4 (Analisis).
- Apakah soal hanya mengukur HAFALAN (C1-C2)? Jika ya, skor rendah.
- Skor 1 = hanya hafalan. Skor 5 = analisis/evaluasi tingkat tinggi.

### D6: Kesesuaian Format CAT
- Apakah soal bisa ditampilkan dengan baik di layar CAT standar?
- Apakah ada referensi gambar/tabel yang tidak tersedia?
- Apakah opsi jawaban tidak terlalu panjang (masing-masing < 80 kata)?
- Skor 1 = tidak cocok untuk CAT. Skor 5 = sempurna untuk CAT.

ATURAN PENILAIAN:
- Status "FLAG" jika rata-rata < {threshold} ATAU ada dimensi apapun dengan skor <= 2.
- Field "issues" WAJIB diisi jika status = "FLAG". Jelaskan secara SPESIFIK apa yang salah.
- Jika status = "PASS", issues boleh kosong array.

FORMAT OUTPUT (JSON ARRAY):
[
    {{
        "nomor": <number>,
        "scores": {{
            "konsistensi": <1-5>,
            "akurasi": <1-5>,
            "pengecoh": <1-5>,
            "kejelasan": <1-5>,
            "bloom": <1-5>,
            "format_cat": <1-5>
        }},
        "rata_rata": <float rounded to 1 decimal>,
        "status": "PASS" | "FLAG",
        "issues": ["deskripsi masalah 1", "..."]
    }},
    ...
]
"""


FIXER_PROMPT_TEMPLATE = """Kamu adalah pembuat soal CPNS profesional tingkat BKN.
Soal berikut telah di-review oleh Senior Reviewer dan ditemukan masalah yang harus diperbaiki.

<soal_asli>
  <nomor>{number}</nomor>
  <kategori>{segment}</kategori>
  <sub_kategori>{sub_category}</sub_kategori>
  <teks_soal>{question_text}</teks_soal>
  <opsi>
    A: {option_a} (skor: {score_a})
    B: {option_b} (skor: {score_b})
    C: {option_c} (skor: {score_c})
    D: {option_d} (skor: {score_d})
    E: {option_e} (skor: {score_e})
  </opsi>
  <pembahasan>{discussion}</pembahasan>
</soal_asli>

<kritik_reviewer>
{issues}
</kritik_reviewer>

INSTRUKSI PERBAIKAN:
1. PERBAIKI soal berdasarkan kritik di atas.
2. PERTAHANKAN sub_kategori, tingkat kesulitan, dan tema yang sama.
3. SANGAT PENTING — SKOR TIDAK BOLEH BERUBAH:
   score_a={score_a}, score_b={score_b}, score_c={score_c}, score_d={score_d}, score_e={score_e}
   Kamu hanya boleh mengubah TEKS soal, TEKS opsi, dan TEKS pembahasan.
4. PASTIKAN pembahasan menyebut huruf opsi yang KONSISTEN dengan skor.
   Opsi dengan skor tertinggi HARUS disebut sebagai jawaban paling tepat.
5. Jika stem terlalu panjang, PANGKAS tanpa mengurangi substansi.
6. HINDARI double negasi ambigu. Gunakan kalimat positif yang jelas.
7. Pastikan SETIAP pengecoh berbeda dan plausibel.

FORMAT OUTPUT (JSON VALID):
{{
    "content": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "option_e": "...",
    "discussion": "...",
    "fixes_applied": ["perbaikan 1", "perbaikan 2"]
}}

PERINGATAN: Jangan ubah skor. Hanya teks konten yang boleh berubah.
"""


# ==============================================================================
# PASS 1: AI JUDGE (SCREENING)
# ==============================================================================

def _extract_json(text: str) -> str:
    """Extract JSON string from markdown code blocks if present."""
    text = text.strip()
    if text.startswith("```json"):
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    elif text.startswith("```"):
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text


def _format_question_for_judge(row: pd.Series) -> str:
    """Format a single question row for the Judge prompt."""
    scores_str = ", ".join(f"{o.upper()}={row.get(f'score_{o}', 0)}" for o in 'abcde')
    options_str = "\n".join(
        f"    {o.upper()}: {row.get(f'option_{o}', '')} (skor: {row.get(f'score_{o}', 0)})"
        for o in 'abcde'
    )
    return f"""
--- Soal #{row['number']} [{row.get('sub_category', '')}] ---
Teks: {row.get('content', '')}
Opsi:
{options_str}
Skor: [{scores_str}]
Pembahasan: {row.get('discussion', '')}
"""


async def judge_batch(
    df: pd.DataFrame,
    segment: str,
    threshold: float = 4.0,
) -> list[dict]:
    """Pass 1: Send all questions of a segment to AI Judge for screening."""
    
    seg_df = df[df['segment'] == segment].copy()
    if seg_df.empty:
        return []
    
    # Format all questions for the prompt
    questions_text = ""
    for _, row in seg_df.iterrows():
        questions_text += _format_question_for_judge(row)
    
    prompt = JUDGE_SYSTEM_PROMPT.format(threshold=threshold)
    prompt += f"\n\nBerikut {len(seg_df)} soal segment {segment} yang harus di-audit:\n"
    prompt += questions_text
    
    print(f"  [JUDGE] Mengirim {len(seg_df)} soal {segment} ke AI Judge...", flush=True)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            await rate_limiter.acquire()
            response = await ai_service.client.aio.models.generate_content(
                model=ai_service.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            
            clean_json = _extract_json(response.text)
            result = json.loads(clean_json, strict=False)
            
            if isinstance(result, dict):
                result = [result]
            
            if not isinstance(result, list):
                print(f"  [JUDGE] ⚠️ Unexpected response type: {type(result)}", flush=True)
                continue
            
            print(f"  [JUDGE] ✅ Received {len(result)} evaluations for {segment}", flush=True)
            return result
            
        except ClientError as e:
            if '429' in str(e) or 'RESOURCE_EXHAUSTED' in str(e):
                backoff = 35 + (attempt * 10)
                print(f"  [JUDGE] ⏳ Rate limited, waiting {backoff}s (attempt {attempt+1}/{max_retries})...", flush=True)
                await asyncio.sleep(backoff)
            else:
                print(f"  [JUDGE] ❌ Error pada attempt {attempt+1}: {e}", flush=True)
                await asyncio.sleep(5)
        except Exception as e:
            print(f"  [JUDGE] ❌ Error pada attempt {attempt+1}: {e}", flush=True)
            await asyncio.sleep(5)
            
    print(f"  [JUDGE] ❌ Gagal mendapatkan evaluasi untuk {segment} setelah {max_retries} percobaan.", flush=True)
    return []


# ==============================================================================
# PASS 2: AI FIXER (REMEDIATION)
# ==============================================================================

async def fix_question(
    row: pd.Series,
    issues: list[str],
    max_retries: int = 3,
) -> dict | None:
    """Pass 2: Send a flagged question to AI Fixer for remediation.
    
    Uses global rate_limiter to respect RPM quota and exponential backoff
    with API-suggested retry delays on 429 errors.
    """
    
    issues_text = "\n".join(f"  {i+1}. {issue}" for i, issue in enumerate(issues))
    
    prompt = FIXER_PROMPT_TEMPLATE.format(
        number=row['number'],
        segment=row['segment'],
        sub_category=row.get('sub_category', ''),
        question_text=row.get('content', ''),
        option_a=row.get('option_a', ''),
        option_b=row.get('option_b', ''),
        option_c=row.get('option_c', ''),
        option_d=row.get('option_d', ''),
        option_e=row.get('option_e', ''),
        score_a=row.get('score_a', 0),
        score_b=row.get('score_b', 0),
        score_c=row.get('score_c', 0),
        score_d=row.get('score_d', 0),
        score_e=row.get('score_e', 0),
        discussion=row.get('discussion', ''),
        issues=issues_text,
    )
    
    for attempt in range(max_retries):
        try:
            # Wait for a rate-limit slot before calling API
            await rate_limiter.acquire()
            
            response = await ai_service.client.aio.models.generate_content(
                model=ai_service.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            
            clean_json = _extract_json(response.text)
            result = json.loads(clean_json, strict=False)
            
            if not isinstance(result, dict):
                print(f"    [FIX] ⚠️ Unexpected type: {type(result)}", flush=True)
                continue
            
            # Validate scores haven't changed
            scores_ok = True
            for o in 'abcde':
                expected = int(float(row.get(f'score_{o}', 0) or 0))
                actual = int(float(result.get(f'score_{o}', expected)))
                if actual != expected:
                    scores_ok = False
                    break
            
            if not scores_ok:
                print(f"    [FIX] ⚠️ Skor berubah! Retry...", flush=True)
                continue
            
            # Validate required fields are non-empty
            required = ['content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'discussion']
            if all(str(result.get(k, '')).strip() for k in required):
                return result
            else:
                print(f"    [FIX] ⚠️ Empty fields detected. Retry...", flush=True)
                
        except ClientError as e:
            if '429' in str(e) or 'RESOURCE_EXHAUSTED' in str(e):
                # Extract retry delay from API response, default 35s
                backoff = 35 + (attempt * 10)  # Exponential: 35s, 45s, 55s
                print(f"    [FIX] ⏳ Rate limited, waiting {backoff}s (attempt {attempt+1}/{max_retries})...", flush=True)
                await asyncio.sleep(backoff)
            else:
                print(f"    [FIX] ❌ Attempt {attempt+1} error: {e}", flush=True)
                await asyncio.sleep(5)
        except Exception as e:
            print(f"    [FIX] ❌ Attempt {attempt+1} error: {e}", flush=True)
            await asyncio.sleep(5)
    
    return None


# ==============================================================================
# MAIN PIPELINE
# ==============================================================================

async def run_audit(
    input_path: str,
    threshold: float = 4.0,
    auto_fix: bool = False,
    max_retries: int = 3,
    segment_filter: str = None,
    output_path: str = None,
):
    """Main audit pipeline: Judge → Report → (optional) Fix → Re-judge → Save."""
    
    # Load CSV
    print(f"\n{'='*60}")
    print(f"🔍 CPNS Quality Audit Pipeline")
    print(f"{'='*60}")
    
    try:
        df = pd.read_csv(input_path)
    except Exception as e:
        print(f"❌ Error reading {input_path}: {e}")
        return
    
    print(f"  Input    : {input_path}")
    print(f"  Soal     : {len(df)}")
    print(f"  Threshold: {threshold}")
    print(f"  Auto-fix : {'Yes' if auto_fix else 'No (report only)'}")
    print(f"  Model    : {ai_service.model_name}")
    
    segments = [segment_filter.upper()] if segment_filter else ['TWK', 'TIU', 'TKP']
    segments = [s for s in segments if s in df['segment'].unique()]
    
    print(f"  Segments : {', '.join(segments)}")
    print(f"{'='*60}\n")
    
    # ── PASS 1: JUDGE ──────────────────────────────────────────────
    all_evaluations = []
    flagged_questions = []  # (row_index, row_data, issues)
    
    for segment in segments:
        print(f"\n📋 PASS 1: Evaluating {segment}...", flush=True)
        print(f"{'-'*40}", flush=True)
        
        evaluations = await judge_batch(df, segment, threshold)
        
        if not evaluations:
            print(f"  ⚠️ No evaluations received for {segment}", flush=True)
            continue
        
        # Process evaluations
        seg_df = df[df['segment'] == segment]
        pass_count = 0
        flag_count = 0
        
        for eval_item in evaluations:
            nomor = eval_item.get('nomor', 0)
            status = eval_item.get('status', 'PASS')
            try:
                rata_rata = float(eval_item.get('rata_rata', 5.0))
            except (ValueError, TypeError):
                rata_rata = 5.0
            issues = eval_item.get('issues', [])
            scores = eval_item.get('scores', {})
            
            eval_item['segment'] = segment
            all_evaluations.append(eval_item)
            
            if status == 'FLAG':
                flag_count += 1
                # Find the matching row in the DataFrame
                matching = seg_df[seg_df['number'] == nomor]
                if not matching.empty:
                    row_idx = matching.index[0]
                    flagged_questions.append((row_idx, df.loc[row_idx], issues))
                    
                    # Print flag details
                    scores_str = ", ".join(f"{k}={v}" for k, v in scores.items())
                    print(f"  🔴 Soal #{nomor}: rata={rata_rata:.1f} [{scores_str}]", flush=True)
                    for iss in issues[:2]:
                        print(f"      → {iss[:100]}", flush=True)
            else:
                pass_count += 1
        
        print(f"\n  📊 {segment}: {pass_count} PASS, {flag_count} FLAG", flush=True)
    
    # ── REPORT ─────────────────────────────────────────────────────
    total_pass = sum(1 for e in all_evaluations if e.get('status') == 'PASS')
    total_flag = sum(1 for e in all_evaluations if e.get('status') == 'FLAG')
    total_evaluated = len(all_evaluations)
    
    print(f"\n{'='*60}")
    print(f"📊 AUDIT REPORT (Pass 1)")
    print(f"{'='*60}")
    print(f"  Total Evaluated : {total_evaluated}")
    print(f"  ✅ PASS         : {total_pass} ({total_pass/total_evaluated*100:.0f}%)" if total_evaluated else "  N/A")
    print(f"  🔴 FLAG         : {total_flag} ({total_flag/total_evaluated*100:.0f}%)" if total_evaluated else "  N/A")
    
    # Dimension averages
    if all_evaluations:
        dims = ['konsistensi', 'akurasi', 'pengecoh', 'kejelasan', 'bloom', 'format_cat']
        print(f"\n  Rata-rata per Dimensi:")
        for dim in dims:
            vals = [e.get('scores', {}).get(dim, 0) for e in all_evaluations if e.get('scores')]
            avg = sum(vals) / len(vals) if vals else 0
            bar = "█" * int(avg) + "░" * (5 - int(avg))
            emoji = "✅" if avg >= 4.0 else "⚠️" if avg >= 3.0 else "❌"
            print(f"    {emoji} {dim:<15}: {avg:.1f}/5.0 {bar}")
    
    # ── PASS 2: FIX (optional) ──────────────────────────────────────
    fixes_applied = 0
    fixes_failed = 0
    _counter_lock = asyncio.Lock()  # Protect shared counters in concurrent tasks
    
    if auto_fix and flagged_questions:
        print(f"\n{'='*60}")
        print(f"🔧 PASS 2: Auto-fixing {len(flagged_questions)} flagged questions...")
        print(f"{'='*60}")
        
        # Process in waves of WAVE_SIZE to respect RPM limits
        # With RPM=20 and each call taking ~15-30s, waves of 10 are safe
        WAVE_SIZE = 10
        total_waves = (len(flagged_questions) + WAVE_SIZE - 1) // WAVE_SIZE
        
        print(f"  Strategy: {len(flagged_questions)} soal dalam {total_waves} wave (maks {WAVE_SIZE}/wave)")
        print(f"  Rate limit: {rate_limiter.rpm} RPM\n")
        
        async def _fix_one(item):
            nonlocal fixes_applied, fixes_failed
            row_idx, row, issues = item
            
            print(f"  [FIX] Soal #{row['number']} ({row['segment']}/{row.get('sub_category', '')})...", end=" ", flush=True)
            
            fixed = await fix_question(row, issues, max_retries=max_retries)
            
            if fixed:
                # Apply fixes to DataFrame
                for field in ['content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'discussion']:
                    if field in fixed and str(fixed[field]).strip():
                        df.at[row_idx, field] = fixed[field]
                
                fixes_str = ", ".join(fixed.get('fixes_applied', [])[:2])
                print(f"✅ [{fixes_str}]", flush=True)
                async with _counter_lock:
                    fixes_applied += 1
            else:
                print(f"❌ Gagal setelah {max_retries} retry", flush=True)
                async with _counter_lock:
                    fixes_failed += 1
        
        # Process in waves with cooldown between waves
        for wave_idx in range(total_waves):
            start = wave_idx * WAVE_SIZE
            end = min(start + WAVE_SIZE, len(flagged_questions))
            wave = flagged_questions[start:end]
            
            print(f"\n  --- Wave {wave_idx + 1}/{total_waves} ({len(wave)} soal) ---", flush=True)
            
            await asyncio.gather(*[_fix_one(item) for item in wave])
            
            # Cooldown between waves to let RPM window reset
            if wave_idx < total_waves - 1:
                cooldown = 15  # 15s cooldown between waves
                print(f"  ⏳ Cooldown {cooldown}s sebelum wave berikutnya...", flush=True)
                await asyncio.sleep(cooldown)
        
        print(f"\n  📊 Fix Results: {fixes_applied} berhasil, {fixes_failed} gagal")
    
    # ── PASS 3: RE-JUDGE fixed questions (optional) ─────────────────
    if auto_fix and fixes_applied > 0:
        print(f"\n{'='*60}")
        print(f"🔄 PASS 3: Re-judging {fixes_applied} fixed questions...")
        print(f"{'='*60}\n")
        
        # Re-evaluate only fixed segments
        fixed_segments = set()
        for row_idx, row, _ in flagged_questions:
            fixed_segments.add(row['segment'])
        
        re_pass = 0
        re_flag = 0
        
        for segment in fixed_segments:
            await rate_limiter.acquire()  # Respect RPM before re-judge
            re_evaluations = await judge_batch(df, segment, threshold)
            for eval_item in re_evaluations:
                if eval_item.get('status') == 'FLAG':
                    re_flag += 1
                    nomor = eval_item.get('nomor', '?')
                    print(f"  ⚠️ Soal #{nomor} masih FLAG setelah fix — perlu review manual", flush=True)
                else:
                    re_pass += 1
        
        print(f"\n  📊 Re-judge: {re_pass} PASS, {re_flag} masih FLAG")
        if re_flag > 0:
            print(f"  ⚠️ {re_flag} soal memerlukan review MANUAL oleh Subject Matter Expert")
    
    # ── SAVE ──────────────────────────────────────────────────────
    if auto_fix and fixes_applied > 0:
        if not output_path:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_Validated{ext}"
        
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"\n  💾 Saved: {output_path}")
    
    # ── FINAL SUMMARY ─────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"📦 FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"  Input          : {input_path}")
    print(f"  Total Soal     : {len(df)}")
    print(f"  Evaluated      : {total_evaluated}")
    print(f"  Pass (Pass 1)  : {total_pass}")
    print(f"  Flagged        : {total_flag}")
    
    if auto_fix:
        print(f"  Fixed          : {fixes_applied}")
        print(f"  Fix Failed     : {fixes_failed}")
        if output_path:
            print(f"  Output         : {output_path}")
    else:
        if total_flag > 0:
            print(f"\n  💡 Tip: Jalankan dengan --fix untuk auto-perbaiki {total_flag} soal yang di-flag")
    
    print(f"{'='*60}\n")
    
    # Save audit report as JSON
    report_path = os.path.splitext(input_path)[0] + "_audit_report.json"
    report = {
        "timestamp": datetime.now().isoformat(),
        "input_file": input_path,
        "threshold": threshold,
        "total_questions": len(df),
        "total_evaluated": total_evaluated,
        "total_pass": total_pass,
        "total_flag": total_flag,
        "fixes_applied": fixes_applied if auto_fix else None,
        "evaluations": all_evaluations,
    }
    
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"  📄 Audit report saved: {report_path}")


# ==============================================================================
# CLI
# ==============================================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="🔍 AI-Powered Quality Audit Pipeline — Evaluate & auto-fix CPNS questions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/quality_audit.py data/csv/Hard3.csv                    # Audit only (report)
  python scripts/quality_audit.py data/csv/Hard3.csv --fix              # Audit + auto-fix
  python scripts/quality_audit.py data/csv/Hard3.csv --fix --threshold 3.0
  python scripts/quality_audit.py data/csv/Hard3.csv --segment TIU      # Only audit TIU
        """
    )
    
    parser.add_argument(
        'input',
        type=str,
        help='Path ke file CSV soal yang akan di-audit'
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Aktifkan auto-fix untuk soal yang di-flag (default: report only)'
    )
    parser.add_argument(
        '--threshold', '-t',
        type=float,
        default=4.0,
        help='Minimum rata-rata skor untuk PASS (default: 4.0)'
    )
    parser.add_argument(
        '--max-retries', '-r',
        type=int,
        default=3,
        help='Maksimal percobaan perbaikan per soal (default: 3)'
    )
    parser.add_argument(
        '--segment', '-s',
        type=str,
        default=None,
        choices=['TWK', 'TIU', 'TKP', 'twk', 'tiu', 'tkp'],
        help='Filter hanya segment tertentu (opsional)'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Path output CSV (default: {input}_Validated.csv)'
    )
    
    return parser.parse_args()


if __name__ == "__main__":
    load_dotenv('backend/.env')
    args = parse_args()
    
    if not ai_service.client:
        print("❌ GOOGLE_API_KEY tidak tersedia. Pastikan backend/.env sudah diisi.")
        sys.exit(1)
    
    asyncio.run(run_audit(
        input_path=args.input,
        threshold=args.threshold,
        auto_fix=args.fix,
        max_retries=args.max_retries,
        segment_filter=args.segment,
        output_path=args.output,
    ))
