import uuid
import asyncio
import logging
import traceback
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.exc import OperationalError
from sqlalchemy.pool import NullPool
import redis.asyncio as aioredis

from backend.core.celery_app import celery_app
from backend.models.models import ExamSession, Question, Answer, Package, User
from backend.core.ai_service import ai_service
from backend.core.constants import PASSING_GRADE
from backend.config import settings


# ====================================================================
# Helper: DRY Celery async wrapper
# ====================================================================

def run_async_task(coro_func):
    """Wrapper to run async function in a new event loop for Celery."""
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro_func(*args, **kwargs))
        finally:
            loop.close()
    return wrapper

# ====================================================================
# Loggers
# ====================================================================

logger_scoring = logging.getLogger("celery.tasks.scoring")
logger_beat = logging.getLogger("celery.beat.auto_finish")
logger_ai = logging.getLogger("celery.tasks.ai_analysis")


# ====================================================================
# Scoring Task
# ====================================================================

async def async_run_scoring(session_id_str: str, user_id_str: str, user_email: str):
    logger_scoring.info(f"Starting scoring for session {session_id_str}")

    # Create a new engine per task — required for Celery workers (NullPool = no connection sharing)
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        session_id = uuid.UUID(session_id_str)
        user_id = uuid.UUID(user_id_str)

        async with session_factory() as db:
            logger_scoring.info(f"Fetching session {session_id_str} from DB")
            result = await db.execute(
                select(ExamSession)
                .where(ExamSession.id == session_id, ExamSession.user_id == user_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                logger_scoring.warning(f"Session {session_id_str} not found — aborting")
                return {"status": "error", "message": "session not found"}
            if session.status == "finished":
                logger_scoring.info(f"Session {session_id_str} already finished — skipping")
                return {"status": "skipped", "reason": "already finished"}

            cache_key = f"exam_answers:{user_id_str}:{session_id_str}"
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

            try:
                redis_answers = await redis_client.hgetall(cache_key)
                logger_scoring.info(f"Found {len(redis_answers)} answers in Redis for session {session_id_str}")

                result = await db.execute(
                    select(Question)
                    .options(selectinload(Question.options))
                    .where(Question.package_id == session.package_id)
                )
                questions = result.scalars().all()
                logger_scoring.info(f"Found {len(questions)} questions for package {session.package_id}")

                score_twk = score_tiu = score_tkp = 0
                db_answers = []
                sub_cat_stats = {}

                for q in questions:
                    q_id_str = str(q.id)
                    selected_option_id_str = redis_answers.get(q_id_str)
                    if not selected_option_id_str:
                        continue
                    try:
                        selected_option_id = uuid.UUID(selected_option_id_str)
                    except ValueError:
                        logger_scoring.warning(f"Invalid UUID in Redis for question {q_id_str}: {selected_option_id_str}")
                        continue

                    selected_option = next(
                        (opt for opt in q.options if opt.id == selected_option_id), None
                    )
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
                        option_id=selected_option.id,
                        selected_option=selected_option.label,
                        points_earned=points
                    ))

                    # Track sub-category stats for AI analysis
                    sub_cat = q.sub_category or "Umum"
                    if sub_cat not in sub_cat_stats:
                        sub_cat_stats[sub_cat] = {"score": 0, "max_possible": 0}
                    sub_cat_stats[sub_cat]["score"] += points
                    max_q_score = max((opt.score for opt in q.options), default=5)
                    sub_cat_stats[sub_cat]["max_possible"] += max_q_score

                total_score = score_twk + score_tiu + score_tkp

                # Passing grade logic per BKN standard (thresholds defined in constants.py)
                is_passed = (
                    score_twk >= PASSING_GRADE["TWK"] and
                    score_tiu >= PASSING_GRADE["TIU"] and
                    score_tkp >= PASSING_GRADE["TKP"]
                )

                session.score_twk = score_twk
                session.score_tiu = score_tiu
                session.score_tkp = score_tkp
                session.total_score = total_score
                session.is_passed = is_passed
                session.status = "finished"
                session.end_time = datetime.now(timezone.utc)

                db.add_all(db_answers)
                logger_scoring.info(f"Committing {len(db_answers)} answers for session {session_id_str}")
                await db.commit()

                # Update leaderboard only for active weekly tryouts
                result_package = await db.execute(select(Package).where(Package.id == session.package_id))
                package_obj = result_package.scalar_one_or_none()

                if package_obj and package_obj.is_weekly and not session.is_preview:
                    now_utc = datetime.now(timezone.utc)
                    if package_obj.end_at and now_utc > package_obj.end_at:
                        logger_scoring.info(f"Tryout {session.package_id} expired at {package_obj.end_at} — skipping leaderboard update")
                    else:
                        lb_key = f"leaderboard:weekly:{session.package_id}"
                        # Composite tie-breaker: total → TKP → TIU → TWK
                        tie_breaker_score = (
                            (total_score * 1_000_000_000) +
                            (score_tkp  *     1_000_000) +
                            (score_tiu  *         1_000) +
                            score_twk
                        )
                        await redis_client.zadd(lb_key, {user_email: tie_breaker_score}, gt=True)
                        logger_scoring.info(f"Leaderboard updated for user {user_email} on package {session.package_id}")

                await redis_client.delete(cache_key)
                logger_scoring.info(f"Redis cache cleared for session {session_id_str}")

            finally:
                await redis_client.aclose()

        logger_scoring.info(f"Scoring completed — session={session_id_str} total={total_score}")
        return {
            "session_id": session_id_str,
            "total_score": total_score,
            "score_twk": score_twk,
            "score_tiu": score_tiu,
            "score_tkp": score_tkp,
            "status": "success"
        }

    except (OperationalError, ConnectionError):
        # Explicitly raise for Celery autoretry_for
        raise

    except Exception as e:
        logger_scoring.error(
            f"Scoring failed for session {session_id_str}: {e}\n{traceback.format_exc()}"
        )
        return {"status": "error", "message": str(e)}

    finally:
        await engine.dispose()
        logger_scoring.debug(f"Engine disposed for session {session_id_str}")


