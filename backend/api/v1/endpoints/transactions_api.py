from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Literal, Optional

from backend.db.session import get_async_session
from backend.models.models import User, UserTransaction, AuditEvent
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.doku_service import doku_service
from backend.services.payments import begin_checkout, receive_notification, reconcile_transaction, resumable_payment_url
from backend.services.payments import fulfill_transaction as fulfill_transaction
from backend.config import settings
from backend.services import donations
from backend.schemas.transaction import DonationRequest, DonationResponse, SupporterResponse, TopSupporter, DonationStats, DonationOverview, DonationVisibility
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
             "created_at": t.created_at, "paid_at": t.paid_at, "duration_days": t.duration_days, "is_anonymous": t.is_anonymous,
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

@router.get("/donations/overview", response_model=DonationOverview)
async def donation_overview(period: Literal['month', 'all'] = 'month', limit: int = Query(10, ge=1, le=20),
                            db: AsyncSession = Depends(get_async_session)):
    return await donations.overview(db, period, limit)


@router.get("/donations/wall-of-fame", response_model=List[SupporterResponse])
async def get_wall_of_fame(period: Literal['month', 'all'] = 'all', limit: int = Query(20, ge=1, le=20),
                           db: AsyncSession = Depends(get_async_session)):
    return await donations.recent_supporters(db, period, limit)


@router.get("/donations/top", response_model=List[TopSupporter])
async def get_top_supporters(period: Literal['month', 'all'] = 'all', limit: int = Query(10, ge=1, le=20),
                             db: AsyncSession = Depends(get_async_session)):
    return await donations.top_supporters(db, period, limit)


@router.get("/donations/stats", response_model=DonationStats)
async def get_donation_stats(db: AsyncSession = Depends(get_async_session)):
    return await donations.statistics(db)


@router.patch("/donations/{order_id}/visibility")
async def update_donation_visibility(order_id: str, payload: DonationVisibility,
                                     db: AsyncSession = Depends(get_async_session),
                                     current_user: User = Depends(get_current_user)):
    row = await db.scalar(select(UserTransaction).where(UserTransaction.order_id == order_id,
        UserTransaction.user_id == current_user.id, UserTransaction.transaction_type == 'donation').with_for_update())
    if row is None:
        raise HTTPException(404, 'Donasi tidak ditemukan.')
    if row.is_anonymous != payload.is_anonymous:
        row.is_anonymous = payload.is_anonymous
        db.add(AuditEvent(actor_id=current_user.id, action='donation.visibility', entity_id=order_id,
                          details={'is_anonymous': payload.is_anonymous}))
        await db.commit()
    return {'order_id': row.order_id, 'is_anonymous': row.is_anonymous}


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
