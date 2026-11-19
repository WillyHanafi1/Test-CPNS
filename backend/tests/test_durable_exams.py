"""Exercise durable state transitions and failures, not just presentation logic."""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from backend.tests.conftest import login_and_get_cookies, mock_redis
from backend.models.models import ExamSession, ExamResponse, ExamJob, PackageRevision, QuestionOption, UserTransaction
from backend.services.exams import score, owned_session


async def start(client, package):
    await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
    response = await client.post(f"/api/v1/exam/start/{package.id}?writer_id=tab-a")
    assert response.status_code == 200, response.text
    return response.json()


def mutation(data, question=0, option=0, **changes):
    q = data["package"]["questions"][question]
    return {"question_id": q["id"], "option_id": q["options"][option]["id"],
            "mutation_id": str(uuid.uuid4()), "expected_revision": 0,
            "writer_epoch": 1, "writer_id": "tab-a", **changes}


def submission(data, mode="manual"):
    return {"mode": mode, "writer_id": data["writer_id"], "writer_epoch": data["writer_epoch"]}


async def test_committed_response_survives_cache_loss_and_snapshot_edit(client, test_user, test_package_with_questions, db_session):
    data = await start(client, test_package_with_questions)
    sid = data["session_id"]
    body = mutation(data)
    response = await client.post(f"/api/v1/exam/autosave/{sid}", json=body)
    assert response.status_code == 200
    assert response.json()["revision"] == 1
    mock_redis.clear()  # No Redis answer cache survives.
    row = await db_session.scalar(select(ExamResponse).where(ExamResponse.session_id == uuid.UUID(sid)))
    assert row.option_id == uuid.UUID(body["option_id"])
    option = await db_session.get(QuestionOption, row.option_id)
    option.score = 0  # Editing draft content must not rewrite the attempt.
    await db_session.commit()
    assert (await client.post(f"/api/v1/exam/finish/{sid}", json=submission(data))).status_code == 200
    attempt = await owned_session(db_session, uuid.UUID(sid), test_user.id, lock=True)
    await score(db_session, attempt)
    result = (await client.get(f"/api/v1/exam/result/{sid}")).json()
    assert result["score_twk"] == 5
    review = (await client.get(f"/api/v1/exam/session/{sid}/review")).json()
    assert review["questions"][0]["options"][0]["score"] == 5
    assert review["questions"][0]["selected_option_id"] == body["option_id"]
    await score(db_session, attempt)  # Repeated task has no second effect.
    assert attempt.total_score == 5


async def test_retry_and_stale_revision_do_not_overwrite_new_choice(client, test_user, test_package_with_questions):
    data = await start(client, test_package_with_questions); sid = data["session_id"]
    first = mutation(data)
    a = await client.post(f"/api/v1/exam/autosave/{sid}", json=first)
    replay = await client.post(f"/api/v1/exam/autosave/{sid}", json=first)
    assert a.json()["revision"] == replay.json()["revision"] == 1
    second = mutation(data, option=1, expected_revision=1)
    assert (await client.post(f"/api/v1/exam/autosave/{sid}", json=second)).status_code == 200
    stale = await client.post(f"/api/v1/exam/autosave/{sid}", json=first)
    assert stale.status_code == 409
    state = (await client.get(f"/api/v1/exam/session/{sid}/state")).json()
    assert state["answers"][first["question_id"]] == second["option_id"]


async def test_cross_question_option_rejected(client, test_user, test_package_with_questions):
    data = await start(client, test_package_with_questions)
    body = mutation(data, option_id=data["package"]["questions"][1]["options"][0]["id"])
    response = await client.post(f"/api/v1/exam/autosave/{data['session_id']}", json=body)
    assert response.status_code == 400


