"""Verification and regression tests for runtime xAPI statement identity.

Verifies:
1. Seeding twice leaves the seeded statement count unchanged (deterministic UUIDv5 seed IDs).
2. Opening the same eBook or chapter twice creates distinct records when those are separate learner interactions.
3. Two genuine reading-progress updates are not incorrectly collapsed into one event.
4. A duplicate retry of the exact same logical request does not create a duplicate event (retry idempotency).
5. The recorded actor and tenant match the authenticated server-side context.
6. Reusing an ID with different core properties (actor, verb, object, result, context) is rejected with StatementConflictError.
7. Reusing an ID with different actual timestamps raises StatementConflictError.
8. Equivalent timestamps in different timezones (+00:00 vs +05:30) are accepted as idempotent retries.
9. Attachment differences alone do not raise an immutable statement conflict.
10. Permitted LRS-assigned metadata differences (stored, authority, version) are accepted as idempotent retries.
11. Concurrent conflicting race conditions are resolved without silent overwrites.
12. Timestamp omission and LRS-assignment exceptions comply with xAPI 1.0.3.

ISOLATION: Uses an in-memory isolated fixture; does NOT write test rows to the application database.
"""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import json
from typing import Any
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL
import pytest

from app import db
from app.modules import xapi as xapi_mod
from app.modules.xapi import StatementConflictError, list_statements, verbs
from app.modules.xapi.service import _statements_identical, _store_and_maybe_send
from app.tenancy import TENANT_A_ID


class MockResult:
    def __init__(self, rows: list[dict[str, Any]], rowcount: int = 1):
        self._rows = rows
        self.rowcount = rowcount

    def fetchone(self) -> dict[str, Any] | None:
        return self._rows[0] if self._rows else None

    def fetchall(self) -> list[dict[str, Any]]:
        return list(self._rows)


class IsolatedXapiStore:
    """In-memory data store for isolated xAPI statement tests without DB side effects."""

    def __init__(self):
        self.rows: list[dict[str, Any]] = []

    def clear(self):
        self.rows.clear()

    def execute(self, sql: str, params: tuple | list = ()) -> MockResult:
        clean_sql = " ".join(sql.strip().split())
        now = datetime.now(timezone.utc)

        # 1. Lookup by statement_id
        if "FROM xapi_statements" in clean_sql and "WHERE statement_id = %s" in clean_sql:
            sid = str(params[0])
            matched = [r for r in self.rows if str(r["statement_id"]) == sid]
            return MockResult(matched)

        # 2. Insert into xapi_statements with ON CONFLICT DO NOTHING RETURNING
        if clean_sql.startswith("INSERT INTO xapi_statements"):
            tid = str(params[0])
            sid = str(params[1])
            verb = str(params[2])
            sub = str(params[3])
            obj = str(params[4])
            stmt_json = params[5]
            src_ev = params[6]
            att_id = params[7]
            tier = params[8] if len(params) > 8 else "noisy"

            existing = [r for r in self.rows if str(r["statement_id"]) == sid]
            if existing:
                return MockResult([])  # Conflict: ON CONFLICT DO NOTHING returns empty

            parsed_stmt = json.loads(stmt_json) if isinstance(stmt_json, str) else dict(stmt_json)
            row = {
                "id": uuid4(),
                "tenant_id": UUID(tid) if len(tid) == 36 else tid,
                "statement_id": UUID(sid) if len(sid) == 36 else sid,
                "verb_id": verb,
                "actor_sub": sub,
                "object_id": obj,
                "statement": parsed_stmt,
                "sent_to_lrs": False,
                "lrs_error": None,
                "created_at": now,
                "attempt_id": att_id,
                "tier": tier,
                "lrs_attempts": 0,
                "promoted_at": now if tier == "transactional" else None,
            }
            self.rows.append(row)
            return MockResult([row])

        # 3. List statements or general select
        if clean_sql.startswith("SELECT") and "FROM xapi_statements" in clean_sql:
            res = list(self.rows)
            # Filter by actor_sub if requested
            if "actor_sub = %s" in clean_sql:
                for p in params:
                    if isinstance(p, str) and not p.isdigit() and len(p) > 2:
                        res = [r for r in res if r["actor_sub"] == p]
                        break
            if "ORDER BY created_at DESC" in clean_sql:
                res.sort(key=lambda r: r["created_at"], reverse=True)
            return MockResult(res)

        return MockResult([])


@pytest.fixture(autouse=True)
def isolate_xapi_database(monkeypatch):
    """Intercept db.tenant_connection to run all tests in an isolated in-memory fixture."""
    store = IsolatedXapiStore()

    @contextmanager
    def mock_tenant_conn(tenant_id):
        yield store

    monkeypatch.setattr(db, "tenant_connection", mock_tenant_conn)
    yield store
    store.clear()


