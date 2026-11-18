"""Confirmed payment dates, with an explicit legacy fallback for existing reports."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import Date, cast, func
from backend.models.models import UserTransaction

BUSINESS_TIMEZONE = ZoneInfo('Asia/Jakarta')


def payment_time():
    return func.coalesce(UserTransaction.paid_at, UserTransaction.created_at)


def month_bounds(now=None):
    current = (now or datetime.now(timezone.utc)).astimezone(BUSINESS_TIMEZONE)
    start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def reporting_date(db):
    if db.get_bind().dialect.name == 'sqlite':
        return func.date(payment_time(), '+7 hours')
    return cast(func.timezone('Asia/Jakarta', payment_time()), Date)
