from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_async_session
from backend.models.models import ExamSession, Package, Question, User
from backend.core.rate_limiter import _get_client_ip, limiter
from backend.core.redis_service import redis_service
from backend.services.visitors import get_public_visitor_summary, record_visit

router = APIRouter(prefix="/public", tags=["public"])

PUBLIC_STATS_CACHE_KEY = "public_stats_v2"
PUBLIC_STATS_CACHE_TTL = 3600


class VisitBeaconRequest(BaseModel):
    path: str = Field(default="/", max_length=256)
    heartbeat: bool = False


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_async_session)):
    cached = await redis_service.get_cache(PUBLIC_STATS_CACHE_KEY)
    if isinstance(cached, dict) and "users_count" in cached:
        return cached

    packages = (
        await db.scalar(
            select(func.count(Package.id)).where(
                Package.is_published.is_(True),
                Package.is_active.is_(True),
            )
        )
        or 0
    )
    questions = (
        await db.scalar(
            select(func.count(Question.id))
            .join(Package)
            .where(
                Package.is_published.is_(True),
                Package.is_active.is_(True),
            )
        )
        or 0
    )
    users = (
        await db.scalar(
            select(func.count(User.id)).where(
                User.role == "participant",
                User.is_active.is_(True),
            )
        )
        or 0
    )
    completed_sessions = (
        await db.scalar(
            select(func.count(ExamSession.id)).where(
                ExamSession.status == "finished",
                ExamSession.is_preview.is_(False),
            )
        )
        or 0
    )

    payload = {
        "packages_count": int(packages),
        "questions_count": int(questions),
        "users_count": int(users),
        "completed_sessions_count": int(completed_sessions),
    }
    await redis_service.set_cache(
        PUBLIC_STATS_CACHE_KEY, payload, expire=PUBLIC_STATS_CACHE_TTL
    )
    return payload


@router.post("/visit")
@limiter.limit("120/minute")
async def track_visit(
    request: Request,
    body: VisitBeaconRequest,
    db: AsyncSession = Depends(get_async_session),
):
    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    return await record_visit(
        db,
        ip=ip,
        user_agent=user_agent,
        raw_path=body.path,
        heartbeat=body.heartbeat,
    )


@router.get("/visitors")
async def public_visitors(db: AsyncSession = Depends(get_async_session)):
    return await get_public_visitor_summary(db)