@celery_app.task(
    name="backend.core.tasks.calculate_exam_score",
    autoretry_for=(OperationalError, ConnectionError),
    max_retries=3,
    default_retry_delay=10,
)
def calculate_exam_score(session_id: str, user_id: str, user_email: str):
    return run_async_task(async_run_scoring)(session_id, user_id, user_email)


# ====================================================================
# Celery Beat Task: Auto-Finish Expired Exam Sessions
# ====================================================================

async def async_auto_finish_expired():
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    grace_period = timedelta(minutes=5)
    cutoff_time = datetime.now(timezone.utc) - grace_period
    finished_count = 0
    error_count = 0

    try:
        async with session_factory() as db:
            result = await db.execute(
                select(ExamSession)
                .where(
                    ExamSession.status.in_(["ongoing", "processing"]),
                    ExamSession.end_time != None,
                    ExamSession.end_time < cutoff_time
                )
            )
            expired_sessions = result.scalars().all()

            if not expired_sessions:
                logger_beat.info("Auto-finish: no expired sessions found")
                return {"status": "ok", "message": "No expired sessions found"}

            logger_beat.info(f"Auto-finish: found {len(expired_sessions)} expired session(s)")

            user_ids = list({s.user_id for s in expired_sessions})
            user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
            users_map = {u.id: u.email for u in user_result.scalars().all()}

        for session in expired_sessions:
            user_email = users_map.get(session.user_id, "unknown@user.com")
            try:
                scoring_result = await async_run_scoring(
                    str(session.id), str(session.user_id), user_email
                )
                if scoring_result.get("status") in ("success", "skipped"):
                    finished_count += 1
                else:
                    await _mark_session_expired(session_factory, session.id)
                    error_count += 1
            except Exception as e:
                await _mark_session_expired(session_factory, session.id)
                error_count += 1
                logger_beat.error(f"Exception auto-finishing session {session.id}: {e}")

        logger_beat.info(
            f"Auto-finish complete — finished={finished_count} errors={error_count} total={len(expired_sessions)}"
        )
        return {
            "status": "ok",
            "finished": finished_count,
            "errors": error_count,
            "total_found": len(expired_sessions),
        }

    except (OperationalError, ConnectionError):
        # Explicitly raise for Celery autoretry_for
        raise

    except Exception as e:
        logger_beat.error(f"Auto-finish task failed: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}

    finally:
        await engine.dispose()


async def _mark_session_expired(session_factory, session_id: uuid.UUID):
    async with session_factory() as db:
        result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
        session = result.scalar_one_or_none()
        if session and session.status in ("ongoing", "processing"):
            session.status = "expired"
            session.end_time = datetime.now(timezone.utc)
            await db.commit()
            logger_beat.warning(f"Session {session_id} marked as expired (fallback)")


@celery_app.task(
    name="backend.core.tasks.auto_finish_expired_sessions",
    autoretry_for=(OperationalError, ConnectionError),
    max_retries=3,
    default_retry_delay=60,
)
def auto_finish_expired_sessions():
    return run_async_task(async_auto_finish_expired)()


# ====================================================================
# AI Analysis Task
# ====================================================================

async def async_generate_ai_analysis(session_id_str: str, stats: dict, history: list = None):
    logger_ai.info(f"Starting AI analysis for session {session_id_str}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        session_id = uuid.UUID(session_id_str)

        # Fetch past session history if not provided (AI memory feature)
        past_history = history
        if past_history is None:
            async with session_factory() as db:
                result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
                current_session = result.scalar_one_or_none()

                if current_session:
                    history_result = await db.execute(
                        select(ExamSession)
                        .where(
                            ExamSession.user_id == current_session.user_id,
                            ExamSession.status == "finished",
                            ExamSession.id != session_id,
                            ExamSession.is_preview == False
                        )
                        .order_by(ExamSession.start_time.desc())
                        .limit(3)
                    )
                    past_sessions = history_result.scalars().all()
                    past_history = [
                        {
                            "date": ps.start_time.strftime("%d %b %Y") if ps.start_time else "N/A",
                            "total_score": ps.total_score,
                            "score_twk": ps.score_twk,
                            "score_tiu": ps.score_tiu,
                            "score_tkp": ps.score_tkp,
                        }
                        for ps in past_sessions
                    ]
                    logger_ai.info(f"Loaded {len(past_history)} past session(s) for AI memory")

        analysis_result = await ai_service.generate_analysis(stats, past_history)

        async with session_factory() as db:
            result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                session.ai_analysis = analysis_result
                session.ai_status = "completed"
                await db.commit()
                logger_ai.info(f"AI analysis saved for session {session_id_str}")

    except (OperationalError, ConnectionError):
        # Explicitly raise for Celery autoretry_for
        raise

    except Exception as e:
        logger_ai.error(f"AI analysis failed for session {session_id_str}: {e}\n{traceback.format_exc()}")
        async with session_factory() as db:
            result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                session.ai_status = "failed"
                await db.commit()

    finally:
        await engine.dispose()


@celery_app.task(
    name="backend.core.tasks.generate_ai_analysis",
    autoretry_for=(OperationalError, ConnectionError),
    max_retries=3,
    default_retry_delay=10,
)
def generate_ai_analysis_task(session_id: str, stats: dict, history: list = None):
    return run_async_task(async_generate_ai_analysis)(session_id, stats, history)
