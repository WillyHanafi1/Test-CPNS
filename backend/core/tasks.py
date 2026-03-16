import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from backend.core.celery_app import celery_app
from backend.models.models import ExamSession, Question, Answer, Package, User
from backend.core.redis_service import redis_service
from backend.core.ai_service import ai_service
from backend.config import settings


async def async_run_scoring(session_id_str: str, user_id_str: str, user_email: str):
    print(f"DEBUG: Starting scoring for session {session_id_str}")

    # ✅ KUNCI FIX: buat engine BARU setiap task, bukan pakai engine global
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        poolclass=NullPool
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        session_id = uuid.UUID(session_id_str)
        user_id = uuid.UUID(user_id_str)

        async with session_factory() as db:
            print(f"DEBUG: Fetching session from DB")
            result = await db.execute(
                select(ExamSession)
                .where(ExamSession.id == session_id, ExamSession.user_id == user_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                return {"status": "error", "message": "session not found"}
            if session.status == "finished":
                return {"status": "skipped", "reason": "already finished"}

            print(f"DEBUG: Fetching answers from Redis")
            cache_key = f"exam_answers:{user_id_str}:{session_id_str}"

            # ✅ FIX REDIS: buat koneksi redis baru juga
            import redis.asyncio as aioredis
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            try:
                redis_answers = await redis_client.hgetall(cache_key)
            finally:
                await redis_client.aclose()

            print(f"DEBUG: Found {len(redis_answers)} answers in Redis")

            print(f"DEBUG: Fetching questions for package {session.package_id}")
            result = await db.execute(
                select(Question)
                .options(selectinload(Question.options))
                .where(Question.package_id == session.package_id)
            )
            questions = result.scalars().all()
            print(f"DEBUG: Found {len(questions)} questions in package")

            score_twk = score_tiu = score_tkp = 0
            db_answers = []
            sub_cat_stats = {} # {sub_cat: {corect: X, total: Y}}

            for q in questions:
                q_id_str = str(q.id)
                selected_option_id_str = redis_answers.get(q_id_str)
                if not selected_option_id_str:
                    continue
                try:
                    selected_option_id = uuid.UUID(selected_option_id_str)
                except ValueError:
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

                # Track sub-category stats for AI
                sub_cat = q.sub_category or "Umum"
                if sub_cat not in sub_cat_stats:
                    sub_cat_stats[sub_cat] = {"score": 0, "max_possible": 0}
                
                sub_cat_stats[sub_cat]["score"] += points
                sub_cat_stats[sub_cat]["max_possible"] += 5

            total_score = score_twk + score_tiu + score_tkp
            
            # Logic Passing Grade BKN
            is_passed = (score_twk >= 65 and score_tiu >= 80 and score_tkp >= 166)

            session.score_twk = score_twk
            session.score_tiu = score_tiu
            session.score_tkp = score_tkp
            session.total_score = total_score
            session.is_passed = is_passed
            session.status = "finished"
            session.end_time = datetime.now(timezone.utc).replace(tzinfo=None)

            db.add_all(db_answers)
            print(f"DEBUG: Committing to database")
            await db.commit()

            # Update leaderboard only for Weekly Tryouts
            result_package = await db.execute(select(Package).where(Package.id == session.package_id))
            package_obj = result_package.scalar_one_or_none()

            redis_lb = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            try:
                if package_obj and package_obj.is_weekly:
                    is_active_to = True
                    now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
                    
                    if package_obj.end_at and now_utc_naive > package_obj.end_at:
                        is_active_to = False
                        print(f"DEBUG: Tryout expired ({package_obj.end_at}), skipping leaderboard update.")

                    if is_active_to:
                        lb_key = f"leaderboard:weekly:{session.package_id}"
                        tie_breaker_score = (
                            (total_score * 1000000000) + 
                            (score_tkp * 1000000) + 
                            (score_tiu * 1000) + 
                            score_twk
                        )
                        await redis_lb.zadd(lb_key, {user_email: tie_breaker_score}, gt=True)
                    
                await redis_lb.delete(cache_key)
            finally:
                await redis_lb.aclose()

            print(f"DEBUG: Scoring completed for session {session_id_str}")

            # 🤖 AI ANALYSIS TRIGGER (REMOVED - Now triggered manually by user)
            # if user_obj and user_obj.is_pro:
            #     print(f"DEBUG: Triggering AI Analysis for PRO user {user_email}")
            #     session.ai_status = "processing"
            #     await db.commit()
            #     ...
            #     generate_ai_analysis_task.delay(session_id_str, ai_stats)


            return {"session_id": session_id_str, "total_score": total_score, "status": "success"}

    except Exception as e:
        import traceback
        print(f"ERROR: Scoring failed for session {session_id_str}")
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

    finally:
        await engine.dispose()
        print(f"DEBUG: Engine disposed for session {session_id_str}")


@celery_app.task(name="backend.core.tasks.calculate_exam_score")
def calculate_exam_score(session_id: str, user_id: str, user_email: str):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(async_run_scoring(session_id, user_id, user_email))
    finally:
        loop.close()


# ====================================================================
# Celery Beat Task: Auto-Finish Expired Exam Sessions
# ====================================================================

async def async_auto_finish_expired():
    from datetime import timedelta
    import logging

    logger = logging.getLogger("celery.beat.auto_finish")

    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        poolclass=NullPool
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    grace_period = timedelta(minutes=5)
    cutoff_time = datetime.now(timezone.utc).replace(tzinfo=None) - grace_period

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
                return {"status": "ok", "message": "No expired sessions found"}

            logger.info(f"Found {len(expired_sessions)} expired session(s) to auto-finish")

            from backend.models.models import User
            user_ids = list({s.user_id for s in expired_sessions})
            user_result = await db.execute(
                select(User).where(User.id.in_(user_ids))
            )
            users_map = {u.id: u.email for u in user_result.scalars().all()}

        for session in expired_sessions:
            user_email = users_map.get(session.user_id, "unknown@user.com")
            try:
                scoring_result = await async_run_scoring(
                    str(session.id), str(session.user_id), user_email
                )
                if scoring_result.get("status") == "success" or scoring_result.get("status") == "skipped":
                    finished_count += 1
                else:
                    await _mark_session_expired(session_factory, session.id)
                    error_count += 1
            except Exception as e:
                await _mark_session_expired(session_factory, session.id)
                error_count += 1
                logger.error(f"Exception auto-finishing session {session.id}: {e}")

        return {
            "status": "ok",
            "finished": finished_count,
            "errors": error_count,
            "total_found": len(expired_sessions),
        }

    except Exception as e:
        import traceback
        logger.error(f"Auto-finish task failed: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}

    finally:
        await engine.dispose()


async def _mark_session_expired(session_factory, session_id: uuid.UUID):
    async with session_factory() as db:
        result = await db.execute(
            select(ExamSession).where(ExamSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session and session.status in ("ongoing", "processing"):
            session.status = "expired"
            session.end_time = datetime.now(timezone.utc).replace(tzinfo=None)
            await db.commit()


@celery_app.task(name="backend.core.tasks.auto_finish_expired_sessions")
def auto_finish_expired_sessions():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(async_auto_finish_expired())
    finally:
        loop.close()

# ====================================================================
# AI Analysis Task
# ====================================================================

async def async_generate_ai_analysis(session_id_str: str, stats: dict, history: list = None):
    print(f"DEBUG: Starting AI Analysis generation for session {session_id_str}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        session_id = uuid.UUID(session_id_str)
        
        # Fetch history if not provided (AI Memory)
        past_history = history
        if past_history is None:
            async with session_factory() as db:
                # Get current session to find user_id
                result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
                current_session = result.scalar_one_or_none()
                
                if current_session:
                    history_result = await db.execute(
                        select(ExamSession)
                        .where(
                            ExamSession.user_id == current_session.user_id,
                            ExamSession.status == "finished",
                            ExamSession.id != session_id
                        )
                        .order_by(ExamSession.start_time.desc())
                        .limit(3)
                    )
                    past_sessions = history_result.scalars().all()
                    past_history = []
                    for ps in past_sessions:
                        past_history.append({
                            "date": ps.start_time.strftime("%d %b %Y") if ps.start_time else "N/A",
                            "total_score": ps.total_score,
                            "score_twk": ps.score_twk,
                            "score_tiu": ps.score_tiu,
                            "score_tkp": ps.score_tkp
                        })

        analysis_result = await ai_service.generate_analysis(stats, past_history)
        
        async with session_factory() as db:
            result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                session.ai_analysis = analysis_result
                session.ai_status = "completed"
                await db.commit()
                print(f"DEBUG: AI Analysis saved for session {session_id_str}")
    except Exception as e:
        import traceback
        print(f"ERROR: AI Analysis generation failed: {str(e)}")
        print(traceback.format_exc())
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
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=10
)
def generate_ai_analysis_task(session_id: str, stats: dict, history: list = None):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(async_generate_ai_analysis(session_id, stats, history))
    finally:
        loop.close()
