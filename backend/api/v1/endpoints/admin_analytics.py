import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from datetime import datetime, timedelta, timezone
from typing import List, Dict
from pydantic import BaseModel

from backend.db.session import get_async_session
from backend.models.models import User, UserTransaction, ExamSession, Package, Question, ExamJob, Feedback, PaymentEvent
from backend.api.v1.endpoints.auth import get_current_admin
from backend.core.constants import PASSING_GRADE
from backend.core.redis_service import redis_service
from backend.services.revenue import BUSINESS_TIMEZONE, payment_time, reporting_date
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/infrastructure")
async def infrastructure_status(db: AsyncSession = Depends(get_async_session),
                                admin: User = Depends(get_current_admin)):
    from backend.services.operations import status
    return await status(db)


@router.post("/infrastructure/retry/{kind}/{job_id}")
async def retry_operation(kind: str, job_id: uuid.UUID, db: AsyncSession = Depends(get_async_session),
                          admin: User = Depends(get_current_admin)):
    from fastapi import HTTPException
    from backend.models.models import PaymentEvent, AuditEvent
    if kind not in {'scoring', 'payment'}:
        raise HTTPException(400, 'Jenis pekerjaan tidak dikenali.')
    model = ExamJob if kind == 'scoring' else PaymentEvent
    job = await db.scalar(select(model).where(model.id == job_id).with_for_update())
    if not job:
        raise HTTPException(404, 'Pekerjaan tidak ditemukan.')
    if job.status in {'completed', 'processed', 'ignored'}:
        return {'message': 'Pekerjaan sudah selesai.'}
    previous = job.status
    job.status, job.attempts, job.next_attempt_at, job.last_error = 'pending', 0, None, None
    db.add(AuditEvent(actor_id=admin.id, action='operations.retry', entity_id=str(job_id),
        details={'kind': kind, 'before': previous}))
    await db.commit()
    return {'message': 'Pekerjaan dijadwalkan untuk diperiksa ulang.'}


@router.get("/infrastructure/queue")
async def operation_queue(db: AsyncSession = Depends(get_async_session), admin: User = Depends(get_current_admin)):
    from backend.models.models import PaymentEvent
    rows = []
    for kind, model, states in [('scoring', ExamJob, ['failed', 'pending']), ('payment', PaymentEvent, ['review', 'pending'])]:
        jobs = (await db.scalars(select(model).where(model.status.in_(states)).order_by(model.created_at).limit(25))).all()
        rows.extend({'id': job.id, 'kind': kind, 'status': job.status, 'attempts': job.attempts,
            'created_at': job.created_at, 'last_error': job.last_error} for job in jobs)
    return {'items': rows}


class OverviewStats(BaseModel):
    total_users: int
    participants_count: int = 0
    pro_users_count: int = 0
    total_packages: int
    published_packages: int = 0
    total_questions: int
    published_questions: int = 0
    total_revenue: int
    pro_revenue: int = 0
    donation_revenue: int = 0
    success_transactions: int
    active_exams: int
    finished_sessions_7d: int = 0

class ChartDataPoint(BaseModel):
    label: str
    value: float

class ExamAnalytics(BaseModel):
    avg_total_score: float
    avg_twk: float
    avg_tiu: float
    avg_tkp: float
    pass_rate: float
    total_finished_sessions: int = 0
    score_distribution: List[ChartDataPoint]

class RevenueAnalytics(BaseModel):
    daily_revenue: List[ChartDataPoint]
    top_packages: List[Dict]
    category_share: List[ChartDataPoint]
    revenue_by_type: List[ChartDataPoint] = []
    top_attempted_packages: List[Dict] = []

