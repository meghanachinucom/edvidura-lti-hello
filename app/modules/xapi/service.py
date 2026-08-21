"""Persist xAPI statements under RLS; tier promotion + LRS forward with retry."""
from __future__ import annotations

import base64
import json
import logging
import time
from typing import Any
from uuid import UUID

import httpx

from app import db
from app.modules.xapi.builder import (
    build_lesson_completed_statement,
    build_quiz_attempt_statement,
    build_resource_experienced_statement,
)
from app.settings import get_settings

logger = logging.getLogger("edvidura.xapi")


def record_quiz_attempt(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    attempt_id: UUID | str,
    score: int,
    max_score: int,
    course_label: str = "",
    homepage: str | None = None,
    source_event_id: UUID | str | None = None,
    send_lrs: bool = True,
) -> dict[str, Any]:
    settings = get_settings()
    statement = build_quiz_attempt_statement(
        tenant_id=tenant_id,
        subject=subject,
        learner_name=learner_name,
        attempt_id=attempt_id,
        score=score,
        max_score=max_score,
        course_label=course_label,
        homepage=homepage or settings.xapi_actor_homepage,
        activity_base=settings.app_base_url,
    )
    return _store_and_maybe_send(
        tenant_id=tenant_id,
        statement=statement,
        actor_sub=subject,
        attempt_id=attempt_id,
        source_event_id=source_event_id,
        send_lrs=send_lrs,
        promote_on_valid=True,
    )


def record_lesson_completed(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    lesson_id: UUID | str,
    lesson_title: str,
    homepage: str | None = None,
    send_lrs: bool = True,
) -> dict[str, Any]:
    settings = get_settings()
    statement = build_lesson_completed_statement(
        tenant_id=tenant_id,
        subject=subject,
        learner_name=learner_name,
        lesson_id=lesson_id,
        lesson_title=lesson_title,
        homepage=homepage or settings.xapi_actor_homepage,
        activity_base=settings.app_base_url,
    )
    return _store_and_maybe_send(
        tenant_id=tenant_id,
        statement=statement,
        actor_sub=subject,
        attempt_id=None,
        source_event_id=None,
        send_lrs=send_lrs,
        promote_on_valid=True,
    )


def record_resource_experienced(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    resource_id: UUID | str,
    resource_title: str,
    resource_kind: str = "manual",
    homepage: str | None = None,
    send_lrs: bool = True,
) -> dict[str, Any]:
    settings = get_settings()
    statement = build_resource_experienced_statement(
        tenant_id=tenant_id,
        subject=subject,
        learner_name=learner_name,
        resource_id=resource_id,
        resource_title=resource_title,
        resource_kind=resource_kind,
        homepage=homepage or settings.xapi_actor_homepage,
        activity_base=settings.app_base_url,
    )
    return _store_and_maybe_send(
        tenant_id=tenant_id,
        statement=statement,
        actor_sub=subject,
        attempt_id=None,
        source_event_id=None,
        send_lrs=send_lrs,
        promote_on_valid=True,
    )


def _store_and_maybe_send(
    *,
    tenant_id: UUID | str,
    statement: dict[str, Any],
    actor_sub: str,
    attempt_id: UUID | str | None,
    source_event_id: UUID | str | None,
    send_lrs: bool,
    promote_on_valid: bool,
) -> dict[str, Any]:
    verb_id = str(statement.get("verb", {}).get("id") or "")
    object_id = str(statement.get("object", {}).get("id") or "")
    statement_id = str(statement.get("id") or "")
    tier = "transactional" if promote_on_valid and _statement_valid(statement) else "noisy"
    stored: dict[str, Any]
    try:
        with db.tenant_connection(tenant_id) as conn:
            row = conn.execute(
                """
                INSERT INTO xapi_statements (
                    tenant_id, statement_id, verb_id, actor_sub, object_id,
                    statement, source_event_id, attempt_id, tier, promoted_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s,
                    CASE WHEN %s = 'transactional' THEN now() ELSE NULL END
                )
                ON CONFLICT (statement_id) DO UPDATE SET
                    statement = EXCLUDED.statement,
                    tier = EXCLUDED.tier,
                    promoted_at = COALESCE(xapi_statements.promoted_at, EXCLUDED.promoted_at)
                RETURNING id, tenant_id, statement_id, verb_id, actor_sub, object_id,
                          statement, sent_to_lrs, lrs_error, created_at, attempt_id,
                          tier, lrs_attempts, promoted_at
                """,
                (
                    str(tenant_id),
                    statement_id,
                    verb_id,
                    actor_sub or "",
                    object_id,
                    json.dumps(statement),
                    str(source_event_id) if source_event_id else None,
                    str(attempt_id) if attempt_id else None,
                    tier,
                    tier,
                ),
            ).fetchone()
            stored = dict(row)
    except Exception as exc:  # noqa: BLE001
        # Pre-migration DBs without tier columns
        logger.warning("xAPI tier insert failed, falling back: %s", exc)
        with db.tenant_connection(tenant_id) as conn:
            row = conn.execute(
                """
                INSERT INTO xapi_statements (
                    tenant_id, statement_id, verb_id, actor_sub, object_id,
                    statement, source_event_id, attempt_id
                )
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                ON CONFLICT (statement_id) DO UPDATE SET
                    statement = EXCLUDED.statement
                RETURNING id, tenant_id, statement_id, verb_id, actor_sub, object_id,
                          statement, sent_to_lrs, lrs_error, created_at, attempt_id
                """,
                (
                    str(tenant_id),
                    statement_id,
                    verb_id,
                    actor_sub or "",
                    object_id,
                    json.dumps(statement),
                    str(source_event_id) if source_event_id else None,
                    str(attempt_id) if attempt_id else None,
                ),
            ).fetchone()
            stored = dict(row)
            stored["tier"] = tier

    if send_lrs:
        ok, err, attempts = forward_to_lrs(statement, retries=3)
        _mark_lrs(
            tenant_id=tenant_id,
            statement_id=statement_id,
            sent=ok,
            error=err,
            attempts=attempts,
        )
        if ok:
            _set_tier(tenant_id, statement_id, "authoritative")
            stored["tier"] = "authoritative"
        stored["sent_to_lrs"] = ok
        stored["lrs_error"] = err
        stored["lrs_attempts"] = attempts
    return stored


