"""EdVidura LTI Hello — FastAPI multi-tenant Moodle LTI 1.3 spike."""
from __future__ import annotations

from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pylti1p3.exception import LtiException
from starlette.middleware.sessions import SessionMiddleware

from app import db
from app.api.admin_tenants import router as admin_tenants_router
from app.api.ai import router as ai_api_router
from app.api.events import router as events_api_router
from app.api.institution import router as institution_router
from app.api.skills import router as skills_api_router
from app.api.student import router as student_router
from app.api.tla import router as tla_api_router
from app.api.xapi import router as xapi_api_router
from app.launch_cache import LAUNCH_CACHE
from app.logconfig import configure_logging
from app.logging_middleware import StructuredLoggingMiddleware
from app.lti_fastapi import (
    FastAPIMessageLaunch,
    FastAPIOIDCLogin,
    FastAPIRequest,
    make_launch_data_storage,
)
from app.onboard_routes import router as onboard_router
from app.auth_routes import router as auth_router
from app.deep_link_routes import router as deep_link_router
from app.lti_register_routes import router as lti_register_router
from app.quiz_routes import SESSION_KEY as QUIZ_SESSION_KEY
from app.quiz_routes import router as quiz_router
from app.quiz_routes import store_quiz_context
from app.shell_routes import router as shell_router
from app.settings import get_settings
from app.security_boot import assert_safe_for_environment, require_dev_tools
from app.monitoring import init_monitoring
from app.rate_limit import RateLimitMiddleware
from app.tenant_context import TenantContext, use_tenant_context
from app.tenancy import (
    TENANT_A_ID,
    TENANT_B_ID,
    build_tool_conf_from_db,
    display_name_from_launch,
    resolve_platform,
)
from app.tenancy_isolation import prove_launch_events_isolation

configure_logging()
init_monitoring()

_boot = get_settings()
assert_safe_for_environment(_boot)

app = FastAPI(
    title="EdVidura",
    description="Multi-tenant LTI 1.3 learning platform for schools (Moodle front door).",
    version="0.8.0",
    docs_url=None if _boot.is_production else "/docs",
    redoc_url=None if _boot.is_production else "/redoc",
    openapi_url=None if _boot.is_production else "/openapi.json",
)

app.include_router(admin_tenants_router)
app.include_router(auth_router)
app.include_router(onboard_router)
app.include_router(deep_link_router)
app.include_router(lti_register_router)
app.include_router(shell_router)
app.include_router(institution_router)
app.include_router(student_router)
app.include_router(xapi_api_router)
app.include_router(skills_api_router)
app.include_router(tla_api_router)
app.include_router(events_api_router)
app.include_router(ai_api_router)
app.include_router(quiz_router)

_STATIC = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")

app.add_middleware(
    RateLimitMiddleware,
    enabled=_boot.rate_limit_enabled,
)
app.add_middleware(StructuredLoggingMiddleware)
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
    cache_backend = "unknown"
    try:
        from app.launch_cache import LAUNCH_CACHE

        cache_backend = getattr(LAUNCH_CACHE, "backend", type(LAUNCH_CACHE).__name__)
    except Exception:  # noqa: BLE001
        cache_backend = "error"
    try:
        platforms = len(db.fetch_all_active_platforms())
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "service": "edvidura",
            "version": app.version,
            "environment": _boot.environment,
            "db_ok": False,
            "db_error": str(exc),
            "platforms": 0,
            "cache_backend": cache_backend,
            "rate_limit": _boot.rate_limit_enabled,
        }
    return {
        "ok": True,
        "service": "edvidura",
        "version": app.version,
        "environment": _boot.environment,
        "db_ok": db_ok,
        "platforms": platforms,
        "cache_backend": cache_backend,
        "rate_limit": _boot.rate_limit_enabled,
    }


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    from fastapi.templating import Jinja2Templates

    settings = get_settings()
    templates = Jinja2Templates(
        directory=str(Path(__file__).resolve().parents[1] / "templates")
    )
    from app.modules.identity import keycloak_enabled

    return templates.TemplateResponse(
        request,
        "landing.html",
        {
            "base": settings.app_base_url,
            "keycloak_enabled": keycloak_enabled(),
            "metabase_url": settings.metabase_url or "",
        },
    )


@app.get("/.well-known/jwks.json")
def jwks():
    try:
        tool_conf = build_tool_conf_from_db(require_platforms=False)
        return JSONResponse(tool_conf.get_jwks())
    except LtiException as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.get("/dev/tenancy/cross-check")
def tenancy_cross_check(request: Request):
    """Dev-only: prove Tenant A cannot see Tenant B launch_events under RLS."""
    require_dev_tools(request)
    try:
        result = prove_launch_events_isolation()
        if not result["ok"]:
            return JSONResponse(result, status_code=500)
        return result
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "error": str(exc)},
            status_code=500,
        )


