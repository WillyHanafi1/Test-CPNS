"""Payment contracts use synthetic credentials and never contact a payment provider."""
import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock
from zoneinfo import ZoneInfo

import pytest
import requests
import asyncio
import os
from sqlalchemy import select
from backend.config import settings
from backend.core.doku_service import DokuError, DokuService, NOTIFICATION_PATH, exact_amount
from backend.models.models import UserTransaction, PaymentEvent, AuditEvent
from backend.services import payments
from backend.tests.conftest import login_and_get_cookies


@pytest.fixture
def provider(monkeypatch):
    for key, value in {'DOKU_ENABLED': True, 'DOKU_CLIENT_ID': 'unit-merchant',
        'DOKU_SECRET_KEY': 'unit-payment-secret', 'DOKU_ENVIRONMENT': 'sandbox',
        'DOKU_WEBHOOK_PROFILE': 'non-snap', 'DOKU_PAYMENT_METHODS': 'QRIS,VIRTUAL_ACCOUNT_BNI',
        'FRONTEND_URL': 'http://localhost:3000',
        'DOKU_NOTIFICATION_URL': 'https://tocpns.my.id' + NOTIFICATION_PATH}.items():
        monkeypatch.setattr(settings, key, value)
    service = DokuService()
    monkeypatch.setattr(payments, 'doku_service', service)
    from backend.api.v1.endpoints import transactions_api
    monkeypatch.setattr(transactions_api, 'doku_service', service)
    return service


def signature(service, request_id, timestamp, target, data=None, response=False):
    raw = f'Client-Id:{service.client_id}\nRequest-Id:{request_id}\n'
    raw += f'{"Response" if response else "Request"}-Timestamp:{timestamp}\nRequest-Target:{target}'
    if data is not None:
        raw += '\nDigest:' + base64.b64encode(hashlib.sha256(data).digest()).decode()
    return 'HMACSHA256=' + base64.b64encode(hmac.new(service.secret_key.encode(), raw.encode(), hashlib.sha256).digest()).decode()


def transport(service, *, amount=50000, invoice='PRO-test', status=200, signed=True):
    def call(method, url, data, headers, **kwargs):
        expiry = (datetime.now(ZoneInfo('Asia/Jakarta')) + timedelta(hours=1)).strftime('%Y%m%d%H%M%S')
        payload = {'message': ['SUCCESS'], 'response': {'order': {'invoice_number': invoice, 'amount': amount},
                   'payment': {'url': 'https://sandbox.doku.com/checkout/unit', 'expired_date': expiry}}}
        raw = json.dumps(payload).encode()
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        assert kwargs['allow_redirects'] is False
        assert headers['Signature'] == signature(service, headers['Request-Id'], headers['Request-Timestamp'], '/checkout/v1/payment', data)
        result_headers = {'Response-Timestamp': timestamp}
        if signed:
            result_headers['Signature'] = signature(service, headers['Request-Id'], timestamp, '/checkout/v1/payment', raw, True)
        return SimpleNamespace(content=raw, headers=result_headers, status_code=status)
    return call


def create(service):
    return service.create_transaction('PRO-test', 50000,
        [{'id': 'pro', 'name': 'TOCPNS Pro', 'price': 50000, 'quantity': 1}],
        {'email': 'participant@example.com'}, request_id='persistent-request')


@pytest.mark.parametrize('value', [0, -1, True, '1e5', '50,000', '50000.5', None, float('nan')])
def test_amount_rejects_ambiguous_or_invalid_values(value):
    with pytest.raises(DokuError):
        exact_amount(value)


def test_checkout_uses_cpns_domain_matching_married_notification_path(provider, monkeypatch):
    call = Mock(side_effect=transport(provider, status=409))
    monkeypatch.setattr(requests, 'request', call)
    result = create(provider)
    sent = json.loads(call.call_args.kwargs['data'])
    assert sent['additional_info']['override_notification_url'] == 'https://tocpns.my.id/api/payments/doku/notifications'
    assert sent['payment']['payment_method_types'] == ['QRIS', 'VIRTUAL_ACCOUNT_BNI']
    assert sent['order']['callback_url'] == 'http://localhost:3000/payment/success?order_id=PRO-test'
    assert sent['order']['callback_url_result'] == sent['order']['callback_url']
    assert sent['order']['currency'] == 'IDR'
    assert result['redirect_url'].startswith('https://sandbox.doku.com/')
    assert result['expires_at'].tzinfo == timezone.utc