async def test_claim_invalidates_previous_writer(client, test_user, test_package_with_questions):
    data = await start(client, test_package_with_questions); sid = data["session_id"]
    claim = await client.post(f"/api/v1/exam/session/{sid}/claim", json={"writer_id": "tab-b"})
    assert claim.status_code == 200
    assert claim.json()["writer_epoch"] == 2
    assert (await client.post(f"/api/v1/exam/autosave/{sid}", json=mutation(data))).status_code == 409
    assert (await client.post(f"/api/v1/exam/finish/{sid}")).status_code == 409
    stale = await client.post(f"/api/v1/exam/finish/{sid}", json=submission(data))
    assert stale.status_code == 409 and stale.json()["detail"]["code"] == "writer_conflict"
    assert (await client.post(f"/api/v1/exam/autosave/{sid}", json=mutation(data, writer_id="tab-b", writer_epoch=2))).status_code == 200
    assert (await client.post(f"/api/v1/exam/finish/{sid}", json=submission(claim.json()))).status_code == 200


async def test_submit_is_durable_and_late_answers_are_rejected(client, test_user, test_package_with_questions, db_session):
    data = await start(client, test_package_with_questions); sid = data["session_id"]
    for _ in range(2):
        assert (await client.post(f"/api/v1/exam/finish/{sid}", json=submission(data))).status_code == 200
    jobs = (await db_session.scalars(select(ExamJob))).all()
    assert len(jobs) == 1 and jobs[0].status == "pending"
    assert (await client.post(f"/api/v1/exam/autosave/{sid}", json=mutation(data))).status_code == 403


async def test_full_skd_submission_respects_deadline_and_scores_all_110_answers(
    client, test_user, test_package_with_questions, db_session,
):
    data = await start(client, test_package_with_questions)
    sid = data["session_id"]
    session = await db_session.get(ExamSession, uuid.UUID(sid))
    revision = await db_session.get(PackageRevision, session.revision_id)
    early = await client.post(f"/api/v1/exam/finish/{sid}", json=submission(data, "deadline"))
    assert early.status_code == 409 and early.json()["detail"]["code"] == "deadline_not_reached"
    assert not (await db_session.scalars(select(ExamJob))).all()
    expected = {}
    assert len(data["package"]["questions"]) == 110
    for index, question in enumerate(data["package"]["questions"]):
        best = max(revision.payload["questions"][index]["options"], key=lambda option: option["score"])
        option_index = next(i for i, option in enumerate(question["options"]) if option["id"] == best["id"])
        body = mutation(data, question=index, option=option_index)
        saved = await client.post(f"/api/v1/exam/autosave/{sid}", json=body)
        assert saved.status_code == 200 and saved.json()["revision"] == 1
        expected[question["id"]] = best["id"]
        if index == 54:
            replay = await client.post(f"/api/v1/exam/autosave/{sid}", json=body)
            assert replay.status_code == 200 and replay.json()["revision"] == 1
            resumed = (await client.get(f"/api/v1/exam/session/{sid}/state")).json()
            assert resumed["answers"] == expected and resumed["end_time"] == data["end_time"]
    session.end_time = datetime.now(timezone.utc) - timedelta(milliseconds=10)
    await db_session.commit()
    late = await client.post(f"/api/v1/exam/autosave/{sid}", json=mutation(data, option=1))
    assert late.status_code == 403
    for _ in range(2):
        accepted = await client.post(f"/api/v1/exam/finish/{sid}", json=submission(data, "deadline"))
        assert accepted.status_code == 200 and accepted.json()["status"] == "processing"
    assert len((await db_session.scalars(select(ExamJob))).all()) == 1
    processing = (await client.get(f"/api/v1/exam/result/{sid}?include_answers=true")).json()
    assert processing["answers"] == expected
    await db_session.refresh(session)
    await score(db_session, session)
    result = (await client.get(f"/api/v1/exam/result/{sid}")).json()
    assert "answers" not in result
    assert (result["score_twk"], result["score_tiu"], result["score_tkp"], result["total_score"]) == (150, 175, 225, 550)
    review = (await client.get(f"/api/v1/exam/session/{sid}/review")).json()
    assert {q["id"]: q["selected_option_id"] for q in review["questions"]} == expected


