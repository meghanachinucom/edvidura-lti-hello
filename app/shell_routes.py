"""Nine product screens in the cinematic shell (Syne / Outfit / amber)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app import db
from app.modules import content
from app.modules.quiz import MAX_SCORE, QUESTIONS, questions_for_tenant
from app.modules.school import (
    class_moodle_filter_labels,
    create_class,
    list_classes_with_roster,
    list_lti_context_bindings,
    list_school_students,
    list_teachers,
    school_snapshot,
    set_class_course,
    upsert_lti_context_binding,
)
from app.modules.tenancy.names import greeting_first_name
from app.quiz_routes import (
    SESSION_KEY,
    load_quiz_context,
    require_quiz_session,
    store_quiz_context,
)
from app.settings import get_settings

router = APIRouter(tags=["shell"])

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


def _persist_session(request: Request, session: dict[str, Any]) -> str:
    """Write quiz session to Starlette + token cache."""
    tok = _ensure_token(session)
    payload = {**session, "quiz_token": tok}
    request.session[SESSION_KEY] = payload
    try:
        from app.launch_cache import LAUNCH_CACHE
        from app.quiz_routes import QUIZ_CTX_PREFIX

        LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{tok}", payload, exp=3600)
        db.save_quiz_context(tok, payload, ttl_sec=3600)
    except Exception:  # noqa: BLE001
        pass
    return tok


def _bound_course(session: dict[str, Any]) -> dict[str, Any] | None:
    """Curriculum for this launch: class-bound course, else primary."""
    return content.get_bound_course(
        session["tenant_id"], session.get("edvidura_course_id") or None
    )


def _default_class_id(session: dict[str, Any], class_id: str | None) -> str | None:
    """Prefer explicit filter; else LTI-bound class from launch."""
    if class_id and str(class_id).strip():
        return str(class_id).strip()
    bound = str(session.get("class_id") or "").strip()
    return bound or None


def _browser_lms_url(url: str | None, *, base: str | None = None) -> str:
    """Normalize LMS return URL for the browser (Docker host → localhost)."""
    raw = str(url or "").strip()
    lms_base = (
        str(base or "").strip().rstrip("/")
        or os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
        or "http://localhost:8085"
    )
    if not raw:
        return f"{lms_base}/my/" if ":8085" in lms_base else f"{lms_base}/"
    if raw.startswith("/"):
        raw = f"{lms_base}{raw}"
    raw = raw.replace("://host.docker.internal", "://localhost")
    for docker_host in ("http://moodle", "https://moodle", "http://moodle-moodle-1"):
        if raw == docker_host or raw.startswith(docker_host + "/"):
            raw = "http://localhost:8085" + raw[len(docker_host) :]
            break
    return raw


def _browser_moodle_url(url: str | None, *, base: str | None = None) -> str:
    """Alias — prefer `_browser_lms_url` for new code."""
    return _browser_lms_url(url, base=base)


def resolve_lms_return(session: dict[str, Any]) -> str:
    base = (
        str(session.get("lms_base_url") or session.get("moodle_base_url") or "").strip()
        or None
    )
    target = (
        session.get("lms_return_url")
        or session.get("moodle_return_url")
        or base
        or None
    )
    return _browser_lms_url(target, base=base)


def resolve_moodle_return(session: dict[str, Any]) -> str:
    """Alias for resolve_lms_return (older call sites)."""
    return resolve_lms_return(session)


def _display_first_name(session: dict[str, Any]) -> str:
    given = str(session.get("given_name") or "").strip()
    if given and not given.isdigit():
        return given
    family = str(session.get("family_name") or "").strip()
    if family and not family.isdigit():
        return family
    return greeting_first_name(
        session.get("learner_name"),
        subject=str(session.get("subject") or ""),
    )


def _build_review(answers: Any, questions: Any = None) -> list[dict[str, Any]]:
    if not isinstance(answers, dict):
        return []
    detail = answers.get("detail")
    if not isinstance(detail, dict):
        return []
    bank = list(questions) if questions is not None else list(QUESTIONS)
    by_id = {q.id: q for q in bank}
    review: list[dict[str, Any]] = []
    for qid, info in detail.items():
        if not isinstance(info, dict):
            continue
        q = by_id.get(str(qid))
        correct = bool(info.get("correct"))
        correct_choice = ""
        if q and 0 <= q.correct_index < len(q.choices):
            correct_choice = q.choices[q.correct_index]
        review.append(
            {
                "question_id": str(qid),
                "prompt": info.get("prompt") or (q.prompt if q else str(qid)),
                "correct": correct,
                "correct_choice": correct_choice if not correct else "",
            }
        )
    return review


def _fmt_attempts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for r in rows:
        item = dict(r)
        item["id"] = str(r["id"])
        item["created_at"] = r["created_at"].isoformat() if r.get("created_at") else ""
        out.append(item)
    return out


def _avatar_initials(name: str) -> str:
    parts = [p for p in str(name or "").split() if p]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    if parts:
        return parts[0][:2].upper()
    return "EV"


def _shell_progress(session: dict[str, Any], token: str) -> dict[str, Any]:
    """Sidebar + Home continue path from bound (or primary) course progress."""
    course = _bound_course(session)
    progress = None
    up_next_title = "Lessons"
    up_next_href = f"/lessons?token={token}"
    up_next_meta = "Open your course path"
    path_lessons = "now"
    path_quiz = ""
    path_results = ""
    gap_path = None
    adaptive_next = None
    if course:
        progress = content.course_progress(
            session["tenant_id"],
            course_id=course["id"],
            subject=str(session.get("subject") or ""),
        )
        try:
            from app.modules import adaptive as adaptive_mod

            progress = adaptive_mod.apply_dynamic_lesson_order(
                session["tenant_id"],
                subject=str(session.get("subject") or ""),
                progress=progress,
            )
        except Exception:  # noqa: BLE001
            progress.setdefault("order_mode", "linear")
        nxt = progress.get("next_lesson")
        if progress.get("completed_count"):
            path_lessons = "done" if progress.get("all_lessons_done") else "now"
        if progress.get("all_lessons_done") or (
            nxt and nxt.get("lesson_type") == "quiz"
        ):
            path_lessons = "done"
            path_quiz = "now"
            up_next_title = nxt.get("title") if nxt else "Quiz"
            up_next_href = f"/quiz?token={token}"
            up_next_meta = "Ready when you are"
        elif nxt:
            path_lessons = "now"
            up_next_title = str(nxt.get("title") or "Next lesson")
            up_next_href = f"/lessons/{nxt['id']}?token={token}"
            if progress.get("order_mode") == "adaptive":
                reason = (progress.get("order_reasons") or {}).get(str(nxt.get("id")))
                up_next_meta = (
                    f"Priority for gap: {reason}" if reason else "Adaptive lesson order"
                )
            else:
                up_next_meta = "Continue where you left off"
        if session.get("last_result_id"):
            path_results = "done" if path_quiz == "now" else "now"
            if progress.get("all_lessons_done"):
                path_quiz = "done"
                path_results = "now"
        # C9/C10: gap path and adaptive lesson nudge override linear continue
        try:
            from app.modules import adaptive as adaptive_mod

            first_lesson_id = None
            first_manual_id = None
            manual_version = None
            for L in progress.get("lessons") or []:
                if L.get("lesson_type") != "quiz":
                    first_lesson_id = str(L["id"])
                    break
            try:
                from app.modules import manuals as manuals_mod

                mans = manuals_mod.list_manuals(session["tenant_id"])
                if mans:
                    first_manual_id = str(mans[0]["id"])
                    pub = manuals_mod.latest_published_version(
                        session["tenant_id"], mans[0]["id"]
                    )
                    if pub:
                        manual_version = int(pub["version"])
            except Exception:  # noqa: BLE001
                pass
            gap_path = adaptive_mod.resolve_learner_plan(
                session["tenant_id"],
                subject=str(session.get("subject") or ""),
                quiz_token=token,
                first_lesson_id=first_lesson_id,
                first_manual_id=first_manual_id,
                manual_version=manual_version,
                persist_if_missing=False,
                role_code=str(session.get("target_role") or "") or None,
            )
            latest = adaptive_mod.latest_graded_attempt_for_subject(
                session["tenant_id"], str(session.get("subject") or "")
            )
            adaptive_next = adaptive_mod.recommend_next_lesson(
                session["tenant_id"],
                course_id=course["id"],
                attempt=latest,
                linear_next=nxt,
            )
            if gap_path and gap_path.get("active") and gap_path.get("first_href"):
                done = int(gap_path.get("done_count") or 0)
                total = int(gap_path.get("step_count") or len(gap_path.get("steps") or []))
                up_next_title = "My learning plan"
                up_next_href = gap_path["first_href"]
                up_next_meta = (
                    f"Step {done + 1} of {total}" if total else "Continue your plan"
                )
            elif (
                adaptive_next
                and adaptive_next.get("mode") == "adaptive"
                and adaptive_next.get("lesson_id")
            ):
                up_next_title = str(adaptive_next.get("title") or "Gap lesson")
                up_next_href = (
                    f"/lessons/{adaptive_next['lesson_id']}?token={token}"
                )
                up_next_meta = str(
                    adaptive_next.get("reason") or "Adaptive recommendation"
                )
        except Exception:  # noqa: BLE001
            gap_path = None
            adaptive_next = None
    return {
        "shell_course": course,
        "shell_progress": progress,
        "up_next_title": up_next_title,
        "up_next_href": up_next_href,
        "up_next_meta": up_next_meta,
        "path_lessons": path_lessons,
        "path_quiz": path_quiz,
        "path_results": path_results,
        "gap_path": gap_path,
        "adaptive_next": adaptive_next,
    }


def _shell_ctx(
    session: dict[str, Any],
    *,
    active_page: str,
    page_title: str,
    page_subtitle: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    token = _ensure_token(session)
    lms_return = resolve_lms_return(session)
    lms_name = str(session.get("lms_name") or "").strip() or "LMS"
    learner = str(session.get("learner_name") or "").strip()
    subject = str(session.get("subject") or "")
    if not learner or learner.isdigit() or learner == subject:
        given = str(session.get("given_name") or "").strip()
        family = str(session.get("family_name") or "").strip()
        if given or family:
            learner = f"{given} {family}".strip()
        else:
            learner = "Learner"
    first = _display_first_name(session) or greeting_first_name(learner, subject=subject)
    if session.get("is_school_admin"):
        user_role = "School admin"
    elif session.get("is_instructor"):
        user_role = "Teacher"
    else:
        user_role = "Student"
    snap = None
    if session.get("is_school_admin") or session.get("is_instructor"):
        try:
            snap = school_snapshot(session["tenant_id"])
        except Exception:
            snap = None
    from app.modules.specials import launch_fingerprint, tenant_theme

    theme_seed = f"{session.get('tenant_slug') or ''}|{session.get('course') or ''}"
    ctx = {
        "tenant_name": session.get("tenant_name") or session.get("tenant_slug") or "Institution",
        "tenant_slug": session.get("tenant_slug") or "",
        "course": session.get("course") or "—",
        "learner_name": learner,
        "first_name": first,
        "avatar_initials": _avatar_initials(learner),
        "user_role": user_role,
        "is_instructor": bool(session.get("is_instructor")),
        "is_school_admin": bool(session.get("is_school_admin")),
        "quiz_token": token,
        "active_page": active_page,
        "page_title": page_title,
        "page_subtitle": page_subtitle or "",
        "last_result_id": session.get("last_result_id"),
        "ags_available": bool(session.get("ags_available")),
        "lms_name": lms_name,
        "lms_return_url": lms_return,
        "lms_return_href": f"/return-to-lms?token={token}",
        "moodle_return_url": lms_return,
        "moodle_return_href": f"/return-to-lms?token={token}",
        "max_score": MAX_SCORE,
        "school_snap": snap,
        "fingerprint": launch_fingerprint(session),
        "theme": tenant_theme(theme_seed),
        "show_contract": active_page == "launch_hub",
        **_shell_progress(session, token),
    }
    if extra:
        ctx.update(extra)
    return ctx


def _shell(
    request: Request,
    template: str,
    session: dict[str, Any],
    *,
    active_page: str,
    page_title: str,
    page_subtitle: str | None = None,
    extra: dict[str, Any] | None = None,
) -> HTMLResponse:
    ctx = _shell_ctx(
        session,
        active_page=active_page,
        page_title=page_title,
        page_subtitle=page_subtitle,
        extra=extra,
    )
    return _TEMPLATES.TemplateResponse(request, template, ctx)


def require_session(
    request: Request, *, token: str | None = None
) -> dict[str, Any] | HTMLResponse:
    return require_quiz_session(request, token=token)


def require_school_admin(
    request: Request, *, token: str | None = None
) -> dict[str, Any] | HTMLResponse:
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    if not (session.get("is_school_admin") or session.get("is_instructor")):
        return _shell(
            request,
            "access.html",
            session,
            active_page="",
            page_title="School admins only",
            extra={
                "heading": "School admins only",
                "message": (
                    "This screen is for the school admin of this workspace. "
                    "Launch as riverside_admin / lakeside_admin, or as an instructor."
                ),
            },
        )
    return session


def require_instructor(
    request: Request, *, token: str | None = None
) -> dict[str, Any] | HTMLResponse:
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    if not session.get("is_instructor"):
        return _shell(
            request,
            "access.html",
            session,
            active_page="",
            page_title="Instructors only",
            extra={
                "heading": "Instructors only",
                "message": "This screen opens when the Moodle launch includes an Instructor role.",
            },
        )
    return session


@router.get("/return-to-lms", response_class=HTMLResponse)
@router.get("/return-to-moodle", response_class=HTMLResponse)
async def return_to_lms(request: Request, token: str | None = None):
    from app.quiz_routes import resolve_quiz_session

    session = resolve_quiz_session(request, token=token) or {}
    lms_name = str(session.get("lms_name") or "LMS").strip() or "LMS"
    target = resolve_lms_return(session) if session else _browser_lms_url(None)
    safe = (
        target.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("<", "")
        .replace('"', "")
    )
    html = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta http-equiv="refresh" content="0;url={safe}"/>
<title>Returning to {lms_name}…</title>
<script>
(function () {{
  var u = '{safe}';
  try {{
    if (window.top && window.top !== window.self) {{
      window.top.location.href = u;
      return;
    }}
  }} catch (e) {{}}
  window.location.href = u;
}})();
</script>
</head>
<body style="font-family:Outfit,system-ui;padding:2rem;background:#0b1220;color:#fff">
  <p>Returning to {lms_name}…</p>
  <p><a href="{safe}" target="_top" style="color:#fca311">Continue to {lms_name}</a></p>
</body></html>"""
    return HTMLResponse(html)