@pytest.mark.parametrize('options', [{'signed': False}, {'amount': 1}, {'invoice': 'WEDDING-other'}])
def test_checkout_rejects_unsigned_or_uncorrelated_provider_response(provider, monkeypatch, options):
    monkeypatch.setattr(requests, 'request', transport(provider, **options))
    with pytest.raises(DokuError):
        create(provider)


@pytest.mark.parametrize('url', ['http://sandbox.doku.com/pay', 'https://sandbox.doku.com.evil.test/pay',
    'https://user:pass@sandbox.doku.com/pay', 'https://sandbox.doku.com:444/pay', 'javascript:alert(1)'])
def test_provider_redirect_must_belong_to_matching_doku_environment(provider, url):
    with pytest.raises(DokuError):
        provider.checkout_url(url)


def test_status_request_signs_get_without_digest_and_checks_invoice(provider, monkeypatch):
    def call(method, url, data, headers, **kwargs):
        target = '/orders/v1/status/PRO-test'
        assert method == 'GET' and data is None and url.endswith(target)
        assert headers['Signature'] == signature(provider, headers['Request-Id'], headers['Request-Timestamp'], target)
        raw = json.dumps({'order': {'invoice_number': 'PRO-test', 'amount': 50000},
                          'transaction': {'status': 'PENDING'}}).encode()
        ts = '2026-11-17T00:00:00Z'
        return SimpleNamespace(content=raw, status_code=200, headers={'Response-Timestamp': ts,
            'Signature': signature(provider, headers['Request-Id'], ts, target, response=True)})
    monkeypatch.setattr(requests, 'request', call)
    assert provider.get_status('PRO-test')['transaction']['status'] == 'PENDING'


