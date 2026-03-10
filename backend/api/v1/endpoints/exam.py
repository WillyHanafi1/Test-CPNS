from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime, timedelta

from backend.db.session import get_async_session
from backend.models.models import Package, Question, ExamSession, User
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/exam", tags=["exam"])

@router.post("/start/{package_id}")
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
