from backend.config import settings
from backend.core.tasks import async_repair_question_bias, generate_ai_analysis_task


async def test_admin_ai_disabled_without_provider_call(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_AI_ENABLED", False)
    assert await async_repair_question_bias("unused") == {"status": "disabled"}


def test_queued_participant_ai_job_is_retired():
    assert generate_ai_analysis_task.run("old-session", {}) == {"status": "retired"}
