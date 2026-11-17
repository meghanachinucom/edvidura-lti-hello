"""Browser OIDC login for ops (Keycloak) — complements X-Admin-Key."""
from __future__ import annotations

import secrets
from urllib.parse import quote

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from pydantic import BaseModel, Field

from app.launch_cache import LAUNCH_CACHE, redeem_exchange_code
from app.quiz_routes import SESSION_KEY as QUIZ_SESSION_KEY
from app.api.app_client.envelope import public_session, ok, fail
from app.modules.identity import (
    exchange_code,
    keycloak_auth_url,
    keycloak_enabled,
    keycloak_logout_url,
    principal_has_ops,
    verify_access_token,
)
from app.security_boot import safe_relative_next
from app.settings import get_settings

router = APIRouter(tags=["Auth"])


def _public_base(request: Request) -> str:
    """Canonical public origin for OAuth redirects.

    Production/staging always use APP_BASE_URL so client-controlled
    X-Forwarded-* headers cannot rewrite the Keycloak redirect_uri.
    Local/dev may still follow Host for localhost vs 127.0.0.1 cookies.
    """
    settings = get_settings()
    configured = (settings.app_base_url or "").rstrip("/")
    if settings.is_production_like and configured:
        return configured
    proto = (
        request.headers.get("x-forwarded-proto") or request.url.scheme
    ).split(",")[0].strip()
    host = (
        request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    ).split(",")[0].strip()
    if host:
        return f"{proto}://{host}".rstrip("/")
    return configured or str(request.base_url).rstrip("/")


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
def auth_login(request: Request, next: str = "/ops/dashboard"):
    if not keycloak_enabled():
        dest = "/ops/login" if str(next or "").startswith("/ops") else "/onboard"
        return RedirectResponse(
            url=dest
            + "?err="
            + quote("Keycloak is disabled (set KEYCLOAK_ENABLED=1)"),
            status_code=303,
        )
    state = secrets.token_urlsafe(24)
    nxt = safe_relative_next(next, default="/ops/dashboard")
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
        return RedirectResponse(
            url="/ops/login?err=Keycloak+disabled", status_code=303
        )

    pending = LAUNCH_CACHE.get(f"oidc:{state}") if state else None
    if not code or not state or not isinstance(pending, dict):
        return RedirectResponse(
            url="/ops/login?err="
            + quote(
                "Invalid login state — click Sign in with Keycloak again "
                "(link expires after 10 minutes)"
            ),
            status_code=303,
        )

    redirect_uri = str(pending.get("redirect_uri") or f"{_public_base(request)}/auth/callback")
    nxt = safe_relative_next(
        str(pending.get("next") or "/ops/dashboard"), default="/ops/dashboard"
    )
    err_dest = "/ops/login" if nxt.startswith("/ops") else "/onboard"

    try:
        tokens = exchange_code(code=code, redirect_uri=redirect_uri)
        access = str(tokens.get("access_token") or "")
        principal = verify_access_token(access)
        if not principal_has_ops(principal):
            return RedirectResponse(
                url=err_dest + "?err=" + quote("Account lacks ops role"),
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
            url=err_dest + "?err=" + quote(str(exc)[:160]),
            status_code=303,
        )
    finally:
        if state:
            LAUNCH_CACHE.set(f"oidc:{state}", None, exp=1)

    sep = "&" if "?" in nxt else "?"
    return RedirectResponse(
        url=f"{nxt}{sep}ok=" + quote("Signed in with Keycloak"),
        status_code=303,
    )


@router.get("/auth/logout")
def auth_logout(request: Request):
    request.session.pop("ops_auth", None)
    request.session.pop("edvidura_ops", None)
    base = _public_base(request)
    if keycloak_enabled():
        return RedirectResponse(
            url=keycloak_logout_url(redirect_uri=f"{base}/ops/login"),
            status_code=302,
        )
    return RedirectResponse(url="/ops/login", status_code=303)


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


class ExchangeRequest(BaseModel):
    code: str = Field(..., min_length=16, max_length=128)


@router.post("/api/v1/auth/exchange")
def auth_exchange(payload: ExchangeRequest, request: Request):
    """Single-use exchange of short-lived launch code for authenticated session."""
    quiz_ctx = redeem_exchange_code(payload.code)
    if not quiz_ctx or not isinstance(quiz_ctx, dict):
        return fail("Invalid or expired exchange code", code="invalid_code", status_code=401)

    # Establish session in cookie for web/iframe persistence
    request.session[QUIZ_SESSION_KEY] = quiz_ctx

    session_data = public_session(quiz_ctx)
    return ok(session_data)


