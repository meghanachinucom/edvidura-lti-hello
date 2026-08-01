"""EdVidura LTI Hello — FastAPI multi-tenant Moodle LTI 1.3 spike."""
from __future__ import annotations

import html
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from pylti1p3.exception import LtiException
from starlette.middleware.sessions import SessionMiddleware

from app import db
from app.api.institution import router as institution_router
from app.api.student import router as student_router
from app.launch_cache import LAUNCH_CACHE
from app.lti_fastapi import (
    FastAPIMessageLaunch,
    FastAPIOIDCLogin,
    FastAPIRequest,
    make_launch_data_storage,
)
from app.settings import get_settings
from app.tenancy import TENANT_A_ID, TENANT_B_ID, build_tool_conf_from_db, resolve_platform

app = FastAPI(
    title="EdVidura LTI Hello",
    description="Multi-tenant Moodle LTI 1.3 Hello spike (not full EdVidura).",
    version="0.2.0",
)

app.include_router(institution_router)
app.include_router(student_router)

_boot = get_settings()
app.add_middleware(
    SessionMiddleware,
    secret_key=_boot.session_secret,
    same_site="none" if _boot.app_base_url.startswith("https") else "lax",
    https_only=_boot.app_base_url.startswith("https"),
)


@app.get("/health")
def health():
    platforms = 0
    db_ok = False
    try:
        platforms = len(db.fetch_all_active_platforms())
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "service": "edvidura-lti-hello",
            "db_ok": False,
            "db_error": str(exc),
            "platforms": 0,
        }
    return {
        "ok": True,
        "service": "edvidura-lti-hello",
        "db_ok": db_ok,
        "platforms": platforms,
    }


@app.get("/")
def home():
    settings = get_settings()
    base = settings.app_base_url
    body = f"""
    <h1>EdVidura LTI Hello (multi-tenant)</h1>
    <p>Dummy spike. Tenant is resolved from LTI iss + client_id + deployment.</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/.well-known/jwks.json">JWKS</a></li>
      <li><a href="/dev/tenancy/cross-check">/dev/tenancy/cross-check</a> (RLS proof)</li>
      <li>LTI login: <code>{base}/lti/login</code></li>
      <li>LTI launch: <code>{base}/lti/launch</code></li>
    </ul>
    <p>See <code>docs/TENANT_RESOLUTION.md</code>.</p>
    """
    return HTMLResponse(body)


@app.get("/.well-known/jwks.json")
def jwks():
    try:
        tool_conf = build_tool_conf_from_db(require_platforms=False)
        return JSONResponse(tool_conf.get_jwks())
    except LtiException as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.get("/dev/tenancy/cross-check")
def tenancy_cross_check():
    """Dev-only: prove Tenant A cannot see Tenant B launch_events under RLS."""
    try:
        # Ensure each tenant has at least one marker row (subject unique enough)
        db.insert_launch_event(
            tenant_id=TENANT_A_ID,
            subject="cross-check-tenant-a",
            roles="system",
            course_label="cross-check",
            raw_claims={"marker": "A"},
        )
        db.insert_launch_event(
            tenant_id=TENANT_B_ID,
            subject="cross-check-tenant-b",
            roles="system",
            course_label="cross-check",
            raw_claims={"marker": "B"},
        )

        visible_as_a = db.list_launch_events_for_tenant(TENANT_A_ID)
        visible_as_b = db.list_launch_events_for_tenant(TENANT_B_ID)
        count_a = db.count_launch_events_visible(TENANT_A_ID)
        count_b = db.count_launch_events_visible(TENANT_B_ID)

        leaked_to_a = [
            r for r in visible_as_a if str(r["tenant_id"]) == TENANT_B_ID
        ]
        leaked_to_b = [
            r for r in visible_as_b if str(r["tenant_id"]) == TENANT_A_ID
        ]
        ok = len(leaked_to_a) == 0 and len(leaked_to_b) == 0
        return {
            "ok": ok,
            "count_visible_as_tenant_a": count_a,
            "count_visible_as_tenant_b": count_b,
            "leaked_b_rows_to_a": len(leaked_to_a),
            "leaked_a_rows_to_b": len(leaked_to_b),
            "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
        }
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "error": str(exc)},
            status_code=500,
        )


async def _collect_params(request: Request) -> dict:
    params = dict(request.query_params)
    if request.method == "POST":
        form = await request.form()
        for key in form.keys():
            params[key] = form.get(key)
    return params


def _deployment_from_params(params: dict) -> str | None:
    return (
        params.get("lti_deployment_id")
        or params.get("deployment_id")
        or None
    )


@app.api_route("/lti/login", methods=["GET", "POST"])
async def lti_login(request: Request):
    try:
        params = await _collect_params(request)
        settings = get_settings()
        iss = (params.get("iss") or "").rstrip("/")
        client_id = params.get("client_id") or ""
        deployment_id = _deployment_from_params(params)

        # Fail closed early if platform unknown (also builds multi-issuer conf)
        if iss and client_id:
            resolve_platform(iss, client_id, deployment_id)

        tool_conf = build_tool_conf_from_db(require_platforms=True)
        launch_url = f"{settings.app_base_url}/lti/launch"
        fastapi_request = FastAPIRequest(request, form_data=params)
        storage = make_launch_data_storage(fastapi_request, LAUNCH_CACHE)
        oidc = FastAPIOIDCLogin(fastapi_request, tool_conf, launch_data_storage=storage)
        oidc.pass_params_to_launch({"registered": True})
        return oidc.enable_check_cookies().redirect(launch_url)
    except LtiException as exc:
        print(f"LTI login failed: {exc}", flush=True)
        return PlainTextResponse(f"LTI login failed: {exc}", status_code=400)
    except Exception as exc:  # noqa: BLE001
        print(f"LTI login error: {exc}", flush=True)
        return PlainTextResponse(f"LTI login error: {exc}", status_code=500)


