import pytest
from unittest.mock import MagicMock
from backend.core.ai_service import AIService

@pytest.mark.asyncio
async def test_generate_analysis_exception_fallback():
    """
    Test that an exception during AI generation correctly falls back to
    the predefined error response structure.
    """
    service = AIService()

    # Mock the model so it doesn't return early due to missing API key
    service.model = MagicMock()
    # Force generate_content to raise an exception
    service.model.generate_content.side_effect = Exception("Simulated API Error")

    # Dummy stats required by generate_analysis
    stats = {
        "score_twk": 65,
        "score_tiu": 80,
        "score_tkp": 166,
        "is_passed": True,
        "sub_categories": {}
    }

    result = await service.generate_analysis(stats)

    # Verify the fallback response structure is returned
    expected_fallback = {
        "summary": "Terjadi kesalahan saat memproses analisis AI.",
        "weaknesses": ["Gagal mengambil data kelemahan"],
        "action_plan": ["Silakan coba lagi beberapa saat lagi"],
        "motivation": "Jangan menyerah karena kendala teknis!"
    }

    assert result == expected_fallback
    service.model.generate_content.assert_called_once()
