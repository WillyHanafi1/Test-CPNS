"""Persist checkout before contacting DOKU; grant Pro once after verified payment."""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from backend.config import settings
from backend.core.doku_service import DokuError, callback_for_order, doku_service, exact_amount, payment_status
from backend.models.models import PaymentEvent, AuditEvent, User, UserTransaction
from backend.services.exams import utc

logger = logging.getLogger(__name__)


def resumable_payment_url(transaction):
    if (transaction.payment_status != 'pending' or not transaction.payment_url
            or transaction.payment_environment != settings.DOKU_ENVIRONMENT
            or transaction.payment_client_id != settings.DOKU_CLIENT_ID
            or (transaction.payment_expires_at and utc(transaction.payment_expires_at) <= datetime.now(timezone.utc))):
        return None
    try:
        return doku_service.checkout_url(transaction.payment_url)
    except (DokuError, ValueError):
        return None


async def begin_checkout(db, user, transaction_type, amount, callback_url=None, *, message=None, is_anonymous=False):
    if not settings.doku_checkout_available:
        raise HTTPException(503, "Pembayaran belum tersedia. Silakan coba kembali nanti.")
    try:
        callback_for_order('validation', callback_url)
    except ValueError:
        raise HTTPException(400, "Alamat kembali tidak diizinkan.")
    now = datetime.now(timezone.utc)
    await db.scalar(select(User).where(User.id == user.id).with_for_update().execution_options(populate_existing=True))
    if transaction_type == 'pro_upgrade' and user.is_pro and user.pro_expires_at is None:
        raise HTTPException(409, "Keanggotaan Pro tanpa batas waktu sudah aktif.")
    cutoff = now - timedelta(minutes=settings.DOKU_CHECKOUT_DUE_MINUTES)
    query = select(UserTransaction).where(
        UserTransaction.user_id == user.id, UserTransaction.transaction_type == transaction_type,
        UserTransaction.payment_status == 'pending', UserTransaction.amount == amount,
        UserTransaction.payment_environment == settings.DOKU_ENVIRONMENT,
        UserTransaction.payment_client_id == settings.DOKU_CLIENT_ID,
        or_(UserTransaction.payment_expires_at > now,
            (UserTransaction.payment_expires_at.is_(None)) & (UserTransaction.created_at > cutoff)))
    if transaction_type == 'donation':
        query = query.where(UserTransaction.message == message, UserTransaction.is_anonymous == is_anonymous)
    transaction = await db.scalar(query.order_by(UserTransaction.created_at.desc()).limit(1).with_for_update())
    if transaction is None:
        prefix = 'PRO' if transaction_type == 'pro_upgrade' else 'DONATE'
        transaction = UserTransaction(user_id=user.id, transaction_type=transaction_type,
            order_id=f'{prefix}-{uuid.uuid4().hex[:24]}', amount=amount, payment_status='pending',
            duration_days=365 if transaction_type == 'pro_upgrade' else None,
            message=message, is_anonymous=is_anonymous, payment_environment=settings.DOKU_ENVIRONMENT,
            payment_client_id=settings.DOKU_CLIENT_ID)
        db.add(transaction)
        await db.flush()
        item = 'TOCPNS Pro - 365 hari akses semua paket' if transaction_type == 'pro_upgrade' else 'Dukungan Komunitas TOCPNS'
        transaction.payment_request_body = doku_service.build_checkout_body(transaction.order_id, amount,
            [{'id': transaction_type, 'price': amount, 'quantity': 1, 'name': item}],
            {'email': user.email, 'first_name': user.email.split('@')[0]}, callback_url)
    if transaction.payment_url:
        result = {'token': '', 'redirect_url': doku_service.checkout_url(transaction.payment_url),
                  'order_id': transaction.order_id, 'expires_at': transaction.payment_expires_at}
        await db.commit()
        return result
    # The invoice and exact request survive a lost provider response or process restart.
    await db.commit()
    body = json.loads(transaction.payment_request_body)
    order_id = transaction.order_id
    try:
        result = await asyncio.to_thread(doku_service.create_transaction,
            order_id=transaction.order_id, amount=transaction.amount, item_details=body['order']['line_items'],
            customer_details=body['customer'], callback_url=body['order']['callback_url'],
            request_id=str(transaction.id), request_body=transaction.payment_request_body)
        await db.refresh(transaction, with_for_update=True)
        transaction.payment_url = result['redirect_url']
        transaction.payment_expires_at = result.get('expires_at') or now + timedelta(minutes=settings.DOKU_CHECKOUT_DUE_MINUTES)
        await db.commit()
        return {**result, 'order_id': transaction.order_id, 'expires_at': transaction.payment_expires_at}
    except Exception as exc:
        await db.rollback()
        logger.warning('Checkout response uncertain order=%s error=%s', order_id, type(exc).__name__)
        raise HTTPException(503, "Pembayaran belum dapat disiapkan. Coba lagi; pesanan yang sama akan digunakan.")


