"""Unit and isolation tests for EPUB reading position and progress persistence.

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
    save_reading_progress,
    get_reading_progress,
)
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection


@pytest.fixture(autouse=True)
def setup_mock_db(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)
    yield
    GLOBAL_PHASE2_STORE.clear()


def test_save_and_get_reading_progress():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = f"user-{uuid4().hex[:8]}"
    manual_id = f"manual-{uuid4().hex[:8]}"
    version = 1

    # Save initial progress
    prog1 = save_reading_progress(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
        chapter_index=0,
        cfi="epub-cfi-chap-0",
        progress_percent=25,
    )
    assert prog1["chapter_index"] == 0
    assert prog1["progress_percent"] == 25

    # Retrieve progress
    saved = get_reading_progress(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert saved is not None
    assert saved["chapter_index"] == 0
    assert saved["cfi"] == "epub-cfi-chap-0"
    assert saved["progress_percent"] == 25

    # Update progress (resume and progress to chapter 1)
    prog2 = save_reading_progress(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
        chapter_index=1,
        cfi="epub-cfi-chap-1",
        progress_percent=50,
    )
    assert prog2["chapter_index"] == 1
    assert prog2["progress_percent"] == 50

    # Retrieve updated progress
    saved_updated = get_reading_progress(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert saved_updated["chapter_index"] == 1
    assert saved_updated["progress_percent"] == 50


def test_reading_progress_learner_isolation():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    manual_id = f"manual-{uuid4().hex[:8]}"
    learner_a = "learner-alpha"
    learner_b = "learner-beta"

    save_reading_progress(
        tenant_id=tenant_id,
        subject=learner_a,
        manual_id=manual_id,
        version=1,
        chapter_index=2,
        cfi="epub-cfi-chap-2",
        progress_percent=75,
    )

    prog_a = get_reading_progress(tenant_id=tenant_id, subject=learner_a, manual_id=manual_id, version=1)
    prog_b = get_reading_progress(tenant_id=tenant_id, subject=learner_b, manual_id=manual_id, version=1)

    assert prog_a is not None and prog_a["chapter_index"] == 2
    assert prog_b is None


def test_reading_progress_tenant_isolation():
    tenant_1 = f"tenant-{uuid4().hex[:8]}"
    tenant_2 = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-shared"
    manual_id = f"manual-{uuid4().hex[:8]}"

    save_reading_progress(
        tenant_id=tenant_1,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        chapter_index=3,
        progress_percent=100,
    )

    prog_t1 = get_reading_progress(tenant_id=tenant_1, subject=subject_id, manual_id=manual_id, version=1)
    prog_t2 = get_reading_progress(tenant_id=tenant_2, subject=subject_id, manual_id=manual_id, version=1)

    assert prog_t1 is not None and prog_t1["chapter_index"] == 3
    assert prog_t2 is None


def test_reading_progress_version_isolation():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-v"
    manual_id = f"manual-{uuid4().hex[:8]}"

    save_reading_progress(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        chapter_index=1,
        progress_percent=33,
    )

    prog_v1 = get_reading_progress(tenant_id=tenant_id, subject=subject_id, manual_id=manual_id, version=1)
    prog_v2 = get_reading_progress(tenant_id=tenant_id, subject=subject_id, manual_id=manual_id, version=2)

    assert prog_v1 is not None and prog_v1["chapter_index"] == 1
    assert prog_v2 is None


def test_reading_progress_invalid_location_handled():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-inv"
    manual_id = f"manual-{uuid4().hex[:8]}"

    prog = save_reading_progress(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        chapter_index=-5,
        progress_percent=-10,
    )
    assert prog["chapter_index"] >= 0
    assert prog["progress_percent"] >= 0


def test_reading_progress_db_failure_raises_database_unavailable_error(monkeypatch):
    import psycopg

    def failing_connection(*args, **kwargs):
        raise psycopg.OperationalError("Connection timed out")

    monkeypatch.setattr(db, "tenant_connection", failing_connection)

    with pytest.raises(DatabaseUnavailableError):
        save_reading_progress(
            tenant_id="tenant-1",
            manual_id="manual-1",
            version=1,
            subject="learner-1",
        )

    with pytest.raises(DatabaseUnavailableError):
        get_reading_progress(
            tenant_id="tenant-1",
            manual_id="manual-1",
            version=1,
            subject="learner-1",
        )
