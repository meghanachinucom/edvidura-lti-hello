"""Sales desk UI — rename clients and sell Lego block packs."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates

from app.modules.identity import keycloak_enabled
from app.settings import get_settings

router = APIRouter(tags=["Sales"])

_ROOT = Path(__file__).resolve().parents[1]
_TEMPLATES = Jinja2Templates(directory=str(_ROOT / "templates"))
_ONE_PAGER = _ROOT / "docs" / "SALES_ONE_PAGER.html"
_INTERNAL_STATUS = _ROOT / "docs" / "INTERNAL_STATUS_TIMEFRAME.html"
_MOTION = _ROOT / "app" / "static" / "marketing" / "motion.html"


def _ops_email(request: Request) -> str | None:
    sess = request.session.get("ops_auth")
    if isinstance(sess, dict):
        email = str(sess.get("email") or "").strip()
        roles = sess.get("roles") or []
        if email and ("ops" in roles or "admin" in roles):
            return email
    return None


@router.get("/sales", response_class=HTMLResponse)
def sales_desk(request: Request):
    """Sales console: pick client, rename, select blocks, apply SKU."""
    settings = get_settings()
    email = _ops_email(request)
    return _TEMPLATES.TemplateResponse(
        request,
        "sales.html",
        {
            "keycloak_enabled": keycloak_enabled(),
            "ops_email": email,
            "app_base": settings.app_base_url.rstrip("/"),
        },
    )


@router.get("/sales/health")
def sales_health():
    return {"ok": True, "page": "sales"}


@router.get("/sales/one-pager", response_class=HTMLResponse)
def sales_one_pager():
    """Available-now vs roadmap sheet for reps (Step 2)."""
    if not _ONE_PAGER.is_file():
        return HTMLResponse("<p>Sales one-pager missing.</p>", status_code=404)
    return FileResponse(_ONE_PAGER, media_type="text/html; charset=utf-8")


@router.get("/internal/status", response_class=HTMLResponse)
def internal_status_timeframe():
    """Internal status + timeframe (TRL / TLA / done / next)."""
    if not _INTERNAL_STATUS.is_file():
        return HTMLResponse("<p>Internal status doc missing.</p>", status_code=404)
    return FileResponse(_INTERNAL_STATUS, media_type="text/html; charset=utf-8")


@router.get("/product/motion", response_class=HTMLResponse)
def product_motion():
    """Standalone cinematic product motion page (not the LMS SPA)."""
    if not _MOTION.is_file():
        return HTMLResponse("<p>Motion page missing.</p>", status_code=404)
    return FileResponse(_MOTION, media_type="text/html; charset=utf-8")
