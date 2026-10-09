"""Ask Vidura cognitive strategies (human-like teaching moves)."""
from __future__ import annotations

from app.modules.ai_tutor import (
    pick_coach_strategy,
    strategy_label,
    study_coach_answer,
)
from app.modules.ai_tutor.cognitive import local_check_question
from app.modules.xapi import build_coach_interacted_statement


def test_pick_strategy_socratic_when_struggling_on_why():
    strategy = pick_coach_strategy(
        question="Why do we use variables?",
        learner_context={
            "difficulty": "foundational",
            "difficulty_label": "Easy",
            "avg_score_ratio": 0.4,
            "weak_skills": [{"label": "Algebra basics"}],
        },
    )
    assert strategy == "socratic"
    assert "Guiding" in strategy_label(strategy)


def test_pick_strategy_practice_handoff_from_question():
    assert (
        pick_coach_strategy(
            question="Can you give me a practice quiz on this?",
            learner_context={},
        )
        == "practice_handoff"
    )


def test_pick_strategy_explain_for_definition_when_strong():
    strategy = pick_coach_strategy(
        question="What is a variable?",
        learner_context={
            "difficulty": "challenge",
            "difficulty_label": "Hard",
            "avg_score_ratio": 0.9,
            "weak_skills": [],
        },
    )
    assert strategy == "explain"


def test_study_coach_returns_strategy_and_check_question():
    chunks = [
        {
            "title": "Variables",
            "body": "## Algebra\nA variable stands for an unknown value. Use letters like x.",
            "kind": "lesson",
            "lesson_id": "l1",
            "course_id": "c1",
        }
    ]
    result = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=chunks,
        course_title="Algebra I",
        class_name="Grade 9 Algebra",
        learner_context={
            "difficulty": "foundational",
            "difficulty_label": "Easy",
            "avg_score_ratio": 0.45,
            "weak_skills": [{"code": "alg", "label": "Variables"}],
            "attempts": 2,
        },
    )
    assert result["grounded"] is True
    assert result["strategy"] in {
        "socratic",
        "hint",
        "explain",
        "practice_handoff",
    }
    assert result.get("strategy_label")
    assert result.get("check_question")
    assert result.get("learner_difficulty_label") == "Easy"
    assert result.get("weak_skills")


def test_local_check_question_by_strategy():
    q = local_check_question(
        strategy="practice_handoff", lesson_title="Variables", question="x"
    )
    assert "practice" in q.lower()


def test_coach_xapi_includes_strategy_extension():
    stmt = build_coach_interacted_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Alice",
        question="What is a variable?",
        grounded=True,
        strategy="socratic",
        check_question="What do you already know about variables?",
    )
    ext = stmt["context"]["extensions"]
    assert (
        ext["https://edvidura.local/xapi/extensions/coach_strategy"] == "socratic"
    )
    assert "check_question_preview" in str(ext.keys()) or (
        "https://edvidura.local/xapi/extensions/check_question_preview" in ext
    )
