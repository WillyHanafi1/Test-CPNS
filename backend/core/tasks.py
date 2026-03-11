import uuid
import asyncio
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.core.celery_app import celery_app
from backend.db.session import async_session_maker
from backend.models.models import ExamSession, Question, Answer, User, QuestionOption
from backend.core.redis_service import redis_service

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.config import settings

async def async_run_scoring(session_id_str: str, user_id_str: str, user_email: str):
    print(f"DEBUG: Starting scoring for session {session_id_str}")
    # Create isolated engine for this task process/loop
    engine = create_async_engine(settings.DATABASE_URL)
    local_session_maker = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        session_id = uuid.UUID(session_id_str)
        user_id = uuid.UUID(user_id_str)
        
        async with local_session_maker() as db:
            # 1. Fetch Session
            print(f"DEBUG: Fetching session from DB")
            result = await db.execute(
                select(ExamSession)
                .where(ExamSession.id == session_id, ExamSession.user_id == user_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                print(f"DEBUG: Session {session_id_str} not found")
                return {"status": "error", "message": "session not found"}
            
            if session.status == "finished":
                print(f"DEBUG: Session {session_id_str} already finished")
                return {"status": "skipped", "reason": "already finished"}

            # 2. Fetch Answers from Redis
            print(f"DEBUG: Fetching answers from Redis")
            cache_key = f"exam_answers:{user_id_str}:{session_id_str}"
            redis_answers = await redis_service.redis.hgetall(cache_key)
            print(f"DEBUG: Found {len(redis_answers)} answers in Redis")
            
            # 3. Fetch Questions to Calculate Scores
            print(f"DEBUG: Fetching questions for package {session.package_id}")
            result = await db.execute(
                select(Question)
                .options(selectinload(Question.options))
                .where(Question.package_id == session.package_id)
            )
            questions = result.scalars().all()
            print(f"DEBUG: Found {len(questions)} questions in package")
            
            score_twk = 0
            score_tiu = 0
            score_tkp = 0
            db_answers = []
            
            for q in questions:
                # Use str(q.id) consistently
                q_id_str = str(q.id)
                selected_option_id_str = redis_answers.get(q_id_str)
                
                if not selected_option_id_str:
                    continue
                    
                if isinstance(selected_option_id_str, bytes):
                    selected_option_id_str = selected_option_id_str.decode('utf-8')
                
                try:
                    selected_option_id = uuid.UUID(selected_option_id_str)
                except ValueError:
                    print(f"DEBUG: Invalid UUID for question {q_id_str}: {selected_option_id_str}")
                    continue
                    
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
            
            # 4. Update Database
            print(f"DEBUG: Calculating total score")
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
            
            # 5. Update Leaderboard in Redis
            print(f"DEBUG: Updating leaderboard for {user_email}")
            await redis_service.redis.zadd("leaderboard:national", {user_email: total_score})
            
            # 6. Cleanup
            print(f"DEBUG: Cleaning up Redis cache")
            await redis_service.redis.delete(cache_key)
            
            print(f"DEBUG: Scoring completed for session {session_id_str}")
            return {
                "session_id": session_id_str,
                "total_score": total_score,
                "status": "success"
            }
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
    """
    Background task to calculate exam scores and update the database.
    """
    return asyncio.run(async_run_scoring(session_id, user_id, user_email))
