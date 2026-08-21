"""Versioned manuals (Slice B)."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
)


def _db_required() -> bool:
    return os.getenv("CI", "").lower() in ("1", "true") or os.getenv(
        "REQUIRE_DB", ""
    ).lower() in ("1", "true", "yes")


@pytest.fixture(scope="module", autouse=True)
def _postgres():
    from app import db

    try:
        with db.connect() as conn:
            conn.execute("SELECT 1 FROM manuals LIMIT 1")
    except Exception:  # noqa: BLE001
        if _db_required():
            pytest.fail("Postgres/manuals migration not available")
        pytest.skip("Postgres/manuals not available")


def test_manual_version_publish_flow():
    from app.modules import manuals
    from app.tenancy import TENANT_A_ID

    marker = uuid4().hex[:8]
    created = manuals.create_manual(
        tenant_id=TENANT_A_ID,
        title=f"Guide {marker}",
        body_md="v1 body",
        publish=True,
    )
    mid = created["id"]
    v2 = manuals.add_version(
        tenant_id=TENANT_A_ID,
        manual_id=mid,
        body_md="v2 body",
        changelog="Revised chapter",
        publish=False,
    )
    assert int(v2["version"]) == 2
    assert v2["is_published"] is False
    latest = manuals.latest_published_version(TENANT_A_ID, mid)
    assert latest is not None
    assert int(latest["version"]) == 1
    manuals.publish_version(tenant_id=TENANT_A_ID, manual_id=mid, version=2)
    latest2 = manuals.latest_published_version(TENANT_A_ID, mid)
    assert int(latest2["version"]) == 2
