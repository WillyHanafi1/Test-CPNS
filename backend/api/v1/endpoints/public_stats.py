from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_async_session
from backend.models.models import Package, Question

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_async_session)):
    packages = await db.scalar(select(func.count(Package.id)).where(Package.is_published.is_(True), Package.is_active.is_(True)))
    questions = await db.scalar(select(func.count(Question.id)).join(Package).where(Package.is_published.is_(True), Package.is_active.is_(True)))
    return {"packages_count": packages, "questions_count": questions}