async def fulfill_transaction(db, order_id, status, expected_amount=None, *, environment=None, client_id=None,
                              actor_id=None, reason=None, paid_at=None):
    owner = await db.scalar(select(UserTransaction.user_id).where(UserTransaction.order_id == order_id))
    if owner is None:
        raise HTTPException(404, "Transaksi tidak ditemukan.")
    user = await db.scalar(select(User).where(User.id == owner).with_for_update().execution_options(populate_existing=True))
    transaction = await db.scalar(select(UserTransaction).where(UserTransaction.order_id == order_id)
                                  .with_for_update().execution_options(populate_existing=True))
    if expected_amount is not None and Decimal(transaction.amount) != Decimal(str(expected_amount)):
        raise HTTPException(400, "Nominal notifikasi tidak sesuai pesanan.")
    if environment is not None and (transaction.payment_environment != environment or transaction.payment_client_id != client_id):
        raise HTTPException(409, "Lingkungan pembayaran tidak sesuai pesanan.")
    if status not in {'pending', 'success', 'failed'}:
        raise ValueError('Invalid payment status')
    previous = transaction.payment_status
    requested = status
    if previous == 'success' or (previous == 'failed' and status == 'pending'):
        status = previous
    transaction.payment_status = status
    if previous != 'success' and status == 'success' and transaction.paid_at is None:
        now = datetime.now(timezone.utc)
        candidate = utc(paid_at) if isinstance(paid_at, datetime) else now
        transaction.paid_at = candidate if utc(transaction.created_at) - timedelta(minutes=5) <= candidate <= now else now
    if previous != 'success' and status == 'success' and transaction.transaction_type == 'pro_upgrade' and transaction.granted_at is None:
        now = datetime.now(timezone.utc)
        lifetime = user.is_pro and user.pro_expires_at is None
        user.is_pro = True
        transaction.granted_at = now
        if not lifetime:
            start = max(now, utc(user.pro_expires_at)) if user.pro_expires_at else now
            user.pro_expires_at = start + timedelta(days=transaction.duration_days or 365)
    if previous != status:
        db.add(AuditEvent(action='payment.status', entity_id=order_id,
            details={'before': previous, 'after': status, 'source': 'provider' if environment else 'operator',
                     'amount': transaction.amount, 'type': transaction.transaction_type}))
    if actor_id is not None:
        db.add(AuditEvent(actor_id=actor_id, action='admin.payment_status', entity_id=order_id,
            details={'before': previous, 'requested': requested, 'after': status,
                     'reason': (reason or '').strip()}))
    await db.commit()


async def apply_provider_status(db, payload):
    doku_service._validate_status(payload)
    order_id = payload['order']['invoice_number']
    transaction = await db.scalar(select(UserTransaction).where(UserTransaction.order_id == order_id))
    if transaction is None:
        raise HTTPException(404, "Transaksi tidak ditemukan.")
    status = payment_status(payload)
    if status == 'success' and transaction.payment_request_body:
        methods = json.loads(transaction.payment_request_body)['payment']['payment_method_types']
        if payload.get('channel', {}).get('id') not in methods:
            raise DokuError('DOKU_PAYMENT_CHANNEL_MISMATCH')
    await fulfill_transaction(db, order_id, status, exact_amount(payload['order']['amount']),
                              environment=settings.DOKU_ENVIRONMENT, client_id=settings.DOKU_CLIENT_ID,
                              paid_at=provider_payment_time(payload))


def provider_payment_time(payload):
    value = payload.get('transaction', {}).get('date')
    if not isinstance(value, str) or len(value) > 64:
        return None
    try:
        return utc(datetime.fromisoformat(value.replace('Z', '+00:00')))
    except ValueError:
        return None