@app.api_route("/lti/launch", methods=["GET", "POST"])
async def lti_launch(request: Request):
    try:
        params = await _collect_params(request)
        tool_conf = build_tool_conf_from_db(require_platforms=True)
        fastapi_request = FastAPIRequest(request, form_data=params)
        storage = make_launch_data_storage(fastapi_request, LAUNCH_CACHE)
        message_launch = FastAPIMessageLaunch(
            fastapi_request, tool_conf, launch_data_storage=storage
        )
        launch_data = message_launch.get_launch_data()

        iss = str(launch_data.get("iss") or "").rstrip("/")
        aud = launch_data.get("aud")
        if isinstance(aud, list):
            client_id = str(aud[0]) if aud else ""
        else:
            client_id = str(aud or "")
        deployment_id = (
            launch_data.get(
                "https://purl.imsglobal.org/spec/lti/claim/deployment_id"
            )
            or _deployment_from_params(params)
        )
        tenant = resolve_platform(iss, client_id, deployment_id)

        name = launch_data.get("name") or launch_data.get("sub") or "unknown"
        roles = launch_data.get(
            "https://purl.imsglobal.org/spec/lti/claim/roles", []
        )
        role_labels = []
        for role in roles:
            if "Instructor" in role:
                role_labels.append("Instructor")
            elif "Learner" in role or "Student" in role:
                role_labels.append("Learner")
            else:
                role_labels.append(str(role).split("#")[-1])
        role_text = ", ".join(dict.fromkeys(role_labels)) or "unknown"

        context = launch_data.get(
            "https://purl.imsglobal.org/spec/lti/claim/context", {}
        )
        course = context.get("title") or context.get("label") or context.get("id") or "—"

        # Persist under RLS (SET LOCAL app.tenant_id)
        event = db.insert_launch_event(
            tenant_id=tenant.tenant_id,
            subject=str(launch_data.get("sub", "")),
            roles=role_text,
            course_label=str(course),
            raw_claims={
                "iss": iss,
                "aud": client_id,
                "deployment_id": deployment_id,
                "name": name,
                "tenant_slug": tenant.slug,
            },
        )

        safe_name = html.escape(str(name))
        safe_role = html.escape(role_text)
        safe_course = html.escape(str(course))
        safe_sub = html.escape(str(launch_data.get("sub", "")))
        safe_tenant = html.escape(f"{tenant.slug} — {tenant.name}")
        safe_event = html.escape(str(event["id"]))

        page = f"""
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <title>EdVidura Hello</title>
          <style>
            body {{ font-family: Segoe UI, sans-serif; margin: 2rem; background: #F5F7FA; color: #1A1A2E; }}
            .card {{ background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 1.5rem; max-width: 560px; }}
            h1 {{ color: #0D47A1; margin-top: 0; }}
            .ok {{ color: #2E7D32; font-weight: 600; }}
            code {{ background: #F3F4F6; padding: 0.1rem 0.35rem; border-radius: 4px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <p class="ok">LTI 1.3 launch OK</p>
            <h1>Hello from EdVidura</h1>
            <p><strong>Tenant:</strong> {safe_tenant}</p>
            <p><strong>Name / id:</strong> {safe_name}</p>
            <p><strong>Subject:</strong> <code>{safe_sub}</code></p>
            <p><strong>Role:</strong> {safe_role}</p>
            <p><strong>Course:</strong> {safe_course}</p>
            <p><strong>Stored launch id:</strong> <code>{safe_event}</code></p>
            <p style="color:#6B7280;font-size:0.9rem">
              Multi-tenant spike — tenant from LTI registration only.
            </p>
          </div>
        </body>
        </html>
        """
        return HTMLResponse(page)
    except LtiException as exc:
        print(f"LTI launch failed: {exc}", flush=True)
        return PlainTextResponse(f"LTI launch failed: {exc}", status_code=400)
    except Exception as exc:  # noqa: BLE001
        print(f"LTI launch error: {exc}", flush=True)
        return PlainTextResponse(f"LTI launch error: {exc}", status_code=500)


@app.get("/dev/tenancy/launches/{tenant_slug}")
def list_launches(tenant_slug: str):
    """Dev helper: list launch_events visible under the named tenant's RLS context."""
    tenant_map = {
        "tenant-a": TENANT_A_ID,
        "a": TENANT_A_ID,
        "tenant-b": TENANT_B_ID,
        "b": TENANT_B_ID,
    }
    tid = tenant_map.get(tenant_slug.lower())
    if not tid:
        return JSONResponse({"error": "unknown tenant slug"}, status_code=404)
    rows = db.list_launch_events_for_tenant(UUID(tid))
    return {
        "tenant_id": tid,
        "count": len(rows),
        "launches": [
            {
                "id": str(r["id"]),
                "tenant_id": str(r["tenant_id"]),
                "subject": r["subject"],
                "roles": r["roles"],
                "course_label": r["course_label"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ],
    }
