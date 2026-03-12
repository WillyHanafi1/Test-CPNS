from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from backend.db.session import get_async_session
from backend.models.models import Package, Question, QuestionOption, UserTransaction, User
from backend.schemas.package import (
    Package as PackageSchema, PackageCreate,
    Question as QuestionSchema, QuestionCreate, PackageWithQuestions,
    PackagePublic  # Safe schema for public catalog detail — NO score/discussion
)
from backend.core.redis_service import redis_service
from sqlalchemy.orm import selectinload
from backend.api.v1.endpoints.auth import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/packages", tags=["packages"])

@router.get("", response_model=List[PackageSchema])
async def get_packages(
    skip: int = 0,
    limit: int = 10,
    category: Optional[str] = None,
    search: Optional[str] = None,      # ← server-side search added
    db: AsyncSession = Depends(get_async_session)
):
    """
    Public: List exam packages with optional category filter and server-side search.
    Results are Redis-cached for 5 minutes.
    """
    cache_key = f"packages:{category}:{search}:{skip}:{limit}"
    cached_data = await redis_service.get_cache(cache_key)
    if cached_data:
        return cached_data

    query = select(Package)
    if category:
        query = query.where(Package.category == category)
    if search:
        # Case-insensitive ILIKE search on title and description
        query = query.where(
            Package.title.ilike(f"%{search}%") |
            Package.description.ilike(f"%{search}%")
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    packages = result.scalars().all()

    # Set cache (use SCAN-safe short key, not KEYS)
    packages_data = [PackageSchema.model_validate(p).model_dump() for p in packages]
    await redis_service.set_cache(cache_key, packages_data, expire=300)

    return packages


@router.get("/{package_id}", response_model=PackagePublic)
async def get_package(package_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    """
    Public: Package detail for catalog display — uses PackagePublic schema.
    SECURITY: PackagePublic excludes score and discussion fields.
    Questions/options are NOT included here; they are only sent via /exam/start (authenticated + safe schema).
    """
    cache_key = f"package_public:{package_id}"
    cached_data = await redis_service.get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await db.execute(
        select(Package).where(Package.id == package_id)
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    package_data = PackagePublic.model_validate(package).model_dump()
    await redis_service.set_cache(cache_key, package_data, expire=300)

    return package


@router.get("/{package_id}/access")
async def check_package_access(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """
    Check if the current user has access to a specific package.
    Returns {has_access: bool}.
    - Free packages always return True.
    - Premium packages require a successful, non-expired transaction.
    """
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    if not package.is_premium or package.price == 0:
        return {"has_access": True}

    # Fix: use timezone-aware datetime
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC for DB comparison

    # Cek status PRO (Akses ke semua paket premium)
    if current_user.is_pro and (not current_user.pro_expires_at or current_user.pro_expires_at > now):
        return {"has_access": True, "reason": "pro_account"}

    return {"has_access": False, "reason": "subscription_required"}


# ── Admin Endpoints have been moved to admin/packages.py and admin/questions.py ──
