"""Minimal institution onboarding UI (tool URLs out, Client ID in, launch status)."""
from __future__ import annotations

import html
import re
from urllib.parse import quote, urlparse
from uuid import UUID

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from app import db
from app.admin_auth import admin_key_matches
from app.settings import get_settings

router = APIRouter(tags=["Onboarding"])

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,62}$")


def _page(title: str, body: str, *, status_code: int = 200) -> HTMLResponse:
    doc = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{html.escape(title)} · EdVidura</title>
<style>
  :root {{ --navy:#14213d; --amber:#fca311; --bg:#e5e5e5; --line:#ccc; }}
  body {{ margin:0; font-family: system-ui, sans-serif; background:var(--bg); color:#111; }}
  .wrap {{ max-width: 860px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }}
  h1 {{ font-size: 1.45rem; color: var(--navy); margin: 0 0 0.35rem; }}
  h2 {{ font-size: 1.05rem; color: var(--navy); margin: 1.4rem 0 0.5rem; }}
  .lede {{ color:#555; margin: 0 0 1rem; }}
  .card {{ background:#fff; border:1px solid var(--line); border-radius:10px; padding:1rem 1.1rem; margin:0 0 1rem; }}
  .banner {{ padding:0.7rem 0.9rem; border-radius:8px; margin:0 0 1rem; }}
  .ok {{ background:#e8f6ee; color:#1b7f4a; }}
  .bad {{ background:#fdecec; color:#b42318; }}
  .info {{ background:#fff7e8; color:#8a5a00; }}
  label {{ display:grid; gap:0.3rem; font-weight:600; font-size:0.9rem; margin:0 0 0.75rem; }}
  input, select {{ font:inherit; font-weight:400; padding:0.55rem 0.65rem; border:1px solid var(--line); border-radius:8px; }}
  button, .btn {{ display:inline-block; background:var(--amber); color:#000; border:0; border-radius:8px;
    padding:0.65rem 1rem; font-weight:700; cursor:pointer; text-decoration:none; }}
  button.secondary {{ background:#eee; }}
  code, .url {{ font-family: ui-monospace, monospace; font-size:0.84rem; background:#f2f2f2;
    padding:0.15rem 0.4rem; border-radius:4px; word-break:break-all; }}
  table {{ width:100%; border-collapse:collapse; font-size:0.9rem; }}
  th, td {{ text-align:left; padding:0.5rem 0.35rem; border-bottom:1px solid var(--line); vertical-align:top; }}
  th {{ color:#666; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.04em; }}
  .meta {{ color:#666; font-size:0.85rem; }}
  ol {{ margin:0.4rem 0 0 1.1rem; }}
  .actions {{ display:flex; flex-wrap:wrap; gap:0.35rem; }}
</style>
</head><body><div class="wrap">{body}</div></body></html>"""
    return HTMLResponse(doc, status_code=status_code)


def _q(msg: str) -> str:
    return quote(msg, safe="")


def _safe_err(exc: BaseException) -> str:
    """Avoid leaking raw DB internals in redirect query strings."""
    msg = str(exc).strip()
    low = msg.lower()
    if "unique" in low or "duplicate" in low:
        return "That slug or platform already exists"
    if "foreign key" in low:
        return "Related record missing"
    if len(msg) > 160:
        return "Could not save — check inputs and try again"
    return msg or "Could not save"


def validate_issuer(issuer: str) -> str | None:
    """Return cleaned issuer or None if invalid."""
    raw = (issuer or "").strip().rstrip("/")
    if not raw:
        return None
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    if parsed.path not in {"", "/"}:
        # Allow path-less Moodle base only
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def validate_slug(slug: str) -> str | None:
    s = (slug or "").strip().lower()
    if not _SLUG_RE.match(s):
        return None
    return s


@router.get("/onboard", response_class=HTMLResponse)
def onboard_page(request: Request, ok: str | None = None, err: str | None = None):
    settings = get_settings()
    base = settings.app_base_url
    tenants = []
    platforms = []
    try:
        tenants = db.list_tenants()
        platforms = db.list_all_platforms()
    except Exception as exc:  # noqa: BLE001
        err = err or f"Database unavailable: {exc}"

    banner = ""
    if ok:
        banner = f'<div class="banner ok">{html.escape(ok)}</div>'
    if err:
        banner = f'<div class="banner bad">{html.escape(err)}</div>'

    tenant_opts = "".join(
        f'<option value="{html.escape(str(t["id"]))}">'
        f'{html.escape(t["name"])} ({html.escape(t["slug"])})</option>'
        for t in tenants
    )

    platform_rows = ""
    for p in platforms:
        last = p.get("last_launch_at")
        last_s = last.isoformat() if last else "Never — launch from Moodle to verify"
        active = bool(p.get("active", True))
        if not active:
            status = "Inactive"
        elif last:
            status = "OK"
        else:
            status = "Waiting"
        pid = html.escape(str(p["id"]))
        toggle = (
            f'<form method="post" action="/onboard/platform/{pid}/active" class="actions">'
            f'<input type="hidden" name="admin_key" value="" class="admin-key-mirror"/>'
            f'<input type="hidden" name="active" value="{"false" if active else "true"}"/>'
            f'<button type="submit" class="secondary">'
            f'{"Deactivate" if active else "Activate"}</button></form>'
        )
        platform_rows += (
            "<tr>"
            f"<td>{html.escape(str(p.get('tenant_slug') or ''))}</td>"
            f"<td class='meta'>{html.escape(str(p.get('issuer') or ''))}</td>"
            f"<td><code>{html.escape(str(p.get('client_id') or ''))}</code></td>"
            f"<td><code>{html.escape(','.join(p.get('deployment_ids') or []))}</code></td>"
            f"<td><strong>{status}</strong><div class='meta'>{html.escape(last_s)}</div>{toggle}</td>"
            "</tr>"
        )
    if not platform_rows:
        platform_rows = "<tr><td colspan='5' class='meta'>No platforms registered yet.</td></tr>"

    body = f"""
    <h1>Institution onboarding</h1>
    <p class="lede">
      Hierarchy: <strong>Moodle site admin</strong> creates a school →
      <strong>school admin</strong> owns that school’s workspace →
      teachers, classes, and students stay private (cannot see other schools).
    </p>
    {banner}

    <div class="card info">
      <h2>How roles work</h2>
      <ol>
        <li><strong>Moodle site admin</strong> (<code>admin</code>) — creates External tools / schools.</li>
        <li><strong>School admin</strong> — one per school (e.g. <code>riverside_admin</code>); manages that school only.</li>
        <li><strong>Teachers</strong> — teach classes inside their school.</li>
        <li><strong>Students</strong> — enrolled in classes; see only their school’s chapters/quizzes.</li>
      </ol>
      <p class="meta">Seed demo data: <code>python scripts/seed_schools.py</code> then Moodle users via <code>scripts/seed_moodle_users.php</code>.</p>
    </div>

    <div class="card">
      <h2>1. Paste these URLs into Moodle (External tool)</h2>
      <ol>
        <li>Tool URL / Launch: <span class="url">{html.escape(base)}/lti/launch</span></li>
        <li>Initiate login URL: <span class="url">{html.escape(base)}/lti/login</span></li>
        <li>Public keyset (JWKS): <span class="url">{html.escape(base)}/.well-known/jwks.json</span></li>
        <li>Redirect URI(s): <span class="url">{html.escape(base)}/lti/launch</span></li>
      </ol>
      <p class="meta">In Moodle, create the tool, then copy <strong>Client ID</strong> and <strong>Deployment ID</strong> back here.</p>
    </div>

    <div class="card">
      <h2>2. Create tenant (organization)</h2>
      <form method="post" action="/onboard/tenant" id="form-tenant">
        <label>Admin key
          <input type="password" name="admin_key" required placeholder="ADMIN_API_KEY from .env" autocomplete="off"/>
        </label>
        <label>Slug
          <input name="slug" required pattern="[a-z0-9][a-z0-9_-]*" minlength="2" maxlength="63" placeholder="acme-school"/>
        </label>
        <label>Display name
          <input name="name" required maxlength="120" placeholder="Acme School District"/>
        </label>
        <button type="submit">Create tenant</button>
      </form>
    </div>

    <div class="card">
      <h2>3. Register Moodle LTI platform</h2>
      <form method="post" action="/onboard/platform" id="form-platform">
        <label>Admin key
          <input type="password" name="admin_key" required placeholder="ADMIN_API_KEY from .env" autocomplete="off"/>
        </label>
        <label>Tenant
          <select name="tenant_id" required>{tenant_opts or '<option value="">Create a tenant first</option>'}</select>
        </label>
        <label>Issuer (Moodle base URL, no path)
          <input name="issuer" required value="http://localhost:8085" placeholder="https://moodle.school.edu"/>
        </label>
        <label>Client ID (from Moodle)
          <input name="client_id" required maxlength="200" placeholder="paste Client ID"/>
        </label>
        <label>Deployment ID(s), comma-separated
          <input name="deployment_ids" value="1,2" required/>
        </label>
        <button type="submit">Save platform</button>
      </form>
    </div>

    <div class="card">
      <h2>4. Test launch status</h2>
      <p class="lede">After a successful launch from Moodle, <code>last_launch_at</code> updates automatically. Deactivate a platform to fail closed without deleting it.</p>
      <p class="meta">To activate/deactivate, paste the same admin key below first:</p>
      <label>Admin key for platform actions
        <input type="password" id="shared-admin-key" placeholder="ADMIN_API_KEY from .env" autocomplete="off"/>
      </label>
      <table>
        <thead><tr><th>Tenant</th><th>Issuer</th><th>Client ID</th><th>Deployments</th><th>Status</th></tr></thead>
        <tbody>{platform_rows}</tbody>
      </table>
      <p class="meta" style="margin-top:0.75rem">
        API: <code>POST /admin/tenants</code> and
        <code>POST /admin/tenants/{{id}}/lti-platforms</code> with header <code>X-Admin-Key</code>.
        See <a href="/docs">/docs</a>.
      </p>
    </div>
    <script>
      (function () {{
        var shared = document.getElementById('shared-admin-key');
        if (!shared) return;
        document.querySelectorAll('.admin-key-mirror').forEach(function (el) {{
          el.closest('form').addEventListener('submit', function () {{
            el.value = shared.value || '';
          }});
        }});
      }})();
    </script>
    """
    return _page("Onboarding", body)


@router.post("/onboard/tenant")
def onboard_create_tenant(
    admin_key: str = Form(...),
    slug: str = Form(...),
    name: str = Form(...),
):
    if not admin_key_matches(admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Invalid admin key"),
            status_code=303,
        )
    slug_clean = validate_slug(slug)
    if not slug_clean:
        return RedirectResponse(
            url="/onboard?err=" + _q("Slug must be 2–63 chars: lowercase, digits, _ or -"),
            status_code=303,
        )
    name_clean = (name or "").strip()
    if not name_clean or len(name_clean) > 120:
        return RedirectResponse(
            url="/onboard?err=" + _q("Display name required (max 120 chars)"),
            status_code=303,
        )
    if db.get_tenant_by_slug(slug_clean):
        return RedirectResponse(
            url="/onboard?err=" + _q(f"Slug '{slug_clean}' already exists"),
            status_code=303,
        )
    try:
        row = db.create_tenant(slug=slug_clean, name=name_clean)
        return RedirectResponse(
            url="/onboard?ok=" + _q(f"Created tenant {row['slug']}"),
            status_code=303,
        )
    except Exception as exc:  # noqa: BLE001
        return RedirectResponse(
            url="/onboard?err=" + _q(_safe_err(exc)), status_code=303
        )


@router.post("/onboard/platform")
def onboard_create_platform(
    admin_key: str = Form(...),
    tenant_id: str = Form(...),
    issuer: str = Form(...),
    client_id: str = Form(...),
    deployment_ids: str = Form("1"),
):
    if not admin_key_matches(admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Invalid admin key"),
            status_code=303,
        )
    try:
        tid = UUID(tenant_id)
    except ValueError:
        return RedirectResponse(url="/onboard?err=" + _q("Invalid tenant id"), status_code=303)
    if not db.get_tenant(tid):
        return RedirectResponse(url="/onboard?err=" + _q("Tenant not found"), status_code=303)
    issuer_clean = validate_issuer(issuer)
    if not issuer_clean:
        return RedirectResponse(
            url="/onboard?err=" + _q("Issuer must be http(s)://host with no path"),
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
            url="/onboard?ok=" + _q("Platform saved — launch from Moodle to verify"),
            status_code=303,
        )
    except Exception as exc:  # noqa: BLE001
        return RedirectResponse(
            url="/onboard?err=" + _q(_safe_err(exc)), status_code=303
        )


@router.post("/onboard/platform/{platform_id}/active")
def onboard_set_platform_active(
    platform_id: UUID,
    admin_key: str = Form(...),
    active: str = Form("true"),
):
    if not admin_key_matches(admin_key):
        return RedirectResponse(
            url="/onboard?err=" + _q("Invalid admin key"),
            status_code=303,
        )
    want = str(active).strip().lower() in {"1", "true", "yes", "on"}
    row = db.set_platform_active(platform_id=platform_id, active=want)
    if not row:
        return RedirectResponse(
            url="/onboard?err=" + _q("Platform not found"),
            status_code=303,
        )
    label = "activated" if want else "deactivated"
    return RedirectResponse(
        url="/onboard?ok=" + _q(f"Platform {label}"),
        status_code=303,
    )
