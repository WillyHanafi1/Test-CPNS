from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
import io
import uuid
from typing import List

from backend.db.session import get_async_session
from backend.models.models import Question, QuestionOption, Package
from backend.api.v1.endpoints.auth import get_current_admin

router = APIRouter(prefix="/admin/import", tags=["admin-import"])

@router.post("/questions")
async def import_questions(
    package_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    # Check if package exists
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    content = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    # Expected columns: number, segment, content, option_a, option_b, option_c, option_d, option_e, 
    # score_a, score_b, score_c, score_d, score_e, discussion, image_url
    
    required_cols = ['number', 'segment', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e']
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

    questions_added = 0
    
    for _, row in df.iterrows():
        # Create Question
        new_question = Question(
            package_id=package_id,
            content=str(row['content']),
            segment=str(row['segment']),
            number=int(row['number']),
            image_url=str(row['image_url']) if 'image_url' in df.columns and pd.notna(row['image_url']) else None,
            discussion=str(row['discussion']) if 'discussion' in df.columns and pd.notna(row['discussion']) else None
        )
        db.add(new_question)
        await db.flush()

        # Create Options
        labels = ['A', 'B', 'C', 'D', 'E']
        for label in labels:
            col_name = f'option_{label.lower()}'
            score_col = f'score_{label.lower()}'
            
            score = 0
            if score_col in df.columns and pd.notna(row[score_col]):
                score = int(row[score_col])
            elif label == 'A': # Default score 5 for A if it was a simple correct/incorrect format? 
                # Better to be explicit in CSV. 
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
