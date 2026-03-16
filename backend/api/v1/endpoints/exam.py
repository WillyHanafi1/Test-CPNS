from fastapi import APIRouter, Depends, HTTPException, status, Body
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
from backend.models.models import Package, Question, ExamSession, User, Answer, QuestionOption, UserTransaction
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.redis_service import redis_service
from backend.schemas.exam import ExamSessionListItem
from backend.core.tasks import calculate_exam_score, async_run_scoring
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
    package_title: str
    total_score: int
    score_twk: int
    score_tiu: int
    score_tkp: int
    questions: List[ReviewQuestionResponse]
    model_config = ConfigDict(from_attributes=True)
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
        
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # DEFINISIKAN HELPER SEBELUM DIPAKAI
    async def populate_valid_options(sess_id: uuid.UUID):
        valid_options_key = f"valid_options:{sess_id}"
        valid_ids = [str(opt.id) for q in package.questions for opt in q.options]
        if valid_ids:
            await redis_service.redis.sadd(valid_options_key, *valid_ids)
            await redis_service.redis.expire(valid_options_key, 10800)

    # Fix #6: RBAC enforcement — verify user has access to premium packages
    if package.is_premium and package.price > 0:
        if not current_user.is_pro_active:
            tx_result = await db.execute(
                select(UserTransaction)
                .where(
                    UserTransaction.user_id == current_user.id,
                    UserTransaction.package_id == package_id,
                    UserTransaction.payment_status == "success",
                )
                .order_by(UserTransaction.created_at.desc())
                .limit(1)
            )
            transaction = tx_result.scalar_one_or_none()
            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Anda belum memiliki akses ke paket ini. Silakan beli terlebih dahulu atau upgrade ke PRO."
                )
            if transaction.access_expires_at and transaction.access_expires_at < now:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Akses Anda ke paket ini telah kedaluwarsa."
                )

    # 2. Check for duplicate "ongoing" session or finished session for Weekly TO
    # 2. Prevent Multiple Ongoing Sessions (Global Policy)
    # This addresses the TOCTOU issue and ensures only one ongoing session per user/package
    existing_check = await db.execute(
        select(ExamSession).where(
            ExamSession.user_id == current_user.id,
            ExamSession.package_id == package_id,
            ExamSession.status == "ongoing"
        ).with_for_update() # Row-level lock to prevent concurrent sessions
    )
    existing_session = existing_check.scalar_one_or_none()
    
    if existing_session:
        # If it's weekly and already finished, we shouldn't even get here if we check finish status first
        # But for safety, handle "ongoing" resume here
        await populate_valid_options(existing_session.id)
        return {
            "session_id": existing_session.id,
            "package": package,
            "end_time": existing_session.end_time.replace(tzinfo=timezone.utc)
        }

    # 2b. Specifically for Weekly TO: Check if already finished
    if package.is_weekly:
        finished_check = await db.execute(
            select(ExamSession).where(
                ExamSession.user_id == current_user.id,
                ExamSession.package_id == package_id,
                ExamSession.status == "finished"
            )
        )
        if finished_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda sudah menyelesaikan Tryout ini. Tryout mingguan hanya dapat dikerjakan satu kali."
            )
    


    # 3. Create session in DB
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

    # PANGGIL HELPER DI SINI UNTUK SESI BARU
    await populate_valid_options(session.id)

    session_meta_key = f"session_meta:{session.id}"
    # FIX: end_time is naive UTC. We MUST attach timezone before calling timestamp()
    # Otherwise Python assumes local timezone and gives the wrong epoch.
    await redis_service.redis.setex(session_meta_key, 10800, str(end_time.replace(tzinfo=timezone.utc).timestamp()))

    return {
        "session_id": session.id,
        "package": package,
        "end_time": end_time.replace(tzinfo=timezone.utc)  # aware for JSON response
    }

