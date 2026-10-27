"""Six question types + autograde (no database)."""
from __future__ import annotations

from app.modules.quiz.service import (
    QUESTION_TYPES,
    TYPED_QUESTIONS,
    Question,
    grade_answers,
    passed_attempt,
    public_question_dict,
)


def test_six_question_types_are_defined():
    assert QUESTION_TYPES == (
        "single",
        "true_false",
        "short",
        "multi",
        "numeric",
        "essay",
    )
    kinds = {q.qtype for q in TYPED_QUESTIONS}
    assert kinds == {"true_false", "short", "multi", "numeric", "essay"}


def test_autograde_true_false_short_multi_numeric_essay():
    bank = TYPED_QUESTIONS
    score, detail = grade_answers(
        {
            "q4": "0",
            "q5": "ags",
            "q6": "0,2",
            "q7": "60",
            "q8": "Moodle holds the official grade so the LMS stays source of record.",
        },
        bank,
    )
    assert score == 5
    assert all(detail[qid]["correct"] is True for qid in ("q4", "q5", "q6", "q7", "q8"))


def test_autograde_rejects_wrong_typed_answers():
    score, detail = grade_answers(
        {"q4": "1", "q5": "lti", "q6": "0", "q7": "50", "q8": "no"},
        TYPED_QUESTIONS,
    )
    assert score == 0
    assert all(detail[qid]["correct"] is False for qid in ("q4", "q5", "q6", "q7", "q8"))


def test_public_question_hides_short_answer():
    q = Question(
        id="s1",
        prompt="Secret?",
        choices=("hidden",),
        correct_index=0,
        qtype="short",
        correct_text="hidden",
    )
    pub = public_question_dict(q)
    assert pub["choices"] == []
    assert "correct_text" not in pub
    assert pub["qtype"] == "short"


def test_pass_threshold_sixty():
    assert passed_attempt(3, 5) is True
    assert passed_attempt(2, 5) is False
