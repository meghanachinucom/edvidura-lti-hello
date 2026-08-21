"""Keycloak / OIDC JWT verification for ops APIs."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from app.settings import get_settings

logger = logging.getLogger("edvidura.identity")

_jwks_client: PyJWKClient | None = None
_jwks_url: str = ""


@dataclass(frozen=True)
class OpsPrincipal:
    sub: str
    email: str
    roles: tuple[str, ...]
    tenant_id: str | None
    raw: dict[str, Any]


def keycloak_enabled() -> bool:
    s = get_settings()
    return bool(s.keycloak_enabled and s.keycloak_url and s.keycloak_realm)


def keycloak_issuer() -> str:
    s = get_settings()
    return f"{s.keycloak_url.rstrip('/')}/realms/{s.keycloak_realm}"


def keycloak_auth_url(*, redirect_uri: str, state: str) -> str:
    s = get_settings()
    base = keycloak_issuer()
    from urllib.parse import urlencode

    q = urlencode(
        {
            "client_id": s.keycloak_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid profile email",
            "state": state,
        }
    )
    return f"{base}/protocol/openid-connect/auth?{q}"


def keycloak_logout_url(*, redirect_uri: str) -> str:
    from urllib.parse import urlencode

    s = get_settings()
    q = urlencode(
        {
            "client_id": s.keycloak_client_id,
            "post_logout_redirect_uri": redirect_uri,
        }
    )
    return f"{keycloak_issuer()}/protocol/openid-connect/logout?{q}"


def _jwks() -> PyJWKClient:
    global _jwks_client, _jwks_url
    url = f"{keycloak_issuer()}/protocol/openid-connect/certs"
    if _jwks_client is None or _jwks_url != url:
        _jwks_client = PyJWKClient(url, cache_keys=True, lifespan=3600)
        _jwks_url = url
    return _jwks_client


def exchange_code(*, code: str, redirect_uri: str) -> dict[str, Any]:
    s = get_settings()
    token_url = f"{keycloak_issuer()}/protocol/openid-connect/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": s.keycloak_client_id,
        "client_secret": s.keycloak_client_secret,
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(token_url, data=data)
    resp.raise_for_status()
    return resp.json()


def verify_access_token(token: str) -> OpsPrincipal:
    s = get_settings()
    signing_key = _jwks().get_signing_key_from_jwt(token)
    audiences = [s.keycloak_client_id, "account"]
    options = {"verify_aud": False}  # Keycloak aud varies; check client manually
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=keycloak_issuer(),
        options=options,
        leeway=30,
    )
    aud = claims.get("aud")
    azp = str(claims.get("azp") or "")
    ok_aud = False
    if isinstance(aud, str) and aud in audiences:
        ok_aud = True
    elif isinstance(aud, list) and any(a in audiences for a in aud):
        ok_aud = True
    elif azp == s.keycloak_client_id:
        ok_aud = True
    if not ok_aud:
        raise jwt.InvalidTokenError("Token audience/client mismatch")

    realm_roles = []
    ra = claims.get("realm_access")
    if isinstance(ra, dict):
        realm_roles = list(ra.get("roles") or [])
    tenant_id = claims.get("tenant_id")
    email = str(claims.get("email") or claims.get("preferred_username") or "")
    return OpsPrincipal(
        sub=str(claims.get("sub") or ""),
        email=email,
        roles=tuple(str(r) for r in realm_roles),
        tenant_id=str(tenant_id) if tenant_id else None,
        raw=claims,
    )


def principal_has_ops(principal: OpsPrincipal) -> bool:
    return "ops" in principal.roles or "admin" in principal.roles
