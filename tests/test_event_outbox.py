"""EVENT_ENVELOPE_V1 builder + outbox (DB when available)."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest

from app.modules.events import build_envelope, enqueue_quiz_attempt_submitted, list_pending_for_tenant


def test_build_envelope_requires_tenant():
    with pytest.raises(ValueError, match="tenant_id"):
        build_envelope(event_type="quiz.attempt.submitted", tenant_id="  ")


def test_build_envelope_shape():
    tid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    env = build_envelope(
        event_type="quiz.attempt.submitted",
        tenant_id=tid,
        subject="user-1",
        payload={"score": 2},
    )
    assert env["event_type"] == "quiz.attempt.submitted"
    assert env["tenant_id"] == tid
    assert env["subject"] == "user-1"
    assert env["payload"]["score"] == 2
    assert env["event_id"]
    assert env["occurred_at"].endswith("Z") or "+" in env["occurred_at"]


def _db_ok() -> bool:
    os.environ.setdefault(
        "DATABASE_URL",
        "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
    )
    try:
        from app import db

        with db.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:  # noqa: BLE001
        return False


@pytest.mark.skipif(not _db_ok(), reason="Postgres not reachable")
def test_outbox_enqueue_quiz_attempt():
    from app.tenancy import TENANT_A_ID

    subject = f"outbox-{uuid4().hex[:8]}"
    row = enqueue_quiz_attempt_submitted(
        tenant_id=TENANT_A_ID,
        subject=subject,
        attempt_id=uuid4(),
        score=2,
        max_score=3,
        course_label="demo",
    )
    assert row["event_type"] == "quiz.attempt.submitted"
    pending = list_pending_for_tenant(TENANT_A_ID, limit=200)
    assert any(str(r["event_id"]) == str(row["event_id"]) for r in pending)
