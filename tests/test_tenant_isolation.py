"""Tenant isolation tests (DEC-006). Require Postgres as edvidura_app."""
from __future__ import annotations

import os

import pytest
from pylti1p3.exception import LtiException

# Ensure settings see CI/local DATABASE_URL before app imports load dotenv overrides
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
)

from app import db  # noqa: E402
from app.tenancy import TENANT_A_ID, TENANT_B_ID, resolve_platform  # noqa: E402
from app.tenancy_isolation import (  # noqa: E402
    assert_cross_tenant_insert_rejected,
    prove_launch_events_isolation,
)


def _db_required() -> bool:
    return os.getenv("CI", "").lower() in ("1", "true") or os.getenv(
        "REQUIRE_DB", ""
    ).lower() in ("1", "true", "yes")


def _db_reachable() -> bool:
    try:
        with db.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:  # noqa: BLE001
        return False


@pytest.fixture(scope="module", autouse=True)
def _postgres_available():
    if _db_reachable():
        return
    if _db_required():
        pytest.fail(
            "Postgres not reachable as edvidura_app — isolation CI cannot pass"
        )
    pytest.skip("Postgres not reachable as edvidura_app (start db/ docker compose)")


def test_launch_events_rls_blocks_cross_tenant_reads():
    result = prove_launch_events_isolation()
    assert result["ok"] is True, result
    assert result["leaked_b_rows_to_a"] == 0
    assert result["leaked_a_rows_to_b"] == 0
    assert result["own_marker_visible_as_a"] == 1
    assert result["own_marker_visible_as_b"] == 1
    assert result["foreign_marker_visible_as_a"] == 0
    assert result["foreign_marker_visible_as_b"] == 0


def test_launch_events_rls_rejects_forged_tenant_id_on_insert():
    assert_cross_tenant_insert_rejected(
        acting_as_tenant_id=TENANT_A_ID,
        forged_tenant_id=TENANT_B_ID,
    )


def test_unknown_platform_fail_closed():
    with pytest.raises(LtiException) as exc:
        resolve_platform(
            "https://unknown-moodle.example",
            "not-a-real-client",
            "1",
        )
    assert "Unknown LTI platform" in str(exc.value)


def test_app_role_is_not_bypassrls():
    """Guardrail: isolation tests are meaningless if the DB role bypasses RLS."""
    with db.connect() as conn:
        row = conn.execute(
            """
            SELECT current_user AS usr,
                   rolsuper,
                   rolbypassrls
            FROM pg_roles
            WHERE rolname = current_user
            """
        ).fetchone()
    assert row["usr"] == "edvidura_app"
    assert row["rolsuper"] is False
    assert row["rolbypassrls"] is False
