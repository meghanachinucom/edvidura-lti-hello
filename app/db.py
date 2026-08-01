"""Postgres access helpers with tenant-scoped RLS session variable."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from app.settings import get_settings


def connect() -> psycopg.Connection:
    return psycopg.connect(get_settings().database_url, row_factory=dict_row)


@contextmanager
def tenant_connection(tenant_id: UUID | str) -> Iterator[psycopg.Connection]:
    """Open a connection and SET LOCAL app.tenant_id for RLS on launch_events."""
    tid = str(tenant_id)
    with connect() as conn:
        with conn.transaction():
            conn.execute("SELECT set_config('app.tenant_id', %s, true)", (tid,))
            yield conn


def fetch_all_active_platforms() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT p.*, t.slug AS tenant_slug, t.name AS tenant_name
            FROM lti_platforms p
            JOIN tenants t ON t.id = p.tenant_id
            WHERE p.active = TRUE AND t.status = 'active'
            ORDER BY t.slug, p.issuer
            """
        ).fetchall()
        return list(rows)


def find_platform(issuer: str, client_id: str) -> dict[str, Any] | None:
    issuer = issuer.rstrip("/")
    with connect() as conn:
        row = conn.execute(
            """
            SELECT p.*, t.slug AS tenant_slug, t.name AS tenant_name
            FROM lti_platforms p
            JOIN tenants t ON t.id = p.tenant_id
            WHERE p.active = TRUE
              AND t.status = 'active'
              AND rtrim(p.issuer, '/') = %s
              AND p.client_id = %s
            LIMIT 1
            """,
            (issuer, client_id),
        ).fetchone()
        return dict(row) if row else None


def platform_allows_deployment(platform: dict[str, Any], deployment_id: str | None) -> bool:
    allowed = list(platform.get("deployment_ids") or [])
    if not allowed:
        return True
    if deployment_id is None:
        return False
    return deployment_id in allowed


def insert_launch_event(
    *,
    tenant_id: UUID | str,
    subject: str,
    roles: str,
    course_label: str,
    raw_claims: dict[str, Any],
) -> dict[str, Any]:
    import json

    with tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO launch_events (tenant_id, subject, roles, course_label, raw_claims)
            VALUES (%s, %s, %s, %s, %s::jsonb)
            RETURNING id, tenant_id, subject, roles, course_label, created_at
            """,
            (
                str(tenant_id),
                subject,
                roles,
                course_label,
                json.dumps(raw_claims),
            ),
        ).fetchone()
        return dict(row)


def list_launch_events_for_tenant(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, subject, roles, course_label, created_at
            FROM launch_events
            ORDER BY created_at DESC
            LIMIT 50
            """
        ).fetchall()
        return list(rows)


def count_launch_events_visible(tenant_id: UUID | str) -> int:
    with tenant_connection(tenant_id) as conn:
        row = conn.execute("SELECT count(*) AS n FROM launch_events").fetchone()
        return int(row["n"])


def upsert_platform(
    *,
    tenant_id: str,
    issuer: str,
    client_id: str,
    deployment_ids: list[str],
    auth_login_url: str,
    auth_token_url: str,
    key_set_url: str,
) -> None:
    with connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO lti_platforms (
                    tenant_id, issuer, client_id, deployment_ids,
                    auth_login_url, auth_token_url, key_set_url, active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (issuer, client_id) DO UPDATE SET
                    tenant_id = EXCLUDED.tenant_id,
                    deployment_ids = EXCLUDED.deployment_ids,
                    auth_login_url = EXCLUDED.auth_login_url,
                    auth_token_url = EXCLUDED.auth_token_url,
                    key_set_url = EXCLUDED.key_set_url,
                    active = TRUE
                """,
                (
                    tenant_id,
                    issuer.rstrip("/"),
                    client_id,
                    deployment_ids,
                    auth_login_url,
                    auth_token_url,
                    key_set_url,
                ),
            )


def get_tenant(tenant_id: UUID | str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT id, slug, name, status, created_at
            FROM tenants
            WHERE id = %s
            """,
            (str(tenant_id),),
        ).fetchone()
        return dict(row) if row else None


def create_institution(
    *,
    tenant_id: UUID | str,
    institution_code: str,
    institution_name: str,
    issuer: str,
    client_id: str,
    deployment_ids: list[str] | None = None,
    status: str = "active",
) -> dict[str, Any]:
    if deployment_ids is None:
        deployment_ids = ["1"]
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO institutions (
                tenant_id, institution_code, institution_name,
                issuer, client_id, deployment_ids, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, tenant_id, institution_code, institution_name,
                      issuer, client_id, deployment_ids, status, created_at
            """,
            (
                str(tenant_id),
                institution_code,
                institution_name,
                issuer,
                client_id,
                deployment_ids,
                status,
            ),
        ).fetchone()
        return dict(row)


def get_institution(institution_id: UUID | str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, institution_code, institution_name,
                   issuer, client_id, deployment_ids, status, created_at
            FROM institutions
            WHERE id = %s
            """,
            (str(institution_id),),
        ).fetchone()
        return dict(row) if row else None


def get_institution_by_code(institution_code: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, institution_code, institution_name,
                   issuer, client_id, deployment_ids, status, created_at
            FROM institutions
            WHERE institution_code = %s
            """,
            (institution_code,),
        ).fetchone()
        return dict(row) if row else None


def list_institutions() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, institution_code, institution_name,
                   issuer, client_id, deployment_ids, status, created_at
            FROM institutions
            ORDER BY created_at DESC
            """
        ).fetchall()
        return list(rows)


def create_student(
    *,
    institution_id: UUID | str,
    student_code: str,
    name: str,
    email: str,
    status: str = "active",
) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO students (
                institution_id, student_code, name, email, status
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, institution_id, student_code, name, email, status, created_at
            """,
            (
                str(institution_id),
                student_code,
                name,
                email,
                status,
            ),
        ).fetchone()
        return dict(row)


def get_student(student_id: UUID | str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT id, institution_id, student_code, name, email, status, created_at
            FROM students
            WHERE id = %s
            """,
            (str(student_id),),
        ).fetchone()
        return dict(row) if row else None


def get_student_by_institution_and_code(
    institution_id: UUID | str, student_code: str
) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT id, institution_id, student_code, name, email, status, created_at
            FROM students
            WHERE institution_id = %s AND student_code = %s
            """,
            (str(institution_id), student_code),
        ).fetchone()
        return dict(row) if row else None


def list_students(institution_id: UUID | str | None = None) -> list[dict[str, Any]]:
    with connect() as conn:
        if institution_id:
            rows = conn.execute(
                """
                SELECT id, institution_id, student_code, name, email, status, created_at
                FROM students
                WHERE institution_id = %s
                ORDER BY created_at DESC
                """,
                (str(institution_id),),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, institution_id, student_code, name, email, status, created_at
                FROM students
                ORDER BY created_at DESC
                """
            ).fetchall()
        return list(rows)


