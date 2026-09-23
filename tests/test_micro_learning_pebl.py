"""Micro-learning catalog + PeBL coach xAPI defaults."""
from __future__ import annotations

from app.modules.adaptive import micro_learning_catalog
from app.modules.xapi.builder import build_coach_interacted_statement
from app.settings import get_settings


def test_micro_learning_catalog_shape(monkeypatch):
    fake_pack = {
        "missing": [],
        "missing_count": 0,
        "covered": [
            {
                "id": "s1",
                "skill_code": "variables",
                "label": "Variables",
                "description": "Letters for numbers",
                "lesson_id": "11111111-1111-1111-1111-111111111111",
                "manual_id": None,
                "manual_focus": "",
                "prefer_path": "lessons",
                "teleport_hint": "Review variables",
            }
        ],
        "covered_count": 1,
        "skills": [],
    }
    monkeypatch.setattr(
        "app.modules.adaptive.service.dct_planner_pack",
        lambda _tid: fake_pack,
    )
    monkeypatch.setattr(
        "app.modules.adaptive.service.weak_skill_codes_for_subject",
        lambda _tid, _sub: ["variables"],
    )
    out = micro_learning_catalog("t1", subject="alice", quiz_token="tok")
    assert out["available_count"] == 1
    assert out["priority_count"] == 1
    assert out["lessons"][0]["priority"] is True
    assert "lessons/" in out["lessons"][0]["href"]
    assert "token=tok" in out["lessons"][0]["href"]


def test_coach_statement_pebl_full_text_by_default():
    stmt = build_coach_interacted_statement(
        tenant_id="t1",
        subject="sub1",
        learner_name="Alice",
        question="What is a variable?",
        grounded=True,
        citation_count=1,
        thread_id="coach-sub1-abc",
        access_level="class",
        include_full_text=True,
        answer_text="A letter that stands for a number.",
    )
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/channel"] == "study_coach"
    assert ext["https://edvidura.local/xapi/extensions/thread_id"] == "coach-sub1-abc"
    assert ext["https://edvidura.local/xapi/extensions/message_text"] == "What is a variable?"
    assert ext["https://edvidura.local/xapi/extensions/pebl_discussion_aligned"] is True


def test_coach_xapi_full_text_defaults_on(monkeypatch):
    monkeypatch.delenv("COACH_XAPI_FULL_TEXT", raising=False)
    s = get_settings()
    assert s.coach_xapi_full_text is True
