"""Admin tenant/platform onboarding API tests."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
)
os.environ["ADMIN_API_KEY"] = "test-admin-key"


def _db_required() -> bool:
    return os.getenv("CI", "").lower() in ("1", "true") or os.getenv(
        "REQUIRE_DB", ""
    ).lower() in ("1", "true", "yes")


@pytest.fixture(scope="module")
def client():
    # Import after ADMIN_API_KEY is set
    from app.main import app
    from app import db

    try:
        with db.connect() as conn:
            conn.execute("SELECT 1")
    except Exception:  # noqa: BLE001
        if _db_required():
            pytest.fail("Postgres not reachable for admin API tests")
        pytest.skip("Postgres not reachable")

    # Ensure last_launch_at exists on older local DBs
    try:
        with db.connect() as conn:
            with conn.transaction():
                conn.execute(
                    "ALTER TABLE lti_platforms ADD COLUMN IF NOT EXISTS last_launch_at TIMESTAMPTZ"
                )
    except Exception:  # noqa: BLE001
        pass

    return TestClient(app)


def test_admin_requires_key(client: TestClient):
    r = client.get("/admin/tenants")
    assert r.status_code == 401


def test_create_tenant_and_platform(client: TestClient):
    headers = {"X-Admin-Key": "test-admin-key"}
    slug = f"org-{uuid4().hex[:8]}"
    r = client.post(
        "/admin/tenants",
        headers=headers,
        json={"slug": slug, "name": f"Org {slug}"},
    )
    assert r.status_code == 201, r.text
    tenant = r.json()
    assert tenant["slug"] == slug

    issuer = f"https://{slug}.moodle.test"
    r2 = client.post(
        f"/admin/tenants/{tenant['id']}/lti-platforms",
        headers=headers,
        json={
            "issuer": issuer,
            "client_id": f"cid-{slug}",
            "deployment_ids": ["1", "2"],
        },
    )
    assert r2.status_code == 201, r2.text
    platform = r2.json()
    assert platform["client_id"] == f"cid-{slug}"
    assert "1" in platform["deployment_ids"]

    from app.tenancy import resolve_platform

    resolved = resolve_platform(issuer, f"cid-{slug}", "2")
    assert str(resolved.tenant_id) == tenant["id"]


def test_onboard_page_renders(client: TestClient):
    r = client.get("/onboard")
    assert r.status_code == 200
    assert "Institution onboarding" in r.text
    assert "/lti/login" in r.text
    assert "Client ID" in r.text


def test_onboard_tenant_rejects_bad_key(client: TestClient):
    r = client.post(
        "/onboard/tenant",
        data={"admin_key": "wrong", "slug": "nope-org", "name": "Nope"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert "err=" in r.headers.get("location", "")


def test_onboard_tenant_and_platform_flow(client: TestClient):
    slug = f"ob-{uuid4().hex[:8]}"
    r = client.post(
        "/onboard/tenant",
        data={
            "admin_key": "test-admin-key",
            "slug": slug,
            "name": f"Onboard {slug}",
        },
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert "ok=" in r.headers.get("location", "")

    from app import db

    tenant = db.get_tenant_by_slug(slug)
    assert tenant is not None

    issuer = f"https://{slug}.moodle.test"
    r2 = client.post(
        "/onboard/platform",
        data={
            "admin_key": "test-admin-key",
            "tenant_id": str(tenant["id"]),
            "issuer": issuer,
            "client_id": f"cid-{slug}",
            "deployment_ids": "1,2",
        },
        follow_redirects=False,
    )
    assert r2.status_code == 303
    assert "ok=" in r2.headers.get("location", "")

    platforms = db.list_platforms_for_tenant(tenant["id"])
    assert any(p["client_id"] == f"cid-{slug}" for p in platforms)
    platform = next(p for p in platforms if p["client_id"] == f"cid-{slug}")

    r3 = client.post(
        f"/onboard/platform/{platform['id']}/active",
        data={"admin_key": "test-admin-key", "active": "false"},
        follow_redirects=False,
    )
    assert r3.status_code == 303
    platforms2 = db.list_platforms_for_tenant(tenant["id"])
    row = next(p for p in platforms2 if str(p["id"]) == str(platform["id"]))
    assert row["active"] is False


def test_onboard_rejects_bad_issuer(client: TestClient):
    slug = f"badiss-{uuid4().hex[:6]}"
    client.post(
        "/onboard/tenant",
        data={"admin_key": "test-admin-key", "slug": slug, "name": "X"},
        follow_redirects=False,
    )
    from app import db

    tenant = db.get_tenant_by_slug(slug)
    r = client.post(
        "/onboard/platform",
        data={
            "admin_key": "test-admin-key",
            "tenant_id": str(tenant["id"]),
            "issuer": "not-a-url",
            "client_id": "cid",
            "deployment_ids": "1",
        },
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert "err=" in r.headers.get("location", "")