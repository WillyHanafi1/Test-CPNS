from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.core.security import create_reset_token, create_access_token, verify_password
from backend.models.models import ExamSession, Package, Question
from backend.tests.conftest import login_and_get_cookies
import os
import asyncio
import uuid
import pytest
from datetime import timedelta


async def test_password_reset_revokes_sessions_and_all_older_reset_links(client, test_user, db_session):
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    old_cookie = client.cookies.get('access_token')
    first = create_reset_token(test_user.email, test_user.auth_version)
    second = create_reset_token(test_user.email, test_user.auth_version)
    response = await client.post('/api/v1/auth/reset-password', json={'token': first, 'new_password': 'NewPassword123'})
    assert response.status_code == 200, response.text
    for token in (first, second):
        response = await client.post('/api/v1/auth/reset-password', json={'token': token, 'new_password': 'OtherPassword123'})
        assert response.status_code == 400
    assert (await client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer ' + old_cookie})).status_code == 401
    client.cookies.clear()
    await login_and_get_cookies(client, test_user.email, 'NewPassword123')
    assert (await client.get('/api/v1/auth/me')).status_code == 200
    await db_session.refresh(test_user)
    assert test_user.auth_version == 1 and verify_password('NewPassword123', test_user.hashed_password)


async def test_access_token_cannot_be_used_as_reset_token(client, test_user):
    token = create_access_token({'sub': test_user.email})
    response = await client.post('/api/v1/auth/reset-password', json={'token': token, 'new_password': 'NewPassword123'})
    assert response.status_code == 400


async def test_reset_token_cannot_be_used_as_an_authenticated_session(client, test_user):
    token = create_reset_token(test_user.email, test_user.auth_version)
    assert (await client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer ' + token})).status_code == 401


@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL', '').startswith('postgresql'), reason='Database concurrency requires PostgreSQL')
async def test_simultaneous_password_resets_only_allow_one_commit(client, test_user, db_session):
    token = create_reset_token(test_user.email, test_user.auth_version)
    replies = await asyncio.gather(*(client.post('/api/v1/auth/reset-password',
        json={'token': token, 'new_password': password}) for password in ('FirstPassword123', 'SecondPassword123')))
    assert sorted(reply.status_code for reply in replies) == [200, 400]
    await db_session.refresh(test_user)
    assert test_user.auth_version == 1


async def test_legacy_leaderboard_requires_auth_and_uses_same_private_revision_ranking(client, test_user,
    test_package_with_questions, db_session):
    package = test_package_with_questions
    assert (await client.get(f'/api/v1/exam/leaderboard/{package.id}')).status_code == 401
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    from backend.services.exams import publish_revision
    package = await db_session.scalar(select(Package).where(Package.id == package.id)
        .options(selectinload(Package.questions).selectinload(Question.options)))
    await publish_revision(db_session, package)
    db_session.add(ExamSession(user_id=test_user.id, package_id=package.id, revision_id=package.published_revision_id,
        start_time=datetime.now(timezone.utc), end_time=datetime.now(timezone.utc), status='finished',
        total_score=5, score_twk=5, score_tiu=0, score_tkp=0))
    await db_session.commit()
    old = await client.get(f'/api/v1/exam/leaderboard/{package.id}')
    new = await client.get(f'/api/v1/exam/ranking/{package.id}')
    mine = await client.get(f'/api/v1/exam/my-rank/{package.id}')
    assert old.status_code == new.status_code == mine.status_code == 200
    assert old.json()[0]['name'] == 'Kamu'
    assert new.json()['current_user']['rank'] == mine.json()['rank'] == 1
    assert test_user.email not in old.text + new.text + mine.text
    assert str(test_user.id) not in old.text + new.text + mine.text


@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL', '').startswith('postgresql'), reason='Worker recovery requires a shared database')
async def test_scoring_recovery_keeps_acknowledged_answer_and_respects_retry_backoff(client, test_user,
    test_package_with_questions, db_session, monkeypatch):
    from backend.config import settings
    from backend.core import tasks
    from backend.models.models import ExamJob
    from backend.tests.test_durable_exams import start, mutation, submission
    monkeypatch.setattr(settings, 'DATABASE_URL', os.environ['TEST_DATABASE_URL'])
    state = await start(client, test_package_with_questions)
    sid = state['session_id']
    answer = mutation(state)
    assert (await client.post(f'/api/v1/exam/autosave/{sid}', json=answer)).status_code == 200
    assert (await client.post(f'/api/v1/exam/finish/{sid}', json=submission(state))).status_code == 200
    original = tasks.async_run_scoring
    calls = []
    async def flaky(*args):
        calls.append(args)
        if len(calls) == 1:
            raise OSError('synthetic worker interruption')
        return await original(*args)
    monkeypatch.setattr(tasks, 'async_run_scoring', flaky)
    await tasks.async_reconcile_jobs()
    job = await db_session.scalar(select(ExamJob))
    assert job.status == 'pending' and job.attempts == 1 and job.last_error == 'OSError'
    await tasks.async_reconcile_jobs()
    assert len(calls) == 1  # No immediate repeated work during the backoff window.
    job.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()
    await tasks.async_reconcile_jobs()
    await db_session.refresh(job)
    assert job.status == 'completed' and job.last_error is None
    result = (await client.get(f'/api/v1/exam/result/{sid}')).json()
    assert result['score_twk'] == 5
    await tasks.async_reconcile_jobs()
    assert len(calls) == 2


@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL', '').startswith('postgresql'), reason='Worker requires a shared database')
async def test_scheduler_finishes_an_abandoned_exam_at_its_deadline(
    client, test_user, test_package_with_questions, db_session, monkeypatch,
):
    from backend.config import settings
    from backend.core import tasks
    from backend.models.models import ExamJob, ExamSession
    from backend.tests.test_durable_exams import start, mutation

    monkeypatch.setattr(settings, 'DATABASE_URL', os.environ['TEST_DATABASE_URL'])
    state = await start(client, test_package_with_questions)
    sid = uuid.UUID(state['session_id'])
    body = mutation(state)
    assert (await client.post(f'/api/v1/exam/autosave/{sid}', json=body)).status_code == 200
    await tasks.async_reconcile_jobs()
    assert await db_session.scalar(select(ExamJob.id)) is None

    attempt = await db_session.get(ExamSession, sid)
    attempt.end_time = datetime.now(timezone.utc) - timedelta(milliseconds=10)
    await db_session.commit()
    await tasks.async_reconcile_jobs()
    result = (await client.get(f'/api/v1/exam/result/{sid}?include_answers=true')).json()
    assert result['status'] == 'finished' and result['total_score'] == 5
    assert result['answers'] == {body['question_id']: body['option_id']}
    job = await db_session.scalar(select(ExamJob))
    assert job.status == 'completed'
