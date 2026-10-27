"""App API class walls — no tenant-wide manuals / discuss IDOR for learners."""
from __future__ import annotations

from fastapi.testclient import TestClient


def _learner(monkeypatch, *, class_id=None, instructor=False):
    from app.api.app_client import auth as app_auth

    fake = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "subject": "student-1",
        "learner_name": "Ada",
        "quiz_token": "tok-ada",
        "class_id": class_id,
        "is_instructor": instructor,
        "is_school_admin": False,
        "lti_context_id": "ctx-1",
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)
    return fake


def test_app_manuals_empty_without_class(monkeypatch):
    from app.main import app
    from app.modules import manuals as manuals_mod

    _learner(monkeypatch, class_id=None)
    called = {"all": False}

    def _boom(*a, **k):
        called["all"] = True
        return [{"id": "x", "slug": "x", "title": "X", "description": "", "status": "published"}]

    monkeypatch.setattr(manuals_mod, "list_manuals", _boom)

    client = TestClient(app)
    r = client.get(
        "/api/v1/app/manuals",
        headers={"Authorization": "Bearer tok-ada"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["data"]["manuals"] == []
    assert called["all"] is False


def test_app_discuss_forbidden_without_class(monkeypatch):
    from app.main import app
    from uuid import UUID

    _learner(monkeypatch, class_id=None)
    mid = UUID("33333333-3333-3333-3333-333333333333")
    client = TestClient(app)
    r = client.get(
        f"/api/v1/app/manuals/{mid}/discussions",
        params={"chapter": "ppe"},
        headers={"Authorization": "Bearer tok-ada"},
    )
    assert r.status_code == 403
    body = r.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "forbidden"


def test_app_discuss_forbidden_when_not_visible(monkeypatch):
    from app.main import app
    from app.modules import manuals as manuals_mod
    from uuid import UUID

    _learner(
        monkeypatch,
        class_id="22222222-2222-2222-2222-222222222222",
    )
    monkeypatch.setattr(
        manuals_mod,
        "manual_visible_to_class",
        lambda *a, **k: False,
    )
    mid = UUID("33333333-3333-3333-3333-333333333333")
    client = TestClient(app)
    r = client.post(
        f"/api/v1/app/manuals/{mid}/discussions",
        headers={"Authorization": "Bearer tok-ada"},
        json={"chapter_slug": "ppe", "body": "hello"},
    )
    assert r.status_code == 403


def test_query_token_ignored_in_production(monkeypatch):
    from app.api.app_client import auth as app_auth
    from app.main import app

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: None)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: None)

    client = TestClient(app)
    r = client.get("/api/v1/app/session", params={"token": "secret-tok"})
    assert r.status_code == 401
