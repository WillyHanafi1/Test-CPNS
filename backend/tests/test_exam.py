"""
Exam Lifecycle Tests — start, autosave, finish, result polling.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from backend.models.models import ExamSession, Question
from backend.tests.conftest import login_and_get_cookies


class TestStartExam:
    async def test_start_exam_success(self, client: AsyncClient, test_user, test_package_with_questions):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        resp = await client.post(
            f"/api/v1/exam/start/{test_package_with_questions.id}",
            cookies=cookies,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert "package" in data
        questions = data["package"]["questions"]
        assert len(questions) == 110
        # Verify no score is exposed in public questions
        for q in questions:
            for opt in q["options"]:
                assert "score" not in opt, "Score should NOT be exposed in public API"

    async def test_start_exam_unauthenticated(self, client: AsyncClient, test_package_with_questions):
        resp = await client.post(f"/api/v1/exam/start/{test_package_with_questions.id}")
        assert resp.status_code == 401

    async def test_start_exam_nonexistent_package(self, client: AsyncClient, test_user):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        fake_id = uuid.uuid4()
        resp = await client.post(f"/api/v1/exam/start/{fake_id}", cookies=cookies)
        assert resp.status_code == 404


class TestAutosave:
    async def test_autosave_answer(self, client: AsyncClient, test_user, test_package_with_questions):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        # Start exam first
        start_resp = await client.post(
            f"/api/v1/exam/start/{test_package_with_questions.id}",
            cookies=cookies,
        )
        data = start_resp.json()
        session_id = data["session_id"]
        questions = data["package"]["questions"]
        question_id = questions[0]["id"]
        option_id = questions[0]["options"][0]["id"]

        # Autosave
        save_resp = await client.post(
            f"/api/v1/exam/autosave/{session_id}",
            json={"question_id": question_id, "option_id": option_id},
            cookies=cookies,
        )
        assert save_resp.status_code == 200
        assert save_resp.json()["status"] == "saved"

    async def test_legacy_autosave_validates_option_belongs_to_question(
        self, client: AsyncClient, test_user, test_package_with_questions, db_session
    ):
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import select
        from backend.models.models import ExamSession, Question

        questions = (
            await db_session.scalars(
                select(Question).where(Question.package_id == test_package_with_questions.id).limit(2)
            )
        ).all()
        assert len(questions) == 2
        session = ExamSession(
            user_id=test_user.id,
            package_id=test_package_with_questions.id,
            status="ongoing",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(minutes=60),
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        resp = await client.post(
            f"/api/v1/exam/autosave/{session.id}",
            json={"question_id": str(questions[0].id), "option_id": str(uuid.uuid4())},
            cookies=cookies,
        )
        assert resp.status_code == 400
        assert "Pilihan tidak sesuai" in resp.json()["detail"]


class TestFinishExam:
    async def test_finish_exam_returns_result(self, client: AsyncClient, test_user, test_package_with_questions):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        # Start exam
        start_resp = await client.post(
            f"/api/v1/exam/start/{test_package_with_questions.id}",
            cookies=cookies,
        )
        session_id = start_resp.json()["session_id"]

        # Finish exam (no answers saved → scores should be 0)
        finish_resp = await client.post(
            f"/api/v1/exam/finish/{session_id}",
            cookies=cookies,
        )
        assert finish_resp.status_code == 200
        data = finish_resp.json()
        assert "status" in data

    async def test_finish_nonexistent_session(self, client: AsyncClient, test_user):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        fake_id = uuid.uuid4()
        resp = await client.post(f"/api/v1/exam/finish/{fake_id}", cookies=cookies)
        assert resp.status_code == 404


class TestExamResult:
    async def test_get_result_for_finished_exam(self, client: AsyncClient, test_user, test_package_with_questions):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        # Start and finish exam
        start_resp = await client.post(
            f"/api/v1/exam/start/{test_package_with_questions.id}",
            cookies=cookies,
        )
        session_id = start_resp.json()["session_id"]
        await client.post(f"/api/v1/exam/finish/{session_id}", cookies=cookies)

        # Poll result
        result_resp = await client.get(f"/api/v1/exam/result/{session_id}", cookies=cookies)
        assert result_resp.status_code == 200
        assert result_resp.json()["can_repeat"] is False

    @pytest.mark.parametrize(
        "condition,expected",
        [("ready", True), ("weekly", False), ("pro_required", False), ("incomplete", False)],
    )
    async def test_repeat_available_for_ready_mandiri_result(
        self, client, test_user, test_package_with_questions, db_session, condition, expected
    ):
        package = test_package_with_questions
        package.is_weekly = condition == "weekly"
        package.is_premium = condition == "pro_required"
        if condition == "incomplete":
            await db_session.execute(
                update(Question).where(Question.package_id == package.id).values(discussion="")
            )
        session = ExamSession(user_id=test_user.id, package_id=package.id, status="finished")
        db_session.add(session)
        await db_session.commit()
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")

        response = await client.get(f"/api/v1/exam/result/{session.id}", cookies=cookies)

        assert response.status_code == 200
        assert response.json()["can_repeat"] is expected
