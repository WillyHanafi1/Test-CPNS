from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import uuid

from backend.db.session import get_async_session
from backend.models.models import Question, QuestionOption, Package, User
from backend.api.v1.endpoints.auth import get_current_admin
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import selectinload
from sqlalchemy import delete

router = APIRouter(prefix="/admin/questions", tags=["admin-questions"], strict_slashes=False)

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
    
    @field_validator('options')
    @classmethod
    def validate_options(cls, v):
        if len(v) < 2:
            raise ValueError('Minimal 2 opsi jawaban diperlukan')
        return v

class OptionUpdate(BaseModel):
    id: Optional[uuid.UUID] = None
    label: str
    content: str
    score: int

class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    segment: Optional[str] = None
    number: Optional[int] = None
    image_url: Optional[str] = None
    discussion: Optional[str] = None
    options: Optional[List[OptionUpdate]] = None
    
    @field_validator('options')
    @classmethod
    def validate_options(cls, v):
        if v is not None and len(v) < 2:
            raise ValueError('Minimal 2 opsi jawaban diperlukan')
        return v

class OptionResponse(BaseModel):
    id: uuid.UUID
    label: str
    content: str
    score: int
    model_config = ConfigDict(from_attributes=True)

class QuestionResponse(BaseModel):
    id: uuid.UUID
    package_id: uuid.UUID
    content: str
    segment: str
    number: int
    image_url: Optional[str] = None
    discussion: Optional[str] = None
    options: List[OptionResponse] = []
    
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
    search: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    query = select(Question).options(selectinload(Question.options))
    if package_id:
        query = query.where(Question.package_id == package_id)
    if segment:
        query = query.where(Question.segment == segment)
    if search:
        query = query.where(Question.content.ilike(f"%{search}%"))
    
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

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question_in: QuestionCreate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # Check if package exists
    result = await db.execute(select(Package).where(Package.id == question_in.package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
        
    # Check duplicate number in the same package
    existing = await db.scalar(
        select(func.count(Question.id)).where(
            Question.package_id == question_in.package_id,
            Question.number == question_in.number
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Nomor soal sudah digunakan di paket ini")

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
    
    # Needs to eagerly load options after commit
    result_q = await db.execute(select(Question).options(selectinload(Question.options)).where(Question.id == new_question.id))
    return result_q.scalar_one()

@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: uuid.UUID,
    question_in: QuestionUpdate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # Retrieve the question
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.options))
        .where(Question.id == question_id)
    )
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Check duplicate number if number is being mapped
    if question_in.number is not None and question_in.number != question.number:
        existing = await db.scalar(
            select(func.count(Question.id)).where(
                Question.package_id == question.package_id,
                Question.number == question_in.number
            )
        )
        if existing:
            raise HTTPException(status_code=409, detail="Nomor soal sudah digunakan di paket ini")
            
    # Update primitive fields
    update_data = question_in.model_dump(exclude_unset=True, exclude={"options"})
    for key, value in update_data.items():
        setattr(question, key, value)
        
    # Update options logic (delete-recreate strategy)
    if question_in.options is not None:
        # Delete old options
        await db.execute(delete(QuestionOption).where(QuestionOption.question_id == question_id))
        
        # Insert new options
        for opt in question_in.options:
            new_opt = QuestionOption(
                question_id=question.id,
                label=opt.label,
                content=opt.content,
                score=opt.score
            )
            db.add(new_opt)
            
    await db.commit()
    await db.refresh(question)
    
    # Need to query it again for clean loading
    result_q = await db.execute(select(Question).options(selectinload(Question.options)).where(Question.id == question.id))
    return result_q.scalar_one()

@router.delete("/{question_id}")
async def delete_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.delete(question)
    await db.commit()
    return {"message": "Question deleted successfully"}
