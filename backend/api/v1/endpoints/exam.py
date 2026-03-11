from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

from backend.db.session import get_async_session
from backend.models.models import Package, Question, ExamSession, User, Answer, QuestionOption
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.redis_service import redis_service
from backend.schemas.exam import ExamSessionListItem
from backend.core.tasks import calculate_exam_score, async_run_scoring

logger = logging.getLogger(__name__)

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
    start_time = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC
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

    session_meta_key = f"session_meta:{session.id}"
    # FIX: end_time is naive UTC. We MUST attach timezone before calling timestamp()
    # Otherwise Python assumes local timezone and gives the wrong epoch.
    await redis_service.redis.setex(session_meta_key, 10800, str(end_time.replace(tzinfo=timezone.utc).timestamp()))

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
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Validasi Batas Waktu dari Redis
    session_meta_key = f"session_meta:{session_id}"
    end_time_ts = await redis_service.redis.get(session_meta_key)
    
    if not end_time_ts:
        # Fallback to DB check to ensure session validity and restore cache
        result = await db.execute(
            select(ExamSession).where(
                ExamSession.id == session_id,
                ExamSession.user_id == current_user.id
            )
        )
        session = result.scalar_one_or_none()
        if not session or session.status != "ongoing":
            raise HTTPException(status_code=404, detail="Sesi ujian tidak ditemukan atau sudah ditutup.")
            
        # Restore cache logic
        if session.end_time:
            end_time_ts_val = session.end_time.replace(tzinfo=timezone.utc).timestamp()
            await redis_service.redis.setex(session_meta_key, 10800, str(end_time_ts_val))
            end_time_ts = str(end_time_ts_val)
        else:
            raise HTTPException(status_code=404, detail="Waktu ujian tidak ditemukan.")

    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts > float(end_time_ts):
        raise HTTPException(status_code=403, detail="Waktu ujian telah habis. Jawaban tidak dapat disimpan.")

    # 2. Proses simpan jika waktu masih ada
    # Rule: Always save to Redis first for anti-lag
    # Key format: exam_answers:{user_id}:{session_id}
    # Using Hash to store question_id -> option_id mapping
    cache_key = f"exam_answers:{current_user.id}:{session_id}"
    
    await redis_service.redis.hset(cache_key, str(question_id), str(option_id))
    
    # Optional: Set expiry for the hash (e.g. 3 hours)
    await redis_service.redis.expire(cache_key, 10800)
    
    return {"status": "saved"}

from backend.core.tasks import calculate_exam_score, async_run_scoring
import logging

logger = logging.getLogger(__name__)