@router.get("/teacher/time-capsule.json")
async def teacher_time_capsule(request: Request, token: str | None = None):
    """School time capsule — anonymized term export (#7)."""
    from fastapi.responses import JSONResponse

    from app.modules.specials import build_time_capsule

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    summary = db.quiz_attempt_class_summary(session["tenant_id"], limit=2000)
    progress_roster = []
    manuals_meta = []
    try:
        course_row = _bound_course(session)
        if course_row:
            progress_roster = content.lesson_completion_roster(
                session["tenant_id"], course_id=course_row["id"]
            )
            # anonymize subjects
            progress_roster = [
                {
                    "learner_code": f"L{i:03d}",
                    "completed": p.get("completed_count"),
                    "total": p.get("total_count"),
                    "percent": p.get("percent"),
                }
                for i, p in enumerate(progress_roster, start=1)
            ]
        from app.modules import manuals as manuals_mod

        manuals_meta = [
            {"title": m.get("title"), "id": str(m.get("id"))}
            for m in manuals_mod.list_manuals(session["tenant_id"])
        ]
    except Exception:  # noqa: BLE001
        pass
    capsule = build_time_capsule(
        session["tenant_id"],
        tenant_name=str(session.get("tenant_name") or session.get("tenant_slug") or ""),
        attempts=summary.get("attempts") or [],
        progress_roster=progress_roster,
        manuals_meta=manuals_meta,
    )
    return JSONResponse(capsule)