async def test_timeout_retry_reuses_durable_invoice_and_exact_request(provider, monkeypatch, client, test_user, db_session):
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    calls = []
    def create_transaction(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            raise DokuError('DOKU_CONNECTION_UNCERTAIN')
        return {'token': '', 'redirect_url': 'https://sandbox.doku.com/checkout/unit'}
    monkeypatch.setattr(provider, 'create_transaction', create_transaction)
    first = await client.post('/api/v1/transactions/upgrade-pro')
    assert first.status_code == 503
    row = await db_session.scalar(select(UserTransaction))
    assert row.payment_status == 'pending' and row.payment_request_body and row.payment_url is None
    again = await client.post('/api/v1/transactions/upgrade-pro')
    assert again.status_code == 200, again.text
    assert calls[0]['request_id'] == calls[1]['request_id'] == str(row.id)
    assert calls[0]['request_body'] == calls[1]['request_body']
    assert again.json()['order_id'] == row.order_id
    assert len((await db_session.scalars(select(UserTransaction))).all()) == 1


async def seed_payment(provider, db, user, *, environment='sandbox', age=120):
    row = UserTransaction(user_id=user.id, order_id='PRO-synthetic', amount=50000,
        duration_days=365, transaction_type='pro_upgrade', payment_status='pending',
        payment_environment=environment, payment_client_id=provider.client_id,
        created_at=datetime.now(timezone.utc) - timedelta(seconds=age),
        payment_request_body=provider.build_checkout_body('PRO-synthetic', 50000,
            [{'price': 50000, 'quantity': 1}], {'email': user.email}))
    db.add(row)
    await db.commit()
    return row


def notification(provider, *, status='SUCCESS', amount=50000, channel='QRIS', target=NOTIFICATION_PATH, paid_at=None):
    data = {'order': {'invoice_number': 'PRO-synthetic', 'amount': amount, 'currency': 'IDR'},
            'transaction': {'status': status}, 'channel': {'id': channel}}
    if paid_at is not None:
        data['transaction']['date'] = paid_at
    body = json.dumps(data).encode()
    # Delayed valid retries remain acceptable; signature and invoice enforce idempotency.
    timestamp = '2026-10-01T00:00:00Z'
    headers = {'Client-Id': provider.client_id, 'Request-Id': 'notification-unit', 'Request-Timestamp': timestamp,
               'Signature': signature(provider, 'notification-unit', timestamp, target, body)}
    return data, body, headers


async def test_webhook_grants_pro_once_and_never_downgrades_paid_order(provider, client, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user)
    _, body, headers = notification(provider)
    for _ in range(2):
        response = await client.post(NOTIFICATION_PATH, content=body, headers=headers)
        assert response.status_code == 200, response.text
    await db_session.refresh(test_user)
    expires = test_user.pro_expires_at
    remaining = (expires.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
    assert test_user.is_pro and 365 * 86400 - 5 < remaining <= 365 * 86400
    _, body, headers = notification(provider, status='FAILED')
    assert (await client.post(NOTIFICATION_PATH, content=body, headers=headers)).status_code == 200
    await db_session.refresh(row)
    await db_session.refresh(test_user)
    assert row.payment_status == 'success' and row.granted_at and test_user.pro_expires_at == expires


@pytest.mark.parametrize('amount,channel,environment,expected', [(1, 'QRIS', 'sandbox', 'http_400'),
    (50000, 'QRIS', 'production', 'http_409'), (50000, 'VIRTUAL_ACCOUNT_BJB', 'sandbox', 'DOKU_PAYMENT_CHANNEL_MISMATCH')])
async def test_webhook_cannot_grant_wrong_amount_environment_or_channel(provider, client, test_user, db_session,
                                                                      amount, channel, environment, expected):
    await seed_payment(provider, db_session, test_user, environment=environment)
    _, body, headers = notification(provider, amount=amount, channel=channel)
    result = await client.post(NOTIFICATION_PATH, content=body, headers=headers)
    assert result.status_code == 200, result.text
    event = await db_session.scalar(select(PaymentEvent))
    assert event.status == 'review' and event.last_error == expected
    await db_session.refresh(test_user)
    assert not test_user.is_pro


async def test_signed_failed_channel_keeps_checkout_pending(provider, client, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user)
    _, body, headers = notification(provider, status='FAILED')
    assert (await client.post(NOTIFICATION_PATH, content=body, headers=headers)).status_code == 200
    await db_session.refresh(row)
    assert row.payment_status == 'pending'


async def test_signed_provider_payment_date_survives_receipt_processing_and_replay(provider, client, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user, age=3600)
    paid = datetime.now(timezone.utc) - timedelta(minutes=30)
    _, body, headers = notification(provider, paid_at=paid.isoformat())
    for _ in range(2):
        reply = await client.post(NOTIFICATION_PATH, content=body, headers=headers)
        assert reply.status_code == 200, reply.text
    await db_session.refresh(row)
    assert payments.utc(row.paid_at) == paid
    receipt = await db_session.scalar(select(PaymentEvent))
    assert receipt.payload['transaction']['date'] == paid.isoformat()


async def test_reconciliation_recovers_missing_webhook_and_throttles_status_checks(provider, monkeypatch, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user)
    data, _, _ = notification(provider, status='PENDING')
    getter = Mock(return_value=data)
    monkeypatch.setattr(provider, 'get_status', getter)
    await payments.reconcile_transaction(db_session, row.order_id)
    await payments.reconcile_transaction(db_session, row.order_id)
    assert getter.call_count == 1
    row.payment_checked_at = datetime.now(timezone.utc) - timedelta(minutes=6)
    await db_session.commit()
    getter.return_value = notification(provider)[0]
    await payments.reconcile_transaction(db_session, row.order_id)
    await db_session.refresh(test_user)
    assert test_user.is_pro and getter.call_count == 2


async def test_reconciliation_waits_for_provider_window(provider, monkeypatch, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user, age=30)
    getter = Mock(side_effect=AssertionError('Too early to call DOKU'))
    monkeypatch.setattr(provider, 'get_status', getter)
    await payments.reconcile_transaction(db_session, row.order_id)
    getter.assert_not_called()


async def test_legacy_or_other_merchant_links_are_not_offered_as_resumable_payments(provider, client, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user, age=0)
    row.payment_url = 'https://sandbox.doku.com/checkout/payment/unit'
    row.payment_environment = None
    row.payment_client_id = None
    await db_session.commit()
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    history = await client.get('/api/v1/transactions/my-transactions')
    state = await client.get('/api/v1/transactions/status/' + row.order_id)
    assert history.status_code == state.status_code == 200
    assert history.json()[0]['payment_url'] is None and state.json()['payment_url'] is None


async def test_manual_payment_audit_keeps_actor_and_actual_status_with_the_grant(provider, client, test_user, admin_user, db_session):
    row = await seed_payment(provider, db_session, test_user)
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    endpoint = f'/api/v1/admin/transactions/{row.id}/status'
    assert (await client.put(endpoint, params={'new_status': 'success', 'reason': 'Bukti diverifikasi'})).status_code == 200
    reply = await client.put(endpoint, params={'new_status': 'failed', 'reason': 'Duplicate request'})
    assert reply.status_code == 200 and reply.json()['new_status'] == 'success'
    entries = (await db_session.scalars(select(AuditEvent).where(AuditEvent.action == 'admin.payment_status')
        .order_by(AuditEvent.created_at))).all()
    assert len(entries) == 2 and all(entry.actor_id == admin_user.id for entry in entries)
    assert entries[0].details['reason'] == 'Bukti diverifikasi'
    assert entries[1].details == {'before': 'success', 'requested': 'failed', 'after': 'success', 'reason': 'Duplicate request'}
    await db_session.refresh(test_user)
    assert test_user.is_pro


async def test_historical_success_without_grant_timestamp_is_not_granted_again(provider, test_user, db_session):
    row = await seed_payment(provider, db_session, test_user)
    row.payment_status = 'success'
    await db_session.commit()
    await payments.fulfill_transaction(db_session, row.order_id, 'success')
    await db_session.refresh(test_user)
    assert not test_user.is_pro and row.granted_at is None


async def test_disabled_payments_and_donation_callback_are_rejected(provider, monkeypatch, client, test_user):
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    response = await client.post('/api/v1/transactions/donate', json={'amount': 1000, 'callback_url': 'https://evil.test/payment/success'})
    assert response.status_code == 400
    monkeypatch.setattr(settings, 'DOKU_ENABLED', False)
    assert (await client.get('/api/v1/membership/offer')).json()['checkout_available'] is False
    assert (await client.post('/api/v1/transactions/upgrade-pro')).status_code == 503


@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL', '').startswith('postgresql'), reason='Receipt concurrency requires PostgreSQL')
async def test_simultaneous_webhook_deliveries_create_one_receipt_and_one_grant(provider, client, test_user, db_session):
    await seed_payment(provider, db_session, test_user)
    _, body, headers = notification(provider)
    replies = await asyncio.gather(*(client.post(NOTIFICATION_PATH, content=body, headers=headers) for _ in range(4)))
    assert all(reply.status_code == 200 for reply in replies)
    rows = (await db_session.scalars(select(PaymentEvent))).all()
    assert len(rows) == 1 and rows[0].status == 'processed'
    await db_session.refresh(test_user)
    remaining = (test_user.pro_expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
    assert 365 * 86400 - 5 < remaining <= 365 * 86400


def test_payment_migration_preserves_existing_transaction():
    import runpy
    from pathlib import Path
    from sqlalchemy import create_engine, inspect, text
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    path = Path(__file__).parents[1] / 'alembic/versions/e7b2c80d913a_doku_checkout_reconciliation.py'
    upgrade = runpy.run_path(str(path))['upgrade']
    with create_engine('sqlite://').begin() as connection:
        connection.execute(text('CREATE TABLE user_transactions(id INTEGER PRIMARY KEY, amount INTEGER, payment_status TEXT)'))
        connection.execute(text("INSERT INTO user_transactions VALUES(1,50000,'success')"))
        with Operations.context(MigrationContext.configure(connection)):
            upgrade()
        columns = {c['name'] for c in inspect(connection).get_columns('user_transactions')}
        assert {'payment_environment', 'payment_client_id', 'payment_request_body', 'payment_expires_at', 'payment_checked_at'} <= columns
        assert connection.execute(text('SELECT id,amount,payment_status FROM user_transactions')).one() == (1, 50000, 'success')
