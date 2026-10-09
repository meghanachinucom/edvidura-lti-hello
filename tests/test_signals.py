"""Per-learner signal fusion (chatbot + Moodle + VR) → plan gaps."""
from __future__ import annotations

from unittest.mock import patch

from app.modules.signals.service import (
    suggest_skill_gaps_from_signals,
    _match_skills_from_text,
)


def test_match_skills_from_coach_text():
    catalog = [
        {
            "skill_code": "alg.vars",
            "label": "Variables",
            "lesson_id": "l1",
            "prefer_path": "lessons",
        },
        {
            "skill_code": "alg.eq",
            "label": "Linear equations",
            "lesson_id": "l2",
            "prefer_path": "lessons",
        },
    ]
    hits = _match_skills_from_text(
        "I am stuck on variables in algebra",
        catalog,
        status="developing",
        source="chatbot",
    )
    assert any(h["id"] == "alg.vars" for h in hits)


def test_suggest_gaps_merges_quiz_coach_and_vr():
    catalog = [
        {
            "skill_code": "alg.vars",
            "label": "Variables",
            "lesson_id": "l1",
            "prefer_path": "lessons",
        },
        {
            "skill_code": "alg.eq",
            "label": "Equations",
            "lesson_id": "l2",
            "prefer_path": "lessons",
        },
        {
            "skill_code": "vr.pipe",
            "label": "Pipe isolation",
            "lesson_id": None,
            "prefer_path": "manuals",
        },
    ]
    profile = {
        "attempt": {
            "id": "a1",
            "answers": {
                "detail": {
                    "q1": {
                        "correct": False,
                        "prompt": "What is a variable?",
                        "skill_code": "alg.vars",
                    }
                }
            },
        },
        "channels": {
            "chatbot": {
                "count": 2,
                "recent_texts": ["Please explain equations again"],
                "strategies": {"hint": 2},
            },
            "moodle": {
                "quiz_attempts": 1,
                "lessons_completed": 0,
                "lessons_total": 2,
                "completed_ids": [],
            },
            "vr": {
                "count": 1,
                "failed": 1,
                "success": 0,
                "skill_hints": ["vr.pipe", "Pipe isolation failed"],
            },
        },
    }

    with (
        patch(
            "app.modules.signals.service.skills_mod.ensure_default_skills",
            return_value=catalog,
        ),
        patch(
            "app.modules.signals.service.adaptive_mod.weak_skills_from_attempt",
            return_value=[
                {
                    "id": "alg.vars",
                    "label": "Variables",
                    "status": "weak",
                    "percent": 20,
                }
            ],
        ),
    ):
        gaps = suggest_skill_gaps_from_signals("tenant-1", profile, max_skills=5)

    codes = {g["id"] for g in gaps}
    assert "alg.vars" in codes
    # Coach and/or VR should surface additional skills
    assert "alg.eq" in codes or "vr.pipe" in codes
    sources = " ".join(str(g.get("source") or "") for g in gaps)
    assert "moodle" in sources or "chatbot" in sources or "vr" in sources


def test_class_learner_gap_board_shapes_rows(monkeypatch):
    from app.modules.signals.service import class_learner_gap_board

    monkeypatch.setattr(
        "app.modules.signals.service.build_learner_signal_profile",
        lambda *_a, **_k: {
            "sources": ["moodle", "chatbot"],
            "channels": {
                "moodle": {"quiz_attempts": 2, "avg_score_ratio": 0.4},
                "chatbot": {"count": 3},
                "vr": {"failed": 0},
            },
        },
    )
    monkeypatch.setattr(
        "app.modules.signals.service.suggest_skill_gaps_from_signals",
        lambda *_a, **_k: [
            {
                "id": "alg.vars",
                "label": "Variables",
                "status": "weak",
                "source": "moodle_quiz",
            }
        ],
    )
    monkeypatch.setattr(
        "app.modules.signals.service.adaptive_mod.get_open_plan",
        lambda *_a, **_k: {
            "active": True,
            "done_count": 1,
            "step_count": 4,
            "steps": [1, 2, 3, 4],
        },
    )
    rows = class_learner_gap_board(
        "t1",
        learners=[{"subject": "s1", "learner_name": "Ada"}],
        limit=10,
    )
    assert len(rows) == 1
    assert rows[0]["learner_name"] == "Ada"
    assert rows[0]["gaps"][0]["label"] == "Variables"
    assert "moodle" in rows[0]["sources"]
    assert rows[0]["has_plan"] is True


def test_build_profile_sources_flags(monkeypatch):
    from app.modules.signals.service import build_learner_signal_profile

    monkeypatch.setattr(
        "app.modules.signals.service.student_performance_profile",
        lambda *_a, **_k: {
            "attempts": 2,
            "avg_score_ratio": 0.4,
            "difficulty": "foundational",
            "complexity": "recall",
            "weak_prompts": [],
        },
    )
    monkeypatch.setattr(
        "app.modules.signals.service.adaptive_mod.latest_graded_attempt_for_subject",
        lambda *_a, **_k: {"id": "att-1", "answers": {}},
    )
    monkeypatch.setattr(
        "app.modules.signals.service.adaptive_mod.get_open_plan",
        lambda *_a, **_k: None,
    )
    monkeypatch.setattr(
        "app.modules.signals.service.content.course_progress",
        lambda *_a, **_k: {
            "percent": 25,
            "completed_count": 1,
            "total_count": 4,
            "completed_ids": ["l1"],
        },
    )

    def _list_statements(*_a, **_k):
        return [
            {
                "statement": {
                    "context": {
                        "extensions": {
                            "https://edvidura.local/xapi/extensions/channel": "study_coach",
                            "https://edvidura.local/xapi/extensions/message_text": "What are variables?",
                            "https://edvidura.local/xapi/extensions/coach_strategy": "hint",
                        }
                    }
                }
            },
            {
                "statement": {
                    "context": {
                        "extensions": {
                            "https://edvidura.local/xapi/extensions/channel": "vr",
                            "https://edvidura.local/xapi/extensions/skill_code": "vr.pipe",
                        }
                    },
                    "result": {"success": False, "score": {"scaled": 0.2}},
                    "object": {
                        "definition": {
                            "name": {"en-US": "Pipe isolation"},
                            "type": "https://w3id.org/xapi/virtual-reality/activity-types/vr-experience",
                        }
                    },
                }
            },
        ]

    monkeypatch.setattr("app.modules.xapi.list_statements", _list_statements)
    out = build_learner_signal_profile(
        "t1", "learner-1", course_id="c1", course_label="Algebra"
    )

    assert out["subject"] == "learner-1"
    assert "moodle" in out["sources"]
    assert "chatbot" in out["sources"]
    assert "vr" in out["sources"]
    assert out["channels"]["chatbot"]["count"] == 1
    assert out["channels"]["vr"]["failed"] == 1
