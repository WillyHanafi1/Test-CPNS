import asyncio
import os
import sys
from sqlalchemy import select

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db.session import async_session_maker
from backend.models.models import Question

async def check():
    async with async_session_maker() as db:
        result = await db.execute(select(Question).where(Question.package_id == '451ace89-a45d-440a-a931-66a91fe72f32').order_by(Question.number).limit(3))
        questions = result.scalars().all()
        for q in questions:
            print(f"Num: {q.number}, Content: {q.content[:100]}...")

if __name__ == "__main__":
    asyncio.run(check())
