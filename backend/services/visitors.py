"""
Privacy-friendly Visitor Analytics Service (Umami / Plausible inspired).

Architecture:
- Zero tracking cookies and zero raw IP / User-Agent persistence.
- Computes an anonymized monthly-rotating HMAC-SHA256 visitor fingerprint:
  HMAC(SECRET_KEY, f"{ip}|{ua}|{YYYY-MM}")[:32]
  -> Enables exact daily & true monthly unique visitor counts without cross-month tracking.
- Active "Online Now" (5-minute sliding window):
  Redis ZSET (`visitors:online`) with automatic DB `last_seen_at` fallback.
- Durable historical stats (`Hari Ini`, `Bulan Ini`, `Total`, tren harian, top halaman):
  PostgreSQL aggregate tables (`site_daily_stats`, `site_visitor_daily`, `site_page_daily_stats`)
  keyed on Asia/Jakarta (WIB) calendar dates.
"""

from __future__ import annotations

import hashlib
import hmac
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import distinct, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.redis_service import redis_service
from backend.models.models import SiteDailyStats, SitePageDailyStats, SiteVisitorDaily
from backend.services.revenue import BUSINESS_TIMEZONE

ONLINE_ZSET_KEY = "visitors:online:v1"
ONLINE_WINDOW_SECONDS = 300  # 5 minutes active window
PUBLIC_VISITORS_CACHE_KEY = "visitors:public_summary:v1"
PUBLIC_VISITORS_CACHE_TTL = 15
ADMIN_VISITORS_CACHE_PREFIX = "visitors:admin_analytics:v1:"
ADMIN_VISITORS_CACHE_TTL = 30

_BOT_PATTERN = re.compile(
    r"(googlebot|bingbot|yandex|baiduspider|ahrefsbot|semrushbot|mj12bot|dotbot|"
    r"petalbot|bytespider|gptbot|claudebot|slurp|duckduckbot|facebookexternalhit|"
    r"twitterbot|slackbot|telegrambot|whatsapp|discordbot|linkedinbot|"
    r"uptimerobot|pingdom|statuscake|curl/|wget/|python-requests/|go-http-client/)",
    re.IGNORECASE,
)

_UUID_SEGMENT_RE = re.compile(
    r"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=/|$)",
    re.IGNORECASE,
)
_NUMERIC_SEGMENT_RE = re.compile(r"/\d+(?=/|$)")


def is_bot_user_agent(user_agent: str | None) -> bool:
    if not user_agent:
        return False
    return bool(_BOT_PATTERN.search(user_agent))


