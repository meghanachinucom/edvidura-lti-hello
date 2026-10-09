"""Portable module facades — no FastAPI imports required."""
from __future__ import annotations

from app.modules.ai_tutor.turn import apply_clarify_pending, coach_json_payload
from app.modules.quiz.attempts import build_review_from_answers, grade_submitted_form
from app.modules.quiz.service import Question
from app.modules.school.launch_binding import enrich_session_from_launch


def test_apply_clarify_pending():
    s = {"subject": "a"}
    s2 = apply_clarify_pending(s, {"clarify": True})
    assert s2["coach_clarify_pending"] is True
    s3 = apply_clarify_pending(s2, {"clarify": False, "grounded": True})
    assert "coach_clarify_pending" not in s3


def test_coach_json_payload_shape():
    payload = coach_json_payload(
        question="What is x?",
        turn={
            "answer": {
                "answer": "A variable.",
                "grounded": True,
                "strategy_label": "Explain",
                "citations": [{"title": "Vars", "excerpt": "…"}],
            },
            "reply_language": "en-IN",
            "class_name": "Class 8",
            "thread_id": "coach-1",
        },
    )
    assert payload["ok"] is True
    assert payload["answer"] == "A variable."
    assert payload["citations"][0]["title"] == "Vars"


def test_grade_submitted_form_local(monkeypatch):
    qs = (
        Question(
            id="q1",
            prompt="2+2?",
            choices=["3", "4", "5"],
            correct_index=1,
        ),
    )

    monkeypatch.setattr(
        "app.modules.quiz.attempts.questions_for_tenant",
        lambda *a, **k: qs,
    )
    graded = grade_submitted_form(
        tenant_id="00000000-0000-0000-0000-000000000001",
        subject="alice",
        course_id=None,
        form_keys={"q1"},
        get_answer=lambda qid: "1",
    )
    assert graded["score"] == 1
    assert graded["max_score"] == 1
    review = build_review_from_answers(graded["answers_payload"], questions=qs)
    assert review[0]["correct"] is True


def test_enrich_session_no_tenant():
    assert enrich_session_from_launch({}) == {}
