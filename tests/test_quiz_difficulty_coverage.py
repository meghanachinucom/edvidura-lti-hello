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
    # Never drop below segment count even when requested is tiny
    assert coverage_question_count(2, 25) == 25
    # Extras allowed up to cap, but floor stays at segment count
    assert coverage_question_count(100, 5, cap=40) == 40


def test_expand_long_lesson_into_page_units():
    from app.modules.quiz.personalized import expand_topics_to_coverage_units

    body = "\n\n".join(
        f"## Page {i}\nUnique facts about topic number {i} appear here with enough text. "
        * 4
        for i in range(1, 8)
    )
    units = expand_topics_to_coverage_units(
        [{"title": "Algebra Book", "body": body}]
    )
    assert len(units) >= 5
    labels = " ".join(u["title"].lower() for u in units)
    assert "page 1" in labels or "algebra" in labels
    assert "page 6" in labels or "page 7" in labels or len(units) >= 6


def test_personalized_covers_every_page_unit():
    lessons = [
        {
            "id": "l1",
            "title": "Ch1 Early",
            "lesson_type": "reading",
            "body_md": (
                "## Start\nEarly page facts about numbers and variables appear here. " * 6
                + "\n## Middle\nMiddle page facts about expressions appear here. " * 6
                + "\n## End\nLate page facts about graphs appear here. " * 6
            ),
        },
        {
            "id": "l2",
            "title": "Ch2 Late",
            "lesson_type": "reading",
            "body_md": "Omega facts about equations and graphs appear here. " * 8,
        },
    ]

    def get_course(_tid, cid):
        return {"id": cid, "title": "Course"}

    def list_lessons(_tid, _cid):
        return lessons

    out = generate_personalized_quiz(
        tenant_id="t-pages",
        subject="stu-fair",
        course_id="c1",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        difficulty="core",
    )
    assert out["covers_all_pages"] is True
    assert out["coverage_unit_count"] >= 3
    assert len(out["questions"]) >= out["coverage_unit_count"]
    # Late chapter must be represented
    blob = " ".join(q.prompt + " " + (q.topic or "") for q in out["questions"]).lower()
    assert "ch2" in blob or "late" in blob or "omega" in blob


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


def test_normalize_and_label_complexity():
    from app.modules.quiz.personalized import (
        complexity_label,
        infer_complexity,
        normalize_complexity,
    )

    assert normalize_complexity("remember") == "recall"
    assert normalize_complexity("analyse") == "analyze"
    assert normalize_complexity(None) == "apply"
    assert complexity_label("auto") == "Auto"
    assert complexity_label("recall") == "Recall"
    assert complexity_label("analyze") == "Analyze"
    assert infer_complexity(score_ratio=0.4, attempts=3) == "recall"
    assert infer_complexity(score_ratio=0.95, attempts=3) == "analyze"
    assert infer_complexity(score_ratio=None, attempts=0) == "apply"


def test_personalized_honors_teacher_complexity():
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
        tenant_id="t-comp",
        subject="stu-2",
        course_id="c1",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        difficulty="foundational",
        complexity="recall",
    )
    assert out["difficulty"] == "foundational"
    assert out["complexity"] == "recall"
    assert out["complexity_label"] == "Recall"
    assert out["complexity_source"] == "teacher"
    assert out["covers_all_pages"] is True
    assert out["coverage_unit_count"] >= 2
    assert out["covered_unit_count"] == out["coverage_unit_count"]


def test_generate_mcqs_includes_complexity():
    segments = [
        {"label": f"Page {i}", "text": f"Fact number {i} about topic {i}. " * 8}
        for i in range(1, 4)
    ]
    result = generate_mcqs_from_text(
        "x" * 50,
        count=3,
        title="Book",
        difficulty="core",
        complexity="analyze",
        segments=segments,
    )
    assert result["complexity"] == "analyze"
    assert result["complexity_label"] == "Analyze"
    assert all(q.get("complexity") == "analyze" for q in result["questions"])


def test_validate_study_plan_no_plan_ok_with_coverage():
    from app.modules.quiz.personalized import validate_study_plan_for_quiz

    out = validate_study_plan_for_quiz(
        plan=None,
        questions=[{"prompt": "From Ch1", "topic": "Ch1"}],
        profile={"attempts": 0, "difficulty": "core", "complexity": "apply"},
        difficulty="core",
        complexity="apply",
        covers_all_pages=True,
    )
    assert out["has_plan"] is False
    assert out["valid"] is True
    assert out["skills_targeted"] == []


def test_validate_study_plan_aligns_gap_skills():
    from app.modules.quiz.personalized import validate_study_plan_for_quiz

    plan = {
        "active": True,
        "plan_id": "p1",
        "skills": [
            {"skill_code": "alg.vars", "label": "Variables"},
            {"skill_code": "alg.eq", "label": "Equations"},
        ],
    }
    questions = [
        {"prompt": "Study-plan focus Variables — from Ch1", "topic": "Ch1"},
        {"prompt": "Which statement about equations is correct?", "topic": "Ch2"},
    ]
    out = validate_study_plan_for_quiz(
        plan=plan,
        questions=questions,
        profile={
            "attempts": 2,
            "difficulty": "foundational",
            "complexity": "recall",
            "weak_prompts": ["missed graph item"],
        },
        difficulty="foundational",
        complexity="recall",
        covers_all_pages=True,
    )
    assert out["has_plan"] is True
    assert out["valid"] is True
    assert "Variables" in out["skills_aligned"]
    assert "Equations" in out["skills_aligned"]
    assert out["skills_missing"] == []
    assert out["performance_aligned"] is True


def test_personalized_includes_study_plan_validation(monkeypatch):
    lessons = [
        {
            "id": "l1",
            "title": "Ch1 Variables",
            "lesson_type": "reading",
            "body_md": "Variables store numbers and letters in algebra. " * 6,
        },
        {
            "id": "l2",
            "title": "Ch2 Equations",
            "lesson_type": "reading",
            "body_md": "Equations balance both sides with equal values. " * 6,
        },
    ]

    def get_course(_tid, cid):
        return {"id": cid, "title": "Course"}

    def list_lessons(_tid, _cid):
        return lessons

    monkeypatch.setattr(
        "app.modules.adaptive.get_open_plan",
        lambda *_a, **_k: {
            "active": True,
            "plan_id": "plan-1",
            "skills": [{"skill_code": "alg.vars", "label": "Variables"}],
        },
    )

    out = generate_personalized_quiz(
        tenant_id="t-plan",
        subject="stu-plan",
        course_id="c1",
        list_lessons_fn=list_lessons,
        get_bound_course_fn=get_course,
        difficulty="core",
        complexity="apply",
    )
    assert out["covers_all_pages"] is True
    assert "study_plan_validation" in out
    assert out["study_plan_valid"] is True
    sp = out["study_plan_validation"]
    assert sp["has_plan"] is True
    assert "Variables" in (sp.get("skills_aligned") or [])