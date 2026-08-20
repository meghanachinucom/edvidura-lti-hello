"""Postgres access helpers with tenant-scoped RLS session variable."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from app.settings import get_settings


def connect() -> psycopg.Connection:
    return psycopg.connect(
        get_settings().database_url,
        row_factory=dict_row,
        connect_timeout=5,
    )


@contextmanager
def tenant_connection(tenant_id: UUID | str) -> Iterator[psycopg.Connection]:
    """Open a connection and SET LOCAL app.tenant_id for RLS on tenant-owned tables."""
    tid = str(tenant_id)
    with connect() as conn:
        with conn.transaction():
            conn.execute("SELECT set_config('app.tenant_id', %s, true)", (tid,))
            yield conn


@contextmanager
def with_tenant(tenant_id: UUID | str) -> Iterator[psycopg.Connection]:
    """Alias for tenant_connection — preferred name for new call sites."""
    with tenant_connection(tenant_id) as conn:
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


def insert_quiz_attempt(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    course_label: str,
    score: int,
    max_score: int,
    answers: dict[str, Any],
    grade_sent: bool = False,
    grade_error: str | None = None,
) -> dict[str, Any]:
    import json

    with tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO quiz_attempts (
                tenant_id, subject, learner_name, course_label,
                score, max_score, answers, grade_sent, grade_error
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            RETURNING id, tenant_id, subject, learner_name, course_label,
                      score, max_score, answers, grade_sent, grade_error, created_at
            """,
            (
                str(tenant_id),
                subject,
                learner_name,
                course_label,
                score,
                max_score,
                json.dumps(answers),
                grade_sent,
                grade_error,
            ),
        ).fetchone()
        return dict(row)


def get_quiz_attempt(tenant_id: UUID | str, attempt_id: UUID | str) -> dict[str, Any] | None:
    with tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, subject, learner_name, course_label,
                   score, max_score, answers, grade_sent, grade_error, created_at
            FROM quiz_attempts
            WHERE id = %s
            """,
            (str(attempt_id),),
        ).fetchone()
        return dict(row) if row else None


def list_quiz_attempts_for_tenant(
    tenant_id: UUID | str, *, limit: int = 200
) -> list[dict[str, Any]]:
    with tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, subject, learner_name, course_label,
                   score, max_score, grade_sent, grade_error, created_at
            FROM quiz_attempts
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        ).fetchall()
        return list(rows)


def quiz_attempt_class_summary(
    tenant_id: UUID | str, *, limit: int = 200
) -> dict[str, Any]:
    """Aggregates + per-learner best score for teacher class results."""
    rows = list_quiz_attempts_for_tenant(tenant_id, limit=limit)
    if not rows:
        return {
            "attempts": [],
            "total_attempts": 0,
            "learner_count": 0,
            "avg_percent": None,
            "pass_rate": None,
            "synced_count": 0,
            "learners": [],
        }
    percents: list[float] = []
    synced = 0
    by_subject: dict[str, dict[str, Any]] = {}
    for r in rows:
        max_score = int(r.get("max_score") or 0) or 1
        score = int(r.get("score") or 0)
        pct = 100.0 * score / max_score
        percents.append(pct)
        if r.get("grade_sent"):
            synced += 1
        sub = str(r.get("subject") or "")
        name = str(r.get("learner_name") or sub or "Learner")
        cur = by_subject.get(sub)
        if cur is None:
            by_subject[sub] = {
                "subject": sub,
                "learner_name": name,
                "best_score": score,
                "best_max": max_score,
                "best_percent": int(round(pct)),
                "best_at": r.get("created_at"),
                "best_attempt_id": str(r["id"]),
                "attempts": 1,
                "grade_sent": bool(r.get("grade_sent")),
            }
        else:
            cur["attempts"] = int(cur["attempts"]) + 1
            if score > int(cur["best_score"]):
                cur["best_score"] = score
                cur["best_max"] = max_score
                cur["best_percent"] = int(round(pct))
                cur["best_at"] = r.get("created_at")
                cur["best_attempt_id"] = str(r["id"])
                cur["grade_sent"] = bool(r.get("grade_sent"))
                cur["learner_name"] = name

    # Pass = best attempt >= 60%
    learners = sorted(
        by_subject.values(),
        key=lambda x: (-int(x["best_percent"]), str(x["learner_name"]).lower()),
    )
    passed = sum(1 for L in learners if int(L["best_percent"]) >= 60)
    avg = int(round(sum(percents) / len(percents))) if percents else None
    return {
        "attempts": rows,
        "total_attempts": len(rows),
        "learner_count": len(learners),
        "avg_percent": avg,
        "pass_rate": int(round(100 * passed / len(learners))) if learners else None,
        "synced_count": synced,
        "learners": learners,
    }


def set_platform_active(*, platform_id: UUID | str, active: bool) -> dict[str, Any] | None:
    with connect() as conn:
        with conn.transaction():
            row = conn.execute(
                """
                UPDATE lti_platforms
                SET active = %s
                WHERE id = %s
                RETURNING id, tenant_id, issuer, client_id, deployment_ids, active, created_at
                """,
                (bool(active), str(platform_id)),
            ).fetchone()
            return dict(row) if row else None


def update_quiz_attempt_grade(
    *,
    tenant_id: UUID | str,
    attempt_id: UUID | str,
    grade_sent: bool,
    grade_error: str | None,
) -> None:
    with tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            UPDATE quiz_attempts
            SET grade_sent = %s, grade_error = %s
            WHERE id = %s
            """,
            (grade_sent, grade_error, str(attempt_id)),
        )


