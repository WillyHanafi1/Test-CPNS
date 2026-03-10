from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from backend.db.session import get_async_session
from backend.models.models import Package, Question
from backend.schemas.package import Package as PackageSchema, PackageCreate, Question as QuestionSchema, QuestionCreate
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/packages", tags=["packages"])

@router.get("/", response_model=List[PackageSchema])
async def get_packages(
    skip: int = 0, 
    limit: int = 10, 
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session)
):
    # Try cache first
    cache_key = f"packages:{category}:{skip}:{limit}"
    cached_data = await redis_service.get_cache(cache_key)
    if cached_data:
        return cached_data

    # Database query
    query = select(Package)
    if category:
        query = query.where(Package.category == category)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    packages = result.scalars().all()
    
    # Set cache
    packages_data = [PackageSchema.from_orm(p).dict() for p in packages]
    await redis_service.set_cache(cache_key, packages_data, expire=300) # 5 minutes cache
    
    return packages

@router.get("/{package_id}", response_model=PackageSchema)
async def get_package(package_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    # Try cache first
    cache_key = f"package:{package_id}"
    cached_data = await redis_service.get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Set cache
    await redis_service.set_cache(cache_key, PackageSchema.from_orm(package).dict())
    
    return package

# Protected Admin Endpoints (Initial implementation, assuming admin has valid token)
@router.post("/", response_model=PackageSchema, status_code=status.HTTP_201_CREATED)
async def create_package(package_in: PackageCreate, db: AsyncSession = Depends(get_async_session)):
    new_package = Package(**package_in.dict())
    db.add(new_package)
    await db.commit()
    await db.refresh(new_package)
    
    # Clear list caches
    await redis_service.clear_pattern("packages:*")
    
    return new_package

@router.post("/{package_id}/questions", response_model=QuestionSchema, status_code=status.HTTP_201_CREATED)
async def create_question(
    package_id: uuid.UUID, 
    question_in: QuestionCreate, 
    db: AsyncSession = Depends(get_async_session)
):
    # Verify package exists
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    new_question = Question(**question_in.dict(), package_id=package_id)
    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)
    
    return new_question
