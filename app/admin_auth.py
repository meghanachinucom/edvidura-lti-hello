"""Ops auth: Keycloak Bearer JWT and/or legacy X-Admin-Key."""
from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.modules.identity import (
    OpsPrincipal,
    keycloak_enabled,
    principal_has_ops,
    verify_access_token,
)
from app.settings import get_settings


def admin_key_matches(candidate: str | None) -> bool:
    expected = get_settings().admin_api_key
    if not expected:
        return False
    provided = (candidate or "").strip()
    if not provided:
        return False
    return secrets.compare_digest(provided, expected)


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def resolve_ops_principal(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> OpsPrincipal | None:
    """Return ops principal from Bearer JWT, session, or None."""
    token = _bearer_token(authorization)
    if token and keycloak_enabled():
        try:
            principal = verify_access_token(token)
            if principal_has_ops(principal):
                return principal
        except Exception:  # noqa: BLE001
            pass
    sess = request.session.get("ops_auth")
    if isinstance(sess, dict) and (
        "ops" in (sess.get("roles") or []) or "admin" in (sess.get("roles") or [])
    ):
        return OpsPrincipal(
            sub=str(sess.get("sub") or "session"),
            email=str(sess.get("email") or ""),
            roles=tuple(str(r) for r in (sess.get("roles") or [])),
            tenant_id=sess.get("tenant_id"),
            raw={"auth": "session"},
        )
    if admin_key_matches(x_admin_key):
        return OpsPrincipal(
            sub="admin-key",
            email="admin-key@local",
            roles=("ops",),
            tenant_id=None,
            raw={"auth": "admin_key"},
        )
    return None


def require_admin_key(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> OpsPrincipal:
    """FastAPI dependency: Keycloak ops role OR X-Admin-Key."""
    principal = resolve_ops_principal(
        request, authorization=authorization, x_admin_key=x_admin_key
    )
    if principal is not None:
        return principal
    if keycloak_enabled():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing/invalid Bearer token (ops role) or X-Admin-Key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expected = get_settings().admin_api_key
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_API_KEY is not configured",
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing X-Admin-Key",
    )


OpsAuth = Annotated[OpsPrincipal, Depends(require_admin_key)]