@router.post("/finish/{session_id}")
async def finish_exam(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch session with row-level locking to prevent race conditions (double submission)
    result = await db.execute(
        select(ExamSession)
        .where(
            ExamSession.id == session_id, 
            ExamSession.user_id == current_user.id
        )
        .with_for_update()
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

    if session.status == "processing":
        return {"status": "processing", "message": "Result is being calculated"}

    # SECURITY: Server-side time enforcement.
    # Even if the client still has time remaining, we honor the server's end_time.
    # This prevents client-side clock manipulation.
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if session.end_time and now_utc > session.end_time:
        # Time already expired — force-close regardless of client state
        pass  # Fall through to scoring

    # PREVENT DEADLOCK: Commit the 'processing' status and release the FOR UPDATE lock
    # BEFORE we execute calculate_exam_score or async_run_scoring
    session.status = "processing"
    await db.commit()

    # 2. Try Celery background task first, fallback to synchronous scoring
    try:
        calculate_exam_score.delay(
            str(session_id), 
            str(current_user.id),
            current_user.email
        )
        # Celery accepted the task
        return {
            "status": "processing",
            "message": "Ujian telah selesai. Skor sedang dihitung di latar belakang.",
            "total_score": 0
        }
    except Exception as e:
        # Celery worker/broker not available — score synchronously as fallback
        logger.warning(f"Celery unavailable ({e}), falling back to synchronous scoring")
        try:
            scoring_result = await async_run_scoring(
                str(session_id), str(current_user.id), current_user.email
            )
            # Re-fetch session to get updated scores from the scoring function
            await db.refresh(session)
            return {
                "status": "finished",
                "total_score": getattr(session, 'total_score', 0) or 0,
                "score_twk": scoring_result.get('score_twk', getattr(session, 'score_twk', 0)) or 0,
                "score_tiu": scoring_result.get('score_tiu', getattr(session, 'score_tiu', 0)) or 0,
                "score_tkp": scoring_result.get('score_tkp', getattr(session, 'score_tkp', 0)) or 0
            }
        except Exception as fallback_error:
            logger.error(f"Synchronous fallback scoring failed: {fallback_error}")
            import traceback
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Gagal menghitung nilai ujian: {str(fallback_error)}")

@router.get("/result/{session_id}")
async def get_exam_result(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Fetch session without locking (pure read-only for polling)
    result = await db.execute(
        select(ExamSession)
        .where(
            ExamSession.id == session_id, 
            ExamSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "status": session.status,
        "total_score": getattr(session, 'total_score', 0) or 0,
        "score_twk": getattr(session, 'score_twk', 0) or 0,
        "score_tiu": getattr(session, 'score_tiu', 0) or 0,
        "score_tkp": getattr(session, 'score_tkp', 0) or 0
    }

@router.get("/national-leaderboard")
async def get_leaderboard(
    limit: int = 50,
    db: AsyncSession = Depends(get_async_session)
):
    # Ensure limit is reasonable
    limit = max(1, min(limit, 100))
    
    # 1. Fetch from Redis ZSET
    raw_leaderboard = await redis_service.redis.zrevrange("leaderboard:national", 0, limit - 1, withscores=True)
    
    if not raw_leaderboard:
        return []

    # Map members to their scores (ensuring scores are ints)
    score_map = {member if isinstance(member, str) else member.decode('utf-8'): int(score) for member, score in raw_leaderboard}
    emails = list(score_map.keys())

    # 2. Batch fetch user profiles from DB
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.email.in_(emails))
    )
    users = {user.email: user for user in result.scalars().all()}
    
    # 3. Build response maintaining Redis order
    leaderboard = []
    for email in emails:
        user = users.get(email)
        
        display_name = user.profile.full_name if user and user.profile else email
        # Mask email if no profile
        if not user or not user.profile:
            parts = email.split("@")
            display_name = parts[0][:3] + "***@" + parts[1]

        leaderboard.append({
            "name": display_name,
            "score": score_map[email],
            "target": user.profile.target_instansi if user and user.profile else "Umum"
        })
        
    return leaderboard

@router.get("/my-rank")
async def get_my_rank(
    current_user: User = Depends(get_current_user)
):
    # Get user's rank (0-indexed, so 0 is #1)
    rank = await redis_service.redis.zrevrank("leaderboard:national", current_user.email)
    score = await redis_service.redis.zscore("leaderboard:national", current_user.email)
    
    if rank is None:
        return {"rank": None, "score": 0}
        
    return {
        "rank": rank + 1, # Convert to 1-indexed
        "score": int(score) if score is not None else 0
    }

async def get_my_sessions(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Fetch all sessions for current user with package info
    result = await db.execute(
        select(ExamSession, Package.title.label("package_title"))
        .join(Package, ExamSession.package_id == Package.id)
        .where(ExamSession.user_id == current_user.id)
        .order_by(ExamSession.start_time.desc())
    )
    
    sessions = []
    for row in result:
        session, package_title = row
        sessions.append(ExamSessionListItem(
            id=session.id,
            package_id=session.package_id,
            package_title=package_title,
            start_time=session.start_time,
            end_time=session.end_time,
            total_score=session.total_score,
            score_twk=session.score_twk,
            score_tiu=session.score_tiu,
            score_tkp=session.score_tkp,
            status=session.status
        ))
    
    return sessions
