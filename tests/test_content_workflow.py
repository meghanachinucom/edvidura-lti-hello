"""Content workflow helpers (draft/publish, progress uncomplete)."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
)

from app import db  # noqa: E402
from app.modules import content  # noqa: E402
from app.tenancy import TENANT_A_ID  # noqa: E402


def _db_required() -> bool:
    return os.getenv("CI", "").lower() in ("1", "true") or os.getenv(
        "REQUIRE_DB", ""
    ).lower() in ("1", "true", "yes")


@pytest.fixture(scope="module", autouse=True)
def _postgres_available():
    try:
        with db.connect() as conn:
            conn.execute("SELECT 1")
    except Exception:  # noqa: BLE001
        if _db_required():
            pytest.fail("Postgres not reachable")
        pytest.skip("Postgres not reachable")


def test_draft_lesson_hidden_from_students():
    marker = uuid4().hex[:8]
    created = content.create_lesson(
        tenant_id=TENANT_A_ID,
        title=f"Draft {marker}",
        body_md="secret draft",
        status="draft",
    )
    course = content.get_primary_course(TENANT_A_ID)
    published = content.list_lessons(TENANT_A_ID, course["id"])
    assert all(str(L["id"]) != str(created["id"]) for L in published)
    assert content.get_lesson(TENANT_A_ID, created["id"]) is None
    assert (
        content.get_lesson(TENANT_A_ID, created["id"], allow_unpublished=True) is not None
    )
    content.set_lesson_status(
        tenant_id=TENANT_A_ID, lesson_id=created["id"], status="published"
    )
    assert content.get_lesson(TENANT_A_ID, created["id"]) is not None


def test_unmark_lesson_complete_and_reorder():
    marker = uuid4().hex[:8]
    subject = f"wf-{marker}"
    a = content.create_lesson(
        tenant_id=TENANT_A_ID, title=f"A {marker}", body_md="a", status="published"
    )
    b = content.create_lesson(
        tenant_id=TENANT_A_ID, title=f"B {marker}", body_md="b", status="published"
    )
    content.mark_lesson_complete(
        tenant_id=TENANT_A_ID,
        course_id=a["course_id"],
        lesson_id=a["id"],
        subject=subject,
    )
    done = content.completed_lesson_ids(
        TENANT_A_ID, course_id=a["course_id"], subject=subject
    )
    assert str(a["id"]) in done
    assert content.unmark_lesson_complete(
        tenant_id=TENANT_A_ID, lesson_id=a["id"], subject=subject
    )
    done2 = content.completed_lesson_ids(
        TENANT_A_ID, course_id=a["course_id"], subject=subject
    )
    assert str(a["id"]) not in done2

    # Move B up (should swap with previous neighbor — may be A or earlier)
    before = content.get_lesson(TENANT_A_ID, b["id"], allow_unpublished=True)
    content.reorder_lesson(tenant_id=TENANT_A_ID, lesson_id=b["id"], direction="up")
    after = content.get_lesson(TENANT_A_ID, b["id"], allow_unpublished=True)
    assert int(after["position"]) <= int(before["position"])
