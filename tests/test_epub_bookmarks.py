"""Unit and isolation tests for EPUB bookmark management.

MOCKED DATA-ACCESS BOUNDARY TESTS:
Uses explicit MockPhase2Connection fixture to isolate unit tests when PostgreSQL is unavailable.
Does NOT prove live PostgreSQL persistence or PostgreSQL RLS policies.
"""
from __future__ import annotations

from uuid import uuid4
import pytest

from app import db
from app.modules.manuals.pebl_phase2 import (
    DatabaseUnavailableError,
    create_bookmark,
    list_bookmarks,
    delete_bookmark,
)
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection


@pytest.fixture(autouse=True)
def setup_mock_db(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)
    yield
    GLOBAL_PHASE2_STORE.clear()


def test_bookmark_lifecycle():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = f"user-{uuid4().hex[:8]}"
    manual_id = f"manual-{uuid4().hex[:8]}"
    version = 1

    # Create bookmark 1
    bm1 = create_bookmark(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
        chapter_index=0,
        cfi="epub-cfi-chap-0",
        title="Chapter 1 Beginning",
    )
    assert bm1["id"] is not None
    assert bm1["title"] == "Chapter 1 Beginning"

    # Create bookmark 2
    bm2 = create_bookmark(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
        chapter_index=2,
        cfi="epub-cfi-chap-2",
        title="Important Section in Chapter 3",
    )

    # List bookmarks
    bms = list_bookmarks(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert len(bms) == 2
    assert any(b["id"] == bm1["id"] for b in bms)
    assert any(b["id"] == bm2["id"] for b in bms)

    # Delete bookmark 1
    deleted = delete_bookmark(
        tenant_id=tenant_id,
        subject=subject_id,
        bookmark_id=bm1["id"],
    )
    assert deleted is True

    # List bookmarks again
    bms_after = list_bookmarks(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert len(bms_after) == 1
    assert bms_after[0]["id"] == bm2["id"]


def test_bookmark_learner_isolation():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    manual_id = f"manual-{uuid4().hex[:8]}"
    learner_a = "learner-alice"
    learner_b = "learner-bob"

    bm_a = create_bookmark(
        tenant_id=tenant_id,
        subject=learner_a,
        manual_id=manual_id,
        version=1,
        chapter_index=1,
        cfi="epub-cfi-chap-1",
        title="Alice's Note",
    )

    list_a = list_bookmarks(tenant_id=tenant_id, subject=learner_a, manual_id=manual_id, version=1)
    list_b = list_bookmarks(tenant_id=tenant_id, subject=learner_b, manual_id=manual_id, version=1)

    assert len(list_a) == 1
    assert len(list_b) == 0

    # Learner B cannot delete Learner A's bookmark
    del_result = delete_bookmark(tenant_id=tenant_id, subject=learner_b, bookmark_id=bm_a["id"])
    assert del_result is False


def test_bookmark_tenant_isolation():
    tenant_1 = f"tenant-{uuid4().hex[:8]}"
    tenant_2 = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-x"
    manual_id = f"manual-{uuid4().hex[:8]}"

    create_bookmark(
        tenant_id=tenant_1,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        title="T1 Bookmark",
    )

    list_t1 = list_bookmarks(tenant_id=tenant_1, subject=subject_id, manual_id=manual_id, version=1)
    list_t2 = list_bookmarks(tenant_id=tenant_2, subject=subject_id, manual_id=manual_id, version=1)

    assert len(list_t1) == 1
    assert len(list_t2) == 0


def test_bookmark_version_isolation():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-y"
    manual_id = f"manual-{uuid4().hex[:8]}"

    create_bookmark(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        title="V1 Bookmark",
    )

    list_v1 = list_bookmarks(tenant_id=tenant_id, subject=subject_id, manual_id=manual_id, version=1)
    list_v2 = list_bookmarks(tenant_id=tenant_id, subject=subject_id, manual_id=manual_id, version=2)

    assert len(list_v1) == 1
    assert len(list_v2) == 0


def test_bookmark_db_failure_raises_database_unavailable_error(monkeypatch):
    import psycopg

    def failing_connection(*args, **kwargs):
        raise psycopg.OperationalError("Connection timed out")

    monkeypatch.setattr(db, "tenant_connection", failing_connection)

    with pytest.raises(DatabaseUnavailableError):
        create_bookmark(
            tenant_id="tenant-1",
            manual_id="manual-1",
            version=1,
            subject="learner-1",
        )

    with pytest.raises(DatabaseUnavailableError):
        list_bookmarks(
            tenant_id="tenant-1",
            manual_id="manual-1",
            version=1,
            subject="learner-1",
        )

    with pytest.raises(DatabaseUnavailableError):
        delete_bookmark(
            tenant_id="tenant-1",
            bookmark_id="bm-1",
            subject="learner-1",
        )
