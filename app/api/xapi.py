"""xAPI middleware API (ops-authenticated). Moodle AGS remains grade SoR."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
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
