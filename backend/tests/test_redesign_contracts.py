"""Cross-feature contracts for the simplified participant and admin flows."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.models.models import Package, PackageRevision, Question, ExamSession, ExamResponse, UserTransaction
from backend.services.exams import owned_session, score, publish_revision
from backend.tests.conftest import login_and_get_cookies
from backend.tests.test_durable_exams import start, mutation


async def test_pro_includes_all_published_packages_and_preserves_expired_resume(client, test_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    package.is_premium = True
    await db_session.commit()
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    assert (await client.post(f'/api/v1/exam/start/{package.id}')).status_code == 403
    test_user.is_pro = True
    test_user.pro_expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    await db_session.commit()
    data = await start(client, package)
    test_user.pro_expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    await db_session.commit()
    resumed = await client.post(f'/api/v1/exam/start/{package.id}')
    assert resumed.status_code == 200 and resumed.json()['session_id'] == data['session_id']
    assert (await client.get('/api/v1/membership/me')).json()['is_pro'] is False


async def test_checkout_uses_provider_contract_and_reuses_pending_order(client, test_user, db_session):
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    calls = []
    # Explicit signature catches accidental arguments unsupported by the provider adapter.
    def provider(order_id, amount, item_details, customer_details, callback_url=None):
        calls.append(order_id)
        assert f'order_id={order_id}' in callback_url
        return {'token':'synthetic', 'redirect_url':'https://checkout.example.com/synthetic'}
    with patch.object(settings, 'DOKU_CLIENT_ID', 'synthetic'), patch.object(settings, 'DOKU_SECRET_KEY', 'synthetic'), patch('backend.api.v1.endpoints.transactions_api.doku_service.create_transaction', provider):
        first = await client.post('/api/v1/transactions/upgrade-pro')
        second = await client.post('/api/v1/transactions/upgrade-pro')
    assert first.status_code == second.status_code == 200, first.text
    assert first.json()['order_id'] == second.json()['order_id'] and len(calls) == 1
    row = await db_session.scalar(select(UserTransaction))
    assert row.duration_days == 365 and row.granted_at is None
    assert (await client.get('/api/v1/transactions/status/another-owner-order')).status_code == 404


async def test_grant_extends_active_expiry_once_and_rejects_amount_mismatch(client, test_user, db_session):
    from backend.api.v1.endpoints.transactions_api import fulfill_transaction
    expiry = datetime.now(timezone.utc) + timedelta(days=40)
    test_user.is_pro, test_user.pro_expires_at = True, expiry
    db_session.add(UserTransaction(user_id=test_user.id, order_id='renewal', amount=50000,
        duration_days=365, transaction_type='pro_upgrade', payment_status='pending'))
    await db_session.commit()
    with pytest.raises(HTTPException) as error:
        await fulfill_transaction(db_session, 'renewal', 'success', expected_amount=Decimal('1'))
    assert error.value.status_code == 400
    await db_session.rollback()
    await fulfill_transaction(db_session, 'renewal', 'success', expected_amount=Decimal('50000'))
    await fulfill_transaction(db_session, 'renewal', 'success', expected_amount=Decimal('50000'))
    await db_session.refresh(test_user)
    actual = test_user.pro_expires_at.replace(tzinfo=timezone.utc)
    assert abs((actual - expiry).total_seconds() - 365*86400) < 1


async def test_published_edits_blocked_and_new_draft_cannot_rewrite_attempt(client, test_user, admin_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    data = await start(client, package)
    body = mutation(data)
    await client.post(f"/api/v1/exam/autosave/{data['session_id']}", json=body)
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    url = f"/api/v1/admin/questions/{body['question_id']}"
    assert (await client.put(url, json={'content':'Changed draft'})).status_code == 409
    assert (await client.put(f'/api/v1/admin/packages/{package.id}', json={'is_published':False})).status_code == 200
    assert (await client.put(url, json={'content':'Changed draft'})).status_code == 200
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    state = (await client.get(f"/api/v1/exam/session/{data['session_id']}/state")).json()
    assert state['package']['questions'][0]['content'] == 'TWK Question 1'
    assert 'score' not in state['package']['questions'][0]['options'][0]


async def test_replace_import_never_deletes_modern_attempt_or_acknowledged_answers(client, test_user, admin_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    data = await start(client, package)
    await client.post(f"/api/v1/exam/autosave/{data['session_id']}", json=mutation(data))
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    await client.put(f'/api/v1/admin/packages/{package.id}', json={'is_published':False})
    csv = 'number,segment,content,discussion,option_a,option_b,option_c,option_d,option_e,score_a,score_b,score_c,score_d,score_e\n1,TWK,New draft,Explanation,A,B,C,D,E,5,0,0,0,0\n'
    response = await client.post(f'/api/v1/admin/import/questions?package_id={package.id}&replace=true', files={'file':('draft.csv',csv,'text/csv')})
    assert response.status_code == 200, response.text
    assert await db_session.get(ExamSession, uuid.UUID(data['session_id']))
    assert await db_session.scalar(select(ExamResponse.id).where(ExamResponse.session_id == uuid.UUID(data['session_id'])))
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    state = (await client.get(f"/api/v1/exam/session/{data['session_id']}/state")).json()
    assert len(state['package']['questions']) == 110


async def test_legacy_history_blocks_draft_replacement(client, test_user, admin_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    package.is_published = False
    db_session.add(ExamSession(user_id=test_user.id, package_id=package.id, status='finished',
        start_time=datetime.now(timezone.utc), end_time=datetime.now(timezone.utc)))
    await db_session.commit()
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    response = await client.post(f'/api/v1/admin/import/questions?package_id={package.id}&replace=true', files={'file':('draft.csv','ignored','text/csv')})
    assert response.status_code == 409


async def test_ranking_separates_revisions_and_excludes_preview(client, test_user, admin_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    data = await start(client, package)
    sid = uuid.UUID(data['session_id'])
    await client.post(f'/api/v1/exam/autosave/{sid}', json=mutation(data))
    await client.post(f'/api/v1/exam/finish/{sid}')
    attempt = await owned_session(db_session, sid, test_user.id, lock=True)
    await score(db_session, attempt)
    old_revision = attempt.revision_id
    loaded = await db_session.scalar(select(Package).where(Package.id==package.id).options(selectinload(Package.questions).selectinload(Question.options)))
    loaded.title = 'New revision'
    new_revision = await publish_revision(db_session, loaded)
    for rev, preview in [(new_revision.id, False), (old_revision, True)]:
        db_session.add(ExamSession(user_id=admin_user.id, package_id=package.id, revision_id=rev,
            is_preview=preview, status='finished', total_score=550, score_twk=150, score_tiu=175, score_tkp=225,
            start_time=datetime.now(timezone.utc), end_time=datetime.now(timezone.utc)))
    await db_session.commit()
    response = await client.get(f'/api/v1/exam/ranking/{package.id}?revision_id={old_revision}')
    assert response.status_code == 200, response.text
    assert response.json()['rows'] == [{'rank':1,'name':'Kamu','score':5,'twk':5,'tiu':0,'tkp':0}]
    assert test_user.email not in response.text and admin_user.email not in response.text


async def test_admin_preview_is_immutable_and_excluded_from_participant_stats(client, admin_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    response = await client.post(f'/api/v1/admin/packages/{package.id}/quick-preview')
    assert response.status_code == 200, response.text
    session = await db_session.get(ExamSession, uuid.UUID(response.json()['session_id']))
    assert session.is_preview and session.revision_id
    assert (await client.get('/api/v1/exam/sessions/me/stats')).json()['total_sessions'] == 0
    assert (await client.get(f'/api/v1/exam/ranking/{package.id}?revision_id={session.revision_id}')).json()['rows'] == []


async def test_catalog_filters_progress_before_pagination(client, test_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    data = await start(client, package)
    await client.post(f"/api/v1/exam/finish/{data['session_id']}")
    attempt = await owned_session(db_session, uuid.UUID(data['session_id']), test_user.id, lock=True)
    await score(db_session, attempt)
    db_session.add(Package(title='A fresh package', description='Synthetic', category='SKD', is_published=True))
    await db_session.commit()
    finished = await client.get('/api/v1/packages?progress=finished&limit=1')
    fresh = await client.get('/api/v1/packages?progress=unattempted&limit=1')
    assert finished.status_code == fresh.status_code == 200
    assert finished.json()[0]['id'] == str(package.id)
    assert fresh.json()[0]['title'] == 'A fresh package'

async def test_scheduled_packages_are_discoverable_with_honest_access_reasons(client, test_user, test_package_with_questions, db_session):
    package = test_package_with_questions
    package.is_weekly = True
    package.start_at = datetime.now(timezone.utc) + timedelta(days=1)
    package.end_at = datetime.now(timezone.utc) + timedelta(days=2)
    await db_session.commit()
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    catalog = await client.get('/api/v1/packages')
    assert catalog.json()[0]['id'] == str(package.id)
    assert catalog.json()[0]['access_reason'] == 'upcoming'
    assert (await client.get(f'/api/v1/packages/{package.id}/access')).json()['has_access'] is False
    assert (await client.post(f'/api/v1/exam/start/{package.id}')).status_code == 403
    package.start_at = datetime.now(timezone.utc) - timedelta(days=1)
    await db_session.commit()
    data = await start(client, package)
    await client.post(f"/api/v1/exam/finish/{data['session_id']}")
    attempt = await owned_session(db_session, uuid.UUID(data['session_id']), test_user.id, lock=True)
    await score(db_session, attempt)
    access = (await client.get(f'/api/v1/packages/{package.id}/access')).json()
    assert access['reason'] == 'already_completed' and access['has_access'] is False
    assert (await client.post(f'/api/v1/exam/start/{package.id}')).status_code == 403

async def test_old_cached_client_cannot_create_or_drive_modern_attempt(client, test_user, test_package_with_questions):
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    old = await client.post(f'/api/v1/exam/start/{test_package_with_questions.id}', headers={'X-Exam-Protocol':'1'})
    assert old.status_code == 409 and old.json()['detail']['code'] == 'update_required'
    assert (await client.get('/api/v1/exam/sessions/me')).json() == []
    data = await start(client, test_package_with_questions)
    old_resume = await client.post(f'/api/v1/exam/start/{test_package_with_questions.id}', headers={'X-Exam-Protocol':'1'})
    assert old_resume.status_code == 409
    assert old_resume.json()['detail']['code'] == 'update_required'
    assert (await client.get(f"/api/v1/exam/session/{data['session_id']}/state")).status_code == 200
