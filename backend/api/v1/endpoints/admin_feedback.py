from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid
from typing import List, Optional
from backend.db.session import get_async_session
from backend.models.models import User, Feedback
from backend.api.v1.endpoints.auth import get_current_admin
from backend.schemas.feedback import FeedbackResponse, FeedbackUpdate, FeedbackListResponse

router = APIRouter(prefix="/admin/feedback", tags=["admin-feedback"])

@router.get("", response_model=FeedbackListResponse)
async def list_feedback_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """
    List all user feedback/suggestions with filters.
    """
    stmt = select(Feedback).options(selectinload(Feedback.user))
    
    if category:
        stmt = stmt.where(Feedback.category == category)
    if status:
        stmt = stmt.where(Feedback.status == status)
    if priority:
        stmt = stmt.where(Feedback.priority == priority)
        
    # Optimized Count
    count_stmt = select(func.count(Feedback.id))
    if category:
        count_stmt = count_stmt.where(Feedback.category == category)
    if status:
        count_stmt = count_stmt.where(Feedback.status == status)
    if priority:
        count_stmt = count_stmt.where(Feedback.priority == priority)
        
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Feedback.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.patch("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback_admin(
    feedback_id: uuid.UUID,
    feedback_update: FeedbackUpdate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """
    Update feedback status, priority or admin notes.
    """
    stmt = select(Feedback).where(Feedback.id == feedback_id)
    result = await db.execute(stmt)
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    update_data = feedback_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(feedback, key, value)
        
    await db.commit()
    await db.refresh(feedback)
    
    # Reload with user relation for response
    stmt = select(Feedback).options(selectinload(Feedback.user)).where(Feedback.id == feedback_id)
    result = await db.execute(stmt)
    return result.scalar_one()

@router.delete("/{feedback_id}")
async def delete_feedback_admin(
    feedback_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """
    Delete a feedback entry.
    """
    stmt = select(Feedback).where(Feedback.id == feedback_id)
    result = await db.execute(stmt)
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
        
    await db.delete(feedback)
    await db.commit()
    return {"message": "Feedback deleted successfully"}
