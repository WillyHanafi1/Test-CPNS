"""Public recognition must not leak identities or count unconfirmed/test payments."""
import json
import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from backend.config import settings
from backend.models.models import AuditEvent, User, UserTransaction
from backend.services.exams import utc
from backend.services.donations import public_name
from backend.services.revenue import month_bounds
from backend.tests.conftest import login_and_get_cookies

BASE = '/api/v1/transactions/donations'


async def donation(db, user, amount=5000, **values):
    start, _ = month_bounds()
    defaults = dict(user_id=user.id, order_id='DONATE-' + uuid.uuid4().hex,
                    transaction_type='donation', payment_status='success', amount=amount,
                    payment_environment='production', is_anonymous=False,
                    created_at=start + timedelta(hours=2), paid_at=start + timedelta(hours=3))
    defaults.update(values)
    row = UserTransaction(**defaults)
    db.add(row)
    await db.commit()
    return row


async def test_overview_counts_confirmed_real_donations_and_includes_top_supporter_messages(client, db_session, test_user, admin_user):
    await donation(db_session, test_user, 5000, message='Bismillah lulus CPNS tahun ini!')
    await donation(db_session, test_user, 1000, is_anonymous=True, message='Semangat!')
    await donation(db_session, admin_user, 10000, message='Pesan awal admin',
                   paid_at=month_bounds()[0] + timedelta(hours=1))
    await donation(db_session, admin_user, 6000, message='Semangat pejuang NIP!',
                   paid_at=month_bounds()[0] + timedelta(hours=4))
    for options in [dict(payment_status='pending'), dict(payment_status='failed'),
                    dict(transaction_type='pro_upgrade'), dict(payment_environment='sandbox')]:
        await donation(db_session, test_user, 500000, **options)
    response = await client.get(BASE + '/overview')
    assert response.status_code == 200
    data = response.json()
    assert data['period'] == 'month'
    assert data['stats']['total_amount'] == 22000
    assert data['stats']['supporter_count'] == 2 and data['stats']['donation_count'] == 4
    assert [(row['full_name'], row['total_amount'], row['donation_count'], row['message']) for row in data['top_supporters']] == [
        ('Admin User', 16000, 2, 'Semangat pejuang NIP!'),
        ('Test User', 5000, 1, 'Bismillah lulus CPNS tahun ini!'),
    ]
    anonymous = [row for row in data['recent_supporters'] if row['is_anonymous']]
    assert len(anonymous) == 1 and anonymous[0]['full_name'] == 'Pendukung anonim'
    assert anonymous[0]['message'] == 'Semangat!'
    assert datetime.fromisoformat(anonymous[0]['created_at'].replace('Z', '+00:00')).utcoffset() is not None
    rendered = json.dumps(data)
    assert test_user.email not in rendered and admin_user.email not in rendered
    assert str(test_user.id) not in rendered and 'DONATE-' not in rendered


async def test_month_uses_confirmed_payment_time_in_jakarta_and_retains_legacy_history(client, db_session, test_user):
    start, end = month_bounds()
    await donation(db_session, test_user, 2000, created_at=start - timedelta(days=2), paid_at=start)
    await donation(db_session, test_user, 3000, created_at=start + timedelta(hours=1), paid_at=None, payment_environment=None)
    await donation(db_session, test_user, 7000, paid_at=start - timedelta(seconds=1))
    await donation(db_session, test_user, 9000, paid_at=end)
    monthly = (await client.get(BASE + '/overview?period=month')).json()
    lifetime = (await client.get(BASE + '/overview?period=all')).json()
    assert monthly['stats']['total_amount'] == 5000
    assert monthly['stats']['donation_count'] == 2
    assert monthly['top_supporters'][0]['total_amount'] == 5000
    assert lifetime['stats']['total_amount'] == 21000
    assert lifetime['stats']['target_amount'] == 0 and lifetime['period_label'] == 'Semua waktu'


