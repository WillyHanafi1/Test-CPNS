"""Verify scoring and heartbeat complete while the dedicated payment worker is blocked."""
import asyncio
from datetime import datetime, timedelta, timezone
import json
from time import monotonic
import uuid
from sqlalchemy import select
from backend.config import settings
from backend.core import tasks
from backend.core.redis_service import redis_service
from backend.db.session import Base, engine, async_session_maker
from backend.models.models import User, Package, PackageRevision, ExamSession, ExamJob, ExamResponse, UserTransaction


async def main():
    if settings.DATABASE_URL != 'postgresql+asyncpg://ujian_verify:verification-only@postgres:5432/ujian_verify':
        raise RuntimeError('Isolation checks are restricted to the disposable verification database')
    await redis_service.redis.delete('verification:payment_outage_started', 'verification:payment_outage_completed')
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    now = datetime.now(timezone.utc)
    question_id, option_id = uuid.uuid4(), uuid.uuid4()
    async with async_session_maker() as db:
        user = User(email='isolation-' + uuid.uuid4().hex + '@example.com', hashed_password='synthetic-disabled-login',
                    is_active=True, role='participant')
        package = Package(title='Synthetic outage verification', description='Disposable data only', category='Mix')
        db.add_all([user, package])
        await db.flush()
        revision = PackageRevision(package_id=package.id, digest=uuid.uuid4().hex * 2,
            payload={'questions': [{'id': str(question_id), 'segment': 'TWK',
                'options': [{'id': str(option_id), 'score': 5}]}],
                'passing_grades': {'TWK': 1, 'TIU': 1, 'TKP': 1}})
        db.add(revision)
        await db.flush()
        session = ExamSession(user_id=user.id, package_id=package.id, revision_id=revision.id, status='processing',
            start_time=now - timedelta(minutes=2), end_time=now - timedelta(minutes=1))
        db.add(session)
        await db.flush()
        db.add_all([ExamJob(session_id=session.id), ExamResponse(session_id=session.id, question_id=question_id,
            option_id=option_id, mutation_id=str(uuid.uuid4())),
            UserTransaction(user_id=user.id, order_id='ISOLATION-' + uuid.uuid4().hex, transaction_type='donation', amount=3000,
                payment_status='pending', payment_environment=settings.DOKU_ENVIRONMENT, payment_client_id=settings.DOKU_CLIENT_ID,
                created_at=now - timedelta(minutes=3))])
        await db.commit()
        sid, uid, email = str(session.id), str(user.id), user.email
    tasks.reconcile_payments.delay()
    deadline = monotonic() + 20
    while not await redis_service.redis.get('verification:payment_outage_started'):
        if monotonic() >= deadline:
            raise AssertionError('Dedicated payment worker did not start the synthetic provider check')
        await asyncio.sleep(.1)
    started = monotonic()
    tasks.calculate_exam_score.delay(sid, uid, email)
    tasks.operational_heartbeat.delay()
    deadline = started + 7
    while True:
        async with async_session_maker() as db:
            row = await db.get(ExamSession, uuid.UUID(sid))
            finished = row.status == 'finished' and row.total_score == 5
            grant = await db.scalar(select(User.is_pro).where(User.id == uuid.UUID(uid)))
        heartbeat = await redis_service.redis.get('ujian:worker_heartbeat')
        if finished and heartbeat:
            break
        if monotonic() >= deadline:
            raise AssertionError('Scoring/heartbeat was held behind a payment-provider outage')
        await asyncio.sleep(.1)
    assert not await redis_service.redis.get('verification:payment_outage_completed')
    assert not grant
    print(json.dumps({'scoring_completed_during_payment_outage': True, 'exam_score': 5,
        'scoring_and_heartbeat_seconds': round(monotonic() - started, 3), 'unverified_payment_granted': False,
        'synthetic_environment_only': True}), flush=True)
    await engine.dispose()
    await redis_service.redis.aclose()


if __name__ == '__main__':
    asyncio.run(main())