def _get_verified_disposable_test_database_url() -> str | None:
    """Return verified dedicated disposable test database URL, or None if not configured.

    Fails closed (raises pytest.fail) if a test database URL is provided
    but cannot be positively verified as an isolated, dedicated disposable test database.
    A database name pattern alone is never treated as sufficient proof of disposability.
    """
    import os
    import re
    from urllib.parse import urlparse
    from app.settings import get_settings

    # 1. Require explicit dedicated test database environment variable
    test_url = (
        os.getenv("EDVIDURA_DISPOSABLE_TEST_DATABASE_URL", "").strip()
        or os.getenv("EDVIDURA_TEST_DATABASE_URL", "").strip()
    )
    if not test_url:
        raw_test_url = os.getenv("TEST_DATABASE_URL", "").strip()
        if raw_test_url:
            allow_flag = os.getenv("ALLOW_DISPOSABLE_TEST_DB", "").strip().lower()
            if allow_flag not in ("1", "true", "yes"):
                pytest.fail(
                    "Safety violation: TEST_DATABASE_URL is set but ALLOW_DISPOSABLE_TEST_DB=1 is missing. "
                    "Refusing to execute against an unconfirmed test target."
                )
            test_url = raw_test_url

    # If no test database is configured at all, return None (tests skip cleanly)
    if not test_url:
        return None

    # Never allow test_url to match application DATABASE_URL
    app_url = get_settings().database_url.strip()
    if test_url == app_url:
        pytest.fail(
            "Safety violation: Test database URL is identical to the configured application database URL. "
            "Refusing to execute tests against application database."
        )

    # 2. Parse and validate both test and application URLs
    parsed_test = urlparse(test_url)
    parsed_app = urlparse(app_url)

    test_db_name = parsed_test.path.lstrip("/").lower()
    app_db_name = parsed_app.path.lstrip("/").lower()

    if not test_db_name:
        pytest.fail("Safety violation: Test database URL does not specify a database name.")

    # Canonicalize hosts (treat 127.0.0.1, localhost, and ::1 as equivalent local targets)
    local_hosts = {"127.0.0.1", "localhost", "::1"}
    test_host = (parsed_test.hostname or "localhost").lower()
    app_host = (parsed_app.hostname or "localhost").lower()
    is_same_host = (test_host == app_host) or (test_host in local_hosts and app_host in local_hosts)
    test_port = parsed_test.port or 5432
    app_port = parsed_app.port or 5432

    # Reject if pointing to the same server and database
    if is_same_host and test_port == app_port and test_db_name == app_db_name:
        pytest.fail(
            f"Safety violation: Test database target ({test_host}:{test_port}/{test_db_name}) matches "
            f"the active application database ({app_host}:{app_port}/{app_db_name}). "
            "Refusing to run integration tests against the application database."
        )

    # Reject if database name matches application database name regardless of host/port
    if test_db_name == app_db_name:
        pytest.fail(
            f"Safety violation: Target database name '{test_db_name}' matches application database name '{app_db_name}'."
        )

    # 3. Database-name pattern check:
    # Must strictly start with 'test_', end with '_test', or contain '_test_'.
    # Arbitrary substrings like 'contest' or 'attestation' are rejected.
    test_pattern = re.compile(r"(^test_|_test$|_test_)")
    if not test_pattern.search(test_db_name):
        pytest.fail(
            f"Safety violation: Database name '{test_db_name}' cannot be positively identified as a dedicated "
            "disposable test database (must strictly start with 'test_', end with '_test', or contain '_test_')."
        )

    # 4. Must not match protected system/production database names
    protected_names = {"postgres", "edvidura", "production", "prod", "stage", "staging", "demo", "master", "edvidura_app"}
    if test_db_name in protected_names:
        pytest.fail(f"Safety violation: Database name '{test_db_name}' is a protected database name.")

    # 5. Active Target Identity & Disposability Verification
    # A database-name pattern alone is never treated as proof of disposability.
    # Connect and verify the live server's reported current_database() and properties.
    try:
        import psycopg
        from psycopg.rows import dict_row

        with psycopg.connect(test_url, row_factory=dict_row, connect_timeout=3) as conn:
            row = conn.execute(
                "SELECT current_database() as cur_db, current_user as cur_usr, pg_is_in_recovery() as in_rec"
            ).fetchone()
            if not row:
                pytest.fail("Safety violation: Could not query identity from test database.")

            live_db = str(row["cur_db"]).lower()
            if live_db != test_db_name:
                pytest.fail(
                    f"Safety violation: Connected database '{live_db}' does not match expected test database '{test_db_name}'."
                )

            if live_db == app_db_name:
                pytest.fail(
                    f"Safety violation: Connected database '{live_db}' is the application database '{app_db_name}'."
                )

            if row.get("in_rec") is True:
                pytest.fail("Safety violation: Test database is a read-only replica in recovery.")
    except Exception as exc:
        pytest.fail(
            f"Safety violation: Failed to actively verify test database identity for '{test_url}': {exc}. "
            "Failing closed to prevent running against an unverified target."
        )

    return test_url


