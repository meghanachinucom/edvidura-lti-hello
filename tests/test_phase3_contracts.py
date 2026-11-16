"""Contract tests for additive Phase 3 App API endpoints."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _mock_session(monkeypatch, is_staff: bool = False, tenant_id: str = "11111111-1111-1111-1111-111111111111"):
    from app.api.app_client import auth as app_auth
    from app.modules.tenancy.capabilities import defaults_for_segment

    session_data = {
        "tenant_id": tenant_id,
        "subject": "teacher-1" if is_staff else "student-1",
        "learner_name": "Test User",
        "quiz_token": "tok-phase3-test",
        "class_name": "Electrician 1st Year",
        "is_instructor": is_staff,
        "is_school_admin": False,
        "segment": "school",
        "capabilities": defaults_for_segment("school"),
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: session_data)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: session_data)
    return session_data


def test_ai_hint_endpoint_success(monkeypatch):
    from app.main import app

    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    # 1. Success response
    payload = {
        "prompt": "What is the primary function of a step-down transformer?",
        "correct_choice": "To decrease voltage and increase current",
        "lesson_excerpts": ["Transformers transfer electrical energy between circuits."],
    }
    res = client.post(
        "/api/v1/app/ai/hint",
        json=payload,
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["error"] is None
    assert "hint" in body["data"] or "text" in body["data"] or isinstance(body["data"], dict)


def test_ai_hint_endpoint_requires_auth():
    from app.main import app

    client = TestClient(app)
    res = client.post(
        "/api/v1/app/ai/hint",
        json={"prompt": "Some question"},
    )
    assert res.status_code == 401
    assert res.json()["ok"] is False
    assert res.json()["error"]["code"] == "auth_required"


def test_ai_hint_validation_failure(monkeypatch):
    from app.main import app

    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    # Empty prompt fails min_length validation
    res = client.post(
        "/api/v1/app/ai/hint",
        json={"prompt": ""},
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 422


def test_flashcards_endpoint_success(monkeypatch):
    from app.main import app

    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    res = client.get(
        "/api/v1/app/flashcards?limit=5",
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert "cards" in body["data"]
    assert isinstance(body["data"]["cards"], list)


def test_ai_author_staff_only(monkeypatch):
    from app.main import app

    # Non-staff student must get 403 Forbidden
    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    payload = {
        "prompt": "Create an introduction to Ohm's Law.",
        "mode": "lesson",
        "course_title": "Basic Electrical",
    }
    res = client.post(
        "/api/v1/app/ai/author",
        json=payload,
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 403
    assert res.json()["ok"] is False
    assert res.json()["error"]["code"] == "staff_required"

    # Instructor receives 200 OK
    _mock_session(monkeypatch, is_staff=True)
    res_staff = client.post(
        "/api/v1/app/ai/author",
        json=payload,
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res_staff.status_code == 200
    assert res_staff.json()["ok"] is True


def test_ai_remediation_success(monkeypatch):
    from app.main import app

    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    payload = {
        "skill_label": "Transformer Polarities",
        "skill_code": "ELEC-TR-01",
        "skill_description": "Understanding additive and subtractive polarity.",
        "course_title": "Transformers & AC Machines",
        "source_excerpt": "Polarity tests ensure proper secondary connections.",
    }
    res = client.post(
        "/api/v1/app/ai/remediation",
        json=payload,
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert isinstance(body["data"], dict)


def test_ai_simplify_success(monkeypatch):
    from app.main import app

    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    payload = {
        "body": "Lenz's law states that the direction of the electric current induced in a conductor by a changing magnetic field is such that the magnetic field created by the induced current opposes the initial changing magnetic field.",
        "title": "Lenz's Law Overview",
        "level": "simpler",
    }
    res = client.post(
        "/api/v1/app/ai/simplify",
        json=payload,
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert isinstance(body["data"], dict)


def test_classes_listing_staff_and_tenant(monkeypatch):
    from app.main import app
    from app.modules import school

    # 1. Non-staff is forbidden
    _mock_session(monkeypatch, is_staff=False)
    client = TestClient(app)

    res = client.get(
        "/api/v1/app/classes",
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res.status_code == 403

    # 2. Staff user succeeds without live postgresql running (mock list_classes_with_roster)
    _mock_session(monkeypatch, is_staff=True, tenant_id="11111111-1111-1111-1111-111111111111")
    fake_classes = [
        {
            "class_id": "c1",
            "name": "Electrician 1st Year",
            "subject": "Electrical",
            "student_count": 28,
        }
    ]
    monkeypatch.setattr(school, "list_classes_with_roster", lambda tid: fake_classes)

    res_staff = client.get(
        "/api/v1/app/classes",
        headers={"Authorization": "Bearer tok-phase3-test"},
    )
    assert res_staff.status_code == 200
    body = res_staff.json()
    assert body["ok"] is True
    assert isinstance(body["data"], list)
    assert len(body["data"]) == 1
    assert body["data"][0]["class_id"] == "c1"
