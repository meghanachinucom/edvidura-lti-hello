"""Cross-tenant isolation proofs for RLS-backed tables (DEC-006)."""
from __future__ import annotations

from typing import Any
from uuid import uuid4

from app import db
from app.tenancy import TENANT_A_ID, TENANT_B_ID


def prove_launch_events_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Insert one marker row per tenant, then prove neither side can see the other.

    Must run as a non-superuser / NOBYPASSRLS role (edvidura_app).
    """
    marker = uuid4().hex[:12]
    subject_a = f"iso-a-{marker}"
    subject_b = f"iso-b-{marker}"

    db.insert_launch_event(
        tenant_id=tenant_a_id,
        subject=subject_a,
        roles="system",
        course_label="isolation-ci",
        raw_claims={"marker": "A", "run": marker},
    )
    db.insert_launch_event(
        tenant_id=tenant_b_id,
        subject=subject_b,
        roles="system",
        course_label="isolation-ci",
        raw_claims={"marker": "B", "run": marker},
    )

    visible_as_a = db.list_launch_events_for_tenant(tenant_a_id)
    visible_as_b = db.list_launch_events_for_tenant(tenant_b_id)

    leaked_b_to_a = [r for r in visible_as_a if str(r["tenant_id"]) == str(tenant_b_id)]
    leaked_a_to_b = [r for r in visible_as_b if str(r["tenant_id"]) == str(tenant_a_id)]

    own_a = [r for r in visible_as_a if r["subject"] == subject_a]
    own_b = [r for r in visible_as_b if r["subject"] == subject_b]
    foreign_b_as_a = [r for r in visible_as_a if r["subject"] == subject_b]
    foreign_a_as_b = [r for r in visible_as_b if r["subject"] == subject_a]

    ok = (
        len(leaked_b_to_a) == 0
        and len(leaked_a_to_b) == 0
        and len(own_a) == 1
        and len(own_b) == 1
        and len(foreign_b_as_a) == 0
        and len(foreign_a_as_b) == 0
    )

    return {
        "ok": ok,
        "run": marker,
        "count_visible_as_tenant_a": db.count_launch_events_visible(tenant_a_id),
        "count_visible_as_tenant_b": db.count_launch_events_visible(tenant_b_id),
        "leaked_b_rows_to_a": len(leaked_b_to_a),
        "leaked_a_rows_to_b": len(leaked_a_to_b),
        "own_marker_visible_as_a": len(own_a),
        "own_marker_visible_as_b": len(own_b),
        "foreign_marker_visible_as_a": len(foreign_b_as_a),
        "foreign_marker_visible_as_b": len(foreign_a_as_b),
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }


def assert_cross_tenant_insert_rejected(
    *,
    acting_as_tenant_id: str,
    forged_tenant_id: str,
) -> None:
    """WITH CHECK must reject inserting another tenant's tenant_id."""
    import json

    from psycopg import Error as PsycopgError

    marker = uuid4().hex[:12]
    try:
        with db.tenant_connection(acting_as_tenant_id) as conn:
            conn.execute(
                """
                INSERT INTO launch_events (tenant_id, subject, roles, course_label, raw_claims)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                """,
                (
                    str(forged_tenant_id),
                    f"forged-{marker}",
                    "system",
                    "isolation-ci",
                    json.dumps({"forged": True}),
                ),
            )
    except PsycopgError as exc:
        msg = str(exc).lower()
        if (
            "row-level security" in msg
            or "violates row-level security policy" in msg
            or "policy" in msg
        ):
            return
        raise AssertionError(
            f"Expected RLS WITH CHECK rejection, got unexpected error: {exc}"
        ) from exc

    raise AssertionError(
        "Cross-tenant INSERT succeeded — RLS WITH CHECK is not enforcing isolation"
    )
