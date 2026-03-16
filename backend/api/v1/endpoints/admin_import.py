from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
import io
import uuid
from typing import List, Dict
from backend.db.session import get_async_session
from backend.models.models import Question, QuestionOption, Package, User
from backend.api.v1.endpoints.auth import get_current_admin
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/admin/import", tags=["admin-import"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/questions")
async def import_questions(
    package_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # 1. Check if package exists
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File terlalu besar (maks 5MB)")
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or Excel.")
        
        # Replace NaN with empty string
        df.fillna('', inplace=True)
        # Normalize column names to lowercase and strip whitespace
        df.columns = [str(col).lower().strip() for col in df.columns]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    # 2. Header Mapping (Support both English & Indonesian)
    mapping = {
        'number': ['number', 'no', 'nomor'],
        'segment': ['segment', 'segmen'],
        'content': ['content', 'teks soal', 'soal'],
        'image_url': ['image_url', 'url gambar soal', 'gambar_soal'],
        'discussion': ['discussion', 'teks pembahasan', 'pembahasan'],
        'sub_category': ['sub_category', 'materi', 'sub materi', 'kategori materi'],
        'option_a': ['option_a', 'opsi a'],
        'score_a': ['score_a', 'nilai a'],
    }
    
    # Helper to find mapped column from df
    def find_col(keys: List[str]):
        for k in keys:
            if k in df.columns: return k
        return None

    # Validate essential columns
    errors = []
    essential = {
        'num_col': find_col(['number', 'no', 'nomor']),
        'seg_col': find_col(['segment', 'segmen']),
        'con_col': find_col(['content', 'teks soal', 'soal']),
    }
    
    for key, val in essential.items():
        if not val:
            errors.append(f"Kolom wajib '{key.split('_')[0]}' tidak ditemukan (bisa gunakan: {mapping[key.split('_')[0]]})")

    # Options mapping A-E
    opt_map = {}
    for label in ['a', 'b', 'c', 'd', 'e']:
        opt_map[label] = {
            'content': find_col([f'option_{label}', f'opsi {label}']),
            'score': find_col([f'score_{label}', f'nilai {label}']),
            'image': find_col([f'option_image_{label}', f'url gambar opsi {label}'])
        }
        if not opt_map[label]['content']:
            errors.append(f"Kolom 'Opsi {label.upper()}' tidak ditemukan.")

    if errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "Validasi Header gagal.", "errors": errors}
        )

    # 3. PRE-FLIGHT VALIDATION (Dry Run)
    existing_nums_result = await db.execute(select(Question.number).where(Question.package_id == package_id))
    existing_nums = {row[0] for row in existing_nums_result.all()}
    file_nums = set()
    
    for index, row in df.iterrows():
        row_idx = index + 2
        try:
            num = int(row[essential['num_col']])
            if num in existing_nums:
                errors.append(f"Baris {row_idx}: Nomor {num} sudah ada di database.")
            if num in file_nums:
                errors.append(f"Baris {row_idx}: Nomor {num} duplikat di file.")
            file_nums.add(num)
        except:
            errors.append(f"Baris {row_idx}: Nomor soal harus angka.")

        segment = str(row[essential['seg_col']]).upper()
        if segment not in ['TWK', 'TIU', 'TKP']:
            errors.append(f"Baris {row_idx}: Segmen '{segment}' tidak valid (Harus TWK/TIU/TKP).")

        if not str(row[essential['con_col']]).strip():
            errors.append(f"Baris {row_idx}: Teks soal kosong.")

    if errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "Validasi baris gagal.", "errors": errors}
        )

    # 4. ATOMIC INSERTION
    try:
        questions_to_insert = []
        for _, row in df.iterrows():
            q_img = find_col(['image_url', 'url gambar soal', 'gambar_soal'])
            q_disc = find_col(['discussion', 'teks pembahasan', 'pembahasan'])
            
            new_question = Question(
                package_id=package_id,
                number=int(row[essential['num_col']]),
                segment=str(row[essential['seg_col']]).upper(),
                content=str(row[essential['con_col']]).strip(),
                image_url=str(row[q_img]).strip() if q_img and str(row[q_img]).strip() else None,
                discussion=str(row[q_disc]).strip() if q_disc and str(row[q_disc]).strip() else None,
                sub_category=str(row[find_col(mapping['sub_category'])]).strip() if find_col(mapping['sub_category']) and str(row[find_col(mapping['sub_category'])]).strip() else None
            )

            options = []
            for label in ['a', 'b', 'c', 'd', 'e']:
                m = opt_map[label]
                raw_score = row[m['score']] if m['score'] else 0
                try:
                    score = int(float(raw_score)) if str(raw_score).strip() != '' else 0
                except:
                    score = 0
                
                options.append(QuestionOption(
                    label=label.upper(),
                    content=str(row[m['content']]).strip(),
                    score=score,
                    image_url=str(row[m['image']]).strip() if m['image'] and str(row[m['image']]).strip() else None
                ))
            
            new_question.options = options
            questions_to_insert.append(new_question)

        db.add_all(questions_to_insert)
        await db.commit()
        
        # [TAMBAHAN]: Hapus cache agar aplikasi langsung terupdate
        await redis_service.clear_pattern("packages:*")
        await redis_service.clear_pattern("package_public:*")
        
        return {
            "status": "success", 
            "message": f"Berhasil mengimpor {len(questions_to_insert)} soal.",
            "count": len(questions_to_insert)
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