@router.post("/incident")
async def report_incident(
    request: Request,
    token: str | None = Form(None),
    note: str = Form(""),
):
    """Incident button — capture launch context (#11)."""
    from fastapi.responses import JSONResponse

    from app.modules.specials import launch_fingerprint, record_incident

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    fp = launch_fingerprint(session)
    try:
        row = record_incident(
            tenant_id=session["tenant_id"],
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            note=note,
            payload={
                "fingerprint": fp,
                "ags_available": bool(session.get("ags_available")),
                "ags_scopes": session.get("ags_scopes"),
                "launch_id": session.get("launch_id"),
                "client_id": session.get("client_id"),
                "course": session.get("course"),
                "last_result_id": session.get("last_result_id"),
                "active_path": str(request.headers.get("referer") or ""),
            },
        )
        return JSONResponse(
            {
                "ok": True,
                "incident_id": str(row["id"]),
                "created_at": row["created_at"].isoformat()
                if hasattr(row.get("created_at"), "isoformat")
                else str(row.get("created_at")),
            }
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


@router.get("/launch-hub", response_class=HTMLResponse)
async def launch_hub(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    request.session[SESSION_KEY] = {**session, "quiz_token": _ensure_token(session)}
    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    mine = [r for r in rows if str(r.get("subject")) == str(session.get("subject"))]
    last = mine[0] if mine else None
    if last and not session.get("last_result_id"):
        session["last_result_id"] = str(last["id"])
        request.session[SESSION_KEY] = session

    course = _bound_course(session)
    progress = None
    continue_href = f"/lessons?token={_ensure_token(session)}"
    continue_label = "Start lessons"
    chapter_items: list[dict[str, Any]] = []
    gap_path = None
    adaptive_next = None
    token_s = _ensure_token(session)
    if course:
        progress = content.course_progress(
            session["tenant_id"],
            course_id=course["id"],
            subject=str(session.get("subject") or ""),
        )
        nxt = progress.get("next_lesson")
        next_id = str(nxt["id"]) if nxt else ""
        done_ids = progress.get("completed_ids") or set()
        for L in progress.get("lessons") or []:
            lid = str(L["id"])
            is_done = L.get("lesson_type") != "quiz" and lid in done_ids
            is_next = lid == next_id
            chapter_items.append(
                {
                    "id": lid,
                    "title": L.get("title"),
                    "lesson_type": L.get("lesson_type"),
                    "done": is_done,
                    "now": is_next and not is_done,
                    "open": not is_done and not is_next,
                }
            )
        if nxt and nxt.get("lesson_type") == "quiz":
            continue_href = f"/quiz?token={token_s}"
            continue_label = "Start quiz"
        elif nxt:
            continue_href = f"/lessons/{nxt['id']}?token={token_s}"
            continue_label = (
                "Continue learning"
                if progress.get("completed_count")
                else "Start lessons"
            )
        elif progress.get("all_lessons_done"):
            continue_href = f"/quiz?token={token_s}"
            continue_label = "Start quiz"

        shell_bits = _shell_progress(session, token_s)
        gap_path = shell_bits.get("gap_path")
        adaptive_next = shell_bits.get("adaptive_next")
        if gap_path and gap_path.get("active") and gap_path.get("first_href"):
            continue_href = gap_path["first_href"]
            continue_label = "Continue my plan"
        elif (
            adaptive_next
            and adaptive_next.get("mode") == "adaptive"
            and adaptive_next.get("lesson_id")
        ):
            continue_href = f"/lessons/{adaptive_next['lesson_id']}?token={token_s}"
            continue_label = "Recommended gap lesson"
            # Mark adaptive lesson as "now" in chapter list
            aid = str(adaptive_next["lesson_id"])
            for item in chapter_items:
                if item["id"] == aid:
                    item["now"] = True
                    item["adaptive"] = True
                elif item.get("now") and item["id"] != aid:
                    item["now"] = False

    page_sub = str(session.get("class_name") or session.get("course") or "")
    if session.get("academic_subject") and session.get("class_name"):
        page_sub = f"{session['class_name']} · {session['academic_subject']}"

    return _shell(
        request,
        "launch_hub.html",
        session,
        active_page="launch_hub",
        page_title="Home",
        page_subtitle=page_sub,
        extra={
            "my_attempt_count": len(mine),
            "last_score": last.get("score") if last else None,
            "last_max": last.get("max_score") if last else MAX_SCORE,
            "course_row": course,
            "progress": progress,
            "chapter_items": chapter_items,
            "continue_href": continue_href,
            "continue_label": continue_label,
            "bound_class_name": session.get("class_name") or "",
            "bound_subject": session.get("academic_subject") or "",
            "gap_path": gap_path,
            "adaptive_next": adaptive_next,
        },
    )


@router.get("/lessons", response_class=HTMLResponse)
async def lessons_list(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    course = _bound_course(session)
    if not course:
        return _shell(
            request,
            "access.html",
            session,
            active_page="lessons",
            page_title="No lessons",
            extra={
                "heading": "No course content yet",
                "message": "This institution has no published lessons. Content is tenant-private.",
            },
        )
    progress = content.course_progress(
        session["tenant_id"],
        course_id=course["id"],
        subject=str(session.get("subject") or ""),
    )
    try:
        from app.modules import adaptive as adaptive_mod

        progress = adaptive_mod.apply_dynamic_lesson_order(
            session["tenant_id"],
            subject=str(session.get("subject") or ""),
            progress=progress,
        )
    except Exception:  # noqa: BLE001
        progress.setdefault("order_mode", "linear")
    token_s = _ensure_token(session)
    priority_ids = set(progress.get("priority_ids") or [])
    reasons = progress.get("order_reasons") or {}
    items = []
    for L in progress["lessons"]:
        lid = str(L["id"])
        items.append(
            {
                "id": lid,
                "title": L["title"],
                "position": L["position"],
                "lesson_type": L["lesson_type"],
                "completed": lid in progress["completed_ids"],
                "priority": lid in priority_ids,
                "priority_reason": reasons.get(lid) or "",
                "href": (
                    f"/quiz?token={token_s}"
                    if L["lesson_type"] == "quiz"
                    else f"/lessons/{lid}?token={token_s}"
                ),
            }
        )
    return _shell(
        request,
        "lessons.html",
        session,
        active_page="lessons",
        page_title="Lessons",
        page_subtitle=str(course.get("title") or ""),
        extra={
            "course_row": course,
            "lesson_items": items,
            "progress": progress,
            "order_mode": progress.get("order_mode") or "linear",
        },
    )


@router.get("/lessons/{lesson_id}", response_class=HTMLResponse)
async def lesson_player(
    request: Request,
    lesson_id: UUID,
    token: str | None = None,
    loop: str | None = None,
    from_attempt: str | None = None,
):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    lesson = content.get_lesson(
        session["tenant_id"],
        lesson_id,
        allow_unpublished=bool(session.get("is_instructor")),
    )
    if not lesson:
        return _shell(
            request,
            "access.html",
            session,
            active_page="lessons",
            page_title="Not found",
            extra={
                "heading": "Lesson not found",
                "message": "It may belong to another institution or does not exist.",
            },
        )
    if lesson["lesson_type"] == "quiz":
        return RedirectResponse(
            url=f"/quiz?token={_ensure_token(session)}", status_code=303
        )

    lessons = content.list_lessons(session["tenant_id"], lesson["course_id"])
    try:
        from app.modules import adaptive as adaptive_mod

        ordered = adaptive_mod.apply_dynamic_lesson_order(
            session["tenant_id"],
            subject=str(session.get("subject") or ""),
            progress={
                "lessons": lessons,
                "completed_ids": content.completed_lesson_ids(
                    session["tenant_id"],
                    course_id=lesson["course_id"],
                    subject=str(session.get("subject") or ""),
                ),
            },
        )
        lessons = ordered.get("lessons") or lessons
    except Exception:  # noqa: BLE001
        pass
    prev_l, next_l = content.neighbor_lessons(lessons, lesson_id)
    done = content.completed_lesson_ids(
        session["tenant_id"],
        course_id=lesson["course_id"],
        subject=str(session.get("subject") or ""),
    )
    token_s = _ensure_token(session)
    next_href = None
    if next_l:
        next_href = (
            f"/quiz?token={token_s}"
            if next_l["lesson_type"] == "quiz"
            else f"/lessons/{next_l['id']}?token={token_s}"
        )
    prev_href = (
        f"/lessons/{prev_l['id']}?token={token_s}" if prev_l else None
    )
    in_loop = loop == "1" and bool(from_attempt)
    loop_practice_href = (
        f"/quiz?token={token_s}&practice=1&retry={from_attempt}&loop=1"
        if in_loop
        else ""
    )
    loop_graded_href = (
        f"/quiz?token={token_s}&retry={from_attempt}&loop=1" if in_loop else ""
    )
    if in_loop:
        try:
            from app.modules import adaptive as adaptive_mod

            adaptive_mod.mark_plan_step_done(
                session["tenant_id"],
                str(session.get("subject") or ""),
                path_contains=f"/lessons/{lesson_id}",
            )
        except Exception:  # noqa: BLE001
            pass
    return _shell(
        request,
        "lesson.html",
        session,
        active_page="lessons",
        page_title=str(lesson["title"]),
        page_subtitle=f"Lesson {lesson['position']}",
        extra={
            "lesson": lesson,
            "lesson_id": str(lesson["id"]),
            "body_html": content.body_md_to_html(str(lesson.get("body_md") or "")),
            "video_url": str(lesson.get("video_url") or ""),
            "is_completed": str(lesson["id"]) in done,
            "prev_href": prev_href,
            "next_href": next_href,
            "next_is_quiz": bool(next_l and next_l.get("lesson_type") == "quiz"),
            "remediation_loop": in_loop,
            "loop_practice_href": loop_practice_href,
            "loop_graded_href": loop_graded_href,
        },
    )


@router.post("/lessons/{lesson_id}/complete", response_class=HTMLResponse)
async def lesson_complete(
    request: Request, lesson_id: UUID, token: str | None = None
):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or "")
    qtok = tok or _ensure_token(session)
    lesson = content.get_lesson(session["tenant_id"], lesson_id)
    if not lesson:
        return RedirectResponse(
            url=f"/lessons?token={qtok}", status_code=303
        )
    subject = str(session.get("subject") or "").strip()
    if lesson["lesson_type"] != "quiz":
        if not subject:
            return RedirectResponse(
                url=f"/lessons/{lesson_id}?token={qtok}&err=Missing+learner+id",
                status_code=303,
            )
        try:
            content.mark_lesson_complete(
                tenant_id=session["tenant_id"],
                course_id=lesson["course_id"],
                lesson_id=lesson["id"],
                subject=subject,
            )
        except ValueError:
            return RedirectResponse(
                url=f"/lessons/{lesson_id}?token={qtok}&err=Could+not+save+progress",
                status_code=303,
            )
        try:
            from app.modules.xapi import record_lesson_completed

            record_lesson_completed(
                tenant_id=session["tenant_id"],
                subject=subject,
                learner_name=str(session.get("learner_name") or ""),
                lesson_id=lesson["id"],
                lesson_title=str(lesson.get("title") or ""),
            )
        except Exception as xapi_exc:  # noqa: BLE001
            print(f"xAPI lesson record failed: {xapi_exc}", flush=True)
    lessons = content.list_lessons(session["tenant_id"], lesson["course_id"])
    try:
        from app.modules import adaptive as adaptive_mod

        ordered = adaptive_mod.apply_dynamic_lesson_order(
            session["tenant_id"],
            subject=subject,
            progress={
                "lessons": lessons,
                "completed_ids": content.completed_lesson_ids(
                    session["tenant_id"],
                    course_id=lesson["course_id"],
                    subject=subject,
                ),
            },
        )
        lessons = ordered.get("lessons") or lessons
    except Exception:  # noqa: BLE001
        pass
    _, next_l = content.neighbor_lessons(lessons, lesson_id)
    if next_l and next_l.get("lesson_type") == "quiz":
        return RedirectResponse(url=f"/quiz?token={qtok}", status_code=303)
    if next_l:
        return RedirectResponse(
            url=f"/lessons/{next_l['id']}?token={qtok}", status_code=303
        )
    return RedirectResponse(url=f"/lessons?token={qtok}", status_code=303)


@router.post("/lessons/{lesson_id}/uncomplete", response_class=HTMLResponse)
async def lesson_uncomplete(
    request: Request, lesson_id: UUID, token: str | None = None
):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or "")
    qtok = tok or _ensure_token(session)
    subject = str(session.get("subject") or "").strip()
    if not subject:
        return RedirectResponse(
            url=f"/lessons/{lesson_id}?token={qtok}&err=Missing+learner+id",
            status_code=303,
        )
    try:
        content.unmark_lesson_complete(
            tenant_id=session["tenant_id"],
            lesson_id=lesson_id,
            subject=subject,
        )
    except ValueError:
        pass
    return RedirectResponse(url=f"/lessons/{lesson_id}?token={qtok}", status_code=303)


@router.get("/active-quizzes", response_class=HTMLResponse)
async def active_quizzes(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    if not session.get("is_instructor"):
        rows = [r for r in rows if str(r.get("subject")) == str(session.get("subject"))]
    questions = questions_for_tenant(
        session.get("tenant_id"),
        course_id=session.get("edvidura_course_id") or None,
    )
    return _shell(
        request,
        "active_quizzes.html",
        session,
        active_page="active_quizzes",
        page_title="My attempts",
        page_subtitle="Course readiness check",
        extra={
            "recent_attempts": _fmt_attempts(rows[:25]),
            "questions_count": len(questions),
            "max_score": len(questions),
        },
    )


@router.get("/quiz", response_class=HTMLResponse)
async def quiz_form(
    request: Request,
    token: str | None = None,
    retry: str | None = None,
    practice: str | None = None,
    force: str | None = None,
    loop: str | None = None,
):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    from app.modules.specials import (
        failed_question_ids,
        ghost_coach_gate,
    )

    token_s = _ensure_token(session)
    progress = _shell_progress(session, token_s).get("shell_progress")
    coach = ghost_coach_gate(
        progress,
        bypass=bool(session.get("is_instructor") or force == "1" or practice == "1"),
    )
    if coach.get("gate") and force != "1" and practice != "1":
        return _shell(
            request,
            "quiz_gate.html",
            session,
            active_page="quiz_session",
            page_title="Almost ready",
            page_subtitle="Ghost coach",
            extra={"coach": coach, "practice": practice == "1"},
        )

    questions = list(
        questions_for_tenant(
            session.get("tenant_id"),
            course_id=session.get("edvidura_course_id") or None,
        )
    )
    retry_ids: list[str] = []
    if retry:
        try:
            prev = db.get_quiz_attempt(session["tenant_id"], UUID(str(retry)))
        except Exception:  # noqa: BLE001
            prev = None
        if prev and str(prev.get("subject")) == str(session.get("subject")):
            retry_ids = failed_question_ids(prev.get("answers"))
            if retry_ids:
                questions = [q for q in questions if q.id in retry_ids]
    is_practice = practice == "1"
    in_loop = loop == "1"
    return _shell(
        request,
        "quiz_session.html",
        session,
        active_page="quiz_session",
        page_title=(
            "Practice (remediation)"
            if is_practice and in_loop
            else ("Practice quiz" if is_practice else "Take the quiz")
        ),
        page_subtitle=(
            "Sandbox — no Moodle grade sync · then graded retry"
            if is_practice
            else (
                f"Graded retry · {len(questions)} missed item(s)"
                if retry_ids and in_loop
                else (
                    f"Retry {len(questions)} missed item(s)"
                    if retry_ids
                    else "Answer each question, then submit"
                )
            )
        ),
        extra={
            "questions": questions,
            "max_score": len(questions),
            "practice_mode": is_practice,
            "retry_from": retry or "",
            "remediation_loop": in_loop,
            "coach_warn": coach.get("warn"),
        },
    )


@router.get("/quiz/result/{attempt_id}", response_class=HTMLResponse)
async def quiz_result(request: Request, attempt_id: UUID, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session

    attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)
    if not attempt:
        return _shell(
            request,
            "access.html",
            session,
            active_page="quiz_result",
            page_title="Not found",
            extra={
                "heading": "Attempt not found",
                "message": "It may belong to another tenant or does not exist.",
            },
        )

    is_owner = str(attempt.get("subject")) == str(session.get("subject"))
    if not (is_owner or session.get("is_instructor")):
        return _shell(
            request,
            "access.html",
            session,
            active_page="quiz_result",
            page_title="Access denied",
            extra={
                "heading": "Access denied",
                "message": "You are not authorized to view this result.",
            },
        )

    from app.modules.specials import (
        competency_profile,
        enrichment_for_review,
        grade_receipt,
        lookup_xapi_for_attempt,
        skill_stickers,
    )
    from app.modules.receipts import sealed_grade_receipt

    session["last_result_id"] = str(attempt["id"])
    request.session[SESSION_KEY] = session
    token_s = _ensure_token(session)
    questions = questions_for_tenant(
        session.get("tenant_id"),
        course_id=session.get("edvidura_course_id") or None,
    )
    review = _build_review(attempt.get("answers"), questions)
    first_lesson_id = None
    first_manual_id = None
    manual_version = None
    try:
        course = _bound_course(session)
        if course:
            lessons = content.list_lessons(session["tenant_id"], course["id"])
            for L in lessons:
                if L.get("lesson_type") != "quiz":
                    first_lesson_id = str(L["id"])
                    break
        from app.modules import manuals as manuals_mod

        mans = manuals_mod.list_manuals(session["tenant_id"])
        if mans:
            first_manual_id = str(mans[0]["id"])
            pub = manuals_mod.latest_published_version(
                session["tenant_id"], mans[0]["id"]
            )
            if pub:
                manual_version = int(pub["version"])
    except Exception:  # noqa: BLE001
        pass
    review = enrichment_for_review(
        review,
        quiz_token=token_s,
        first_lesson_id=first_lesson_id,
        first_manual_id=first_manual_id,
        manual_version=manual_version,
        tenant_id=session.get("tenant_id"),
        attempt_id=str(attempt["id"]),
    )
    try:
        receipt = sealed_grade_receipt(
            tenant_id=session["tenant_id"],
            attempt=attempt,
            ags_available=bool(session.get("ags_available")),
        )
    except Exception:  # noqa: BLE001
        xapi_id = lookup_xapi_for_attempt(session["tenant_id"], attempt_id)
        receipt = grade_receipt(
            attempt=attempt,
            xapi_statement_id=xapi_id,
            ags_available=bool(session.get("ags_available")),
        )
    progress = _shell_progress(session, token_s).get("shell_progress")
    stickers = skill_stickers(
        score=int(attempt["score"]),
        max_score=int(attempt["max_score"]),
        progress=progress,
        grade_sent=bool(attempt.get("grade_sent")),
    )
    competencies = competency_profile(
        attempt.get("answers"), tenant_id=session.get("tenant_id")
    )
    failed = [r for r in review if not r.get("correct")]
    answers = attempt.get("answers") if isinstance(attempt.get("answers"), dict) else {}
    is_practice = answers.get("mode") == "practice"
    loop_from = str(answers.get("retry_from") or "") or str(attempt["id"])
    primary_review = next(
        (r for r in failed if r.get("manual_href") or r.get("teleport_href")),
        failed[0] if failed else None,
    )
    gap_path = None
    try:
        from app.modules import adaptive as adaptive_mod

        role_code = str(session.get("target_role") or "").strip() or None
        if role_code:
            gap_path = adaptive_mod.build_difference_path(
                session["tenant_id"],
                role_code=role_code,
                attempt=attempt,
                quiz_token=token_s,
                first_lesson_id=first_lesson_id,
                first_manual_id=first_manual_id,
                manual_version=manual_version,
            )
        else:
            gap_path = adaptive_mod.build_gap_path(
                session["tenant_id"],
                attempt=attempt,
                quiz_token=token_s,
                first_lesson_id=first_lesson_id,
                first_manual_id=first_manual_id,
                manual_version=manual_version,
            )
        saved = adaptive_mod.sync_plan_after_attempt(
            session["tenant_id"],
            subject=str(session.get("subject") or attempt.get("subject") or ""),
            attempt=attempt,
            gap_path=gap_path,
            is_practice=is_practice,
        )
        if saved and saved.get("steps"):
            # Prefer persisted progress view (tokens re-applied)
            opened = adaptive_mod.get_open_plan(
                session["tenant_id"],
                str(session.get("subject") or attempt.get("subject") or ""),
                quiz_token=token_s,
            )
            if opened:
                gap_path = opened
            elif not is_practice and gap_path:
                gap_path = {**gap_path, "persisted": True}
    except Exception:  # noqa: BLE001
        gap_path = None
    skill_xapi_count = 0
    try:
        from app.modules.specials import count_skill_xapi_for_attempt

        skill_xapi_count = count_skill_xapi_for_attempt(
            session["tenant_id"], attempt_id
        )
    except Exception:  # noqa: BLE001
        skill_xapi_count = 0
    return _shell(
        request,
        "quiz_result.html",
        session,
        active_page="quiz_result",
        page_title="Your result",
        page_subtitle="Evidence receipt",
        extra={
            "score": attempt["score"],
            "max_score": attempt["max_score"],
            "grade_sent": attempt["grade_sent"],
            "grade_error": attempt.get("grade_error"),
            "skill_xapi_count": skill_xapi_count,
            "attempt_id": str(attempt["id"]),
            "learner_name": attempt.get("learner_name") or attempt.get("subject"),
            "review": review,
            "receipt": receipt,
            "stickers": stickers,
            "competencies": competencies,
            "is_practice": is_practice,
            "has_misses": bool(failed),
            "gap_path": gap_path,
            "loop_review_href": (
                (gap_path or {}).get("first_href")
                or (primary_review or {}).get("manual_href")
                or (primary_review or {}).get("teleport_href")
                or ""
            ),
            "loop_review_label": (
                (primary_review or {}).get("manual_label")
                or (primary_review or {}).get("teleport_label")
                or "Review material"
            ),
            "retry_href": (
                f"/quiz?token={token_s}&retry={loop_from}&loop=1"
                if failed
                else f"/quiz?token={token_s}"
            ),
            "practice_href": (
                (gap_path or {}).get("practice_href")
                or (
                    f"/quiz?token={token_s}&practice=1&retry={loop_from}&loop=1"
                    if failed
                    else f"/quiz?token={token_s}&practice=1"
                )
            ),
            "graded_retry_href": (
                (gap_path or {}).get("graded_href")
                or (
                    f"/quiz?token={token_s}&retry={loop_from}&loop=1"
                    if failed
                    else f"/quiz?token={token_s}"
                )
            ),
        },
    )


@router.get("/teacher/attempts", response_class=HTMLResponse)
async def teacher_attempts(
    request: Request,
    token: str | None = None,
    class_id: str | None = None,
    course: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    ok: str | None = None,
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    class_id = _default_class_id(session, class_id)
    classes = list_classes_with_roster(session["tenant_id"])
    subjects = None
    name_keys = None
    selected_class = None
    moodle_labels: list[str] | None = None
    if class_id:
        selected_class = next((c for c in classes if str(c["id"]) == str(class_id)), None)
        # People live in Moodle — filter attempts by Moodle context labels
        # bound to this class (not EdVidura-seeded roster name matching).
        moodle_labels = class_moodle_filter_labels(session["tenant_id"], class_id)
    summary = db.quiz_attempt_class_summary(
        session["tenant_id"],
        limit=500,
        course_label=(course or "").strip() or None,
        course_labels=moodle_labels if not (course or "").strip() else None,
        date_from=(date_from or "").strip() or None,
        date_to=(date_to or "").strip() or None,
        subjects=subjects,
        name_keys=name_keys,
    )
    # Distinct course labels from unfiltered set for dropdown
    all_labels = db.quiz_attempt_class_summary(session["tenant_id"], limit=500).get(
        "course_labels"
    ) or []
    learners = []
    for L in summary["learners"]:
        item = dict(L)
        item["best_at"] = (
            L["best_at"].isoformat()
            if getattr(L.get("best_at"), "isoformat", None)
            else str(L.get("best_at") or "")
        )
        learners.append(item)

    # NRPS roster awareness (Moodle people — display only)
    nrps_roster = None
    nrps_members: list[dict] = []
    ctx_id = str(session.get("lti_context_id") or "").strip()
    try:
        from app.modules import nrps as nrps_mod

        if ctx_id:
            nrps_roster = nrps_mod.get_roster(session["tenant_id"], ctx_id)
            if nrps_roster:
                nrps_members = list(nrps_roster.get("members") or [])
                names = nrps_mod.display_names_by_subject(
                    session["tenant_id"], ctx_id
                )
                for L in learners:
                    sub = str(L.get("subject") or "")
                    if sub in names and (
                        not L.get("learner_name")
                        or str(L.get("learner_name")) == sub
                    ):
                        L["learner_name"] = names[sub]
                        L["from_nrps"] = True
    except Exception:  # noqa: BLE001
        nrps_roster = None
        nrps_members = []

    # Prefer class-linked curriculum, else launch binding, else primary
    course_row = None
    if selected_class and selected_class.get("course_id"):
        course_row = content.get_course(
            session["tenant_id"], selected_class["course_id"]
        )
    if not course_row:
        course_row = _bound_course(session)
    progress_roster = []
    if course_row:
        progress_roster = content.lesson_completion_roster(
            session["tenant_id"], course_id=course_row["id"]
        )
        names_map = {
            str(L["subject"]): str(L["learner_name"])
            for L in learners
            if L.get("subject")
        }
        # Enrich progress names from NRPS when available
        try:
            from app.modules import nrps as nrps_mod

            if ctx_id:
                names_map.update(
                    nrps_mod.display_names_by_subject(session["tenant_id"], ctx_id)
                )
        except Exception:  # noqa: BLE001
            pass
        # Class filter: keep progress for learners who launched this Moodle course
        if class_id and learners:
            sub_set = {str(L.get("subject") or "").lower() for L in learners}
            # Also include NRPS learners who haven't launched yet (awareness)
            for m in nrps_members:
                sub_set.add(str(m.get("user_id") or "").lower())
            progress_roster = [
                p
                for p in progress_roster
                if str(p.get("subject") or "").lower() in sub_set
            ]
        for row in progress_roster:
            row["learner_name"] = names_map.get(row["subject"], row["subject"])
    q = []
    if class_id:
        q.append(f"class_id={class_id}")
    if course:
        q.append(f"course={course}")
    if date_from:
        q.append(f"date_from={date_from}")
    if date_to:
        q.append(f"date_to={date_to}")
    filter_qs = ("&" + "&".join(q)) if q else ""
    from app.modules.specials import (
        at_risk_learners,
        class_competency_map,
        quiet_class_radar,
    )

    radar = quiet_class_radar(summary.get("attempts") or [])
    competency_map = class_competency_map(
        summary.get("attempts") or [], tenant_id=session.get("tenant_id")
    )
    names_map = {
        str(L["subject"]): str(L["learner_name"])
        for L in learners
        if L.get("subject")
    }
    at_risk = at_risk_learners(
        attempts=summary.get("attempts") or [],
        progress_roster=progress_roster,
        display_names=names_map,
    )
    from app.modules.ai_assessment import suggest_teacher_next_steps

    ai_actions = suggest_teacher_next_steps(
        at_risk=at_risk,
        avg_percent=summary.get("avg_percent"),
        course_title=(course_row or {}).get("title") or "",
    )
    return _shell(
        request,
        "instructor_overview.html",
        session,
        active_page="instructor_overview",
        page_title="Class results",
        page_subtitle=str(session.get("tenant_name") or session.get("tenant_slug") or ""),
        extra={
            "attempts": _fmt_attempts(summary["attempts"]),
            "total_attempts": summary["total_attempts"],
            "radar": radar,
            "competency_map": competency_map,
            "at_risk": at_risk,
            "ai_actions": ai_actions,
            "learner_count": summary["learner_count"],
            "avg_percent": summary["avg_percent"],
            "pass_rate": summary["pass_rate"],
            "synced_count": summary["synced_count"],
            "learners": learners,
            "progress_roster": progress_roster,
            "course_title": (course_row or {}).get("title") or "Course",
            "classes": classes,
            "course_labels": all_labels,
            "filter_class_id": str(class_id or ""),
            "filter_course": course or "",
            "filter_date_from": date_from or "",
            "filter_date_to": date_to or "",
            "selected_class_name": (selected_class or {}).get("class_name") or "",
            "filter_qs": filter_qs,
            "nrps_available": bool(session.get("nrps_available")),
            "nrps_roster": nrps_roster,
            "nrps_members": nrps_members,
            "nrps_count": int((nrps_roster or {}).get("member_count") or len(nrps_members)),
            "nrps_fetched_at": (
                (nrps_roster or {}).get("fetched_at").isoformat()
                if hasattr((nrps_roster or {}).get("fetched_at"), "isoformat")
                else str((nrps_roster or {}).get("fetched_at") or "")
            ),
            "ok_message": ok or "",
        },
    )


@router.post("/teacher/roster/sync", response_class=HTMLResponse)
async def teacher_roster_sync(request: Request, token: str | None = None):
    """Pull Moodle course memberships via NRPS (awareness only — no accounts)."""
    from app.modules import nrps as nrps_mod
    from app.quiz_routes import restore_launch_from_id

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    launch_id = str(session.get("launch_id") or "").strip()
    if not launch_id:
        return RedirectResponse(
            url=f"/teacher/attempts?token={tok}&ok=Relaunch+from+Moodle+first",
            status_code=303,
        )
    try:
        message_launch = restore_launch_from_id(launch_id)
        result = nrps_mod.sync_roster_from_session(
            session, message_launch=message_launch
        )
        session["nrps_available"] = True
        request.session[SESSION_KEY] = session
        n = int(result.get("member_count") or 0)
        return RedirectResponse(
            url=f"/teacher/attempts?token={tok}&ok=Roster+synced+({n}+members)",
            status_code=303,
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/attempts?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).replace(" ", "+")[:120]
        return RedirectResponse(
            url=f"/teacher/attempts?token={tok}&ok=NRPS+failed:+{msg}",
            status_code=303,
        )


@router.get("/receipts/verify", response_class=HTMLResponse)
async def receipt_verify_get(
    request: Request, token: str | None = None, seal: str | None = None
):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    return _shell(
        request,
        "receipt_verify.html",
        session,
        active_page="receipt_verify",
        page_title="Verify receipt",
        page_subtitle="Sealed learning evidence",
        extra={"result": None, "payload_text": "", "seal_hint": seal or ""},
    )


@router.post("/receipts/verify", response_class=HTMLResponse)
async def receipt_verify_post(request: Request, token: str | None = None):
    import json

    from app.modules.receipts import verify_seal

    form = await request.form()
    tok = str(form.get("quiz_token") or form.get("token") or token or "")
    session = require_session(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return session
    raw = str(form.get("payload") or "").strip()
    result = None
    payload_obj = None
    err = ""
    try:
        payload_obj = json.loads(raw)
        result = verify_seal(payload_obj)
    except json.JSONDecodeError:
        err = "Paste a JSON sealed receipt"
    return _shell(
        request,
        "receipt_verify.html",
        session,
        active_page="receipt_verify",
        page_title="Verify receipt",
        page_subtitle="Sealed learning evidence",
        extra={
            "result": result,
            "payload_text": raw,
            "payload": payload_obj,
            "error": err,
        },
    )


@router.get("/quiz/result/{attempt_id}/receipt.json")
async def quiz_result_receipt_json(
    request: Request, attempt_id: UUID, token: str | None = None
):
    from app.modules.receipts import sealed_grade_receipt

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)
    if not attempt:
        return JSONResponse({"error": "not found"}, status_code=404)
    is_owner = str(attempt.get("subject")) == str(session.get("subject"))
    if not (is_owner or session.get("is_instructor")):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    sealed = sealed_grade_receipt(
        tenant_id=session["tenant_id"],
        attempt=attempt,
        ags_available=bool(session.get("ags_available")),
    )
    return JSONResponse(sealed)


@router.get("/teacher/attempts.csv")
async def teacher_attempts_csv(
    request: Request,
    token: str | None = None,
    class_id: str | None = None,
    course: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    import csv
    import io

    from fastapi.responses import StreamingResponse

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    class_id = _default_class_id(session, class_id)
    moodle_labels: list[str] | None = None
    if class_id:
        moodle_labels = class_moodle_filter_labels(session["tenant_id"], class_id)
    summary = db.quiz_attempt_class_summary(
        session["tenant_id"],
        limit=1000,
        course_label=(course or "").strip() or None,
        course_labels=moodle_labels if not (course or "").strip() else None,
        date_from=(date_from or "").strip() or None,
        date_to=(date_to or "").strip() or None,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "learner",
            "subject",
            "course",
            "score",
            "max_score",
            "percent",
            "grade_sent",
            "created_at",
            "attempt_id",
        ]
    )
    for a in summary["attempts"]:
        max_score = int(a.get("max_score") or 0) or 1
        score = int(a.get("score") or 0)
        created = a.get("created_at")
        created_s = created.isoformat() if getattr(created, "isoformat", None) else str(created or "")
        writer.writerow(
            [
                a.get("learner_name") or "",
                a.get("subject") or "",
                a.get("course_label") or "",
                score,
                max_score,
                int(round(100 * score / max_score)),
                "yes" if a.get("grade_sent") else "no",
                created_s,
                str(a.get("id") or ""),
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="class-results.csv"'
        },
    )


@router.get("/lti-integration", response_class=HTMLResponse)
async def lti_integration(request: Request, token: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    settings = get_settings()
    return _shell(
        request,
        "lti_integration.html",
        session,
        active_page="lti_integration",
        page_title="Moodle connection",
        page_subtitle="LTI 1.3",
        extra={
            "base_url": settings.app_base_url,
            "issuer": os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/"),
            "client_id": session.get("client_id") or "—",
            "ags_scopes": session.get("ags_scopes") or [],
        },
    )


@router.get("/institutions", response_class=HTMLResponse)
async def institutions_shell(request: Request, token: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    try:
        institutions = db.list_institutions()
    except Exception:  # noqa: BLE001
        institutions = []
    return _shell(
        request,
        "institutions.html",
        session,
        active_page="institutions",
        page_title="Institutions",
        page_subtitle="Registered LMS organizations",
        extra={"institutions": institutions},
    )


@router.get("/student-directory", response_class=HTMLResponse)
async def student_directory(
    request: Request, token: str | None = None, q: str | None = None
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    by_subject: dict[str, dict[str, Any]] = {}
    for r in rows:
        sub = str(r.get("subject") or "")
        bucket = by_subject.setdefault(
            sub,
            {
                "name": r.get("learner_name") or sub,
                "subject": sub,
                "attempts": 0,
                "score_sum": 0,
            },
        )
        bucket["attempts"] += 1
        bucket["score_sum"] += int(r.get("score") or 0)
    students = []
    needle = (q or "").strip().lower()
    for sub, b in by_subject.items():
        avg = round(b["score_sum"] / b["attempts"], 1) if b["attempts"] else 0
        row = {
            "name": b["name"],
            "subject": b["subject"],
            "attempts": b["attempts"],
            "avg_score": avg,
        }
        if needle and needle not in str(row["name"]).lower() and needle not in sub.lower():
            continue
        students.append(row)
    students.sort(key=lambda x: str(x["name"]).lower())
    return _shell(
        request,
        "student_directory.html",
        session,
        active_page="students",
        page_title="Learners",
        page_subtitle="Activity in this workspace",
        extra={"students": students, "search_query": q or "", "max_score": MAX_SCORE},
    )


@router.get("/institution-detail", response_class=HTMLResponse)
async def institution_detail(request: Request, token: str | None = None):
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    learners = {str(r.get("subject")) for r in rows}
    try:
        snap = school_snapshot(session["tenant_id"])
    except Exception:  # noqa: BLE001
        snap = {
            "course": None,
            "chapters": [],
            "admins": [],
            "teachers": [],
            "classes": [],
            "admin_count": 0,
            "teacher_count": 0,
            "class_count": 0,
            "chapter_count": 0,
            "student_count": 0,
        }
    return _shell(
        request,
        "institution_detail.html",
        session,
        active_page="institution_detail",
        page_title="This workspace",
        page_subtitle=str(session.get("tenant_name") or session.get("tenant_slug") or ""),
        extra={
            "attempts": _fmt_attempts(rows),
            "total_attempts": len(rows),
            "recorded_learners": len(learners),
            "snapshot": snap,
        },
    )


def _safe_snapshot(tenant_id: Any) -> dict[str, Any]:
    try:
        return school_snapshot(tenant_id)
    except Exception:  # noqa: BLE001
        return {
            "course": None,
            "chapters": [],
            "admins": [],
            "teachers": [],
            "classes": [],
            "lti_bindings": [],
            "admin_count": 0,
            "teacher_count": 0,
            "class_count": 0,
            "chapter_count": 0,
            "binding_count": 0,
            "student_count": 0,
        }


@router.get("/school-admin", response_class=HTMLResponse)
async def school_admin_home(request: Request, token: str | None = None):
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    snap = _safe_snapshot(session["tenant_id"])
    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    return _shell(
        request,
        "school_admin_home.html",
        session,
        active_page="school_admin",
        page_title="School admin",
        page_subtitle=str(session.get("tenant_name") or ""),
        extra={
            "snapshot": snap,
            "total_attempts": len(rows),
            "recorded_learners": len({str(r.get("subject")) for r in rows}),
            "moodle_base": str(session.get("moodle_base_url") or "http://localhost:8085"),
        },
    )


@router.get("/school-admin/analytics", response_class=HTMLResponse)
async def school_admin_analytics(request: Request, token: str | None = None):
    from app.modules import analytics as analytics_mod
    from app.settings import get_settings

    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    dash = analytics_mod.tenant_dashboard(session["tenant_id"])
    settings = get_settings()
    embed = analytics_mod.metabase_embed_url(
        tenant_id=session["tenant_id"],
        tenant_slug=str(session.get("tenant_slug") or ""),
    )
    return _shell(
        request,
        "school_admin_analytics.html",
        session,
        active_page="school_admin_analytics",
        page_title="School analytics",
        page_subtitle="Admin view · attempts + xAPI",
        extra={
            "dash": dash,
            "metabase_url": settings.metabase_url,
            "metabase_embed_url": embed,
        },
    )


@router.get("/learn/analytics", response_class=HTMLResponse)
async def learner_analytics(request: Request, token: str | None = None):
    from app.modules import analytics as analytics_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    dash = analytics_mod.learner_dashboard(
        session["tenant_id"], str(session.get("subject") or "")
    )
    return _shell(
        request,
        "learner_analytics.html",
        session,
        active_page="learner_analytics",
        page_title="My progress",
        page_subtitle="Your attempts and learning evidence",
        extra={"dash": dash},
    )


@router.get("/school-admin/teachers", response_class=HTMLResponse)
async def school_admin_teachers(
    request: Request, token: str | None = None, ok: str | None = None
):
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    teachers = list_teachers(session["tenant_id"])
    return _shell(
        request,
        "school_admin_teachers.html",
        session,
        active_page="school_admin_teachers",
        page_title="Teachers",
        page_subtitle="Profiles live in Moodle",
        extra={
            "teachers": teachers,
            "ok_message": ok,
            "moodle_base": str(session.get("moodle_base_url") or "http://localhost:8085"),
        },
    )


@router.get("/school-admin/classes", response_class=HTMLResponse)
async def school_admin_classes(
    request: Request, token: str | None = None, ok: str | None = None
):
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    classes = list_classes_with_roster(session["tenant_id"])
    courses = content.list_published_courses(session["tenant_id"])
    bindings = list_lti_context_bindings(session["tenant_id"])
    return _shell(
        request,
        "school_admin_classes.html",
        session,
        active_page="school_admin_classes",
        page_title="Classes",
        page_subtitle="Rosters and Moodle course links for this school",
        extra={
            "classes": classes,
            "courses": courses,
            "bindings": bindings,
            "ok_message": ok,
        },
    )


@router.post("/school-admin/classes", response_class=HTMLResponse)
async def school_admin_classes_create(
    request: Request,
    token: str = Form(""),
    class_code: str = Form(""),
    class_name: str = Form(""),
    subject: str = Form(""),
    term: str = Form(""),
    course_id: str = Form(""),
):
    session = require_school_admin(request, token=token or None)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    if not class_code.strip() or not class_name.strip():
        return RedirectResponse(
            url=f"/school-admin/classes?token={tok}&ok=Code+and+name+required",
            status_code=303,
        )
    create_class(
        session["tenant_id"],
        class_code=class_code,
        class_name=class_name,
        subject=subject,
        term=term,
        course_id=course_id.strip() or None,
    )
    return RedirectResponse(
        url=f"/school-admin/classes?token={tok}&ok=Class+saved",
        status_code=303,
    )


@router.post("/school-admin/classes/link-course", response_class=HTMLResponse)
async def school_admin_link_course(
    request: Request,
    token: str = Form(""),
    class_id: str = Form(""),
    course_id: str = Form(""),
):
    session = require_school_admin(request, token=token or None)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    if not class_id.strip():
        return RedirectResponse(
            url=f"/school-admin/classes?token={tok}&ok=Class+required",
            status_code=303,
        )
    set_class_course(
        session["tenant_id"],
        class_id.strip(),
        course_id.strip() or None,
    )
    return RedirectResponse(
        url=f"/school-admin/classes?token={tok}&ok=Curriculum+linked",
        status_code=303,
    )


@router.post("/school-admin/classes/bind-moodle", response_class=HTMLResponse)
async def school_admin_bind_moodle(
    request: Request,
    token: str = Form(""),
    lti_context_id: str = Form(""),
    class_id: str = Form(""),
    context_label: str = Form(""),
    context_title: str = Form(""),
):
    session = require_school_admin(request, token=token or None)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    if not lti_context_id.strip() or not class_id.strip():
        return RedirectResponse(
            url=f"/school-admin/classes?token={tok}&ok=Moodle+context+id+and+class+required",
            status_code=303,
        )
    classes = list_classes_with_roster(session["tenant_id"])
    cls = next((c for c in classes if str(c["id"]) == class_id.strip()), None)
    course_id = (cls or {}).get("course_id")
    upsert_lti_context_binding(
        session["tenant_id"],
        lti_context_id=lti_context_id.strip(),
        class_id=class_id.strip(),
        course_id=course_id,
        context_label=context_label,
        context_title=context_title,
    )
    return RedirectResponse(
        url=f"/school-admin/classes?token={tok}&ok=Moodle+course+bound",
        status_code=303,
    )


@router.get("/school-admin/students", response_class=HTMLResponse)
async def school_admin_students(request: Request, token: str | None = None):
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    students = list_school_students(session["tenant_id"])
    classes = list_classes_with_roster(session["tenant_id"])
    return _shell(
        request,
        "school_admin_students.html",
        session,
        active_page="school_admin_students",
        page_title="Students",
        page_subtitle="Profiles live in Moodle",
        extra={
            "students": students,
            "classes": classes,
            "moodle_base": str(session.get("moodle_base_url") or "http://localhost:8085"),
        },
    )


@router.get("/teacher/content", response_class=HTMLResponse)
async def teacher_content(request: Request, token: str | None = None, ok: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    course = content.ensure_primary_course(session["tenant_id"])
    lessons = content.list_lessons(
        session["tenant_id"], course["id"], include_unpublished=True
    )
    from app.modules.quiz import get_primary_quiz, list_quiz_question_rows
    from app.modules.ai_assessment import ai_status

    quiz = get_primary_quiz(session["tenant_id"])
    questions = (
        list_quiz_question_rows(session["tenant_id"], quiz["id"]) if quiz else []
    )
    return _shell(
        request,
        "teacher_content.html",
        session,
        active_page="teacher_content",
        page_title="Upload content",
        page_subtitle="Lessons and quiz for this school only",
        extra={
            "course_row": course,
            "lessons": lessons,
            "quiz": quiz,
            "questions": questions,
            "ok_message": ok or "",
            "ai": ai_status(),
        },
    )


def _safe_upload_name(name: str) -> str:
    import re

    base = Path(name or "file").name
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip(".-") or "file"
    return base[:120]


async def _read_upload_text_or_link(
    *,
    form,
    tenant_id: str,
    existing_body: str = "",
) -> str:
    """Merge optional .md/.txt body file and optional PDF/image attachment link."""
    body_md = str(form.get("body_md") or existing_body)
    upload = form.get("body_file")
    if upload is not None and getattr(upload, "filename", None):
        fname = str(upload.filename or "")
        lower = fname.lower()
        if lower.endswith((".md", ".txt", ".markdown")):
            raw = await upload.read()
            text = raw.decode("utf-8", errors="replace").strip()
            if text:
                body_md = text
    attach = form.get("attachment")
    if attach is not None and getattr(attach, "filename", None):
        fname = _safe_upload_name(str(attach.filename))
        lower = fname.lower()
        allowed = (".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp")
        if any(lower.endswith(ext) for ext in allowed):
            raw = await attach.read()
            if len(raw) <= 8 * 1024 * 1024:
                dest_dir = (
                    Path(__file__).resolve().parents[1]
                    / "static"
                    / "uploads"
                    / tenant_id
                )
                dest_dir.mkdir(parents=True, exist_ok=True)
                from uuid import uuid4

                stored = f"{uuid4().hex[:10]}-{fname}"
                (dest_dir / stored).write_bytes(raw)
                href = f"/static/uploads/{tenant_id}/{stored}"
                label = fname
                link = f"\n\nAttachment: [{label}]({href})"
                body_md = (body_md or "").rstrip() + link
    return body_md


@router.post("/teacher/lessons/new", response_class=HTMLResponse)
async def teacher_lesson_new(request: Request, token: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    title = str(form.get("title") or "").strip()
    lesson_type = str(form.get("lesson_type") or "article").strip()
    video_url = str(form.get("video_url") or "").strip()
    status = str(form.get("status") or "published").strip()
    if not title:
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok=Lesson+title+required",
            status_code=303,
        )
    body_md = await _read_upload_text_or_link(
        form=form,
        tenant_id=str(session["tenant_id"]),
        existing_body=str(form.get("body_md") or ""),
    )
    content.create_lesson(
        tenant_id=session["tenant_id"],
        title=title,
        body_md=body_md,
        lesson_type=lesson_type,
        video_url=video_url,
        status=status,
    )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Lesson+saved",
        status_code=303,
    )


@router.post("/teacher/lessons/{lesson_id}/edit", response_class=HTMLResponse)
async def teacher_lesson_edit(
    request: Request, lesson_id: UUID, token: str | None = None
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    title = str(form.get("title") or "").strip()
    video_url = str(form.get("video_url") or "").strip()
    lesson_type = str(form.get("lesson_type") or "").strip() or None
    status = str(form.get("status") or "").strip() or None
    existing = content.get_lesson(
        session["tenant_id"], lesson_id, allow_unpublished=True
    )
    if not existing:
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok=Lesson+not+found",
            status_code=303,
        )
    try:
        body_md = await _read_upload_text_or_link(
            form=form,
            tenant_id=str(session["tenant_id"]),
            existing_body=str(form.get("body_md") if "body_md" in form else existing.get("body_md") or ""),
        )
        content.update_lesson(
            tenant_id=session["tenant_id"],
            lesson_id=lesson_id,
            title=title or str(existing["title"]),
            body_md=body_md,
            video_url=video_url,
            lesson_type=lesson_type,
            status=status,
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok={msg}",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Lesson+updated",
        status_code=303,
    )


@router.post("/teacher/lessons/{lesson_id}/delete", response_class=HTMLResponse)
async def teacher_lesson_delete(
    request: Request, lesson_id: UUID, token: str | None = None
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    content.delete_lesson(tenant_id=session["tenant_id"], lesson_id=lesson_id)
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Lesson+deleted",
        status_code=303,
    )


@router.post("/teacher/lessons/{lesson_id}/status", response_class=HTMLResponse)
async def teacher_lesson_status(
    request: Request, lesson_id: UUID, token: str | None = None
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    status = str(form.get("status") or "").strip()
    try:
        row = content.set_lesson_status(
            tenant_id=session["tenant_id"], lesson_id=lesson_id, status=status
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok={msg}",
            status_code=303,
        )
    if not row:
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok=Lesson+not+found",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Lesson+{status}",
        status_code=303,
    )


@router.post("/teacher/lessons/{lesson_id}/reorder", response_class=HTMLResponse)
async def teacher_lesson_reorder(
    request: Request, lesson_id: UUID, token: str | None = None
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    direction = str(form.get("direction") or "").strip()
    content.reorder_lesson(
        tenant_id=session["tenant_id"],
        lesson_id=lesson_id,
        direction=direction,
    )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Order+updated",
        status_code=303,
    )


@router.post("/teacher/quiz/questions", response_class=HTMLResponse)
async def teacher_quiz_question_new(request: Request, token: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    prompt = str(form.get("prompt") or "").strip()
    choices = [
        str(form.get("choice0") or "").strip(),
        str(form.get("choice1") or "").strip(),
        str(form.get("choice2") or "").strip(),
        str(form.get("choice3") or "").strip(),
    ]
    try:
        correct_index = int(str(form.get("correct_index") or "0"))
    except ValueError:
        correct_index = 0
    if not prompt:
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok=Question+text+required",
            status_code=303,
        )
    try:
        content.add_quiz_question(
            tenant_id=session["tenant_id"],
            prompt=prompt,
            choices=choices,
            correct_index=correct_index,
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok={msg}",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Quiz+question+saved",
        status_code=303,
    )


@router.post("/teacher/quiz/questions/{question_id}/delete", response_class=HTMLResponse)
async def teacher_quiz_question_delete(
    request: Request, question_id: UUID, token: str | None = None
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    content.delete_quiz_question(
        tenant_id=session["tenant_id"], question_id=question_id
    )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Question+deleted",
        status_code=303,
    )


@router.get("/teacher/analytics", response_class=HTMLResponse)
async def teacher_analytics(request: Request, token: str | None = None):
    from app.modules import analytics as analytics_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    dash = analytics_mod.tenant_dashboard(session["tenant_id"])
    from app.settings import get_settings

    settings = get_settings()
    embed = analytics_mod.metabase_embed_url(
        tenant_id=session["tenant_id"],
        tenant_slug=str(session.get("tenant_slug") or ""),
    )
    return _shell(
        request,
        "teacher_analytics.html",
        session,
        active_page="teacher_analytics",
        page_title="Analytics",
        page_subtitle="In-app BI from attempts + xAPI",
        extra={
            "dash": dash,
            "metabase_url": settings.metabase_url,
            "metabase_embed_url": embed,
        },
    )


@router.get("/teacher/analytics.json")
async def teacher_analytics_json(request: Request, token: str | None = None):
    from fastapi.responses import JSONResponse

    from app.modules import analytics as analytics_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    return JSONResponse(analytics_mod.tenant_dashboard(session["tenant_id"]))


@router.get("/teacher/analytics.csv")
async def teacher_analytics_csv(request: Request, token: str | None = None):
    import csv
    import io

    from fastapi.responses import StreamingResponse

    from app.modules import analytics as analytics_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = analytics_mod.export_rows(session["tenant_id"])
    buf = io.StringIO()
    w = csv.DictWriter(
        buf,
        fieldnames=[
            "id",
            "subject",
            "learner_name",
            "course_label",
            "score",
            "max_score",
            "percent",
            "grade_sent",
            "created_at",
        ],
    )
    w.writeheader()
    for r in rows:
        w.writerow(
            {
                "id": r.get("id"),
                "subject": r.get("subject"),
                "learner_name": r.get("learner_name"),
                "course_label": r.get("course_label"),
                "score": r.get("score"),
                "max_score": r.get("max_score"),
                "percent": r.get("percent"),
                "grade_sent": r.get("grade_sent"),
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r.get("created_at"), "isoformat")
                    else r.get("created_at")
                ),
            }
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=analytics_attempts.csv"
        },
    )


@router.post("/teacher/ai/generate", response_class=HTMLResponse)
async def teacher_ai_generate(request: Request, token: str | None = None):
    from app.modules.ai_assessment import generate_mcqs_from_text

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    lesson_id = str(form.get("lesson_id") or "").strip()
    try:
        count = int(str(form.get("count") or "3"))
    except ValueError:
        count = 3
    lesson = (
        content.get_lesson(
            session["tenant_id"], lesson_id, allow_unpublished=True
        )
        if lesson_id
        else None
    )
    if not lesson or lesson.get("lesson_type") == "quiz":
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok=Pick+a+reading+lesson+with+text",
            status_code=303,
        )
    body = str(lesson.get("body_md") or "")
    try:
        result = generate_mcqs_from_text(
            body, count=count, title=str(lesson.get("title") or "")
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok={msg}",
            status_code=303,
        )
    return _shell(
        request,
        "teacher_ai_preview.html",
        session,
        active_page="teacher_content",
        page_title="AI quiz draft",
        page_subtitle=str(lesson.get("title") or "Generated questions"),
        extra={
            "lesson": lesson,
            "source_title": str(lesson.get("title") or "Lesson"),
            "source_kind": "lesson",
            "provider": result.get("provider"),
            "model": result.get("model"),
            "note": result.get("note") or "",
            "drafts": result.get("questions") or [],
        },
    )


@router.post("/teacher/ai/generate-from-pdf", response_class=HTMLResponse)
async def teacher_ai_generate_from_pdf(
    request: Request, token: str | None = None
):
    from app.modules.ai_assessment import generate_mcqs_from_document

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        count = int(str(form.get("count") or "3"))
    except ValueError:
        count = 3
    title = str(form.get("title") or "").strip()
    upload = form.get("document")
    if upload is None or not getattr(upload, "filename", None):
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok=Choose+a+PDF+or+text+file",
            status_code=303,
        )
    fname = str(upload.filename or "upload.pdf")
    raw = await upload.read()
    try:
        result = generate_mcqs_from_document(
            raw, filename=fname, count=count, title=title
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    source_title = title or result.get("source_filename") or fname
    note = result.get("note") or ""
    if result.get("page_count"):
        note = (
            f"Extracted ~{result.get('extracted_chars')} chars "
            f"from {result['page_count']} page(s). {note}"
        ).strip()
    return _shell(
        request,
        "teacher_ai_preview.html",
        session,
        active_page="teacher_ai",
        page_title="AI quiz draft",
        page_subtitle=str(source_title),
        extra={
            "lesson": None,
            "source_title": source_title,
            "source_kind": result.get("source_kind") or "pdf",
            "provider": result.get("provider"),
            "model": result.get("model"),
            "note": note,
            "drafts": result.get("questions") or [],
        },
    )


@router.post("/teacher/ai/save", response_class=HTMLResponse)
async def teacher_ai_save(request: Request, token: str | None = None):
    import json

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    raw = str(form.get("drafts_json") or "[]")
    try:
        drafts = json.loads(raw)
    except json.JSONDecodeError:
        drafts = []
    selected = set(form.getlist("selected"))
    saved = 0
    for i, item in enumerate(drafts):
        if str(i) not in selected:
            continue
        if not isinstance(item, dict):
            continue
        try:
            content.add_quiz_question(
                tenant_id=session["tenant_id"],
                prompt=str(item.get("prompt") or ""),
                choices=[str(c) for c in (item.get("choices") or [])],
                correct_index=int(item.get("correct_index") or 0),
            )
            saved += 1
        except ValueError:
            continue
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Saved+{saved}+AI+questions",
        status_code=303,
    )


@router.get("/teacher/ai", response_class=HTMLResponse)
async def teacher_ai_hub(
    request: Request, token: str | None = None, ok: str | None = None
):
    from app.modules.ai_assessment import ai_status
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    lessons = (
        content.list_lessons(
            session["tenant_id"], course["id"], include_unpublished=True
        )
        if course
        else []
    )
    skill_rows: list = []
    try:
        skill_rows = skills_mod.ensure_default_skills(session["tenant_id"])
    except Exception:  # noqa: BLE001
        skill_rows = []
    return _shell(
        request,
        "teacher_ai_hub.html",
        session,
        active_page="teacher_ai",
        page_title="AI tools",
        page_subtitle="Draft, simplify, grade assist — you confirm before Moodle",
        extra={
            "ai": ai_status(),
            "lessons": lessons,
            "skills": skill_rows,
            "course_row": course,
            "ok_message": ok or "",
        },
    )


@router.get("/teacher/ai/author", response_class=HTMLResponse)
async def teacher_ai_author_get(
    request: Request, token: str | None = None, ok: str | None = None
):
    from app.modules import manuals as manuals_mod
    from app.modules import sme as sme_mod
    from app.modules.ai_assessment import ai_status

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    chunks = []
    try:
        _title, chunks, _sources = sme_mod.coach_chunks_for_tenant(
            session["tenant_id"],
            course_id=session.get("edvidura_course_id") or None,
        )
    except Exception:  # noqa: BLE001
        chunks = []
    mans = manuals_mod.list_manuals(session["tenant_id"], include_unpublished=True)
    return _shell(
        request,
        "teacher_ai_author.html",
        session,
        active_page="teacher_ai",
        page_title="Authoring assistant",
        page_subtitle="D13 · SME-grounded drafts",
        extra={
            "ai": ai_status(),
            "draft": None,
            "prompt": "",
            "mode": "lesson",
            "source_count": len(chunks),
            "manuals": mans,
            "ok_message": ok or "",
            "error": "",
        },
    )


@router.post("/teacher/ai/author", response_class=HTMLResponse)
async def teacher_ai_author_post(request: Request, token: str | None = None):
    from app.modules import ai_authoring
    from app.modules import manuals as manuals_mod
    from app.modules import sme as sme_mod
    from app.modules.ai_assessment import ai_status

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    prompt = str(form.get("prompt") or "").strip()
    mode = str(form.get("mode") or "lesson").strip().lower()
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    title, chunks, _sources = sme_mod.coach_chunks_for_tenant(
        session["tenant_id"],
        course_id=(course or {}).get("id"),
    )
    draft = None
    err = ""
    try:
        draft = ai_authoring.author_assist(
            prompt=prompt,
            source_chunks=chunks,
            mode=mode,
            course_title=str((course or {}).get("title") or title or ""),
        )
    except ValueError as exc:
        err = str(exc)
    mans = manuals_mod.list_manuals(session["tenant_id"], include_unpublished=True)
    return _shell(
        request,
        "teacher_ai_author.html",
        session,
        active_page="teacher_ai",
        page_title="Authoring assistant",
        page_subtitle="D13 · SME-grounded drafts",
        extra={
            "ai": ai_status(),
            "draft": draft,
            "prompt": prompt,
            "mode": mode,
            "source_count": len(chunks),
            "manuals": mans,
            "ok_message": "",
            "error": err,
        },
    )


@router.post("/teacher/ai/author/apply", response_class=HTMLResponse)
async def teacher_ai_author_apply(request: Request, token: str | None = None):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    mode = str(form.get("mode") or "lesson").strip().lower()
    title = str(form.get("title") or "").strip()
    body_md = str(form.get("body_md") or "").strip()
    publish = str(form.get("publish") or "") in {"1", "true", "on", "yes"}
    if not title or len(body_md) < 20:
        return RedirectResponse(
            url=f"/teacher/ai/author?token={tok}&ok=Title+and+body+required",
            status_code=303,
        )
    if mode == "manual":
        mid = str(form.get("manual_id") or "").strip()
        if mid:
            manuals_mod.add_version(
                tenant_id=session["tenant_id"],
                manual_id=mid,
                body_md=body_md,
                changelog=f"Authoring assistant: {title}",
                subject=str(session.get("subject") or ""),
                publish=publish,
            )
        else:
            manuals_mod.create_manual(
                tenant_id=session["tenant_id"],
                title=title,
                description="Drafted with SME authoring assistant",
                body_md=body_md,
                subject=str(session.get("subject") or ""),
                publish=publish,
            )
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Manual+draft+saved",
            status_code=303,
        )
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    content.create_lesson(
        tenant_id=session["tenant_id"],
        title=title,
        body_md=body_md,
        lesson_type="article",
        status="published" if publish else "draft",
        course_id=(course or {}).get("id"),
        insert_before_quiz=True,
    )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Lesson+draft+saved",
        status_code=303,
    )


