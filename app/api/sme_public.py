"""SME R-13: public query API for external applications (API key + tenant RLS)."""
from __future__ import annotations

import secrets
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from app import db
from app.modules import sme as sme_mod
from app.settings import get_settings

router = APIRouter(prefix="/api/v1/sme", tags=["sme-public"])


def _require_sme_key(x_api_key: str | None, x_admin_key: str | None) -> None:
    settings = get_settings()
    expected = (settings.sme_public_api_key or settings.admin_api_key or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SME_PUBLIC_API_KEY (or ADMIN_API_KEY) is not configured",
        )
    provided = (x_api_key or x_admin_key or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
        )


def _require_tenant(tenant_id: UUID) -> None:
    if not db.get_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' not found",
        )


class SmeQueryBody(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(5, ge=1, le=20)


@router.post("/query")
def sme_public_query(
    body: SmeQueryBody,
    tenant_id: UUID = Query(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> dict[str, Any]:
    """External apps query approved SME sources (keyword index, no LTI session)."""
    _require_sme_key(x_api_key, x_admin_key)
    _require_tenant(tenant_id)
    # Never trust a client-supplied tenant beyond the query param validated above.
    result = sme_mod.public_query(
        tenant_id, body.query.strip(), limit=body.limit
    )
    result["tenant_id"] = str(tenant_id)
    return result


@router.post("/index/{manual_id}")
def sme_index_manual(
    manual_id: UUID,
    tenant_id: UUID = Query(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> dict[str, Any]:
    """Ops/external trigger to (re)index a manual into searchable chunks."""
    _require_sme_key(x_api_key, x_admin_key)
    _require_tenant(tenant_id)
    try:
        return sme_mod.index_manual(tenant_id, manual_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
