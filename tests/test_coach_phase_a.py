"""Phase A Ask Vidura — integrity, clarify, flashcards, shortcuts defaults."""
from __future__ import annotations

from app.modules.ai_tutor.clarify import build_clarify_reply, needs_clarify
from app.modules.ai_tutor.flashcards import flashcards_from_chunks
from app.modules.ai_tutor.integrity import detect_integrity_violation
from app.modules.ai_tutor.service import study_coach_answer
from app.modules.ai_tutor.shortcuts import DEFAULT_SHORTCUTS, shortcuts_for_learner
from app.modules.xapi.builder import build_coach_feedback_statement


def test_integrity_blocks_assignment_writing():
    hit = detect_integrity_violation("Please write my assignment on variables")
    assert hit is not None
    assert hit["refusal_reason"] == "academic_integrity"
    assert hit["integrity_blocked"] is True


def test_integrity_allows_normal_lesson_question():
    assert detect_integrity_violation("What is a variable?") is None


def test_clarify_detects_vague_help():
    assert needs_clarify("help me") is True
    assert needs_clarify("What is a variable in this lesson?") is False


def test_study_coach_integrity_before_answer():
    out = study_coach_answer(
        question="Write my exam answers for algebra",
        curriculum_chunks=[
            {"title": "Variables", "body": "A variable stands for an unknown value."}
        ],
        course_title="Algebra",
        class_name="Class 8",
    )
    assert out["integrity_blocked"] is True
    assert out["grounded"] is False


def test_study_coach_clarify_once():
    chunks = [
        {"title": "Variables", "body": "A variable stands for an unknown value in algebra."}
    ]
    first = study_coach_answer(
        question="help",
        curriculum_chunks=chunks,
        course_title="Algebra",
        skip_clarify=False,
    )
    assert first.get("clarify") is True
    second = study_coach_answer(
        question="help",
        curriculum_chunks=chunks,
        course_title="Algebra",
        skip_clarify=True,
    )
    # After skip, vague overlap may still refuse off-class — but not clarify again.
    assert second.get("clarify") is not True


def test_flashcards_from_lesson_chunks():
    pack = flashcards_from_chunks(
        [
            {
                "title": "Variables",
                "body": (
                    "A variable is a symbol that stands for a number. "
                    "We use letters like x and y. Equations relate variables."
                ),
                "lesson_id": "l1",
            }
        ],
        max_cards=6,
    )
    assert pack["enabled"] is True
    assert pack["count"] >= 1
    assert pack["cards"][0]["front"]
    assert pack["cards"][0]["back"]


def test_shortcuts_defaults_without_db(monkeypatch):
    import app.modules.ai_tutor.shortcuts as sc

    def _boom(*_a, **_k):
        raise RuntimeError("no db")

    monkeypatch.setattr(sc, "list_shortcuts", _boom)
    chips = shortcuts_for_learner("00000000-0000-0000-0000-000000000001")
    assert len(chips) == len(DEFAULT_SHORTCUTS)
    assert chips[0]["label"] == DEFAULT_SHORTCUTS[0]["label"]


def test_build_coach_feedback_statement():
    stmt = build_coach_feedback_statement(
        tenant_id="00000000-0000-0000-0000-000000000001",
        subject="alice",
        learner_name="Alice",
        rating="up",
        thread_id="coach-alice",
        question_preview="What is a variable?",
    )
    assert stmt["verb"]["id"].endswith("responded")
    assert stmt["result"]["response"] == "up"
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/coach_rating"] == "up"


def test_clarify_reply_mentions_lessons():
    reply = build_clarify_reply(
        "help",
        lesson_titles=["Variables", "Equations"],
        class_name="Class 8",
    )
    assert reply["clarify"] is True
    assert "Variables" in reply["answer"] or "Variables" in reply["clarify_question"]