@router.post("/teacher/ai/remediation", response_class=HTMLResponse)
async def teacher_ai_remediation_draft(request: Request, token: str | None = None):
    from app.modules.ai_assessment import generate_remediation_micro_lesson
    from app.modules import skills as skills_mod
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    skill_id = str(form.get("skill_id") or "").strip()
    skills = skills_mod.ensure_default_skills(session["tenant_id"])
    skill = next((s for s in skills if str(s.get("id")) == skill_id), None)
    if not skill:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok=Pick+a+skill",
            status_code=303,
        )
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    excerpt = ""
    try:
        focus = str(skill.get("manual_focus") or "").strip()
        for src in sme_mod.list_sources(session["tenant_id"])[:8]:
            chunks = sme_mod.resolve_source_chunks(
                session["tenant_id"], [src]
            )
            for ch in chunks:
                if focus and focus in str(ch.get("slug") or ""):
                    excerpt = str(ch.get("body") or "")[:2000]
                    break
                if not excerpt:
                    excerpt = str(ch.get("body") or "")[:1200]
            if focus and excerpt:
                break
    except Exception:  # noqa: BLE001
        excerpt = ""
    try:
        draft = generate_remediation_micro_lesson(
            skill_label=str(skill.get("label") or ""),
            skill_code=str(skill.get("skill_code") or ""),
            skill_description=str(skill.get("description") or ""),
            course_title=str((course or {}).get("title") or ""),
            source_excerpt=excerpt,
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    return _shell(
        request,
        "teacher_ai_remediation.html",
        session,
        active_page="teacher_ai",
        page_title="Remediation draft",
        page_subtitle=str(skill.get("label") or ""),
        extra={
            "skill_id": str(skill.get("id") or ""),
            "skill_code": str(skill.get("skill_code") or ""),
            "skill_label": str(skill.get("label") or ""),
            "title": draft.get("title") or f"Review: {skill.get('label')}",
            "body_md": draft.get("body_md") or "",
            "summary": draft.get("summary") or "",
            "provider": draft.get("provider") or "local",
            "model": draft.get("model") or "",
            "note": draft.get("note") or "",
        },
    )


@router.post("/teacher/ai/remediation/save", response_class=HTMLResponse)
async def teacher_ai_remediation_save(request: Request, token: str | None = None):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    skill_id = str(form.get("skill_id") or "").strip()
    title = str(form.get("title") or "").strip()
    body_md = str(form.get("body_md") or "").strip()
    publish = str(form.get("publish") or "") in {"1", "true", "on", "yes"}
    if not skill_id or not title or len(body_md) < 20:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok=Title+and+body+required",
            status_code=303,
        )
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    skills = skills_mod.ensure_default_skills(session["tenant_id"])
    skill = next((s for s in skills if str(s.get("id")) == skill_id), None)
    if not skill:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok=Skill+not+found",
            status_code=303,
        )
    lesson = content.create_lesson(
        tenant_id=session["tenant_id"],
        title=title,
        body_md=body_md,
        lesson_type="article",
        status="published" if publish else "draft",
        course_id=(course or {}).get("id"),
        insert_before_quiz=True,
    )
    lid = str(lesson.get("id") or "")
    skills_mod.set_skill_remediation(
        session["tenant_id"],
        skill_id,
        lesson_id=lid,
        manual_id=str(skill.get("manual_id") or "") or None,
        manual_focus=str(skill.get("manual_focus") or ""),
        prefer_path="lessons",
        teleport_label=f"Review: {skill.get('label') or title}",
        teleport_hint="AI remediation micro-lesson — open, then practice",
    )
    status_word = "published" if publish else "draft"
    return_to = str(form.get("return_to") or "").strip().lower()
    if return_to == "dct":
        dest = (
            f"/teacher/dct?token={tok}"
            f"&ok=Remediation+lesson+saved+({status_word})+and+linked"
        )
    else:
        dest = (
            f"/teacher/content?token={tok}"
            f"&ok=Remediation+lesson+saved+({status_word})+and+linked"
        )
    return RedirectResponse(url=dest, status_code=303)


