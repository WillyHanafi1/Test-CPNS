"""
Exam Lifecycle Tests — start, autosave, finish, result polling.
"""

import pytest
import uuid
from httpx import AsyncClient
from tests.conftest import login_and_get_cookies


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
        assert len(questions) == 3
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
