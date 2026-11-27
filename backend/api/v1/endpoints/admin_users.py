from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime

from backend.db.session import get_async_session
from backend.models.models import User, UserProfile, ExamSession, UserTransaction, AuditEvent
from backend.api.v1.endpoints.auth import get_current_admin
from backend.core.utils import sanitize_search
import logging

logger = logging.getLogger("admin.audit")

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

class UserProfileSchema(BaseModel):
    full_name: str
    target_instansi: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    is_active: bool
    auth_provider: str = "local"
    created_at: datetime
    profile: Optional[UserProfileSchema] = None
    is_pro: bool = False
    pro_expires_at: Optional[datetime] = None
    total_sessions: int = 0
    total_transactions: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int

class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_pro: Optional[bool] = None
    pro_expires_at: Optional[datetime] = None

@router.get("", response_model=UserListResponse)
async def list_users_admin(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_pro: Optional[bool] = None,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # 1. Create Subqueries for stats
    sess_sub = select(
        ExamSession.user_id, func.count(ExamSession.id).label("s_count")
    ).where(ExamSession.is_preview.is_(False)).group_by(ExamSession.user_id).subquery()

    trans_sub = select(
        UserTransaction.user_id, func.count(UserTransaction.id).label("t_count")
    ).where(UserTransaction.payment_status == "success").group_by(UserTransaction.user_id).subquery()

    # 2. Base query with profile loaded and stats joined
    stmt = select(
        User, 
        func.coalesce(sess_sub.c.s_count, 0), 
        func.coalesce(trans_sub.c.t_count, 0)
    ).options(selectinload(User.profile)) \
     .outerjoin(sess_sub, User.id == sess_sub.c.user_id) \
     .outerjoin(trans_sub, User.id == trans_sub.c.user_id)

    # Filters (outerjoin profile so users without a profile row still match by email)
    if search:
        safe_search = sanitize_search(search)
        stmt = stmt.outerjoin(User.profile)
        stmt = stmt.where(or_(
            User.email.ilike(f"%{safe_search}%"),
            UserProfile.full_name.ilike(f"%{safe_search}%")
        ))
    
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if is_pro is not None:
        stmt = stmt.where(User.is_pro == is_pro)

    # Total count calculation - OPTIMIZED (No subquery, no selectinload)
    count_stmt = select(func.count(User.id))
    
    if search:
        safe_search = sanitize_search(search)
        count_stmt = count_stmt.outerjoin(User.profile)
        count_stmt = count_stmt.where(or_(
            User.email.ilike(f"%{safe_search}%"),
            UserProfile.full_name.ilike(f"%{safe_search}%")
        ))
    
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if is_active is not None:
        count_stmt = count_stmt.where(User.is_active == is_active)
    if is_pro is not None:
        count_stmt = count_stmt.where(User.is_pro == is_pro)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Execute with pagination
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    
    # Mapping results
    items = []
    for row in result.all():
        user = row[0]
        user_dict = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "auth_provider": user.auth_provider,
            "created_at": user.created_at,
            "profile": user.profile,
            "is_pro": user.is_pro,
            "pro_expires_at": user.pro_expires_at,
            "total_sessions": row[1],
            "total_transactions": row[2]
        }
        items.append(user_dict)

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_detail_admin(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Stats
    s_count = await db.execute(
        select(func.count(ExamSession.id)).where(
            ExamSession.user_id == user.id,
            ExamSession.is_preview.is_(False),
        )
    )
    user.total_sessions = s_count.scalar() or 0
    
    t_count = await db.execute(select(func.count(UserTransaction.id)).where(
        (UserTransaction.user_id == user.id) & (UserTransaction.payment_status == "success")
    ))
    user.total_transactions = t_count.scalar() or 0
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    if user.id == admin.id:
        if update_data.get("role") and update_data["role"] != "admin":
            raise HTTPException(status_code=400, detail="Tidak dapat menurunkan peran akun admin sendiri.")
        if update_data.get("is_active") is False:
            raise HTTPException(status_code=400, detail="Tidak dapat menonaktifkan akun admin sendiri.")
    if "role" in update_data and update_data["role"] not in ("admin", "participant"):
        raise HTTPException(status_code=422, detail="Peran harus 'admin' atau 'participant'.")

    before = {
        key: (getattr(user, key).isoformat() if isinstance(getattr(user, key), datetime) else getattr(user, key))
        for key in update_data
    }
    after = {
        key: (val.isoformat() if isinstance(val, datetime) else val)
        for key, val in update_data.items()
    }
    if any(key in update_data and update_data[key] != getattr(user, key) for key in ('role', 'is_active')):
        user.auth_version += 1
    for key, value in update_data.items():
        setattr(user, key, value)
    db.add(AuditEvent(actor_id=admin.id, action='admin.user_update', entity_id=str(user_id),
        details={'before': before, 'after': after}))
    
    await db.commit()
    await db.refresh(user)
    
    logger.info(
        f"ADMIN_ACTION: User {user_id} updated. Fields: {list(update_data.keys())} by Admin {admin.email} (ID: {admin.id})"
    )
    
    # Reload profile and stats for response
    return await get_user_detail_admin(user_id, db, admin)

@router.delete("/{user_id}")
async def delete_user_admin(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # Safety: Don't delete self
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    
    # [SECURITY] Soft delete instead of hard delete to preserve:
    # - Financial transaction records (audit/tax compliance)
    # - Exam history data integrity  
    # - Ability to undo accidental deletions
    if user.is_active:
        user.is_active = False
        user.auth_version += 1
        db.add(AuditEvent(
            actor_id=admin.id,
            action='admin.user_deactivate',
            entity_id=str(user_id),
            details={'before': {'is_active': True}, 'after': {'is_active': False}},
        ))
    await db.commit()
    
    logger.info(
        f"ADMIN_ACTION: User {user_id} (Email: {user.email}) DEACTIVATED (soft-deleted) by Admin {admin.email} (ID: {admin.id})"
    )
    
    return {"message": "User deleted successfully"}
