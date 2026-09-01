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


def test_toc_from_body_and_reader_seal():
    from app.modules.manuals import (
        reader_share_path,
        toc_from_body,
        verify_reader_token,
    )

    toc = toc_from_body(
        "## Intro\n\nHello\n\n## Solve for x\n\nIsolate the variable.\n"
    )
    slugs = {c["slug"] for c in toc}
    assert "intro" in slugs or "solve-for-x" in slugs
    assert any(c["title"] == "Solve for x" for c in toc)

    tid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    mid = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    path = reader_share_path(tenant_id=tid, manual_id=mid, version=2, focus="intro")
    assert path.startswith(f"/read/manuals/{mid}?")
    assert "sig=" in path and "tid=" in path and "v=2" in path
    # Extract sig
    from urllib.parse import parse_qs, urlparse

    qs = parse_qs(urlparse(path).query)
    assert verify_reader_token(
        token=qs["sig"][0], tenant_id=tid, manual_id=mid, version=2
    )
    assert not verify_reader_token(
        token="0.deadbeef", tenant_id=tid, manual_id=mid, version=2
    )
