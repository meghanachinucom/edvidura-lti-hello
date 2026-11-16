"""EdVidura platform owner (ops) console — Metabase + Yet, not school UI."""
from __future__ import annotations

from typing import Any
from urllib.parse import quote, urlsplit

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.admin_auth import admin_key_matches
from app.settings import ROOT, get_settings

router = APIRouter(tags=["EdVidura ops"])
templates = Jinja2Templates(directory=str(ROOT / "templates"))

OPS_SESSION_KEY = "edvidura_ops"


def _ops_session(request: Request) -> dict[str, Any] | None:
    raw = request.session.get(OPS_SESSION_KEY)
    if isinstance(raw, dict) and raw.get("ok"):
        return raw
    # Also accept Keycloak ops_auth session
    kc = request.session.get("ops_auth")
    if isinstance(kc, dict) and kc.get("email"):
        return {"ok": True, "via": "keycloak", "email": kc.get("email")}
    return None


def _require_ops(request: Request) -> dict[str, Any] | RedirectResponse:
    sess = _ops_session(request)
    if sess:
        return sess
    return RedirectResponse(url="/ops/login", status_code=303)


def _yet_base_url() -> str:
    s = get_settings()
    endpoint = (s.xapi_lrs_endpoint or "").rstrip("/")
    if not endpoint:
        return ""
    if endpoint.lower().endswith("/xapi"):
        return endpoint[: -len("/xapi")]
    return endpoint


@router.get("/ops", response_class=HTMLResponse)
@router.get("/ops/", response_class=HTMLResponse)
async def ops_home(request: Request):
    gate = _require_ops(request)
    if isinstance(gate, RedirectResponse):
        return gate
    return RedirectResponse(url="/ops/dashboard", status_code=303)


@router.get("/ops/login", response_class=HTMLResponse)
async def ops_login_get(request: Request, err: str | None = None):
    if _ops_session(request):
        return RedirectResponse(url="/ops/dashboard", status_code=303)
    s = get_settings()
    from app.modules.identity import keycloak_enabled

    return templates.TemplateResponse(
        request,
        "ops_login.html",
        {
            "err": (err or "").replace("+", " "),
            "keycloak_enabled": keycloak_enabled(),
            "metabase_url": s.metabase_url or "",
        },
    )


def _normalize_configured_origin(raw: str | None) -> str | None:
    if not raw or not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val:
        return None
    s = get_settings()
    try:
        parsed = urlsplit(val)
        scheme = parsed.scheme.lower()
        if scheme not in ("http", "https"):
            return None
        if parsed.username is not None or parsed.password is not None or "@" in parsed.netloc:
            return None
        if parsed.query or parsed.fragment:
            return None
        hostname = parsed.hostname
        if not hostname:
            return None
        hostname = hostname.lower()
        if s.is_production_like and hostname == "testserver":
            return None
        try:
            port = parsed.port
        except ValueError:
            return None
        if port is not None and not (1 <= port <= 65535):
            return None
        if parsed.netloc.endswith(":"):
            return None

        is_default_port = (scheme == "http" and port == 80) or (scheme == "https" and port == 443)
        host_str = f"[{hostname}]" if ":" in hostname else hostname
        if port is not None and not is_default_port:
            host_port = f"{host_str}:{port}"
        else:
            host_port = host_str
        return f"{scheme}://{host_port}"
    except Exception:
        return None


def _trusted_origins() -> set[str]:
    s = get_settings()
    trusted: set[str] = set()

    # Explicit application and frontend configuration origins (normalized to scheme://netloc)
    app_origin = _normalize_configured_origin(s.app_base_url)
    if app_origin:
        trusted.add(app_origin)
    fe_origin = _normalize_configured_origin(s.frontend_origin)
    if fe_origin:
        trusted.add(fe_origin)

    # In development and test environments, permit local dev servers and test runners
    if not s.is_production_like:
        trusted.update({
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "testserver",
            "http://testserver",
        })
    return trusted


def _clean_origin(raw: str | None) -> str | None:
    if not raw or not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val:
        return None
    s = get_settings()
    if not s.is_production_like and val in ("testserver", "http://testserver"):
        return val
    try:
        parsed = urlsplit(val)
        scheme = parsed.scheme.lower()
        if scheme not in ("http", "https"):
            return None
        # RFC 6454: Origin headers consist only of scheme, host, and optional port.
        # Paths, queries, fragments or userinfo (@) indicate a malformed/spoofed origin.
        if parsed.username is not None or parsed.password is not None or "@" in parsed.netloc:
            return None
        if parsed.path and parsed.path != "/":
            return None
        if parsed.query or parsed.fragment:
            return None
        hostname = parsed.hostname
        if not hostname:
            return None
        hostname = hostname.lower()
        if s.is_production_like and hostname == "testserver":
            return None
        try:
            port = parsed.port
        except ValueError:
            return None
        if port is not None and not (1 <= port <= 65535):
            return None
        if parsed.netloc.endswith(":"):
            return None

        is_default_port = (scheme == "http" and port == 80) or (scheme == "https" and port == 443)
        host_str = f"[{hostname}]" if ":" in hostname else hostname
        if port is not None and not is_default_port:
            host_port = f"{host_str}:{port}"
        else:
            host_port = host_str
        return f"{scheme}://{host_port}"
    except Exception:
        return None


