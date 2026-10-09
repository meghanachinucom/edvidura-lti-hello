"""EdVidura platform owner (ops) console — Metabase + Yet, not school UI."""
from __future__ import annotations

from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Form, Request
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


@router.post("/ops/login", response_class=HTMLResponse)
async def ops_login_post(
    request: Request,
    admin_key: str = Form(""),
):
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


@router.get("/ops/logout")
async def ops_logout(request: Request):
    request.session.pop(OPS_SESSION_KEY, None)
    request.session.pop("ops_auth", None)
    return RedirectResponse(url="/ops/login", status_code=303)


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
