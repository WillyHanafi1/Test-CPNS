"""Public donation data: confirmed contributions, bounded lists and minimal identity."""
from datetime import datetime, timezone

from sqlalchemy import func, select

from backend.config import settings
from backend.models.models import UserProfile, UserTransaction
from backend.services.exams import utc
from backend.services.revenue import BUSINESS_TIMEZONE, month_bounds, payment_time


def public_name(name):
    parts = (name or '').strip().split()
    if not parts or any(value in name for value in ('@', '://', 'www.')):
        return 'Pendukung TOCPNS'
    first = parts[0][:40]
    return first + (' ' + parts[-1][0].upper() + '.' if len(parts) > 1 else '')


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
    total = func.sum(UserTransaction.amount)
    rows = (await db.execute(select(
        UserProfile.full_name, total.label('total_amount'),
        func.count(UserTransaction.id).label('donation_count')
    ).outerjoin(UserProfile, UserProfile.user_id == UserTransaction.user_id)
      .where(*conditions(period, now), UserTransaction.is_anonymous.is_(False))
      .group_by(UserTransaction.user_id, UserProfile.full_name)
      .order_by(total.desc(), func.min(payment_time()).asc(), UserTransaction.user_id.asc())
      .limit(limit))).all()
    result, previous, rank = [], None, 0
    for index, row in enumerate(rows, 1):
        amount = int(row.total_amount)
        if amount != previous:
            rank = index
        result.append({'full_name': public_name(row.full_name), 'total_amount': amount,
                       'donation_count': row.donation_count, 'rank': rank})
        previous = amount
    return result


async def recent_supporters(db, period='all', limit=20, now=None):
    rows = (await db.execute(select(UserTransaction, UserProfile.full_name)
        .outerjoin(UserProfile, UserProfile.user_id == UserTransaction.user_id)
        .where(*conditions(period, now))
        .order_by(payment_time().desc(), UserTransaction.id.desc()).limit(limit))).all()
    return [{'full_name': 'Pendukung anonim' if row.is_anonymous is not False else public_name(name),
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
