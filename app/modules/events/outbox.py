"""Event outbox producer — EVENT_ENVELOPE_V1."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app import db


def build_envelope(
    *,
    event_type: str,
    tenant_id: UUID | str,
    subject: str | None = None,
    payload: dict[str, Any] | None = None,
    event_id: UUID | str | None = None,
    occurred_at: datetime | None = None,
) -> dict[str, Any]:
    """Build a locked EVENT_ENVELOPE_V1 dict (tenant_id required)."""
    tid = str(tenant_id).strip()
    if not tid:
        raise ValueError("tenant_id is required on every event")
    when = occurred_at or datetime.now(timezone.utc)
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    eid = str(event_id or uuid4())
    return {
        "event_id": eid,
        "event_type": event_type,
        "occurred_at": when.isoformat().replace("+00:00", "Z"),
        "tenant_id": tid,
        "subject": subject,
        "payload": payload or {},
    }


def enqueue_event(
    *,
    tenant_id: UUID | str,
    event_type: str,
    subject: str | None = None,
    payload: dict[str, Any] | None = None,
    event_id: UUID | str | None = None,
) -> dict[str, Any]:
    """Insert an unpublished outbox row under RLS for this tenant."""
    envelope = build_envelope(
        event_type=event_type,
        tenant_id=tenant_id,
        subject=subject,
        payload=payload,
        event_id=event_id,
    )
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO event_outbox (
                tenant_id, event_id, event_type, occurred_at, subject, payload
            )
            VALUES (%s, %s, %s, %s::timestamptz, %s, %s::jsonb)
            RETURNING id, tenant_id, event_id, event_type, occurred_at, subject,
                      payload, created_at, published_at, publish_error
            """,
            (
                envelope["tenant_id"],
                envelope["event_id"],
                envelope["event_type"],
                envelope["occurred_at"],
                envelope.get("subject"),
                json.dumps(envelope["payload"]),
            ),
        ).fetchone()
        return dict(row)


def list_pending_for_tenant(
    tenant_id: UUID | str, *, limit: int = 50
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, event_id, event_type, occurred_at, subject,
                   payload, created_at, published_at, publish_error
            FROM event_outbox
            WHERE published_at IS NULL
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def mark_published(
    *,
    tenant_id: UUID | str,
    outbox_id: UUID | str,
    error: str | None = None,
) -> None:
    with db.tenant_connection(tenant_id) as conn:
        if error:
            conn.execute(
                """
                UPDATE event_outbox
                SET publish_error = %s
                WHERE id = %s
                """,
                (error, str(outbox_id)),
            )
        else:
            conn.execute(
                """
                UPDATE event_outbox
                SET published_at = now(), publish_error = NULL
                WHERE id = %s
                """,
                (str(outbox_id),),
            )


def drain_tenant(
    tenant_id: UUID | str, *, limit: int = 50
) -> dict[str, Any]:
    """Mark pending events published (local sink — no external bus yet)."""
    pending = list_pending_for_tenant(tenant_id, limit=limit)
    done = 0
    for row in pending:
        mark_published(tenant_id=tenant_id, outbox_id=row["id"])
        done += 1
    return {
        "tenant_id": str(tenant_id),
        "drained": done,
        "event_ids": [str(r["event_id"]) for r in pending],
    }


def enqueue_quiz_attempt_submitted(
    *,
    tenant_id: UUID | str,
    subject: str,
    attempt_id: UUID | str,
    score: int,
    max_score: int,
    course_label: str = "",
) -> dict[str, Any]:
    return enqueue_event(
        tenant_id=tenant_id,
        event_type="quiz.attempt.submitted",
        subject=subject,
        payload={
            "attempt_id": str(attempt_id),
            "score": int(score),
            "max_score": int(max_score),
            "course_label": course_label or "",
        },
    )
