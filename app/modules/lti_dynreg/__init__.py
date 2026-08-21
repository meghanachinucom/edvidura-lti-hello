"""LTI Advantage Dynamic Registration (Moodle one-click tool install)."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

import httpx

from app import db
from app.settings import get_settings

logger = logging.getLogger("edvidura.lti_dynreg")

LTI_TOOL_CONFIG = "https://purl.imsglobal.org/spec/lti-tool-configuration"

DEFAULT_SCOPES = " ".join(
    [
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
        "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
        "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
    ]
)


def create_invite(*, tenant_id: UUID | str, label: str = "", hours: int = 48) -> dict[str, Any]:
    token = secrets.token_urlsafe(24)
    expires = datetime.now(timezone.utc) + timedelta(hours=hours)
    with db.connect() as conn:
        with conn.transaction():
            row = conn.execute(
                """
                INSERT INTO lti_registration_invites (
                    token, tenant_id, label, expires_at
                ) VALUES (%s, %s, %s, %s)
                RETURNING token, tenant_id, label, created_at, expires_at,
                          consumed_at, client_id, issuer
                """,
                (token, str(tenant_id), (label or "")[:120], expires),
            ).fetchone()
            return dict(row)


def get_invite(token: str) -> dict[str, Any] | None:
    with db.connect() as conn:
        row = conn.execute(
            """
            SELECT i.token, i.tenant_id, i.label, i.created_at, i.expires_at,
                   i.consumed_at, i.client_id, i.issuer,
                   t.slug AS tenant_slug, t.name AS tenant_name
            FROM lti_registration_invites i
            JOIN tenants t ON t.id = i.tenant_id
            WHERE i.token = %s
            """,
            (token,),
        ).fetchone()
        return dict(row) if row else None


def mark_invite_consumed(
    token: str, *, client_id: str, issuer: str
) -> None:
    with db.connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                UPDATE lti_registration_invites
                SET consumed_at = now(),
                    client_id = %s,
                    issuer = %s
                WHERE token = %s
                """,
                (client_id, issuer.rstrip("/"), token),
            )


def registration_url(token: str) -> str:
    base = get_settings().app_base_url.rstrip("/")
    return f"{base}/lti/register?invite={token}"


def _domain_from_base(base: str) -> str:
    parsed = urlparse(base)
    return parsed.netloc or "localhost:8000"


def build_tool_registration_payload() -> dict[str, Any]:
    settings = get_settings()
    base = settings.app_base_url.rstrip("/")
    domain = _domain_from_base(base)
    return {
        "application_type": "web",
        "response_types": ["id_token"],
        "grant_types": ["implicit", "client_credentials"],
        "initiate_login_uri": f"{base}/lti/login",
        "redirect_uris": [f"{base}/lti/launch"],
        "client_name": "EdVidura",
        "jwks_uri": f"{base}/.well-known/jwks.json",
        "token_endpoint_auth_method": "private_key_jwt",
        "scope": DEFAULT_SCOPES,
        LTI_TOOL_CONFIG: {
            "domain": domain,
            "target_link_uri": f"{base}/lti/launch",
            "description": "EdVidura — lessons, quizzes, and learning story for your school.",
            "claims": [
                "iss",
                "sub",
                "name",
                "given_name",
                "family_name",
                "email",
            ],
            "messages": [
                {
                    "type": "LtiDeepLinkingRequest",
                    "target_link_uri": f"{base}/lti/launch",
                    "label": "Add EdVidura content",
                }
            ],
        },
    }


def _issuer_matches_config_url(issuer: str, config_url: str) -> bool:
    iss = urlparse(issuer.rstrip("/"))
    cfg = urlparse(config_url)
    return bool(iss.netloc) and iss.netloc.lower() == (cfg.netloc or "").lower()


def fetch_platform_openid_config(openid_configuration_url: str) -> dict[str, Any]:
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        resp = client.get(openid_configuration_url)
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, dict):
        raise ValueError("Invalid OpenID configuration")
    return data


def post_client_registration(
    *,
    registration_endpoint: str,
    registration_token: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if registration_token:
        headers["Authorization"] = f"Bearer {registration_token}"
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        resp = client.post(registration_endpoint, headers=headers, json=payload)
    if resp.status_code not in {200, 201}:
        raise RuntimeError(
            f"Registration failed HTTP {resp.status_code}: {resp.text[:400]}"
        )
    data = resp.json()
    if not isinstance(data, dict) or not data.get("client_id"):
        raise RuntimeError("Registration response missing client_id")
    return data


def complete_dynamic_registration(
    *,
    invite_token: str,
    openid_configuration_url: str,
    registration_token: str | None,
) -> dict[str, Any]:
    invite = get_invite(invite_token)
    if not invite:
        raise ValueError("Unknown or expired invite link")
    now = datetime.now(timezone.utc)
    exp = invite.get("expires_at")
    if exp is not None:
        if getattr(exp, "tzinfo", None) is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            raise ValueError("This connect link has expired — create a new one")

    platform_cfg = fetch_platform_openid_config(openid_configuration_url)
    issuer = str(platform_cfg.get("issuer") or "").rstrip("/")
    if not issuer:
        raise ValueError("Platform OpenID config missing issuer")
    if not _issuer_matches_config_url(issuer, openid_configuration_url):
        raise ValueError("Issuer does not match OpenID configuration host")

    reg_endpoint = str(platform_cfg.get("registration_endpoint") or "").strip()
    if not reg_endpoint:
        raise ValueError("Platform OpenID config missing registration_endpoint")

    auth_login = str(platform_cfg.get("authorization_endpoint") or "").strip()
    auth_token = str(platform_cfg.get("token_endpoint") or "").strip()
    key_set = str(platform_cfg.get("jwks_uri") or "").strip()
    if not (auth_login and auth_token and key_set):
        raise ValueError("Platform OpenID config missing auth/token/jwks URLs")

    payload = build_tool_registration_payload()
    result = post_client_registration(
        registration_endpoint=reg_endpoint,
        registration_token=registration_token,
        payload=payload,
    )
    client_id = str(result["client_id"])
    tool_cfg = result.get(LTI_TOOL_CONFIG) or {}
    deployment_id = str(tool_cfg.get("deployment_id") or "1")

    platform = db.upsert_platform(
        tenant_id=str(invite["tenant_id"]),
        issuer=issuer,
        client_id=client_id,
        deployment_ids=[deployment_id],
        auth_login_url=auth_login,
        auth_token_url=auth_token,
        key_set_url=key_set,
    )
    mark_invite_consumed(invite_token, client_id=client_id, issuer=issuer)
    logger.info(
        "Dynamic registration ok tenant=%s issuer=%s client_id=%s",
        invite.get("tenant_slug"),
        issuer,
        client_id,
    )
    return {
        "invite": invite,
        "platform": platform,
        "client_id": client_id,
        "deployment_id": deployment_id,
        "issuer": issuer,
        "tenant_name": invite.get("tenant_name"),
        "tenant_slug": invite.get("tenant_slug"),
    }
