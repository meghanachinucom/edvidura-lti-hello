"""Regression test for PeBL demo seed idempotency and duplicate prevention.

Proves that repeat execution of the demo-seed statement and entity generation workflow
is strictly idempotent and does not accumulate duplicate sample statements.
Uses disposable test tenants; does not clear production or existing demo data.
"""
from __future__ import annotations

import os
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL
import pytest

from app.modules import xapi as xapi_mod
from app.modules.xapi import list_statements, verbs
from app.tenancy import TENANT_A_ID


def test_seed_xapi_statement_idempotency_on_repeat(monkeypatch):
    """Verify that emitting seed demo events twice produces zero duplicate records.

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

    # Isolated test learner on Tenant A
    test_tenant = TENANT_A_ID
    learner_sub = f"seed-test-learner-{uuid4().hex[:8]}"
    manual_id = uuid4()
    manual_title = "Idempotency Test eBook"

    # Deterministic statement identifiers for seed demo events
    seed_init_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/initialized")
    seed_chap_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/experienced/0")
    seed_prog_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/progressed/0")
    seed_bm_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/bookmarked/0")
    seed_ann_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/annotated/0")
    seed_comp_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{test_tenant}/{manual_id}/1/{learner_sub}/completed")

    def run_seed_events():
        xapi_mod.record_ebook_initialized(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Demo Learner",
            manual_id=manual_id,
            manual_title=manual_title,
            version=1,
            statement_id=seed_init_sid,
            send_lrs=False,
        )
        xapi_mod.record_chapter_experienced(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Demo Learner",
            manual_id=manual_id,
            manual_title=manual_title,
            chapter_index=0,
            chapter_title="Chapter 1",
            version=1,
            statement_id=seed_chap_sid,
            send_lrs=False,
        )
        xapi_mod.record_reading_progressed(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Demo Learner",
            manual_id=manual_id,
            manual_title=manual_title,
            chapter_index=0,
            progress_percent=33,
            cfi="epubcfi(/6/2[ch1]!/4/2:0)",
            version=1,
            statement_id=seed_prog_sid,
            send_lrs=False,
        )
        xapi_mod.record_bookmark_created(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Demo Learner",
            manual_id=manual_id,
            manual_title=manual_title,
            chapter_index=0,
            bookmark_title="Bookmark 1",
            cfi="epubcfi(/6/2[ch1]!/4/2:0)",
            version=1,
            statement_id=seed_bm_sid,
            send_lrs=False,
        )
        xapi_mod.record_annotation_added(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Demo Learner",
            manual_id=manual_id,
            manual_title=manual_title,
            chapter_index=0,
            annotation_text="Note text",
            highlight_text="Highlight text",
            color="yellow",
            cfi_range="epubcfi(/6/2[ch1]!/4/4,1:0,1:20)",
            version=1,
            statement_id=seed_ann_sid,
            send_lrs=False,
        )
        xapi_mod.record_reading_completed(
            tenant_id=test_tenant,
            subject=learner_sub,
            learner_name="Demo Learner",
            manual_id=manual_id,
            manual_title=manual_title,
            version=1,
            statement_id=seed_comp_sid,
            send_lrs=False,
        )

    try:
        # First execution
        run_seed_events()
        stmts_first = list_statements(test_tenant, subject=learner_sub)
        assert len(stmts_first) == 6, f"Expected 6 statements on first run, got {len(stmts_first)}"

        # Second execution (simulates re-running seed script)
        run_seed_events()
        stmts_second = list_statements(test_tenant, subject=learner_sub)
        assert len(stmts_second) == 6, f"Expected exactly 6 statements on second run (zero duplicates), got {len(stmts_second)}"

        # Third execution (additional confirmation)
        run_seed_events()
        stmts_third = list_statements(test_tenant, subject=learner_sub)
        assert len(stmts_third) == 6, f"Expected exactly 6 statements on third run, got {len(stmts_third)}"

        # Verify all 6 expected verbs are present and preserved
        verbs_found = {s["verb_id"] for s in stmts_third}
        assert verbs.VERB_INITIALIZED in verbs_found
        assert verbs.VERB_EXPERIENCED in verbs_found
        assert verbs.VERB_PROGRESSED in verbs_found
        assert verbs.VERB_BOOKMARKED in verbs_found
        assert verbs.VERB_ANNOTATED in verbs_found
        assert verbs.VERB_COMPLETED in verbs_found
    finally:
        try:
            with db.tenant_connection(test_tenant) as conn:
                conn.execute(
                    "DELETE FROM xapi_statements WHERE statement_id IN (%s, %s, %s, %s, %s, %s)",
                    (str(seed_init_sid), str(seed_chap_sid), str(seed_prog_sid), str(seed_bm_sid), str(seed_ann_sid), str(seed_comp_sid)),
                )
        except Exception:
            pass
