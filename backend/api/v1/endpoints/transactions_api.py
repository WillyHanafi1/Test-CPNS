from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, distinct
from sqlalchemy.orm import selectinload
from typing import List, Optional

from backend.db.session import get_async_session
from backend.models.models import User, UserTransaction, UserProfile
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.doku_service import doku_service
from backend.services.payments import begin_checkout, receive_notification, reconcile_transaction, resumable_payment_url
from backend.services.payments import fulfill_transaction as fulfill_transaction
from backend.config import settings
from backend.services.revenue import month_bounds, payment_time
from backend.schemas.transaction import DonationRequest, DonationResponse, SupporterResponse, TopSupporter, DonationStats
from backend.core.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/upgrade-pro")
@limiter.limit("5/minute")
async def create_pro_upgrade_transaction(request: Request, response: Response, callback_url: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    return await begin_checkout(db, current_user, "pro_upgrade", settings.PRO_PRICE, callback_url)

@router.get("/my-transactions")
async def get_user_transactions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's transaction history.
    """
    result = await db.execute(
        select(UserTransaction)
        .where(UserTransaction.user_id == current_user.id)
        .order_by(UserTransaction.created_at.desc())
        .limit(limit).offset(offset)
    )
    transactions = result.scalars().all()
    return [{"id": t.id, "order_id": t.order_id, "amount": t.amount,
             "payment_status": t.payment_status, "transaction_type": t.transaction_type,
             "created_at": t.created_at, "paid_at": t.paid_at, "duration_days": t.duration_days,
             "payment_expires_at": t.payment_expires_at,
             "payment_url": resumable_payment_url(t)} for t in transactions]

@router.post("/donate", response_model=DonationResponse)
@limiter.limit("5/minute")
async def create_donation_transaction(request: Request, response: Response, payload: DonationRequest,
    db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    if payload.amount < 1000:
        raise HTTPException(400, "Minimal donasi adalah Rp 1.000")
    if payload.message and len(payload.message) > 150:
        raise HTTPException(400, "Pesan dukungan maksimal 150 karakter.")
    return await begin_checkout(db, current_user, "donation", payload.amount, payload.callback_url,
                                message=payload.message, is_anonymous=payload.is_anonymous)

@router.get("/donations/wall-of-fame", response_model=List[SupporterResponse])
async def get_wall_of_fame(
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get 20 latest successful donations for the wall of fame.
    """
    result = await db.execute(
        select(UserTransaction)
        .options(selectinload(UserTransaction.user).selectinload(User.profile))
        .where(UserTransaction.transaction_type == "donation")
        .where(UserTransaction.payment_status == "success")
        .order_by(payment_time().desc())
        .limit(20)
    )
    donations = result.scalars().all()
    
    response = []
    for d in donations:
        response.append({
            "full_name": "Orang Baik" if d.is_anonymous else (d.user.profile.full_name if d.user.profile else d.user.email.split('@')[0]),
            "amount": d.amount,
            "message": d.message,
            "created_at": d.created_at,
            "paid_at": d.paid_at,
            "is_anonymous": d.is_anonymous
        })
    return response

@router.get("/donations/top", response_model=List[TopSupporter])
async def get_top_supporters(
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get top supporters. Known users are grouped/summed, 
    while anonymous donations are listed individually as 'Orang Baik'.
    """
    
    # 1. Get summed amounts for known users (is_anonymous=False)
    known_users_query = await db.execute(
        select(
            User.email,
            UserProfile.full_name,
            func.sum(UserTransaction.amount).label("total_amount")
        )
        .join(UserTransaction, User.id == UserTransaction.user_id)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .where(UserTransaction.payment_status == "success")
        .where(UserTransaction.transaction_type == "donation")
        .where(UserTransaction.is_anonymous.is_(False))
        .group_by(User.id, User.email, UserProfile.full_name)
        .order_by(desc("total_amount"))
        .limit(10)
    )
    known_data = known_users_query.all()
    
    # 2. Get individual anonymous donations (Top 10 only)
    anon_query = await db.execute(
        select(UserTransaction.amount)
        .where(UserTransaction.payment_status == "success")
        .where(UserTransaction.transaction_type == "donation")
        .where(UserTransaction.is_anonymous.is_(True))
        .order_by(desc(UserTransaction.amount))
        .limit(10)
    )
    anon_data = anon_query.scalars().all()
    
    # 3. Combine and transform
    combined: List[dict] = []
    
    # Add known users
    for email, full_name, total_amount in known_data:
        display_name = full_name if full_name else (email.split('@')[0] if email else "User")
        combined.append({
            "full_name": display_name,
            "total_amount": total_amount
        })
        
    # Add anonymous entries individually
    for amount in anon_data:
        combined.append({
            "full_name": "Orang Baik",
            "total_amount": amount
        })
        
    # 4. Final sort and limit
    combined.sort(key=lambda x: x["total_amount"], reverse=True)
    return combined[:10]

@router.get("/donations/stats", response_model=DonationStats)
async def get_donation_stats(
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get monthly donation statistics and progress towards goal.
    """
    first_day_of_month, next_month = month_bounds()
    
    # Target goal from settings
    target_goal = settings.DONATION_MONTHLY_GOAL
    
    # Calculate stats
    result = await db.execute(
        select(
            func.sum(UserTransaction.amount).label("total_amount"),
            func.count(distinct(UserTransaction.user_id)).label("supporter_count")
        )
        .where(UserTransaction.transaction_type == "donation")
        .where(UserTransaction.payment_status == "success")
        .where(payment_time() >= first_day_of_month, payment_time() < next_month)
    )
    stats_data = result.one()
    
    total_amount = stats_data.total_amount or 0
    supporter_count = stats_data.supporter_count or 0
    percentage = min((total_amount / target_goal) * 100.0, 100.0) if target_goal > 0 else 0.0
    
    return {
        "total_amount": total_amount,
        "target_amount": target_goal,
        "percentage": float(f"{percentage:.2f}"),
        "supporter_count": supporter_count
    }

@router.post("/webhook")
@limiter.limit("30/minute")
async def doku_webhook(request: Request, response: Response, db: AsyncSession = Depends(get_async_session)):
    body = await request.body()
    try:
        verified = doku_service.verify_notification(dict(request.headers), body, request.url.path)
        await receive_notification(db, verified)
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(401, "Notifikasi pembayaran tidak sah.")
    return {"status": "ok"}

@router.get("/status/{order_id}")
async def transaction_status(order_id: str, db: AsyncSession = Depends(get_async_session),
                             user: User = Depends(get_current_user)):
    transaction = await db.scalar(select(UserTransaction).where(
        UserTransaction.order_id == order_id, UserTransaction.user_id == user.id))
    if not transaction:
        raise HTTPException(404, "Transaksi tidak ditemukan.")
    await reconcile_transaction(db, order_id)
    await db.refresh(transaction)
    await db.refresh(user)
    return {"order_id": transaction.order_id, "status": transaction.payment_status,
            "is_pro": user.is_pro_active, "expires_at": user.pro_expires_at,
            "amount": transaction.amount, "transaction_type": transaction.transaction_type,
            "paid_at": transaction.paid_at,
            "payment_expires_at": transaction.payment_expires_at,
            "payment_url": resumable_payment_url(transaction)}
