from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from backend.core.rate_limiter import limiter
from backend.core.redis_service import redis_service

from backend.db.session import get_async_session
from backend.models.models import User
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.analytics_service import analytics_service
from backend.core.ai_service import ai_service

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/me/mastery")
async def get_my_mastery(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get topic mastery statistics for the current user.
    """
    cache_key = f"mastery_cache:{current_user.id}"
    cached_data = await redis_service.get_cache(cache_key)
    
    if cached_data:
        return cached_data
        
    mastery_data = await analytics_service.get_topic_mastery(db, current_user.id)
    await redis_service.set_cache(cache_key, mastery_data, expire=300)
    
    return mastery_data

@router.get("/me/weak-points")
async def get_my_weak_points(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Identify weak sub-categories for the current user.
    """
    return await analytics_service.get_weak_points(db, current_user.id)

@router.get("/me/mastery/digest")
@limiter.limit("5/hour")
async def get_my_mastery_digest(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an AI-driven digest of the user's topic mastery and weak points.
    Restricted to PRO users.
    """
    if not current_user.is_pro_active:
        raise HTTPException(
            status_code=403, 
            detail="Fitur Analisis AI Mastery hanya tersedia untuk akun PRO."
        )
    
    mastery_data = await analytics_service.get_topic_mastery(db, current_user.id)
    weak_points = await analytics_service.get_weak_points(db, current_user.id)
    
    if not mastery_data:
        return {"message": "Belum ada data ujian yang cukup untuk dianalisis."}
        
    return await ai_service.generate_mastery_digest(mastery_data, weak_points)
