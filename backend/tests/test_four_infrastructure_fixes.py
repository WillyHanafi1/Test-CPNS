"""Regressions for slow external services and confirmed financial reporting dates."""
import asyncio
from datetime import datetime, timedelta, timezone
import threading
from unittest.mock import Mock

from google.auth.exceptions import TransportError
from sqlalchemy import select

from backend.core.celery_app import celery_app
from backend.models.models import UserTransaction
from backend.services import payments, revenue
from backend.services.exams import utc
from backend.tests.conftest import login_and_get_cookies


async def test_slow_google_verification_does_not_block_other_api_requests(client, monkeypatch):
    from backend.api.v1.endpoints import auth
    started, release = threading.Event(), threading.Event()
    def slow(*args):
        started.set()
        release.wait(3)
        raise ValueError('synthetic invalid token')
    monkeypatch.setattr(auth.id_token, 'verify_oauth2_token', slow)
    login = asyncio.create_task(client.post('/api/v1/auth/google', json={'token': 'synthetic-token'}))
    try:
        assert await asyncio.to_thread(started.wait, 1)
        assert not login.done()
        response = await asyncio.wait_for(client.get('/api/v1/membership/offer'), timeout=1)
        assert response.status_code == 200 and not login.done()
    finally:
        release.set()
        result = await login
    assert result.status_code == 401


async def test_google_transport_is_bounded_and_outage_remains_retryable(client, monkeypatch):
    from backend.api.v1.endpoints import auth
    transport = Mock(side_effect=TransportError('synthetic outage'))
    monkeypatch.setattr(auth.google_requests, 'Request', lambda: transport)
    def verify(token, request, audience):
        return request('https://certificates.example.test', method='GET')
    monkeypatch.setattr(auth.id_token, 'verify_oauth2_token', verify)
    response = await client.post('/api/v1/auth/google', json={'token': 'synthetic-token'})
    assert response.status_code == 503 and 'coba' in response.json()['detail'].lower()
    assert transport.call_args.kwargs['timeout'] == (3, 5)
    assert 'synthetic outage' not in response.text


async def test_google_verification_deadline_does_not_wait_for_a_stuck_thread(client, monkeypatch):
    from backend.api.v1.endpoints import auth
    release = threading.Event()
    def slow(*args):
        release.wait(2)
        raise ValueError('synthetic invalid token')
    monkeypatch.setattr(auth, 'GOOGLE_VERIFY_TIMEOUT_SECONDS', .03)
    monkeypatch.setattr(auth.id_token, 'verify_oauth2_token', slow)
    try:
        response = await asyncio.wait_for(client.post('/api/v1/auth/google', json={'token': 'synthetic-token'}), 1)
        assert response.status_code == 503
    finally:
        release.set()


async def test_valid_google_login_keeps_existing_user_behavior(client, test_user, db_session, monkeypatch):
    from backend.api.v1.endpoints import auth
    test_user.auth_provider = 'google'
    await db_session.commit()
    monkeypatch.setattr(auth.id_token, 'verify_oauth2_token', lambda *args: {
        'email': test_user.email, 'email_verified': True, 'name': 'Synthetic Google user'})
    response = await client.post('/api/v1/auth/google', json={'token': 'synthetic-token'})
    assert response.status_code == 200 and response.json()['user_id'] == str(test_user.id)
    assert (await client.get('/api/v1/auth/me')).status_code == 200


def test_network_payment_tasks_are_routed_away_from_exam_scoring():
    for task in ('reconcile_payments', 'process_payment_events', 'payment_worker_heartbeat'):
        route = celery_app.amqp.router.route({}, 'backend.core.tasks.' + task)
        assert route['queue'].name == 'payments'
    route = celery_app.amqp.router.route({}, 'backend.core.tasks.calculate_exam_score')
    assert route['queue'].name == 'celery'


