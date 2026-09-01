"""Event outbox producer / drain — EVENT_ENVELOPE_V1 (+ D17 webhook)."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import httpx

from app import db
from app.settings import get_settings

logger = logging.getLogger("edvidura.events")


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


def row_to_envelope(row: dict[str, Any]) -> dict[str, Any]:
    payload = row.get("payload") or {}
    if isinstance(payload, str):
        payload = json.loads(payload)
    occurred = row.get("occurred_at")
    if hasattr(occurred, "isoformat"):
        occurred_at = occurred.isoformat().replace("+00:00", "Z")
    else:
        occurred_at = str(occurred or "")
    return {
        "event_id": str(row["event_id"]),
        "event_type": str(row["event_type"]),
        "occurred_at": occurred_at,
        "tenant_id": str(row["tenant_id"]),
        "subject": row.get("subject"),
        "payload": payload if isinstance(payload, dict) else {},
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
                (error[:2000], str(outbox_id)),
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


def sign_webhook_body(body: bytes | str, secret: str) -> str:
    raw = body if isinstance(body, bytes) else body.encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def deliver_webhook(envelope: dict[str, Any]) -> tuple[bool, str | None]:
    """
    POST EVENT_ENVELOPE_V1 to EVENT_WEBHOOK_URL when pipeline enabled.

    Returns (ok, error). When pipeline disabled or URL empty → local sink (ok).
    """
    settings = get_settings()
    if not settings.event_pipeline_enabled:
        return True, None
    url = (settings.event_webhook_url or "").strip()
    if not url:
        return True, None
    body = json.dumps(envelope, separators=(",", ":"), default=str)
    headers = {"Content-Type": "application/json"}
    secret = (settings.event_webhook_secret or "").strip()
    if secret:
        headers["X-EdVidura-Signature"] = sign_webhook_body(body, secret)
    try:
        resp = httpx.post(url, content=body, headers=headers, timeout=30.0)
        resp.raise_for_status()
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.warning("outbox webhook failed: %s", exc)
        return False, str(exc)[:500]


def drain_tenant(
    tenant_id: UUID | str, *, limit: int = 50
) -> dict[str, Any]:
    """Deliver pending envelopes (webhook when configured) then mark published."""
    settings = get_settings()
    pending = list_pending_for_tenant(tenant_id, limit=limit)
    done = 0
    failed = 0
    drained_ids: list[str] = []
    errors: list[dict[str, str]] = []
    mode = "local"
    if settings.event_pipeline_enabled and settings.event_webhook_url:
        mode = "webhook"
    for row in pending:
        envelope = row_to_envelope(row)
        ok, err = deliver_webhook(envelope)
        if ok:
            mark_published(tenant_id=tenant_id, outbox_id=row["id"])
            done += 1
            drained_ids.append(str(row["event_id"]))
        else:
            mark_published(
                tenant_id=tenant_id, outbox_id=row["id"], error=err or "deliver failed"
            )
            failed += 1
            errors.append(
                {"event_id": str(row["event_id"]), "error": err or "deliver failed"}
            )
    return {
        "tenant_id": str(tenant_id),
        "mode": mode,
        "drained": done,
        "failed": failed,
        "event_ids": drained_ids,
        "errors": errors,
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