def save_launch_snapshot(
    *,
    launch_id: str,
    tenant_id: UUID | str | None,
    launch_data: dict[str, Any],
) -> None:
    import json

    with connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO lti_launch_snapshots (launch_id, tenant_id, launch_data)
                VALUES (%s, %s, %s::jsonb)
                ON CONFLICT (launch_id) DO UPDATE SET
                    tenant_id = EXCLUDED.tenant_id,
                    launch_data = EXCLUDED.launch_data,
                    created_at = now()
                """,
                (
                    launch_id,
                    str(tenant_id) if tenant_id else None,
                    json.dumps(launch_data),
                ),
            )


def get_launch_snapshot(launch_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT launch_data
            FROM lti_launch_snapshots
            WHERE launch_id = %s
              AND created_at > now() - interval '6 hours'
            """,
            (launch_id,),
        ).fetchone()
        if not row:
            return None
        data = row["launch_data"]
        if isinstance(data, dict):
            return dict(data)
        if isinstance(data, str):
            import json

            parsed = json.loads(data)
            return dict(parsed) if isinstance(parsed, dict) else None
        return None


def save_quiz_context(token: str, context: dict[str, Any], *, ttl_sec: int = 3600) -> None:
    """Persist quiz session token so submit survives uvicorn --reload."""
    import json

    with connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO quiz_session_tokens (token, context, expires_at)
                VALUES (%s, %s::jsonb, now() + (%s || ' seconds')::interval)
                ON CONFLICT (token) DO UPDATE SET
                    context = EXCLUDED.context,
                    expires_at = EXCLUDED.expires_at
                """,
                (token, json.dumps(context), str(int(ttl_sec))),
            )


def get_quiz_context(token: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT context
            FROM quiz_session_tokens
            WHERE token = %s
              AND expires_at > now()
            """,
            (token,),
        ).fetchone()
        if not row:
            return None
        data = row["context"]
        if isinstance(data, dict):
            return dict(data)
        if isinstance(data, str):
            import json

            parsed = json.loads(data)
            return dict(parsed) if isinstance(parsed, dict) else None
        return None


def upsert_platform(
    *,
    tenant_id: str,
    issuer: str,
    client_id: str,
    deployment_ids: list[str],
    auth_login_url: str,
    auth_token_url: str,
    key_set_url: str,
) -> dict[str, Any]:
    with connect() as conn:
        with conn.transaction():
            has_last_launch = conn.execute(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'lti_platforms'
                  AND column_name = 'last_launch_at'
                """
            ).fetchone()
            returning = (
                "id, tenant_id, issuer, client_id, deployment_ids, "
                "auth_login_url, auth_token_url, key_set_url, active, "
                + ("last_launch_at, " if has_last_launch else "")
                + "created_at"
            )
            row = conn.execute(
                f"""
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
                RETURNING {returning}
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
            ).fetchone()
            data = dict(row)
            data.setdefault("last_launch_at", None)
            return data


def touch_platform_last_launch(*, issuer: str, client_id: str) -> None:
    """Record a successful LTI launch for onboarding status."""
    with connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                UPDATE lti_platforms
                SET last_launch_at = now()
                WHERE rtrim(issuer, '/') = %s
                  AND client_id = %s
                  AND active = TRUE
                """,
                (issuer.rstrip("/"), client_id),
            )


def list_platforms_for_tenant(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, issuer, client_id, deployment_ids,
                   auth_login_url, auth_token_url, key_set_url,
                   active, last_launch_at, created_at
            FROM lti_platforms
            WHERE tenant_id = %s
            ORDER BY created_at DESC
            """,
            (str(tenant_id),),
        ).fetchall()
        return list(rows)


def list_all_platforms() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT p.id, p.tenant_id, t.slug AS tenant_slug, t.name AS tenant_name,
                   p.issuer, p.client_id, p.deployment_ids,
                   p.auth_login_url, p.auth_token_url, p.key_set_url,
                   p.active, p.last_launch_at, p.created_at
            FROM lti_platforms p
            JOIN tenants t ON t.id = p.tenant_id
            ORDER BY t.slug, p.created_at DESC
            """
        ).fetchall()
        return list(rows)


def create_tenant(*, slug: str, name: str, status: str = "active") -> dict[str, Any]:
    with connect() as conn:
        with conn.transaction():
            row = conn.execute(
                """
                INSERT INTO tenants (slug, name, status)
                VALUES (%s, %s, %s)
                RETURNING id, slug, name, status, created_at
                """,
                (slug.strip().lower(), name.strip(), status),
            ).fetchone()
            return dict(row)


def get_tenant_by_slug(slug: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT id, slug, name, status, created_at
            FROM tenants
            WHERE slug = %s
            """,
            (slug.strip().lower(),),
        ).fetchone()
        return dict(row) if row else None


def list_tenants() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, slug, name, status, created_at
            FROM tenants
            ORDER BY created_at ASC
            """
        ).fetchall()
        return list(rows)


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


