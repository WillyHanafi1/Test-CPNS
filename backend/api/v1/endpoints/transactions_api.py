from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
import hashlib
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, distinct
import uuid
from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone

from backend.db.session import get_async_session
from backend.models.models import User, UserTransaction, Package
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.midtrans import midtrans_service
from backend.config import settings
from backend.schemas.transaction import DonationRequest, DonationResponse, SupporterResponse, TopSupporter, DonationStats
from backend.core.rate_limiter import limiter
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/upgrade-pro")
@limiter.limit("5/minute")
async def create_pro_upgrade_transaction(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Create a transaction for upgrading to a PRO account.
    Returns the Midtrans snap_token.
    """
    order_id = f"PRO-{current_user.id.hex[:8]}-{uuid.uuid4().hex[:6]}"
    
    # Prevention of pending transaction spam
    existing_pending = await db.scalar(
        select(func.count(UserTransaction.id)).where(
            UserTransaction.user_id == current_user.id,
            UserTransaction.payment_status == "pending",
            UserTransaction.transaction_type == "pro_upgrade"
        )
    )
    if existing_pending > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Sudah ada transaksi pending untuk upgrade PRO. Silakan selesaikan atau batalkan transaksi sebelumnya."
        )

    new_transaction = UserTransaction(
        user_id=current_user.id,
        transaction_type="pro_upgrade",
        order_id=order_id,
        amount=settings.PRO_PRICE,
        payment_status="pending",
    )
    db.add(new_transaction)
    await db.flush()
    
    item_details = [{
        "id": "PRO_ACCOUNT",
        "price": settings.PRO_PRICE,
        "quantity": 1,
        "name": "Upgrade PRO - Akses Semua Paket Soal"
    }]
    
    customer_details = {
        "email": current_user.email,
        "first_name": current_user.email.split("@")[0], # Fallback
    }
    
    try:
        snap_response = midtrans_service.create_transaction(
            order_id=order_id,
            amount=settings.PRO_PRICE,
            item_details=item_details,
            customer_details=customer_details
        )
        
        new_transaction.snap_token = snap_response['token']
        await db.commit()
        
        return {
            "token": snap_response['token'],
            "redirect_url": snap_response['redirect_url'],
            "order_id": order_id
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create Midtrans transaction: {str(e)}")

@router.get("/my-transactions")
async def get_user_transactions(
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
    )
    transactions = result.scalars().all()
    return transactions

@router.post("/donate", response_model=DonationResponse)
@limiter.limit("5/minute")
async def create_donation_transaction(
    request: Request,
    response: Response,
    payload: DonationRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Create a donation transaction.
    """
    if payload.amount < 1000:
        raise HTTPException(status_code=400, detail="Minimal donasi adalah Rp 1.000")

    if payload.message and len(payload.message) > 150:
        raise HTTPException(status_code=400, detail="Pesan dukungan maksimal 150 karakter.")

    order_id = f"DONATE-{current_user.id.hex[:8]}-{uuid.uuid4().hex[:6]}"
    
    new_transaction = UserTransaction(
        user_id=current_user.id,
        transaction_type="donation",
        order_id=order_id,
        amount=payload.amount,
        payment_status="pending",
        message=payload.message,
        is_anonymous=payload.is_anonymous
    )
    db.add(new_transaction)
    await db.flush()
    
    item_details = [{
        "id": "DONATION",
        "price": payload.amount,
        "quantity": 1,
        "name": f"Dukungan Komunitas - {'Anonim' if payload.is_anonymous else current_user.email}"
    }]
    
    customer_details = {
        "email": current_user.email,
        "first_name": "Donatur",
    }
    
    try:
        snap_response = midtrans_service.create_transaction(
            order_id=order_id,
            amount=payload.amount,
            item_details=item_details,
            customer_details=customer_details
        )
        
        new_transaction.snap_token = snap_response['token']
        await db.commit()
        
        return {
            "token": snap_response['token'],
            "redirect_url": snap_response['redirect_url'],
            "order_id": order_id
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create Midtrans transaction: {str(e)}")

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
        .order_by(desc(UserTransaction.created_at))
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
    from backend.models.models import UserProfile
    
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
        .where(UserTransaction.is_anonymous == False)
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
        .where(UserTransaction.is_anonymous == True)
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
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
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
        .where(UserTransaction.created_at >= first_day_of_month)
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
async def midtrans_webhook(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Handle notification from Midtrans.
    """
    data = await request.json()
    
    # Signature Key Verification
    order_id = data.get("order_id")
    status_code = data.get("status_code")
    gross_amount = data.get("gross_amount")
    signature_key_received = data.get("signature_key")
    
    payload = f"{order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
    expected_signature = hashlib.sha512(payload.encode()).hexdigest()
    
    if signature_key_received != expected_signature:
        logger.error(f"Invalid Midtrans Signature! Order: {order_id}")
        raise HTTPException(status_code=401, detail="Invalid signature key")
    
    try:
        status_response = midtrans_service.verify_notification(data)
        order_id = status_response.get('order_id')
        transaction_status = status_response.get('transaction_status')
        fraud_status = status_response.get('fraud_status')
        
        target_status = "pending"
        if transaction_status in ['capture', 'settlement']:
            if transaction_status == 'capture':
                if fraud_status == 'accept':
                    target_status = "success"
            else:
                target_status = "success"
        elif transaction_status in ['cancel', 'deny', 'expire']:
            target_status = "failed"
            
        await fulfill_transaction(db, order_id, target_status)
        return {"status": "ok"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

async def fulfill_transaction(db: AsyncSession, order_id: str, payment_status: str):
    result = await db.execute(
        select(UserTransaction).where(UserTransaction.order_id == order_id)
    )
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        return
        
    if transaction.payment_status == "success" and payment_status == "success":
        return
        
    transaction.payment_status = payment_status
    
    user_result = await db.execute(select(User).where(User.id == transaction.user_id))
    user = user_result.scalar_one_or_none()
    
    if user and payment_status == "success":
        if transaction.transaction_type == "pro_upgrade":
            user.is_pro = True
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            if user.pro_expires_at and user.pro_expires_at > now:
                user.pro_expires_at = user.pro_expires_at + timedelta(days=365)
            else:
                user.pro_expires_at = now + timedelta(days=365)
        elif transaction.transaction_type == "package_purchase":
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            # Default access: 1 year from purchase
            transaction.access_expires_at = now + timedelta(days=365)
            
    # [REVOCATION LOGIC FIX]
    elif user and payment_status == "failed":
        if transaction.transaction_type == "pro_upgrade":
            # BUG FIX: Before revoking, check if there's ANOTHER successful pro_upgrade 
            # currently active. Don't punish the user for a single failed renewal attempt.
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            other_active = await db.scalar(
                select(func.count(UserTransaction.id)).where(
                    UserTransaction.user_id == user.id,
                    UserTransaction.transaction_type == "pro_upgrade",
                    UserTransaction.payment_status == "success",
                    UserTransaction.access_expires_at > now,
                    UserTransaction.id != transaction.id
                )
            )
            
            if not other_active or other_active == 0:
                user.is_pro = False
                user.pro_expires_at = None
                logger.info(f"User {user.email} PRO status revoked due to failed transaction.")
            else:
                logger.info(f"User {user.email} still has valid PRO access from another transaction. Revocation skipped.")
        elif transaction.transaction_type == "package_purchase":
            transaction.access_expires_at = None
                
    await db.commit()
