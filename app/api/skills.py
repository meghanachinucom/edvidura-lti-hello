"""D08 competency framework import + TO→skill review (ops API)."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field

from app import db
from app.admin_auth import OpsAuth
from app.modules.skills import framework as fw

router = APIRouter(prefix="/api/v1/skills", tags=["skills"])


def _require_tenant(tenant_id: UUID) -> None:
    if not db.get_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' not found",
        )


class FrameworkJsonBody(BaseModel):
    tenant_id: UUID
    source_label: str = ""
    skills: list[dict[str, Any]] = Field(default_factory=list)


@router.post("/framework/imports", status_code=status.HTTP_201_CREATED)
def create_import_json(
    payload: FrameworkJsonBody, _ops: OpsAuth
) -> dict[str, Any]:
    """Create a pending framework import from JSON skills[]."""
    _require_tenant(payload.tenant_id)
    try:
        specs = [fw.normalize_spec(s) for s in payload.skills]
        row = fw.create_framework_import(
            payload.tenant_id,
            specs=specs,
            source_label=payload.source_label or "json",
            format="json",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return row


@router.post("/framework/imports/upload", status_code=status.HTTP_201_CREATED)
async def create_import_upload(
    _ops: OpsAuth,
    tenant_id: UUID = Form(...),
    source_label: str = Form(""),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Create a pending framework import from .json or .csv upload."""
    _require_tenant(tenant_id)
    raw = await file.read()
    name = (file.filename or "").lower()
    label = source_label or (file.filename or "upload")
    try:
        if name.endswith(".csv") or (file.content_type or "").startswith(
            "text/csv"
        ):
            specs = fw.parse_framework_csv(raw)
            fmt = "csv"
        else:
            data = json.loads(raw.decode("utf-8-sig"))
            specs = fw.parse_framework_json(data)
            fmt = "json"
        row = fw.create_framework_import(
            tenant_id, specs=specs, source_label=label, format=fmt
        )
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return row


@router.get("/framework/imports")
def list_imports(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    rows = fw.list_framework_imports(
        tenant_id, status=status_filter, limit=limit
    )
    return {"tenant_id": str(tenant_id), "imports": rows}


@router.post("/framework/imports/{import_id}/approve")
def approve_import(
    import_id: UUID,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    reviewed_by: str = Query(""),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    try:
        return fw.approve_framework_import(
            tenant_id, import_id, reviewed_by=reviewed_by or "ops"
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.get("/to-proposals")
def list_proposals(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    status_filter: str = Query("pending", alias="status"),
    limit: int = Query(100, ge=1, le=200),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    return {
        "tenant_id": str(tenant_id),
        "proposals": fw.list_to_proposals(
            tenant_id, status=status_filter, limit=limit
        ),
    }


@router.post("/to-proposals/{proposal_id}/approve")
def approve_proposal(
    proposal_id: UUID,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    row = fw.approve_to_proposal(tenant_id, proposal_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found"
        )
    return row


@router.post("/to-proposals/{proposal_id}/reject")
def reject_proposal(
    proposal_id: UUID,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    row = fw.reject_to_proposal(tenant_id, proposal_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found"
        )
    return row
