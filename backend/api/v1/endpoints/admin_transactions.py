from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from backend.db.session import get_async_session
from backend.models.models import UserTransaction, User, Package
from backend.api.v1.endpoints.auth import get_current_admin

router = APIRouter(prefix="/admin/transactions", tags=["admin-transactions"])

class TransactionUser(BaseModel):
    email: str
    model_config = ConfigDict(from_attributes=True)

class TransactionPackage(BaseModel):
    title: str
    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    package_id: Optional[uuid.UUID] = None
    transaction_type: str
    order_id: Optional[str] = None
    payment_status: str
    amount: int
    snap_token: Optional[str] = None
    access_expires_at: Optional[datetime] = None
    created_at: datetime
    user: TransactionUser
    package: Optional[TransactionPackage] = None
    
    model_config = ConfigDict(from_attributes=True)

class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int

class TransactionSummaryResponse(BaseModel):
    total_revenue: int
    success_count: int
    pending_count: int
    failed_count: int

@router.get("", response_model=TransactionListResponse)
async def list_transactions_admin(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None, # User email
    status: Optional[str] = None, # pending, success, failed
    package_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    stmt = select(UserTransaction).options(
        selectinload(UserTransaction.user),
        selectinload(UserTransaction.package)
    )

    # Filters
    if search:
        stmt = stmt.join(UserTransaction.user).where(User.email.ilike(f"%{search}%"))
    if status:
        stmt = stmt.where(UserTransaction.payment_status == status)
    if package_id:
        stmt = stmt.where(UserTransaction.package_id == package_id)

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Execute with pagination
    stmt = stmt.order_by(UserTransaction.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/summary", response_model=TransactionSummaryResponse)
async def get_transaction_summary_admin(
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    # Total Revenue (Success only)
    rev_stmt = select(func.sum(UserTransaction.amount)).where(UserTransaction.payment_status == "success")
    rev_result = await db.execute(rev_stmt)
    total_revenue = rev_result.scalar() or 0

    # Counts by status
    count_stmt = select(
        UserTransaction.payment_status, 
        func.count(UserTransaction.id)
    ).group_by(UserTransaction.payment_status)
    count_result = await db.execute(count_stmt)
    
    counts = {row[0]: row[1] for row in count_result.all()}

    return {
        "total_revenue": total_revenue,
        "success_count": counts.get("success", 0),
        "pending_count": counts.get("pending", 0),
        "failed_count": counts.get("failed", 0)
    }

@router.put("/{transaction_id}/status")
async def update_transaction_status_admin(
    transaction_id: uuid.UUID,
    new_status: str, # pending, success, failed
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    from backend.api.v1.endpoints.transactions_api import fulfill_transaction
    
    result = await db.execute(select(UserTransaction).where(UserTransaction.id == transaction_id))
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Use the shared fulfillment logic
    if transaction.order_id:
        await fulfill_transaction(db, transaction.order_id, new_status)
    else:
        # Fallback for transactions without order_id (legacy)
        transaction.payment_status = new_status
        # If success, set access_expires_at (example: 1 year from now)
        if new_status == "success" and not transaction.access_expires_at:
            from datetime import timedelta, timezone
            transaction.access_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=365)
        await db.commit()
    
    return {"message": "Transaction status updated", "new_status": new_status}
