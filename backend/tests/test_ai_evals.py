import pytest
import json
from typing import List, Dict

# Example evaluator for AI output structure
def validate_question_format(question_data: dict) -> bool:
    """
    Validates that the AI generated question has the correct format.
    """
    required_keys = ["number", "text", "options", "discussion"]
    if not all(key in question_data for key in required_keys):
        return False
        
    if not isinstance(question_data["options"], list) or len(question_data["options"]) != 5:
        return False
        
    for option in question_data["options"]:
        if "label" not in option or "text" not in option or "score" not in option:
            return False
            
    return True

def validate_tkp_scores(options: List[Dict]) -> bool:
    """
    Validates that TKP options have unique scores from 1 to 5.
    """
    scores = sorted([opt["score"] for opt in options])
    return scores == [1, 2, 3, 4, 5]

def validate_tiu_twk_scores(options: List[Dict]) -> bool:
    """
    Validates that TIU/TWK options have exactly one 5 and others 0.
    """
    scores = sorted([opt["score"] for opt in options])
    return scores == [0, 0, 0, 0, 5]

class TestAIEvals:
    @pytest.mark.parametrize("mock_ai_response", [
        {
            "number": 1,
            "text": "What is the capital of Indonesia?",
            "options": [
                {"label": "A", "text": "Jakarta", "score": 5},
                {"label": "B", "text": "Bandung", "score": 0},
                {"label": "C", "text": "Surabaya", "score": 0},
                {"label": "D", "text": "Medan", "score": 0},
                {"label": "E", "text": "Bali", "score": 0}
            ],
            "discussion": "Jakarta is the capital."
        }
    ])
    def test_tiu_twk_format_and_scores(self, mock_ai_response):
        """Test the format and scoring rules for TIU/TWK questions."""
        assert validate_question_format(mock_ai_response)
        assert validate_tiu_twk_scores(mock_ai_response["options"])

    @pytest.mark.parametrize("mock_ai_response", [
        {
            "number": 66,
            "text": "You see a colleague struggling with a task. What do you do?",
            "options": [
                {"label": "A", "text": "Help them immediately", "score": 5},
                {"label": "B", "text": "Finish my work first, then help", "score": 4},
                {"label": "C", "text": "Tell the manager", "score": 3},
                {"label": "D", "text": "Ignore them", "score": 1},
                {"label": "E", "text": "Ask someone else to help them", "score": 2}
            ],
            "discussion": "Helping them is the best action."
        }
    ])
    def test_tkp_format_and_scores(self, mock_ai_response):
        """Test the format and scoring rules for TKP questions."""
        assert validate_question_format(mock_ai_response)
        assert validate_tkp_scores(mock_ai_response["options"])