@router.post("/teacher/ai/simplify", response_class=HTMLResponse)
async def teacher_ai_simplify(request: Request, token: str | None = None):
    from app.modules.ai_assessment import simplify_lesson_text

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    lesson_id = str(form.get("lesson_id") or "").strip()
    level = str(form.get("level") or "simpler").strip() or "simpler"
    lesson = (
        content.get_lesson(
            session["tenant_id"], lesson_id, allow_unpublished=True
        )
        if lesson_id
        else None
    )
    if not lesson or lesson.get("lesson_type") == "quiz":
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok=Pick+a+reading+lesson",
            status_code=303,
        )
    try:
        result = simplify_lesson_text(
            str(lesson.get("body_md") or ""),
            title=str(lesson.get("title") or ""),
            level=level,
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    return _shell(
        request,
        "teacher_ai_simplify.html",
        session,
        active_page="teacher_ai",
        page_title="Simplified lesson draft",
        page_subtitle=str(lesson.get("title") or ""),
        extra={
            "lesson": lesson,
            "draft": result,
            "provider": result.get("provider"),
            "model": result.get("model"),
            "note": result.get("note") or "",
        },
    )


@router.post("/teacher/ai/simplify/apply", response_class=HTMLResponse)
async def teacher_ai_simplify_apply(request: Request, token: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    lesson_id = str(form.get("lesson_id") or "").strip()
    body_md = str(form.get("body_md") or "")
    title = str(form.get("title") or "").strip()
    if not lesson_id or len(body_md.strip()) < 20:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok=Nothing+to+apply",
            status_code=303,
        )
    content.update_lesson(
        tenant_id=session["tenant_id"],
        lesson_id=lesson_id,
        title=title or "Lesson",
        body_md=body_md,
    )
    return RedirectResponse(
        url=f"/teacher/content?token={tok}&ok=Lesson+updated+from+AI+draft",
        status_code=303,
    )


@router.post("/teacher/ai/grade-assist", response_class=HTMLResponse)
async def teacher_ai_grade_assist(request: Request, token: str | None = None):
    from app.modules.ai_assessment import grade_open_response

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        result = grade_open_response(
            prompt=str(form.get("prompt") or ""),
            rubric=str(form.get("rubric") or ""),
            student_answer=str(form.get("student_answer") or ""),
            max_score=int(str(form.get("max_score") or "5")),
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    return _shell(
        request,
        "teacher_ai_grade.html",
        session,
        active_page="teacher_ai",
        page_title="Grade assist",
        page_subtitle="Suggestion only — confirm before Moodle",
        extra={
            "result": result,
            "prompt": str(form.get("prompt") or ""),
            "student_answer": str(form.get("student_answer") or ""),
            "rubric": str(form.get("rubric") or ""),
        },
    )


@router.post("/learn/ai/hint", response_class=HTMLResponse)
async def learner_ai_hint(request: Request, token: str | None = None):
    from app.modules import ai_tutor

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    attempt_id = str(form.get("attempt_id") or "").strip()
    prompt = str(form.get("prompt") or "")
    correct_choice = str(form.get("correct_choice") or "")
    excerpts: list[str] = []
    course = _bound_course(session)
    if course:
        for L in content.list_lessons(session["tenant_id"], course["id"])[:5]:
            body = str(L.get("body_md") or "").strip()
            if body:
                excerpts.append(body[:400])
    try:
        result = ai_tutor.hint_for_missed_question(
            prompt=prompt,
            correct_choice=correct_choice,
            lesson_excerpts=excerpts,
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/quiz/result/{attempt_id}?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    return _shell(
        request,
        "ai_hint.html",
        session,
        active_page="quiz_result",
        page_title="Study hint",
        page_subtitle="From your course",
        extra={
            "hint": result,
            "prompt": prompt,
            "attempt_id": attempt_id,
            "back_href": (
                f"/quiz/result/{attempt_id}?token={tok}"
                if attempt_id
                else f"/launch-hub?token={tok}"
            ),
        },
    )


@router.get("/learn/gap", response_class=HTMLResponse)
async def learner_gap_path(
    request: Request, token: str | None = None, role: str | None = None
):
    from app.modules import adaptive as adaptive_mod
    from app.modules import skills as skills_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    token_s = _ensure_token(session)
    role_q = (role or "").strip().lower()
    if role_q:
        session["target_role"] = role_q
        token_s = _persist_session(request, session)
    elif "target_role" not in session:
        session["target_role"] = ""

    # Rebuild shell progress after possible role change
    shell_bits = _shell_progress(session, token_s)
    gap_path = shell_bits.get("gap_path") or {
        "active": False,
        "steps": [],
        "skills": [],
    }
    # If role selected but open plan is stale / inactive, derive + persist
    wanted = str(session.get("target_role") or "").strip().lower()
    if wanted and (
        not gap_path.get("active")
        or str(gap_path.get("role_code") or "").lower() != wanted
    ):
        try:
            progress = shell_bits.get("shell_progress") or {}
            first_lesson_id = None
            first_manual_id = None
            manual_version = None
            for L in progress.get("lessons") or []:
                if L.get("lesson_type") != "quiz":
                    first_lesson_id = str(L["id"])
                    break
            try:
                from app.modules import manuals as manuals_mod

                mans = manuals_mod.list_manuals(session["tenant_id"])
                if mans:
                    first_manual_id = str(mans[0]["id"])
                    pub = manuals_mod.latest_published_version(
                        session["tenant_id"], mans[0]["id"]
                    )
                    if pub:
                        manual_version = int(pub["version"])
            except Exception:  # noqa: BLE001
                pass
            gap_path = adaptive_mod.resolve_learner_plan(
                session["tenant_id"],
                subject=str(session.get("subject") or ""),
                quiz_token=token_s,
                first_lesson_id=first_lesson_id,
                first_manual_id=first_manual_id,
                manual_version=manual_version,
                persist_if_missing=True,
                role_code=wanted,
            )
        except Exception:  # noqa: BLE001
            pass
    roles = []
    try:
        roles = skills_mod.ensure_default_roles(session["tenant_id"])
    except Exception:  # noqa: BLE001
        roles = []
    mode = str((gap_path or {}).get("mode") or "gap")
    subtitle = (
        "Difference training · role gaps"
        if mode == "difference"
        else "PLE · close skill gaps"
    )
    return _shell(
        request,
        "gap_path.html",
        session,
        active_page="gap_path",
        page_title="My learning plan",
        page_subtitle=subtitle,
        extra={
            "gap_path": gap_path,
            "adaptive_next": shell_bits.get("adaptive_next"),
            "roles": roles,
            "target_role": wanted,
        },
    )


@router.post("/learn/gap/role", response_class=HTMLResponse)
async def learner_gap_set_role(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or form.get("token") or token or _ensure_token(session))
    role = str(form.get("role_code") or "").strip().lower()
    session["target_role"] = role
    tok = _persist_session(request, session)
    q = f"/learn/gap?token={tok}"
    if role:
        q += f"&role={role}"
    return RedirectResponse(url=q, status_code=303)


@router.post("/learn/gap/step", response_class=HTMLResponse)
async def learner_gap_step_done(request: Request, token: str | None = None):
    """Mark a PLE plan step done (explicit checkbox on gap page)."""
    from app.modules import adaptive as adaptive_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or form.get("token") or token or _ensure_token(session))
    step_key = str(form.get("step_key") or "").strip()
    if step_key:
        try:
            adaptive_mod.mark_plan_step_done(
                session["tenant_id"],
                str(session.get("subject") or ""),
                step_key=step_key,
            )
        except Exception:  # noqa: BLE001
            pass
    return RedirectResponse(
        url=f"/learn/gap?token={tok}",
        status_code=303,
    )


@router.get("/learn/coach", response_class=HTMLResponse)
async def learner_coach_get(request: Request, token: str | None = None):
    from app.modules.ai_assessment import ai_status

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    source_count = 0
    try:
        from app.modules import sme as sme_mod

        sources = sme_mod.list_sources(session["tenant_id"])
        source_count = len(sources)
        if not sources:
            title, chunks, sources = sme_mod.coach_chunks_for_tenant(
                session["tenant_id"],
                course_id=session.get("edvidura_course_id") or None,
            )
            source_count = len(sources) or (1 if chunks else 0)
            del title
    except Exception:  # noqa: BLE001
        source_count = 0
    return _shell(
        request,
        "study_coach.html",
        session,
        active_page="study_coach",
        page_title="Study coach",
        page_subtitle=str(session.get("class_name") or session.get("course") or ""),
        extra={
            "ai": ai_status(),
            "answer": None,
            "question": "",
            "source_count": source_count,
        },
    )


@router.post("/learn/coach", response_class=HTMLResponse)
async def learner_coach_post(request: Request, token: str | None = None):
    from app.modules import ai_tutor
    from app.modules.ai_assessment import ai_status

    form = await request.form()
    tok = str(form.get("token") or form.get("quiz_token") or token or "")
    session = require_session(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return session
    question = str(form.get("question") or "").strip()
    course_title, chunks = ai_tutor.curriculum_chunks_for_session(
        session["tenant_id"],
        session.get("edvidura_course_id") or None,
        list_lessons_fn=content.list_lessons,
        get_bound_course_fn=content.get_bound_course,
    )
    answer = None
    err = ""
    try:
        answer = ai_tutor.study_coach_answer(
            question=question,
            curriculum_chunks=chunks,
            course_title=course_title,
        )
    except ValueError as exc:
        err = str(exc)
    return _shell(
        request,
        "study_coach.html",
        session,
        active_page="study_coach",
        page_title="Study coach",
        page_subtitle=course_title or str(session.get("course") or ""),
        extra={
            "ai": ai_status(),
            "answer": answer,
            "question": question,
            "error": err,
            "source_count": len(chunks),
        },
    )


# —— Versioned manuals (Slice B) ——


@router.get("/manuals", response_class=HTMLResponse)
async def manuals_list(request: Request, token: str | None = None):
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = manuals_mod.list_manuals(session["tenant_id"])
    return _shell(
        request,
        "manuals.html",
        session,
        active_page="manuals",
        page_title="Technical manuals",
        page_subtitle="Published versions for this school",
        extra={"manuals": rows},
    )


@router.get("/manuals/{manual_id}", response_class=HTMLResponse)
async def manual_read(
    request: Request,
    manual_id: UUID,
    token: str | None = None,
    v: int | None = None,
    focus: str | None = None,
    loop: str | None = None,
    from_attempt: str | None = None,
):
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    manual = manuals_mod.get_manual(session["tenant_id"], manual_id)
    if not manual or (
        manual.get("status") != "published" and not session.get("is_instructor")
    ):
        return _shell(
            request,
            "access.html",
            session,
            active_page="manuals",
            page_title="Not found",
            extra={
                "heading": "Manual not found",
                "message": "No published manual for this school, or it belongs elsewhere.",
            },
        )
    versions = manuals_mod.list_versions(session["tenant_id"], manual_id)
    if v is not None:
        version = manuals_mod.get_version(
            session["tenant_id"], manual_id=manual_id, version=v
        )
        if version and not version.get("is_published") and not session.get("is_instructor"):
            version = None
    else:
        version = manuals_mod.latest_published_version(session["tenant_id"], manual_id)
    if not version:
        return _shell(
            request,
            "access.html",
            session,
            active_page="manuals",
            page_title="No version",
            extra={
                "heading": "No published version yet",
                "message": "A teacher needs to publish a version of this manual.",
            },
        )
    focus_slug = (focus or "").strip().lstrip("#")
    focus_label = focus_slug.replace("-", " ").title() if focus_slug else ""
    token_s = _ensure_token(session)
    in_loop = loop == "1" and bool(from_attempt)
    loop_practice_href = (
        f"/quiz?token={token_s}&practice=1&retry={from_attempt}&loop=1"
        if in_loop
        else f"/quiz?token={token_s}&practice=1"
    )
    loop_graded_href = (
        f"/quiz?token={token_s}&retry={from_attempt}&loop=1"
        if in_loop
        else f"/quiz?token={token_s}"
    )
    if in_loop:
        try:
            from app.modules import adaptive as adaptive_mod

            adaptive_mod.mark_plan_step_done(
                session["tenant_id"],
                str(session.get("subject") or ""),
                path_contains=f"/manuals/{manual_id}",
            )
        except Exception:  # noqa: BLE001
            pass
    try:
        from app.modules import xapi as xapi_mod

        xapi_mod.record_resource_experienced(
            tenant_id=session["tenant_id"],
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            resource_id=manual_id,
            resource_title=str(manual.get("title") or "Manual"),
            resource_kind="manual",
            send_lrs=True,
        )
    except Exception:  # noqa: BLE001
        pass
    return _shell(
        request,
        "manual_read.html",
        session,
        active_page="manuals",
        page_title=str(manual["title"]),
        page_subtitle=f"Version {version['version']}",
        extra={
            "manual": manual,
            "version": version,
            "versions": versions,
            "body_html": manuals_mod.render_body(str(version.get("body_md") or "")),
            "toc": manuals_mod.toc_from_body(str(version.get("body_md") or "")),
            "share_path": (
                manuals_mod.reader_share_path(
                    tenant_id=session["tenant_id"],
                    manual_id=manual_id,
                    version=int(version["version"]),
                    focus=focus_slug,
                )
                if session.get("is_instructor")
                else ""
            ),
            "focus": focus_slug,
            "focus_label": focus_label,
            "remediation_loop": in_loop,
            "loop_practice_href": loop_practice_href,
            "loop_graded_href": loop_graded_href,
        },
    )


@router.get("/read/manuals/{manual_id}", response_class=HTMLResponse)
async def manual_standalone_read(
    request: Request,
    manual_id: UUID,
    tid: UUID,
    sig: str,
    v: int | None = None,
    focus: str | None = None,
):
    """PeBL standalone reader — HMAC-signed, no LTI session required."""
    from app.modules import manuals as manuals_mod

    version_n = int(v or 0)
    if version_n <= 0 or not manuals_mod.verify_reader_token(
        token=sig,
        tenant_id=tid,
        manual_id=manual_id,
        version=version_n,
    ):
        return HTMLResponse(
            "<!doctype html><p>Invalid or expired eBook link.</p>",
            status_code=403,
        )
    manual = manuals_mod.get_manual(tid, manual_id)
    version = manuals_mod.get_version(tid, manual_id=manual_id, version=version_n)
    if not manual or not version or not version.get("is_published"):
        return HTMLResponse(
            "<!doctype html><p>Manual not available.</p>",
            status_code=404,
        )
    focus_slug = (focus or "").strip().lstrip("#")
    body_md = str(version.get("body_md") or "")
    return _TEMPLATES.TemplateResponse(
        "ebook_standalone.html",
        {
            "request": request,
            "manual": manual,
            "version": version,
            "body_html": manuals_mod.render_body(body_md),
            "toc": manuals_mod.toc_from_body(body_md),
            "focus": focus_slug,
            "focus_label": focus_slug.replace("-", " ").title() if focus_slug else "",
        },
    )


@router.get("/teacher/sme", response_class=HTMLResponse)
async def teacher_sme_sources(
    request: Request, token: str | None = None, ok: str | None = None
):
    from app.modules import manuals as manuals_mod
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    tid = session["tenant_id"]
    try:
        sources = sme_mod.list_sources(tid)
    except Exception:  # noqa: BLE001
        sources = []
    course = _bound_course(session) or content.ensure_primary_course(tid)
    lessons = (
        [
            L
            for L in content.list_lessons(tid, course["id"], include_unpublished=True)
            if L.get("lesson_type") != "quiz"
        ]
        if course
        else []
    )
    mans = manuals_mod.list_manuals(tid, include_unpublished=True)
    man_versions: dict[str, list] = {}
    for m in mans:
        man_versions[str(m["id"])] = manuals_mod.list_versions(tid, m["id"])
    return _shell(
        request,
        "teacher_sme.html",
        session,
        active_page="teacher_sme",
        page_title="SME sources",
        page_subtitle="Approved manuals & lessons for the study coach",
        extra={
            "sources": sources,
            "lessons": lessons,
            "manuals": mans,
            "manual_versions": man_versions,
            "ok_message": ok or "",
        },
    )


@router.post("/teacher/sme/manual", response_class=HTMLResponse)
async def teacher_sme_add_manual(request: Request, token: str | None = None):
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    pin_raw = str(form.get("pin_version") or "").strip()
    pin = int(pin_raw) if pin_raw.isdigit() else None
    try:
        sme_mod.add_manual_source(
            session["tenant_id"],
            manual_id=str(form.get("manual_id") or ""),
            pin_version=pin,
            focus_slug=str(form.get("focus_slug") or ""),
            label=str(form.get("label") or ""),
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/sme?token={tok}&ok={msg}", status_code=303
        )
    return RedirectResponse(
        url=f"/teacher/sme?token={tok}&ok=Manual+source+added", status_code=303
    )


@router.post("/teacher/sme/lesson", response_class=HTMLResponse)
async def teacher_sme_add_lesson(request: Request, token: str | None = None):
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        sme_mod.add_lesson_source(
            session["tenant_id"],
            lesson_id=str(form.get("lesson_id") or ""),
            label=str(form.get("label") or ""),
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/sme?token={tok}&ok={msg}", status_code=303
        )
    return RedirectResponse(
        url=f"/teacher/sme?token={tok}&ok=Lesson+source+added", status_code=303
    )


@router.post("/teacher/sme/{source_id}/archive", response_class=HTMLResponse)
async def teacher_sme_archive(
    request: Request, source_id: UUID, token: str | None = None
):
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    sme_mod.archive_source(session["tenant_id"], source_id)
    return RedirectResponse(
        url=f"/teacher/sme?token={tok}&ok=Source+removed", status_code=303
    )


@router.post("/teacher/sme/ensure-defaults", response_class=HTMLResponse)
async def teacher_sme_ensure_defaults(
    request: Request, token: str | None = None
):
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    sme_mod.ensure_default_sources(
        session["tenant_id"],
        course_id=(course or {}).get("id"),
    )
    return RedirectResponse(
        url=f"/teacher/sme?token={tok}&ok=Defaults+loaded", status_code=303
    )


@router.get("/teacher/skills", response_class=HTMLResponse)
async def teacher_skills(
    request: Request, token: str | None = None, ok: str | None = None
):
    from app.modules import manuals as manuals_mod
    from app.modules import skills as skills_mod
    from app.modules.quiz import get_primary_quiz, list_quiz_question_rows

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    tid = session["tenant_id"]
    try:
        skill_rows = skills_mod.ensure_default_skills(tid)
    except Exception:  # noqa: BLE001
        skill_rows = []
    try:
        roles = skills_mod.ensure_default_roles(tid)
    except Exception:  # noqa: BLE001
        roles = []
    course = _bound_course(session) or content.ensure_primary_course(tid)
    lessons = (
        content.list_lessons(tid, course["id"], include_unpublished=True)
        if course
        else []
    )
    reading = [L for L in lessons if L.get("lesson_type") != "quiz"]
    mans = manuals_mod.list_manuals(tid, include_unpublished=True)
    quiz = get_primary_quiz(tid)
    questions = list_quiz_question_rows(tid, quiz["id"]) if quiz else []
    linked = {
        qk: s["skill_code"]
        for s in skill_rows
        for qk in (s.get("question_keys") or [])
    }
    try:
        from app.modules.skills import framework as fw

        framework_imports = fw.list_framework_imports(tid, limit=10)
        to_proposals = fw.list_to_proposals(tid, status="pending", limit=50)
    except Exception:  # noqa: BLE001
        framework_imports = []
        to_proposals = []
    return _shell(
        request,
        "teacher_skills.html",
        session,
        active_page="teacher_skills",
        page_title="Skills registry",
        page_subtitle="Competencies → quiz items → remediation · D23 roles · D08 import",
        extra={
            "skills": skill_rows,
            "roles": roles,
            "lessons": reading,
            "manuals": mans,
            "questions": questions,
            "linked_questions": linked,
            "ok_message": ok or "",
            "framework_imports": framework_imports,
            "to_proposals": to_proposals,
        },
    )


@router.post("/teacher/skills/new", response_class=HTMLResponse)
async def teacher_skills_new(request: Request, token: str | None = None):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        skills_mod.create_skill(
            session["tenant_id"],
            skill_code=str(form.get("skill_code") or ""),
            label=str(form.get("label") or ""),
            description=str(form.get("description") or ""),
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/skills?token={tok}&ok={msg}", status_code=303
        )
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Skill+saved", status_code=303
    )


@router.post("/teacher/skills/{skill_id}/link", response_class=HTMLResponse)
async def teacher_skills_link(
    request: Request, skill_id: UUID, token: str | None = None
):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    qk = str(form.get("question_key") or "").strip()
    try:
        skills_mod.link_question_to_skill(
            session["tenant_id"], question_key=qk, skill_id=skill_id
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/skills?token={tok}&ok={msg}", status_code=303
        )
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Question+linked", status_code=303
    )


@router.post("/teacher/skills/{skill_id}/remediation", response_class=HTMLResponse)
async def teacher_skills_remediation(
    request: Request, skill_id: UUID, token: str | None = None
):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    lesson_id = str(form.get("lesson_id") or "").strip() or None
    manual_id = str(form.get("manual_id") or "").strip() or None
    skills_mod.set_skill_remediation(
        session["tenant_id"],
        skill_id,
        lesson_id=lesson_id,
        manual_id=manual_id,
        manual_focus=str(form.get("manual_focus") or ""),
        prefer_path=str(form.get("prefer_path") or "manuals"),
        teleport_label=str(form.get("teleport_label") or ""),
        teleport_hint=str(form.get("teleport_hint") or ""),
    )
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Remediation+updated", status_code=303
    )


