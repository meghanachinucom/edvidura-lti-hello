"""High-value product fixes: rate limits, ghost hard gate, App coach parity, AGS queue."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_rate_limits_cover_coach_and_quiz():
    from app.rate_limit import DEFAULT_LIMITS

    prefixes = [p for p, _, _ in DEFAULT_LIMITS]
    assert "/learn/coach" in prefixes
    assert "/quiz" in prefixes
    assert "/api/v1/app/coach" in prefixes
    assert "/api/v1/app/quiz" in prefixes


def test_ghost_hard_gate_default_on():
    from app.settings import get_settings

    assert get_settings().ghost_coach_hard_gate is True


def test_app_coach_parity_fields(monkeypatch):
    from app.api.app_client import auth as app_auth
    from app.main import app
    from app.modules import ai_tutor

    fake = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "subject": "student-1",
        "learner_name": "Ada",
        "quiz_token": "tok-ada",
        "course": "Welding",
        "is_instructor": False,
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)

    def _turn(**kwargs):
        return {
            "answer": {
                "answer": "Wear a welding helmet.",
                "citations": [{"title": "PPE", "excerpt": "helmet"}],
                "citation_links": [{"title": "PPE", "excerpt": "helmet"}],
                "clarify": False,
                "integrity_blocked": False,
                "grounded": True,
                "strategy": "direct",
                "strategy_label": "Direct",
                "check_question": "",
                "refusal_reason": "",
            },
            "session_patch": {},
            "course_title": "Welding",
            "class_name": "Welding 101",
            "chunks_count": 2,
            "thread_id": "th1",
            "reply_language": "en-IN",
            "xapi_ok": True,
            "signals_ok": False,
            "error": None,
        }

    monkeypatch.setattr(ai_tutor, "run_coach_turn", _turn)

    client = TestClient(app)
    r = client.post(
        "/api/v1/app/coach",
        headers={"Authorization": "Bearer tok-ada"},
        json={"question": "What PPE?", "reply_language": "en-IN"},
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["answer"] == "Wear a welding helmet."
    assert data["citations"]
    assert data["citations"][0]["title"] == "PPE"
    assert data["integrity_blocked"] is False
    assert "clarify" in data
    assert data["grounded"] is True
    assert data["xapi_ok"] is True


def test_app_quiz_submit_queues_ags(monkeypatch):
    from app.api.app_client import auth as app_auth
    from app.main import app
    from app.modules import quiz as quiz_mod
    from app.modules.quiz.service import Question

    fake = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "subject": "student-1",
        "learner_name": "Ada",
        "quiz_token": "tok-ada",
        "launch_id": "launch-xyz",
        "ags_available": True,
        "course": "Welding",
        "is_instructor": False,
        "edvidura_course_id": None,
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)
    monkeypatch.setattr(
        "app.api.app_client.routes._enforce_ghost_coach", lambda *a, **k: None
    )

    called: dict = {}

    def _grade(**kwargs):
        return {
            "score": 1,
            "max_score": 1,
            "detail": {
                "qx": {
                    "chosen": 0,
                    "correct_index": 0,
                    "correct": True,
                    "prompt": "P",
                }
            },
            "answers_payload": {},
            "questions": (
                Question(id="qx", prompt="P", choices=("a", "b"), correct_index=0),
            ),
            "practice_mode": False,
            "personalized_mode": False,
        }

    monkeypatch.setattr(quiz_mod, "grade_submitted_form", _grade)
    monkeypatch.setattr(
        quiz_mod,
        "record_graded_attempt",
        lambda **kw: {
            "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "grade_sent": False,
        },
    )

    def _ags(**kwargs):
        called.update(kwargs)

    monkeypatch.setattr("app.quiz_routes._ags_background", _ags)
    monkeypatch.setattr("app.quiz_routes._load_launch_data", lambda *a, **k: {"sub": "s"})
    monkeypatch.setattr("app.db.touch_launch_snapshot", lambda *a, **k: True)

    client = TestClient(app)
    r = client.post(
        "/api/v1/app/quiz/submit",
        headers={"Authorization": "Bearer tok-ada"},
        json={"answers": {"qx": "0"}, "practice": False},
    )
    assert r.status_code == 201
    body = r.json()["data"]
    assert body["grade_queued"] is True
    assert body["ags_available"] is True
    assert "correct_index" not in body["detail"]["qx"]
    # BackgroundTasks run after response in TestClient
    assert called.get("launch_id") == "launch-xyz"
    assert called.get("attempt_id") == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
