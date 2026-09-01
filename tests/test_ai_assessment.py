"""AI assessment + tutor local fallbacks."""
from __future__ import annotations

from app.modules.ai_assessment import (
    ai_status,
    generate_mcqs_from_text,
    grade_open_response,
    simplify_lesson_text,
    suggest_deeplink_activities,
    suggest_teacher_next_steps,
)
from app.modules.ai_tutor import hint_for_missed_question, study_coach_answer


def test_ai_status_defaults_local():
    st = ai_status()
    assert st["provider"] in {"local", "openai"}
    assert "how_to_enable" in st


def test_local_mcq_generation():
    body = (
        "LTI launch opens the tool in a new window from Moodle. "
        "Tenant isolation keeps each school's data separate with RLS. "
        "Gradebook sync sends scores to Moodle via AGS when available. "
        "Practice attempts skip the Moodle gradebook on purpose."
    )
    result = generate_mcqs_from_text(body, count=3, title="Demo lesson")
    assert result["provider"] == "local"
    assert len(result["questions"]) == 3


def test_remediation_micro_lesson_local():
    from app.modules.ai_assessment import generate_remediation_micro_lesson

    out = generate_remediation_micro_lesson(
        skill_label="Tenant isolation",
        skill_code="tenant_isolation",
        skill_description="Each school's data stays private under RLS.",
        course_title="LTI demo",
        source_excerpt="RLS uses app.tenant_id on every query.",
    )
    assert out["provider"] == "local"
    assert "Tenant isolation" in out["title"] or "isolation" in out["title"].lower()
    assert len(out["body_md"]) > 80
    assert out["skill_code"] == "tenant_isolation"

    assert len(out["body_md"]) > 40


def test_grade_assist_local():
    out = grade_open_response(
        prompt="What is a variable?",
        rubric="Name and example",
        student_answer="A variable is an unknown like x in 2x+3=11.",
        max_score=5,
    )
    assert 0 <= out["score"] <= 5
    assert out["disclaimer"]
    assert out["moodle_passback"] is False
    assert "Moodle" in out["copy_text"]
    assert "Score:" in out["copy_text"]


def test_extract_text_file_and_mcq_from_document():
    from app.modules.ai_assessment import (
        extract_text_from_bytes,
        generate_mcqs_from_document,
    )

    body = (
        "LTI launch opens the tool in a new window from Moodle. "
        "Tenant isolation keeps each school's data separate with RLS. "
        "Gradebook sync sends scores to Moodle via AGS when available. "
        "Practice attempts skip the Moodle gradebook on purpose."
    ).encode("utf-8")
    extracted = extract_text_from_bytes(body, filename="notes.txt")
    assert extracted["source_kind"] == "text"
    assert "LTI" in extracted["text"]

    result = generate_mcqs_from_document(
        body, filename="notes.txt", count=2, title="LTI notes"
    )
    assert result["provider"] == "local"
    assert len(result["questions"]) == 2
    assert result["source_kind"] == "text"


def test_extract_pdf_rejects_blank():
    from io import BytesIO

    from app.modules.ai_assessment import extract_text_from_bytes

    try:
        from pypdf import PdfWriter
    except ImportError:
        return

    buf = BytesIO()
    w = PdfWriter()
    w.add_blank_page(width=200, height=200)
    w.write(buf)
    try:
        extract_text_from_bytes(buf.getvalue(), filename="blank.pdf")
        assert False, "expected ValueError for blank PDF"
    except ValueError as exc:
        assert "text" in str(exc).lower() or "extract" in str(exc).lower()


def test_deeplink_and_next_steps_local():
    sug = suggest_deeplink_activities(
        [
            {"id": "1", "title": "Welcome", "lesson_type": "article"},
            {"id": "2", "title": "Quiz", "lesson_type": "quiz"},
        ],
        course_title="Algebra",
    )
    assert sug["suggestions"]
    steps = suggest_teacher_next_steps(
        at_risk=[{"learner_name": "Ada", "reasons": ["low score"], "latest_percent": 20}],
        avg_percent=45.0,
    )
    assert steps["actions"]


def test_hint_and_coach_local():
    hint = hint_for_missed_question(
        prompt="What is x in 2x=10?",
        correct_choice="5",
        lesson_excerpts=["Isolate the variable by dividing both sides."],
    )
    assert hint["hint"]
    coach = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=[
            {"title": "Welcome", "body": "A variable stands for an unknown value."}
        ],
        course_title="Algebra",
    )
    assert coach["answer"]
    assert coach["citations"]


def test_short_text_raises():
    try:
        generate_mcqs_from_text("too short")
        assert False, "expected ValueError"
    except ValueError:
        pass
