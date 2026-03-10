from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import uuid

from backend.db.session import get_async_session
from backend.models.models import Question, QuestionOption, Package
from backend.api.v1.endpoints.auth import get_current_admin
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/admin/questions", tags=["admin-questions"])

class OptionCreate(BaseModel):
    label: str
    content: str
    score: int

class QuestionCreate(BaseModel):
    package_id: uuid.UUID
    content: str
    segment: str
    number: int
    image_url: Optional[str] = None
    discussion: Optional[str] = None
    options: List[OptionCreate]

class QuestionResponse(BaseModel):
    id: uuid.UUID
    package_id: uuid.UUID
    content: str
    segment: str
    number: int
    image_url: Optional[str] = None
    discussion: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedQuestionResponse(BaseModel):
    items: List[QuestionResponse]
    total: int
    page: int
    size: int

@router.get("/", response_model=PaginatedQuestionResponse)
async def list_questions(
    package_id: Optional[uuid.UUID] = None,
    segment: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    query = select(Question)
    if package_id:
        query = query.where(Question.package_id == package_id)
    if segment:
        query = query.where(Question.segment == segment)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.execute(count_query)
    total_count = total.scalar() or 0
    
    # Pagination
    query = query.offset((page - 1) * size).limit(size).order_by(Question.number)
    result = await db.execute(query)
    questions = result.scalars().all()
    
    return {
        "items": questions,
        "total": total_count,
        "page": page,
        "size": size
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_question(
    question_in: QuestionCreate,
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    # Check if package exists
    result = await db.execute(select(Package).where(Package.id == question_in.package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    new_question = Question(
        package_id=question_in.package_id,
        content=question_in.content,
        segment=question_in.segment,
        number=question_in.number,
        image_url=question_in.image_url,
        discussion=question_in.discussion
    )
    db.add(new_question)
    await db.flush()

    for opt in question_in.options:
        new_opt = QuestionOption(
            question_id=new_question.id,
            label=opt.label,
            content=opt.content,
            score=opt.score
        )
        db.add(new_opt)
    
    await db.commit()
    await db.refresh(new_question)
    return new_question

@router.delete("/{question_id}")
async def delete_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.delete(question)
    await db.commit()
    return {"message": "Question deleted successfully"}
