"""Per-student personalized AI quiz generation."""
from __future__ import annotations

from app.modules.quiz.personalized import (
    generate_personalized_quiz,
    infer_difficulty,
    questions_from_payload,
)


def test_infer_difficulty_bands():
    assert infer_difficulty(score_ratio=None, attempts=0) == "core"
    assert infer_difficulty(score_ratio=0.2, attempts=2) == "foundational"
    assert infer_difficulty(score_ratio=0.6, attempts=2) == "core"
    assert infer_difficulty(score_ratio=0.9, attempts=2) == "challenge"


def test_personalized_quiz_unique_per_student():
    lessons = [
        {
            "id": "l1",
            "title": "Variables",
            "lesson_type": "reading",
            "body_md": (
                "A variable is a letter that stands for an unknown number. "
                "Expressions combine numbers and variables. "
                "Solving for x finds the value that makes an equation true."
            ),
        },
        {
            "id": "l2",
            "title": "Expressions",
            "lesson_type": "reading",
            "body_md": (
                "An expression has numbers, variables, and operations. "
                "It does not use an equals sign. "
                "Simplify expressions before solving equations."
            ),
        },
    ]

    def get_course(_tid, cid):
        return {"id": cid, "title": "Algebra I"}

    def list_lessons(_tid, _cid):
        return lessons

    a = generate_personalized_quiz(
        tenant_id="t1",
        subject="student-a",
        course_id="course-a",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        count=3,
        learner_name="Ada",
    )
    b = generate_personalized_quiz(
        tenant_id="t1",
        subject="student-b",
        course_id="course-a",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        count=3,
        learner_name="Bea",
    )
    assert a["mode"] == "personalized_ai"
    assert a["difficulty"] in {"foundational", "core", "challenge"}
    assert len(a["questions"]) >= 2
    assert a["topics"]
    # Different students get different question id sets (seeded).
    assert {q.id for q in a["questions"]} != {q.id for q in b["questions"]}
    restored = questions_from_payload(a["question_payload"])
    assert len(restored) == len(a["questions"])
    assert restored[0].prompt == a["questions"][0].prompt


def test_personalized_quiz_requires_lessons():
    try:
        generate_personalized_quiz(
            tenant_id="t1",
            subject="s1",
            course_id="c1",
            list_lessons_fn=lambda *_a, **_k: [],
            get_bound_course_fn=lambda *_a, **_k: {"id": "c1", "title": "Empty"},
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "chapter" in str(exc).lower() or "lesson" in str(exc).lower()
