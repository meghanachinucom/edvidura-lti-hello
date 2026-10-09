"""Phase B — study plan summary + coach insights (portable)."""
from __future__ import annotations

from app.modules.adaptive.service import learner_plan_summary
from app.modules.analytics.service import attach_study_plan, class_coach_insights
from app.modules.xapi.builder import build_coach_interacted_statement


def test_learner_plan_summary_inactive_without_db(monkeypatch):
    monkeypatch.setattr(
        "app.modules.adaptive.service.resolve_learner_plan",
        lambda *a, **k: {"active": False},
    )
    out = learner_plan_summary(
        "00000000-0000-0000-0000-000000000001",
        subject="alice",
        quiz_token="tok123",
    )
    assert out["active"] is False
    assert "tok123" in out["plan_href"]


def test_learner_plan_summary_active(monkeypatch):
    monkeypatch.setattr(
        "app.modules.adaptive.service.resolve_learner_plan",
        lambda *a, **k: {
            "active": True,
            "done_count": 1,
            "step_count": 3,
            "progress_pct": 33,
            "skills": [{"code": "var", "label": "Variables"}],
            "signal_sources": ["chatbot", "quiz"],
            "first_href": "/quiz?token=t",
            "mode": "gap",
            "signal_adapted": True,
        },
    )
    out = learner_plan_summary(
        "00000000-0000-0000-0000-000000000001",
        subject="alice",
        quiz_token="t",
    )
    assert out["active"] is True
    assert out["progress_pct"] == 33
    assert out["skills"][0]["label"] == "Variables"
    assert "chatbot" in out["signal_sources"]


def test_attach_study_plan():
    dash = attach_study_plan(
        {"attempt_count": 0},
        tenant_id="00000000-0000-0000-0000-000000000001",
        subject="alice",
        quiz_token="abc",
    )
    assert "study_plan" in dash
    assert "plan_href" in dash["study_plan"]


def test_class_coach_insights_empty(monkeypatch):
    monkeypatch.setattr(
        "app.modules.xapi.service.list_statements",
        lambda *a, **k: [],
    )
    out = class_coach_insights("00000000-0000-0000-0000-000000000001")
    assert out["turns"] == 0
    assert out["thumbs_up"] == 0


def test_class_coach_insights_rollups(monkeypatch):
    from app.modules.xapi import verbs

    stmt = build_coach_interacted_statement(
        tenant_id="00000000-0000-0000-0000-000000000001",
        subject="alice",
        learner_name="Alice",
        question="What is a variable?",
        grounded=True,
        strategy="hint",
        jev_used=True,
        jev_skipped_remote=True,
    )
    feedback = {
        "verb": {"id": verbs.VERB_RESPONDED},
        "context": {
            "extensions": {
                "https://edvidura.local/xapi/extensions/channel": "study_coach",
                "https://edvidura.local/xapi/extensions/coach_rating": "up",
                "https://edvidura.local/xapi/extensions/feedback_kind": "thumbs",
            }
        },
    }
    rows = [
        {
            "actor_sub": "alice",
            "verb_id": verbs.VERB_INTERACTED,
            "object_id": stmt["object"]["id"],
            "statement": stmt,
            "created_at": None,
        },
        {
            "actor_sub": "alice",
            "verb_id": verbs.VERB_RESPONDED,
            "object_id": "feedback",
            "statement": feedback,
            "created_at": None,
        },
    ]
    monkeypatch.setattr(
        "app.modules.xapi.service.list_statements",
        lambda *a, **k: rows,
    )
    out = class_coach_insights(
        "00000000-0000-0000-0000-000000000001",
        subjects=["alice"],
    )
    assert out["turns"] == 1
    assert out["grounded"] == 1
    assert out["thumbs_up"] == 1
    assert out["jev_skipped_remote"] == 1
    assert out["top_topics"]


def test_jev_skipped_remote_on_statement():
    stmt = build_coach_interacted_statement(
        tenant_id="00000000-0000-0000-0000-000000000001",
        subject="alice",
        learner_name="Alice",
        question="hint please",
        jev_used=True,
        jev_skipped_remote=True,
    )
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/jev_skipped_remote"] is True
