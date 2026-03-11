import asyncio
from backend.core.tasks import async_run_scoring
from backend.db.session import async_session_maker
from sqlalchemy import select
from backend.models.models import ExamSession, User
import uuid
import sys
from backend.core.redis_service import redis_service

async def main():
    try:
        session_id = uuid.UUID("217b04ee-55b5-41d7-98f8-b0d488e7b669")
    except Exception:
        print("Invalid UUID")
        return

    try:
        async with async_session_maker() as db:
            result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                result_user = await db.execute(select(User).where(User.id == session.user_id))
                user = result_user.scalar_one()
                
                print(f"Session found: {session.id}, User: {user.email}")
                try:
                    res = await async_run_scoring(str(session.id), str(user.id), user.email)
                    print("SCORING RESULT:", res)
                    with open("error.log", "w") as f:
                        f.write(f"SUCCESS: {res}")
                except Exception as e:
                    import traceback
                    with open("error.log", "w") as f:
                        f.write(traceback.format_exc())
            else:
                print("Session not found")
                with open("error.log", "w") as f:
                    f.write("Session not found")
    finally:
        pass

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        import traceback
        with open("error.log", "w") as f:
            f.write("OUTER EXCEPTION: " + traceback.format_exc())