@app.post("/dev/outbox/drain/{tenant_id}")
def outbox_drain(tenant_id: UUID, request: Request):
    """Mark pending outbox events published for one tenant (local sink)."""
    require_dev_tools(request)
    from app.modules.events import drain_tenant

    try:
        result = drain_tenant(tenant_id, limit=100)
        return {"ok": True, **result}
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


@app.get("/dev/outbox/pending/{tenant_id}")
def outbox_pending(tenant_id: UUID, request: Request):
    require_dev_tools(request)
    from app.modules.events import list_pending_for_tenant

    rows = list_pending_for_tenant(tenant_id, limit=50)
    return {
        "ok": True,
        "count": len(rows),
        "events": [
            {
                "event_id": str(r["event_id"]),
                "event_type": r["event_type"],
                "subject": r.get("subject"),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            }
            for r in rows
        ],
    }


@app.get("/dev/xapi/statements/{tenant_id}")
def xapi_statements(tenant_id: UUID, request: Request, tier: str | None = None):
    """List recent xAPI statements for a tenant (ops auth)."""
    require_dev_tools(request)
    from app.modules.xapi import list_statements

    try:
        rows = list_statements(tenant_id, limit=50, tier=tier)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)
    return {
        "ok": True,
        "count": len(rows),
        "statements": [
            {
                "statement_id": str(r["statement_id"]),
                "verb_id": r["verb_id"],
                "actor_sub": r.get("actor_sub"),
                "object_id": r.get("object_id"),
                "tier": r.get("tier"),
                "sent_to_lrs": r.get("sent_to_lrs"),
                "lrs_error": r.get("lrs_error"),
                "lrs_attempts": r.get("lrs_attempts"),
                "attempt_id": str(r["attempt_id"]) if r.get("attempt_id") else None,
                "created_at": r["created_at"].isoformat()
                if r.get("created_at")
                else None,
                "statement": r.get("statement"),
            }
            for r in rows
        ],
    }


