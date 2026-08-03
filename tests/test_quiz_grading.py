"""Unit tests for Slice A quiz grading (no database)."""
from __future__ import annotations

from app.quiz_content import MAX_SCORE, grade_answers


def test_perfect_score():
    score, detail = grade_answers({"q1": "0", "q2": "2", "q3": "1"})
    assert score == MAX_SCORE == 3
    assert all(detail[qid]["correct"] is True for qid in ("q1", "q2", "q3"))


def test_zero_score():
    score, detail = grade_answers({"q1": "1", "q2": "0", "q3": "0"})
    assert score == 0
    assert all(detail[qid]["correct"] is False for qid in ("q1", "q2", "q3"))


def test_partial_score():
    score, _ = grade_answers({"q1": "0", "q2": "0", "q3": "1"})
    assert score == 2