def _statement_valid(statement: dict[str, Any]) -> bool:
    return bool(
        statement.get("id")
        and statement.get("actor")
        and statement.get("verb", {}).get("id")
        and statement.get("object", {}).get("id")
    )


def _mark_lrs(
    *,
    tenant_id: UUID | str,
    statement_id: str,
    sent: bool,
    error: str | None,
    attempts: int,
) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            UPDATE xapi_statements
            SET sent_to_lrs = %s, lrs_error = %s, lrs_attempts = %s
            WHERE statement_id = %s
            """,
            (sent, error, attempts, statement_id),
        )


def _set_tier(tenant_id: UUID | str, statement_id: str, tier: str) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            UPDATE xapi_statements
            SET tier = %s,
                promoted_at = COALESCE(promoted_at, now())
            WHERE statement_id = %s
            """,
            (tier, statement_id),
        )


def forward_to_lrs(
    statement: dict[str, Any], *, retries: int = 3
) -> tuple[bool, str | None, int]:
    """POST statement to LRS with simple retry. No-op if LRS not configured."""
    settings = get_settings()
    endpoint = (settings.xapi_lrs_endpoint or "").strip().rstrip("/")
    if not endpoint:
        return False, None, 0
    key = settings.xapi_lrs_key
    secret = settings.xapi_lrs_secret
    if not key or not secret:
        return False, "LRS key/secret missing", 0
    url = endpoint if endpoint.endswith("/statements") else f"{endpoint}/statements"
    token = base64.b64encode(f"{key}:{secret}".encode()).decode()
    headers = {
        "Authorization": f"Basic {token}",
        "X-Experience-API-Version": "1.0.3",
        "Content-Type": "application/json",
    }
    last_err: str | None = None
    attempts = 0
    for i in range(max(1, retries)):
        attempts = i + 1
        try:
            with httpx.Client(timeout=12.0) as client:
                resp = client.post(url, headers=headers, json=statement)
            if resp.status_code in {200, 204}:
                return True, None, attempts
            last_err = f"LRS HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as exc:  # noqa: BLE001
            last_err = str(exc)
            logger.warning("LRS forward attempt %s failed: %s", attempts, exc)
        if i + 1 < retries:
            time.sleep(0.4 * (2**i))
    return False, last_err, attempts


def retry_failed_lrs(
    tenant_id: UUID | str, *, limit: int = 50
) -> dict[str, Any]:
    """Re-send statements that never reached the LRS."""
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT statement_id, statement, lrs_attempts
            FROM xapi_statements
            WHERE sent_to_lrs = FALSE
              AND COALESCE(lrs_error, '') <> ''
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (limit,),
        ).fetchall()
    ok_n = 0
    fail_n = 0
    for r in rows:
        stmt = r["statement"]
        if isinstance(stmt, str):
            stmt = json.loads(stmt)
        success, err, attempts = forward_to_lrs(stmt, retries=2)
        prev = int(r.get("lrs_attempts") or 0)
        _mark_lrs(
            tenant_id=tenant_id,
            statement_id=str(r["statement_id"]),
            sent=success,
            error=err,
            attempts=prev + attempts,
        )
        if success:
            _set_tier(tenant_id, str(r["statement_id"]), "authoritative")
            ok_n += 1
        else:
            fail_n += 1
    return {"retried": len(rows), "sent": ok_n, "failed": fail_n}


def list_statements(
    tenant_id: UUID | str, *, limit: int = 50, tier: str | None = None
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        if tier:
            rows = conn.execute(
                """
                SELECT id, statement_id, verb_id, actor_sub, object_id,
                       statement, sent_to_lrs, lrs_error, created_at, attempt_id,
                       tier, lrs_attempts, promoted_at
                FROM xapi_statements
                WHERE tier = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (tier, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, statement_id, verb_id, actor_sub, object_id,
                       statement, sent_to_lrs, lrs_error, created_at, attempt_id,
                       tier, lrs_attempts, promoted_at
                FROM xapi_statements
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]


def tier_counts(tenant_id: UUID | str) -> dict[str, int]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT tier, COUNT(*)::int AS n
            FROM xapi_statements
            GROUP BY tier
            """
        ).fetchall()
    out = {"noisy": 0, "transactional": 0, "authoritative": 0}
    for r in rows:
        out[str(r["tier"])] = int(r["n"])
    return out
