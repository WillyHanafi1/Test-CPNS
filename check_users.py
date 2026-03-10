import asyncio
import sys
import os
from sqlalchemy import select

# Ensure backend can be imported
sys.path.append(os.getcwd())

from backend.db.session import async_session_maker
from backend.models.models import User

async def check_users():
    async with async_session_maker() as s:
        result = await s.execute(select(User))
        users = result.scalars().all()
        
        print("\n--- User List ---")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role}")
        print("-----------------\n")

if __name__ == "__main__":
    asyncio.run(check_users())
