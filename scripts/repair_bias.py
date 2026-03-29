import asyncio
import pandas as pd
import os
import sys
import shutil
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.ai_service import ai_service
from backend.config import settings

def normalize_text(text: str) -> str:
    """Normalize text for robust comparison by removing punctuation and extra spaces."""
    if not text: return ""
    import re
    # Lowercase, remove non-alphanumeric, and strip
    text = str(text).lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    return " ".join(text.split())

async def repair_file(file_path, threshold=1.2, max_questions=None):
    filename = os.path.basename(file_path)
    print(f"\n[START] Memproses: {filename}", flush=True)
    
    # 0. Backup logic
    backup_dir = 'data/csv/backup'
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"{timestamp}_{filename}")
    shutil.copy2(file_path, backup_path)
    print(f"[BACKUP] File asli disimpan di: {backup_path}", flush=True)

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return

    repaired_count = 0
    
    for index, row in df.iterrows():
        if max_questions and repaired_count >= max_questions:
            break
            
        # 1. Skip Figural (Best Practice)
        has_image = pd.notna(row.get('image_url')) and str(row.get('image_url')).strip() != ""
        is_figural = any(kw in str(row['content']).lower() for kw in ['gambar', 'figural', 'pola', 'perhatikan']) and row['segment'] == 'TIU'
        
        if has_image or is_figural:
            print(f"[SKIP] Soal #{row['number']} ({row['segment']}) memiliki elemen visual/figural.", flush=True)
            continue

        # 2. Cari jawaban benar (skor 5)
        correct_opt = None
        for opt in ['a','b','c','d','e']:
            score_col = f'score_{opt}'
            if score_col in row and (row[score_col] == 5 or str(row[score_col]) == '5.0'):
                correct_opt = opt
                break
        
        if not correct_opt:
            continue
            
        # 3. Hitung Bias
        correct_text = str(row[f'option_{correct_opt}'])
        len_correct = len(correct_text)
        
        wrong_lens = []
        for o in ['a','b','c','d','e']:
            if o != correct_opt:
                val = str(row.get(f'option_{o}', ''))
                if val and val != 'nan':
                    wrong_lens.append(len(val))
        
        if not wrong_lens:
            continue
            
        avg_wrong = sum(wrong_lens) / len(wrong_lens)
        ratio = len_correct / avg_wrong if avg_wrong > 0 else 0
        
        # 4. Jika Bias > Threshold, perbaiki
        if ratio > threshold:
            print(f"[BIAS] Soal #{row['number']} ({row['segment']}) Ratio: {ratio:.2f}. Memperbaiki...", flush=True)
            
            # Use specialized prompt for distractor balancing
            new_options = await ai_service.generate_balanced_options(
                question=row['content'],
                correct_answer=correct_text,
                discussion=row.get('discussion', ''),
                segment=row['segment']
            )
            
            if new_options and all(f'option_{o}' in new_options for o in ['a','b','c','d','e']):
                # Find which letter became the correct one in AI response using ROBUST matching
                ai_correct_opt = None
                normalized_original = normalize_text(correct_text)
                
                for o in ['a', 'b', 'c', 'd', 'e']:
                    if normalize_text(new_options[f'option_{o}']) == normalized_original:
                        ai_correct_opt = o
                        break
                
                if ai_correct_opt:
                    # Collect all AI-generated distractors
                    ai_distractors = [new_options[f'option_{o}'] for o in ['a','b','c','d','e'] if o != ai_correct_opt]
                    
                    dist_idx = 0
                    for o in ['a','b','c','d','e']:
                        if o == correct_opt:
                            # 100% PRESERVE ORIGINAL TEXT
                            df.at[index, f'option_{o}'] = correct_text 
                        else:
                            if dist_idx < len(ai_distractors):
                                df.at[index, f'option_{o}'] = ai_distractors[dist_idx]
                                dist_idx += 1
                    
                    # Update scores
                    if row['segment'] != 'TKP':
                        for o in ['a','b','c','d','e']:
                            df.at[index, f'score_{o}'] = 5 if o == correct_opt else 0
                    
                    repaired_count += 1
                    print(f"[FIXED] Soal #{row['number']} ({row['segment']}) diperbarui. Kunci tetap di '{correct_opt.upper()}'.", flush=True)
                else:
                    print(f"[REJECT] Soal #{row['number']}: AI merubah isi jawaban secara signifikan (lebih dari sekadar format). Melewatkan.", flush=True)
            else:
                print(f"[ERROR] Response AI tidak lengkap untuk Soal #{row['number']}", flush=True)
            
            # Cooldown
            await asyncio.sleep(0.5)
            
    if repaired_count > 0:
        df.to_csv(file_path, index=False)
        print(f"\n[FINISH] {repaired_count} soal telah diperbaiki di {filename}", flush=True)
    else:
        print(f"\n[CLEAN] Tidak ada bias ditemukan (atau soal diloncati) di {filename}", flush=True)

async def main():
    import glob
    
    # CLI Support: Jika ada argumen, gunakan itu sebagai path file.
    # Jika tidak ada, gunakan default glob Latihan 1-6.
    if len(sys.argv) > 1:
        files = sys.argv[1:]
        print(f"Menggunakan input manual: {files}")
    else:
        # Only target Latihan 1-6 as per user requirement default
        files = sorted(glob.glob('data/csv/Latihan[1-6] - *.csv'))
        
    if not files:
        print("❌ Tidak ada file CSV ditemukan untuk diproses.")
        return
        
    for f in files:
        if os.path.exists(f):
            await repair_file(f, threshold=1.2)
        else:
            print(f"⚠️  File tidak ditemukan: {f}")

if __name__ == "__main__":
    load_dotenv('backend/.env')
    asyncio.run(main())
