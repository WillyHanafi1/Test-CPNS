from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
import io
import uuid
from typing import List

from backend.db.session import get_async_session
from backend.models.models import Question, QuestionOption, Package, User
from backend.api.v1.endpoints.auth import get_current_admin

router = APIRouter(prefix="/admin/import", tags=["admin-import"])

@router.post("/questions")
async def import_questions(
    package_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    
    # Check if package exists
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
        
        # FIX: Replace NaN with empty string to avoid "nan" string conversion
        df.fillna('', inplace=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    # Expected columns: number, segment, content, option_a, option_b, option_c, option_d, option_e, 
    # score_a, score_b, score_c, score_d, score_e, discussion, image_url
    
    required_cols = ['number', 'segment', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e']
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

    # Prefetch existing question numbers in the package to prevent duplicates
    from sqlalchemy import select
    existing_nums_result = await db.execute(select(Question.number).where(Question.package_id == package_id))
    existing_nums = {row[0] for row in existing_nums_result.all()}
    
    # Check duplicates within the file itself
    if df['number'].duplicated().any():
        raise HTTPException(status_code=400, detail="Terdapat duplikasi nomor soal di dalam file unggahan")
        
    for num in df['number']:
        if int(num) in existing_nums:
            raise HTTPException(status_code=409, detail=f"Nomor soal {int(num)} sudah digunakan di paket ini")

    questions_added = 0
    
    try:
        for _, row in df.iterrows():
            # Extract safe values
            image_url = str(row['image_url']).strip() if 'image_url' in df.columns else ""
            discussion = str(row['discussion']).strip() if 'discussion' in df.columns else ""
            
            # Create Question
            new_question = Question(
                package_id=package_id,
                content=str(row['content']),
                segment=str(row['segment']),
                number=int(row['number']),
                image_url=image_url if image_url else None,
                discussion=discussion if discussion else None
            )
            db.add(new_question)
            await db.flush()

        # Create Options
        labels = ['A', 'B', 'C', 'D', 'E']
        for label in labels:
            col_name = f'option_{label.lower()}'
            score_col = f'score_{label.lower()}'
            
            # Safer score conversion: handle empty strings and float-like strings from Pandas
            score = 0
            if score_col in df.columns and str(row[score_col]).strip() != '':
                try:
                    score = int(float(row[score_col])) 
                except (ValueError, TypeError):
                    score = 0
            elif label == 'A': 
                pass

            new_opt = QuestionOption(
                question_id=new_question.id,
                label=label,
                content=str(row[col_name]),
                score=score
            )
            db.add(new_opt)
        
        questions_added += 1

        await db.commit()
        return {"message": f"Successfully imported {questions_added} questions", "count": questions_added}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=422, detail=f"Import gagal di baris {questions_added + 1}: {str(e)}")
