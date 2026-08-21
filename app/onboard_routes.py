"""School onboarding UI — one-click Moodle Dynamic Registration + fallback."""
from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import quote, urlparse
from uuid import UUID

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app import db
from app.admin_auth import admin_key_matches
from app.modules import lti_dynreg
from app.modules.identity import keycloak_enabled
from app.settings import get_settings

router = APIRouter(tags=["Onboarding"])

_TEMPLATES = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[1] / "templates")
)
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,62}$")


def _ops_authorized(request: Request, admin_key: str) -> bool:
    if admin_key_matches(admin_key):
        return True
    sess = request.session.get("ops_auth")
    if isinstance(sess, dict):
        roles = sess.get("roles") or []
        if "ops" in roles or "admin" in roles:
            return True
    return False


def _q(msg: str) -> str:
    return quote(msg, safe="")


def _safe_err(exc: BaseException) -> str:
    msg = str(exc).strip()
    low = msg.lower()
    if "unique" in low or "duplicate" in low:
        return "That school ID or Moodle link already exists"
    if "foreign key" in low:
        return "Related record missing"
    if "lti_registration_invites" in low or "does not exist" in low:
        return "Run db/migration_lti_dynreg.sql then try again"
    if len(msg) > 160:
        return "Could not save — check inputs and try again"
    return msg or "Could not save"


def validate_issuer(issuer: str) -> str | None:
    raw = (issuer or "").strip().rstrip("/")
    if not raw:
        return None
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    if parsed.path not in {"", "/"}:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def validate_slug(slug: str) -> str | None:
    s = (slug or "").strip().lower()
    if not _SLUG_RE.match(s):
        return None
    return s


