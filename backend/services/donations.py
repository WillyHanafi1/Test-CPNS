"""Public donation data: confirmed contributions, bounded lists and minimal identity."""
from datetime import datetime, timezone

from sqlalchemy import func, select

from backend.config import settings
from backend.models.models import UserProfile, UserTransaction
from backend.services.exams import utc
from backend.services.revenue import BUSINESS_TIMEZONE, month_bounds, payment_time


def public_name(name):
    cleaned = ' '.join((name or '').strip().split())
    if not cleaned or any(value in cleaned for value in ('@', '://', 'www.')):
        return 'Pendukung TOCPNS'
    return cleaned[:40].rstrip()


def conditions(period, now=None):
    filters = [UserTransaction.transaction_type == 'donation',
               UserTransaction.payment_status == 'success', UserTransaction.amount > 0,
               (UserTransaction.payment_environment.is_(None)) |
               (UserTransaction.payment_environment == 'production')]
    if period == 'month':
        start, end = month_bounds(now)
        filters.extend([payment_time() >= start, payment_time() < end])
    return filters


async def statistics(db, period='month', now=None):
    row = (await db.execute(select(
        func.coalesce(func.sum(UserTransaction.amount), 0).label('amount'),
        func.count(func.distinct(UserTransaction.user_id)).label('supporters'),
        func.count(UserTransaction.id).label('donations')
    ).where(*conditions(period, now)))).one()
    target = max(0, settings.DONATION_MONTHLY_GOAL) if period == 'month' else 0
    return {'total_amount': int(row.amount), 'target_amount': target,
            'percentage': round(min(row.amount / target * 100, 100), 2) if target else 0,
            'supporter_count': row.supporters, 'donation_count': row.donations}


async def top_supporters(db, period='all', limit=10, now=None):
    base_filters = conditions(period, now)
    # Keep anonymous and named contributions in separate visibility buckets.
    supporter_key = UserTransaction.user_id
    anonymous = UserTransaction.is_anonymous.is_not(False)
    total = func.sum(UserTransaction.amount)
    rows = (await db.execute(select(
        supporter_key.label('supporter_key'),
        anonymous.label('anonymous'),
        UserProfile.full_name,
        total.label('total_amount'),
        func.count(UserTransaction.id).label('donation_count')
    ).outerjoin(UserProfile, UserProfile.user_id == UserTransaction.user_id)
      .where(*base_filters)
      .group_by(supporter_key, anonymous, UserProfile.full_name)
      .order_by(total.desc(), func.min(payment_time()).asc(), supporter_key.asc(), anonymous.asc())
      .limit(limit))).all()
    if not rows:
        return []
    supporter_keys = [row.supporter_key for row in rows]
    latest_messages = {}
    if supporter_keys:
        msg_rows = (await db.execute(select(
            supporter_key, anonymous, UserTransaction.message
        ).where(
            *base_filters,
            supporter_key.in_(supporter_keys),
            UserTransaction.message.is_not(None),
            func.trim(UserTransaction.message) != ''
        ).order_by(payment_time().desc(), UserTransaction.id.desc()))).all()
        for key, is_anonymous, msg in msg_rows:
            visibility_key = (key, bool(is_anonymous))
            if visibility_key not in latest_messages and msg and msg.strip():
                latest_messages[visibility_key] = msg.strip()
    result, previous, rank = [], None, 0
    for index, row in enumerate(rows, 1):
        amount = int(row.total_amount)
        if amount != previous:
            rank = index
        result.append({
            'full_name': 'Anonim' if row.anonymous else public_name(row.full_name),
            'is_anonymous': bool(row.anonymous),
            'total_amount': amount,
            'donation_count': row.donation_count,
            'rank': rank,
            'message': latest_messages.get((row.supporter_key, bool(row.anonymous))),
        })
        previous = amount
    return result


async def recent_supporters(db, period='all', limit=20, now=None):
    rows = (await db.execute(select(UserTransaction, UserProfile.full_name)
        .outerjoin(UserProfile, UserProfile.user_id == UserTransaction.user_id)
        .where(*conditions(period, now))
        .order_by(payment_time().desc(), UserTransaction.id.desc()).limit(limit))).all()
    return [{'full_name': 'Anonim' if row.is_anonymous is not False else public_name(name),
             'amount': row.amount, 'message': row.message, 'created_at': utc(row.created_at),
             'paid_at': utc(row.paid_at) if row.paid_at else None,
             'is_anonymous': row.is_anonymous is not False} for row, name in rows]


async def overview(db, period='month', limit=10):
    now = datetime.now(timezone.utc)
    local = now.astimezone(BUSINESS_TIMEZONE)
    months = ('Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
              'Agustus', 'September', 'Oktober', 'November', 'Desember')
    return {'period': period,
            'period_label': f'{months[local.month - 1]} {local.year}' if period == 'month' else 'Semua waktu',
            'stats': await statistics(db, period, now),
            'top_supporters': await top_supporters(db, period, limit, now),
            'recent_supporters': await recent_supporters(db, period, limit, now),
            'updated_at': now}
