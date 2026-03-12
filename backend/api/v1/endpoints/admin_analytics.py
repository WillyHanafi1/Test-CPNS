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
    admin: str = Depends(get_current_admin)
):
    # Counts
    user_count = await db.scalar(select(func.count(User.id)))
    pkg_count = await db.scalar(select(func.count(Package.id)))
    q_count = await db.scalar(select(func.count(Question.id)))
    
    # Revenue (success transactions)
    rev_stmt = select(func.sum(UserTransaction.amount)).where(UserTransaction.payment_status == "success")
    revenue = await db.scalar(rev_stmt) or 0
    
    trans_count = await db.scalar(select(func.count(UserTransaction.id)).where(UserTransaction.payment_status == "success"))
    
    # Active exams (started in last 2 hours)
    two_hours_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=2)
    active_exams = await db.scalar(select(func.count(ExamSession.id)).where(ExamSession.start_time >= two_hours_ago))

    return {
        "total_users": user_count or 0,
        "total_packages": pkg_count or 0,
        "total_questions": q_count or 0,
        "total_revenue": revenue,
        "success_transactions": trans_count or 0,
        "active_exams": active_exams or 0
    }

@router.get("/exam-performance", response_model=ExamAnalytics)
async def get_exam_performance(
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    # 1. Hitung Total Sesi Selesai & Rata-rata langsung di DB
    stats_stmt = select(
        func.count(ExamSession.id).label("total_exams"),
        func.avg(ExamSession.total_score).label("avg_total"),
        func.avg(ExamSession.score_twk).label("avg_twk"),
        func.avg(ExamSession.score_tiu).label("avg_tiu"),
        func.avg(ExamSession.score_tkp).label("avg_tkp")
    ).where(ExamSession.status == "finished")
    
    stats_result = await db.execute(stats_stmt)
    stats = stats_result.fetchone()
    
    if not stats or stats.total_exams == 0:
        return {
            "avg_total_score": 0, "avg_twk": 0, "avg_tiu": 0, "avg_tkp": 0, 
            "pass_rate": 0, "score_distribution": []
        }

    # 2. Hitung Pass Rate di DB (National SKD Passing Grade: TWK 65, TIU 80, TKP 166)
    passed_stmt = select(func.count(ExamSession.id)).where(
        and_(
            ExamSession.status == "finished",
            ExamSession.score_twk >= 65,
            ExamSession.score_tiu >= 80,
            ExamSession.score_tkp >= 166
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
    ).where(ExamSession.status == "finished")
    
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

    return {
        "avg_total_score": round(float(stats.avg_total or 0), 1),
        "avg_twk": round(float(stats.avg_twk or 0), 1),
        "avg_tiu": round(float(stats.avg_tiu or 0), 1),
        "avg_tkp": round(float(stats.avg_tkp or 0), 1),
        "pass_rate": round(float(pass_rate), 1),
        "score_distribution": dist
    }

@router.get("/revenue-trends", response_model=RevenueAnalytics)
async def get_revenue_trends(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_async_session),
    admin: str = Depends(get_current_admin)
):
    start_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    
    # Daily Revenue
    stmt = (
        select(cast(UserTransaction.created_at, Date), func.sum(UserTransaction.amount))
        .where(and_(UserTransaction.payment_status == "success", UserTransaction.created_at >= start_date))
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

    return {
        "daily_revenue": daily,
        "top_packages": top_pkgs,
        "category_share": cat_share
    }
