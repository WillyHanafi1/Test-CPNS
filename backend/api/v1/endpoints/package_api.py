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
from backend.api.v1.endpoints.auth import get_current_user, get_optional_user
from datetime import datetime, timezone

router = APIRouter(prefix="/packages", tags=["packages"])

@router.get("", response_model=List[PackageSchema])
async def get_packages(
    skip: int = 0,
    limit: int = 10,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Public Catalog: Lists packages.
    If authenticated, includes user's current status (ongoing/finished).
    """
    cache_key = f"packages:{category}:{search}:{skip}:{limit}"
    cached_data = await redis_service.get_cache(cache_key)
    if cached_data:
        return cached_data

    query = select(Package).where(Package.is_published == True, Package.is_weekly == False)
    if category:
        query = query.where(Package.category == category)
    if search:
        query = query.where(
            Package.title.ilike(f"%{search}%") |
            Package.description.ilike(f"%{search}%")
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    packages = result.scalars().all()

    # If user is logged in, get their session statuses
    user_session_map = {}
    if current_user:
        from backend.models.models import ExamSession
        from sqlalchemy import and_
        package_ids = [p.id for p in packages]
        sessions_result = await db.execute(
            select(ExamSession.package_id, ExamSession.status)
            .where(
                and_(
                    ExamSession.user_id == current_user.id,
                    ExamSession.package_id.in_(package_ids)
                )
            )
        )
        # In case of multiple sessions (practice), 'finished' takes precedence, then 'ongoing'
        for pkg_id, status_val in sessions_result:
            if pkg_id not in user_session_map or status_val == "finished":
                user_session_map[pkg_id] = status_val

    # Construct response objects manually to include user_status
    response_packages = []
    for p in packages:
        p_data = PackageSchema.model_validate(p)
        p_data.user_status = user_session_map.get(p.id)
        response_packages.append(p_data)

    # Note: We skip caching for authenticated users to ensure status accuracy,
    # or we could cache only the base query result.
    if not current_user:
        packages_data = [p.model_dump() for p in response_packages]
        await redis_service.set_cache(cache_key, packages_data, expire=300)

    return response_packages


@router.get("/weekly-active", response_model=Optional[PackageSchema])
async def get_active_weekly_package(
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get the currently active weekly tryout (if any).
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    query = (
        select(Package)
        .where(
            Package.is_weekly == True,
            Package.is_published == True,
            Package.start_at <= now,
            Package.end_at >= now
        )
        .order_by(Package.start_at.desc())
        .limit(1)
    )
    
    result = await db.execute(query)
    package = result.scalar_one_or_none()
    
    if not package:
        return None

    user_status = None
    if current_user:
        from backend.models.models import ExamSession
        session_result = await db.execute(
            select(ExamSession.status)
            .where(
                ExamSession.user_id == current_user.id,
                ExamSession.package_id == package.id
            )
            .order_by(ExamSession.start_time.desc())
            .limit(1)
        )
        user_status = session_result.scalar()

    p_data = PackageSchema.model_validate(package)
    p_data.user_status = user_status
    
    return p_data


@router.get("/{package_id}", response_model=PackagePublic)
async def get_package(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_optional_user)
):
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
        select(Package).where(Package.id == package_id, Package.is_published == True)
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found or not published")

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

    # Fix: use timezone-aware datetime
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. MENGUNCI SEMUA ORANG (Termasuk PRO) JIKA TRYOUT BELUM DIMULAI
    if package.start_at and package.start_at > now:
        return {"has_access": False, "reason": "upcoming", "start_at": package.start_at}

    # 2. CEK STATUS PRO (Bisa akses soal meski masa tryout mingguan sudah lewat)
    if current_user.is_pro_active:
        return {"has_access": True, "reason": "pro_account"}

    # 3. MENGUNCI PENGGUNA GRATIS JIKA MASA TRYOUT SUDAH HABIS
    if package.end_at and package.end_at < now:
        return {"has_access": False, "reason": "expired", "end_at": package.end_at}

    # 4. CEK PAKET PREMIUM UMUM
    if not package.is_premium or package.price == 0:
        return {"has_access": True}

    # 5. CEK TRANSAKSI PEMBELIAN PAKET (Individual)
    # Query transaksi sukses untuk paket ini yang belum expired
    from sqlalchemy import and_
    tx_result = await db.execute(
        select(UserTransaction)
        .where(
            and_(
                UserTransaction.user_id == current_user.id,
                UserTransaction.package_id == package_id,
                UserTransaction.payment_status == "success"
            )
        )
        .order_by(UserTransaction.created_at.desc())
        .limit(1)
    )
    transaction = tx_result.scalar_one_or_none()
    
    if transaction and (
        not transaction.access_expires_at or transaction.access_expires_at > now
    ):
        return {"has_access": True, "reason": "purchased"}

    return {"has_access": False, "reason": "subscription_required"}


# ── Admin Endpoints have been moved to admin/packages.py and admin/questions.py ──