async def test_ties_share_rank_and_limit_is_applied_after_grouping(client, db_session, test_user, admin_user):
    await donation(db_session, test_user, 2000)
    await donation(db_session, test_user, 3000)
    await donation(db_session, admin_user, 5000)
    third = User(email='unexposed-private-address@example.com', hashed_password='synthetic')
    db_session.add(third)
    await db_session.commit()
    await donation(db_session, third, 1000)
    rows = (await client.get(BASE + '/top?period=month&limit=3')).json()
    assert [row['rank'] for row in rows] == [1, 1, 3]
    assert rows[2]['full_name'] == 'Pendukung TOCPNS'
    assert len((await client.get(BASE + '/top?limit=1')).json()) == 1
    assert (await client.get(BASE + '/stats')).json()['total_amount'] == 11000


@pytest.mark.parametrize('name,expected', [(None, 'Pendukung TOCPNS'), ('', 'Pendukung TOCPNS'),
    ('private.person@example.com', 'Pendukung TOCPNS'), ('https://example.com', 'Pendukung TOCPNS'),
    ('  Budi  Santoso ', 'Budi Santoso'), ('Siti', 'Siti')])
def test_public_name_normalizes_display_name_and_never_uses_email_or_url(name, expected):
    assert public_name(name) == expected


async def test_anonymous_only_and_empty_period_are_honest_and_zero_target_is_safe(client, db_session, test_user, monkeypatch):
    empty = (await client.get(BASE + '/overview')).json()
    assert empty['stats']['total_amount'] == 0 and empty['top_supporters'] == []
    assert empty['recent_supporters'] == []
    monkeypatch.setattr(settings, 'DONATION_MONTHLY_GOAL', 0)
    await donation(db_session, test_user, is_anonymous=True)
    data = (await client.get(BASE + '/overview')).json()
    assert data['stats']['total_amount'] == 5000 and data['stats']['percentage'] == 0
    assert data['top_supporters'] == []
    assert data['recent_supporters'][0]['full_name'] == 'Pendukung anonim'


@pytest.mark.parametrize('query', ['period=year', 'limit=0', 'limit=21'])
async def test_public_query_limits_are_bounded(client, query):
    assert (await client.get(BASE + '/overview?' + query)).status_code == 422


async def test_owner_can_hide_a_donation_without_changing_money_or_pro(client, db_session, test_user):
    row = await donation(db_session, test_user)
    before = (row.amount, row.payment_status, utc(row.paid_at), test_user.is_pro)
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    for _ in range(2):
        result = await client.patch(BASE + '/' + row.order_id + '/visibility', json={'is_anonymous': True})
        assert result.status_code == 200 and result.json()['is_anonymous']
    await db_session.refresh(row)
    await db_session.refresh(test_user)
    assert (row.amount, row.payment_status, utc(row.paid_at), test_user.is_pro) == before
    data = (await client.get(BASE + '/overview')).json()
    assert data['top_supporters'] == [] and data['stats']['total_amount'] == 5000
    audit = (await db_session.scalars(select(AuditEvent).where(AuditEvent.action == 'donation.visibility'))).all()
    assert len(audit) == 1 and audit[0].actor_id == test_user.id
    mine = (await client.get('/api/v1/transactions/my-transactions')).json()
    assert mine[0]['is_anonymous'] is True


async def test_visibility_cannot_be_changed_by_another_user_or_for_a_pro_order(client, db_session, test_user, admin_user):
    row = await donation(db_session, admin_user)
    pro = await donation(db_session, test_user, transaction_type='pro_upgrade')
    assert (await client.patch(BASE + '/' + row.order_id + '/visibility', json={'is_anonymous': True})).status_code == 401
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    for order in (row.order_id, pro.order_id):
        assert (await client.patch(BASE + '/' + order + '/visibility', json={'is_anonymous': True})).status_code == 404


@pytest.mark.parametrize('amount', [True, 999, -5000, '5000', 5000.5, 2147483648, 1000000000000])
async def test_donation_amount_rejects_ambiguous_or_out_of_range_input(client, test_user, amount):
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    assert (await client.post('/api/v1/transactions/donate', json={'amount': amount})).status_code == 422
