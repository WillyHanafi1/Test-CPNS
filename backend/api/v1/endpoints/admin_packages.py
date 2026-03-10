from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from backend.db.session import get_async_session
from backend.models.models import Package
from backend.api.v1.endpoints.auth import get_current_admin

router = APIRouter(prefix="/admin/packages", tags=["admin-packages"])

class PackageCreate(BaseModel):
    title: str
    description: str
    price: int = 0
    is_premium: bool = False
    category: str # TWK, TIU, TKP, Mix

class PackageResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    price: int
    is_premium: bool
    category: str
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[PackageResponse])
async def list_packages_admin(
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    result = await db.execute(select(Package).order_by(Package.title))
    return result.scalars().all()

@router.post("/", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package_admin(
    package_in: PackageCreate,
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    new_package = Package(**package_in.dict())
    db.add(new_package)
    await db.commit()
    await db.refresh(new_package)
    return new_package

@router.delete("/{package_id}")
async def delete_package_admin(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    await db.delete(package)
    await db.commit()
    return {"message": "Package deleted successfully"}