@app.post("/dev/xapi/retry-lrs/{tenant_id}")
def xapi_retry_lrs(tenant_id: UUID, request: Request):
    require_dev_tools(request)
    from app.modules.xapi import retry_failed_lrs, tier_counts

    try:
        result = retry_failed_lrs(tenant_id, limit=100)
        return {"ok": True, **result, "tiers": tier_counts(tenant_id)}
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


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
        import json
        print(json.dumps(launch_data, indent=2))
        
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

        name = display_name_from_launch(launch_data) or "Learner"
        given = str(launch_data.get("given_name") or "").strip()
        family = str(launch_data.get("family_name") or "").strip()
        email = str(launch_data.get("email") or "").strip()
        roles = launch_data.get(
            "https://purl.imsglobal.org/spec/lti/claim/roles", []
        )
        role_labels = []
        for role in roles:
            if "Instructor" in role:
                role_labels.append("Instructor")
            elif "Administrator" in role or "Admin" in str(role).split("#")[-1]:
                role_labels.append("Administrator")
            elif "Learner" in role or "Student" in role:
                role_labels.append("Learner")
            else:
                role_labels.append(str(role).split("#")[-1])
        role_text = ", ".join(dict.fromkeys(role_labels)) or "unknown"

        context = launch_data.get(
            "https://purl.imsglobal.org/spec/lti/claim/context", {}
        ) or {}
        context_title = str(context.get("title") or "").strip()
        context_label = str(context.get("label") or "").strip()
        lti_context_id = str(context.get("id") or "").strip()
        course = context_title or context_label or lti_context_id or "—"

        # Bind request-scoped TenantContext; persist under RLS
        tctx = TenantContext(
            tenant_id=tenant.tenant_id,
            slug=tenant.slug,
            name=tenant.name,
        )
        with use_tenant_context(tctx):
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
                    "lti_context_id": lti_context_id,
                },
            )
        try:
            db.touch_platform_last_launch(issuer=iss, client_id=client_id)
        except Exception as exc:  # noqa: BLE001
            print(f"Warning: could not update last_launch_at: {exc}", flush=True)

        is_instructor = "Instructor" in role_text or "Administrator" in role_text
        # School admin = Moodle Administrator role. People profiles live in Moodle;
        # EdVidura does not create teacher/student accounts.
        is_school_admin = "Administrator" in role_text
        if not is_school_admin:
            try:
                from app.modules.school import find_school_admin

                admin_row = find_school_admin(
                    tenant.tenant_id, email=email, name=str(name)
                )
                is_school_admin = bool(admin_row)
            except Exception:  # noqa: BLE001
                pass
        is_deep_link = False
        try:
            is_deep_link = bool(message_launch.is_deep_link_launch())
        except Exception:  # noqa: BLE001
            is_deep_link = False
        ags_claim = launch_data.get(
            "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
        ) or {}
        ags_scopes = list(ags_claim.get("scope") or [])
        ags_available = bool(ags_claim) and (
            "https://purl.imsglobal.org/spec/lti-ags/scope/score" in ags_scopes
        )
        launch_pres = launch_data.get(
            "https://purl.imsglobal.org/spec/lti/claim/launch_presentation"
        ) or {}
        from app.modules.tenancy import (
            default_lms_return_url,
            detect_lms_name,
        )

        lms_name = detect_lms_name(iss)
        moodle_return = str(launch_pres.get("return_url") or "").strip()
        if not moodle_return:
            moodle_return = default_lms_return_url(
                iss,
                context_id=lti_context_id,
                lms_name=lms_name,
            )
        if not moodle_return:
            moodle_return = "http://localhost:8085/my/"

        # Phase 7: LMS context → EdVidura class + subject curriculum
        binding = None
        if lti_context_id:
            try:
                from app.modules.school import resolve_lti_context_binding

                binding = resolve_lti_context_binding(
                    tenant.tenant_id,
                    lti_context_id=lti_context_id,
                    context_label=context_label,
                    context_title=context_title,
                    auto_bind=True,
                )
            except Exception as exc:  # noqa: BLE001
                print(f"Warning: LTI context binding failed: {exc}", flush=True)
                binding = None

        quiz_ctx = {
            "launch_id": message_launch.get_launch_id(),
            "tenant_id": str(tenant.tenant_id),
            "tenant_slug": tenant.slug,
            "tenant_name": tenant.name,
            "subject": str(launch_data.get("sub", "")),
            "learner_name": str(name),
            "given_name": given,
            "family_name": family,
            "roles": role_text,
            "email": email,
            "is_instructor": is_instructor,
            "is_school_admin": is_school_admin,
            "is_deep_link": is_deep_link,
            "course": str(course),
            "lti_context_id": lti_context_id,
            "class_id": (binding or {}).get("class_id") or "",
            "class_code": (binding or {}).get("class_code") or "",
            "class_name": (binding or {}).get("class_name") or "",
            "academic_subject": (binding or {}).get("subject") or "",
            "edvidura_course_id": (binding or {}).get("course_id") or "",
            "launch_event_id": str(event["id"]),
            "ags_available": ags_available,
            "ags_scopes": ags_scopes,
            "ags_has_lineitem": bool(ags_claim.get("lineitem")),
            "ags_has_lineitems": bool(ags_claim.get("lineitems")),
            "nrps_available": False,
            "client_id": client_id,
            "lms_name": lms_name,
            "lms_return_url": moodle_return,
            "lms_base_url": iss or "http://localhost:8085",
            # Aliases kept for older templates / helpers
            "moodle_return_url": moodle_return,
            "moodle_base_url": iss or "http://localhost:8085",
        }
        try:
            from app.modules import nrps as nrps_mod

            quiz_ctx["nrps_available"] = bool(
                message_launch.has_nrps()
            ) or nrps_mod.has_nrps_on_launch(launch_data)
        except Exception:  # noqa: BLE001
            quiz_ctx["nrps_available"] = False
        # Keep launch JWT body in memory and Postgres (survives uvicorn --reload)
        launch_id = message_launch.get_launch_id()
        LAUNCH_CACHE.set(launch_id, launch_data, exp=3600)
        LAUNCH_CACHE.set(f"launchdata:{launch_id}", launch_data, exp=3600)
        try:
            db.save_launch_snapshot(
                launch_id=launch_id,
                tenant_id=tenant.tenant_id,
                launch_data=launch_data,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Warning: could not persist launch snapshot: {exc}", flush=True)
        quiz_ctx["launch_id"] = launch_id
        quiz_token = store_quiz_context(quiz_ctx)
        quiz_ctx["quiz_token"] = quiz_token
        # Keep session cookie small (quiz context only). Full JWT lives in
        # LAUNCH_CACHE + lti_launch_snapshots — stuffing it into the cookie
        # exceeds browser limits and leaves a stale launch_id after reload.
        request.session[QUIZ_SESSION_KEY] = quiz_ctx
        if is_deep_link:
            return RedirectResponse(
                url=f"/lti/deep-link?token={quiz_token}", status_code=303
            )
        return RedirectResponse(url=f"/launch-hub?token={quiz_token}", status_code=303)
    except LtiException as exc:
        print(f"LTI launch failed: {exc}", flush=True)
        return PlainTextResponse(f"LTI launch failed: {exc}", status_code=400)
    except Exception as exc:  # noqa: BLE001
        print(f"LTI launch error: {exc}", flush=True)
        return PlainTextResponse(f"LTI launch error: {exc}", status_code=500)


@app.get("/dev/tenancy/launches/{tenant_slug}")
def list_launches(tenant_slug: str, request: Request):
    """Dev helper: list launch_events visible under the named tenant's RLS context."""
    require_dev_tools(request)
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