def _extract_referer_origin(raw: str | None) -> str | None:
    if not raw or not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val:
        return None
    s = get_settings()
    try:
        parsed = urlsplit(val)
        scheme = parsed.scheme.lower()
        if not scheme:
            if not s.is_production_like and val.startswith("testserver"):
                return "testserver"
            return None
        if scheme not in ("http", "https"):
            return None
        if parsed.username is not None or parsed.password is not None or "@" in parsed.netloc:
            return None
        hostname = parsed.hostname
        if not hostname:
            return None
        hostname = hostname.lower()
        if s.is_production_like and hostname == "testserver":
            return None
        try:
            port = parsed.port
        except ValueError:
            return None
        if port is not None and not (1 <= port <= 65535):
            return None
        if parsed.netloc.endswith(":"):
            return None

        is_default_port = (scheme == "http" and port == 80) or (scheme == "https" and port == 443)
        host_str = f"[{hostname}]" if ":" in hostname else hostname
        if port is not None and not is_default_port:
            host_port = f"{host_str}:{port}"
        else:
            host_port = host_str
        return f"{scheme}://{host_port}"
    except Exception:
        return None


def _validate_login_csrf(request: Request) -> None:
    """Validate Origin/Referer on operator login endpoints."""
    raw_origin = request.headers.get("origin")
    raw_referer = request.headers.get("referer")
    trusted = _trusted_origins()

    # Reject missing Origin and Referer: browser-facing login requires valid Origin/Referer
    if not raw_origin and not raw_referer:
        raise HTTPException(
            status_code=403,
            detail="CSRF origin verification failed: missing origin and referer",
        )

    # If Origin is present, evaluate it exclusively (untrusted Origin cannot be overridden by Referer)
    if raw_origin is not None:
        clean_org = _clean_origin(raw_origin)
        if not clean_org or clean_org not in trusted:
            raise HTTPException(
                status_code=403,
                detail="CSRF origin verification failed: untrusted or malformed origin",
            )
        return

    # If Origin is absent, evaluate Referer if present
    if raw_referer is not None:
        ref_org = _extract_referer_origin(raw_referer)
        if not ref_org or ref_org not in trusted:
            raise HTTPException(
                status_code=403,
                detail="CSRF origin verification failed: untrusted or malformed referer",
            )
        return


def _validate_ops_csrf(request: Request, ops: OpsPrincipal | None = None) -> None:
    """CSRF protection for state-changing operator requests using session cookies."""
    ops_sess = request.session.get(OPS_SESSION_KEY) or request.session.get("ops_auth")
    is_cookie_session = bool(ops_sess) or (
        ops is not None
        and getattr(ops, "raw", {}).get("auth") in ("edvidura_ops_session", "session")
    )
    if not is_cookie_session:
        # Pure server-to-server calls (e.g. X-Admin-Key) without session cookies are exempt from CSRF
        return

    trusted = _trusted_origins()
    raw_origin = request.headers.get("origin")
    raw_referer = request.headers.get("referer")

    # 5. Missing both Origin and Referer on cookie-authenticated request is rejected
    if not raw_origin and not raw_referer:
        raise HTTPException(
            status_code=403,
            detail="CSRF origin verification failed: missing origin and referer",
        )

    # 8. Untrusted Origin must NOT be overridden by a trusted Referer.
    # If Origin is present, evaluate it exclusively.
    if raw_origin is not None:
        clean_org = _clean_origin(raw_origin)
        if not clean_org or clean_org not in trusted:
            raise HTTPException(
                status_code=403,
                detail="CSRF origin verification failed: untrusted or malformed origin",
            )
        return

    # Origin is absent; evaluate Referer
    if raw_referer is not None:
        ref_org = _extract_referer_origin(raw_referer)
        if not ref_org or ref_org not in trusted:
            raise HTTPException(
                status_code=403,
                detail="CSRF origin verification failed: untrusted or malformed referer",
            )
        return


@router.post("/ops/login", response_class=HTMLResponse)
async def ops_login_post(
    request: Request,
    admin_key: str = Form(""),
):
    _validate_login_csrf(request)

    if not admin_key_matches(admin_key):
        return RedirectResponse(
            url="/ops/login?err=" + quote("Wrong owner key"),
            status_code=303,
        )
    request.session[OPS_SESSION_KEY] = {
        "ok": True,
        "via": "admin_key",
        "email": "owner@edvidura",
    }
    return RedirectResponse(url="/ops/dashboard", status_code=303)


