"""Shared App API (web + mobile) envelope + auth."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_app_health_no_auth():
    from app.main import app

    client = TestClient(app)
    r = client.get("/api/v1/app/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["error"] is None
    assert body["data"]["contract"] == "edvidura.app.v1"
    assert "web" in body["data"]["platforms"]
    assert "mobile" in body["data"]["platforms"]


def test_app_session_requires_auth():
    from app.main import app

    client = TestClient(app)
    r = client.get("/api/v1/app/session")
    assert r.status_code == 401
    body = r.json()
    assert body["ok"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "auth_required"


def test_app_session_with_token(monkeypatch):
    from app.main import app
    from app.api.app_client import auth as app_auth

    fake = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "subject": "student-1",
        "learner_name": "Ada",
        "quiz_token": "tok-ada",
        "class_name": "Welding",
        "is_instructor": False,
        "is_school_admin": False,
        "lms_name": "Moodle",
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)

    client = TestClient(app)
    r = client.get(
        "/api/v1/app/session",
        headers={"Authorization": "Bearer tok-ada"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["data"]["subject"] == "student-1"
    assert body["data"]["token"] == "tok-ada"
    assert "launch_id" not in body["data"]


def _fake_session(monkeypatch, **over):
    from app.api.app_client import auth as app_auth
    from app.modules.tenancy.capabilities import defaults_for_segment

    fake = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "subject": "student-1",
        "learner_name": "Ada",
        "quiz_token": "tok-ada",
        "class_id": "22222222-2222-2222-2222-222222222222",
        "class_name": "Algebra I",
        "is_instructor": False,
        "is_school_admin": False,
        "segment": "school",
        "capabilities": defaults_for_segment("school"),
        "edvidura_course_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    }
    fake.update(over)
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)
    return fake


def test_launch_destination_spa_in_development(monkeypatch):
    monkeypatch.delenv("FRONTEND_SHELL", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000")
    from app.frontend_handoff import launch_destination, spa_enabled

    assert spa_enabled() is True
    assert launch_destination("abc") == "http://127.0.0.1:3000/?token=abc"
    assert launch_destination("abc", shell=True) == "/launch-hub?token=abc"


def test_launch_destination_bundled_spa_in_production(monkeypatch, tmp_path):
    idx = tmp_path / "index.html"
    idx.write_text("<!doctype html>", encoding="utf-8")
    monkeypatch.delenv("FRONTEND_SHELL", raising=False)
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("APP_BASE_URL", "https://edvidura-app-production.up.railway.app")
    from app import frontend_handoff as handoff

    monkeypatch.setattr(handoff, "spa_dist_index", lambda: idx)
    assert handoff.spa_enabled() is True
    assert handoff.launch_destination("abc") == "/app/?token=abc"


def test_cors_allows_vite_origin():
    from app.main import app

    client = TestClient(app)
    r = client.get(
        "/api/v1/app/health",
        headers={"Origin": "http://127.0.0.1:3000"},
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"


def test_app_home_and_lessons(monkeypatch):
    from app.main import app
    from app.modules import content
    from app.modules import tenancy as tenancy_mod

    _fake_session(monkeypatch)
    monkeypatch.setattr(tenancy_mod, "attach_to_session", lambda sess: sess)
    course = {
        "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "slug": "alg1",
        "title": "Algebra I",
    }
    lesson = {
        "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "slug": "slope",
        "title": "Slope",
        "position": 1,
        "lesson_type": "article",
        "status": "published",
        "course_id": course["id"],
        "body_md": "## Hello\n\nWorld",
        "video_url": "",
    }
    monkeypatch.setattr(content, "get_bound_course", lambda *a, **k: course)
    monkeypatch.setattr(
        content,
        "course_progress",
        lambda *a, **k: {
            "lessons": [lesson],
            "completed_ids": set(),
            "completed_count": 0,
            "total_count": 1,
            "percent": 0,
            "next_lesson": lesson,
            "all_lessons_done": False,
        },
    )
    monkeypatch.setattr(content, "get_lesson", lambda *a, **k: lesson)
    monkeypatch.setattr(content, "completed_lesson_ids", lambda *a, **k: set())
    monkeypatch.setattr(content, "list_lessons", lambda *a, **k: [lesson])
    monkeypatch.setattr(content, "neighbor_lessons", lambda *a, **k: (None, None))
    monkeypatch.setattr(content, "body_md_to_html", lambda md: f"<p>{md}</p>")

    client = TestClient(app)
    headers = {"Authorization": "Bearer tok-ada"}
    home = client.get("/api/v1/app/home", headers=headers)
    assert home.status_code == 200
    body = home.json()
    assert body["ok"] is True
    assert body["data"]["course"]["title"] == "Algebra I"
    assert body["data"]["lessons"][0]["title"] == "Slope"

    listed = client.get("/api/v1/app/lessons", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["data"]["lessons"][0]["id"] == lesson["id"]

    detail = client.get(f"/api/v1/app/lessons/{lesson['id']}", headers=headers)
    assert detail.status_code == 200
    assert "Hello" in detail.json()["data"]["lesson"]["body_html"]

    progress = client.get("/api/v1/app/progress", headers=headers)
    assert progress.status_code == 200
    assert progress.json()["data"]["total_count"] == 1


def test_app_attempts_learner_filters_subject(monkeypatch):
    from app.main import app
    from app.modules import quiz as quiz_mod
    from app.modules import tenancy as tenancy_mod

    _fake_session(monkeypatch)
    monkeypatch.setattr(tenancy_mod, "attach_to_session", lambda sess: sess)

    def _list(tenant_id, **kwargs):
        assert "subjects" in kwargs
        return [
            {
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "subject": "student-1",
                "learner_name": "Ada",
                "course_label": "Algebra",
                "score": 4,
                "max_score": 6,
                "grade_sent": False,
                "grade_error": "Grade passback queued…",
                "created_at": None,
            }
        ]

    monkeypatch.setattr(quiz_mod, "list_attempts_for_tenant", _list)
    client = TestClient(app)
    r = client.get(
        "/api/v1/app/attempts",
        headers={"Authorization": "Bearer tok-ada"},
    )
    assert r.status_code == 200
    items = r.json()["data"]["attempts"]
    assert items[0]["score"] == 4
    assert items[0]["status"] == "queued"


def test_app_analytics_staff_only(monkeypatch):
    from app.main import app
    from app.modules import analytics as analytics_mod

    _fake_session(monkeypatch, is_instructor=False)
    client = TestClient(app)
    denied = client.get(
        "/api/v1/app/analytics",
        headers={"Authorization": "Bearer tok-ada"},
    )
    assert denied.status_code == 403

    _fake_session(monkeypatch, is_instructor=True, subject="teacher-1")
    monkeypatch.setattr(
        analytics_mod,
        "tenant_dashboard",
        lambda *_a, **_k: {
            "attempt_count": 3,
            "learner_count": 2,
            "xapi_count": 9,
            "lesson_completions": 4,
            "xapi_verbs": [{"label": "answered", "count": 5}],
            "learner_heatmap": {
                "dates": ["2026-10-27"],
                "learners": [{"id": "a", "label": "Ada", "total": 1}],
                "cells": [[1]],
                "intensity": [[2]],
                "peak": 1,
            },
            "time_series": {"learners": [], "charts": [{"id": "activity_day"}]},
        },
    )
    ok = client.get(
        "/api/v1/app/analytics",
        headers={"Authorization": "Bearer tok-ada"},
    )
    assert ok.status_code == 200
    data = ok.json()["data"]
    assert data["xapi_count"] == 9
    assert data["lesson_completions"] == 4
    assert data["learner_heatmap"]["cells"] == [[1]]
    assert data["time_series"]["charts"][0]["id"] == "activity_day"


def test_envelope_helpers():
    import json

    from app.api.app_client.envelope import fail, ok

    good = ok({"a": 1}, meta={"count": 1})
    assert good.status_code == 200
    payload = json.loads(good.body.decode())
    assert payload == {"ok": True, "data": {"a": 1}, "error": None, "meta": {"count": 1}}
    bad = fail("nope", code="x", status_code=400)
    assert bad.status_code == 400
    err = json.loads(bad.body.decode())
    assert err["ok"] is False
    assert err["error"]["code"] == "x"
