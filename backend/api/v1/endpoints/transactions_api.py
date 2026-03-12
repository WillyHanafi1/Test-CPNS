from fastapi import APIRouter, Depends, HTTPException, status, Request
import hashlib
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime, timedelta, timezone

from backend.db.session import get_async_session
from backend.models.models import User, UserTransaction, Package
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.midtrans import midtrans_service
from backend.config import settings

logger = logging.getLogger(__name__)

# Official Midtrans IP Ranges (Simplified for check)
# Note: In production, consider using a more robust CIDR checker if needed.
MIDTRANS_IPS = {
    "103.208.23.6", "103.127.17.6", "34.87.92.33", "34.87.59.67",
    "35.186.147.251", "34.87.157.231", "13.228.166.126", "52.220.80.5",
    "3.1.123.95", "108.136.204.114", "108.136.34.95", "108.137.159.245",
    "108.137.135.225", "16.78.53.66", "43.218.2.230", "16.78.88.149",
    "16.78.85.64", "16.78.69.49", "16.78.98.130", "16.78.9.40",
    "43.218.223.26", "34.101.68.130", "34.101.92.69" # Plus others as needed
}

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/upgrade-pro")
async def create_pro_upgrade_transaction(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Create a transaction for upgrading to a PRO account.
    Returns the Midtrans snap_token.
    """
    PRO_PRICE = 50000 
    order_id = f"PRO-{current_user.id.hex[:8]}-{uuid.uuid4().hex[:6]}"
    
    new_transaction = UserTransaction(
        user_id=current_user.id,
        transaction_type="pro_upgrade",
        order_id=order_id,
        amount=PRO_PRICE,
        payment_status="pending",
    )
    db.add(new_transaction)
    await db.flush()
    
    item_details = [{
        "id": "PRO_ACCOUNT",
        "price": PRO_PRICE,
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
            amount=PRO_PRICE,
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

@router.post("/webhook")
async def midtrans_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Handle notification from Midtrans.
    """
    data = await request.json()
    
    # 1. IP Whitelisting (Optional but Recommended)
    # Get real IP if behind proxy
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0] if forwarded else request.client.host
    
    # Note: If running on local with ngrok/expose, you might want to disable this temporarily
    # if client_ip not in MIDTRANS_IPS:
    #     logger.warning(f"Unauthorized Webhook attempt from IP: {client_ip}")
    #     # raise HTTPException(status_code=403, detail="Forbidden IP")

    # 2. Signature Key Verification (MANDATORY)
    order_id = data.get("order_id")
    status_code = data.get("status_code")
    gross_amount = data.get("gross_amount")
    signature_key_received = data.get("signature_key")
    
    # SHA512(order_id + status_code + gross_amount + ServerKey)
    payload = f"{order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
    expected_signature = hashlib.sha512(payload.encode()).hexdigest()
    
    if signature_key_received != expected_signature:
        logger.error(f"Invalid Midtrans Signature! Order: {order_id}. Received: {signature_key_received}")
        raise HTTPException(status_code=401, detail="Invalid signature key")
    
    try:
        status_response = midtrans_service.verify_notification(data)
        order_id = status_response.get('order_id')
        transaction_status = status_response.get('transaction_status')
        fraud_status = status_response.get('fraud_status')
        
        target_status = "pending"
        if transaction_status == 'capture':
            if fraud_status == 'accept':
                target_status = "success"
        elif transaction_status == 'settlement':
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
        
    # Mencegah eksekusi ganda jika transaksi sudah berstatus success
    if transaction.payment_status == "success" and payment_status == "success":
        return
        
    transaction.payment_status = payment_status
    
    # Get user
    user_result = await db.execute(select(User).where(User.id == transaction.user_id))
    user = user_result.scalar_one_or_none()
    
    if user and transaction.transaction_type == "pro_upgrade":
        if payment_status == "success":
            user.is_pro = True
            
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            # Jika user MASIH PRO, tambahkan masa aktif dari tanggal expired-nya
            if user.pro_expires_at and user.pro_expires_at > now:
                user.pro_expires_at = user.pro_expires_at + timedelta(days=365)
            # Jika user BUKAN PRO atau sudah expired, hitung 1 tahun dari sekarang
            else:
                user.pro_expires_at = now + timedelta(days=365)
                
        # HAPUS logika "elif payment_status in ['failed', ...]: user.is_pro = False". 
        # Pembatalan transaksi baru tidak boleh merusak langganan lama yang sudah aktif!
            
    await db.commit()
