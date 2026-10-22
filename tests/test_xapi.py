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


def test_coach_interacted_statement_pii_light():
    from app.modules.xapi import build_coach_interacted_statement

    q = "How do I solve 2x + 3 = 7?"
    stmt = build_coach_interacted_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Alice",
        question=q,
        grounded=True,
        citation_count=2,
        course_title="Algebra",
        thread_id="coach-user-1-abc",
    )
    assert stmt["verb"]["id"] == verbs.VERB_INTERACTED
    assert "/study-coach/thread/" in stmt["object"]["id"]
    assert stmt["result"]["success"] is True
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/question_len"] == len(q)
    assert len(ext["https://edvidura.local/xapi/extensions/question_sha256"]) == 64
    assert ext["https://edvidura.local/xapi/extensions/question_preview"] == q
    assert "message_text" not in str(ext.keys()) or (
        "https://edvidura.local/xapi/extensions/message_text" not in ext
    )
    assert ext["https://edvidura.local/xapi/extensions/thread_id"] == "coach-user-1-abc"
    long_q = "x" * 200
    stmt2 = build_coach_interacted_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Alice",
        question=long_q,
    )
    prev = stmt2["context"]["extensions"][
        "https://edvidura.local/xapi/extensions/question_preview"
    ]
    assert len(prev) <= 121
    assert prev.endswith("…")


def test_coach_pebl_full_text_mode():
    from app.modules.xapi import build_coach_interacted_statement

    q = "Explain slope in one sentence."
    ans = "Slope is rise over run."
    stmt = build_coach_interacted_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Alice",
        question=q,
        answer_text=ans,
        include_full_text=True,
        thread_id="thread-9",
        access_level="class",
        grounded=True,
    )
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/message_text"] == q
    assert ext["https://edvidura.local/xapi/extensions/answer_text"] == ans
    assert ext["https://edvidura.local/xapi/extensions/access_level"] == "class"
    assert stmt["result"]["response"] == q
    assert stmt["object"]["definition"]["interactionType"] == "long-fill-in"


def test_present_statement_row_coach():
    from app.modules.xapi.activity import present_statement_row
    from app.modules.xapi import build_coach_interacted_statement

    stmt = build_coach_interacted_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Alice",
        question="What is a slope?",
        grounded=True,
        citation_count=1,
    )
    row = present_statement_row(
        {
            "statement_id": stmt["id"],
            "verb_id": stmt["verb"]["id"],
            "actor_sub": "user-1",
            "object_id": stmt["object"]["id"],
            "statement": stmt,
            "tier": "transactional",
            "sent_to_lrs": False,
            "created_at": None,
        }
    )
    assert row["verb_label"] == "Coach chat"
    assert "What is a slope?" in row["detail"]
    assert row["actor_name"] == "Alice"


def test_skill_assessed_statement_mastered():
    from app.modules.xapi import build_skill_assessed_statement

    aid = uuid4()
    stmt = build_skill_assessed_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="Alice",
        skill_code="solve_linear",
        skill_label="Solve linear",
        status="strong",
        percent=100,
        attempt_id=aid,
    )
    assert stmt["verb"]["id"] == verbs.VERB_MASTERED
    assert stmt["result"]["success"] is True
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/skill_code"] == "solve_linear"
    assert ext["https://edvidura.local/xapi/extensions/skill_status"] == "strong"
    assert str(aid) in ext.values()
    assert "/xapi/activities/skill/solve-linear" in stmt["object"]["id"]


def test_skill_assessed_statement_weak():
    from app.modules.xapi import build_skill_assessed_statement

    stmt = build_skill_assessed_statement(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject="user-1",
        learner_name="",
        skill_code="gradebook_sync",
        skill_label="Gradebook",
        status="weak",
        percent=0,
        attempt_id=uuid4(),
    )
    assert stmt["verb"]["id"] == verbs.VERB_FAILED
    assert stmt["result"]["success"] is False


def test_store_raw_statement_requires_actor():
    from app.modules.xapi import store_raw_statement

    try:
        store_raw_statement(
            tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            statement={"verb": {"id": "http://adlnet.gov/expapi/verbs/experienced"}},
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "actor" in str(exc).lower() or "actor_sub" in str(exc).lower()


def test_promote_tier_rejects_bad_tier():
    from app.modules.xapi import promote_tier

    try:
        promote_tier(
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "sid",
            tier="gold",
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "tier" in str(exc).lower()


def test_record_quiz_attempt_persists(monkeypatch):
    """Verify quiz attempt persistence and statement structure.

    Requires an explicitly configured, verified disposable test database.
    Fails closed if the target cannot be positively verified as a test database.
    """
    from tests.test_xapi_statement_identity import _get_verified_disposable_test_database_url
    test_dsn = _get_verified_disposable_test_database_url()
    if not test_dsn:
        pytest.skip(
            "Test requires an explicitly configured, verified disposable test database (EDVIDURA_TEST_DATABASE_URL). "
            "Failing closed to prevent writing to the application database."
        )

    import dataclasses
    from contextlib import contextmanager
    import psycopg
    from psycopg.rows import dict_row
    from app import db
    from app.settings import get_settings
    from app.tenancy import TENANT_A_ID

    mock_settings = dataclasses.replace(get_settings(), database_url=test_dsn)
    monkeypatch.setattr("app.settings.get_settings", lambda: mock_settings)
    monkeypatch.setattr("app.db.get_settings", lambda: mock_settings)
    monkeypatch.setattr("app.modules.xapi.service.get_settings", lambda: mock_settings)

    def test_connect():
        return psycopg.connect(test_dsn, row_factory=dict_row, connect_timeout=5)

    @contextmanager
    def test_tenant_conn(tenant_id):
        tid = str(tenant_id)
        with test_connect() as conn:
            with conn.transaction():
                conn.execute("SELECT set_config('app.tenant_id', %s, true)", (tid,))
                yield conn

    monkeypatch.setattr(db, "connect", test_connect)
    monkeypatch.setattr(db, "tenant_connection", test_tenant_conn)
    monkeypatch.setattr(db, "with_tenant", test_tenant_conn)

    subject = f"xapi-{uuid4().hex[:8]}"
    attempt_id = uuid4()
    row_sid = None
    try:
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
        row_sid = str(row["statement_id"])
        assert str(row["actor_sub"]) == subject
        assert row["verb_id"] == verbs.VERB_PASSED
        assert row["statement"]["result"]["score"]["raw"] == 3
    finally:
        if row_sid:
            try:
                with db.tenant_connection(TENANT_A_ID) as conn:
                    conn.execute("DELETE FROM xapi_statements WHERE statement_id = %s", (row_sid,))
            except Exception:
                pass
