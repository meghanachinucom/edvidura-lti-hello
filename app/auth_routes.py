"""Browser OIDC login for ops (Keycloak) — complements X-Admin-Key."""
from __future__ import annotations

import secrets
from urllib.parse import quote

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.launch_cache import LAUNCH_CACHE
from app.modules.identity import (
    exchange_code,
    keycloak_auth_url,
    keycloak_enabled,
    keycloak_logout_url,
    principal_has_ops,
    verify_access_token,
)
from app.settings import get_settings

router = APIRouter(tags=["Auth"])


def _public_base(request: Request) -> str:
    """Host the browser is actually using (avoids localhost vs 127.0.0.1 cookie loss)."""
    proto = (
        request.headers.get("x-forwarded-proto") or request.url.scheme
    ).split(",")[0].strip()
    host = (
        request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    ).split(",")[0].strip()
    if host:
        return f"{proto}://{host}".rstrip("/")
    return str(request.base_url).rstrip("/")


@router.get("/auth/status")
def auth_status(request: Request):
    s = get_settings()
    sess = request.session.get("ops_auth")
    email = ""
    if isinstance(sess, dict):
        email = str(sess.get("email") or "")
    return {
        "keycloak_enabled": keycloak_enabled(),
        "keycloak_url": s.keycloak_url if keycloak_enabled() else "",
        "signed_in": bool(email),
        "email": email,
        "metabase_url": s.metabase_url or "",
        "public_base": _public_base(request),
    }


@router.get("/auth/login")
def auth_login(request: Request, next: str = "/onboard"):
    if not keycloak_enabled():
        return RedirectResponse(
            url="/onboard?err="
            + quote("Keycloak is disabled (set KEYCLOAK_ENABLED=1)"),
            status_code=303,
        )
    state = secrets.token_urlsafe(24)
    nxt = next if next.startswith("/") else "/onboard"
    redirect_uri = f"{_public_base(request)}/auth/callback"
    # Server-side pending login — avoids oversized session cookies + host mismatch
    LAUNCH_CACHE.set(
        f"oidc:{state}",
        {"next": nxt, "redirect_uri": redirect_uri},
        exp=600,
    )
    return RedirectResponse(
        url=keycloak_auth_url(redirect_uri=redirect_uri, state=state),
        status_code=302,
    )


@router.get("/auth/callback")
def auth_callback(
    request: Request, code: str | None = None, state: str | None = None
):
    if not keycloak_enabled():
        return RedirectResponse(url="/onboard?err=Keycloak+disabled", status_code=303)

    pending = LAUNCH_CACHE.get(f"oidc:{state}") if state else None
    if not code or not state or not isinstance(pending, dict):
        return RedirectResponse(
            url="/onboard?err="
            + quote(
                "Invalid login state — click Sign in with Keycloak again "
                "(link expires after 10 minutes)"
            ),
            status_code=303,
        )

    redirect_uri = str(pending.get("redirect_uri") or f"{_public_base(request)}/auth/callback")
    nxt = str(pending.get("next") or "/onboard")
    if not nxt.startswith("/"):
        nxt = "/onboard"

    try:
        tokens = exchange_code(code=code, redirect_uri=redirect_uri)
        access = str(tokens.get("access_token") or "")
        principal = verify_access_token(access)
        if not principal_has_ops(principal):
            return RedirectResponse(
                url="/onboard?err=" + quote("Account lacks ops role"),
                status_code=303,
            )
        # Do NOT store JWT in cookie session — tokens blow past browser cookie limits
        request.session["ops_auth"] = {
            "email": principal.email,
            "sub": principal.sub,
            "roles": list(principal.roles),
            "tenant_id": principal.tenant_id,
            "via": "keycloak",
        }
    except Exception as exc:  # noqa: BLE001
        return RedirectResponse(
            url="/onboard?err=" + quote(str(exc)[:160]),
            status_code=303,
        )
    finally:
        if state:
            LAUNCH_CACHE.set(f"oidc:{state}", None, exp=1)

    return RedirectResponse(
        url=f"{nxt}?ok=" + quote("Signed in with Keycloak"),
        status_code=303,
    )


@router.get("/auth/logout")
def auth_logout(request: Request):
    request.session.pop("ops_auth", None)
    base = _public_base(request)
    if keycloak_enabled():
        return RedirectResponse(
            url=keycloak_logout_url(redirect_uri=f"{base}/onboard"),
            status_code=302,
        )
    return RedirectResponse(url="/onboard", status_code=303)


@router.get("/auth/me")
def auth_me(request: Request):
    sess = request.session.get("ops_auth")
    if not isinstance(sess, dict) or not sess.get("email"):
        return JSONResponse({"ok": False, "signed_in": False}, status_code=401)
    return {
        "ok": True,
        "signed_in": True,
        "email": sess.get("email"),
        "roles": sess.get("roles"),
        "tenant_id": sess.get("tenant_id"),
    }
