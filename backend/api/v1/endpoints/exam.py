from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
import logging
import traceback
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

from backend.db.session import get_async_session
from backend.models.models import Package, Question, ExamSession, User, Answer
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.redis_service import redis_service
from backend.core.rate_limiter import limiter, authenticated_limit_key
from backend.schemas.exam import ExamSessionListItem
from backend.core.tasks import calculate_exam_score, async_run_scoring
from backend.services import exams as durable
from backend.models.models import PackageRevision, ExamResponse
from pydantic import Field
from sqlalchemy import func, case

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exam", tags=["exam"])

# ==============================================================
# SCHEMA RESPONSE (ANTI-CHEAT & FIX SERIALIZATION ERROR)
# ==============================================================
class OptionResponse(BaseModel):
    id: uuid.UUID
    label: str
    content: str
    image_url: Optional[str] = None
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
    server_now: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    writer_epoch: int = 1
    writer_id: Optional[str] = None
    status: str = "ongoing"
    answers: dict = Field(default_factory=dict)
    revisions: dict = Field(default_factory=dict)

class ReviewOptionResponse(BaseModel):
    id: uuid.UUID
    label: str
    content: str
    image_url: Optional[str] = None
    score: int
    model_config = ConfigDict(from_attributes=True)

class ReviewQuestionResponse(BaseModel):
    id: uuid.UUID
    content: str
    image_url: Optional[str] = None
    discussion: Optional[str] = None
    segment: str
    number: int
    options: List[ReviewOptionResponse]
    selected_option_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

class ReviewSessionResponse(BaseModel):
    session_id: uuid.UUID
    revision_id: Optional[uuid.UUID] = None
    package_title: str
    total_score: int
    score_twk: int
    score_tiu: int
    score_tkp: int
    questions: List[ReviewQuestionResponse]
    model_config = ConfigDict(from_attributes=True)
# ==============================================================

@router.post("/start/{package_id}", response_model=StartExamResponse)
@limiter.limit("12/minute", key_func=authenticated_limit_key)
async def start_exam(
    request: Request,
    response: Response,
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    writer_id: Optional[str] = Query(None, max_length=100),
):
    response = await durable.start(db, package_id, current_user, writer_id,
        protocol=2 if request.headers.get("X-Exam-Protocol") == "2" else 1)
    if response is not None:
        return response
    legacy = await db.scalar(select(ExamSession).where(
        ExamSession.user_id == current_user.id, ExamSession.package_id == package_id,
        ExamSession.status == "ongoing").with_for_update())
    response = await durable.session_payload(db, legacy)
    valid_ids = [str(o["id"]) for q in response["package"]["questions"] for o in q["options"]]
    if valid_ids:
        await redis_service.redis.sadd(f"valid_options:{legacy.id}", *valid_ids)
        await redis_service.redis.expire(f"valid_options:{legacy.id}", 10800)
    await db.commit()
    return response