async def reconcile_transaction(db, order_id):
    if not settings.doku_checkout_available:
        return
    transaction = await db.scalar(select(UserTransaction).where(UserTransaction.order_id == order_id).with_for_update())
    now = datetime.now(timezone.utc)
    if (not transaction or transaction.payment_status != 'pending'
            or transaction.payment_environment != settings.DOKU_ENVIRONMENT
            or transaction.payment_client_id != settings.DOKU_CLIENT_ID
            or utc(transaction.created_at) > now - timedelta(seconds=90)
            or (transaction.payment_checked_at and utc(transaction.payment_checked_at) > now - timedelta(minutes=5))):
        await db.commit()
        return
    transaction.payment_checked_at = now
    await db.commit()  # A persistent lease prevents every browser poll from calling DOKU.
    try:
        payload = await asyncio.to_thread(doku_service.get_status, order_id)
        if payload.get('order', {}).get('invoice_number') != order_id:
            raise DokuError('DOKU_INVOICE_MISMATCH')
        await apply_provider_status(db, payload)
    except (DokuError, HTTPException) as exc:
        await db.rollback()
        logger.warning('Payment reconciliation deferred order=%s error=%s', order_id, type(exc).__name__)


async def receive_notification(db, verified):
    """Commit a compact receipt before fulfillment. Duplicate deliveries are harmless."""
    raw = verified['raw_body']
    safe_payload = {'order': {key: raw['order'][key] for key in ('invoice_number', 'amount', 'currency', 'status') if key in raw['order']},
        'transaction': {'status': verified['transaction_status'] or ''},
        'channel': {'id': raw.get('channel', {}).get('id', '')}}
    paid_at = provider_payment_time(raw)
    if paid_at is not None:
        safe_payload['transaction']['date'] = paid_at.isoformat()
    identity = (PaymentEvent.environment == settings.DOKU_ENVIRONMENT,
        PaymentEvent.client_id == settings.DOKU_CLIENT_ID,
        PaymentEvent.request_id == verified['request_id'])
    existing = await db.scalar(select(PaymentEvent).where(*identity,
        PaymentEvent.body_hash == verified['body_hash']))
    if existing:
        await db.commit()
        if existing.status == 'pending':
            await process_payment_event(db, existing.id)
        return
    conflict = await db.scalar(select(PaymentEvent.id).where(*identity).limit(1))
    event = PaymentEvent(environment=settings.DOKU_ENVIRONMENT, client_id=settings.DOKU_CLIENT_ID,
        request_id=verified['request_id'], body_hash=verified['body_hash'], order_id=verified['order_id'],
        payload=safe_payload, status='review' if conflict else 'pending',
        last_error='request_id_conflict' if conflict else None)
    try:
        async with db.begin_nested():
            db.add(event)
            await db.flush()
    except IntegrityError:
        await db.rollback()
        return  # Another worker durably recorded the same notification.
    await db.commit()
    if event.status == 'pending':
        await process_payment_event(db, event.id)


async def process_payment_event(db, event_id):
    now = datetime.now(timezone.utc)
    event = await db.scalar(select(PaymentEvent).where(PaymentEvent.id == event_id).with_for_update()
        .execution_options(populate_existing=True))
    if not event or event.status != 'pending' or (event.next_attempt_at and utc(event.next_attempt_at) > now):
        await db.commit()
        return
    event.attempts += 1
    event.next_attempt_at = now + timedelta(seconds=min(900, 15 * 2 ** min(event.attempts - 1, 6)))
    await db.commit()
    try:
        if event.environment != settings.DOKU_ENVIRONMENT or event.client_id != settings.DOKU_CLIENT_ID:
            raise DokuError('DOKU_EVENT_ENVIRONMENT_MISMATCH')
        await apply_provider_status(db, event.payload)
        event.status, event.processed_at, event.last_error = 'processed', now, None
        event.next_attempt_at = None
        await db.commit()
    except (DokuError, HTTPException) as exc:
        await db.rollback()
        event = await db.get(PaymentEvent, event_id)
        event.last_error = str(exc)[:100] if isinstance(exc, DokuError) else f'http_{exc.status_code}'
        event.status = 'ignored' if isinstance(exc, HTTPException) and exc.status_code == 404 else 'review'
        await db.commit()
    except Exception as exc:
        await db.rollback()
        event = await db.get(PaymentEvent, event_id)
        event.last_error = type(exc).__name__
        if event.attempts >= 8:
            event.status = 'review'
        await db.commit()
        logger.warning('Payment event retry scheduled id=%s error=%s', event_id, type(exc).__name__)
