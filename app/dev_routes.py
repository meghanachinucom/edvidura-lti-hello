"""Local client launch without Moodle LTI (admin-gated).

Mint a quiz session for telugu-chaganti / welding-corp / riverside so you can
test segment + content packs without External Tool setup.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from app import db
from app.admin_auth import admin_key_matches
from app.modules import manuals as manuals_mod
from app.modules.school import create_class, list_classes_with_roster
from app.modules.tenancy import attach_to_session
from app.quiz_routes import SESSION_KEY, store_quiz_context
from app.settings import get_settings

router = APIRouter(tags=["Dev"])

_CLIENT_CLASS: dict[str, dict[str, str]] = {
    "ap-chaganti": {
        "code": "AP-CH-01",
        "name": "AP Pravachanalu · public",
        "subject": "Pravachanam",
    },
    "telugu-chaganti": {
        "code": "TCG-AP-01",
        "name": "Telugu Discourse · AP",
        "subject": "Discourse",
    },
    "welding-corp": {
        "code": "WELD-LD-01",
        "name": "Welding L&D cohort",
        "subject": "Welding",
    },
    "riverside": {
        "code": "RHS-C08",
        "name": "Class 8",
        "subject": "Algebra",
    },
}


def _ensure_demo_class(tenant_id: str, slug: str) -> dict[str, Any]:
    meta = _CLIENT_CLASS.get(slug) or {
        "code": "DEMO-01",
        "name": "Demo class",
        "subject": "",
    }
    existing = list_classes_with_roster(tenant_id)
    for c in existing:
        if str(c.get("class_code") or "") == meta["code"]:
            return c
    if existing:
        return existing[0]
    return create_class(
        tenant_id,
        class_code=meta["code"],
        class_name=meta["name"],
        subject=meta["subject"],
        term="Demo",
    )


def _link_pack_manuals(tenant_id: str, slug: str, class_id: str) -> None:
    titles = {
        "telugu-chaganti": ("Chaganti discourse (demo · Sanskrit source)",),
        "welding-corp": ("Welding fundamentals (demo pack)",),
    }.get(slug, ())
    if not titles:
        return
    try:
        manuals = manuals_mod.list_manuals(tenant_id, include_unpublished=True)
    except Exception:  # noqa: BLE001
        return
    for m in manuals:
        if str(m.get("title") or "") in titles:
            try:
                manuals_mod.link_manual_to_class(
                    tenant_id, manual_id=m["id"], class_id=class_id
                )
            except Exception:  # noqa: BLE001
                pass


@router.get("/dev/client-launch")
def client_launch(
    request: Request,
    slug: str = Query(..., min_length=2, max_length=64),
    role: str = Query("student"),
    key: str = Query(""),
    name: str = Query(""),
    spa: int | None = Query(
        None,
        description="1 = Vite SPA, 0 = Jinja hub; default is SPA in local development",
    ),
):
    """Open a tenant as student/teacher without Moodle (local / admin key)."""
    settings = get_settings()
    if settings.is_production_like:
        return HTMLResponse(
            "<h1>Disabled outside local development</h1>"
            "<p>Use Moodle LTI launch for staging/production.</p>",
            status_code=403,
        )
    if not admin_key_matches(key) and not admin_key_matches(
        request.headers.get("X-Admin-Key")
    ):
        return HTMLResponse(
            "<h1>Unauthorized</h1>"
            "<p>Pass <code>?key=</code> matching <code>ADMIN_API_KEY</code>.</p>",
            status_code=401,
        )

    slug_clean = slug.strip().lower()
    tenant = db.get_tenant_by_slug(slug_clean)
    if not tenant:
        return HTMLResponse(
            f"<h1>Unknown tenant</h1><p>slug={slug_clean}</p>",
            status_code=404,
        )
    if str(tenant.get("status") or "") == "disabled":
        return HTMLResponse("<h1>Tenant disabled</h1>", status_code=403)

    role_l = (role or "student").strip().lower()
    is_instructor = role_l in {"teacher", "instructor"}
    is_school_admin = role_l in {"admin", "school_admin", "principal"}
    if is_school_admin:
        is_instructor = True

    display = (name or "").strip()
    if not display:
        gov = str(tenant.get("segment") or "") == "government"
        if is_school_admin:
            display = "AP Cultural Officer" if gov else "Demo Admin"
        elif is_instructor:
            display = "Cultural Officer" if gov else "Demo Teacher"
        else:
            display = "Sita Devi" if gov else "Demo Learner"

    tid = str(tenant["id"])
    klass = _ensure_demo_class(tid, slug_clean)
    class_id = str(klass["id"])
    _link_pack_manuals(tid, slug_clean, class_id)

    course_id = str(klass.get("course_id") or "") or ""
    if not course_id:
        try:
            from app.modules import content as content_mod

            bound = content_mod.get_bound_course(tid, None)
            if not bound:
                bound = content_mod.ensure_primary_course(
                    tid, title=str(klass.get("class_name") or tenant["name"])
                )
            if bound:
                course_id = str(bound.get("id") or "")
        except Exception:  # noqa: BLE001
            course_id = ""

    quiz_ctx: dict[str, Any] = {
        "launch_id": f"dev-{slug_clean}-{role_l}",
        "tenant_id": tid,
        "tenant_slug": tenant["slug"],
        "tenant_name": tenant["name"],
        "subject": f"dev-{slug_clean}-{role_l}",
        "learner_name": display,
        "given_name": display.split()[0],
        "family_name": display.split()[-1] if " " in display else "",
        "roles": (
            "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
            if is_instructor
            else "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
        ),
        "email": f"{role_l}@{slug_clean}.test",
        "is_instructor": is_instructor,
        "is_school_admin": is_school_admin,
        "is_deep_link": False,
        "course": str(klass.get("class_name") or slug_clean),
        "lti_context_id": f"dev-ctx-{slug_clean}",
        "class_id": class_id,
        "class_code": str(klass.get("class_code") or ""),
        "class_name": str(klass.get("class_name") or ""),
        "academic_subject": str(klass.get("subject") or ""),
        "edvidura_course_id": course_id,
        "ags_available": False,
        "ags_scopes": [],
        "ags_has_lineitem": False,
        "ags_has_lineitems": False,
        "nrps_available": False,
        "client_id": "dev-client",
        "lms_name": "Local (no Moodle)",
        "lms_return_url": "",
        "lms_base_url": settings.app_base_url,
        "moodle_return_url": "",
        "moodle_base_url": settings.app_base_url,
        "dev_launch": True,
    }
    try:
        attach_to_session(quiz_ctx)
    except Exception:  # noqa: BLE001
        quiz_ctx.setdefault("segment", tenant.get("segment") or "school")
        quiz_ctx.setdefault("capabilities", {})
        quiz_ctx.setdefault(
            "is_corporate", quiz_ctx.get("segment") == "corporate"
        )

    token = store_quiz_context(quiz_ctx)
    quiz_ctx["quiz_token"] = token
    request.session[SESSION_KEY] = quiz_ctx
    from app.frontend_handoff import launch_destination, spa_enabled

    use_shell = (spa == 0) or (spa is None and not spa_enabled())
    return RedirectResponse(
        url=launch_destination(token, shell=use_shell), status_code=303
    )