def _slugify_name(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (s or "school")[:63]


@router.get("/onboard", response_class=HTMLResponse)
def onboard_page(
    request: Request,
    ok: str | None = None,
    err: str | None = None,
    invite: str | None = None,
):
    settings = get_settings()
    base = settings.app_base_url
    tenants: list = []
    platforms: list = []
    try:
        tenants = db.list_tenants()
        platforms = db.list_all_platforms()
    except Exception as exc:  # noqa: BLE001
        err = err or f"Database unavailable: {exc}"

    platform_rows = []
    any_launched = False
    demo_ready = False
    for p in platforms:
        row = dict(p)
        last = p.get("last_launch_at")
        if last:
            any_launched = True
            row["last_launch_at"] = (
                last.isoformat() if hasattr(last, "isoformat") else str(last)
            )
        else:
            row["last_launch_at"] = None
        row["active"] = bool(p.get("active", True))
        platform_rows.append(row)
        iss = str(p.get("issuer") or "")
        if "localhost:8085" in iss or "127.0.0.1:8085" in iss:
            demo_ready = True

    tool_urls = [
        {"label": "Tool / launch URL", "url": f"{base}/lti/launch"},
        {"label": "Initiate login URL", "url": f"{base}/lti/login"},
        {"label": "Public keyset (JWKS)", "url": f"{base}/.well-known/jwks.json"},
        {"label": "Redirect URI", "url": f"{base}/lti/launch"},
        {
            "label": "Dynamic Registration (generic)",
            "url": f"{base}/lti/register",
        },
    ]

    active_invite = None
    tok = (invite or request.session.get("last_connect_invite") or "").strip()
    if tok:
        try:
            inv = lti_dynreg.get_invite(tok)
            if inv and not inv.get("consumed_at"):
                active_invite = {
                    "token": tok,
                    "url": lti_dynreg.registration_url(tok),
                    "tenant_name": inv.get("tenant_name"),
                    "tenant_slug": inv.get("tenant_slug"),
                }
        except Exception:  # noqa: BLE001
            active_invite = None

    return _TEMPLATES.TemplateResponse(
        request,
        "onboard.html",
        {
            "ok": ok or "",
            "err": err or "",
            "tenants": tenants,
            "platforms": platform_rows,
            "any_launched": any_launched,
            "tool_urls": tool_urls,
            "default_issuer": "http://localhost:8085",
            "keycloak_enabled": keycloak_enabled(),
            "ops_email": (
                str((request.session.get("ops_auth") or {}).get("email") or "")
                if isinstance(request.session.get("ops_auth"), dict)
                else ""
            ),
            "metabase_url": settings.metabase_url or "",
            "active_invite": active_invite,
            "demo_ready": demo_ready,
            "demo_moodle_url": "http://localhost:8085",
        },
    )


@router.post("/onboard/connect")
def onboard_connect(
    request: Request,
    admin_key: str = Form(""),
    name: str = Form(...),
    slug: str = Form(""),
):
    """One-shot: create school + Dynamic Registration invite URL."""
    if not _ops_authorized(request, admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Sign in with Keycloak or enter setup password"),
            status_code=303,
        )
    name_clean = (name or "").strip()
    if not name_clean or len(name_clean) > 120:
        return RedirectResponse(
            url="/onboard?err=" + _q("School name required (max 120 chars)"),
            status_code=303,
        )
    slug_clean = validate_slug(slug) or validate_slug(_slugify_name(name_clean))
    if not slug_clean:
        return RedirectResponse(
            url="/onboard?err="
            + _q("School ID must be 2–63 chars: lowercase, digits, _ or -"),
            status_code=303,
        )

    existing = db.get_tenant_by_slug(slug_clean)
    try:
        if existing:
            tenant = existing
        else:
            tenant = db.create_tenant(slug=slug_clean, name=name_clean)
        invite = lti_dynreg.create_invite(
            tenant_id=tenant["id"], label=name_clean
        )
    except Exception as exc:  # noqa: BLE001
        return RedirectResponse(
            url="/onboard?err=" + _q(_safe_err(exc)), status_code=303
        )

    token = str(invite["token"])
    request.session["last_connect_invite"] = token
    return RedirectResponse(
        url="/onboard?invite="
        + _q(token)
        + "&ok="
        + _q("Connect link ready — paste it into Moodle Add LTI Advantage"),
        status_code=303,
    )


@router.post("/onboard/tenant")
def onboard_create_tenant(
    request: Request,
    admin_key: str = Form(""),
    slug: str = Form(...),
    name: str = Form(...),
):
    if not _ops_authorized(request, admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Sign in with Keycloak or enter setup password"),
            status_code=303,
        )
    slug_clean = validate_slug(slug)
    if not slug_clean:
        return RedirectResponse(
            url="/onboard?err="
            + _q("School ID must be 2–63 chars: lowercase, digits, _ or -"),
            status_code=303,
        )
    name_clean = (name or "").strip()
    if not name_clean or len(name_clean) > 120:
        return RedirectResponse(
            url="/onboard?err=" + _q("School name required (max 120 chars)"),
            status_code=303,
        )
    if db.get_tenant_by_slug(slug_clean):
        return RedirectResponse(
            url="/onboard?err=" + _q(f"School ID '{slug_clean}' already exists"),
            status_code=303,
        )
    try:
        row = db.create_tenant(slug=slug_clean, name=name_clean)
        return RedirectResponse(
            url="/onboard?ok=" + _q(f"School “{row['name']}” created"),
            status_code=303,
        )
    except Exception as exc:  # noqa: BLE001
        return RedirectResponse(
            url="/onboard?err=" + _q(_safe_err(exc)), status_code=303
        )


@router.post("/onboard/platform")
def onboard_create_platform(
    request: Request,
    admin_key: str = Form(""),
    tenant_id: str = Form(...),
    issuer: str = Form(...),
    client_id: str = Form(...),
    deployment_ids: str = Form("1"),
):
    if not _ops_authorized(request, admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Sign in with Keycloak or enter setup password"),
            status_code=303,
        )
    try:
        tid = UUID(tenant_id)
    except ValueError:
        return RedirectResponse(
            url="/onboard?err=" + _q("Invalid school"), status_code=303
        )
    if not db.get_tenant(tid):
        return RedirectResponse(
            url="/onboard?err=" + _q("School not found"), status_code=303
        )
    issuer_clean = validate_issuer(issuer)
    if not issuer_clean:
        return RedirectResponse(
            url="/onboard?err="
            + _q("Moodle address must be http(s)://host with no path"),
            status_code=303,
        )
    client_clean = (client_id or "").strip()
    if not client_clean or len(client_clean) > 200:
        return RedirectResponse(
            url="/onboard?err=" + _q("Client ID required"),
            status_code=303,
        )
    deps = [d.strip() for d in deployment_ids.split(",") if d.strip()] or ["1"]
    if len(deps) > 20:
        return RedirectResponse(
            url="/onboard?err=" + _q("Too many deployment IDs"),
            status_code=303,
        )
    try:
        db.upsert_platform(
            tenant_id=str(tid),
            issuer=issuer_clean,
            client_id=client_clean,
            deployment_ids=deps,
            auth_login_url=f"{issuer_clean}/mod/lti/auth.php",
            auth_token_url=f"{issuer_clean}/mod/lti/token.php",
            key_set_url=f"{issuer_clean}/mod/lti/certs.php",
        )
        return RedirectResponse(
            url="/onboard?ok="
            + _q("Moodle linked — launch once from Moodle to finish"),
            status_code=303,
        )
    except Exception as exc:  # noqa: BLE001
        return RedirectResponse(
            url="/onboard?err=" + _q(_safe_err(exc)), status_code=303
        )


@router.post("/onboard/platform/{platform_id}/active")
def onboard_set_platform_active(
    request: Request,
    platform_id: UUID,
    admin_key: str = Form(""),
    active: str = Form("true"),
):
    if not _ops_authorized(request, admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Sign in with Keycloak or enter setup password"),
            status_code=303,
        )
    want = str(active).strip().lower() in {"1", "true", "yes", "on"}
    row = db.set_platform_active(platform_id=platform_id, active=want)
    if not row:
        return RedirectResponse(
            url="/onboard?err=" + _q("Moodle link not found"),
            status_code=303,
        )
    label = "turned on" if want else "turned off"
    return RedirectResponse(
        url="/onboard?ok=" + _q(f"Moodle link {label}"),
        status_code=303,
    )
