from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from backend.db.session import get_async_session
from backend.models.models import Package, Question, User
from backend.api.v1.endpoints.auth import get_current_admin
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/admin/packages", tags=["admin-packages"])

class PackageCreate(BaseModel):
    title: str
    description: str
    price: int = 0
    is_premium: bool = False
    category: str
    is_published: bool = False
    is_weekly: bool = False
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class PackageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    is_premium: Optional[bool] = None
    category: Optional[str] = None
    is_published: Optional[bool] = None
    is_weekly: Optional[bool] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class PackageResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    price: int
    is_premium: bool
    category: str
    is_published: bool
    is_weekly: bool
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    question_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class PackageListResponse(BaseModel):
    items: List[PackageResponse]
    total: int
    page: int
    size: int

@router.get("", response_model=PackageListResponse)
async def list_packages_admin(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # Base query with question count
    # We use a subquery to count questions per package
    q_count_sub = select(
        Question.package_id, 
        func.count(Question.id).label("q_count")
    ).group_by(Question.package_id).subquery()

    stmt = select(Package, func.coalesce(q_count_sub.c.q_count, 0)).outerjoin(
        q_count_sub, Package.id == q_count_sub.c.package_id
    )

    # Filters
    if search:
        stmt = stmt.where(or_(
            Package.title.ilike(f"%{search}%"),
            Package.description.ilike(f"%{search}%")
        ))
    if category:
        stmt = stmt.where(Package.category == category)

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Pagination and Order
    stmt = stmt.order_by(Package.title).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    
    items = []
    for row in result.all():
        pkg = row[0]
        count = row[1]
        # Attach count to pkg for schema mapping
        pkg.question_count = count
        items.append(pkg)

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.post("", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package_admin(
    package_in: PackageCreate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    new_package = Package(**package_in.model_dump())
    db.add(new_package)
    await db.commit()
    await db.refresh(new_package)
    # New package has 0 questions
    new_package.question_count = 0
    return new_package

@router.put("/{package_id}", response_model=PackageResponse)
async def update_package_admin(
    package_id: uuid.UUID,
    package_in: PackageUpdate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    update_data = package_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(package, key, value)
    
    await db.commit()
    await db.refresh(package)
    
    # Get question count for response
    q_count_result = await db.execute(select(func.count(Question.id)).where(Question.package_id == package_id))
    package.question_count = q_count_result.scalar() or 0
    
    # Invalidate Cache
    await redis_service.clear_pattern("packages:*")
    await redis_service.clear_pattern("package_public:*")

    return package

@router.delete("/{package_id}")
async def delete_package_admin(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # FIX: Cek apakah paket sudah pernah dibeli/ditransaksikan
    from backend.models.models import UserTransaction
    trans_count = await db.scalar(
        select(func.count(UserTransaction.id))
        .where(UserTransaction.package_id == package_id)
    )
    if trans_count and trans_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Tidak dapat menghapus paket yang sudah dibeli oleh peserta. Silakan ubah statusnya menjadi tidak aktif atau edit paket ini."
        )

    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    await db.delete(package)
    await db.commit()
    
    # Invalidate Cache
    await redis_service.clear_pattern("packages:*")
    await redis_service.clear_pattern("package_public:*")
    
    return {"message": "Package deleted successfully"}