async def test_monthly_donations_follow_confirmed_dates_in_jakarta_and_keep_legacy_fallback(client, test_user, db_session):
    start, end = revenue.month_bounds()
    for amount, created, paid, status in [
        (3000, start - timedelta(days=1), start + timedelta(minutes=1), 'success'),
        (5000, start - timedelta(days=2), start - timedelta(minutes=1), 'success'),
        (4000, start + timedelta(minutes=2), None, 'success'),
        (9000, start + timedelta(minutes=4), None, 'pending'),
        (1000, end + timedelta(minutes=1), end + timedelta(minutes=2), 'success'),
    ]:
        db_session.add(UserTransaction(user_id=test_user.id, amount=amount, transaction_type='donation',
            payment_status=status, created_at=created, paid_at=paid))
    await db_session.commit()
    response = await client.get('/api/v1/transactions/donations/stats')
    assert response.status_code == 200
    assert response.json()['total_amount'] == 7000 and response.json()['supporter_count'] == 1
    historical = await db_session.scalar(select(UserTransaction).where(UserTransaction.amount == 4000))
    assert historical.paid_at is None


async def test_daily_revenue_uses_payment_day_in_jakarta(client, test_user, admin_user, db_session):
    today = datetime.now(revenue.BUSINESS_TIMEZONE).replace(hour=0, minute=0, second=0, microsecond=0)
    today_utc = today.astimezone(timezone.utc)
    created = today_utc - timedelta(days=40)
    db_session.add_all([
        UserTransaction(user_id=test_user.id, amount=50000, transaction_type='pro_upgrade',
            payment_status='success', created_at=created, paid_at=today_utc + timedelta(minutes=1)),
        UserTransaction(user_id=test_user.id, amount=2500, transaction_type='pro_upgrade',
            payment_status='success', created_at=today_utc + timedelta(minutes=2)),
        UserTransaction(user_id=test_user.id, amount=3000, transaction_type='pro_upgrade',
            payment_status='success', created_at=created, paid_at=today_utc - timedelta(minutes=1)),
    ])
    await db_session.commit()
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    response = await client.get('/api/v1/admin/analytics/revenue-trends?days=1')
    assert response.status_code == 200, response.text
    assert response.json()['daily_revenue'] == [{'label': today.date().isoformat(), 'value': 52500}]


async def test_success_date_is_set_once_and_historical_success_stays_unknown(client, test_user, db_session):
    row = UserTransaction(user_id=test_user.id, order_id='date-confirmation-test', amount=3000,
        transaction_type='donation', payment_status='pending', created_at=datetime.now(timezone.utc) - timedelta(hours=1))
    old = UserTransaction(user_id=test_user.id, order_id='date-legacy-test', amount=4000,
        transaction_type='donation', payment_status='success')
    db_session.add_all([row, old])
    await db_session.commit()
    paid = datetime.now(timezone.utc) - timedelta(minutes=15)
    await payments.fulfill_transaction(db_session, row.order_id, 'success', paid_at=paid)
    await payments.fulfill_transaction(db_session, row.order_id, 'success', paid_at=datetime.now(timezone.utc))
    await payments.fulfill_transaction(db_session, row.order_id, 'failed')
    await payments.fulfill_transaction(db_session, old.order_id, 'success')
    await db_session.refresh(row)
    await db_session.refresh(old)
    assert row.payment_status == 'success' and utc(row.paid_at) == paid
    assert old.paid_at is None


def test_payment_date_migration_keeps_historical_success_without_inventing_a_date():
    import runpy
    from pathlib import Path
    from sqlalchemy import create_engine, inspect, text
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    upgrade = runpy.run_path(str(Path(__file__).parents[1] / 'alembic/versions/c3d9e25b4a60_payment_confirmation_time.py'))['upgrade']
    with create_engine('sqlite://').begin() as connection:
        connection.execute(text('CREATE TABLE user_transactions(id INTEGER PRIMARY KEY, amount INTEGER, payment_status TEXT)'))
        connection.execute(text("INSERT INTO user_transactions VALUES(1,50000,'success')"))
        with Operations.context(MigrationContext.configure(connection)):
            upgrade()
        assert connection.execute(text('SELECT amount,payment_status,paid_at FROM user_transactions')).one() == (50000, 'success', None)
        assert 'ix_user_transactions_paid_at' in {index['name'] for index in inspect(connection).get_indexes('user_transactions')}