@router.post("/autosave/{session_id}")
@limiter.limit("240/minute", key_func=authenticated_limit_key)
async def autosave_answer(
    request: Request,
    response: Response,
    session_id: uuid.UUID,
    question_id: uuid.UUID = Body(...),
    option_id: uuid.UUID = Body(...),
    mutation_id: str = Body(default="legacy", max_length=100),
    expected_revision: int = Body(default=0, ge=0),
    writer_epoch: int = Body(default=1, ge=1),
    writer_id: Optional[str] = Body(default=None, max_length=100),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    attempt = await durable.owned_session(db, session_id, current_user.id, lock=True)
    if attempt.revision_id:
        return await durable.save(db, attempt, question_id, option_id, mutation_id,
                                  expected_revision, writer_epoch, writer_id)
    if not await db.scalar(select(QuestionOption.id).where(
        QuestionOption.id == option_id, QuestionOption.question_id == question_id)):
        raise HTTPException(400, "Pilihan tidak sesuai dengan soal.")
    # 1. Validation - Ownership & duplicate limit
    session_result = await db.execute(
        select(ExamSession).where(
            ExamSession.id == session_id,
            ExamSession.user_id == current_user.id,
            ExamSession.status == "ongoing"
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi ujian tidak ditemukan atau bukan milik Anda")

    # 2. Redis-based rate limiting (atomic with Lua-like logic in Python)
    rate_key = f"rate_limit:autosave:{current_user.id}"
    # Use redis pipeline for a bit more atomicity if needed, but current logic is actually okay if window is short
    # Better: Use a Lua script to ensure INCR + EXPIRE happen atomically if it's the first hit
    lua_rate_limit = """
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return current
    """
    current_count = await redis_service.redis.eval(lua_rate_limit, 1, rate_key, 5)
    
    if current_count > 10:
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak permintaan. Coba lagi dalam beberapa detik."
        )

    # 3. Validasi Batas Waktu dari Redis
    session_meta_key = f"session_meta:{session_id}"
    end_time_ts = await redis_service.redis.get(session_meta_key)
    
    if not end_time_ts:
        # Session valid tapi Redis cache expired — restore dari DB
        if session.end_time:
            end_time_ts_val = session.end_time.replace(tzinfo=timezone.utc).timestamp()
            await redis_service.redis.setex(session_meta_key, 10800, str(end_time_ts_val))
            end_time_ts = str(end_time_ts_val)
        else:
            raise HTTPException(status_code=500, detail="Data waktu ujian tidak ditemukan")

    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts > float(end_time_ts):
        raise HTTPException(status_code=403, detail="Waktu ujian telah habis. Jawaban tidak dapat disimpan.")

    # 4. Validation - Option integrity (Redis Set for Performance & Security)
    valid_options_key = f"valid_options:{session_id}"
    is_valid = await redis_service.redis.sismember(valid_options_key, str(option_id))
    
    if not is_valid:
        # HAPUS FALLBACK DB. Langsung tolak jika ID opsi ngawur.
        raise HTTPException(status_code=400, detail="Pilihan jawaban tidak valid atau bukan dari paket soal ini")

    # 4b. [SECURITY] Validate question_id belongs to the session's package
    # Without this, an attacker could save answers under arbitrary question_ids
    # from different packages, corrupting scoring data.
    valid_questions_key = f"valid_questions:{session_id}"
    has_valid_questions = await redis_service.redis.exists(valid_questions_key)
    
    if not has_valid_questions:
        # Populate valid questions set from DB (same pattern as valid_options)
        from backend.models.models import Question
        q_result = await db.execute(
            select(Question.id).where(Question.package_id == session.package_id)
        )
        question_ids = [str(row[0]) for row in q_result.fetchall()]
        if question_ids:
            await redis_service.redis.sadd(valid_questions_key, *question_ids)
            await redis_service.redis.expire(valid_questions_key, 10800)
    
    is_valid_question = await redis_service.redis.sismember(valid_questions_key, str(question_id))
    if not is_valid_question:
        raise HTTPException(status_code=400, detail="Soal tidak valid atau bukan dari paket ujian ini")

    # 5. Proses simpan jika waktu masih ada
    # Rule: Always save to Redis first for anti-lag
    # Key format: exam_answers:{user_id}:{session_id}
    # Using Hash to store question_id -> option_id mapping
    cache_key = f"exam_answers:{current_user.id}:{session_id}"
    
    await redis_service.redis.hset(cache_key, str(question_id), str(option_id))
    
    # Optional: Set expiry for the hash (e.g. 3 hours)
    await redis_service.redis.expire(cache_key, 10800)
    
    return {"status": "saved"}


@router.post("/finish/{session_id}")
@limiter.limit("12/minute", key_func=authenticated_limit_key)
async def finish_exam(
    request: Request,
    response: Response,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    attempt = await durable.owned_session(db, session_id, current_user.id, lock=True)
    if attempt.revision_id:
        await durable.submit(db, attempt)
        # A durable job is already committed; periodic reconciliation survives broker failure.
        if attempt.status != "finished":
            import asyncio
            try:
                await asyncio.to_thread(calculate_exam_score.delay, str(attempt.id), str(current_user.id), current_user.email)
            except Exception:
                logger.warning("Scoring dispatch deferred; durable job retained")
        return {"status": attempt.status}
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
    now_utc = datetime.now(timezone.utc)
    if session.end_time:
        end_time = session.end_time
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        if now_utc > end_time:
            # Time already expired — force-close regardless of client state
            logger.info(f"Session {session_id} force-closed due to server-side time expiry")

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
            await async_run_scoring(
                str(session_id), str(current_user.id), current_user.email
            )
            # Re-fetch session to get updated scores from the scoring function
            await db.refresh(session)
            return {
                "status": "finished",
                "package_id": str(session.package_id),
                "total_score": session.total_score or 0,
                "score_twk": session.score_twk or 0,
                "score_tiu": session.score_tiu or 0,
                "score_tkp": session.score_tkp or 0
            }
        except Exception as fallback_error:
            # Revert status agar user bisa retry
            try:
                session.status = "ongoing"
                await db.commit()
            except Exception as revert_err:
                logger.error(f"CRITICAL: Failed to revert session {session_id} to ongoing: {revert_err}")
                # Session stuck in 'processing' — manual intervention needed
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Gagal menghitung nilai ujian: {str(fallback_error)}")

@router.get("/result/{session_id}")
@limiter.limit("60/minute", key_func=authenticated_limit_key)
async def get_exam_result(
    request: Request,
    response: Response,
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
    
    revision = await db.get(PackageRevision, session.revision_id) if session.revision_id else None
    return {
        "passing_grades": revision.payload["passing_grades"] if revision else dict(durable.PASSING_GRADE),
        "revision_id": session.revision_id,
        "status": session.status,
        "package_id": str(session.package_id),
        "total_score": getattr(session, 'total_score', 0) or 0,
        "score_twk": getattr(session, 'score_twk', 0) or 0,
        "score_tiu": getattr(session, 'score_tiu', 0) or 0,
        "score_tkp": getattr(session, 'score_tkp', 0) or 0,
        "is_passed": session.is_passed
    }

@router.get("/session/{session_id}/review", response_model=ReviewSessionResponse)
async def get_exam_review(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch session with package and answers
    result = await db.execute(
        select(ExamSession)
        .options(
            selectinload(ExamSession.package),
            selectinload(ExamSession.answers)
        )
        .where(
            ExamSession.id == session_id,
            ExamSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sesi ujian tidak ditemukan")
    
    if session.status != "finished":
        raise HTTPException(
            status_code=403, 
            detail="Pembahasan hanya tersedia setelah ujian selesai"
        )

    if session.revision_id:
        revision = await db.get(PackageRevision, session.revision_id)
        rows = (await db.scalars(select(ExamResponse).where(ExamResponse.session_id == session.id))).all()
        answers = {str(r.question_id): r.option_id for r in rows}
        return {"session_id": session.id, "revision_id": session.revision_id, "package_title": revision.payload["title"],
                "total_score": session.total_score, "score_twk": session.score_twk,
                "score_tiu": session.score_tiu, "score_tkp": session.score_tkp,
                "questions": [{**q, "selected_option_id": answers.get(q["id"])}
                              for q in revision.payload["questions"]]}
    # 2. Fetch all questions for this package with their options
    q_result = await db.execute(
        select(Question)
        .options(selectinload(Question.options))
        .where(Question.package_id == session.package_id)
        .order_by(Question.number)
    )
    questions = q_result.scalars().all()

    # 3. Create a map of question_id -> selected_option_id
    user_answers = {str(a.question_id): a.option_id for a in session.answers}

    review_questions = []
    for q in questions:
        selected_option_id = user_answers.get(str(q.id))
        
        review_questions.append(ReviewQuestionResponse(
            id=q.id,
            content=q.content,
            image_url=q.image_url,
            discussion=q.discussion,
            segment=q.segment,
            number=q.number,
            options=q.options,
            selected_option_id=selected_option_id
        ))

    return ReviewSessionResponse(
        session_id=session.id,
        package_title=session.package.title,
        total_score=session.total_score,
        score_twk=session.score_twk,
        score_tiu=session.score_tiu,
        score_tkp=session.score_tkp,
        questions=review_questions
    )

async def _fallback_rebuild_leaderboard(package_id: uuid.UUID, package: Package, db: AsyncSession):
    """
    Self-healing utility: rebuilds a specific package's leaderboard in Redis
    from PostgreSQL Database if the Redis ZSET is empty (e.g., after an unexpected restart).
    """
    lb_type = "weekly" if package.is_weekly else "practice"
    lb_key = f"leaderboard:{lb_type}:{package_id}"
    
    result = await db.execute(
        select(ExamSession)
        .options(selectinload(ExamSession.user))
        .where(
            ExamSession.package_id == package_id,
            ExamSession.status == "finished",
            ExamSession.is_preview == False
        )
    )
    sessions = result.scalars().all()
    
    if not sessions:
        return False
        
    best_scores = {}
    for session in sessions:
        if not session.user: continue
        email = session.user.email
        packed_score = (
            (session.total_score or 0) * 1000000000 +
            (session.score_tkp or 0) * 1000000 +
            (session.score_tiu or 0) * 1000 +
            (session.score_twk or 0)
        )
        if packed_score > best_scores.get(email, 0):
            best_scores[email] = packed_score
            
    if best_scores:
        mapping = {email: float(score) for email, score in best_scores.items()}
        await redis_service.redis.delete(lb_key)
        await redis_service.redis.zadd(lb_key, mapping)
        if not package.is_weekly:
            await redis_service.redis.expire(lb_key, 30 * 24 * 60 * 60)
            
    logger.info(f"Leaderboard fallback rebuilt for package {package_id} with {len(best_scores)} users.")
    return True

@router.get("/leaderboard/{package_id}")
async def get_leaderboard(
    package_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Weekly Leaderboard based on Package ID.
    Required for accuracy (prevents "ghosting" with empty national keys).
    """
    # Ensure limit is reasonable
    limit = max(1, min(limit, 100))
    
    # Check if package is weekly or practice
    result_pkg = await db.execute(select(Package).where(Package.id == package_id))
    package = result_pkg.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Paket tidak ditemukan")

    lb_type = "weekly" if package.is_weekly else "practice"
    lb_key = f"leaderboard:{lb_type}:{package_id}"

    # Fetch from Redis ZSET
    raw_leaderboard = await redis_service.redis.zrevrange(lb_key, 0, limit - 1, withscores=True)
    
    if not raw_leaderboard:
        # FALLBACK TO DATABASE (SELF-HEALING)
        rebuilt = await _fallback_rebuild_leaderboard(package_id, package, db)
        if rebuilt:
            raw_leaderboard = await redis_service.redis.zrevrange(lb_key, 0, limit - 1, withscores=True)
    
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
            if "@" in email:
                parts = email.split("@")
                display_name = parts[0][:3] + "***@" + parts[1]
            else:
                display_name = email[:3] + "***"

        # Decode Packed Score (Tie-Breaker Pattern)
        # Total score: (total * 10^9) + (tkp * 10^6) + (tiu * 10^3) + twk
        packed_score = int(score_map[email])
        score_total = packed_score // 1000000000
        score_tkp = (packed_score % 1000000000) // 1000000
        score_tiu = (packed_score % 1000000) // 1000
        score_twk = packed_score % 1000

        leaderboard.append({
            "name": display_name,
            "score": score_total,
            "score_twk": score_twk,
            "score_tiu": score_tiu,
            "score_tkp": score_tkp,
            "target": user.profile.target_instansi if user and user.profile else "Umum"
        })
        
    return leaderboard

@router.get("/sessions/me/stats")
async def get_my_stats(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Aggregated stats for dashboard to avoid over-fetching
    query = select(
        func.count(ExamSession.id).label("total"),
        func.max(ExamSession.total_score).label("best_score"),
        func.count(case((ExamSession.is_passed == True, 1))).label("passed")
    ).where(
        ExamSession.user_id == current_user.id,
        ExamSession.status == "finished",
        ExamSession.is_preview == False
    )
    
    result = await db.execute(query)
    stats = result.one()
    
    return {
        "total_sessions": stats.total or 0,
        "best_score": stats.best_score or 0,
        "total_passed": stats.passed or 0
    }

@router.get("/my-rank/{package_id}")
async def get_my_rank(
    package_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    # Determine the correct leaderboard key based on package type
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Paket tidak ditemukan")

    lb_type = "weekly" if package.is_weekly else "practice"
    lb_key = f"leaderboard:{lb_type}:{package_id}"
        
    rank = await redis_service.redis.zrevrank(lb_key, current_user.email)
    
    if rank is None:
        total_participants = await redis_service.redis.zcard(lb_key)
        if total_participants == 0:
            # FALLBACK TO DATABASE (SELF-HEALING)
            logger.warning(f"Redis leaderboard empty for {package_id} rank check. Triggering DB fallback.")
            rebuilt = await _fallback_rebuild_leaderboard(package_id, package, db)
            if rebuilt:
                rank = await redis_service.redis.zrevrank(lb_key, current_user.email)
                total_participants = await redis_service.redis.zcard(lb_key)
                
    score = await redis_service.redis.zscore(lb_key, current_user.email)
    total_participants = await redis_service.redis.zcard(lb_key)
    
    if rank is None:
        return {
            "rank": None, 
            "score": 0, 
            "score_twk": 0, 
            "score_tiu": 0, 
            "score_tkp": 0, 
            "total_participants": total_participants, 
            "percentile": 0
        }
        
    packed_score = int(score) if score is not None else 0
    percentile = round(((total_participants - rank) / total_participants) * 100, 1) if total_participants > 0 else 0

    return {
        "rank": rank + 1, # Convert to 1-indexed
        "total_participants": total_participants,
        "percentile": percentile,
        "score": packed_score // 1000000000,
        "score_twk": packed_score % 1000,
        "score_tiu": (packed_score % 1000000) // 1000,
        "score_tkp": (packed_score % 1000000000) // 1000000
    }

@router.get("/sessions/me", response_model=List[ExamSessionListItem])
async def get_my_sessions(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Fetch sessions for current user with package info (paginated)
    result = await db.execute(
        select(ExamSession, Package.title.label("package_title"))
        .join(Package, ExamSession.package_id == Package.id)
        .where(ExamSession.user_id == current_user.id, ExamSession.is_preview.is_(False))
        .order_by(ExamSession.start_time.desc())
        .offset(offset)
        .limit(limit)
    )
    
    sessions = []
    for row in result:
        session, package_title = row
        if session.revision_id:
            revision = await db.get(PackageRevision, session.revision_id)
            package_title = revision.payload["title"]
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
            status=session.status,
            is_passed=session.is_passed
        ))
    
    return sessions
@router.post("/{session_id}/ai-generate")
async def retired_analysis(session_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    raise HTTPException(410, "Fitur AI peserta telah dihentikan.")


@router.get("/session/{session_id}/state", response_model=StartExamResponse)
@limiter.limit("120/minute", key_func=authenticated_limit_key)
async def get_session_state(request: Request, response: Response, session_id: uuid.UUID, db: AsyncSession = Depends(get_async_session),
                            current_user: User = Depends(get_current_user)):
    attempt = await durable.owned_session(db, session_id, current_user.id)
    return await durable.session_payload(db, attempt)


@router.post("/session/{session_id}/claim", response_model=StartExamResponse)
async def claim_session(session_id: uuid.UUID, writer_id: str = Body(..., embed=True, min_length=1, max_length=100),
                        db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    attempt = await durable.owned_session(db, session_id, current_user.id, lock=True)
    if not attempt.revision_id or attempt.status != "ongoing" or durable.utc(attempt.end_time) <= datetime.now(timezone.utc):
        raise HTTPException(409, "Sesi tidak dapat dilanjutkan.")
    attempt.writer_epoch += 1
    attempt.writer_id = writer_id
    response = await durable.session_payload(db, attempt)
    await db.commit()
    return response


@router.get("/ranking/{package_id}")
async def revision_ranking(package_id: uuid.UUID, revision_id: Optional[uuid.UUID] = None,
                           db: AsyncSession = Depends(get_async_session),
                           user: User = Depends(get_current_user)):
    import hashlib
    package = await db.scalar(select(Package).where(Package.id == package_id,
        Package.is_published.is_(True), Package.is_active.is_(True)))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    target = revision_id or package.published_revision_id
    if not target:
        return {"rows": [], "notice": "Peringkat tersedia setelah ada sesi dengan versi konten tercatat."}
    revision = await db.get(PackageRevision, target)
    if not revision or revision.package_id != package.id:
        raise HTTPException(404, "Versi latihan tidak ditemukan.")
    order = [ExamSession.total_score.desc(), ExamSession.score_tkp.desc(),
             ExamSession.score_tiu.desc(), ExamSession.score_twk.desc(), ExamSession.start_time.asc()]
    best = select(ExamSession.user_id, ExamSession.total_score, ExamSession.score_twk,
        ExamSession.score_tiu, ExamSession.score_tkp,
        func.row_number().over(partition_by=ExamSession.user_id, order_by=order).label("attempt_rank")
        ).where(ExamSession.package_id == package.id, ExamSession.revision_id == target,
            ExamSession.status == "finished", ExamSession.is_preview.is_(False)).subquery()
    rows = (await db.execute(select(best).where(best.c.attempt_rank == 1).order_by(
        best.c.total_score.desc(), best.c.score_tkp.desc(), best.c.score_tiu.desc(),
        best.c.score_twk.desc(), best.c.user_id).limit(50))).mappings().all()
    return {"rows": [{"rank": i + 1, "name": "Kamu" if row["user_id"] == user.id else
        "Peserta " + hashlib.sha256(str(row["user_id"]).encode()).hexdigest()[:6],
        "score": row["total_score"], "twk": row["score_twk"], "tiu": row["score_tiu"], "tkp": row["score_tkp"]}
        for i, row in enumerate(rows)], "revision_id": target,
        "notice": "Maksimal 50 skor terbaik, satu percobaan terbaik per peserta pada versi paket yang sama. Bukan peringkat seleksi resmi."}
