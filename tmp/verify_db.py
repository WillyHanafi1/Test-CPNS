import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from backend.db.session import get_async_session
from backend.models.models import User
from backend.config import settings

async def verify():
    print(f"Checking DATABASE_URL: {settings.DATABASE_URL[:40]}...")
    try:
        async for db in get_async_session():
            result = await db.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            if user:
                print(f"SUCCESS: Connected to DB. Found user: {user.email}")
            else:
                print("SUCCESS: Connected to DB, but no users found.")
            break
    except Exception as e:
        print(f"FAILED: Could not connect to DB. Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify())