@router.get("/action-summary")
async def get_action_summary(
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """Lightweight summary for Sidebar badges and Admin Command Center."""
    from backend.services.operations import status as ops_status

    cache_key = "admin:analytics:action-summary:v1"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    pending_feedback = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.status == "pending")
    ) or 0
    pending_transactions = await db.scalar(
        select(func.count(UserTransaction.id)).where(UserTransaction.payment_status == "pending")
    ) or 0
    review_payment_events = await db.scalar(
        select(func.count(PaymentEvent.id)).where(PaymentEvent.status == "review")
    ) or 0
    draft_packages = await db.scalar(
        select(func.count(Package.id)).where(Package.is_active.is_(True), Package.is_published.is_(False))
    ) or 0

    ops = await ops_status(db)
    recent_tx_rows = (
        await db.scalars(
            select(UserTransaction)
            .options(selectinload(UserTransaction.user))
            .order_by(UserTransaction.created_at.desc())
            .limit(5)
        )
    ).all()
    recent_transactions = [
        {
            "id": str(tx.id),
            "order_id": tx.order_id,
            "email": tx.user.email if tx.user else "-",
            "transaction_type": tx.transaction_type,
            "amount": int(tx.amount),
            "payment_status": tx.payment_status,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        }
        for tx in recent_tx_rows
    ]

    payload = {
        "pending_feedback": int(pending_feedback),
        "pending_transactions": int(pending_transactions),
        "review_payment_events": int(review_payment_events),
        "draft_packages": int(draft_packages),
        "ops_status": ops["status"],
        "ops_issues_count": len(ops["issues"]),
        "ops_issues": ops["issues"][:3],
        "recent_transactions": recent_transactions,
    }
    await redis_service.set_cache(cache_key, payload, expire=30)
    return payload

