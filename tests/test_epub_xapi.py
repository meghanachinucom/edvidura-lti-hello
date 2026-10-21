"""Automated tests for PeBL eBook xAPI activity statements and persistence under RLS."""
from __future__ import annotations

import os
from uuid import uuid4
import pytest

from app.modules.xapi import (
    verbs,
    build_ebook_initialized_statement,
    build_chapter_experienced_statement,
    build_reading_progressed_statement,
    build_bookmark_created_statement,
    build_annotation_added_statement,
    build_reading_completed_statement,
    record_ebook_initialized,
    record_chapter_experienced,
    record_reading_progressed,
    record_bookmark_created,
    record_annotation_added,
    record_reading_completed,
    list_statements,
)
from app.tenancy import TENANT_A_ID, TENANT_B_ID


def test_build_ebook_initialized_statement():
    mid = uuid4()
    stmt = build_ebook_initialized_statement(
        tenant_id=TENANT_A_ID,
        subject="alice",
        learner_name="Alice Student",
        manual_id=mid,
        manual_title="Physics Guide",
        version=1,
    )
    assert stmt["verb"]["id"] == verbs.VERB_INITIALIZED
    assert stmt["verb"]["display"]["en-US"] == "initialized"
    assert f"/xapi/activities/ebook/{mid}" in stmt["object"]["id"]
    assert stmt["actor"]["account"]["name"] == "alice"
    assert stmt["actor"]["name"] == "Alice Student"
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/tenant_id"] == TENANT_A_ID
    assert ext["https://edvidura.local/xapi/extensions/manual_id"] == str(mid)
    assert ext["https://edvidura.local/xapi/extensions/version"] == 1


def test_build_chapter_experienced_statement():
    mid = uuid4()
    stmt = build_chapter_experienced_statement(
        tenant_id=TENANT_A_ID,
        subject="alice",
        learner_name="Alice Student",
        manual_id=mid,
        manual_title="Physics Guide",
        chapter_index=2,
        chapter_title="Thermodynamics",
        version=1,
    )
    assert stmt["verb"]["id"] == verbs.VERB_EXPERIENCED
    assert stmt["verb"]["display"]["en-US"] == "experienced"
    assert f"/xapi/activities/ebook/{mid}/chapter/2" in stmt["object"]["id"]
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/chapter_index"] == 2
    assert ext["https://edvidura.local/xapi/extensions/chapter_title"] == "Thermodynamics"


def test_build_reading_progressed_statement():
    mid = uuid4()
    stmt = build_reading_progressed_statement(
        tenant_id=TENANT_A_ID,
        subject="alice",
        manual_id=mid,
        manual_title="Physics Guide",
        chapter_index=1,
        progress_percent=66,
        cfi="epub-cfi-chap-2",
        version=1,
    )
    assert stmt["verb"]["id"] == verbs.VERB_PROGRESSED
    assert stmt["verb"]["display"]["en-US"] == "progressed"
    assert stmt["result"]["score"]["raw"] == 66
    assert stmt["result"]["score"]["scaled"] == 0.66
    assert stmt["result"]["completion"] is False
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/progress_percent"] == 66
    assert ext["https://edvidura.local/xapi/extensions/cfi"] == "epub-cfi-chap-2"


def test_build_bookmark_created_statement():
    mid = uuid4()
    stmt = build_bookmark_created_statement(
        tenant_id=TENANT_A_ID,
        subject="alice",
        manual_id=mid,
        manual_title="Physics Guide",
        chapter_index=0,
        bookmark_title="Important Law",
        cfi="epub-cfi-chap-1",
        version=1,
    )
    assert stmt["verb"]["id"] == verbs.VERB_BOOKMARKED
    assert stmt["verb"]["display"]["en-US"] == "bookmarked"
    assert f"/xapi/activities/ebook/{mid}/bookmark/0" in stmt["object"]["id"]
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/bookmark_title"] == "Important Law"


def test_build_annotation_added_statement():
    mid = uuid4()
    stmt = build_annotation_added_statement(
        tenant_id=TENANT_A_ID,
        subject="alice",
        manual_id=mid,
        manual_title="Physics Guide",
        chapter_index=0,
        annotation_text="Exam question next week",
        highlight_text="Energy is conserved",
        color="green",
        cfi_range="epub-cfi-chap-1",
        version=1,
    )
    assert stmt["verb"]["id"] == verbs.VERB_ANNOTATED
    assert stmt["verb"]["display"]["en-US"] == "annotated"
    assert stmt["result"]["response"] == "Exam question next week"
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/color"] == "green"
    assert ext["https://edvidura.local/xapi/extensions/highlight_text"] == "Energy is conserved"