@router.post("/teacher/skills/ensure-defaults", response_class=HTMLResponse)
async def teacher_skills_ensure_defaults(
    request: Request, token: str | None = None
):
    from app.modules import manuals as manuals_mod
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    tid = session["tenant_id"]
    skills_mod.ensure_default_skills(tid)
    skills_mod.ensure_default_roles(tid)
    mans = manuals_mod.list_manuals(tid)
    if mans:
        skills_mod.bind_default_manual(tid, mans[0]["id"])
    course = _bound_course(session) or content.ensure_primary_course(tid)
    if course:
        lessons = content.list_lessons(tid, course["id"])
        for L in lessons:
            if L.get("lesson_type") != "quiz":
                skills_mod.bind_default_lesson(tid, L["id"])
                break
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Defaults+ready", status_code=303
    )


@router.post("/teacher/skills/roles/ensure", response_class=HTMLResponse)
async def teacher_roles_ensure(request: Request, token: str | None = None):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    skills_mod.ensure_default_skills(session["tenant_id"])
    skills_mod.ensure_default_roles(session["tenant_id"])
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Role+pack+ready", status_code=303
    )


@router.post("/teacher/skills/roles/new", response_class=HTMLResponse)
async def teacher_roles_new(request: Request, token: str | None = None):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        skills_mod.create_role_profile(
            session["tenant_id"],
            role_code=str(form.get("role_code") or ""),
            label=str(form.get("label") or ""),
            description=str(form.get("description") or ""),
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/skills?token={tok}&ok={msg}", status_code=303
        )
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Role+saved", status_code=303
    )


