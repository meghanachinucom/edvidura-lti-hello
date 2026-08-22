"""Tenant isolation tests (DEC-006). Require Postgres as edvidura_app."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest
from pylti1p3.exception import LtiException

# Ensure settings see CI/local DATABASE_URL before app imports load dotenv overrides
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
)

from app import db  # noqa: E402
from app.tenant_context import TenantContext, get_tenant_context, use_tenant_context  # noqa: E402
from app.tenancy import TENANT_A_ID, TENANT_B_ID, resolve_platform  # noqa: E402
from app.tenancy_isolation import (  # noqa: E402
    assert_cross_tenant_insert_rejected,
    prove_course_content_isolation,
    prove_launch_events_isolation,
    prove_lesson_progress_isolation,
    prove_quiz_attempts_isolation,
    prove_teacher_content_write_isolation,
)
from app.modules.isolation import prove_capability_tables_isolation  # noqa: E402


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


def test_wrong_deployment_fail_closed():
    issuer = "https://deploy-check.example"
    client_id = f"client-{uuid4().hex[:10]}"
    db.upsert_platform(
        tenant_id=TENANT_A_ID,
        issuer=issuer,
        client_id=client_id,
        deployment_ids=["1"],
        auth_login_url=f"{issuer}/mod/lti/auth.php",
        auth_token_url=f"{issuer}/mod/lti/token.php",
        key_set_url=f"{issuer}/mod/lti/certs.php",
    )
    ok = resolve_platform(issuer, client_id, "1")
    assert str(ok.tenant_id) == TENANT_A_ID
    with pytest.raises(LtiException) as exc:
        resolve_platform(issuer, client_id, "999")
    assert "Deployment" in str(exc.value)


def test_quiz_attempts_rls_blocks_cross_tenant_reads():
    result = prove_quiz_attempts_isolation()
    assert result["ok"] is True, result
    assert result["foreign_marker_visible_as_a"] == 0
    assert result["foreign_marker_visible_as_b"] == 0


def test_course_content_rls_blocks_cross_tenant_reads():
    result = prove_course_content_isolation()
    assert result["ok"] is True, result
    assert result["leaked_b_course_to_a"] is False
    assert result["leaked_b_lesson_body_to_a"] is False


def test_lesson_progress_sticky_and_isolated():
    result = prove_lesson_progress_isolation()
    assert result["ok"] is True, result
    assert result["sticky_a"] is True
    assert result["sticky_b"] is True
    assert result["leaked_b_progress_to_a"] == 0


def test_teacher_lesson_create_isolated_from_other_tenant():
    result = prove_teacher_content_write_isolation()
    assert result["ok"] is True, result
    assert result["leaked_title_to_b"] is False
    assert result["fetched_as_b"] is False


def test_capability_tables_rls_and_pk_lookup():
    result = prove_capability_tables_isolation()
    assert result["ok"] is True, result
    assert result["leaked_snap_b_to_a"] is False
    assert result["leaked_tok_b_to_a"] is False
    assert result["invite_leaked_to_b"] is False
    assert result["pk_lookup_snap_ok"] is True
    assert result["pk_lookup_tok_ok"] is True


def test_mark_complete_rejects_empty_subject():
    from app.modules import content

    course = content.get_primary_course(TENANT_A_ID)
    assert course is not None
    lessons = [
        L for L in content.list_lessons(TENANT_A_ID, course["id"]) if L["lesson_type"] != "quiz"
    ]
    assert lessons
    with pytest.raises(ValueError, match="subject"):
        content.mark_lesson_complete(
            tenant_id=TENANT_A_ID,
            course_id=course["id"],
            lesson_id=lessons[0]["id"],
            subject="  ",
        )


def test_tenant_context_binds_for_request_scope():
    assert get_tenant_context() is None
    ctx = TenantContext(
        tenant_id=__import__("uuid").UUID(TENANT_A_ID),
        slug="tenant-a",
        name="Tenant A",
    )
    with use_tenant_context(ctx):
        bound = get_tenant_context()
        assert bound is not None
        assert bound.slug == "tenant-a"
        assert str(bound.tenant_id) == TENANT_A_ID
    assert get_tenant_context() is None


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
