"""D17 event outbox drain / pending (ops-auth)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app import db
from app.admin_auth import OpsAuth
from app.modules import events as events_mod
from app.settings import get_settings

router = APIRouter(prefix="/api/v1/events", tags=["events"])


def _require_tenant(tenant_id: UUID) -> None:
    if not db.get_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' not found",
        )


@router.get("/pending")
def list_pending(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    limit: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    rows = events_mod.list_pending_for_tenant(tenant_id, limit=limit)
    out = []
    for r in rows:
        env = events_mod.row_to_envelope(r)
        out.append(
            {
                "id": str(r["id"]),
                "envelope": env,
                "publish_error": r.get("publish_error"),
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r.get("created_at"), "isoformat")
                    else str(r.get("created_at") or "")
                ),
            }
        )
    return {"tenant_id": str(tenant_id), "pending": out, "count": len(out)}


@router.post("/drain")
def drain_outbox(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    limit: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    result = events_mod.drain_tenant(tenant_id, limit=limit)
    s = get_settings()
    result["pipeline_enabled"] = bool(s.event_pipeline_enabled)
    result["webhook_configured"] = bool(s.event_webhook_url)
    return result
