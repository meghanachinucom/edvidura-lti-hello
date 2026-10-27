"""xAPI middleware API (ops-authenticated). Moodle AGS remains grade SoR."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.admin_auth import OpsAuth
from app import db
from app.modules import xapi as xapi_mod

router = APIRouter(prefix="/api/v1/xapi", tags=["xAPI"])


class StatementIngest(BaseModel):
    tenant_id: UUID
    statement: dict[str, Any]
    attempt_id: UUID | None = None
    actor_sub: str | None = None
    send_lrs: bool = False


class StatementBatchIngest(BaseModel):
    tenant_id: UUID
    statements: list[dict[str, Any]] = Field(default_factory=list)
    send_lrs: bool = False


class PromoteBody(BaseModel):
    tier: str = Field(description="noisy | transactional | authoritative")
    send_lrs: bool = False


def _row_public(row: dict[str, Any]) -> dict[str, Any]:
    out = {
        "statement_id": str(row.get("statement_id") or ""),
        "verb_id": str(row.get("verb_id") or ""),
        "actor_sub": str(row.get("actor_sub") or ""),
        "object_id": str(row.get("object_id") or ""),
        "attempt_id": str(row.get("attempt_id") or "") or None,
        "tier": str(row.get("tier") or "noisy"),
        "sent_to_lrs": bool(row.get("sent_to_lrs")),
        "lrs_error": row.get("lrs_error"),
        "lrs_attempts": int(row.get("lrs_attempts") or 0),
        "statement": row.get("statement"),
        "created_at": (
            row["created_at"].isoformat()
            if hasattr(row.get("created_at"), "isoformat")
            else str(row.get("created_at") or "")
        ),
        "promoted_at": (
            row["promoted_at"].isoformat()
            if hasattr(row.get("promoted_at"), "isoformat")
            else str(row.get("promoted_at") or "") or None
        ),
    }
    return out


def _require_tenant(tenant_id: UUID) -> None:
    if not db.get_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' not found",
        )


@router.post("/statements", status_code=status.HTTP_201_CREATED)
def ingest_statement(payload: StatementIngest, _ops: OpsAuth) -> dict[str, Any]:
    """Store one xAPI statement (does not write Moodle grades)."""
    _require_tenant(payload.tenant_id)
    try:
        stored = xapi_mod.store_raw_statement(
            tenant_id=payload.tenant_id,
            statement=payload.statement,
            attempt_id=payload.attempt_id,
            actor_sub=payload.actor_sub,
            send_lrs=payload.send_lrs,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return _row_public(stored)


@router.post("/statements/batch", status_code=status.HTTP_201_CREATED)
def ingest_statement_batch(
    payload: StatementBatchIngest, _ops: OpsAuth
) -> dict[str, Any]:
    _require_tenant(payload.tenant_id)
    if not payload.statements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="statements required"
        )
    if len(payload.statements) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="max 50 statements"
        )
    stored_rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    for i, stmt in enumerate(payload.statements):
        try:
            row = xapi_mod.store_raw_statement(
                tenant_id=payload.tenant_id,
                statement=stmt,
                send_lrs=payload.send_lrs,
            )
            stored_rows.append(_row_public(row))
        except ValueError as exc:
            errors.append({"index": i, "error": str(exc)})
    return {"stored": stored_rows, "errors": errors, "count": len(stored_rows)}


@router.get("/statements")
def list_xapi_statements(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    limit: int = Query(50, ge=1, le=500),
    tier: str | None = None,
    attempt_id: UUID | None = None,
    subject: str | None = None,
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    rows = xapi_mod.list_statements(
        tenant_id,
        limit=limit,
        tier=tier,
        attempt_id=attempt_id,
        subject=subject,
    )
    return {
        "tenant_id": str(tenant_id),
        "count": len(rows),
        "tiers": xapi_mod.tier_counts(tenant_id),
        "statements": [_row_public(r) for r in rows],
    }


@router.post("/statements/{statement_id}/promote")
def promote_statement(
    statement_id: str,
    payload: PromoteBody,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    try:
        row = xapi_mod.promote_tier(
            tenant_id,
            statement_id,
            tier=payload.tier,
            send_lrs=payload.send_lrs,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found"
        )
    return _row_public(row)


@router.post("/retry-lrs")
def retry_lrs(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    result = xapi_mod.retry_failed_lrs(tenant_id, limit=limit)
    result["tiers"] = xapi_mod.tier_counts(tenant_id)
    result["tenant_id"] = str(tenant_id)
    return result


class FileIngest(BaseModel):
    tenant_id: UUID
    filename: str
    file_key: str = ""
    content_type: str = ""
    json_body: dict[str, Any] | list[Any] | None = None
    base64: str = ""
    source: str = "upload"


class GradeIngest(BaseModel):
    tenant_id: UUID
    subject: str
    score: int
    max_score: int = 1
    learner_name: str = ""
    activity_id: str = "school-quiz"
    source: str = "external"
    course_label: str = ""


class AttemptSyncIn(BaseModel):
    tenant_id: UUID
    subject: str
    used: int
    activity_id: str = "school-quiz"
    source: str = "external"


@router.get("/assignments")
def xapi_assignments(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    subject: str | None = None,
) -> dict[str, Any]:
    """F-3 user assignment dashboard for external modules."""
    _require_tenant(tenant_id)
    pack = xapi_mod.assignment_dashboard(tenant_id, subject=subject)
    pack["tenant_id"] = str(tenant_id)
    return pack


@router.post("/files", status_code=status.HTTP_201_CREATED)
def xapi_put_file(payload: FileIngest, _ops: OpsAuth) -> dict[str, Any]:
    _require_tenant(payload.tenant_id)
    body = b""
    if payload.base64.strip():
        try:
            body = xapi_mod.decode_base64_body(payload.base64)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="invalid base64"
            ) from exc
    try:
        return xapi_mod.put_file(
            payload.tenant_id,
            filename=payload.filename,
            payload=body or None,
            json_body=payload.json_body,
            content_type=payload.content_type,
            file_key=payload.file_key,
            source=payload.source,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("/files/{file_id}")
def xapi_fetch_json(
    file_id: str,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    subject: str | None = None,
) -> dict[str, Any]:
    """F-4 structured JSON file fetcher."""
    _require_tenant(tenant_id)
    try:
        return xapi_mod.fetch_json_file(
            tenant_id, file_id, subject=subject or ""
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=str(exc)
        ) from exc


@router.get("/files/{file_id}/stream")
def xapi_stream_file(
    file_id: str,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    subject: str | None = None,
) -> Response:
    """F-9 universal file streamer."""
    _require_tenant(tenant_id)
    try:
        data, content_type, filename = xapi_mod.stream_file(
            tenant_id, file_id, subject=subject or ""
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "X-File-Kind": xapi_mod.detect_file_kind(filename, content_type, data)[
                "kind"
            ],
        },
    )


@router.get("/files/{file_id}/meta")
def xapi_file_meta(
    file_id: str,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    subject: str | None = None,
) -> dict[str, Any]:
    """F-10 file type detection and routing."""
    _require_tenant(tenant_id)
    try:
        return xapi_mod.file_meta(tenant_id, file_id, subject=subject or "")
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post("/grades", status_code=status.HTTP_201_CREATED)
def xapi_ingest_grade(payload: GradeIngest, _ops: OpsAuth) -> dict[str, Any]:
    """F-5 inbound grade from an external module (does not replace Moodle AGS)."""
    _require_tenant(payload.tenant_id)
    try:
        return xapi_mod.ingest_external_grade(
            payload.tenant_id,
            subject=payload.subject,
            score=payload.score,
            max_score=payload.max_score,
            learner_name=payload.learner_name,
            activity_id=payload.activity_id,
            source=payload.source,
            course_label=payload.course_label,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("/attempts")
def xapi_attempt_counters(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    subject: str | None = None,
    activity_id: str | None = None,
) -> dict[str, Any]:
    """F-6 attempt counter view (local graded + synced external)."""
    _require_tenant(tenant_id)
    pack = xapi_mod.attempt_counters(
        tenant_id, subject=subject, activity_id=activity_id or ""
    )
    pack["tenant_id"] = str(tenant_id)
    return pack


@router.post("/attempts/sync")
def xapi_sync_attempts(payload: AttemptSyncIn, _ops: OpsAuth) -> dict[str, Any]:
    """F-6 merge an external module's attempt count."""
    _require_tenant(payload.tenant_id)
    try:
        return xapi_mod.sync_attempt_counter(
            payload.tenant_id,
            subject=payload.subject,
            used=payload.used,
            activity_id=payload.activity_id,
            source=payload.source,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
