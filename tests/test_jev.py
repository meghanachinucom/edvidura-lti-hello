"""Jev decision layer — unit tests with mocked HTTP."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.modules.jev.service import coach_decisions, jev_status, quiz_coverage_ok


def test_jev_status_disabled_by_default():
    st = jev_status()
    assert "enabled" in st
    assert "configured" in st


def test_coach_decisions_falls_back_without_jev():
    with patch("app.modules.jev.service.jev_ready", return_value=False):
        out = coach_decisions(
            question="What is a variable?",
            lesson_excerpts=[
                {"title": "Variables", "body": "A variable stands for an unknown."}
            ],
            learner_context={"difficulty": "foundational", "difficulty_label": "Easy"},
        )
    assert out["used"] is False
    assert out["strategy"] in {
        "socratic",
        "hint",
        "explain",
        "practice_handoff",
    }
    assert out["strategy_source"] in {"heuristic", "preferred"}


def test_coach_decisions_uses_jev_when_confident():
    fake = {
        "model": "jev-1.13.0",
        "answers": {
            "on_class": {"type": "noul", "noul": 0.92},
            "strategy": {
                "type": "choice",
                "choice": "hint",
                "confidence": 0.88,
                "probabilities": {"hint": 0.88, "explain": 0.12},
            },
        },
    }
    with (
        patch("app.modules.jev.service.jev_ready", return_value=True),
        patch("app.modules.jev.service.decide", return_value=fake),
    ):
        out = coach_decisions(
            question="What is a variable?",
            lesson_excerpts=[
                {"title": "Variables", "body": "A variable stands for an unknown."}
            ],
            learner_context={"difficulty": "foundational", "difficulty_label": "Easy"},
        )
    assert out["used"] is True
    assert out["on_topic"] is True
    assert out["strategy"] == "hint"
    assert out["strategy_source"] == "jev"
    assert out["model"] == "jev-1.13.0"


def test_coach_decisions_off_topic_gate():
    fake = {
        "model": "jev-1.13.0",
        "answers": {
            "on_class": {"type": "noul", "noul": 0.1},
            "strategy": {
                "type": "choice",
                "choice": "explain",
                "confidence": 0.7,
            },
        },
    }
    with (
        patch("app.modules.jev.service.jev_ready", return_value=True),
        patch("app.modules.jev.service.decide", return_value=fake),
    ):
        out = coach_decisions(
            question="Who won the world cup?",
            lesson_excerpts=[
                {"title": "Variables", "body": "A variable stands for an unknown."}
            ],
        )
    assert out["on_topic"] is False


def test_quiz_coverage_ok_remediate_signal():
    fake = {
        "model": "jev-1.13.0",
        "answers": {
            "full_book": {"type": "noul", "noul": 0.2},
            "coverage_quality": {
                "type": "score",
                "score": 0.5,
                "confidence": 0.9,
            },
        },
    }
    with (
        patch("app.modules.jev.service.jev_ready", return_value=True),
        patch("app.modules.jev.service.decide", return_value=fake),
    ):
        out = quiz_coverage_ok(
            unit_titles=["Page 1", "Page 2", "Page 9"],
            question_stems=["From Page 1: which statement is true?"],
        )
    assert out["used"] is True
    assert out["covers_all"] is False


def test_study_coach_respects_jev_off_topic():
    from app.modules.ai_tutor import study_coach_answer

    fake = {
        "used": True,
        "on_topic": False,
        "on_topic_p": 0.1,
        "strategy": "explain",
        "strategy_confidence": 0.8,
        "strategy_source": "jev",
        "model": "jev-1.13.0",
        "llm_tier": "local",
        "skipped_remote": True,
    }
    with patch("app.modules.jev.coach_decisions", return_value=fake):
        result = study_coach_answer(
            question="Who won the cricket world cup?",
            curriculum_chunks=[
                {
                    "title": "Variables",
                    "body": "A variable stands for an unknown value in algebra.",
                }
            ],
            course_title="Algebra",
            class_name="Grade 9",
        )
    assert result["grounded"] is False
    assert result.get("jev_used") is True


def test_route_llm_tier_prefers_local_when_confident():
    from app.modules.jev.service import route_llm_tier

    fake = {
        "model": "jev-1.13.0",
        "answers": {
            "llm_tier": {
                "type": "choice",
                "choice": "local",
                "confidence": 0.91,
            }
        },
    }
    with (
        patch("app.modules.jev.service.jev_ready", return_value=True),
        patch("app.modules.jev.service.decide", return_value=fake),
        patch(
            "app.modules.jev.service.get_settings",
            return_value=MagicMock(
                jev_route_llm=True, jev_min_confidence=0.55
            ),
        ),
    ):
        out = route_llm_tier(
            feature="personalized_quiz",
            state={"difficulty": "foundational", "complexity": "recall"},
        )
    assert out["used"] is True
    assert out["tier"] == "local"
    assert out["skipped_remote"] is True


def test_run_ai_skips_remote_when_jev_routes_local():
    from app.modules.ai_assessment.llm import run_ai

    calls = {"remote": 0, "local": 0}

    def _remote():
        calls["remote"] += 1
        return {"ok": True, "path": "remote"}

    def _local():
        calls["local"] += 1
        return {"ok": True, "path": "local"}

    with (
        patch(
            "app.modules.ai_assessment.llm.ai_status",
            return_value={
                "remote_ready": True,
                "provider": "openai",
                "model": "gpt-test",
                "how_to_enable": "",
            },
        ),
        patch(
            "app.modules.jev.route_llm_tier",
            return_value={
                "used": True,
                "tier": "local",
                "skipped_remote": True,
                "confidence": 0.9,
                "model": "jev-1.13.0",
            },
        ),
    ):
        out = run_ai(
            openai_fn=_remote,
            local_fn=_local,
            feature="mcq",
            route_state={"difficulty": "foundational"},
        )
    assert calls["remote"] == 0
    assert calls["local"] == 1
    assert out["path"] == "local"
    assert out.get("jev_route", {}).get("tier") == "local"


def test_coach_decisions_includes_llm_tier():
    fake = {
        "model": "jev-1.13.0",
        "answers": {
            "on_class": {"type": "noul", "noul": 0.9},
            "strategy": {
                "type": "choice",
                "choice": "hint",
                "confidence": 0.88,
            },
            "llm_tier": {
                "type": "choice",
                "choice": "local",
                "confidence": 0.86,
            },
        },
    }
    with (
        patch("app.modules.jev.service.jev_ready", return_value=True),
        patch("app.modules.jev.service.decide", return_value=fake),
        patch(
            "app.modules.jev.service.get_settings",
            return_value=MagicMock(
                jev_route_llm=True, jev_min_confidence=0.55
            ),
        ),
    ):
        out = coach_decisions(
            question="What is a variable?",
            lesson_excerpts=[
                {"title": "Variables", "body": "A variable stands for an unknown."}
            ],
            learner_context={"difficulty": "foundational", "difficulty_label": "Easy"},
        )
    assert out["used"] is True
    assert out["llm_tier"] == "local"
    assert out["skipped_remote"] is True


def test_study_coach_skips_remote_on_jev_local_tier():
    from app.modules.ai_tutor import study_coach_answer

    fake = {
        "used": True,
        "on_topic": True,
        "on_topic_p": 0.9,
        "strategy": "hint",
        "strategy_confidence": 0.85,
        "strategy_source": "jev",
        "model": "jev-1.13.0",
        "llm_tier": "local",
        "llm_tier_confidence": 0.9,
        "skipped_remote": True,
    }
    with patch("app.modules.jev.coach_decisions", return_value=fake):
        result = study_coach_answer(
            question="What is a variable?",
            curriculum_chunks=[
                {
                    "title": "Variables",
                    "body": "A variable stands for an unknown value in algebra.",
                }
            ],
            course_title="Algebra",
            class_name="Grade 9",
        )
    assert result.get("grounded") is True
    assert result.get("jev_skipped_remote") is True
    assert result.get("provider") == "local"
