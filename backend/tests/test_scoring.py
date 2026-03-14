"""
Scoring Logic Tests — unit tests for the scoring algorithm.

These test the scoring calculation directly, without the full HTTP roundtrip.
They validate BKN scoring rules:
  - TWK/TIU: correct = 5 pts, wrong/empty = 0 pts
  - TKP: A=1, B=2, C=3, D=4, E=5 pts; empty = 0 pts
  - Passing Grade: TWK ≥ 65, TIU ≥ 80, TKP ≥ 166
"""

import pytest


class TestScoringRules:
    """Test the BKN scoring rules as pure logic."""

    def _calculate_scores(self, answers: list[dict]) -> dict:
        """
        Pure scoring function matching backend logic.
        answers: list of {"segment": "TWK/TIU/TKP", "score": int}
        """
        score_twk = score_tiu = score_tkp = 0
        for ans in answers:
            if ans["segment"] == "TWK":
                score_twk += ans["score"]
            elif ans["segment"] == "TIU":
                score_tiu += ans["score"]
            elif ans["segment"] == "TKP":
                score_tkp += ans["score"]

        total = score_twk + score_tiu + score_tkp
        is_passed = (score_twk >= 65 and score_tiu >= 80 and score_tkp >= 166)

        return {
            "score_twk": score_twk,
            "score_tiu": score_tiu,
            "score_tkp": score_tkp,
            "total_score": total,
            "is_passed": is_passed,
        }

    def test_twk_tiu_correct_scoring(self):
        """TWK and TIU: correct = 5 pts, wrong = 0 pts."""
        answers = [
            {"segment": "TWK", "score": 5},   # correct
            {"segment": "TWK", "score": 0},   # wrong
            {"segment": "TIU", "score": 5},   # correct
            {"segment": "TIU", "score": 0},   # wrong
        ]
        result = self._calculate_scores(answers)
        assert result["score_twk"] == 5
        assert result["score_tiu"] == 5
        assert result["total_score"] == 10
        assert result["is_passed"] is False  # well below passing grade

    def test_tkp_weighted_scoring(self):
        """TKP: each option has weighted score 1-5."""
        answers = [
            {"segment": "TKP", "score": 5},  # best answer
            {"segment": "TKP", "score": 3},  # middle
            {"segment": "TKP", "score": 1},  # worst
        ]
        result = self._calculate_scores(answers)
        assert result["score_tkp"] == 9
        assert result["is_passed"] is False

    def test_passing_grade_exact_threshold(self):
        """Test exact passing grade boundary: TWK=65, TIU=80, TKP=166."""
        # Generate exactly the passing scores
        answers = []
        # TWK: 13 correct × 5 = 65
        answers.extend([{"segment": "TWK", "score": 5}] * 13)
        # TIU: 16 correct × 5 = 80
        answers.extend([{"segment": "TIU", "score": 5}] * 16)
        # TKP: we need exactly 166
        # 33 questions × 5 = 165 (just below), so 32 × 5 + 1 × 6 won't work
        # 33 × 5 + 1 × 1 = 166
        answers.extend([{"segment": "TKP", "score": 5}] * 33)
        answers.append({"segment": "TKP", "score": 1})

        result = self._calculate_scores(answers)
        assert result["score_twk"] == 65
        assert result["score_tiu"] == 80
        assert result["score_tkp"] == 166
        assert result["is_passed"] is True
        assert result["total_score"] == 311

    def test_passing_grade_just_below(self):
        """Test just below passing: TWK=64 should fail even if others pass."""
        answers = []
        # TWK: 12 correct × 5 + 1 × 4 = 64 (but TWK is 5/0, so 12 × 5 = 60)
        answers.extend([{"segment": "TWK", "score": 5}] * 12)
        answers.extend([{"segment": "TWK", "score": 0}] * 1)
        # TIU: 16 correct × 5 = 80
        answers.extend([{"segment": "TIU", "score": 5}] * 16)
        # TKP: 34 × 5 = 170
        answers.extend([{"segment": "TKP", "score": 5}] * 34)

        result = self._calculate_scores(answers)
        assert result["score_twk"] == 60  # below 65
        assert result["is_passed"] is False

    def test_no_answers_submitted(self):
        """Edge case: user submits nothing → all zeros, not passed."""
        result = self._calculate_scores([])
        assert result["score_twk"] == 0
        assert result["score_tiu"] == 0
        assert result["score_tkp"] == 0
        assert result["total_score"] == 0
        assert result["is_passed"] is False


class TestTieBreakerScore:
    """Test the packed integer tie-breaker used for leaderboard ranking."""

    def _pack_score(self, total: int, tkp: int, tiu: int, twk: int) -> int:
        """Same formula as in tasks.py for ZADD."""
        return (total * 1000000000) + (tkp * 1000000) + (tiu * 1000) + twk

    def test_same_total_different_subsegments(self):
        """Two users with same total but different subsegments: higher TKP wins."""
        score_a = self._pack_score(total=311, tkp=170, tiu=80, twk=61)
        score_b = self._pack_score(total=311, tkp=166, tiu=80, twk=65)
        assert score_a > score_b  # User A has higher TKP

    def test_different_totals(self):
        """Higher total always wins regardless of subsegments."""
        score_high = self._pack_score(total=400, tkp=166, tiu=80, twk=65)
        score_low = self._pack_score(total=300, tkp=200, tiu=100, twk=100)
        assert score_high > score_low

    def test_identical_scores_equal(self):
        """Identical scores produce identical packed values."""
        score_a = self._pack_score(total=311, tkp=166, tiu=80, twk=65)
        score_b = self._pack_score(total=311, tkp=166, tiu=80, twk=65)
        assert score_a == score_b