async def test_deadline_is_not_reset_on_resume(client, test_user, test_package_with_questions, db_session):
    data = await start(client, test_package_with_questions)
    session = await db_session.get(ExamSession, uuid.UUID(data["session_id"]))
    deadline = datetime.now(timezone.utc) + timedelta(minutes=20)
    session.end_time = deadline
    await db_session.commit()
    resumed = (await client.post(f"/api/v1/exam/start/{test_package_with_questions.id}")).json()
    remaining = datetime.fromisoformat(resumed["end_time"].replace("Z", "+00:00")) - datetime.fromisoformat(resumed["server_now"].replace("Z", "+00:00"))
    assert timedelta(minutes=19) < remaining < timedelta(minutes=21)
    session.end_time = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()
    assert (await client.post(f"/api/v1/exam/autosave/{session.id}", json=mutation(data))).status_code == 403


async def test_unpublished_and_incomplete_packages_cannot_start(client, test_user, test_package_with_questions, db_session):
    await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
    test_package_with_questions.is_published = False
    await db_session.commit()
    assert (await client.post(f"/api/v1/exam/start/{test_package_with_questions.id}")).status_code == 403
    assert (await client.get(f"/api/v1/packages/{test_package_with_questions.id}")).status_code == 404
    test_package_with_questions.is_published = True
    option = await db_session.scalar(select(QuestionOption).where(QuestionOption.score == 5).limit(1))
    option.score = 0
    await db_session.commit()
    assert (await client.post(f"/api/v1/exam/start/{test_package_with_questions.id}")).status_code == 409


async def test_ai_routes_retired_and_private_data_not_cached(client, test_user):
    await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
    assert (await client.post('/api/v1/chat/start')).status_code == 410
    assert (await client.get('/api/v1/user/me/mastery/digest')).status_code == 410
    assert (await client.post(f'/api/v1/exam/{uuid.uuid4()}/ai-generate')).status_code == 410
    response = await client.get('/api/v1/auth/me')
    assert response.headers['cache-control'] == 'private, no-store'
    assert response.headers['x-request-id']
    forbidden = await client.post('/api/v1/auth/logout', headers={'origin':'https://untrusted.invalid'})
    assert forbidden.status_code == 403


async def test_payment_replay_and_lifetime_grant(client, test_user, db_session):
    from backend.api.v1.endpoints.transactions_api import fulfill_transaction
    order = UserTransaction(user_id=test_user.id, order_id='test-order', amount=50000,
        duration_days=365, transaction_type='pro_upgrade', payment_status='pending')
    db_session.add(order); await db_session.commit()
    await fulfill_transaction(db_session, 'test-order', 'success')
    await db_session.refresh(test_user)
    expiry = test_user.pro_expires_at
    await fulfill_transaction(db_session, 'test-order', 'success')
    await db_session.refresh(test_user)
    assert test_user.pro_expires_at == expiry
    test_user.is_pro = True; test_user.pro_expires_at = None
    db_session.add(UserTransaction(user_id=test_user.id, order_id='lifetime', amount=50000,
        transaction_type='pro_upgrade', payment_status='pending'))
    await db_session.commit()
    await fulfill_transaction(db_session, 'lifetime', 'success')
    await db_session.refresh(test_user)
    assert test_user.pro_expires_at is None


async def test_concurrent_start_returns_one_session_on_postgres(client, test_user, test_package_with_questions, db_session):
    if db_session.bind.dialect.name != 'postgresql':
        pytest.skip('Row-lock concurrency must be tested against PostgreSQL')
    await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
    results = await asyncio.gather(*[client.post(f'/api/v1/exam/start/{test_package_with_questions.id}?writer_id=tab-a') for _ in range(4)])
    assert all(r.status_code == 200 for r in results), [r.text for r in results]
    assert len({r.json()['session_id'] for r in results}) == 1
