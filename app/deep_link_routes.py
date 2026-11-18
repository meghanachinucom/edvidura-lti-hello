"""LTI Advantage Deep Linking — pick a lesson/quiz/manual into Moodle."""
from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pylti1p3.deep_link_resource import DeepLinkResource
from pylti1p3.exception import LtiException

from app.modules import content
from app.quiz_routes import (
    SESSION_KEY,
    load_quiz_context,
    require_quiz_session,
    restore_launch_from_id,
    store_quiz_context,
)
from app.settings import get_settings

router = APIRouter(tags=["LTI Deep Linking"])
_TEMPLATES = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[1] / "templates")
)


def _ensure_token(session: dict[str, Any]) -> str:
    token = str(session.get("quiz_token") or "")
    if token and load_quiz_context(token):
        return token
    token = store_quiz_context(session)
    session["quiz_token"] = token
    return token


def _bound_course(session: dict[str, Any]):
    return content.get_bound_course(
        session["tenant_id"], session.get("edvidura_course_id") or None
    )


@router.get("/lti/deep-link", response_class=HTMLResponse)
async def deep_link_picker(request: Request, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    if not session.get("is_deep_link"):
        return RedirectResponse(
            url=f"/launch-hub?token={_ensure_token(session)}", status_code=303
        )
    from app.modules.quiz.service import cookie_safe_session

    tok = _ensure_token(session)
    request.session[SESSION_KEY] = cookie_safe_session(
        {**session, "quiz_token": tok}
    )
    course = _bound_course(session)
    lessons = (
        content.list_lessons(session["tenant_id"], course["id"]) if course else []
    )
    manuals: list[dict[str, Any]] = []
    try:
        from app.modules import manuals as manuals_mod

        manuals = manuals_mod.list_manuals(session["tenant_id"])
    except Exception:  # noqa: BLE001
        manuals = []
    ai_suggestions = None
    try:
        from app.modules.ai_assessment import suggest_deeplink_activities

        ai_suggestions = suggest_deeplink_activities(
            lessons, course_title=str((course or {}).get("title") or "")
        )
    except Exception:  # noqa: BLE001
        ai_suggestions = None
    return _TEMPLATES.TemplateResponse(
        request,
        "deep_link_picker.html",
        {
            "quiz_token": tok,
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug"),
            "lessons": lessons,
            "manuals": manuals,
            "ai_suggestions": ai_suggestions,
            "app_base": get_settings().app_base_url,
        },
    )


@router.post("/lti/deep-link/submit", response_class=HTMLResponse)
async def deep_link_submit(
    request: Request,
    token: str = Form(...),
    item_type: str = Form(...),
    item_id: str = Form(""),
    title: str = Form(""),
):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    if not session.get("is_deep_link"):
        return HTMLResponse("Not a deep-linking launch", status_code=400)
    launch_id = str(session.get("launch_id") or "")
    settings = get_settings()
    base = settings.app_base_url.rstrip("/")
    tok = _ensure_token(session)

    kind = (item_type or "").strip()
    iid = (item_id or "").strip()
    label = (title or "").strip() or "EdVidura"
    custom: dict[str, str] = {"edvidura_item_type": kind}
    if kind in {"quiz", "practice", "bank"}:
        if kind == "practice":
            url = f"{base}/quiz?token={tok}&practice=1"
            label = label or "Practice quiz"
            custom["edvidura_item_type"] = "practice"
            custom["edvidura_practice"] = "1"
        elif kind == "bank":
            url = f"{base}/quiz?token={tok}&bank=1"
            label = label or "Question bank"
            custom["edvidura_item_type"] = "bank"
        else:
            url = f"{base}/quiz?token={tok}"
            label = label or "School quiz"
            custom["edvidura_item_type"] = "quiz"
    elif kind == "lesson" and iid:
        url = f"{base}/lessons/{iid}?token={tok}"
        custom["edvidura_lesson_id"] = iid
    elif kind == "manual" and iid:
        url = f"{base}/manuals/{iid}?token={tok}"
        custom["edvidura_manual_id"] = iid
    elif kind == "hub":
        url = f"{base}/launch-hub?token={tok}"
        label = label or "EdVidura home"
    else:
        return RedirectResponse(
            url=f"/lti/deep-link?token={tok}&err=Pick+an+item", status_code=303
        )

    try:
        message_launch = restore_launch_from_id(launch_id)
        deep_link = message_launch.get_deep_link()
        resource = (
            DeepLinkResource()
            .set_url(url)
            .set_title(label)
            .set_target("window")
            .set_custom_params(custom)
        )
        html = deep_link.output_response_form([resource])
        return HTMLResponse(html)
    except (LtiException, RuntimeError) as exc:
        return HTMLResponse(
            f"<h1>Deep linking failed</h1><p>{exc}</p>"
            f'<p><a href="/lti/deep-link?token={tok}">Back</a></p>',
            status_code=400,
        )


@router.get("/api/v1/app/deep-link/items")
async def deep_link_items_api(request: Request):
    """Return available items for LTI 1.3 Deep Linking Content Picker (F-08 / REQ-07)."""
    return {
        "ok": True,
        "items": [
            {
                "id": "quiz-class8",
                "type": "quiz",
                "title": "Class 8 · Linear Equations Mastery Assessment",
                "description": "Graded assessment with 15 adaptive questions and AGS passback.",
                "targetUrl": "/active-quizzes",
            },
            {
                "id": "de7900fd-488b-4740-bf7e-7a11b3475cd6",
                "type": "manual",
                "title": "Algebra I: Foundations, Variables & Linear Equations Handbook",
                "description": "Interactive multi-chapter mathematics textbook with PaperMorph quick checks.",
                "targetUrl": "/read/manuals/de7900fd-488b-4740-bf7e-7a11b3475cd6",
            },
            {
                "id": "eb-physical-science",
                "type": "manual",
                "title": "Physical Science: Motion, Forces & Energy Interactive Textbook",
                "description": "Physical science textbook with velocity diagrams and formula checks.",
                "targetUrl": "/read/manuals/eb-physical-science",
            },
            {
                "id": "eb-railways-safety",
                "type": "manual",
                "title": "Indian Railways Track Maintenance & Signalling Safety Manual",
                "description": "Vocational railway safety manual with USFD and Kavach ATP protocols.",
                "targetUrl": "/read/manuals/eb-railways-safety",
            },
            {
                "id": "eb-digital-cybersecurity",
                "type": "manual",
                "title": "Digital Literacy, AI & Cybersecurity Foundations",
                "description": "Computer science, transformers AI, and cybersecurity fundamentals.",
                "targetUrl": "/read/manuals/eb-digital-cybersecurity",
            },
            {
                "id": "eb-niti-ethics",
                "type": "manual",
                "title": "Niti & Life Values: Student Character & Ethics Companion",
                "description": "Humanities companion with multilingual Indian language reflections.",
                "targetUrl": "/read/manuals/eb-niti-ethics",
            },
        ],
    }


@router.post("/api/v1/app/deep-link/preview")
async def deep_link_preview_api(request: Request):
    """Generate signed LTI 1.3 Deep Linking response preview for LMS integration."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    item_id = str(body.get("itemId") or "quiz-class8")
    item_type = str(body.get("itemType") or "quiz")
    item_title = str(body.get("itemTitle") or "EdVidura Learning Resource")
    settings = get_settings()
    base = settings.app_base_url.rstrip("/")

    target_url = f"{base}/read/manuals/{item_id}" if item_type == "manual" else f"{base}/active-quizzes"

    jwt_claims = {
        "iss": settings.lti_issuer or base,
        "aud": "https://moodle.example/platform",
        "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
        "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "1",
        "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [
            {
                "type": "ltiResourceLink",
                "title": item_title,
                "url": target_url,
                "target": "iframe",
                "custom": {
                    "edvidura_item_type": item_type,
                    "edvidura_item_id": item_id,
                },
            }
        ],
    }
    return {
        "ok": True,
        "item": {
            "id": item_id,
            "type": item_type,
            "title": item_title,
            "url": target_url,
        },
        "jwtClaims": jwt_claims,
        "jwksUrl": f"{base}/.well-known/jwks.json",
    }
