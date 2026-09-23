"""Quiz difficulty + end-to-end topic/page coverage."""
from __future__ import annotations

from app.modules.ai_assessment.service import (
    coverage_question_count,
    generate_mcqs_from_text,
    normalize_difficulty,
    segment_text_for_coverage,
)
from app.modules.quiz.personalized import generate_personalized_quiz


def test_normalize_difficulty():
    assert normalize_difficulty("easy") == "foundational"
    assert normalize_difficulty("hard") == "challenge"
    assert normalize_difficulty("core") == "core"
    assert normalize_difficulty(None) == "core"


def test_segment_headings_cover_later_sections():
    body = """
# Intro
Early material about variables and letters.

## Middle
Mid chapter on expressions and operations.

## Later pages
Late material students might miss if only early pages are quizzed.
Final section facts about solving equations appear here.
"""
    segs = segment_text_for_coverage(body, title="Algebra")
    labels = " ".join(s["label"].lower() for s in segs)
    assert len(segs) >= 2
    assert "later" in labels or "middle" in labels


def test_coverage_count_at_least_one_per_segment():
    assert coverage_question_count(3, 10) == 10
    assert coverage_question_count(12, 3) == 12


def test_generate_mcqs_covers_all_segments_local():
    # Force local path via short text + many segments
    segments = [
        {"label": f"Page {i}", "text": f"Fact number {i} about topic {i}. " * 8}
        for i in range(1, 6)
    ]
    result = generate_mcqs_from_text(
        "x" * 50,
        count=3,
        title="Book",
        difficulty="foundational",
        segments=segments,
    )
    assert result["difficulty"] == "foundational"
    assert result["covers_all_topics"] is True
    assert result["segment_count"] == 5
    # At least one question per page when count is raised to segment count
    assert len(result["questions"]) >= 5
    topics = {str(q.get("topic") or "") for q in result["questions"]}
    # Round-robin should include early and late pages
    assert any("Page 1" in t for t in topics)
    assert any("Page 5" in t or "Page 4" in t for t in topics)


def test_personalized_honors_teacher_difficulty():
    lessons = [
        {
            "id": "l1",
            "title": "Ch1",
            "lesson_type": "reading",
            "body_md": "Alpha facts about numbers and variables appear here. " * 5,
        },
        {
            "id": "l2",
            "title": "Ch2",
            "lesson_type": "reading",
            "body_md": "Omega facts about equations and graphs appear here. " * 5,
        },
    ]

    def get_course(_tid, cid):
        return {"id": cid, "title": "Course"}

    def list_lessons(_tid, _cid):
        return lessons

    out = generate_personalized_quiz(
        tenant_id="t-diff",
        subject="stu-1",
        course_id="c1",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        difficulty="challenge",
    )
    assert out["difficulty"] == "challenge"
    assert out["difficulty_source"] == "teacher"
    assert set(out["topics"]) == {"Ch1", "Ch2"}
    assert out["covers_all_topics"] is True
