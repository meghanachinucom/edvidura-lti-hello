"""Micro-learning catalog + PeBL coach xAPI defaults."""
from __future__ import annotations

from app.modules.adaptive import micro_learning_catalog, publish_skill_reel
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
    monkeypatch.setattr(
        "app.modules.content.get_lesson",
        lambda *_a, **_k: {
            "title": "Variables in 60 seconds",
            "body_md": "# Tip\n- A letter stands for a number\n- Solve by isolating x\n",
            "video_url": "",
        },
    )
    out = micro_learning_catalog("t1", subject="alice", quiz_token="tok")
    assert out["available_count"] == 1
    assert out["priority_count"] == 1
    assert out["lessons"][0]["priority"] is True
    assert "lessons/" in out["lessons"][0]["href"]
    assert "token=tok" in out["lessons"][0]["href"]
    assert out["lessons"][0]["reel_title"] == "Variables"
    assert out["lessons"][0]["reel_beats"]
    assert "Welcome to Algebra" not in out["lessons"][0]["reel_title"]
    assert out["lessons"][0]["reel_video_url"]
    assert out["lessons"][0]["practice_href"].endswith("practice=1")


def test_publish_skill_reel_updates_video(monkeypatch):
    skills = [
        {
            "id": "s1",
            "skill_code": "variables",
            "label": "Variables",
            "description": "Letters for numbers",
            "lesson_id": None,
            "manual_id": None,
            "manual_focus": "",
        }
    ]
    created: dict = {}

    def fake_create(**kwargs):
        created.update(kwargs)
        return {"id": "lesson-new", **kwargs}

    monkeypatch.setattr(
        "app.modules.skills.ensure_default_skills", lambda _tid: skills
    )
    monkeypatch.setattr("app.modules.content.create_lesson", fake_create)
    monkeypatch.setattr(
        "app.modules.content.get_lesson", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        "app.modules.skills.set_skill_remediation",
        lambda *a, **k: created.setdefault("linked", True),
    )
    out = publish_skill_reel(
        "t1",
        "s1",
        video_url="/static/uploads/t1/reels/demo.mp4",
        caption="Watch then practice",
    )
    assert out["video_url"].endswith("demo.mp4")
    assert created.get("lesson_type") == "video"
    assert created.get("linked") is True


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
