from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date, case
from datetime import datetime, timedelta, timezone
import uuid
from typing import List, Optional, Dict
from pydantic import BaseModel

from backend.db.session import get_async_session
from backend.models.models import User, UserTransaction, ExamSession, Package, Question
from backend.api.v1.endpoints.auth import get_current_admin
from backend.core.constants import PASSING_GRADE
from backend.core.redis_service import redis_service

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])

class OverviewStats(BaseModel):
    total_users: int
    total_packages: int
    total_questions: int
    total_revenue: int
    success_transactions: int
    active_exams: int

class ChartDataPoint(BaseModel):
    label: str
    value: float

class ExamAnalytics(BaseModel):
    avg_total_score: float
    avg_twk: float
    avg_tiu: float
    avg_tkp: float
    pass_rate: float
    score_distribution: List[ChartDataPoint]

class RevenueAnalytics(BaseModel):
    daily_revenue: List[ChartDataPoint]
    top_packages: List[Dict]
    category_share: List[ChartDataPoint]

@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats(
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    cache_key = "admin:analytics:overview"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    # Single query with scalar subqueries — safe (no concurrent session usage)
    # and efficient (one DB roundtrip)
    two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)

    stats_result = await db.execute(
        select(
            func.count(User.id).label("total_users"),
            (select(func.count()).select_from(Package)).scalar_subquery().label("total_packages"),
            (select(func.count()).select_from(Question)).scalar_subquery().label("total_questions"),
            func.coalesce(
                select(func.sum(UserTransaction.amount))
                .where(UserTransaction.payment_status == "success")
                .scalar_subquery(), 0
            ).label("total_revenue"),
            func.coalesce(
                select(func.count())
                .select_from(UserTransaction)
                .where(UserTransaction.payment_status == "success")
                .scalar_subquery(), 0
            ).label("success_transactions"),
            func.coalesce(
                select(func.count(ExamSession.id))
                .where(
                    ExamSession.status == "ongoing",
                    ExamSession.start_time >= two_hours_ago,
                    ExamSession.is_preview.is_(False)
                )
                .scalar_subquery(), 0
            ).label("active_exams"),
        ).select_from(User)
    )
    row = stats_result.one()

    result_data = {
        "total_users": row.total_users or 0,
        "total_packages": row.total_packages or 0,
        "total_questions": row.total_questions or 0,
        "total_revenue": row.total_revenue or 0,
        "success_transactions": row.success_transactions or 0,
        "active_exams": row.active_exams or 0
    }

    # Cache for 5 minutes
    await redis_service.set_cache(cache_key, result_data, expire=300)
    
    return result_data

