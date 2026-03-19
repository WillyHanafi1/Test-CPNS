from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid
from typing import List, Optional
from backend.db.session import get_async_session
from backend.models.models import User, Feedback
from backend.api.v1.endpoints.auth import get_current_admin
from backend.schemas.feedback import FeedbackResponse

router = APIRouter(prefix="/admin/feedback", tags=["admin-feedback"])

@router.get("", response_model=List[FeedbackResponse])
async def list_feedback_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """
    List all user feedback/suggestions.
    """
    stmt = select(Feedback).options(selectinload(Feedback.user))
    
    if category:
        stmt = stmt.where(Feedback.category == category)
        
    stmt = stmt.order_by(Feedback.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    return result.scalars().all()

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