def normalize_visit_path(raw_path: str | None) -> str | None:
    """Normalize public frontend route paths; return None for admin/api/invalid paths."""
    if not raw_path:
        return "/"
    path = raw_path.strip().split("?", 1)[0].split("#", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    path = re.sub(r"/{2,}", "/", path)
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    # Exclude internal admin, api, or static asset paths from public visitor metrics
    if (
        path == "/admin"
        or path.startswith("/admin/")
        or path.startswith("/api/")
        or path.startswith("/_next/")
    ):
        return None

    # Collapse dynamic IDs so top pages stay clean and meaningful
    path = _UUID_SEGMENT_RE.sub("/[id]", path)
    path = _NUMERIC_SEGMENT_RE.sub("/[id]", path)
    if path.startswith("/session/") and path.count("/") >= 2:
        parts = path.split("/")
        parts[2] = "[id]"
        path = "/".join(parts)
    elif path.startswith("/exam/") and path.count("/") >= 2:
        parts = path.split("/")
        parts[2] = "[id]"
        path = "/".join(parts)
    elif path.startswith("/catalog/") and path not in {"/catalog/upgrade"}:
        path = "/catalog/[id]"

    return path[:120]


def jakarta_today(now_utc: datetime | None = None) -> date:
    ts = now_utc or datetime.now(timezone.utc)
    return ts.astimezone(BUSINESS_TIMEZONE).date()


def compute_visitor_hash(ip: str, user_agent: str, visit_date: date) -> str:
    """Monthly-rotating anonymized visitor hash (no PII persisted)."""
    month_salt = visit_date.strftime("%Y-%m")
    payload = f"{ip.strip()}|{(user_agent or '').strip()[:256]}|{month_salt}".encode("utf-8")
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return digest[:32]


def _dialect_insert(db: AsyncSession, model: Any):
    bind = db.get_bind()
    dialect = bind.dialect.name if bind is not None else "postgresql"
    if dialect == "sqlite":
        return sqlite_insert(model)
    return pg_insert(model)


async def _touch_online_presence(visitor_hash: str, now_ts: float) -> int | None:
    """Update Redis ZSET active presence and return online count (None if Redis unavailable)."""
    try:
        r = redis_service.redis
        cutoff = now_ts - ONLINE_WINDOW_SECONDS
        await r.zadd(ONLINE_ZSET_KEY, {visitor_hash: now_ts})
        if hasattr(r, "zremrangebyscore"):
            await r.zremrangebyscore(ONLINE_ZSET_KEY, 0, cutoff)
        if hasattr(r, "expire"):
            await r.expire(ONLINE_ZSET_KEY, ONLINE_WINDOW_SECONDS * 3)
        if hasattr(r, "zcard"):
            return int(await r.zcard(ONLINE_ZSET_KEY))
    except Exception:
        return None
    return None


async def get_online_count(db: AsyncSession, now_utc: datetime | None = None) -> int:
    """Get count of unique visitors active in the last 5 minutes (Redis-first with DB fallback)."""
    now = now_utc or datetime.now(timezone.utc)
    now_ts = now.timestamp()
    cutoff_ts = now_ts - ONLINE_WINDOW_SECONDS

    try:
        r = redis_service.redis
        if hasattr(r, "zremrangebyscore") and hasattr(r, "zcard"):
            await r.zremrangebyscore(ONLINE_ZSET_KEY, 0, cutoff_ts)
            count = int(await r.zcard(ONLINE_ZSET_KEY))
            if count > 0:
                return count
    except Exception:
        pass

    cutoff_dt = now - timedelta(seconds=ONLINE_WINDOW_SECONDS)
    db_count = (
        await db.scalar(
            select(func.count(distinct(SiteVisitorDaily.visitor_hash))).where(
                SiteVisitorDaily.last_seen_at >= cutoff_dt
            )
        )
        or 0
    )
    return int(db_count)


async def record_visit(
    db: AsyncSession,
    *,
    ip: str,
    user_agent: str,
    raw_path: str | None,
    heartbeat: bool = False,
) -> dict[str, Any]:
    """Record a public page visit or active heartbeat safely and atomically."""
    if is_bot_user_agent(user_agent):
        return {"recorded": False, "reason": "bot"}

    path = normalize_visit_path(raw_path)
    if path is None:
        return {"recorded": False, "reason": "excluded_path"}

    now = datetime.now(timezone.utc)
    today = jakarta_today(now)
    visitor_hash = compute_visitor_hash(ip, user_agent, today)

    # 1. Always refresh real-time online presence in Redis
    await _touch_online_presence(visitor_hash, now.timestamp())

    # 2. Check / record daily visitor row (atomic upsert)
    visitor_insert = _dialect_insert(db, SiteVisitorDaily).values(
        visit_date=today,
        visitor_hash=visitor_hash,
        first_path=path,
        last_seen_at=now,
    )
    # Try insert-only first to know cleanly whether this is a new unique visitor today
    res = await db.execute(
        visitor_insert.on_conflict_do_nothing(
            index_elements=["visit_date", "visitor_hash"]
        )
    )
    is_new_today = (res.rowcount or 0) > 0

    if not is_new_today:
        # Refresh last_seen_at for DB-backed online fallback
        existing = await db.get(SiteVisitorDaily, (today, visitor_hash))
        if existing is not None:
            existing.last_seen_at = now

    # 3. Heartbeat only keeps online status warm — never inflates pageviews
    if not heartbeat or is_new_today:
        pv_inc = 0 if heartbeat else 1
        uv_inc = 1 if is_new_today else 0

        if pv_inc > 0 or uv_inc > 0:
            daily_stmt = _dialect_insert(db, SiteDailyStats).values(
                stat_date=today,
                pageviews=pv_inc,
                unique_visitors=uv_inc,
                updated_at=now,
            )
            await db.execute(
                daily_stmt.on_conflict_do_update(
                    index_elements=["stat_date"],
                    set_={
                        "pageviews": SiteDailyStats.pageviews + pv_inc,
                        "unique_visitors": SiteDailyStats.unique_visitors + uv_inc,
                        "updated_at": now,
                    },
                )
            )

        if pv_inc > 0:
            page_stmt = _dialect_insert(db, SitePageDailyStats).values(
                stat_date=today,
                path=path,
                pageviews=1,
            )
            await db.execute(
                page_stmt.on_conflict_do_update(
                    index_elements=["stat_date", "path"],
                    set_={"pageviews": SitePageDailyStats.pageviews + 1},
                )
            )

    await db.commit()

    # Invalidate short summary caches on new visitor so counters feel responsive
    if is_new_today:
        try:
            await redis_service.delete_cache(PUBLIC_VISITORS_CACHE_KEY)
            await redis_service.clear_pattern(f"{ADMIN_VISITORS_CACHE_PREFIX}*")
        except Exception:
            pass

    return {"recorded": True, "is_new_today": is_new_today, "path": path}


async def get_public_visitor_summary(db: AsyncSession) -> dict[str, int]:
    """Return lightweight public visitor metrics (online now, today, this month, total)."""
    cached = await redis_service.get_cache(PUBLIC_VISITORS_CACHE_KEY)
    if isinstance(cached, dict) and "month_visitors" in cached:
        # Always compute fresh online_now (<1ms in Redis)
        cached["online_now"] = await get_online_count(db)
        return cached

    now = datetime.now(timezone.utc)
    today = jakarta_today(now)
    month_start = today.replace(day=1)

    online_now = await get_online_count(db, now)

    today_row = await db.get(SiteDailyStats, today)
    today_visitors = int(today_row.unique_visitors) if today_row else 0

    month_distinct = (
        await db.scalar(
            select(func.count(distinct(SiteVisitorDaily.visitor_hash))).where(
                SiteVisitorDaily.visit_date >= month_start,
                SiteVisitorDaily.visit_date <= today,
            )
        )
        or 0
    )
    month_visitors = max(int(month_distinct), today_visitors)

    total_visitors = (
        await db.scalar(select(func.coalesce(func.sum(SiteDailyStats.unique_visitors), 0)))
        or 0
    )

    payload = {
        "online_now": int(online_now),
        "today_visitors": int(today_visitors),
        "month_visitors": int(month_visitors),
        "total_visitors": int(max(int(total_visitors), month_visitors)),
    }
    await redis_service.set_cache(
        PUBLIC_VISITORS_CACHE_KEY, payload, expire=PUBLIC_VISITORS_CACHE_TTL
    )
    return payload


async def get_admin_visitor_analytics(db: AsyncSession, days: int = 30) -> dict[str, Any]:
    """Detailed visitor analytics for Admin Portal (dashboard & analytics page)."""
    clamped_days = max(7, min(int(days), 90))
    cache_key = f"{ADMIN_VISITORS_CACHE_PREFIX}{clamped_days}"
    cached = await redis_service.get_cache(cache_key)
    if isinstance(cached, dict) and "daily_trend" in cached:
        cached["online_now"] = await get_online_count(db)
        return cached

    now = datetime.now(timezone.utc)
    today = jakarta_today(now)
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)
    range_start = today - timedelta(days=clamped_days - 1)

    online_now = await get_online_count(db, now)

    today_row = await db.get(SiteDailyStats, today)
    yesterday_row = await db.get(SiteDailyStats, yesterday)
    today_visitors = int(today_row.unique_visitors) if today_row else 0
    today_pageviews = int(today_row.pageviews) if today_row else 0
    yesterday_visitors = int(yesterday_row.unique_visitors) if yesterday_row else 0

    month_distinct = (
        await db.scalar(
            select(func.count(distinct(SiteVisitorDaily.visitor_hash))).where(
                SiteVisitorDaily.visit_date >= month_start,
                SiteVisitorDaily.visit_date <= today,
            )
        )
        or 0
    )
    month_visitors = max(int(month_distinct), today_visitors)

    month_pageviews = (
        await db.scalar(
            select(func.coalesce(func.sum(SiteDailyStats.pageviews), 0)).where(
                SiteDailyStats.stat_date >= month_start,
                SiteDailyStats.stat_date <= today,
            )
        )
        or 0
    )

    totals_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(SiteDailyStats.unique_visitors), 0).label("uv"),
                func.coalesce(func.sum(SiteDailyStats.pageviews), 0).label("pv"),
            )
        )
    ).one()
    total_visitors = max(int(totals_row.uv or 0), month_visitors)
    total_pageviews = max(int(totals_row.pv or 0), int(month_pageviews))

    # Daily trend for chart (continuous calendar dates in WIB)
    trend_rows = (
        await db.scalars(
            select(SiteDailyStats)
            .where(
                SiteDailyStats.stat_date >= range_start,
                SiteDailyStats.stat_date <= today,
            )
            .order_by(SiteDailyStats.stat_date.asc())
        )
    ).all()
    trend_map = {r.stat_date: r for r in trend_rows}
    daily_trend = []
    for offset in range(clamped_days):
        d = range_start + timedelta(days=offset)
        r = trend_map.get(d)
        daily_trend.append(
            {
                "date": d.isoformat(),
                "visitors": int(r.unique_visitors) if r else 0,
                "pageviews": int(r.pageviews) if r else 0,
            }
        )

    # Top public pages within selected range
    top_pages_rows = (
        await db.execute(
            select(
                SitePageDailyStats.path,
                func.coalesce(func.sum(SitePageDailyStats.pageviews), 0).label("pv"),
            )
            .where(
                SitePageDailyStats.stat_date >= range_start,
                SitePageDailyStats.stat_date <= today,
            )
            .group_by(SitePageDailyStats.path)
            .order_by(func.sum(SitePageDailyStats.pageviews).desc())
            .limit(8)
        )
    ).all()
    top_pages = [
        {"path": row.path, "pageviews": int(row.pv or 0)}
        for row in top_pages_rows
    ]

    payload = {
        "online_now": int(online_now),
        "today_visitors": int(today_visitors),
        "today_pageviews": int(today_pageviews),
        "yesterday_visitors": int(yesterday_visitors),
        "month_visitors": int(month_visitors),
        "month_pageviews": int(month_pageviews),
        "total_visitors": int(total_visitors),
        "total_pageviews": int(total_pageviews),
        "daily_trend": daily_trend,
        "top_pages": top_pages,
    }
    await redis_service.set_cache(cache_key, payload, expire=ADMIN_VISITORS_CACHE_TTL)
    return payload