@router.get("/api/v1/auth/demo-launch")
def demo_launch(request: Request, persona: str = "learner"):
    """Bootstrap genuine Riverside Class 8 (RHS-C08) session for remote senior review."""
    import os
    from fastapi.responses import PlainTextResponse
    from app.modules.tenancy import TENANT_A_ID, attach_to_session
    from app.quiz_routes import store_quiz_context
    from app.launch_cache import create_exchange_code

    p = persona.strip().lower()
    moodle_url = os.getenv("MOODLE_PUBLIC_URL", "").rstrip("/")
    if not moodle_url or "trycloudflare" in moodle_url:
        moodle_url = "/moodle"

    real_class_id = "5bfeab61-bc18-4b6a-a829-d5bee1b39238"
    real_course_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"
    real_course_title = "Class 8 · Algebra I"
    try:
        from app import db
        with db.tenant_connection(TENANT_A_ID) as conn:
            c_row = conn.execute(
                "SELECT id, class_code, class_name, course_id FROM classes WHERE class_code = %s",
                ("RHS-C08",),
            ).fetchone()
            if c_row:
                real_class_id = str(c_row["id"])
                if c_row.get("course_id"):
                    real_course_id = str(c_row["course_id"])
                    crs = conn.execute(
                        "SELECT title FROM courses WHERE id = %s",
                        (c_row["course_id"],),
                    ).fetchone()
                    if crs and crs.get("title"):
                        real_course_title = str(crs["title"])
    except Exception:
        pass

    if p in ("learner", "student", "alice"):
        quiz_ctx = {
            "tenant_id": TENANT_A_ID,
            "tenant_slug": "riverside",
            "tenant_name": "Riverside High",
            "subject": "6",
            "learner_name": "Alice Nguyen",
            "email": "c01.s01@riverside.test",
            "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
            "is_instructor": False,
            "is_school_admin": False,
            "class_id": real_class_id,
            "class_code": "RHS-C08",
            "course": real_course_title,
            "edvidura_course_id": real_course_id,
            "lms_return_url": f"{moodle_url}/course/view.php?id=10&persona=learner",
        }
        dest = "/lessons"
    elif p in ("instructor", "teacher", "priya"):
        quiz_ctx = {
            "tenant_id": TENANT_A_ID,
            "tenant_slug": "riverside",
            "tenant_name": "Riverside High",
            "subject": "3",
            "learner_name": "Priya Sharma",
            "email": "c8.teacher@riverside.test",
            "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"],
            "is_instructor": True,
            "is_school_admin": False,
            "class_id": real_class_id,
            "class_code": "RHS-C08",
            "course": real_course_title,
            "edvidura_course_id": real_course_id,
            "lms_return_url": f"{moodle_url}/course/view.php?id=10&persona=instructor",
        }
        dest = "/teacher/attempts"
    elif p in ("admin", "school_admin", "school-admin", "alex"):
        quiz_ctx = {
            "tenant_id": TENANT_A_ID,
            "tenant_slug": "riverside",
            "tenant_name": "Riverside High",
            "subject": "5",
            "learner_name": "Alex Morgan",
            "email": "admin@riverside.test",
            "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator"],
            "is_instructor": False,
            "is_school_admin": True,
            "class_id": real_class_id,
            "class_code": "RHS-C08",
            "course": real_course_title,
            "edvidura_course_id": real_course_id,
            "lms_return_url": f"{moodle_url}/course/view.php?id=10&persona=admin",
        }
        dest = "/school-admin"
    else:
        return PlainTextResponse("Invalid persona. Choose from: learner, instructor, admin", status_code=400)

    try:
        attach_to_session(quiz_ctx)
    except Exception:
        quiz_ctx.setdefault("segment", "school")
        quiz_ctx.setdefault("capabilities", {})
        quiz_ctx.setdefault("is_corporate", False)

    quiz_token = store_quiz_context(quiz_ctx)
    quiz_ctx["quiz_token"] = quiz_token
    request.session[QUIZ_SESSION_KEY] = quiz_ctx

    exchange_code = create_exchange_code(quiz_ctx, ttl_sec=300)
    return RedirectResponse(
        url=f"{dest}?token={quiz_token}&code={exchange_code}",
        status_code=302,
    )


@router.post("/api/v1/auth/logout")
def auth_logout_api(request: Request):
    """Clear LTI and ops session cookies."""
    request.session.pop(QUIZ_SESSION_KEY, None)
    request.session.pop("ops_auth", None)
    request.session.pop("edvidura_ops", None)
    return ok({"signed_out": True})
