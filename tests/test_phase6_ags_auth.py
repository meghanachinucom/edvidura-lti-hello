"""Tests for Phase 6 AGS Status Endpoint Authorisation & Ownership Enforcement."""
from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient


TENANT_A = "11111111-1111-1111-1111-111111111111"
TENANT_B = "22222222-2222-2222-2222-222222222222"


def _make_attempt(attempt_id: str, subject: str, tenant_id: str, grade_sent: bool = True):
    return {
        "id": attempt_id,
        "tenant_id": tenant_id,
        "subject": subject,
        "learner_name": f"Learner {subject}",
        "score": 4,
        "max_score": 5,
        "grade_sent": grade_sent,
        "grade_error": None,
        "answers": {"practice": False},
    }


def test_ags_status_own_attempt_permitted(monkeypatch):
    """Case 1: A learner can retrieve the AGS status of their own attempt."""
    from app.main import app
    from app import shell_routes, db

    attempt_id = uuid.uuid4()
    mock_attempt = _make_attempt(str(attempt_id), "student-alice", TENANT_A)

    session = {
        "tenant_id": TENANT_A,
        "subject": "student-alice",
        "is_instructor": False,
        "ags_available": True,
    }

    monkeypatch.setattr(shell_routes, "require_session", lambda *a, **k: session)
    monkeypatch.setattr(db, "get_quiz_attempt", lambda tid, aid: mock_attempt if str(tid) == TENANT_A and aid == attempt_id else None)

    client = TestClient(app)
    resp = client.get(f"/quiz/result/{attempt_id}/ags.json")

    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["status"] == "synced"
    assert body["grade_sent"] is True


def test_ags_status_other_learner_same_tenant_rejected(monkeypatch):
    """Case 2: A learner cannot retrieve another learner's AGS status, even within the same tenant."""
    from app.main import app
    from app import shell_routes, db

    attempt_id = uuid.uuid4()
    # Attempt belongs to Bob
    bob_attempt = _make_attempt(str(attempt_id), "student-bob", TENANT_A)

    # Session is Alice (different student in same tenant)
    alice_session = {
        "tenant_id": TENANT_A,
        "subject": "student-alice",
        "is_instructor": False,
        "ags_available": True,
    }

    monkeypatch.setattr(shell_routes, "require_session", lambda *a, **k: alice_session)
    monkeypatch.setattr(db, "get_quiz_attempt", lambda tid, aid: bob_attempt if str(tid) == TENANT_A and aid == attempt_id else None)

    client = TestClient(app)
    resp = client.get(f"/quiz/result/{attempt_id}/ags.json")

    assert resp.status_code == 403
    body = resp.json()
    assert body["ok"] is False
    assert body["error"] == "forbidden"


def test_ags_status_other_tenant_rejected(monkeypatch):
    """Case 3: Cross-tenant attempts must never be accessible (returns 404)."""
    from app.main import app
    from app import shell_routes, db

    attempt_id = uuid.uuid4()

    # Session is in Tenant A
    session_tenant_a = {
        "tenant_id": TENANT_A,
        "subject": "student-alice",
        "is_instructor": False,
        "ags_available": True,
    }

    # db.get_quiz_attempt enforces tenant_id, so lookup with Tenant A returns None
    monkeypatch.setattr(shell_routes, "require_session", lambda *a, **k: session_tenant_a)
    monkeypatch.setattr(db, "get_quiz_attempt", lambda tid, aid: None)

    client = TestClient(app)
    resp = client.get(f"/quiz/result/{attempt_id}/ags.json")

    assert resp.status_code == 404
    body = resp.json()
    assert body["ok"] is False
    assert body["error"] == "not_found"


def test_ags_status_instructor_access_permitted(monkeypatch):
    """Case 4: An authorised instructor can access student attempt AGS status in the same tenant."""
    from app.main import app
    from app import shell_routes, db

    attempt_id = uuid.uuid4()
    student_attempt = _make_attempt(str(attempt_id), "student-bob", TENANT_A)

    # Instructor session in Tenant A
    instructor_session = {
        "tenant_id": TENANT_A,
        "subject": "instructor-sharma",
        "is_instructor": True,
        "ags_available": True,
    }

    monkeypatch.setattr(shell_routes, "require_session", lambda *a, **k: instructor_session)
    monkeypatch.setattr(db, "get_quiz_attempt", lambda tid, aid: student_attempt if str(tid) == TENANT_A and aid == attempt_id else None)

    client = TestClient(app)
    resp = client.get(f"/quiz/result/{attempt_id}/ags.json")

    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["status"] == "synced"