@router.post("/teacher/skills/roles/{role_id}/skills", response_class=HTMLResponse)
async def teacher_roles_set_skills(
    request: Request, role_id: UUID, token: str | None = None
):
    from app.modules import skills as skills_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    raw = form.getlist("skill_ids") if hasattr(form, "getlist") else []
    skill_ids = [str(x).strip() for x in raw if str(x).strip()]
    skills_mod.set_role_skills(session["tenant_id"], role_id, skill_ids)
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=Role+skills+updated", status_code=303
    )


@router.post("/teacher/skills/framework/import", response_class=HTMLResponse)
async def teacher_skills_framework_import(
    request: Request, token: str | None = None
):
    from app.modules.skills import framework as fw

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    upload = form.get("file")
    label = str(form.get("source_label") or "").strip() or "teacher upload"
    if upload is None or not getattr(upload, "filename", None):
        return RedirectResponse(
            url=f"/teacher/skills?token={tok}&ok=Choose+a+JSON+or+CSV+file",
            status_code=303,
        )
    raw = await upload.read()
    name = str(upload.filename or "").lower()
    try:
        if name.endswith(".csv"):
            specs = fw.parse_framework_csv(raw)
            fmt = "csv"
        else:
            import json as _json

            specs = fw.parse_framework_json(_json.loads(raw.decode("utf-8-sig")))
            fmt = "json"
        row = fw.create_framework_import(
            session["tenant_id"],
            specs=specs,
            source_label=label,
            format=fmt,
        )
        msg = f"Import+draft+{row['skill_count']}+skills"
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).replace(" ", "+")[:80]
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok={msg}", status_code=303
    )


