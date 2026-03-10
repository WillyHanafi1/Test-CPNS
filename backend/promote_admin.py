import asyncio
import sys
import os

# Ensure backend can be imported
sys.path.append(os.getcwd())

from backend.db.session import async_session_maker
from backend.models.models import User
from sqlalchemy import select, update

async def promote_admin():
    email = "admin@example.com" # Default from GEMINI.md or first user
    # Check if admin@example.com exists, otherwise take first user
    async with async_session_maker() as s:
        result = await s.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            result = await s.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            if user:
                email = user.email
        
        if user:
            print(f"Promoting user {email} to admin...")
            await s.execute(
                update(User)
                .where(User.email == email)
                .values(role="admin")
            )
            await s.commit()
            print("Done.")
        else:
            print("No users found to promote.")

if __name__ == "__main__":
    asyncio.run(promote_admin())
