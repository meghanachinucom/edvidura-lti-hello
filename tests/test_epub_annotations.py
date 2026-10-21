"""Unit and isolation tests for EPUB text highlights and annotations.

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
    create_annotation,
    list_annotations,
    update_annotation,
    delete_annotation,
    get_annotation,
)
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection


@pytest.fixture(autouse=True)
def setup_mock_db(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)
    yield
    GLOBAL_PHASE2_STORE.clear()


def test_annotation_lifecycle():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = f"user-{uuid4().hex[:8]}"
    manual_id = f"manual-{uuid4().hex[:8]}"
    version = 1

    # Create annotation
    ann = create_annotation(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
        chapter_index=1,
        cfi_range="epub-cfi-chap-1",
        highlight_text="Key learning concept text",
        annotation_text="Review this before exam",
        color="yellow",
    )
    assert ann["id"] is not None
    assert ann["highlight_text"] == "Key learning concept text"
    assert ann["annotation_text"] == "Review this before exam"

    # List annotations
    anns = list_annotations(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert len(anns) == 1
    assert anns[0]["id"] == ann["id"]

    # Get single annotation
    single = get_annotation(
        tenant_id=tenant_id,
        annotation_id=ann["id"],
    )
    assert single is not None
    assert single["id"] == ann["id"]

    # Update annotation
    updated = update_annotation(
        tenant_id=tenant_id,
        subject=subject_id,
        annotation_id=ann["id"],
        annotation_text="Updated exam review notes",
        color="green",
    )
    assert updated is True

    # List and verify update
    anns_updated = list_annotations(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert anns_updated[0]["annotation_text"] == "Updated exam review notes"
    assert anns_updated[0]["color"] == "green"

    # Delete annotation
    deleted = delete_annotation(
        tenant_id=tenant_id,
        subject=subject_id,
        annotation_id=ann["id"],
    )
    assert deleted is True

    # List after deletion
    anns_empty = list_annotations(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=version,
    )
    assert len(anns_empty) == 0


def test_annotation_learner_isolation():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    manual_id = f"manual-{uuid4().hex[:8]}"
    learner_a = "learner-1"
    learner_b = "learner-2"

    ann_a = create_annotation(
        tenant_id=tenant_id,
        subject=learner_a,
        manual_id=manual_id,
        version=1,
        chapter_index=0,
        highlight_text="Quote",
        annotation_text="Note",
    )

    list_a = list_annotations(tenant_id=tenant_id, subject=learner_a, manual_id=manual_id, version=1)
    list_b = list_annotations(tenant_id=tenant_id, subject=learner_b, manual_id=manual_id, version=1)

    assert len(list_a) == 1
    assert len(list_b) == 0

    # Learner B cannot edit or delete Learner A's annotation
    assert update_annotation(
        tenant_id=tenant_id,
        subject=learner_b,
        annotation_id=ann_a["id"],
        annotation_text="Hacked",
    ) is False

    assert delete_annotation(
        tenant_id=tenant_id,
        subject=learner_b,
        annotation_id=ann_a["id"],
    ) is False


def test_annotation_tenant_isolation():
    tenant_1 = f"tenant-{uuid4().hex[:8]}"
    tenant_2 = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-common"
    manual_id = f"manual-{uuid4().hex[:8]}"

    create_annotation(
        tenant_id=tenant_1,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        highlight_text="T1 Quote",
    )

    list_t1 = list_annotations(tenant_id=tenant_1, subject=subject_id, manual_id=manual_id, version=1)
    list_t2 = list_annotations(tenant_id=tenant_2, subject=subject_id, manual_id=manual_id, version=1)

    assert len(list_t1) == 1
    assert len(list_t2) == 0


def test_annotation_version_isolation():
    tenant_id = f"tenant-{uuid4().hex[:8]}"
    subject_id = "learner-v"
    manual_id = f"manual-{uuid4().hex[:8]}"

    create_annotation(
        tenant_id=tenant_id,
        subject=subject_id,
        manual_id=manual_id,
        version=1,
        highlight_text="V1 Note",
    )

    list_v1 = list_annotations(tenant_id=tenant_id, subject=subject_id, manual_id=manual_id, version=1)
    list_v2 = list_annotations(tenant_id=tenant_id, subject=subject_id, manual_id=manual_id, version=2)

    assert len(list_v1) == 1
    assert len(list_v2) == 0


def test_annotation_db_failure_raises_database_unavailable_error(monkeypatch):
    import psycopg

    def failing_connection(*args, **kwargs):
        raise psycopg.OperationalError("Connection timed out")

    monkeypatch.setattr(db, "tenant_connection", failing_connection)

    with pytest.raises(DatabaseUnavailableError):
        create_annotation(
            tenant_id="tenant-1",
            manual_id="manual-1",
            version=1,
            subject="learner-1",
        )

    with pytest.raises(DatabaseUnavailableError):
        list_annotations(
            tenant_id="tenant-1",
            manual_id="manual-1",
            version=1,
            subject="learner-1",
        )

    with pytest.raises(DatabaseUnavailableError):
        update_annotation(
            tenant_id="tenant-1",
            annotation_id="ann-1",
            subject="learner-1",
            annotation_text="New text",
        )

    with pytest.raises(DatabaseUnavailableError):
        delete_annotation(
            tenant_id="tenant-1",
            annotation_id="ann-1",
            subject="learner-1",
        )
