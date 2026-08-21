"""Ops admin key gate for tenant onboarding (Keycloak replaces this later)."""
from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.settings import get_settings


def require_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> None:
    expected = get_settings().admin_api_key
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_API_KEY is not configured",
        )
    provided = (x_admin_key or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Admin-Key",
        )


def admin_key_matches(candidate: str | None) -> bool:
    expected = get_settings().admin_api_key
    if not expected:
        return False
    provided = (candidate or "").strip()
    if not provided:
        return False
    return secrets.compare_digest(provided, expected)
