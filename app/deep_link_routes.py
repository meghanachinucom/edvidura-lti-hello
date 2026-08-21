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


@router.get("/lti/deep-link", response_class=HTMLResponse)
async def deep_link_picker(request: Request, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    if not session.get("is_deep_link"):
        return RedirectResponse(
            url=f"/launch-hub?token={_ensure_token(session)}", status_code=303
        )
    tok = _ensure_token(session)
    request.session[SESSION_KEY] = session
    course = content.get_primary_course(session["tenant_id"])
    lessons = (
        content.list_lessons(session["tenant_id"], course["id"]) if course else []
    )
    manuals: list[dict[str, Any]] = []
    try:
        from app.modules import manuals as manuals_mod

        manuals = manuals_mod.list_manuals(session["tenant_id"])
    except Exception:  # noqa: BLE001
        manuals = []
    return _TEMPLATES.TemplateResponse(
        request,
        "deep_link_picker.html",
        {
            "quiz_token": tok,
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug"),
            "lessons": lessons,
            "manuals": manuals,
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
    if kind == "quiz":
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
