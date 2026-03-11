from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date
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
    # Only finished exams
    stmt = select(ExamSession).where(ExamSession.status == "finished")
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    
    if not sessions:
        return {
            "avg_total_score": 0, "avg_twk": 0, "avg_tiu": 0, "avg_tkp": 0, 
            "pass_rate": 0, "score_distribution": []
        }

    total_scores = [s.total_score or 0 for s in sessions]
    avg_total = sum(total_scores) / len(sessions)
    
    # Pass rate (National SKD Passing Grade: TWK 65, TIU 80, TKP 166)
    passed = 0
    for s in sessions:
        if (s.score_twk or 0) >= 65 and (s.score_tiu or 0) >= 80 and (s.score_tkp or 0) >= 166:
            passed += 1
            
    pass_rate = (passed / len(sessions)) * 100 if sessions else 0

    # Score Distribution Histogram
    buckets = [
        {"range": "0-100", "min": 0, "max": 100, "count": 0},
        {"range": "101-200", "min": 101, "max": 200, "count": 0},
        {"range": "201-300", "min": 201, "max": 300, "count": 0},
        {"range": "301-400", "min": 301, "max": 400, "count": 0},
        {"range": "401-500", "min": 401, "max": 500, "count": 0},
        {"range": "500+", "min": 501, "max": 600, "count": 0},
    ]
    
    for score in total_scores:
        for b in buckets:
            if score >= b["min"] and score <= b["max"]:
                b["count"] += 1
                break
    
    dist = [{"label": b["range"], "value": float(b["count"])} for b in buckets]

    return {
        "avg_total_score": round(avg_total, 1),
        "avg_twk": 0, # In real app, pull from session.score_details json
        "avg_tiu": 0,
        "avg_tkp": 0,
        "pass_rate": round(pass_rate, 1),
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