@router.post("/ops/logout")
async def ops_logout_post(request: Request):
    gate = _require_ops(request)
    if isinstance(gate, RedirectResponse):
        return gate
    _validate_ops_csrf(request)
    request.session.pop(OPS_SESSION_KEY, None)
    request.session.pop("ops_auth", None)
    return RedirectResponse(url="/ops/login", status_code=303)


@router.get("/ops/logout", response_class=HTMLResponse)
async def ops_logout_get(request: Request):
    # GET /ops/logout must NOT perform state-changing logout; render informational page
    return HTMLResponse(
        "<!doctype html><html><body><p>To sign out, submit POST to /ops/logout.</p>"
        "<form method='post' action='/ops/logout'><button type='submit'>Sign out</button></form>"
        "</body></html>",
        status_code=405,
    )


@router.get("/ops/dashboard", response_class=HTMLResponse)
async def ops_dashboard(request: Request):
    gate = _require_ops(request)
    if isinstance(gate, RedirectResponse):
        return gate

    from app.modules import analytics as analytics_mod

    s = get_settings()
    status = analytics_mod.integration_status(probe=True)
    embed = analytics_mod.metabase_embed_url()
    yet_url = _yet_base_url()
    lrs = status.get("yet_analytics_lrs") or {}
    meta = status.get("metabase") or {}

    return templates.TemplateResponse(
        request,
        "ops_dashboard.html",
        {
            "ops": gate,
            "metabase_url": s.metabase_url or "",
            "metabase_embed_url": embed,
            "metabase": meta,
            "yet_url": yet_url,
            "lrs": lrs,
            "local": status.get("local_xapi_store") or {},
            "onboard_href": "/onboard",
        },
    )


@router.post("/ops/retry-lrs")
async def ops_retry_lrs(request: Request, tenant_id: str = Form("")):
    gate = _require_ops(request)
    if isinstance(gate, RedirectResponse):
        return gate
    _validate_ops_csrf(request)
    from app.modules import xapi as xapi_mod

    tid = (tenant_id or "").strip()
    if not tid:
        return RedirectResponse(
            url="/ops/dashboard?err=" + quote("tenant_id required"),
            status_code=303,
        )
    try:
        result = xapi_mod.retry_failed_lrs(tid)
        msg = f"Retried {result.get('retried', 0)}, sent {result.get('sent', 0)}"
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)[:120]
    return RedirectResponse(
        url="/ops/dashboard?ok=" + quote(msg),
        status_code=303,
    )


# --- JSON API Endpoints for React Ops Console ---

from pydantic import BaseModel, Field
from fastapi import Depends
from app.admin_auth import require_admin_key, OpsPrincipal
from app.api.app_client.envelope import ok, fail, json_safe


class OpsLoginPayload(BaseModel):
    admin_key: str = Field(..., min_length=1)


class OpsRetryPayload(BaseModel):
    tenant_id: str = Field(..., min_length=1)


@router.post("/api/v1/ops/login")
def api_ops_login(payload: OpsLoginPayload, request: Request):
    _validate_login_csrf(request)

    if not admin_key_matches(payload.admin_key):
        return fail("Invalid operator key", code="invalid_key", status_code=401)
    request.session[OPS_SESSION_KEY] = {
        "ok": True,
        "via": "admin_key",
        "email": "owner@edvidura",
    }
    return ok({"signed_in": True, "email": "owner@edvidura", "role": "ops"})


@router.post("/api/v1/ops/logout")
def api_ops_logout(request: Request, ops: OpsPrincipal = Depends(require_admin_key)):
    _validate_ops_csrf(request, ops)
    request.session.pop(OPS_SESSION_KEY, None)
    request.session.pop("ops_auth", None)
    return ok({"signed_in": False, "message": "Logged out successfully"})


@router.get("/api/v1/ops/overview")
def api_ops_overview(
    ops: OpsPrincipal = Depends(require_admin_key),
):
    from app import db
    from app.modules import analytics as analytics_mod

    tenants = db.list_tenants()
    institutions = db.list_institutions()
    platforms = db.list_all_platforms()
    status = analytics_mod.integration_status(probe=False)

    return ok(
        {
            "tenants": json_safe(tenants),
            "institutions": json_safe(institutions),
            "platforms": json_safe(platforms),
            "integration_status": json_safe(status),
        }
    )


@router.post("/api/v1/ops/retry-lrs")
def api_ops_retry_lrs(
    payload: OpsRetryPayload,
    request: Request,
    ops: OpsPrincipal = Depends(require_admin_key),
):
    _validate_ops_csrf(request, ops)
    from app.modules import xapi as xapi_mod

    result = xapi_mod.retry_failed_lrs(payload.tenant_id.strip())
    return ok(
        {
            "retried": result.get("retried", 0),
            "sent": result.get("sent", 0),
        }
    )