@router.post(
    "/teacher/skills/framework/{import_id}/approve", response_class=HTMLResponse
)
async def teacher_skills_framework_approve(
    request: Request, import_id: UUID, token: str | None = None
):
    from app.modules.skills import framework as fw

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        result = fw.approve_framework_import(
            session["tenant_id"],
            import_id,
            reviewed_by=str(session.get("name") or "teacher"),
        )
        msg = f"Approved+{result.get('skills_upserted', 0)}+skills"
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).replace(" ", "+")[:80]
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok={msg}", status_code=303
    )


@router.post(
    "/teacher/skills/to-proposals/{proposal_id}/approve",
    response_class=HTMLResponse,
)
async def teacher_to_proposal_approve(
    request: Request, proposal_id: UUID, token: str | None = None
):
    from app.modules.skills import framework as fw

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    fw.approve_to_proposal(session["tenant_id"], proposal_id)
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=TO+mapping+approved", status_code=303
    )


@router.post(
    "/teacher/skills/to-proposals/{proposal_id}/reject",
    response_class=HTMLResponse,
)
async def teacher_to_proposal_reject(
    request: Request, proposal_id: UUID, token: str | None = None
):
    from app.modules.skills import framework as fw

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    fw.reject_to_proposal(session["tenant_id"], proposal_id)
    return RedirectResponse(
        url=f"/teacher/skills?token={tok}&ok=TO+mapping+rejected", status_code=303
    )


@router.get("/teacher/dct", response_class=HTMLResponse)
async def teacher_dct_planner(
    request: Request, token: str | None = None, ok: str | None = None
):
    from app.modules import adaptive as adaptive_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    pack = adaptive_mod.dct_planner_pack(session["tenant_id"])
    return _shell(
        request,
        "teacher_dct.html",
        session,
        active_page="teacher_dct",
        page_title="DCT lesson planner",
        page_subtitle="Skills missing remediation lessons → generate pack",
        extra={
            "missing": pack.get("missing") or [],
            "covered": pack.get("covered") or [],
            "missing_count": pack.get("missing_count") or 0,
            "covered_count": pack.get("covered_count") or 0,
            "ok_message": ok or "",
        },
    )


@router.post("/teacher/dct/generate", response_class=HTMLResponse)
async def teacher_dct_generate(request: Request, token: str | None = None):
    """Draft a remediation micro-lesson for one skill (reuse AI remediation)."""
    from app.modules.ai_assessment import generate_remediation_micro_lesson
    from app.modules import skills as skills_mod
    from app.modules import sme as sme_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    skill_id = str(form.get("skill_id") or "").strip()
    skills = skills_mod.ensure_default_skills(session["tenant_id"])
    skill = next((s for s in skills if str(s.get("id")) == skill_id), None)
    if not skill:
        return RedirectResponse(
            url=f"/teacher/dct?token={tok}&ok=Pick+a+skill",
            status_code=303,
        )
    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    excerpt = ""
    try:
        focus = str(skill.get("manual_focus") or "").strip()
        for src in sme_mod.list_sources(session["tenant_id"])[:8]:
            chunks = sme_mod.resolve_source_chunks(
                session["tenant_id"], [src]
            )
            for ch in chunks:
                if focus and focus in str(ch.get("slug") or ""):
                    excerpt = str(ch.get("body") or "")[:2000]
                    break
                if not excerpt:
                    excerpt = str(ch.get("body") or "")[:1200]
            if focus and excerpt:
                break
    except Exception:  # noqa: BLE001
        excerpt = ""
    try:
        draft = generate_remediation_micro_lesson(
            skill_label=str(skill.get("label") or ""),
            skill_code=str(skill.get("skill_code") or ""),
            skill_description=str(skill.get("description") or ""),
            course_title=str((course or {}).get("title") or ""),
            source_excerpt=excerpt,
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/dct?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    return _shell(
        request,
        "teacher_ai_remediation.html",
        session,
        active_page="teacher_dct",
        page_title="DCT remediation draft",
        page_subtitle=str(skill.get("label") or ""),
        extra={
            "skill_id": str(skill.get("id") or ""),
            "skill_code": str(skill.get("skill_code") or ""),
            "skill_label": str(skill.get("label") or ""),
            "title": draft.get("title") or f"Review: {skill.get('label')}",
            "body_md": draft.get("body_md") or "",
            "summary": draft.get("summary") or "",
            "provider": draft.get("provider") or "local",
            "model": draft.get("model") or "",
            "note": draft.get("note") or "",
            "return_to": "dct",
        },
    )


@router.get("/teacher/manuals", response_class=HTMLResponse)
async def teacher_manuals(
    request: Request, token: str | None = None, ok: str | None = None
):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = manuals_mod.list_manuals(session["tenant_id"], include_unpublished=True)
    enriched = []
    for m in rows:
        vers = manuals_mod.list_versions(session["tenant_id"], m["id"])
        item = dict(m)
        item["versions"] = vers
        item["latest"] = vers[0] if vers else None
        enriched.append(item)
    return _shell(
        request,
        "teacher_manuals.html",
        session,
        active_page="teacher_manuals",
        page_title="Manual versions",
        page_subtitle="Technical manuals with version history",
        extra={"manuals": enriched, "ok_message": ok or ""},
    )


@router.post("/teacher/manuals/new", response_class=HTMLResponse)
async def teacher_manual_new(request: Request, token: str | None = None):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    title = str(form.get("title") or "").strip()
    description = str(form.get("description") or "")
    body_md = str(form.get("body_md") or "")
    publish = str(form.get("publish") or "1") != "0"
    if not title:
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Title+required",
            status_code=303,
        )
    try:
        manuals_mod.create_manual(
            tenant_id=session["tenant_id"],
            title=title,
            description=description,
            body_md=body_md,
            subject=str(session.get("subject") or ""),
            publish=publish,
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok={msg}",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok=Manual+created",
        status_code=303,
    )


@router.post("/teacher/manuals/from-pdf", response_class=HTMLResponse)
async def teacher_manual_from_pdf(
    request: Request, token: str | None = None
):
    """D10: PDF/text upload → versioned manual (no quiz generation)."""
    from app.modules import manuals as manuals_mod
    from app.modules.ai_assessment import extract_text_from_bytes

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    upload = form.get("document")
    title = str(form.get("title") or "").strip()
    description = str(form.get("description") or "").strip()
    publish = str(form.get("publish") or "1") != "0"
    manual_id = str(form.get("manual_id") or "").strip()
    if upload is None or not getattr(upload, "filename", None):
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Choose+a+PDF+or+text+file",
            status_code=303,
        )
    fname = str(upload.filename or "upload.pdf")
    data = await upload.read()
    try:
        extracted = extract_text_from_bytes(data, filename=fname)
        body = str(extracted.get("text") or "").strip()
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    if not body:
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=No+text+extracted",
            status_code=303,
        )
    # Cap stored body for pilot manuals
    if len(body) > 120_000:
        body = body[:120_000] + "\n\n…(truncated)"
    if not title:
        title = Path(fname).stem.replace("_", " ").replace("-", " ").strip() or "Imported manual"
    try:
        if manual_id:
            manuals_mod.add_version(
                tenant_id=session["tenant_id"],
                manual_id=manual_id,
                body_md=body,
                changelog=f"Imported from {fname}",
                subject=str(session.get("subject") or ""),
                publish=publish,
            )
            msg = "Version+from+PDF+added"
        else:
            manuals_mod.create_manual(
                tenant_id=session["tenant_id"],
                title=title,
                description=description or f"Imported from {fname}",
                body_md=body,
                subject=str(session.get("subject") or ""),
                publish=publish,
            )
            msg = "Manual+from+PDF+created"
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok={msg}",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok={msg}",
        status_code=303,
    )


@router.post("/teacher/manuals/{manual_id}/versions", response_class=HTMLResponse)
async def teacher_manual_add_version(
    request: Request, manual_id: UUID, token: str | None = None
):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    body_md = str(form.get("body_md") or "")
    changelog = str(form.get("changelog") or "")
    publish = str(form.get("publish") or "") in {"1", "true", "on", "yes"}
    try:
        manuals_mod.add_version(
            tenant_id=session["tenant_id"],
            manual_id=manual_id,
            body_md=body_md,
            changelog=changelog,
            subject=str(session.get("subject") or ""),
            publish=publish,
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok={msg}",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok=Version+added",
        status_code=303,
    )


@router.post(
    "/teacher/manuals/{manual_id}/versions/{version}/publish",
    response_class=HTMLResponse,
)
async def teacher_manual_publish_version(
    request: Request, manual_id: UUID, version: int, token: str | None = None
):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    manuals_mod.publish_version(
        tenant_id=session["tenant_id"], manual_id=manual_id, version=version
    )
    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok=Version+published",
        status_code=303,
    )
