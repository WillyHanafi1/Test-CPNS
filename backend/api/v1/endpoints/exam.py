from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

from backend.db.session import get_async_session
from backend.models.models import Package, Question, ExamSession, User, Answer, QuestionOption
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/exam", tags=["exam"])

# ==============================================================
# SCHEMA RESPONSE (ANTI-CHEAT & FIX SERIALIZATION ERROR)
# ==============================================================
class OptionResponse(BaseModel):
    id: uuid.UUID
    label: str
    content: str
    # KUNCI JAWABAN (score) SENGAJA TIDAK DIMASUKKAN AGAR AMAN
    model_config = ConfigDict(from_attributes=True)

class QuestionResponse(BaseModel):
    id: uuid.UUID
    content: str
    image_url: Optional[str] = None
    segment: str
    number: int
    options: List[OptionResponse]
    # PEMBAHASAN (discussion) SENGAJA TIDAK DIMASUKKAN
    model_config = ConfigDict(from_attributes=True)

class PackageResponse(BaseModel):
    id: uuid.UUID
    title: str
    questions: List[QuestionResponse]
    model_config = ConfigDict(from_attributes=True)

class StartExamResponse(BaseModel):
    session_id: uuid.UUID
    package: PackageResponse
    end_time: datetime
# ==============================================================

@router.post("/start/{package_id}", response_model=StartExamResponse)
async def start_exam(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify package exists
    result = await db.execute(
        select(Package)
        .options(selectinload(Package.questions).selectinload(Question.options))
        .where(Package.id == package_id)
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    # 2. Create session in DB
    # Standard SKD time is 100 minutes
    start_time = datetime.utcnow()
    end_time = start_time + timedelta(minutes=100)
    
    session = ExamSession(
        id=uuid.uuid4(),
        user_id=current_user.id,
        package_id=package_id,
        start_time=start_time,
        end_time=end_time,
        status="ongoing"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_id": session.id,
        "package": package,
        "end_time": end_time
    }

@router.post("/autosave/{session_id}")
async def autosave_answer(
    session_id: uuid.UUID,
    question_id: uuid.UUID = Body(...),
    option_id: uuid.UUID = Body(...),
    current_user: User = Depends(get_current_user)
):
    # Rule: Always save to Redis first for anti-lag
    # Key format: exam_session:{user_id}:{session_id}
    # Using Hash to store question_id -> option_id mapping
    cache_key = f"exam_answers:{current_user.id}:{session_id}"
    
    await redis_service.redis.hset(cache_key, str(question_id), str(option_id))
    
    # Optional: Set expiry for the hash (e.g. 3 hours)
    await redis_service.redis.expire(cache_key, 10800)
    
    return {"status": "saved"}

@router.post("/finish/{session_id}")
async def finish_exam(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch session
    result = await db.execute(
        select(ExamSession)
        .where(ExamSession.id == session_id, ExamSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status == "finished":
        return {
            "status": "already finished", 
            "total_score": session.total_score,
            "score_twk": session.score_twk,
            "score_tiu": session.score_tiu,
            "score_tkp": session.score_tkp
        }

    # 2. Fetch answers from Redis
    cache_key = f"exam_answers:{current_user.id}:{session_id}"
    redis_answers = await redis_service.redis.hgetall(cache_key)
    
    # 3. Fetch all questions and options for this package to calculate scores
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.options))
        .where(Question.package_id == session.package_id)
    )
    questions = result.scalars().all()
    
    score_twk = 0
    score_tiu = 0
    score_tkp = 0
    
    db_answers = []
    
    for q in questions:
        # Redis returns bytes, need to decode
        selected_option_id_str = redis_answers.get(str(q.id))
        if not selected_option_id_str:
            continue
            
        # If it's bytes, decode to str
        if isinstance(selected_option_id_str, bytes):
            selected_option_id_str = selected_option_id_str.decode('utf-8')
            
        selected_option_id = uuid.UUID(selected_option_id_str)
        selected_option = next((opt for opt in q.options if opt.id == selected_option_id), None)
        
        if not selected_option:
            continue
            
        points = selected_option.score
        
        if q.segment == "TWK":
            score_twk += points
        elif q.segment == "TIU":
            score_tiu += points
        elif q.segment == "TKP":
            score_tkp += points
            
        db_answers.append(Answer(
            id=uuid.uuid4(),
            session_id=session_id,
            question_id=q.id,
            selected_option=selected_option.label,
            points_earned=points
        ))
    
    # 4. Update session
    session.score_twk = score_twk
    session.score_tiu = score_tiu
    session.score_tkp = score_tkp
    session.total_score = score_twk + score_tiu + score_tkp
    session.status = "finished"
    session.end_time = datetime.utcnow()
    
    db.add_all(db_answers)
    await db.commit()
    
    # 5. Update Leaderboard in Redis (Sorted Set)
    await redis_service.redis.zadd("leaderboard:national", {current_user.email: session.total_score})
    
    # 6. Cleanup Redis answers
    await redis_service.redis.delete(cache_key)
    
    return {
        "status": "finished",
        "total_score": session.total_score,
        "score_twk": score_twk,
        "score_tiu": score_tiu,
        "score_tkp": score_tkp
    }

@router.get("/national-leaderboard")
async def get_leaderboard(
    db: AsyncSession = Depends(get_async_session)
):
    # 1. Fetch from Redis ZSET (Top 50)
    raw_leaderboard = await redis_service.redis.zrevrange("leaderboard:national", 0, 49, withscores=True)
    
    leaderboard = []
    for member, score in raw_leaderboard:
        email = member
        if isinstance(email, bytes):
            email = email.decode('utf-8')
            
        # 2. Get full name from DB for display
        result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        display_name = user.profile.full_name if user and user.profile else email
        # Mask email if no profile
        if not user or not user.profile:
            parts = email.split("@")
            display_name = parts[0][:3] + "***@" + parts[1]

        leaderboard.append({
            "name": display_name,
            "score": int(score),
            "target": user.profile.target_agency if user and user.profile else "Umum"
        })
        
    return leaderboard