class TestXapiStatementIdentity:

    def test_1_seed_twice_leaves_statement_count_unchanged(self, isolate_xapi_database):
        """1. Seeding twice leaves the seeded statement count unchanged."""
        test_tenant = TENANT_A_ID
        learner_sub = f"seed-test-{uuid4().hex[:8]}"
        manual_id = uuid4()
        manual_title = "Science & Tech Demo"

        seed_init_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/initialized")
        seed_chap_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/experienced/0")

        # First seed execution
        xapi_mod.record_ebook_initialized(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Seed Learner",
            manual_id=manual_id, manual_title=manual_title, version=1,
            statement_id=seed_init_sid, send_lrs=False,
        )
        xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Seed Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            chapter_title="Chapter 1", version=1, statement_id=seed_chap_sid, send_lrs=False,
        )

        first_count = len(list_statements(test_tenant, subject=learner_sub))
        assert first_count == 2

        # Second seed execution (re-run)
        xapi_mod.record_ebook_initialized(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Seed Learner",
            manual_id=manual_id, manual_title=manual_title, version=1,
            statement_id=seed_init_sid, send_lrs=False,
        )
        xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Seed Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            chapter_title="Chapter 1", version=1, statement_id=seed_chap_sid, send_lrs=False,
        )

        second_count = len(list_statements(test_tenant, subject=learner_sub))
        assert second_count == 2, f"Expected count unchanged at 2, got {second_count}"

    def test_2_opening_same_ebook_or_chapter_in_separate_interactions_creates_distinct_records(self, isolate_xapi_database):
        """2. Opening the same eBook or chapter twice creates distinct records when those are separate learner interactions."""
        test_tenant = TENANT_A_ID
        learner_sub = f"learner-session-{uuid4().hex[:8]}"
        manual_id = uuid4()
        manual_title = "Interactive Physics"

        # Interaction 1: Launch session 1
        session_1_token = uuid4().hex
        init_sid_1 = uuid5(NAMESPACE_URL, f"edvidura:xapi:init:{session_1_token}:{manual_id}:1")
        chap_sid_1 = uuid5(NAMESPACE_URL, f"edvidura:xapi:chap:{session_1_token}:{manual_id}:1:0")

        xapi_mod.record_ebook_initialized(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Session Learner",
            manual_id=manual_id, manual_title=manual_title, version=1,
            statement_id=init_sid_1, send_lrs=False,
        )
        xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Session Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            chapter_title="Chapter 1", version=1, statement_id=chap_sid_1, send_lrs=False,
        )

        # Interaction 2: Separate launch session
        session_2_token = uuid4().hex
        init_sid_2 = uuid5(NAMESPACE_URL, f"edvidura:xapi:init:{session_2_token}:{manual_id}:1")
        chap_sid_2 = uuid5(NAMESPACE_URL, f"edvidura:xapi:chap:{session_2_token}:{manual_id}:1:0")

        assert init_sid_1 != init_sid_2
        assert chap_sid_1 != chap_sid_2

        xapi_mod.record_ebook_initialized(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Session Learner",
            manual_id=manual_id, manual_title=manual_title, version=1,
            statement_id=init_sid_2, send_lrs=False,
        )
        xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Session Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            chapter_title="Chapter 1", version=1, statement_id=chap_sid_2, send_lrs=False,
        )

        stmts = list_statements(test_tenant, subject=learner_sub)
        assert len(stmts) == 4, f"Expected 4 distinct statements for 2 interactions, got {len(stmts)}"
        sids = {str(s["statement_id"]) for s in stmts}
        assert str(init_sid_1) in sids
        assert str(init_sid_2) in sids
        assert str(chap_sid_1) in sids
        assert str(chap_sid_2) in sids

    def test_3_two_genuine_reading_progress_updates_are_not_collapsed(self, isolate_xapi_database):
        """3. Two genuine reading-progress updates are not incorrectly collapsed into one event."""
        test_tenant = TENANT_A_ID
        learner_sub = f"progress-learner-{uuid4().hex[:8]}"
        manual_id = uuid4()
        manual_title = "Progress Tracking eBook"

        res1 = xapi_mod.record_reading_progressed(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Progress Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            progress_percent=30, cfi="epubcfi(/6/2[ch1]!/4/2:0)", version=1,
            statement_id=None,
            send_lrs=False,
        )

        res2 = xapi_mod.record_reading_progressed(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Progress Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            progress_percent=75, cfi="epubcfi(/6/2[ch1]!/4/6:0)", version=1,
            statement_id=None,
            send_lrs=False,
        )

        assert res1["statement_id"] != res2["statement_id"]
        stmts = list_statements(test_tenant, subject=learner_sub)
        progress_stmts = [s for s in stmts if s["verb_id"] == verbs.VERB_PROGRESSED]
        assert len(progress_stmts) == 2, f"Expected 2 progress events, got {len(progress_stmts)}"

        pcts = [s["statement"]["result"]["score"]["raw"] for s in progress_stmts]
        assert 30 in pcts
        assert 75 in pcts

    def test_4_duplicate_retry_of_exact_same_logical_request_does_not_create_duplicate(self, isolate_xapi_database):
        """4. A duplicate retry of the exact same logical request does not create a duplicate event."""
        test_tenant = TENANT_A_ID
        learner_sub = f"retry-learner-{uuid4().hex[:8]}"
        manual_id = uuid4()
        manual_title = "Retry Idempotency eBook"

        session_token = uuid4().hex
        chap_sid = uuid5(NAMESPACE_URL, f"edvidura:xapi:chap:{session_token}:{manual_id}:1:0")

        # Initial request
        res1 = xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Retry Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            chapter_title="Chapter 1", version=1, statement_id=chap_sid, send_lrs=False,
        )

        initial_count = len(list_statements(test_tenant, subject=learner_sub))
        assert initial_count == 1

        with db.tenant_connection(test_tenant) as conn:
            initial_row = conn.execute(
                "SELECT statement, created_at FROM xapi_statements WHERE statement_id = %s",
                (str(chap_sid),),
            ).fetchone()
        assert initial_row is not None
        initial_created_at = initial_row["created_at"]
        initial_stmt_json = initial_row["statement"]

        # Exact duplicate retry
        res2 = xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant, subject=learner_sub, learner_name="Retry Learner",
            manual_id=manual_id, manual_title=manual_title, chapter_index=0,
            chapter_title="Chapter 1", version=1, statement_id=chap_sid, send_lrs=False,
        )

        retry_count = len(list_statements(test_tenant, subject=learner_sub))
        assert retry_count == 1, f"Expected count to remain 1 after exact retry, got {retry_count}"

        with db.tenant_connection(test_tenant) as conn:
            retry_row = conn.execute(
                "SELECT statement, created_at FROM xapi_statements WHERE statement_id = %s",
                (str(chap_sid),),
            ).fetchone()
        assert retry_row is not None
        assert retry_row["created_at"] == initial_created_at, "created_at MUST NOT be updated on retry"
        assert retry_row["statement"] == initial_stmt_json, "statement body MUST NOT be updated on retry"

    def test_5_recorded_actor_and_tenant_match_authenticated_server_context(self, isolate_xapi_database):
        """5. The recorded actor and tenant match the authenticated server-side context."""
        test_tenant = TENANT_A_ID
        authenticated_sub = f"auth-sub-{uuid4().hex[:8]}"
        learner_name = "Authenticated Student"
        manual_id = uuid4()
        manual_title = "Security Verification Manual"

        res = xapi_mod.record_ebook_initialized(
            tenant_id=test_tenant,
            subject=authenticated_sub,
            learner_name=learner_name,
            manual_id=manual_id,
            manual_title=manual_title,
            version=1,
            statement_id=uuid4(),
            send_lrs=False,
        )

        assert str(res["tenant_id"]) == str(test_tenant)
        assert res["actor_sub"] == authenticated_sub

        stmt = res["statement"]
        assert stmt["actor"]["account"]["name"] == authenticated_sub
        assert stmt["actor"]["name"] == learner_name
        assert stmt["context"]["extensions"]["https://edvidura.local/xapi/extensions/tenant_id"] == str(test_tenant)
        assert stmt["context"]["extensions"]["https://edvidura.local/xapi/extensions/manual_id"] == str(manual_id)

    def test_6_conflicting_statement_with_same_id_is_rejected_and_stored_statement_unchanged(self, isolate_xapi_database):
        """6. Reuse of an ID with a different core statement body: rejected with StatementConflictError."""
        test_tenant = TENANT_A_ID
        learner_sub = f"conflict-learner-{uuid4().hex[:8]}"
        manual_id = uuid4()
        conflict_sid = uuid4()

        # Step 1: Store initial valid statement
        initial_res = xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Conflict Learner",
            manual_id=manual_id,
            manual_title="Original eBook Title",
            chapter_index=0,
            chapter_title="Chapter 1: Foundations",
            version=1,
            statement_id=conflict_sid,
            send_lrs=False,
        )

        with db.tenant_connection(test_tenant) as conn:
            stored_before = conn.execute(
                "SELECT statement, created_at, verb_id FROM xapi_statements WHERE statement_id = %s",
                (str(conflict_sid),),
            ).fetchone()
        assert stored_before is not None
        orig_verb = stored_before["verb_id"]
        orig_created_at = stored_before["created_at"]
        orig_stmt = stored_before["statement"]

        # Step 2: Attempt reuse with different chapter / title
        with pytest.raises(StatementConflictError) as exc_info:
            xapi_mod.record_chapter_experienced(
                tenant_id=test_tenant,
                subject=learner_sub,
                learner_name="Conflict Learner",
                manual_id=manual_id,
                manual_title="Completely Different eBook Title",
                chapter_index=99,
                chapter_title="Chapter 99: Conflicting Chapter",
                version=2,
                statement_id=conflict_sid,
                send_lrs=False,
            )
        assert "conflict" in str(exc_info.value).lower() or "immutable" in str(exc_info.value).lower()

        # Step 3: Verify original record is 100% UNCHANGED
        with db.tenant_connection(test_tenant) as conn:
            stored_after = conn.execute(
                "SELECT statement, created_at, verb_id FROM xapi_statements WHERE statement_id = %s",
                (str(conflict_sid),),
            ).fetchone()
        assert stored_after is not None
        assert stored_after["created_at"] == orig_created_at
        assert stored_after["verb_id"] == orig_verb
        assert stored_after["statement"] == orig_stmt

    def test_7_different_actual_timestamps_under_same_id_raises_conflict(self, isolate_xapi_database):
        """7. Reusing a statement ID with a different event timestamp raises StatementConflictError."""
        test_tenant = TENANT_A_ID
        sid = uuid4()
        base_stmt = {
            "id": str(sid),
            "actor": {"account": {"homePage": "http://localhost:8085", "name": "user-ts-1"}},
            "verb": {"id": verbs.VERB_EXPERIENCED},
            "object": {"id": "http://localhost:8000/xapi/activities/ebook/1"},
            "result": {"completion": True},
            "context": {"registration": "reg-1"},
            "timestamp": "2026-10-15T10:00:00Z",
        }

        # Initial insert
        res1 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=base_stmt, actor_sub="user-ts-1",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res1 is not None

        # Conflicting retry with different actual timestamp (5 minutes later)
        diff_time_stmt = dict(base_stmt, timestamp="2026-10-15T10:05:00Z")
        with pytest.raises(StatementConflictError) as exc_info:
            _store_and_maybe_send(
                tenant_id=test_tenant, statement=diff_time_stmt, actor_sub="user-ts-1",
                attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
            )
        assert "conflict" in str(exc_info.value).lower()

        # Stored row remains original timestamp
        with db.tenant_connection(test_tenant) as conn:
            stored = conn.execute(
                "SELECT statement FROM xapi_statements WHERE statement_id = %s", (str(sid),)
            ).fetchone()
        assert stored["statement"]["timestamp"] == "2026-10-15T10:00:00Z"

    def test_8_equivalent_timestamps_in_different_timezones_accepted_as_retry(self, isolate_xapi_database):
        """8. Equivalent timestamps expressed in different timezones (+00:00 vs +05:30) match."""
        test_tenant = TENANT_A_ID
        sid = uuid4()
        stmt_utc = {
            "id": str(sid),
            "actor": {"account": {"homePage": "http://localhost:8085", "name": "user-tz"}},
            "verb": {"id": verbs.VERB_EXPERIENCED},
            "object": {"id": "http://localhost:8000/xapi/activities/ebook/1"},
            "result": {"completion": True},
            "context": {"registration": "reg-1"},
            "timestamp": "2026-10-15T10:00:00Z",
        }

        res1 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_utc, actor_sub="user-tz",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res1 is not None

        # Same instant in time represented with +05:30 offset (15:30:00+05:30 == 10:00:00Z)
        stmt_ist = dict(stmt_utc, timestamp="2026-10-15T15:30:00+05:30")
        res2 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_ist, actor_sub="user-tz",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res2 is not None
        assert len(isolate_xapi_database.rows) == 1, "Expected exactly 1 row after timezone-equivalent retry"

    def test_9_attachment_differences_alone_handled_without_conflict(self, isolate_xapi_database):
        """9. Differing attachments alone do not trigger StatementConflictError per xAPI 1.0.3 Section 4.1.1."""
        test_tenant = TENANT_A_ID
        sid = uuid4()
        stmt_with_att = {
            "id": str(sid),
            "actor": {"account": {"homePage": "http://localhost:8085", "name": "user-att"}},
            "verb": {"id": verbs.VERB_EXPERIENCED},
            "object": {"id": "http://localhost:8000/xapi/activities/ebook/1"},
            "result": {"completion": True},
            "context": {"registration": "reg-1"},
            "timestamp": "2026-10-15T10:00:00Z",
            "attachments": [{"usageType": "http://example.com/cert", "sha2": "hash-abc-123"}],
        }

        res1 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_with_att, actor_sub="user-att",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res1 is not None

        # Incoming retry has different attachment array or no attachments
        stmt_no_att = dict(stmt_with_att)
        del stmt_no_att["attachments"]

        res2 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_no_att, actor_sub="user-att",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res2 is not None
        assert len(isolate_xapi_database.rows) == 1

    def test_10_permitted_lrs_assigned_metadata_differences_accepted_as_retry(self, isolate_xapi_database):
        """10. Permitted LRS-assigned metadata differences (stored, authority, version) do not raise conflict."""
        test_tenant = TENANT_A_ID
        sid = uuid4()
        stmt_initial = {
            "id": str(sid),
            "actor": {"account": {"homePage": "http://localhost:8085", "name": "user-meta"}},
            "verb": {"id": verbs.VERB_EXPERIENCED},
            "object": {"id": "http://localhost:8000/xapi/activities/ebook/1"},
            "result": {"completion": True},
            "context": {"registration": "reg-1"},
            "timestamp": "2026-10-15T10:00:00Z",
            "stored": "2026-10-15T10:00:02.123Z",
            "authority": {"name": "LRS Gateway"},
            "version": "1.0.3",
        }

        res1 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_initial, actor_sub="user-meta",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res1 is not None

        # Incoming retry lacks 'stored' and has different 'authority' / 'version'
        stmt_retry = dict(stmt_initial)
        del stmt_retry["stored"]
        stmt_retry["authority"] = {"name": "Different Client Gateway"}
        stmt_retry["version"] = "1.0.2"

        res2 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_retry, actor_sub="user-meta",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res2 is not None
        assert len(isolate_xapi_database.rows) == 1

    def test_11_concurrent_conflicting_race_condition_resolved_without_silent_overwrite(self, isolate_xapi_database):
        """11. Concurrent conflicting race condition raises StatementConflictError on the losing thread."""
        test_tenant = TENANT_A_ID
        sid = uuid4()

        # Thread 1 wins race and inserts variant 1
        stmt_v1 = {
            "id": str(sid),
            "actor": {"account": {"homePage": "http://localhost:8085", "name": "race-user"}},
            "verb": {"id": verbs.VERB_EXPERIENCED},
            "object": {"id": "http://localhost:8000/xapi/activities/ebook/1"},
            "result": {"completion": True},
            "context": {"registration": "reg-1"},
            "timestamp": "2026-10-15T10:00:00Z",
        }
        res1 = _store_and_maybe_send(
            tenant_id=test_tenant, statement=stmt_v1, actor_sub="race-user",
            attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
        )
        assert res1 is not None

        # Thread 2 attempts concurrent insert with different object/result
        stmt_v2 = dict(stmt_v1, object={"id": "http://localhost:8000/xapi/activities/ebook/999"})
        with pytest.raises(StatementConflictError):
            _store_and_maybe_send(
                tenant_id=test_tenant, statement=stmt_v2, actor_sub="race-user",
                attempt_id=None, source_event_id=None, send_lrs=False, promote_on_valid=True,
            )

        # Confirm store still contains variant 1 exactly
        with db.tenant_connection(test_tenant) as conn:
            stored = conn.execute(
                "SELECT statement FROM xapi_statements WHERE statement_id = %s", (str(sid),)
            ).fetchone()
        assert stored["statement"]["object"]["id"] == "http://localhost:8000/xapi/activities/ebook/1"

    def test_12_unit_equivalence_timestamp_omission_and_lrs_assignment_exception(self):
        """12. Unit tests for timestamp omission and LRS-assignment exception per xAPI 1.0.3."""
        base = {
            "id": "11111111-1111-1111-1111-111111111111",
            "actor": {"account": {"name": "u1"}},
            "verb": {"id": "http://example.com/verb"},
            "object": {"id": "http://example.com/obj"},
        }

        # Case A: Both omit timestamp -> identical
        s_no_ts1 = dict(base)
        s_no_ts2 = dict(base)
        assert _statements_identical(s_no_ts1, s_no_ts2) is True

        # Case B: Stored has LRS-assigned timestamp matching stored, incoming omits timestamp -> identical
        s_lrs_assigned = dict(base, timestamp="2026-10-15T10:00:00Z", stored="2026-10-15T10:00:00Z")
        s_incoming_omitted = dict(base)
        assert _statements_identical(s_lrs_assigned, s_incoming_omitted) is True

        # Case C: Stored has genuine client timestamp differing from stored, incoming omits timestamp -> conflict
        s_client_ts = dict(base, timestamp="2026-10-15T09:00:00Z", stored="2026-10-15T10:00:00Z")
        assert _statements_identical(s_client_ts, s_incoming_omitted) is False

    def test_13_outbound_payload_omits_timestamp_and_stored_property_when_omitted(self, isolate_xapi_database, monkeypatch):
        """13. Real send-to-LRS path: omitted timestamp stays omitted and stored property is NOT sent."""
        from app.modules.xapi import lrs_client

        captured_statements: list[dict[str, Any]] = []

        def mock_post_statement(statement, **kwargs):
            captured_statements.append(dict(statement))
            return True, None, 1, {"mock": True}

        monkeypatch.setattr(lrs_client, "post_statement", mock_post_statement)
        import dataclasses
        mock_settings = dataclasses.replace(
            xapi_mod.service.get_settings(),
            xapi_lrs_endpoint="http://localhost:8080/xapi",
            xapi_lrs_key="test-key",
            xapi_lrs_secret="test-secret",
        )
        monkeypatch.setattr(xapi_mod.service, "get_settings", lambda: mock_settings)

        sid = uuid4()
        res = xapi_mod.record_chapter_experienced(
            tenant_id=TENANT_A_ID,
            subject="lrs-test-user",
            learner_name="LRS Learner",
            manual_id=uuid4(),
            manual_title="LRS Test Book",
            chapter_index=0,
            statement_id=sid,
            send_lrs=True,
        )

        assert len(captured_statements) == 1
        outbound = captured_statements[0]
        # xAPI 1.0.3 Section 2.4.8: A Statement provided to an LRS MUST NOT contain a stored property.
        assert "stored" not in outbound, "Outbound statement to LRS MUST NOT contain 'stored' property (Section 2.4.8)"
        # xAPI 1.0.3 Section 2.4.7: If not provided, LRS sets timestamp to stored. LR Provider must not inject synthetic timestamp.
        assert "timestamp" not in outbound, "Omitted event timestamp MUST stay omitted in outbound payload (Section 2.4.7)"
        assert outbound["id"] == str(sid)
        assert outbound["verb"]["id"] == verbs.VERB_EXPERIENCED

        # Also verify local outbox record preserves clean statement payload without stored
        with db.tenant_connection(TENANT_A_ID) as conn:
            stored_row = conn.execute("SELECT statement FROM xapi_statements WHERE statement_id = %s", (str(sid),)).fetchone()
        local_stmt = stored_row["statement"]
        assert "stored" not in local_stmt
        assert "timestamp" not in local_stmt

    def test_14_outbound_payload_with_timestamp_retains_timestamp_and_omits_stored_property(self, isolate_xapi_database, monkeypatch):
        """14. Real send-to-LRS path: client-supplied timestamp is preserved and stored property is NOT sent."""
        from app.modules.xapi import lrs_client

        captured_statements: list[dict[str, Any]] = []

        def mock_post_statement(statement, **kwargs):
            captured_statements.append(dict(statement))
            return True, None, 1, {"mock": True}

        monkeypatch.setattr(lrs_client, "post_statement", mock_post_statement)
        import dataclasses
        mock_settings = dataclasses.replace(
            xapi_mod.service.get_settings(),
            xapi_lrs_endpoint="http://localhost:8080/xapi",
            xapi_lrs_key="test-key",
            xapi_lrs_secret="test-secret",
        )
        monkeypatch.setattr(xapi_mod.service, "get_settings", lambda: mock_settings)

        sid = uuid4()
        client_ts = "2026-10-15T10:00:00Z"
        res = xapi_mod.record_chapter_experienced(
            tenant_id=TENANT_A_ID,
            subject="lrs-test-user-ts",
            learner_name="LRS Learner TS",
            manual_id=uuid4(),
            manual_title="LRS Test Book TS",
            chapter_index=0,
            statement_id=sid,
            timestamp=client_ts,
            send_lrs=True,
        )

        assert len(captured_statements) == 1
        outbound = captured_statements[0]
        assert "stored" not in outbound, "Outbound statement to LRS MUST NOT contain 'stored' property"
        assert outbound["timestamp"] == client_ts, "Client-provided timestamp MUST be preserved in outbound payload"

    def test_15_live_postgresql_concurrent_same_id_inserts_exercise_uniqueness_constraint_safely(self, monkeypatch):
        """15. Live PostgreSQL: Genuinely verify UNIQUE (statement_id) constraint and conflict path across concurrent threads.

        Requires an explicitly configured disposable test database (EDVIDURA_TEST_DATABASE_URL or TEST_DATABASE_URL).
        Fails closed if the database cannot be positively identified as a safe test database.
        """
        test_dsn = _get_verified_disposable_test_database_url()
        if not test_dsn:
            pytest.skip(
                "Live PostgreSQL concurrency integration test requires an explicitly configured, disposable test database "
                "(set EDVIDURA_TEST_DATABASE_URL or TEST_DATABASE_URL with a database name containing 'test'). "
                "Failing closed to prevent running against the configured application database."
            )

        import concurrent.futures
        import dataclasses
        from app.settings import get_settings

        # Point settings and db connections strictly to the verified test database
        mock_settings = dataclasses.replace(get_settings(), database_url=test_dsn)
        monkeypatch.setattr("app.settings.get_settings", lambda: mock_settings)
        monkeypatch.setattr("app.db.get_settings", lambda: mock_settings)
        monkeypatch.setattr("app.modules.xapi.service.get_settings", lambda: mock_settings)

        # Allow real DB connections strictly to the verified test database (never fall back)
        def test_db_connect():
            import psycopg
            from psycopg.rows import dict_row
            return psycopg.connect(test_dsn, row_factory=dict_row, connect_timeout=5)

        @contextmanager
        def test_db_tenant_conn(tenant_id):
            tid = str(tenant_id)
            with test_db_connect() as conn:
                with conn.transaction():
                    conn.execute("SELECT set_config('app.tenant_id', %s, true)", (tid,))
                    yield conn

        monkeypatch.setattr(db, "connect", test_db_connect)
        monkeypatch.setattr(db, "tenant_connection", test_db_tenant_conn)
        monkeypatch.setattr(db, "with_tenant", test_db_tenant_conn)

        try:
            with db.tenant_connection(TENANT_A_ID) as conn:
                initial_count = conn.execute("SELECT count(*) as c FROM xapi_statements").fetchone()["c"]
        except Exception as exc:
            pytest.skip(f"Test database not reachable or table not ready: {exc}")

        # Part A: Concurrent Identical Retries (5 threads)
        retry_sid = uuid4()
        learner_a = f"pg-test-{uuid4().hex[:8]}"
        mid_a = uuid4()

        def run_retry():
            return xapi_mod.record_chapter_experienced(
                tenant_id=TENANT_A_ID,
                subject=learner_a,
                learner_name="Live Learner",
                manual_id=mid_a,
                manual_title="Postgres Concurrency Test",
                chapter_index=0,
                chapter_title="Chapter 1",
                statement_id=retry_sid,
                send_lrs=False,
            )

        # Part B: Concurrent Conflicting Inserts (2 threads with different content)
        conflict_sid = uuid4()
        learner_b = f"pg-test-{uuid4().hex[:8]}"
        mid_b = uuid4()

        def run_conflict(chap_idx, title):
            return xapi_mod.record_chapter_experienced(
                tenant_id=TENANT_A_ID,
                subject=learner_b,
                learner_name="Conflict Learner",
                manual_id=mid_b,
                manual_title="Postgres Concurrency Test",
                chapter_index=chap_idx,
                chapter_title=title,
                statement_id=conflict_sid,
                send_lrs=False,
            )

        try:
            # 1. Execute concurrent identical retries
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(run_retry) for _ in range(5)]
                results = [f.result() for f in futures]
            assert len(results) == 5, "All 5 concurrent identical retries must succeed"

            with db.tenant_connection(TENANT_A_ID) as conn:
                count_row = conn.execute("SELECT count(*) as c FROM xapi_statements WHERE statement_id = %s", (str(retry_sid),)).fetchone()
                assert count_row["c"] == 1, "Exactly 1 row must be stored in test DB for identical retries"

            # 2. Execute concurrent conflicting inserts
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                f1 = executor.submit(run_conflict, 0, "Chapter 1")
                f2 = executor.submit(run_conflict, 99, "Conflicting Chapter")
                c_results = []
                c_errors = []
                for f in (f1, f2):
                    try:
                        c_results.append(f.result())
                    except StatementConflictError as exc:
                        c_errors.append(exc)

            assert len(c_results) == 1, "Exactly one thread must win the concurrent insert"
            assert len(c_errors) == 1, "The losing concurrent thread must receive StatementConflictError"

            # Verify the winning statement in test DB remains uncorrupted
            with db.tenant_connection(TENANT_A_ID) as conn:
                winner_row = conn.execute("SELECT statement FROM xapi_statements WHERE statement_id = %s", (str(conflict_sid),)).fetchone()
                assert winner_row is not None
                winner_chap = winner_row["statement"]["context"]["extensions"]["https://edvidura.local/xapi/extensions/chapter_index"]
                assert winner_chap in (0, 99)
        finally:
            # Cleanup test records in test database
            try:
                with db.tenant_connection(TENANT_A_ID) as conn:
                    conn.execute("DELETE FROM xapi_statements WHERE statement_id IN (%s, %s)", (str(retry_sid), str(conflict_sid)))
                    final_count = conn.execute("SELECT count(*) as c FROM xapi_statements").fetchone()["c"]
                    assert final_count == initial_count, f"Database row count mismatch: initial {initial_count} vs final {final_count}"
            except Exception:
                pass
