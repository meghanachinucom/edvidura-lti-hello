"""E04 AI provider status (ops-auth)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.admin_auth import OpsAuth
from app.modules.ai_assessment import ai_status

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


@router.get("/status")
def get_ai_status(_ops: OpsAuth) -> dict[str, Any]:
    return ai_status()
