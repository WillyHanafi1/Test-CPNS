import asyncio
import os
import sys
from sqlalchemy import select, func

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db.session import async_session_maker
from backend.models.models import Question

async def check():
    async with async_session_maker() as db:
        result = await db.execute(select(func.count(Question.id)).where(Question.package_id == '451ace89-a45d-440a-a931-66a91fe72f32'))
        count = result.scalar()
        print(f"Questions in Latihan 6: {count}")

if __name__ == "__main__":
    asyncio.run(check())
