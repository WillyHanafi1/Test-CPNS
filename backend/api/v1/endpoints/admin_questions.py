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

router = APIRouter(prefix="/admin/questions", tags=["admin-questions"])

class OptionCreate(BaseModel):
    label: str
    content: str
    image_url: Optional[str] = None
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
    image_url: Optional[str] = None
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
    image_url: Optional[str] = None
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

@router.get("", response_model=PaginatedQuestionResponse)
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
    
    # Base count query
    count_query = select(func.count(Question.id))
    
    if package_id:
        query = query.where(Question.package_id == package_id)
        count_query = count_query.where(Question.package_id == package_id)
    if segment:
        query = query.where(Question.segment == segment)
        count_query = count_query.where(Question.segment == segment)
    if search:
        query = query.where(Question.content.ilike(f"%{search}%"))
        count_query = count_query.where(Question.content.ilike(f"%{search}%"))
    
    # Optimized Count
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

@router.delete("/bulk")
async def bulk_delete_questions(
    question_ids: List[uuid.UUID],
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # SECURITY: Cek apakah ada sesi ujian aktif yang menggunakan soal-soal ini
    from backend.models.models import ExamSession
    active_sessions = await db.scalar(
        select(func.count(ExamSession.id))
        .join(Package, ExamSession.package_id == Package.id)
        .join(Question, Question.package_id == Package.id)
        .where(
            Question.id.in_(question_ids),
            ExamSession.status == "ongoing"
        )
    )
    if active_sessions > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Gagal menghapus. Ada {active_sessions} sesi ujian yang sedang berjalan menggunakan soal ini."
        )

    await db.execute(delete(Question).where(Question.id.in_(question_ids)))
    await db.commit()
    return {"message": f"{len(question_ids)} questions deleted successfully"}

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
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
            image_url=opt.image_url,
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
        
    # Update options logic (Upsert Strategy - preserve IDs)
    if question_in.options is not None:
        incoming_options = question_in.options
        existing_options = {opt.id: opt for opt in question.options} if question.options else {}
        incoming_ids = {opt.id for opt in incoming_options if opt.id}

        # 1. Delete options that are not in incoming payload
        if question.options:
            for opt_id in list(existing_options.keys()):
                if opt_id not in incoming_ids:
                    await db.delete(existing_options[opt_id])

        # 2. Update existing or Create new
        for opt_in in incoming_options:
            if opt_in.id and opt_in.id in existing_options:
                # Update
                target_opt = existing_options[opt_in.id]
                target_opt.label = opt_in.label
                target_opt.content = opt_in.content
                target_opt.image_url = opt_in.image_url
                target_opt.score = opt_in.score
            else:
                # Create NEW
                new_opt = QuestionOption(
                    question_id=question.id,
                    label=opt_in.label,
                    content=opt_in.content,
                    image_url=opt_in.image_url,
                    score=opt_in.score
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
