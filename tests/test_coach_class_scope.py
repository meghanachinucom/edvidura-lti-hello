"""Class-scoped Study Coach guardrails."""
from __future__ import annotations

from app.modules.ai_tutor import curriculum_chunks_for_session, study_coach_answer


def test_study_coach_refuses_off_class_question():
    chunks = [
        {
            "title": "Variables",
            "body": "A variable stands for an unknown value in algebra.",
            "kind": "lesson",
            "lesson_id": "l1",
            "course_id": "c1",
        }
    ]
    result = study_coach_answer(
        question="Who won the cricket world cup?",
        curriculum_chunks=chunks,
        course_title="Algebra I",
        class_name="Grade 9 Algebra",
    )
    assert result["grounded"] is False
    assert result.get("refusal_reason") == "off_class_materials"
    assert result.get("scope") == "class_lessons"
    assert "class" in result["answer"].lower() or "lessons" in result["answer"].lower()


def test_study_coach_answers_from_class_lesson():
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
    )
    assert result["grounded"] is True
    assert result["citations"]
    assert "Variables" in result["citations"]
    assert "##" not in result["answer"]
    assert "simple" in result["answer"].lower() or "variable" in result["answer"].lower()
    assert result.get("scope") == "class_lessons"
    assert not result.get("note")


def test_study_coach_no_class_materials():
    result = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=[],
        course_title="Algebra I",
        class_name="Grade 9 Algebra",
    )
    assert result["grounded"] is False
    assert result.get("refusal_reason") == "no_class_materials"


def test_study_coach_drops_invented_citations():
    chunks = [
        {
            "title": "Variables",
            "body": "A variable stands for an unknown value.",
            "kind": "lesson",
            "lesson_id": "l1",
            "course_id": "c1",
        }
    ]
    # Local path should only cite real titles; enforce helper via grounded+empty cites
    from app.modules.ai_tutor.service import _enforce_class_citations

    enforced = _enforce_class_citations(
        chunks=chunks,
        answer="Something clever about cricket.",
        citations=["Wikipedia", "Other course"],
        grounded=True,
        course_title="Algebra I",
        class_name="Grade 9 Algebra",
    )
    assert enforced["grounded"] is False
    assert enforced["refusal_reason"] == "off_class_materials"
    assert enforced["citations"] == []


def test_curriculum_chunks_require_course_id():
    title, chunks = curriculum_chunks_for_session(
        "tenant-1",
        None,
        list_lessons_fn=lambda *_a, **_k: [
            {"id": "l1", "title": "X", "body_md": "enough text here for a lesson body"}
        ],
        get_bound_course_fn=lambda *_a, **_k: {"id": "c1", "title": "Algebra"},
    )
    assert title == ""
    assert chunks == []


def test_curriculum_chunks_only_that_course_lessons():
    def get_course(tid, cid):
        assert cid == "course-a"
        return {"id": "course-a", "title": "Algebra I"}

    def list_lessons(tid, cid):
        assert cid == "course-a"
        return [
            {
                "id": "l1",
                "title": "Variables",
                "lesson_type": "reading",
                "body_md": "A variable stands for an unknown value in algebra equations.",
            },
            {
                "id": "l2",
                "title": "Quiz",
                "lesson_type": "quiz",
                "body_md": "ignored quiz body that is long enough to skip",
            },
        ]

    title, chunks = curriculum_chunks_for_session(
        "tenant-1",
        "course-a",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        class_name="Alg 9",
    )
    assert title == "Algebra I"
    assert len(chunks) == 1
    assert chunks[0]["title"] == "Variables"
    assert chunks[0]["course_id"] == "course-a"
    assert chunks[0]["kind"] == "lesson"
