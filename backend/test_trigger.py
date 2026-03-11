import asyncio
import httpx
from datetime import timedelta
from backend.core.security import create_access_token
from backend.db.session import async_session_maker, engine
from sqlalchemy import select
from backend.models.models import ExamSession, User
import uuid

async def trigger():
    try:
        session_id = uuid.UUID("217b04ee-55b5-41d7-98f8-b0d488e7b669")
        async with async_session_maker() as db:
            result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
            session = result.scalar_one_or_none()
            if not session:
                print("Session not found")
                return
                
            result_user = await db.execute(select(User).where(User.id == session.user_id))
            user = result_user.scalar_one()

            # Create token
            access_token_expires = timedelta(minutes=60 * 24)
            access_token = create_access_token(
                data={"sub": user.email, "role": user.role},
                expires_delta=access_token_expires
            )
            print(f"Token created for {user.email}")
            
        cookies = {"access_token": access_token} 
        url = f"http://localhost:8002/api/v1/exam/finish/{session_id}"
        
        print(f"Requesting {url}")
        async with httpx.AsyncClient() as client:
            res = await client.post(url, cookies=cookies)
            
        print("Status:", res.status_code)
        print("Response:", res.text)
        print("Headers:", res.headers)
    except Exception as e:
        print("Error:", e)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(trigger())