@router.post("/autosave/{session_id}")
async def autosave_answer(
    session_id: uuid.UUID,
    question_id: uuid.UUID = Body(...),
    option_id: uuid.UUID = Body(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
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
            scoring_result = await async_run_scoring(
                str(session_id), str(current_user.id), current_user.email
            )
            # Re-fetch session to get updated scores from the scoring function
            await db.refresh(session)
            return {
                "status": "finished",
                "package_id": str(session.package_id),
                "total_score": getattr(session, 'total_score', 0) or 0,
                "score_twk": scoring_result.get('score_twk', getattr(session, 'score_twk', 0)) or 0,
                "score_tiu": scoring_result.get('score_tiu', getattr(session, 'score_tiu', 0)) or 0,
                "score_tkp": scoring_result.get('score_tkp', getattr(session, 'score_tkp', 0)) or 0
            }
        except Exception as fallback_error:
            # Revert status agar user bisa retry
            try:
                session.status = "ongoing"
                await db.commit()
            except Exception:
                pass  # DB mungkin juga down, tidak bisa berbuat banyak
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
        "package_id": str(session.package_id),
        "total_score": getattr(session, 'total_score', 0) or 0,
        "score_twk": getattr(session, 'score_twk', 0) or 0,
        "score_tiu": getattr(session, 'score_tiu', 0) or 0,
        "score_tkp": getattr(session, 'score_tkp', 0) or 0,
        "ai_analysis": session.ai_analysis,
        "ai_status": session.ai_status
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

@router.get("/leaderboard/{package_id}")
async def get_leaderboard(
    package_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Weekly Leaderboard based on Package ID.
    Required for accuracy (prevents "ghosting" with empty national keys).
    """
    # Ensure limit is reasonable
    limit = max(1, min(limit, 100))
    
    lb_key = f"leaderboard:weekly:{package_id}"

    # Fetch from Redis ZSET
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
        ExamSession.status == "finished"
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
    current_user: User = Depends(get_current_user)
):
    # Get user's rank for specific Weekly TO
    lb_key = f"leaderboard:weekly:{package_id}"
        
    rank = await redis_service.redis.zrevrank(lb_key, current_user.email)
    score = await redis_service.redis.zscore(lb_key, current_user.email)
    
    if rank is None:
        return {"rank": None, "score": 0, "score_twk": 0, "score_tiu": 0, "score_tkp": 0}
        
    packed_score = int(score) if score is not None else 0
    return {
        "rank": rank + 1, # Convert to 1-indexed
        "score": packed_score // 1000000000,
        "score_twk": packed_score % 1000,
        "score_tiu": (packed_score % 1000000) // 1000,
        "score_tkp": (packed_score % 1000000000) // 1000000
    }

@router.get("/sessions/me", response_model=List[ExamSessionListItem])
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
            status=session.status,
            is_passed=session.is_passed
        ))
    
    return sessions
@router.post("/{session_id}/ai-generate")
async def generate_manual_ai(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger AI analysis for a finished session.
    Only for PRO users.
    """
    # 1. Validation: PRO User
    if not current_user.is_pro_active:
        raise HTTPException(status_code=403, detail="Hanya pengguna PRO yang dapat menggunakan fitur Analisis AI.")

    # 2. Validation: Sesi milik user dan sudah selesai
    result = await db.execute(
        select(ExamSession).where(ExamSession.id == session_id, ExamSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi ujian tidak ditemukan.")
    
    if session.status != "finished":
        raise HTTPException(status_code=400, detail="Sesi ujian belum selesai. Selesaikan ujian terlebih dahulu.")

    # 3. Validation: Status AI (jangan generate ulang jika sudah/sedang berproses)
    if session.ai_status == "processing":
        return {"status": "processing", "message": "Analisis AI sedang diproses."}
    if session.ai_status == "completed":
        return {"status": "completed", "message": "Analisis AI sudah tersedia."}

    # 4. Prepare data for AI
    from backend.models.models import Answer, Question
    ans_result = await db.execute(
        select(Answer, Question.sub_category)
        .join(Question, Answer.question_id == Question.id)
        .where(Answer.session_id == session_id)
    )
    answers_data = ans_result.all()
    
    sub_cat_stats = {}
    for ans, sub_cat in answers_data:
        cat = sub_cat or "Umum"
        if cat not in sub_cat_stats:
            sub_cat_stats[cat] = {"score": 0, "max_possible": 0}
        sub_cat_stats[cat]["score"] += ans.points_earned
        sub_cat_stats[cat]["max_possible"] += 5

    current_stats = {
        "score_twk": session.score_twk,
        "score_tiu": session.score_tiu,
        "score_tkp": session.score_tkp,
        "total_score": session.total_score,
        "is_passed": session.is_passed,
        "sub_categories": sub_cat_stats
    }

    # 5. Fetch User History (last 5 sessions)
    history_result = await db.execute(
        select(ExamSession)
        .where(
            ExamSession.user_id == current_user.id,
            ExamSession.id != session_id,
            ExamSession.status == "finished"
        )
        .order_by(ExamSession.start_time.desc())
        .limit(5)
    )
    past_sessions = history_result.scalars().all()
    
    history_data = []
    for s in past_sessions:
        history_data.append({
            "date": s.start_time.strftime("%Y-%m-%d") if s.start_time else "Unknown",
            "total_score": s.total_score,
            "score_twk": s.score_twk,
            "score_tiu": s.score_tiu,
            "score_tkp": s.score_tkp,
            "is_passed": s.is_passed,
            "ai_analysis": s.ai_analysis # Provide past analysis for consistency
        })

    # 6. Trigger task
    session.ai_status = "processing"
    await db.commit()
    
    from backend.core.tasks import generate_ai_analysis_task
    generate_ai_analysis_task.delay(str(session_id), current_stats, history_data)

    return {"status": "processing", "message": "Permintaan Analisis AI telah dikirim dengan data riwayat."}