def test_build_reading_completed_statement():
    mid = uuid4()
    stmt = build_reading_completed_statement(
        tenant_id=TENANT_A_ID,
        subject="alice",
        manual_id=mid,
        manual_title="Physics Guide",
        version=1,
    )
    assert stmt["verb"]["id"] == verbs.VERB_COMPLETED
    assert stmt["verb"]["display"]["en-US"] == "completed"
    assert stmt["result"]["completion"] is True
    assert stmt["result"]["success"] is True
    assert stmt["result"]["score"]["raw"] == 100


def test_ebook_xapi_live_db_persistence_and_isolation(monkeypatch):
    """Verify live PostgreSQL persistence and RLS isolation for all 6 eBook events.

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

    mid = uuid4()
    sub_a = f"sub-xapi-{uuid4().hex[:8]}"

    created_sids = []
    try:
        # 1. Initialized
        r_init = record_ebook_initialized(
            tenant_id=TENANT_A_ID,
            subject=sub_a,
            learner_name="Alice Live",
            manual_id=mid,
            manual_title="Live DB eBook",
            version=1,
            send_lrs=False,
        )
        assert r_init["verb_id"] == verbs.VERB_INITIALIZED
        assert r_init["actor_sub"] == sub_a
        created_sids.append(str(r_init["statement_id"]))

        # 2. Chapter experienced
        r_chap = record_chapter_experienced(
            tenant_id=TENANT_A_ID,
            subject=sub_a,
            learner_name="Alice Live",
            manual_id=mid,
            manual_title="Live DB eBook",
            chapter_index=1,
            chapter_title="Chapter 2",
            version=1,
            send_lrs=False,
        )
        assert r_chap["verb_id"] == verbs.VERB_EXPERIENCED
        created_sids.append(str(r_chap["statement_id"]))

        # 3. Reading progressed
        r_prog = record_reading_progressed(
            tenant_id=TENANT_A_ID,
            subject=sub_a,
            learner_name="Alice Live",
            manual_id=mid,
            manual_title="Live DB eBook",
            chapter_index=1,
            progress_percent=50,
            cfi="cfi-live",
            version=1,
            send_lrs=False,
        )
        assert r_prog["verb_id"] == verbs.VERB_PROGRESSED
        created_sids.append(str(r_prog["statement_id"]))

        # 4. Bookmark created
        r_bm = record_bookmark_created(
            tenant_id=TENANT_A_ID,
            subject=sub_a,
            learner_name="Alice Live",
            manual_id=mid,
            manual_title="Live DB eBook",
            chapter_index=1,
            bookmark_title="Live Bookmark",
            version=1,
            send_lrs=False,
        )
        assert r_bm["verb_id"] == verbs.VERB_BOOKMARKED
        created_sids.append(str(r_bm["statement_id"]))

        # 5. Annotation added
        r_ann = record_annotation_added(
            tenant_id=TENANT_A_ID,
            subject=sub_a,
            learner_name="Alice Live",
            manual_id=mid,
            manual_title="Live DB eBook",
            chapter_index=1,
            annotation_text="Live Note",
            highlight_text="Live highlight",
            color="yellow",
            version=1,
            send_lrs=False,
        )
        assert r_ann["verb_id"] == verbs.VERB_ANNOTATED
        created_sids.append(str(r_ann["statement_id"]))

        # 6. Reading completed
        r_comp = record_reading_completed(
            tenant_id=TENANT_A_ID,
            subject=sub_a,
            learner_name="Alice Live",
            manual_id=mid,
            manual_title="Live DB eBook",
            version=1,
            send_lrs=False,
        )
        assert r_comp["verb_id"] == verbs.VERB_COMPLETED
        created_sids.append(str(r_comp["statement_id"]))

        # Query statements under Tenant A
        stmts_a = list_statements(TENANT_A_ID, subject=sub_a)
        assert len(stmts_a) == 6
        found_verbs = {s["verb_id"] for s in stmts_a}
        assert verbs.VERB_INITIALIZED in found_verbs
        assert verbs.VERB_EXPERIENCED in found_verbs
        assert verbs.VERB_PROGRESSED in found_verbs
        assert verbs.VERB_BOOKMARKED in found_verbs
        assert verbs.VERB_ANNOTATED in found_verbs
        assert verbs.VERB_COMPLETED in found_verbs

        # Tenant isolation check: Tenant B MUST NOT see Tenant A's statements
        stmts_b = list_statements(TENANT_B_ID, subject=sub_a)
        assert len(stmts_b) == 0
    finally:
        try:
            with db.tenant_connection(TENANT_A_ID) as conn:
                conn.execute(
                    "DELETE FROM xapi_statements WHERE statement_id = ANY(%s::uuid[])",
                    (created_sids,),
                )
        except Exception:
            pass