@router.get("/exam-performance", response_model=ExamAnalytics)
async def get_exam_performance(
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    cache_key = "analytics:exam_performance"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    # 1. Hitung Total Sesi Selesai & Rata-rata langsung di DB
    stats_stmt = select(
        func.count(ExamSession.id).label("total_exams"),
        func.avg(ExamSession.total_score).label("avg_total"),
        func.avg(ExamSession.score_twk).label("avg_twk"),
        func.avg(ExamSession.score_tiu).label("avg_tiu"),
        func.avg(ExamSession.score_tkp).label("avg_tkp")
    ).where(and_(ExamSession.status == "finished", ExamSession.is_preview.is_(False)))
    
    stats_result = await db.execute(stats_stmt)
    stats = stats_result.fetchone()
    
    if not stats or stats.total_exams == 0:
        return {
            "avg_total_score": 0, "avg_twk": 0, "avg_tiu": 0, "avg_tkp": 0, 
            "pass_rate": 0, "score_distribution": []
        }

    # 2. Hitung Pass Rate di DB (Standardized in constants.py)
    passed_stmt = select(func.count(ExamSession.id)).where(
        and_(
            ExamSession.status == "finished",
            ExamSession.score_twk >= PASSING_GRADE["TWK"],
            ExamSession.score_tiu >= PASSING_GRADE["TIU"],
            ExamSession.score_tkp >= PASSING_GRADE["TKP"],
            ExamSession.is_preview.is_(False)
        )
    )
    passed_count = await db.scalar(passed_stmt) or 0
    pass_rate = (passed_count / stats.total_exams * 100) if stats.total_exams > 0 else 0

    # 3. Distribusi Skor using SQL CASE
    dist_stmt = select(
        func.count(case((and_(ExamSession.total_score >= 0, ExamSession.total_score <= 100), 1))).label("bucket_0_100"),
        func.count(case((and_(ExamSession.total_score >= 101, ExamSession.total_score <= 200), 1))).label("bucket_101_200"),
        func.count(case((and_(ExamSession.total_score >= 201, ExamSession.total_score <= 300), 1))).label("bucket_201_300"),
        func.count(case((and_(ExamSession.total_score >= 301, ExamSession.total_score <= 400), 1))).label("bucket_301_400"),
        func.count(case((and_(ExamSession.total_score >= 401, ExamSession.total_score <= 500), 1))).label("bucket_401_500"),
        func.count(case((ExamSession.total_score >= 501, 1))).label("bucket_501_plus")
    ).where(and_(ExamSession.status == "finished", ExamSession.is_preview.is_(False)))
    
    dist_result = await db.execute(dist_stmt)
    d = dist_result.fetchone()
    
    dist = [
        {"label": "0-100", "value": float(d.bucket_0_100 or 0)},
        {"label": "101-200", "value": float(d.bucket_101_200 or 0)},
        {"label": "201-300", "value": float(d.bucket_201_300 or 0)},
        {"label": "301-400", "value": float(d.bucket_301_400 or 0)},
        {"label": "401-500", "value": float(d.bucket_401_500 or 0)},
        {"label": "500+", "value": float(d.bucket_501_plus or 0)},
    ]

    result_data = {
        "avg_total_score": round(float(stats.avg_total or 0), 1),
        "avg_twk": round(float(stats.avg_twk or 0), 1),
        "avg_tiu": round(float(stats.avg_tiu or 0), 1),
        "avg_tkp": round(float(stats.avg_tkp or 0), 1),
        "pass_rate": round(float(pass_rate), 1),
        "score_distribution": dist
    }
    
    # Cache for 10 minutes
    await redis_service.set_cache(cache_key, result_data, expire=600)
    
    return result_data

@router.get("/revenue-trends", response_model=RevenueAnalytics)
async def get_revenue_trends(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    cache_key = f"admin:analytics:rev_trends:{days}"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Daily Revenue (Exclude donations for consistent package analytics)
    stmt = (
        select(cast(UserTransaction.created_at, Date), func.sum(UserTransaction.amount))
        .where(
            and_(
                UserTransaction.payment_status == "success", 
                UserTransaction.created_at >= start_date,
                UserTransaction.transaction_type != "donation"
            )
        )
        .group_by(cast(UserTransaction.created_at, Date))
        .order_by(cast(UserTransaction.created_at, Date))
    )
    result = await db.execute(stmt)
    daily = [{"label": str(row[0]), "value": float(row[1])} for row in result.all()]

    # Top Packages
    top_stmt = (
        select(Package.title, func.count(UserTransaction.id))
        .join(UserTransaction, UserTransaction.package_id == Package.id)
        .where(UserTransaction.payment_status == "success")
        .group_by(Package.title)
        .order_by(func.count(UserTransaction.id).desc())
        .limit(5)
    )
    top_result = await db.execute(top_stmt)
    top_pkgs = [{"title": row[0], "sales": row[1]} for row in top_result.all()]

    # Category Share
    cat_stmt = (
        select(Package.category, func.count(UserTransaction.id))
        .join(UserTransaction, UserTransaction.package_id == Package.id)
        .where(UserTransaction.payment_status == "success")
        .group_by(Package.category)
    )
    cat_result = await db.execute(cat_stmt)
    cat_share = [{"label": row[0] or "Others", "value": float(row[1])} for row in cat_result.all()]

    result_data = {
        "daily_revenue": daily,
        "top_packages": top_pkgs,
        "category_share": cat_share
    }

    # Cache for 15 minutes
    await redis_service.set_cache(cache_key, result_data, expire=900)
    
    return result_data

