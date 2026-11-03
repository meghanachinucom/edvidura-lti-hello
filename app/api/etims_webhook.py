"""DCT F-6: inbound ETIMS / external document refresh webhook."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from app import db
from app.modules.manuals.etims import (
    apply_external_document_refresh,
    verify_etims_signature,
)
from app.settings import get_settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class EtimsRefreshBody(BaseModel):
    tenant_id: UUID
    manual_id: UUID | None = None
    slug: str = ""
    title: str = ""
    body_md: str = Field(..., min_length=20)
    changelog: str = "ETIMS auto refresh"
    publish: bool = True
    reindex: bool = True


@router.post("/etims")
async def etims_document_refresh(
    request: Request,
    x_edvidura_signature: str | None = Header(
        default=None, alias="X-EdVidura-Signature"
    ),
    x_etims_signature: str | None = Header(
        default=None, alias="X-ETIMS-Signature"
    ),
) -> dict[str, Any]:
    """Push a document update; creates a new manual version (+ optional reindex)."""
    raw = await request.body()
    sig = x_edvidura_signature or x_etims_signature
    settings = get_settings()
    if (settings.etims_webhook_secret or "").strip():
        if not verify_etims_signature(raw, sig):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid ETIMS signature",
            )
    try:
        payload = EtimsRefreshBody.model_validate_json(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload: {exc}",
        ) from exc

    if not db.get_tenant(payload.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )
    try:
        result = apply_external_document_refresh(
            payload.tenant_id,
            manual_id=payload.manual_id,
            slug=payload.slug.strip(),
            title=payload.title.strip(),
            body_md=payload.body_md,
            changelog=payload.changelog,
            publish=payload.publish,
            reindex=payload.reindex,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return {"ok": True, **result}