@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats(
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    cache_key = "admin:analytics:overview:v2"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    now = datetime.now(timezone.utc)
    two_hours_ago = now - timedelta(hours=2)
    seven_days_ago = now - timedelta(days=7)

    stats_result = await db.execute(
        select(
            func.count(User.id).label("total_users"),
            func.count(case((and_(User.role == "participant", User.is_active.is_(True)), 1))).label("participants_count"),
            func.count(case((and_(User.is_pro.is_(True), User.is_active.is_(True)), 1))).label("pro_users_count"),
            (select(func.count()).select_from(Package).where(Package.is_active.is_(True))).scalar_subquery().label("total_packages"),
            (select(func.count()).select_from(Package).where(Package.is_active.is_(True), Package.is_published.is_(True))).scalar_subquery().label("published_packages"),
            (select(func.count()).select_from(Question)).scalar_subquery().label("total_questions"),
            (
                select(func.count(Question.id))
                .join(Package, Question.package_id == Package.id)
                .where(Package.is_active.is_(True), Package.is_published.is_(True))
                .scalar_subquery()
            ).label("published_questions"),
            func.coalesce(
                select(func.sum(UserTransaction.amount))
                .where(UserTransaction.payment_status == "success")
                .scalar_subquery(), 0
            ).label("total_revenue"),
            func.coalesce(
                select(func.sum(UserTransaction.amount))
                .where(UserTransaction.payment_status == "success", UserTransaction.transaction_type != "donation")
                .scalar_subquery(), 0
            ).label("pro_revenue"),
            func.coalesce(
                select(func.sum(UserTransaction.amount))
                .where(UserTransaction.payment_status == "success", UserTransaction.transaction_type == "donation")
                .scalar_subquery(), 0
            ).label("donation_revenue"),
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
            func.coalesce(
                select(func.count(ExamSession.id))
                .where(
                    ExamSession.status == "finished",
                    ExamSession.start_time >= seven_days_ago,
                    ExamSession.is_preview.is_(False)
                )
                .scalar_subquery(), 0
            ).label("finished_sessions_7d"),
        ).select_from(User)
    )
    row = stats_result.one()

    result_data = {
        "total_users": int(row.total_users or 0),
        "participants_count": int(row.participants_count or 0),
        "pro_users_count": int(row.pro_users_count or 0),
        "total_packages": int(row.total_packages or 0),
        "published_packages": int(row.published_packages or 0),
        "total_questions": int(row.total_questions or 0),
        "published_questions": int(row.published_questions or 0),
        "total_revenue": int(row.total_revenue or 0),
        "pro_revenue": int(row.pro_revenue or 0),
        "donation_revenue": int(row.donation_revenue or 0),
        "success_transactions": int(row.success_transactions or 0),
        "active_exams": int(row.active_exams or 0),
        "finished_sessions_7d": int(row.finished_sessions_7d or 0),
    }

    # Cache for 5 minutes
    await redis_service.set_cache(cache_key, result_data, expire=300)
    
    return result_data

@router.get("/exam-performance", response_model=ExamAnalytics)
async def get_exam_performance(
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    cache_key = "analytics:exam_performance:v2"
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
            "pass_rate": 0, "total_finished_sessions": 0, "score_distribution": []
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
        "total_finished_sessions": int(stats.total_exams or 0),
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
    cache_key = f"admin:analytics:rev_trends:paid-v2:{days}"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    start_date = (datetime.now(BUSINESS_TIMEZONE).replace(hour=0, minute=0, second=0, microsecond=0)
                  - timedelta(days=days - 1)).astimezone(timezone.utc)
    day = reporting_date(db)
    
    # Daily Revenue (Exclude donations for consistent package/Pro analytics)
    stmt = (
        select(day, func.sum(UserTransaction.amount))
        .where(
            and_(
                UserTransaction.payment_status == "success", 
                payment_time() >= start_date,
                UserTransaction.transaction_type != "donation"
            )
        )
        .group_by(day)
        .order_by(day)
    )
    result = await db.execute(stmt)
    daily = [{"label": str(row[0]), "value": float(row[1])} for row in result.all()]

    # Revenue breakdown by type (Pro vs Donation)
    type_stmt = (
        select(UserTransaction.transaction_type, func.coalesce(func.sum(UserTransaction.amount), 0))
        .where(UserTransaction.payment_status == "success")
        .group_by(UserTransaction.transaction_type)
    )
    type_rows = (await db.execute(type_stmt)).all()
    type_labels = {"pro_upgrade": "Paket Pro", "donation": "Donasi"}
    rev_by_type = [
        {"label": type_labels.get(row[0], row[0] or "Lainnya"), "value": float(row[1] or 0)}
        for row in type_rows
        if float(row[1] or 0) > 0
    ]

    # Top Packages by finished exam attempts (relevant under Paket Pro subscription model)
    passed_cond = and_(
        ExamSession.score_twk >= PASSING_GRADE["TWK"],
        ExamSession.score_tiu >= PASSING_GRADE["TIU"],
        ExamSession.score_tkp >= PASSING_GRADE["TKP"],
    )
    attempted_stmt = (
        select(
            Package.id,
            Package.title,
            Package.category,
            func.count(ExamSession.id).label("attempts"),
            func.avg(ExamSession.total_score).label("avg_score"),
            func.count(case((passed_cond, 1))).label("passed_count"),
        )
        .join(ExamSession, ExamSession.package_id == Package.id)
        .where(ExamSession.status == "finished", ExamSession.is_preview.is_(False))
        .group_by(Package.id, Package.title, Package.category)
        .order_by(func.count(ExamSession.id).desc())
        .limit(5)
    )
    attempted_rows = (await db.execute(attempted_stmt)).all()
    top_attempted = [
        {
            "id": str(row.id),
            "title": row.title,
            "category": row.category,
            "attempts": int(row.attempts or 0),
            "avg_score": round(float(row.avg_score or 0), 1),
            "pass_rate": round((int(row.passed_count or 0) / int(row.attempts) * 100), 1) if row.attempts else 0.0,
        }
        for row in attempted_rows
    ]

    # Legacy fields kept for backward compatibility
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
        "category_share": cat_share,
        "revenue_by_type": rev_by_type,
        "top_attempted_packages": top_attempted,
    }

    # Cache for 15 minutes
    await redis_service.set_cache(cache_key, result_data, expire=900)
    
    return result_data


@router.get("/visitors")
async def get_visitor_analytics(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin),
):
    from backend.services.visitors import get_admin_visitor_analytics
    return await get_admin_visitor_analytics(db, days=days)

