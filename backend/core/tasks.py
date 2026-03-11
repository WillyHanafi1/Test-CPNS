import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from backend.core.celery_app import celery_app
from backend.models.models import ExamSession, Question, Answer
from backend.core.redis_service import redis_service
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
                    selected_option=selected_option.label,
                    points_earned=points
                ))

            total_score = score_twk + score_tiu + score_tkp
            session.score_twk = score_twk
            session.score_tiu = score_tiu
            session.score_tkp = score_tkp
            session.total_score = total_score
            session.status = "finished"
            session.end_time = datetime.now(timezone.utc).replace(tzinfo=None)

            db.add_all(db_answers)
            print(f"DEBUG: Committing to database")
            await db.commit()

            # Update leaderboard
            redis_lb = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            try:
                # GT flag: only update if new score is Greater Than existing
                await redis_lb.zadd("leaderboard:national", {user_email: total_score}, gt=True)
                await redis_lb.delete(cache_key)
            finally:
                await redis_lb.aclose()

            print(f"DEBUG: Scoring completed for session {session_id_str}")
            return {"session_id": session_id_str, "total_score": total_score, "status": "success"}

    except Exception as e:
        import traceback
        print(f"ERROR: Scoring failed for session {session_id_str}")
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

    finally:
        # ✅ WAJIB: buang engine beserta connection pool-nya
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