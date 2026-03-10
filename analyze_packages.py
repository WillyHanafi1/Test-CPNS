import asyncio
from sqlalchemy import select
from backend.db.session import async_session_maker
from backend.models.models import Package, Question

async def analyze_content():
    async with async_session_maker() as db:
        # Get all packages
        result = await db.execute(select(Package))
        packages = result.scalars().all()
        print(f"Total Packages: {len(packages)}")
        
        for pkg in packages:
            print(f"\n--- Package: {pkg.title} ---")
            print(f"Category: {pkg.category}")
            
            # Get 2 sample questions for each package
            q_result = await db.execute(select(Question).where(Question.package_id == pkg.id).limit(2))
            questions = q_result.scalars().all()
            
            if not questions:
                print("No questions found in this package.")
            else:
                for q in questions:
                    print(f"Q#{q.number}: {q.content[:100]}...")

if __name__ == "__main__":
    asyncio.run(analyze_content())
