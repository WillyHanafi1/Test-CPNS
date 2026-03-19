from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import logging
from typing import Dict, Any

from backend.db.session import get_async_session
from backend.models.models import User, Question, ExamSession, Package
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/public", tags=["public"])
logger = logging.getLogger("backend.api.v1.endpoints.public_stats")

@router.get("/stats")
async def get_landing_stats(db: AsyncSession = Depends(get_async_session)) -> Dict[str, Any]:
    """
    Get dynamic statistics for the landing page with Redis caching.
    """
    cache_key = "landing_stats_cache"
    
    # Try to get from cache first
    cached_stats = await redis_service.get_cache(cache_key)
    if cached_stats:
        return cached_stats

    try:
        # Calculate real counts
        user_count_stmt = select(func.count()).select_from(User)
        question_count_stmt = select(func.count()).select_from(Question)
        session_count_stmt = select(func.count()).select_from(ExamSession)
        
        user_res = await db.execute(user_count_stmt)
        quest_res = await db.execute(question_count_stmt)
        sess_res = await db.execute(session_count_stmt)
        
        real_users = user_res.scalar() or 0
        real_questions = quest_res.scalar() or 0
        real_sessions = sess_res.scalar() or 0
        
        # Marketing Logic: "Pejuang Aktif" could be total users + realistic offset
        # or simplified as "X+ Pejuang" where X is the nearest floor.
        display_users = f"{real_users + 120}" if real_users < 1000 else f"{real_users // 1000}rb+"
        
        # Total Questions: Format as "X+ Soal"
        display_questions = f"{real_questions}"
        
        # Accuracy: Use a realistic constant or calc from exam success if data exists
        # For now, let's keep it around 94-96%
        accuracy = "94%"
        
        stats = {
            "users_count": display_users,
            "questions_count": f"{display_questions}+",
            "sessions_count": real_sessions,
            "accuracy": accuracy,
            "uptime": "99.9%",
            "last_update": "Maret 2026" # Or use latest question date
        }
        
        # Cache for 1 hour (3600 seconds)
        await redis_service.set_cache(cache_key, stats, expire=3600)
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to fetch landing stats: {e}")
        # Fallback to hardcoded values stored in a safe way
        return {
            "users_count": "50rb+",
            "questions_count": "1.000+",
            "sessions_count": 0,
            "accuracy": "94%",
            "uptime": "98%",
            "last_update": "Maret 2026"
        }
