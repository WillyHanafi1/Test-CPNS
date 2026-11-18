"""Small operational signals; data/receipts live in PostgreSQL, not local log files."""
from datetime import datetime, timedelta, timezone
import json
from sqlalchemy import func, select
from backend.core.redis_service import redis_service
from backend.models.models import ExamJob, ExamResponse, ExamSession, PaymentEvent, UserTransaction
from backend.services.exams import utc


async def status(db):
    now = datetime.now(timezone.utc)
    scoring = dict((await db.execute(select(ExamJob.status, func.count()).group_by(ExamJob.status))).all())
    payments = dict((await db.execute(select(PaymentEvent.status, func.count()).group_by(PaymentEvent.status))).all())
    oldest = await db.scalar(select(func.min(ExamJob.created_at)).where(ExamJob.status == 'pending'))
    overdue = await db.scalar(select(func.count()).select_from(ExamSession).where(
        ExamSession.status == 'ongoing', ExamSession.end_time < now - timedelta(minutes=3)))
    legacy = await db.scalar(select(func.count()).select_from(ExamSession).where(
        ExamSession.status.in_(['ongoing', 'processing']), ExamSession.revision_id.is_(None), ExamSession.is_preview.is_(False)))
    late_payments = await db.scalar(select(func.count()).select_from(UserTransaction).where(
        UserTransaction.payment_status == 'pending', UserTransaction.payment_environment.is_not(None),
        UserTransaction.payment_expires_at < now - timedelta(minutes=15)))
    latest_save = await db.scalar(select(func.max(ExamResponse.saved_at)))
    heartbeat = None
    payment_heartbeat = None
    host = None
    redis_ok = True
    try:
        raw = await redis_service.redis.get('ujian:worker_heartbeat')
        if raw:
            heartbeat = utc(datetime.fromisoformat(raw.decode() if isinstance(raw, bytes) else raw))
        raw_payment = await redis_service.redis.get('ujian:payment_worker_heartbeat')
        if raw_payment:
            payment_heartbeat = utc(datetime.fromisoformat(raw_payment.decode() if isinstance(raw_payment, bytes) else raw_payment))
        raw_host = await redis_service.redis.get('ujian:host_status')
        if raw_host:
            host = json.loads(raw_host)
    except Exception:
        redis_ok = False
    heartbeat_age = max(0, int((now - heartbeat).total_seconds())) if heartbeat else None
    payment_heartbeat_age = max(0, int((now - payment_heartbeat).total_seconds())) if payment_heartbeat else None
    age = max(0, int((now - utc(oldest)).total_seconds())) if oldest else 0
    issues = []
    if host:
        issues.extend(host.get('issues', []))
    def issue(code, message, count=1):
        issues.append({'code': code, 'message': message, 'count': count})
    if not redis_ok:
        issue('redis_unavailable', 'Koneksi antrean belum tersedia.')
    if not host:
        issue('host_monitor', 'Status disk dan backup belum terpantau; aktifkan timer operasi server.')
    if heartbeat_age is None or heartbeat_age > 150:
        issue('worker_heartbeat', 'Worker atau penjadwal belum memberi kabar terbaru.')
    if payment_heartbeat_age is None or payment_heartbeat_age > 150:
        issue('payment_worker_heartbeat', 'Worker pembayaran belum memberi kabar terbaru; pemeriksaan pembayaran dapat tertunda.')
    if scoring.get('failed'):
        issue('scoring_failed', 'Ada hasil latihan yang perlu diproses ulang.', scoring['failed'])
    if age > 180:
        issue('scoring_delayed', 'Ada hasil latihan yang tertahan lebih dari tiga menit.', scoring.get('pending', 0))
    if payments.get('review'):
        issue('payment_review', 'Ada notifikasi pembayaran yang perlu ditinjau.', payments['review'])
    if late_payments:
        issue('payment_reconciliation', 'Ada transaksi lewat tenggat yang belum selesai direkonsiliasi.', late_payments)
    if overdue:
        issue('exam_deadline', 'Ada sesi melewati tenggat yang belum ditutup.', overdue)
    return {'observed_at': now, 'scoring': scoring, 'payment_events': payments,
        'worker_heartbeat_age_seconds': heartbeat_age, 'redis_available': redis_ok,
        'payment_worker_heartbeat_age_seconds': payment_heartbeat_age,
        'pending_scoring_jobs': scoring.get('pending', 0), 'oldest_pending_seconds': age,
        'overdue_ongoing_sessions': overdue or 0, 'legacy_unfinished_sessions': legacy or 0,
        'last_acknowledged_answer_at': latest_save, 'issues': issues,
        'host': host, 'status': 'attention' if issues else 'healthy'}
