"""AI Assessment F-4 / F-5 / F-12 and LTI group helpers (no database)."""
from __future__ import annotations

from app.modules.ai_assessment import (
    assessment_markdown,
    assessment_pdf,
    generate_test_bank,
    grade_essay_against_instructor,
    grade_open_response,
)
from app.modules.lti_groups.service import (
    gs_claim_from_launch,
    has_gs_on_launch,
    normalize_gs_group,
)


_BODY = (
    "LTI launch opens the tool in a new window from Moodle. "
    "Tenant isolation keeps each school's data separate with RLS. "
    "Gradebook sync sends scores to Moodle via AGS when available. "
    "Practice attempts skip the Moodle gradebook on purpose. "
    "Deep linking places a lesson or quiz into the LMS course. "
    "Ask Vidura cites approved manuals and lessons. "
    "Group services assign a checkpoint to a class group. "
    "A test bank is reviewed by the teacher before it goes live.\n\n"
    "## Isolation\n"
    "Postgres row-level security uses app.tenant_id on every query so "
    "one school cannot read another school's attempts.\n\n"
    "## Grade passback\n"
    "Assignment and Grade Services post the official score to Moodle. "
    "Teachers still confirm open-response marks in the LMS."
)


def test_generate_test_bank_is_at_least_100():
    result = generate_test_bank(_BODY, count=120, title="LTI demo")
    assert result["review_required"] is True
    assert result["bank_size"] >= 100
    assert len(result["questions"]) >= 100
    assert all(q.get("review_status") == "draft" for q in result["questions"])


def test_assessment_markdown_and_pdf():
    questions = [
        {
            "prompt": "What keeps tenant data separate?",
            "choices": ["RLS", "CSS", "PIN"],
            "correct_index": 0,
            "qtype": "single",
        },
        {
            "prompt": "Explain AGS in two sentences.",
            "choices": [],
            "qtype": "essay",
            "correct_text": "AGS sends scores to Moodle.",
        },
    ]
    md = assessment_markdown(questions, title="Checkpoint", include_answers=True)
    assert "# Checkpoint" in md
    assert "What keeps tenant data separate?" in md
    assert "Answer key" in md
    pdf = assessment_pdf(questions, title="Checkpoint")
    assert pdf.startswith(b"%PDF-1.4")
    assert b"%%EOF" in pdf[-32:]


def test_essay_grade_vs_instructor_and_rag():
    out = grade_essay_against_instructor(
        "The official score lives in Moodle because AGS sends it back after a graded quiz.",
        prompt="Why should the official score live in Moodle?",
        instructor_answer="The official course score should live in Moodle. AGS sends the graded quiz score back.",
        rag_chunks=[
            {
                "title": "Grade passback",
                "body": "Assignment and Grade Services post the official score to Moodle.",
            }
        ],
        max_score=5,
    )
    assert 0 <= out["score"] <= 5
    assert out["compared_to"] in {"instructor_answer", "instructor_answer+rag"}
    assert out["moodle_passback"] is False
    assert out["citations"]


def test_grade_open_response_uses_instructor_path():
    out = grade_open_response(
        prompt="What is RLS?",
        rubric="Name the mechanism",
        student_answer="Row level security uses app.tenant_id so schools stay isolated.",
        instructor_answer="RLS is Postgres row-level security keyed by app.tenant_id.",
        max_score=5,
    )
    assert out["compared_to"] == "instructor_answer"
    assert "Moodle" in out["copy_text"]


def test_lti_gs_claim_and_normalize():
    launch = {
        "https://purl.imsglobal.org/spec/lti-gs/claim/groupsservice": {
            "context_groups_url": "https://moodle.example/mod/lti/group.php",
            "service_versions": ["1.0"],
        }
    }
    assert has_gs_on_launch(launch)
    assert "context_groups_url" in gs_claim_from_launch(launch)
    group = normalize_gs_group(
        {
            "id": "g1",
            "name": "Period 1 A",
            "members": [{"user_id": "lakshmi", "name": "Lakshmi"}],
        }
    )
    assert group["group_id"] == "g1"
    assert group["members"][0]["user_id"] == "lakshmi"
    assert normalize_gs_group({}) is None
