"""Analytics integrations API (Yet LRS + Metabase) — ops auth."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.admin_auth import OpsAuth
from app.modules import analytics as analytics_mod

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/integrations")
def analytics_integrations(
    _ops: OpsAuth,
    probe: bool = Query(
        False,
        description="If true, HTTP-probe Yet LRS + Metabase health",
    ),
) -> dict[str, Any]:
    return analytics_mod.integration_status(probe=probe)
