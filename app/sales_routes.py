"""Sales desk UI — rename clients and sell Lego block packs."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.modules.identity import keycloak_enabled
from app.settings import get_settings

router = APIRouter(tags=["Sales"])

_TEMPLATES = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[1] / "templates")
)


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
