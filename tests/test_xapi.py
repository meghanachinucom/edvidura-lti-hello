"""xAPI statement builder + optional DB store."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest

from app.modules.xapi import (
    build_quiz_attempt_statement,
    record_quiz_attempt,
    verbs,
)
from app.modules.xapi.builder import build_lesson_completed_statement


def test_quiz_statement_passed():
    tid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    stmt = build_quiz_attempt_statement(
        tenant_id=tid,
        subject="user-1",
        learner_name="Alice",
        attempt_id=uuid4(),
        score=2,
        max_score=3,
        course_label="Safety 101",
    )
    assert stmt["verb"]["id"] == verbs.VERB_PASSED
    assert stmt["result"]["score"]["raw"] == 2
    assert stmt["result"]["score"]["max"] == 3
    assert stmt["result"]["success"] is True
    assert stmt["actor"]["account"]["name"] == "user-1"
    assert stmt["actor"]["name"] == "Alice"
    assert tid in stmt["context"]["extensions"].values()


def test_quiz_statement_failed():
    stmt = build_quiz_attempt_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="",
        attempt_id=uuid4(),
        score=1,
        max_score=3,
    )
    assert stmt["verb"]["id"] == verbs.VERB_FAILED
    assert stmt["result"]["success"] is False


def test_lesson_completed_statement():
    lid = uuid4()
    stmt = build_lesson_completed_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Bob",
        lesson_id=lid,
        lesson_title="Intro",
    )
    assert stmt["verb"]["id"] == verbs.VERB_COMPLETED
    assert str(lid) in stmt["object"]["id"]


def _db_ok() -> bool:
    os.environ.setdefault(
        "DATABASE_URL",
        "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
    )
    try:
        from app import db

        with db.connect() as conn:
            conn.execute("SELECT 1 FROM xapi_statements LIMIT 1")
        return True
    except Exception:  # noqa: BLE001
        return False


@pytest.mark.skipif(not _db_ok(), reason="Postgres/xapi table not ready")
def test_record_quiz_attempt_persists():
    from app.tenancy import TENANT_A_ID

    subject = f"xapi-{uuid4().hex[:8]}"
    attempt_id = uuid4()
    row = record_quiz_attempt(
        tenant_id=TENANT_A_ID,
        subject=subject,
        learner_name="Test",
        attempt_id=attempt_id,
        score=3,
        max_score=3,
        course_label="demo",
        send_lrs=False,
    )
    assert str(row["actor_sub"]) == subject
    assert row["verb_id"] == verbs.VERB_PASSED
    assert row["statement"]["result"]["score"]["raw"] == 3
