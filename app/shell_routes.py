"""Nine product screens in the cinematic shell (Syne / Outfit / amber)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.templating import Jinja2Templates

from app import db
from app.modules import content
from app.modules.quiz import MAX_SCORE, QUESTIONS, questions_for_tenant
from app.modules.school import (
    class_moodle_filter_labels,
    class_workspace_snapshot,
    create_class,
    find_lead_class_for_teacher,
    get_lti_context_binding,
    list_classes_with_roster,
    list_lti_context_bindings,
    list_school_students,
    list_teachers,
    match_class_for_context,
    resolve_lti_context_binding,
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


def _opt_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

_TEMPLATES = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[1] / "templates")
)


def _export_question_rows(session: dict[str, Any]) -> list[dict[str, Any]]:
    from app.modules import quiz as quiz_mod

    rows = []
    for q in quiz_mod.tenant_authored_questions(
        session["tenant_id"], course_id=session.get("edvidura_course_id")
    ):
        rows.append(
            {
                "id": q.id,
                "prompt": q.prompt,
                "choices": list(q.choices),
                "correct_index": q.correct_index,
                "qtype": q.qtype,
                "correct_text": q.correct_text,
                "topic": q.topic,
            }
        )
    return rows or [
        {
            "id": q.id,
            "prompt": q.prompt,
            "choices": list(q.choices),
            "correct_index": q.correct_index,
            "qtype": q.qtype,
            "topic": q.topic,
        }
        for q in quiz_mod.QUESTIONS
    ]


def _ensure_token(session: dict[str, Any]) -> str:
    token = str(session.get("quiz_token") or "")
    if token and load_quiz_context(token):
        # Refresh cached payload so class binding changes stick for this token
        payload = {**session, "quiz_token": token}
        try:
            from app.launch_cache import LAUNCH_CACHE
            from app.quiz_routes import QUIZ_CTX_PREFIX

            LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{token}", payload, exp=3600)
            db.save_quiz_context(token, payload, ttl_sec=3600)
        except Exception:  # noqa: BLE001
            pass
        return token
    token = store_quiz_context(session)
    session["quiz_token"] = token
    return token


def _persist_session(request: Request, session: dict[str, Any]) -> str:
    """Write quiz session to Starlette + token cache.

    Full payload (incl. answer keys) stays server-side; cookie is key-stripped.
    Also slides launch-snapshot TTL so AGS survives long class sessions.
    """
    from app.modules.quiz.service import cookie_safe_session

    tok = _ensure_token(session)
    payload = {**session, "quiz_token": tok}
    request.session[SESSION_KEY] = cookie_safe_session(payload)
    try:
        from app.launch_cache import LAUNCH_CACHE
        from app.quiz_routes import QUIZ_CTX_PREFIX

        LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{tok}", payload, exp=3600)
        db.save_quiz_context(tok, payload, ttl_sec=3600)
    except Exception:  # noqa: BLE001
        pass
    launch_id = str(session.get("launch_id") or "").strip()
    if launch_id:
        try:
            db.touch_launch_snapshot(
                launch_id, tenant_id=session.get("tenant_id")
            )
        except Exception:  # noqa: BLE001
            pass
    return tok


def _ensure_launch_binding(session: dict[str, Any]) -> dict[str, Any]:
    """Resolve LTI context → class/course (delegates to portable school module)."""
    from app.modules.school import enrich_session_from_launch

    enriched = enrich_session_from_launch(session)
    session.update(enriched)
    return session


def _bound_course(session: dict[str, Any]) -> dict[str, Any] | None:
    """Curriculum for this launch: bound class course only (no wrong-class fallback)."""
    _ensure_launch_binding(session)
    course_id = str(session.get("edvidura_course_id") or "").strip()
    if course_id:
        row = content.get_course(session["tenant_id"], course_id)
        if row:
            return row
    class_id = str(session.get("class_id") or "").strip()
    if class_id:
        try:
            snap = class_workspace_snapshot(session["tenant_id"], class_id)
        except Exception:  # noqa: BLE001
            snap = None
        if snap and snap.get("course"):
            session["edvidura_course_id"] = str(snap["course"]["id"])
            return snap["course"]
        return None
    # Unbound launch (no Moodle class): keep legacy primary course
    return content.get_primary_course(session["tenant_id"])


def _default_class_id(session: dict[str, Any], class_id: str | None) -> str | None:
    """Prefer explicit filter; else LTI-bound class from launch."""
    if class_id and str(class_id).strip():
        return str(class_id).strip()
    _ensure_launch_binding(session)
    bound = str(session.get("class_id") or "").strip()
    return bound or None


def _context_heading(
    session: dict[str, Any], course: dict[str, Any] | None = None
) -> str:
    """Primary class/course title for hub and page chrome."""
    class_name = str(session.get("class_name") or "").strip()
    subject = str(session.get("academic_subject") or "").strip()
    course_title = str((course or {}).get("title") or "").strip()
    if class_name and subject:
        return f"{class_name} · {subject}"
    if course_title:
        return course_title
    if class_name:
        return class_name
    return str(session.get("course") or "Course").strip() or "Course"


def _continue_cta_label(
    *,
    lesson_title: str,
    lesson_type: str,
    completed_count: int,
    gap_plan: bool = False,
    adaptive: bool = False,
) -> str:
    title = (lesson_title or "").strip()
    if len(title) > 42:
        title = title[:39].rstrip() + "…"
    if gap_plan:
        return f"Continue plan: {title}" if title else "Continue my plan"
    if adaptive:
        return f"Recommended: {title}" if title else "Recommended gap lesson"
    if lesson_type == "quiz":
        return f"Take quiz: {title}" if title else "Start quiz"
    if completed_count:
        return f"Continue: {title}" if title else "Continue learning"
    return f"Start: {title}" if title else "Start lessons"


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

                cid = str(session.get("class_id") or "").strip()
                mans = (
                    manuals_mod.list_manuals_for_class(session["tenant_id"], cid)
                    if cid
                    else []
                )
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
                course_id=session.get("edvidura_course_id") or None,
                course_label=str(session.get("course") or ""),
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
            if gap_path and gap_path.get("active"):
                done = int(gap_path.get("done_count") or 0)
                total = int(gap_path.get("step_count") or len(gap_path.get("steps") or []))
                up_next_title = "My learning plan"
                # Prefer full plan page for discoverability (Phase B1)
                up_next_href = f"/learn/gap?token={token}"
                up_next_meta = (
                    f"Step {done + 1} of {total} · open plan"
                    if total
                    else "Open your plan"
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
    from app.modules.tenancy import attach_to_session, defaults_for_segment

    try:
        attach_to_session(session)
    except Exception:  # noqa: BLE001
        session.setdefault("segment", "school")
        session.setdefault(
            "capabilities",
            defaults_for_segment(session.get("segment") or "school"),
        )
        session.setdefault("is_corporate", False)

    caps = session.get("capabilities") or defaults_for_segment(
        session.get("segment") or "school"
    )
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
        "segment": session.get("segment") or "school",
        "is_corporate": bool(session.get("is_corporate")),
        "caps": caps,
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

        cid = str(session.get("class_id") or "").strip()
        mans_for_meta = (
            manuals_mod.list_manuals_for_class(session["tenant_id"], cid)
            if cid
            else manuals_mod.list_manuals(session["tenant_id"])
        )
        manuals_meta = [
            {"title": m.get("title"), "id": str(m.get("id"))}
            for m in mans_for_meta
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
async def launch_hub(
    request: Request,
    token: str | None = None,
    ui: str | None = None,
):
    from app.frontend_handoff import launch_destination, spa_enabled

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    _ensure_launch_binding(session)
    token_s = _persist_session(request, session)
    if spa_enabled() and (ui or "").strip().lower() != "shell":
        return RedirectResponse(
            url=launch_destination(token_s), status_code=303
        )
    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    mine = [r for r in rows if str(r.get("subject")) == str(session.get("subject"))]
    last = mine[0] if mine else None
    if last and not session.get("last_result_id"):
        session["last_result_id"] = str(last["id"])
        _persist_session(request, session)

    from app.modules.tenancy import attach_to_session, can

    try:
        attach_to_session(session)
    except Exception:  # noqa: BLE001
        pass
    caps = session.get("capabilities") or {}

    course = _bound_course(session)
    progress = None
    if can(caps, "lessons"):
        continue_href = f"/lessons?token={token_s}"
        continue_label = "Start lessons"
    elif can(caps, "video_library"):
        continue_href = f"/learn/micro?token={token_s}"
        continue_label = (
            "Open video library"
            if session.get("is_corporate")
            else "Start micro-learning"
        )
    else:
        continue_href = f"/launch-hub?token={token_s}"
        continue_label = "Continue"
    chapter_items: list[dict[str, Any]] = []
    gap_path = None
    adaptive_next = None
    if course and can(caps, "lessons"):
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
            if can(caps, "quiz_graded"):
                continue_href = f"/quiz?token={token_s}"
                continue_label = _continue_cta_label(
                    lesson_title=str(nxt.get("title") or "Quiz"),
                    lesson_type="quiz",
                    completed_count=int(progress.get("completed_count") or 0),
                )
            elif can(caps, "video_library"):
                continue_href = f"/learn/micro?token={token_s}"
                continue_label = "Open video library"
        elif nxt:
            continue_href = f"/lessons/{nxt['id']}?token={token_s}"
            continue_label = _continue_cta_label(
                lesson_title=str(nxt.get("title") or ""),
                lesson_type=str(nxt.get("lesson_type") or "article"),
                completed_count=int(progress.get("completed_count") or 0),
            )
        elif progress.get("all_lessons_done"):
            if can(caps, "quiz_graded"):
                continue_href = f"/quiz?token={token_s}"
                continue_label = _continue_cta_label(
                    lesson_title="Course quiz",
                    lesson_type="quiz",
                    completed_count=int(progress.get("completed_count") or 0),
                )
            elif can(caps, "video_library"):
                continue_href = f"/learn/micro?token={token_s}"
                continue_label = "Open video library"

        shell_bits = _shell_progress(session, token_s)
        gap_path = shell_bits.get("gap_path")
        adaptive_next = shell_bits.get("adaptive_next")
        if (
            can(caps, "study_plan")
            and gap_path
            and gap_path.get("active")
            and gap_path.get("first_href")
        ):
            continue_href = gap_path["first_href"]
            continue_label = _continue_cta_label(
                lesson_title=str(
                    gap_path.get("first_title") or gap_path.get("title") or "My plan"
                ),
                lesson_type="article",
                completed_count=int(progress.get("completed_count") or 0),
                gap_plan=True,
            )
        elif (
            can(caps, "lessons")
            and adaptive_next
            and adaptive_next.get("mode") == "adaptive"
            and adaptive_next.get("lesson_id")
        ):
            continue_href = f"/lessons/{adaptive_next['lesson_id']}?token={token_s}"
            continue_label = _continue_cta_label(
                lesson_title=str(adaptive_next.get("title") or ""),
                lesson_type="article",
                completed_count=int(progress.get("completed_count") or 0),
                adaptive=True,
            )
            aid = str(adaptive_next["lesson_id"])
            for item in chapter_items:
                if item["id"] == aid:
                    item["now"] = True
                    item["adaptive"] = True
                elif item.get("now") and item["id"] != aid:
                    item["now"] = False

    context_heading = _context_heading(session, course)
    page_sub = context_heading
    class_snap = None
    bound_class_id = str(session.get("class_id") or "").strip()
    if bound_class_id:
        try:
            class_snap = class_workspace_snapshot(
                session["tenant_id"], bound_class_id
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Warning: class_workspace_snapshot failed: {exc}", flush=True)
            class_snap = None
    # Instructor safety net: never show empty hub when Class 8 exists
    if (
        class_snap is None
        and (session.get("is_instructor") or session.get("is_school_admin"))
    ):
        try:
            matched = match_class_for_context(
                session["tenant_id"],
                context_label="RHS-C08",
                context_title="Class 8",
            )
            if matched:
                session["class_id"] = str(matched["id"])
                session["class_code"] = matched.get("class_code") or ""
                session["class_name"] = matched.get("class_name") or ""
                session["academic_subject"] = matched.get("subject") or ""
                if matched.get("course_id"):
                    session["edvidura_course_id"] = str(matched["course_id"])
                class_snap = class_workspace_snapshot(
                    session["tenant_id"], matched["id"]
                )
                course = _bound_course(session) or course
        except Exception as exc:  # noqa: BLE001
            print(f"Warning: instructor Class 8 fallback failed: {exc}", flush=True)
    if class_snap and class_snap.get("heading"):
        page_sub = class_snap["heading"]
        context_heading = class_snap["heading"]

    # Persist resolved binding so later pages stay class-scoped
    _persist_session(request, session)

    # For admin hub: load classes/roster overview
    admin_classes: list[Any] = []
    admin_bindings: list[Any] = []
    admin_counts: dict[str, int] = {}
    if session.get("is_school_admin"):
        try:
            admin_classes = list_classes_with_roster(session["tenant_id"])
            admin_bindings = list_lti_context_bindings(session["tenant_id"])
            admin_counts = {
                "class_count": len(admin_classes),
                "teacher_count": sum(len(c.get("teachers", [])) for c in admin_classes),
                "student_count": sum(len(c.get("students", [])) for c in admin_classes),
                "lesson_count": 0,
            }
        except Exception as exc:  # noqa: BLE001
            print(f"Warning: admin hub classes load failed: {exc}", flush=True)

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
            "context_heading": context_heading,
            "class_snap": class_snap,
            "gap_path": gap_path,
            "adaptive_next": adaptive_next,
            # admin dashboard extras
            "classes": admin_classes,
            "bindings": admin_bindings,
            **admin_counts,
        },
    )


@router.get("/lessons", response_class=HTMLResponse)
async def lessons_list(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    from app.modules.tenancy import attach_to_session, can

    try:
        attach_to_session(session)
    except Exception:  # noqa: BLE001
        pass
    token_s = _ensure_token(session)
    if not can(session.get("capabilities"), "lessons"):
        dest = (
            f"/learn/micro?token={token_s}"
            if can(session.get("capabilities"), "video_library")
            else f"/launch-hub?token={token_s}"
        )
        return RedirectResponse(url=dest, status_code=303)
    _ensure_launch_binding(session)
    _persist_session(request, session)
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
        page_subtitle=_context_heading(session, course),
        extra={
            "course_row": course,
            "lesson_items": items,
            "progress": progress,
            "order_mode": progress.get("order_mode") or "linear",
            "context_heading": _context_heading(session, course),
            "path_blurb": (
                str(course.get("description") or "").strip()
                or str(session.get("academic_subject") or "").strip()
                or str(course.get("title") or "").strip()
            ),
            "bound_subject": session.get("academic_subject") or "",
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
        try:
            from app.modules import signals as signals_mod

            signals_mod.note_learner_activity(
                session["tenant_id"],
                subject=subject,
                channel="moodle",
                quiz_token=qtok,
                course_id=lesson.get("course_id"),
                course_label=str(session.get("course") or ""),
                first_lesson_id=str(lesson.get("id") or "") or None,
            )
        except Exception:  # noqa: BLE001
            pass
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
    personalized: str | None = None,
):
    """Serve the teacher question bank; AI personal quiz only when bank is empty
    or ``personalized=1`` is requested.
    """
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    from app.modules.quiz.service import tenant_authored_questions
    from app.modules.specials import (
        failed_question_ids,
        ghost_coach_gate,
    )
    from app.modules.tenancy import attach_to_session, can
    from app.settings import get_settings

    try:
        attach_to_session(session)
    except Exception:  # noqa: BLE001
        pass
    token_s = _ensure_token(session)
    caps = session.get("capabilities") or {}
    is_practice = practice == "1"
    if is_practice and not can(caps, "quiz_practice"):
        return RedirectResponse(
            url=f"/launch-hub?token={token_s}", status_code=303
        )
    if (not is_practice) and not can(caps, "quiz_graded"):
        # Corporate / video-only tenants: no graded exams.
        dest = (
            f"/learn/micro?token={token_s}"
            if can(caps, "video_library")
            else f"/launch-hub?token={token_s}"
        )
        return RedirectResponse(url=dest, status_code=303)

    progress = _shell_progress(session, token_s).get("shell_progress")
    force_personal = personalized == "1"
    hard_gate = bool(get_settings().ghost_coach_hard_gate) and can(
        caps, "ghost_coach_gate"
    )
    allow_force = (not hard_gate) and force == "1"
    coach = ghost_coach_gate(
        progress,
        bypass=bool(
            session.get("is_instructor")
            or allow_force
            or is_practice
            or not can(caps, "ghost_coach_gate")
        ),
    )
    if coach.get("gate") and not is_practice and not allow_force:
        return _shell(
            request,
            "quiz_gate.html",
            session,
            active_page="quiz_session",
            page_title="Almost ready",
            page_subtitle="Ghost coach",
            extra={
                "coach": coach,
                "practice": is_practice,
                "hard_gate": hard_gate,
            },
        )

    personal_meta: dict[str, Any] = {}
    personal_err = ""
    questions: list[Any] = []
    retry_ids: list[str] = []
    use_personal = False
    course_id = session.get("edvidura_course_id") or None
    authored = tenant_authored_questions(
        session.get("tenant_id"), course_id=course_id
    )

    if retry:
        # Remediation: prefer missed items from this student's last attempt bank.
        try:
            prev = db.get_quiz_attempt(session["tenant_id"], UUID(str(retry)))
        except Exception:  # noqa: BLE001
            prev = None
        if prev and str(prev.get("subject")) == str(session.get("subject")):
            ans = prev.get("answers") if isinstance(prev.get("answers"), dict) else {}
            retry_ids = failed_question_ids(ans)
            bank = ans.get("question_bank") if isinstance(ans, dict) else None
            if retry_ids and isinstance(bank, list) and bank:
                from app.modules.quiz.personalized import questions_from_payload

                all_q = questions_from_payload(bank)
                questions = [q for q in all_q if q.id in retry_ids]
                personal_meta = (
                    ans.get("personal_meta")
                    if isinstance(ans.get("personal_meta"), dict)
                    else {}
                )
                session["personal_quiz_bank"] = {
                    "subject": str(session.get("subject") or ""),
                    "questions": [
                        {
                            "id": q.id,
                            "prompt": q.prompt,
                            "choices": list(q.choices),
                            "correct_index": q.correct_index,
                        }
                        for q in questions
                    ],
                    "meta": personal_meta,
                }
                session["quiz_token"] = token_s
                _persist_session(request, session)
                use_personal = True

    # Teacher bank wins (what they edited in Content). Serve ~5–6 items per
    # student attempt (not the whole bank). AI personal only if bank is empty
    # or personalized=1 was requested.
    if not questions and authored and not force_personal:
        from app.modules.quiz.service import sample_questions_for_student

        questions = sample_questions_for_student(
            authored,
            subject=str(session.get("subject") or ""),
            salt=str(course_id or ""),
        )
        personal_meta = {
            "source": "teacher_bank",
            "bank_total": len(authored),
            "served_count": len(questions),
        }
        session["personal_quiz_bank"] = {
            "subject": str(session.get("subject") or ""),
            "questions": [
                {
                    "id": q.id,
                    "prompt": q.prompt,
                    "choices": list(q.choices),
                    "correct_index": q.correct_index,
                }
                for q in questions
            ],
            "meta": personal_meta,
        }
        session["quiz_token"] = token_s
        _persist_session(request, session)
        # Session bank required so grading uses this subset, not all 22.
        use_personal = True

    if not questions and (force_personal or not authored):
        use_personal = True
        try:
            from app.modules import content
            from app.modules import quiz as quiz_mod
            from app.modules.quiz.service import STUDENT_QUIZ_SIZE

            built = quiz_mod.generate_personalized_quiz(
                tenant_id=session["tenant_id"],
                subject=str(session.get("subject") or ""),
                course_id=course_id,
                list_lessons_fn=content.list_lessons,
                get_bound_course_fn=content.get_bound_course,
                course_label=str(session.get("course") or ""),
                learner_name=str(session.get("learner_name") or ""),
                count=STUDENT_QUIZ_SIZE,
            )
            questions = list(built["questions"])
            from app.modules.ai_assessment import difficulty_label as _diff_label

            personal_meta = {
                "difficulty": built.get("difficulty"),
                "difficulty_label": built.get("difficulty_label")
                or _diff_label(built.get("difficulty")),
                "difficulty_source": built.get("difficulty_source"),
                "complexity": built.get("complexity"),
                "complexity_label": built.get("complexity_label"),
                "complexity_source": built.get("complexity_source"),
                "topics": built.get("topics") or [],
                "focus_topics": built.get("focus_topics") or [],
                "coverage_units": built.get("coverage_units") or [],
                "coverage_unit_count": built.get("coverage_unit_count") or 0,
                "covered_unit_count": built.get("covered_unit_count") or 0,
                "covers_all_pages": bool(built.get("covers_all_pages")),
                "covers_all_topics": bool(built.get("covers_all_topics", True)),
                "provider": built.get("provider"),
                "model": built.get("model"),
                "course_title": built.get("course_title"),
                "source": "personalized_ai",
                "served_count": len(questions),
                "study_plan_valid": bool(built.get("study_plan_valid")),
                "study_plan_validation": built.get("study_plan_validation") or {},
            }
            session["personal_quiz_bank"] = {
                "subject": str(session.get("subject") or ""),
                "questions": built.get("question_payload") or [
                    {
                        "id": q.id,
                        "prompt": q.prompt,
                        "choices": list(q.choices),
                        "correct_index": q.correct_index,
                        "topic": getattr(q, "topic", "") or "",
                    }
                    for q in questions
                ],
                "meta": personal_meta,
            }
            session["quiz_token"] = token_s
            _persist_session(request, session)
        except ValueError as exc:
            personal_err = str(exc)
            questions = list(
                questions_for_tenant(
                    session.get("tenant_id"),
                    course_id=course_id,
                )
            )
            use_personal = False
        except Exception as exc:  # noqa: BLE001
            personal_err = f"Could not build your quiz: {exc}"
            questions = list(
                questions_for_tenant(
                    session.get("tenant_id"),
                    course_id=course_id,
                )
            )
            use_personal = False

    if not questions:
        questions = list(
            questions_for_tenant(
                session.get("tenant_id"),
                course_id=course_id,
            )
        )
        use_personal = False

    in_loop = loop == "1"
    is_personalized = bool(use_personal)
    if is_practice and in_loop:
        page_title = "Practice (remediation)"
        page_subtitle = "Sandbox — no Moodle grade sync · then graded retry"
    elif is_practice:
        page_title = "Practice quiz"
        page_subtitle = f"{len(questions)} question(s) · no Moodle sync"
    elif retry_ids and in_loop:
        page_title = "Take the quiz"
        page_subtitle = f"Graded retry · {len(questions)} missed item(s)"
    elif retry_ids:
        page_title = "Take the quiz"
        page_subtitle = f"Retry {len(questions)} missed item(s)"
    elif is_personalized and personal_meta.get("source") == "teacher_bank":
        page_title = "Take the quiz"
        page_subtitle = (
            f"{len(questions)} of {personal_meta.get('bank_total') or len(questions)} "
            "from your teacher"
        )
    elif is_personalized:
        page_title = "Take the quiz"
        page_subtitle = (
            f"{personal_meta.get('difficulty_label') or personal_meta.get('difficulty') or 'core'} · "
            "unique for you · all class topics"
        )
    else:
        page_title = "Take the quiz"
        page_subtitle = f"{len(questions)} question(s) from your teacher"

    quiz_quota: dict[str, Any] = {}
    group_assignment: dict[str, Any] | None = None
    quiz_assigned = False
    quiz_blocked = ""
    try:
        from app.modules import lti_groups as groups_mod
        from app.modules import quiz as quiz_mod

        staff = bool(session.get("is_instructor") or session.get("is_school_admin"))
        access = groups_mod.activity_access(
            session["tenant_id"],
            str(session.get("subject") or ""),
            "quiz",
            "school-quiz",
            is_staff=staff,
        )
        quiz_quota = quiz_mod.attempt_quota(
            session["tenant_id"],
            str(session.get("subject") or ""),
            practice=is_practice,
        )
        group_assignment = access.get("assignment")
        quiz_assigned = access.get("reason") == "assigned"
        if not is_practice and not access.get("allowed"):
            quiz_blocked = "not_assigned"
        elif not is_practice and not quiz_quota.get("allowed"):
            quiz_blocked = "attempt_limit"
    except Exception:  # noqa: BLE001
        quiz_quota = {}

    return _shell(
        request,
        "quiz_session.html",
        session,
        active_page="quiz_session",
        page_title=page_title,
        page_subtitle=page_subtitle,
        extra={
            "questions": questions,
            "max_score": len(questions),
            "practice_mode": is_practice,
            "personalized_mode": is_personalized,
            "personal_meta": personal_meta,
            "personal_error": personal_err,
            "retry_from": retry or "",
            "remediation_loop": in_loop,
            "coach_warn": coach.get("warn"),
            "quiz_quota": quiz_quota,
            "group_assignment": group_assignment,
            "quiz_assigned": quiz_assigned,
            "quiz_blocked": quiz_blocked,
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
    token_s = _persist_session(request, session)
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

        cid = str(session.get("class_id") or "").strip()
        mans = (
            manuals_mod.list_manuals_for_class(session["tenant_id"], cid)
            if cid
            else []
        )
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
        if not is_practice:
            try:
                from app.modules import signals as signals_mod

                fused = signals_mod.note_learner_activity(
                    session["tenant_id"],
                    subject=str(session.get("subject") or attempt.get("subject") or ""),
                    channel="quiz",
                    quiz_token=token_s,
                    course_id=session.get("edvidura_course_id") or None,
                    course_label=str(session.get("course") or ""),
                    first_lesson_id=first_lesson_id,
                )
                if fused.get("plan") and fused["plan"].get("steps"):
                    gap_path = fused["plan"]
                    saved = fused["plan"]
            except Exception:  # noqa: BLE001
                pass
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
    learner_gaps: list[Any] = []
    try:
        from app.modules import signals as signals_mod

        learner_gaps = signals_mod.class_learner_gap_board(
            session["tenant_id"],
            learners=learners,
            course_id=(course_row or {}).get("id")
            or session.get("edvidura_course_id"),
            course_label=(course or "").strip()
            or str((course_row or {}).get("title") or ""),
            limit=20,
        )
    except Exception:  # noqa: BLE001
        learner_gaps = []
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
            "learner_gaps": learner_gaps,
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
        _persist_session(request, session)
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


@router.get("/quiz/result/{attempt_id}/ags.json")
async def quiz_result_ags_json(
    request: Request,
    attempt_id: UUID,
    token: str | None = None,
):
    """Poll Moodle AGS sync status after background passback (thin JSON)."""
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)
    if not attempt:
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
    practice = bool((attempt.get("answers") or {}).get("practice"))
    grade_sent = bool(attempt.get("grade_sent"))
    grade_error = (attempt.get("grade_error") or "").strip() or None
    ags_available = bool(session.get("ags_available"))
    if practice:
        status = "skipped_practice"
    elif grade_sent:
        status = "synced"
    elif grade_error:
        status = "failed"
    elif ags_available:
        status = "pending"
    else:
        status = "ags_off"
    return JSONResponse(
        {
            "ok": True,
            "status": status,
            "grade_sent": grade_sent,
            "grade_error": grade_error,
            "ags_available": ags_available,
            "practice": practice,
        }
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
    from app.modules import lti_groups as groups_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    settings = get_settings()
    groups = []
    assignments = []
    try:
        ctx = str(session.get("lti_context_id") or "") or None
        groups = groups_mod.list_groups(session["tenant_id"], lti_context_id=ctx)
        assignments = groups_mod.list_assignments(session["tenant_id"])
    except Exception:  # noqa: BLE001
        groups, assignments = [], []
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
            "ags_available": bool(session.get("ags_available")),
            "nrps_available": bool(session.get("nrps_available")),
            "gs_available": bool(session.get("gs_available")),
            "groups": groups,
            "group_assignments": assignments,
        },
    )


@router.post("/teacher/groups", response_class=HTMLResponse)
async def teacher_groups_create(request: Request, token: str | None = None):
    from app.modules import lti_groups as groups_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        groups_mod.create_local_group(
            session["tenant_id"],
            lti_context_id=str(session.get("lti_context_id") or "local"),
            name=str(form.get("name") or "Group"),
            class_id=str(session.get("class_id") or "") or None,
        )
        msg = "Group+created"
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).replace(" ", "+")
    return RedirectResponse(url=f"/lti-integration?token={tok}&ok={msg}", status_code=303)


@router.post("/teacher/groups/assign", response_class=HTMLResponse)
async def teacher_groups_assign(request: Request, token: str | None = None):
    from app.modules import lti_groups as groups_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    try:
        groups_mod.assign_activity(
            session["tenant_id"],
            group_id=str(form.get("group_id") or ""),
            activity_type=str(form.get("activity_type") or "quiz"),
            activity_id=str(form.get("activity_id") or "school-quiz"),
            title=str(form.get("title") or "Class quiz"),
        )
        msg = "Group+assignment+saved"
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).replace(" ", "+")
    return RedirectResponse(url=f"/lti-integration?token={tok}&ok={msg}", status_code=303)


@router.get("/teacher/quiz/export.md")
async def teacher_quiz_export_md(request: Request, token: str | None = None):
    from app.modules import ai_assessment as ai_mod
    from app.modules import quiz as quiz_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = _export_question_rows(session)
    body = ai_mod.assessment_markdown(
        rows,
        title=str(session.get("class_name") or "Assessment"),
        course=str(session.get("course") or ""),
        include_answers=True,
    )
    return StreamingResponse(
        iter([body.encode("utf-8")]),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=edvidura-assessment.md"},
    )


@router.get("/teacher/quiz/export.pdf")
async def teacher_quiz_export_pdf(request: Request, token: str | None = None):
    from app.modules import ai_assessment as ai_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    rows = _export_question_rows(session)
    blob = ai_mod.assessment_pdf(
        rows,
        title=str(session.get("class_name") or "Assessment"),
        course=str(session.get("course") or ""),
        include_answers=False,
    )
    return StreamingResponse(
        iter([blob]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=edvidura-assessment.pdf"},
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

    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    dash = analytics_mod.tenant_dashboard(session["tenant_id"])
    live = analytics_mod.live_school_users(session["tenant_id"])
    return _shell(
        request,
        "school_admin_analytics.html",
        session,
        active_page="school_admin_analytics",
        page_title="School analytics",
        page_subtitle="Live people + attempts · one school",
        extra={
            "dash": dash,
            "live": live,
        },
    )


@router.get("/school-admin/integrations", response_class=HTMLResponse)
async def school_admin_integrations(
    request: Request,
    token: str | None = None,
    ok: str | None = None,
    probe: str | None = None,
):
    """Metabase/Yet moved to /ops — school admins use Activity."""
    _ = ok
    _ = probe
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    return RedirectResponse(
        url=f"/school-admin/activity?token={tok}",
        status_code=303,
    )


@router.post("/school-admin/integrations/retry-lrs", response_class=HTMLResponse)
async def school_admin_retry_lrs(request: Request, token: str | None = None):
    """LRS retry is owner-only at POST /ops/retry-lrs."""
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("token") or token or _ensure_token(session))
    return RedirectResponse(
        url=f"/school-admin/activity?token={tok}",
        status_code=303,
    )


@router.get("/school-admin/activity", response_class=HTMLResponse)
async def school_admin_activity(
    request: Request,
    token: str | None = None,
    subject: str | None = None,
    channel: str | None = None,
):
    from app.modules import xapi as xapi_mod

    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    filt = (subject or "").strip() or None
    ch = (channel or "").strip() or None
    rows = xapi_mod.activity_feed(
        session["tenant_id"], subject=filt, limit=150, channel=ch
    )
    return _shell(
        request,
        "activity_recordings.html",
        session,
        active_page="school_admin_analytics",
        page_title="Activity recordings",
        page_subtitle="School xAPI evidence",
        extra={
            "rows": rows,
            "scope_label": (
                "School admin · coach chat"
                if ch in {"coach", "study_coach", "chat"}
                else "School admin · all learners"
            ),
            "back_href": "/school-admin/analytics",
            "show_actor": True,
            "show_subject_filter": True,
            "filter_subject": filt or "",
            "channel": ch or "",
            "show_channel_filter": True,
        },
    )


@router.get("/school-admin/analytics/live.json")
async def school_admin_analytics_live(request: Request, token: str | None = None):
    from fastapi.responses import JSONResponse

    from app.modules import analytics as analytics_mod

    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    return JSONResponse(analytics_mod.live_school_users(session["tenant_id"]))


@router.get("/learn/analytics", response_class=HTMLResponse)
async def learner_analytics(request: Request, token: str | None = None):
    from app.modules import analytics as analytics_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    qtok = _ensure_token(session)
    dash = analytics_mod.learner_dashboard(
        session["tenant_id"], str(session.get("subject") or "")
    )
    first_lesson_id = None
    try:
        course = _bound_course(session)
        if course:
            for L in content.list_lessons(session["tenant_id"], course["id"]) or []:
                if L.get("lesson_type") != "quiz":
                    first_lesson_id = str(L["id"])
                    break
    except Exception:  # noqa: BLE001
        first_lesson_id = None
    dash = analytics_mod.attach_study_plan(
        dash,
        tenant_id=session["tenant_id"],
        subject=str(session.get("subject") or ""),
        quiz_token=qtok,
        course_id=session.get("edvidura_course_id") or None,
        course_label=str(session.get("course") or ""),
        first_lesson_id=first_lesson_id,
        role_code=str(session.get("target_role") or "") or None,
    )
    return _shell(
        request,
        "learner_analytics.html",
        session,
        active_page="learner_analytics",
        page_title="My progress",
        page_subtitle="Your attempts, plan, and learning evidence",
        extra={"dash": dash},
    )


@router.get("/learn/activity", response_class=HTMLResponse)
async def learner_activity(
    request: Request,
    token: str | None = None,
    channel: str | None = None,
):
    from app.modules import xapi as xapi_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    sub = str(session.get("subject") or "").strip()
    ch = (channel or "").strip() or None
    rows = xapi_mod.activity_feed(
        session["tenant_id"],
        subject=sub or None,
        limit=100,
        channel=ch,
    )
    return _shell(
        request,
        "activity_recordings.html",
        session,
        active_page="learner_analytics",
        page_title="My activity",
        page_subtitle="Your xAPI evidence trail",
        extra={
            "rows": rows,
            "scope_label": (
                "Learner · coach chat"
                if ch in {"coach", "study_coach", "chat"}
                else "Learner · my recordings"
            ),
            "back_href": "/learn/analytics",
            "show_actor": False,
            "show_subject_filter": False,
            "filter_subject": "",
            "channel": ch or "",
            "show_channel_filter": True,
        },
    )


@router.get("/learn/micro", response_class=HTMLResponse)
async def learn_micro(request: Request, token: str | None = None):
    from app.modules import adaptive as adaptive_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    catalog = adaptive_mod.micro_learning_catalog(
        session["tenant_id"],
        subject=str(session.get("subject") or ""),
        quiz_token=tok,
    )
    return _shell(
        request,
        "micro_learning.html",
        session,
        active_page="micro_learning",
        page_title="Micro-learning",
        page_subtitle="Swipe short skill reels",
        extra={"catalog": catalog},
    )


@router.post("/learn/micro/viewed")
async def learn_micro_viewed(request: Request, token: str | None = None):
    """Beacon: student experienced a skill reel → xAPI experienced."""
    from app.modules import xapi as xapi_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        body = {}
    skill_id = str((body or {}).get("skill_id") or "").strip()
    title = str((body or {}).get("title") or "Micro reel").strip()[:200]
    if not skill_id:
        return JSONResponse({"ok": False, "error": "skill_id required"}, status_code=400)
    try:
        xapi_mod.record_resource_experienced(
            tenant_id=session["tenant_id"],
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            resource_id=skill_id,
            resource_title=title,
            resource_kind="micro_reel",
        )
    except Exception:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": "xapi failed"}, status_code=500)
    return JSONResponse({"ok": True})


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
    _ensure_launch_binding(session)
    _persist_session(request, session)
    class_id = str(session.get("class_id") or "").strip()
    class_snap = None
    if class_id:
        try:
            class_snap = class_workspace_snapshot(session["tenant_id"], class_id)
        except Exception:  # noqa: BLE001
            class_snap = None

    if class_snap:
        labels = class_moodle_filter_labels(session["tenant_id"], class_id)
        summary = db.quiz_attempt_class_summary(
            session["tenant_id"], limit=500, course_labels=labels or None
        )
        dash = {
            "attempt_count": int(summary.get("total_attempts") or 0),
            "learner_count": int(summary.get("learner_count") or 0),
            "avg_percent": (
                int(round(summary["avg_percent"]))
                if summary.get("avg_percent") is not None
                else None
            ),
            "synced_count": int(summary.get("synced_count") or 0),
            "pass_count": 0,
            "fail_count": 0,
            "unsynced_count": 0,
            "pass_rate": (
                int(round(100 * (summary.get("pass_rate") or 0)))
                if summary.get("pass_rate") is not None
                else None
            ),
            "xapi_count": 0,
            "lesson_completions": 0,
            "lesson_learners": 0,
            "daily": [],
            "score_buckets": {"labels": [], "values": []},
            "top_learners": [
                {
                    "label": str(L.get("learner_name") or L.get("subject") or "Learner"),
                    "attempts": int(L.get("attempts") or 0),
                    "avg_percent": int(L.get("best_percent") or 0),
                    "best_percent": int(L.get("best_percent") or 0),
                }
                for L in (summary.get("learners") or [])[:8]
            ],
            "xapi_verbs": [],
            "charts": {
                "daily_labels": [],
                "daily_attempts": [],
                "daily_avg": [],
                "outcome_labels": [],
                "outcome_values": [],
                "sync_labels": ["Synced to Moodle", "Not synced"],
                "sync_values": [
                    int(summary.get("synced_count") or 0),
                    max(
                        int(summary.get("total_attempts") or 0)
                        - int(summary.get("synced_count") or 0),
                        0,
                    ),
                ],
                "verb_labels": [],
                "verb_values": [],
                "bucket_labels": [],
                "bucket_values": [],
                "learner_labels": [
                    str(L.get("learner_name") or L.get("subject") or "")[:18]
                    for L in (summary.get("learners") or [])[:8]
                ],
                "learner_attempts": [
                    int(L.get("attempts") or 0)
                    for L in (summary.get("learners") or [])[:8]
                ],
                "learner_avg": [
                    int(L.get("best_percent") or 0)
                    for L in (summary.get("learners") or [])[:8]
                ],
            },
            "scoped_class": class_snap,
        }
        live = {
            "moodle_users": class_snap["student_count"] + class_snap["teacher_count"],
            "moodle_learners": class_snap["student_count"],
            "moodle_instructors": class_snap["teacher_count"],
            "active_now": 0,
            "active_today": 0,
            "moodle_synced": True,
            "hint": (
                f"Showing {class_snap['class_name']} only "
                f"({class_snap['student_count']} enrolled students)."
            ),
            "members": [],
        }
        subtitle = f"{class_snap['heading']} · class-scoped"
        try:
            tenant_dash = analytics_mod.tenant_dashboard(session["tenant_id"])
        except Exception:  # noqa: BLE001
            tenant_dash = {}
        dash["learner_heatmap"] = tenant_dash.get("learner_heatmap")
        dash["time_series"] = tenant_dash.get("time_series")
        dash["heatmap"] = tenant_dash.get("heatmap")
        dash["xapi_verbs"] = tenant_dash.get("xapi_verbs") or []
        dash["xapi_count"] = tenant_dash.get("xapi_count") or 0
        dash["sessions"] = tenant_dash.get("sessions") or []
        dash["by_tool"] = tenant_dash.get("by_tool") or []
    else:
        dash = analytics_mod.tenant_dashboard(session["tenant_id"])
        live = analytics_mod.live_school_users(session["tenant_id"])
        subtitle = "Live people + attempts for this school"

    return _shell(
        request,
        "teacher_analytics.html",
        session,
        active_page="teacher_analytics",
        page_title="Analytics",
        page_subtitle=subtitle,
        extra={
            "dash": dash,
            "live": live,
            "class_snap": class_snap,
        },
    )


@router.get("/teacher/activity", response_class=HTMLResponse)
async def teacher_activity(
    request: Request,
    token: str | None = None,
    subject: str | None = None,
    channel: str | None = None,
):
    from app.modules import xapi as xapi_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    _ensure_launch_binding(session)
    filt = (subject or "").strip() or None
    ch = (channel or "").strip() or None
    rows = xapi_mod.activity_feed(
        session["tenant_id"], subject=filt, limit=150, channel=ch
    )
    return _shell(
        request,
        "activity_recordings.html",
        session,
        active_page="teacher_analytics",
        page_title="Activity recordings",
        page_subtitle="Class / school xAPI evidence",
        extra={
            "rows": rows,
            "scope_label": (
                "Teacher · coach chat"
                if ch in {"coach", "study_coach", "chat"}
                else "Teacher · recordings"
            ),
            "back_href": "/teacher/analytics",
            "show_actor": True,
            "show_subject_filter": True,
            "filter_subject": filt or "",
            "channel": ch or "",
            "show_channel_filter": True,
        },
    )


@router.get("/teacher/integrations", response_class=HTMLResponse)
async def teacher_integrations(
    request: Request,
    token: str | None = None,
    probe: str | None = None,
):
    """Metabase/Yet moved to /ops — teachers use Activity."""
    _ = probe
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    return RedirectResponse(
        url=f"/teacher/activity?token={tok}",
        status_code=303,
    )


@router.get("/teacher/analytics/live.json")
async def teacher_analytics_live(request: Request, token: str | None = None):
    from fastapi.responses import JSONResponse

    from app.modules import analytics as analytics_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    _ensure_launch_binding(session)
    class_id = str(session.get("class_id") or "").strip()
    if class_id:
        snap = class_workspace_snapshot(session["tenant_id"], class_id)
        if snap:
            return JSONResponse(
                {
                    "moodle_users": snap["student_count"] + snap["teacher_count"],
                    "moodle_learners": snap["student_count"],
                    "moodle_instructors": snap["teacher_count"],
                    "active_now": 0,
                    "active_today": 0,
                    "moodle_synced": True,
                    "hint": (
                        f"Showing {snap['class_name']} only "
                        f"({snap['student_count']} enrolled students)."
                    ),
                    "members": [],
                }
            )
    return JSONResponse(analytics_mod.live_school_users(session["tenant_id"]))


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
    from app.modules.ai_assessment import (
        difficulty_label,
        generate_mcqs_from_text,
        generate_test_bank,
    )

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
    difficulty = str(form.get("difficulty") or "core").strip()
    complexity = str(form.get("complexity") or "apply").strip()
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
        gen = generate_test_bank if count >= 100 else generate_mcqs_from_text
        result = gen(
            body,
            count=count,
            title=str(lesson.get("title") or ""),
            difficulty=difficulty,
            complexity=complexity,
        )
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
        return RedirectResponse(
            url=f"/teacher/content?token={tok}&ok={msg}",
            status_code=303,
        )
    segs = result.get("segments") or []
    level = difficulty_label(result.get("difficulty"))
    note = result.get("note") or ""
    if segs:
        note = (
            f"Level: {level}. "
            f"Questions use the whole lesson ({len(segs)} parts) — "
            f"not only the beginning. {note}"
        ).strip()
    return _shell(
        request,
        "teacher_ai_preview.html",
        session,
        active_page="teacher_content",
        page_title="Check quiz questions",
        page_subtitle=str(lesson.get("title") or "Generated questions"),
        extra={
            "lesson": lesson,
            "source_title": str(lesson.get("title") or "Lesson"),
            "source_kind": "lesson",
            "provider": result.get("provider"),
            "model": result.get("model"),
            "note": note,
            "drafts": result.get("questions") or [],
            "difficulty": result.get("difficulty"),
            "difficulty_label": level,
            "coverage_topics": segs,
        },
    )


@router.post("/teacher/ai/generate-from-pdf", response_class=HTMLResponse)
async def teacher_ai_generate_from_pdf(
    request: Request, token: str | None = None
):
    from app.modules.ai_assessment import difficulty_label, generate_mcqs_from_document

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
    difficulty = str(form.get("difficulty") or "core").strip()
    complexity = str(form.get("complexity") or "apply").strip()
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
            raw,
            filename=fname,
            count=count,
            title=title,
            difficulty=difficulty,
            complexity=complexity,
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/ai?token={tok}&ok={str(exc).replace(' ', '+')}",
            status_code=303,
        )
    source_title = title or result.get("source_filename") or fname
    segs = result.get("segments") or []
    level = difficulty_label(result.get("difficulty") or difficulty)
    bits = [f"Level: {level}."]
    if result.get("page_count"):
        bits.append(
            f"Read about {result.get('extracted_chars')} characters "
            f"from {result['page_count']} page(s)."
        )
    if segs:
        bits.append(
            f"Questions use the whole file ({len(segs)} parts) — "
            "including later pages, not only the start."
        )
    note = " ".join(bits)
    return _shell(
        request,
        "teacher_ai_preview.html",
        session,
        active_page="teacher_ai",
        page_title="Check quiz questions",
        page_subtitle=str(source_title),
        extra={
            "lesson": None,
            "source_title": source_title,
            "source_kind": result.get("source_kind") or "pdf",
            "provider": result.get("provider"),
            "model": result.get("model"),
            "note": note,
            "drafts": result.get("questions") or [],
            "difficulty": result.get("difficulty"),
            "difficulty_label": level,
            "coverage_topics": segs,
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
    from app.modules import quiz as quiz_mod
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
    teacher_settings = quiz_mod.get_tenant_quiz_settings(session["tenant_id"])
    quiz_difficulty = teacher_settings.get("difficulty") or "auto"
    quiz_complexity = teacher_settings.get("complexity") or "auto"
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
            "quiz_difficulty": quiz_difficulty,
            "quiz_complexity": quiz_complexity,
            "difficulty_levels": ("auto", "foundational", "core", "challenge"),
            "complexity_levels": ("auto", "recall", "apply", "analyze"),
        },
    )


@router.post("/teacher/ai/quiz-settings", response_class=HTMLResponse)
async def teacher_ai_quiz_settings(
    request: Request, token: str | None = None
):
    """Teacher chooses student quiz difficulty + complexity (or auto)."""
    from app.modules import quiz as quiz_mod
    from app.modules.ai_assessment import difficulty_label
    from app.modules.quiz import complexity_label

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    saved = quiz_mod.set_tenant_quiz_settings(
        session["tenant_id"],
        difficulty=str(form.get("quiz_difficulty") or "auto").strip(),
        complexity=str(form.get("quiz_complexity") or "auto").strip(),
    )
    d_nice = difficulty_label(saved["difficulty"]).replace(" ", "+")
    c_nice = complexity_label(saved["complexity"]).replace(" ", "+")
    return RedirectResponse(
        url=(
            f"/teacher/ai?token={tok}"
            f"&ok=Student+quizzes:+level+{d_nice},+complexity+{c_nice}"
            f"+·+full+book+coverage+on"
        ),
        status_code=303,
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
            instructor_answer=str(form.get("instructor_answer") or ""),
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

    # Always re-resolve + persist so My plan is never stuck empty when
    # quiz/coach/VR evidence exists (shell home uses persist_if_missing=False).
    shell_bits = _shell_progress(session, token_s)
    gap_path = shell_bits.get("gap_path") or {
        "active": False,
        "steps": [],
        "skills": [],
    }
    wanted = str(session.get("target_role") or "").strip().lower()
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

            cid = str(session.get("class_id") or "").strip()
            mans = (
                manuals_mod.list_manuals_for_class(session["tenant_id"], cid)
                if cid
                else []
            )
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
            role_code=wanted or None,
            course_id=session.get("edvidura_course_id") or None,
            course_label=str(session.get("course") or ""),
            adapt_from_signals=True,
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


def _persist_coach_session(
    request: Request, session: dict[str, Any]
) -> dict[str, Any]:
    """HTTP-only: write coach session_patch back (cookie key-stripped)."""
    from app.modules.quiz.service import cookie_safe_session

    qtok = _ensure_token(session)
    session["quiz_token"] = qtok
    payload = {**session, "quiz_token": qtok}
    request.session[SESSION_KEY] = cookie_safe_session(payload)
    try:
        from app.launch_cache import LAUNCH_CACHE
        from app.quiz_routes import QUIZ_CTX_PREFIX

        LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{qtok}", payload, exp=3600)
        db.save_quiz_context(qtok, payload, ttl_sec=3600)
    except Exception:  # noqa: BLE001
        pass
    return session


@router.get("/learn/coach", response_class=HTMLResponse)
async def learner_coach_get(request: Request, token: str | None = None):
    from app.modules import ai_tutor
    from app.modules.ai_assessment import ai_status
    from app.modules.ai_tutor.voice import list_voice_languages, normalize_voice_lang

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    class_name = str(session.get("class_name") or "")
    course_title, chunks = ai_tutor.curriculum_chunks_for_session(
        session["tenant_id"],
        session.get("edvidura_course_id") or None,
        list_lessons_fn=content.list_lessons,
        get_bound_course_fn=content.get_bound_course,
        class_name=class_name,
    )
    reply_language = normalize_voice_lang(
        request.query_params.get("lang")
        or session.get("coach_voice_lang")
        or "en-IN"
    )
    coach_activity: list[Any] = []
    try:
        from app.modules import xapi as xapi_mod

        coach_activity = xapi_mod.activity_feed(
            session["tenant_id"],
            subject=str(session.get("subject") or "") or None,
            limit=8,
            channel="coach",
        )
    except Exception:  # noqa: BLE001
        coach_activity = []
    shortcuts = ai_tutor.shortcuts_view(session=session)
    return _shell(
        request,
        "study_coach.html",
        session,
        active_page="study_coach",
        page_title="Ask Vidura",
        page_subtitle=str(
            class_name or course_title or session.get("course") or ""
        ),
        extra={
            "ai": ai_status(),
            "answer": None,
            "question": "",
            "source_count": len(chunks),
            "class_lesson_titles": [c.get("title") for c in chunks[:12]],
            "course_title": course_title,
            "class_name": class_name,
            "voice_languages": list_voice_languages(),
            "reply_language": reply_language,
            "coach_activity": coach_activity,
            "coach_shortcuts": shortcuts,
            "flashcards_enabled": ai_tutor.flashcards_enabled(),
            "feedback_enabled": True,
        },
    )


@router.post("/learn/coach", response_class=HTMLResponse)
async def learner_coach_post(request: Request, token: str | None = None):
    from app.modules import ai_tutor
    from app.modules.ai_assessment import ai_status
    from app.modules.ai_tutor.voice import list_voice_languages, normalize_voice_lang

    form = await request.form()
    tok = str(form.get("token") or form.get("quiz_token") or token or "")
    session = require_session(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return session
    question = str(form.get("question") or "").strip()
    reply_language = normalize_voice_lang(
        str(form.get("reply_language") or session.get("coach_voice_lang") or "")
    )
    session["quiz_token"] = _ensure_token(session)
    turn = ai_tutor.run_coach_turn(
        session=session,
        question=question,
        reply_language=reply_language,
        list_lessons_fn=content.list_lessons,
        get_bound_course_fn=content.get_bound_course,
    )
    session = _persist_coach_session(request, turn["session_patch"])
    answer = turn.get("answer")
    err = str(turn.get("error") or "")
    course_title = str(turn.get("course_title") or "")
    class_name = str(turn.get("class_name") or "")
    chunks_n = int(turn.get("chunks_count") or 0)
    reply_language = str(turn.get("reply_language") or reply_language)
    coach_activity: list[Any] = []
    try:
        from app.modules import xapi as xapi_mod

        coach_activity = xapi_mod.activity_feed(
            session["tenant_id"],
            subject=str(session.get("subject") or "") or None,
            limit=8,
            channel="coach",
        )
    except Exception:  # noqa: BLE001
        coach_activity = []
    _, chunks = ai_tutor.curriculum_chunks_for_session(
        session["tenant_id"],
        session.get("edvidura_course_id") or None,
        list_lessons_fn=content.list_lessons,
        get_bound_course_fn=content.get_bound_course,
        class_name=class_name,
    )
    return _shell(
        request,
        "study_coach.html",
        session,
        active_page="study_coach",
        page_title="Ask Vidura",
        page_subtitle=str(
            class_name or course_title or session.get("course") or ""
        ),
        extra={
            "ai": ai_status(),
            "answer": answer,
            "question": question,
            "error": err,
            "source_count": chunks_n or len(chunks),
            "class_lesson_titles": [c.get("title") for c in chunks[:12]],
            "course_title": course_title,
            "class_name": class_name,
            "voice_languages": list_voice_languages(),
            "reply_language": reply_language,
            "coach_activity": coach_activity,
            "coach_shortcuts": ai_tutor.shortcuts_view(session=session),
            "flashcards_enabled": ai_tutor.flashcards_enabled(),
            "feedback_enabled": True,
        },
    )


@router.post("/learn/coach/ask")
async def learner_coach_ask_json(request: Request, token: str | None = None):
    """JSON Ask Vidura for the right-side drawer (AJAX) — thin HTTP over portable turn."""
    from app.modules import ai_tutor
    from app.modules.ai_tutor.voice import normalize_voice_lang

    ctype = (request.headers.get("content-type") or "").lower()
    if "application/json" in ctype:
        try:
            body = await request.json()
        except Exception:  # noqa: BLE001
            body = {}
        if not isinstance(body, dict):
            body = {}
        tok = str(body.get("token") or body.get("quiz_token") or token or "")
        question = str(body.get("question") or "").strip()
        reply_language = normalize_voice_lang(str(body.get("reply_language") or ""))
    else:
        form = await request.form()
        tok = str(form.get("token") or form.get("quiz_token") or token or "")
        question = str(form.get("question") or "").strip()
        reply_language = normalize_voice_lang(str(form.get("reply_language") or ""))

    session = require_session(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    if not question:
        return JSONResponse(
            {"ok": False, "error": "Type a question first."}, status_code=400
        )

    session["quiz_token"] = _ensure_token(session)
    try:
        turn = ai_tutor.run_coach_turn(
            session=session,
            question=question,
            reply_language=reply_language
            or str(session.get("coach_voice_lang") or "en-IN"),
            list_lessons_fn=content.list_lessons,
            get_bound_course_fn=content.get_bound_course,
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "error": f"Ask Vidura could not answer: {exc}"},
            status_code=500,
        )
    if turn.get("error"):
        return JSONResponse({"ok": False, "error": turn["error"]}, status_code=400)
    _persist_coach_session(request, turn["session_patch"])
    return JSONResponse(ai_tutor.coach_json_payload(question=question, turn=turn))


@router.get("/learn/coach/shortcuts")
async def learner_coach_shortcuts_json(
    request: Request, token: str | None = None
):
    from app.modules import ai_tutor

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    return JSONResponse(
        {"ok": True, "shortcuts": ai_tutor.shortcuts_view(session=session)}
    )


@router.post("/learn/coach/feedback")
async def learner_coach_feedback(request: Request, token: str | None = None):
    """Thumbs up/down — thin HTTP over portable ai_tutor.submit_coach_feedback."""
    from app.modules import ai_tutor

    ctype = (request.headers.get("content-type") or "").lower()
    if "application/json" in ctype:
        try:
            body = await request.json()
        except Exception:  # noqa: BLE001
            body = {}
        if not isinstance(body, dict):
            body = {}
        tok = str(body.get("token") or body.get("quiz_token") or token or "")
        rating = str(body.get("rating") or "").strip().lower()
        question_preview = str(body.get("question") or "")[:120]
        answer_preview = str(body.get("answer") or "")[:120]
    else:
        form = await request.form()
        tok = str(form.get("token") or form.get("quiz_token") or token or "")
        rating = str(form.get("rating") or "").strip().lower()
        question_preview = str(form.get("question") or "")[:120]
        answer_preview = str(form.get("answer") or "")[:120]

    session = require_session(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    result = ai_tutor.submit_coach_feedback(
        session=session,
        rating=rating,
        question_preview=question_preview,
        answer_preview=answer_preview,
    )
    if not result.get("ok"):
        code = 403 if result.get("error") == "feedback_disabled" else 400
        return JSONResponse(result, status_code=code)
    return JSONResponse(result)


@router.get("/learn/flashcards", response_class=HTMLResponse)
async def learner_flashcards_get(request: Request, token: str | None = None):
    from app.modules import ai_tutor

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    if not ai_tutor.flashcards_enabled():
        return _shell(
            request,
            "access.html",
            session,
            active_page="flashcards",
            page_title="Flashcards",
            extra={
                "heading": "Flashcards off",
                "message": "Ask your teacher — flashcards are disabled for this school.",
            },
        )
    pack = ai_tutor.flashcards_for_session(
        session=session,
        list_lessons_fn=content.list_lessons,
        get_bound_course_fn=content.get_bound_course,
    )
    return _shell(
        request,
        "coach_flashcards.html",
        session,
        active_page="flashcards",
        page_title="Flashcards",
        page_subtitle=str(
            pack.get("class_name") or pack.get("course_title") or ""
        ),
        extra={
            "cards": pack.get("cards") or [],
            "card_count": pack.get("count") or 0,
            "course_title": pack.get("course_title"),
            "class_name": pack.get("class_name"),
            "provider": pack.get("provider"),
            "note": pack.get("note"),
        },
    )


@router.get("/teacher/coach/insights", response_class=HTMLResponse)
async def teacher_coach_insights_get(
    request: Request, token: str | None = None
):
    """Phase B2: Ask Vidura class rollups — thin over analytics.class_coach_insights."""
    from app.modules import analytics as analytics_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    subjects: list[str] = []
    try:
        summary = db.quiz_attempt_class_summary(
            session["tenant_id"],
            course_labels=None,
            limit=200,
        )
        for row in summary.get("learners") or []:
            sub = str(row.get("subject") or "").strip()
            if sub:
                subjects.append(sub)
    except Exception:  # noqa: BLE001
        subjects = []
    insights = analytics_mod.class_coach_insights(
        session["tenant_id"],
        subjects=subjects or None,
        limit=400,
    )
    return _shell(
        request,
        "teacher_coach_insights.html",
        session,
        active_page="teacher_coach_insights",
        page_title="Ask Vidura insights",
        page_subtitle="What students ask, refuse, and rate",
        extra={"insights": insights},
    )


@router.get("/teacher/coach/shortcuts", response_class=HTMLResponse)
async def teacher_coach_shortcuts_get(
    request: Request, token: str | None = None
):
    from app.modules import ai_tutor

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    course_id = session.get("edvidura_course_id") or None
    rows = []
    try:
        rows = ai_tutor.list_shortcuts(
            session["tenant_id"], course_id=course_id
        )
    except Exception:  # noqa: BLE001
        rows = []
    if not rows:
        rows = [
            {"label": s["label"], "prompt": s["prompt"]}
            for s in ai_tutor.DEFAULT_SHORTCUTS
        ]
    return _shell(
        request,
        "teacher_coach_shortcuts.html",
        session,
        active_page="teacher_coach_shortcuts",
        page_title="Ask Vidura shortcuts",
        page_subtitle="Welcome chips for students",
        extra={"shortcut_rows": rows, "ok_message": request.query_params.get("ok")},
    )


@router.post("/teacher/coach/shortcuts", response_class=HTMLResponse)
async def teacher_coach_shortcuts_post(
    request: Request, token: str | None = None
):
    from app.modules import ai_tutor

    form = await request.form()
    tok = str(form.get("token") or form.get("quiz_token") or token or "")
    session = require_instructor(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return session
    labels = form.getlist("label") if hasattr(form, "getlist") else []
    prompts = form.getlist("prompt") if hasattr(form, "getlist") else []
    items: list[dict[str, str]] = []
    for i, label in enumerate(labels):
        prompt = prompts[i] if i < len(prompts) else ""
        items.append({"label": str(label), "prompt": str(prompt)})
    try:
        ai_tutor.replace_shortcuts(
            session["tenant_id"],
            course_id=session.get("edvidura_course_id") or None,
            items=items,
        )
    except Exception as exc:  # noqa: BLE001
        return _shell(
            request,
            "teacher_coach_shortcuts.html",
            session,
            active_page="teacher_coach_shortcuts",
            page_title="Ask Vidura shortcuts",
            extra={
                "shortcut_rows": items or ai_tutor.DEFAULT_SHORTCUTS,
                "error": str(exc),
            },
        )
    qtok = _ensure_token(session)
    return RedirectResponse(
        url=f"/teacher/coach/shortcuts?token={qtok}&ok=saved",
        status_code=303,
    )


# —— Versioned manuals (Slice B) ——


@router.get("/manuals", response_class=HTMLResponse)
async def manuals_list(request: Request, token: str | None = None):
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    class_id = str(session.get("class_id") or "").strip()
    if class_id:
        rows = manuals_mod.list_manuals_for_class(
            session["tenant_id"], class_id
        )
        subtitle = "Published manuals for this class"
    else:
        rows = manuals_mod.list_manuals(session["tenant_id"])
        subtitle = "Curated interactive eBooks with audio narration and xAPI tracking"

    META_MAP = {
        "welding-demo-handbook": {
            "category": "Vocational & Engineering",
            "course_align": "Moodle Course 2: Welding Demo",
            "icon": "precision_manufacturing",
            "gradient": "linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #7c2d12 100%)",
            "accent": "#ea580c",
            "read_time": "12 min read",
            "level": "Vocational / CTE",
            "subject_tag": "welding",
            "highlight": "Aligned with Moodle Course 2",
        },
        "pebl-demo-ebook": {
            "category": "Physical Sciences",
            "course_align": "PeBL Core Science & Inquiry",
            "icon": "biotech",
            "gradient": "linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%)",
            "accent": "#0f766e",
            "read_time": "15 min read",
            "level": "Undergraduate / AP",
            "subject_tag": "science",
            "highlight": "PeBL Interactive Standard",
        },
        "algebra-i-study-handbook": {
            "category": "Mathematics",
            "course_align": "Class 8 Algebra Foundations",
            "icon": "functions",
            "gradient": "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e3a8a 100%)",
            "accent": "#2563eb",
            "read_time": "14 min read",
            "level": "Secondary Math",
            "subject_tag": "algebra",
            "highlight": "Class 8 Curriculum Aligned",
        },
        "biology-life-sciences": {
            "category": "Life Sciences",
            "course_align": "Cellular Systems & Genetics",
            "icon": "psychology",
            "gradient": "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)",
            "accent": "#7c3aed",
            "read_time": "16 min read",
            "level": "Core Biology",
            "subject_tag": "biology",
            "highlight": "Cellular Biology Mastery",
        },
    }

    subject = str(session.get("subject") or "")
    enriched_manuals = []
    for m in rows:
        m_dict = dict(m)
        slug = m_dict.get("slug")
        meta = META_MAP.get(slug, {
            "category": "General Curriculum",
            "course_align": "School Library",
            "icon": "menu_book",
            "gradient": "linear-gradient(135deg, #059669 0%, #047857 100%)",
            "accent": "#059669",
            "read_time": "10 min read",
            "level": "General",
            "subject_tag": "general",
            "highlight": "Published eBook",
        })
        m_dict.update(meta)

        pub = manuals_mod.latest_published_version(session["tenant_id"], m_dict["id"])
        if pub:
            m_dict["version_num"] = pub.get("version", 1)
            m_dict["content_type"] = pub.get("content_type", "markdown")
            manifest = pub.get("epub_manifest") or {}
            spine = manifest.get("spine") or []
            m_dict["chapters_count"] = len(spine) if spine else 4
        else:
            m_dict["version_num"] = 1
            m_dict["content_type"] = "markdown"
            m_dict["chapters_count"] = 4

        try:
            prog = manuals_mod.get_reading_progress(
                tenant_id=session["tenant_id"],
                manual_id=m_dict["id"],
                version=m_dict["version_num"],
                subject=subject,
            )
        except Exception:  # noqa: BLE001
            prog = None
        if prog:
            m_dict["progress_percent"] = int(prog.get("progress_percent") or 0)
            m_dict["time_spent_seconds"] = int(prog.get("time_spent_seconds") or 0)
            m_dict["last_chapter_index"] = prog.get("chapter_index")
        else:
            m_dict["progress_percent"] = 0
            m_dict["time_spent_seconds"] = 0
            m_dict["last_chapter_index"] = None

        enriched_manuals.append(m_dict)

    return _shell(
        request,
        "manuals.html",
        session,
        active_page="manuals",
        page_title="Interactive eBooks Library",
        page_subtitle=subtitle,
        extra={
            "manuals": enriched_manuals,
            "class_scoped": bool(class_id),
            "bound_class_id": class_id,
        },
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
    lang: str | None = None,
    state: str | None = None,
    retranslate: str | None = None,
    chapter: int | None = None,
    cfi: str | None = None,
):
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    manual = manuals_mod.get_manual(session["tenant_id"], manual_id)
    class_id = str(session.get("class_id") or "").strip()
    is_staff = bool(
        session.get("is_instructor") or session.get("is_school_admin")
    )
    if not manual or (
        manual.get("status") != "published" and not is_staff
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
    if not is_staff:
        if not class_id or not manuals_mod.manual_visible_to_class(
            session["tenant_id"], manual_id=manual_id, class_id=class_id
        ):
            return _shell(
                request,
                "access.html",
                session,
                active_page="manuals",
                page_title="Not in this class",
                extra={
                    "heading": "Manual not assigned to this class",
                    "message": (
                        "This handbook is not linked to your class. "
                        "Ask your teacher to assign it under Teach → Manuals."
                    ),
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
        if not version and session.get("is_instructor") and versions:
            version = versions[0]
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
    pebl_counts: dict[str, int] = {}
    try:
        from app.modules import pebl as pebl_mod

        pebl_counts = pebl_mod.chapter_counts(
            tenant_id=session["tenant_id"],
            manual_id=manual_id,
            context_id=str(session.get("lti_context_id") or ""),
        )
    except Exception:  # noqa: BLE001
        pebl_counts = {}

    tenant_row: dict[str, Any] = {}
    try:
        tenant_row = db.get_tenant(session["tenant_id"]) or {}
    except Exception:  # noqa: BLE001
        tenant_row = {}
    if state:
        session["preferred_state"] = manuals_mod.normalize_state(state)
    state_hint = str(
        state or session.get("preferred_state") or tenant_row.get("preferred_state") or ""
    )
    lang_from_state = (
        manuals_mod.language_for_state(state_hint)
        if manuals_mod.normalize_state(state_hint)
        else ""
    )
    preferred = manuals_mod.resolve_preferred_language(
        query_lang=lang or lang_from_state or None,
        session_lang=str(session.get("manual_lang") or ""),
        tenant_language=str(tenant_row.get("preferred_language") or ""),
        tenant_state=str(tenant_row.get("preferred_state") or state_hint or ""),
        source_language=str(manual.get("source_language") or "en-IN"),
    )
    session["manual_lang"] = preferred
    if state_hint:
        session["preferred_state"] = manuals_mod.normalize_state(state_hint)
    _persist_session(request, session)

    # Auto-translate when dropdown language differs from source and no cache.
    explicit_lang_pick = bool((lang or state or "").strip())
    resolved = manuals_mod.resolve_reader_content(
        session["tenant_id"],
        manual=manual,
        version=version,
        language_code=preferred,
        allow_unpublished_locale=is_staff,
        auto_translate=explicit_lang_pick or bool(session.get("manual_lang")),
        force_retranslate=retranslate == "1" and is_staff,
    )
    body_md = str(resolved.get("body_md") or "")
    display_title = str(resolved.get("title") or manual.get("title") or "")
    locales = manuals_mod.list_locales(session["tenant_id"], manual_id)
    published_langs = {
        str(loc.get("language_code") or "")
        for loc in locales
        if loc.get("is_published") or is_staff
    }
    published_langs.add(str(manual.get("source_language") or "en-IN"))

    subject = str(session.get("subject") or "")
    saved_progress = manuals_mod.get_reading_progress(
        tenant_id=session["tenant_id"],
        manual_id=manual_id,
        version=int(version["version"]),
        subject=subject,
    )
    bookmarks_list = manuals_mod.list_bookmarks(
        tenant_id=session["tenant_id"],
        manual_id=manual_id,
        version=int(version["version"]),
        subject=subject,
    )
    annotations_list = manuals_mod.list_annotations(
        tenant_id=session["tenant_id"],
        manual_id=manual_id,
        version=int(version["version"]),
        subject=subject,
    )

    is_epub = version.get("content_type") == "epub"
    chapter_url = None
    prev_chap_url = None
    next_chap_url = None
    chap_idx = 0
    total_chapters = 0
    current_chapter_title = ""

    if is_epub:
        manifest = version.get("epub_manifest") or {}
        spine = manifest.get("spine") or []
        toc_items = manifest.get("toc") or []
        total_chapters = len(spine)
        if total_chapters > 0:
            if chapter is not None:
                chap_idx = max(0, min(int(chapter), total_chapters - 1))
            elif cfi:
                parsed_cfi = manuals_mod.parse_epub_cfi(cfi)
                if parsed_cfi and "chapter_index" in parsed_cfi:
                    chap_idx = max(0, min(int(parsed_cfi["chapter_index"]), total_chapters - 1))
                elif saved_progress and "chapter_index" in saved_progress:
                    chap_idx = max(0, min(int(saved_progress["chapter_index"]), total_chapters - 1))
                else:
                    chap_idx = 0
            elif saved_progress and "chapter_index" in saved_progress:
                chap_idx = max(0, min(int(saved_progress["chapter_index"]), total_chapters - 1))
            else:
                chap_idx = 0

            current_spine = spine[chap_idx]
            current_chapter_title = current_spine.get("title") or f"Chapter {chap_idx + 1}"
            rel_path = current_spine.get("full_href") or current_spine.get("href") or ""
            chapter_url = f"/manuals/{manual_id}/epub-files/{rel_path}?v={version['version']}&token={token_s}"
            if chap_idx > 0:
                prev_chap_url = f"/manuals/{manual_id}?token={token_s}&v={version['version']}&chapter={chap_idx - 1}"
            if chap_idx < total_chapters - 1:
                next_chap_url = f"/manuals/{manual_id}?token={token_s}&v={version['version']}&chapter={chap_idx + 1}"

        formatted_toc = []
        if toc_items:
            for idx, item in enumerate(toc_items):
                formatted_toc.append({
                    "title": item.get("title") or f"Chapter {idx + 1}",
                    "chap_index": idx if idx < total_chapters else 0,
                    "slug": item.get("slug") or f"chap-{idx+1}",
                })
        else:
            for idx, item in enumerate(spine):
                formatted_toc.append({
                    "title": item.get("title") or f"Chapter {idx + 1}",
                    "chap_index": idx,
                    "slug": f"chap-{idx+1}",
                })
        toc_out = formatted_toc
    else:
        toc_out = manuals_mod.toc_from_body(str(version.get("body_md") or ""))

    # Auto-save reading progress on manual view with standard EPUB CFI
    calc_percent = int(((chap_idx + 1) / float(max(1, total_chapters))) * 100) if total_chapters > 0 else 0
    current_spine_id = ""
    standard_cfi = None
    if is_epub and total_chapters > 0:
        current_spine = spine[chap_idx]
        current_spine_id = str(current_spine.get("idref") or current_spine.get("id") or f"ch{chap_idx+1}")
        if cfi and str(cfi).startswith("epubcfi(") and chap_idx == (manuals_mod.parse_epub_cfi(cfi) or {}).get("chapter_index"):
            standard_cfi = cfi
        else:
            standard_cfi = manuals_mod.generate_epub_cfi(chap_idx, current_spine_id, element_step=2, start_char=0)

    try:
        manuals_mod.save_reading_progress(
            tenant_id=session["tenant_id"],
            manual_id=manual_id,
            version=int(version["version"]),
            subject=subject,
            chapter_index=chap_idx,
            cfi=standard_cfi or f"epub-cfi-chap-{chap_idx+1}",
            progress_percent=calc_percent,
        )
    except Exception:  # noqa: BLE001
        pass

    if is_epub and total_chapters > 0:
        try:
            from uuid import NAMESPACE_URL, uuid5
            from app.modules import xapi as xapi_mod

            sub = str(session.get("subject") or "")
            lname = str(session.get("learner_name") or "")
            mtitle = str(manual.get("title") or "eBook")
            v_num = int(version["version"])

            # 1. Reader initialized (one per session token)
            init_sid = uuid5(NAMESPACE_URL, f"edvidura:xapi:init:{token_s}:{manual_id}:{v_num}")
            xapi_mod.record_ebook_initialized(
                tenant_id=session["tenant_id"],
                subject=sub,
                learner_name=lname,
                manual_id=manual_id,
                manual_title=mtitle,
                version=v_num,
                statement_id=init_sid,
                send_lrs=True,
            )

            # Check if client supplied an explicit idempotency key for network retry
            idempotency_key = request.headers.get("X-Idempotency-Key") or request.query_params.get("idempotency_key")

            # 1. eBook initialized (milestone per launch session; stable per session token)
            init_sid = uuid5(NAMESPACE_URL, f"edvidura:xapi:init:{token_s}:{manual_id}:{v_num}")
            xapi_mod.record_ebook_initialized(
                tenant_id=session["tenant_id"],
                subject=sub,
                learner_name=lname,
                manual_id=manual_id,
                manual_title=mtitle,
                version=v_num,
                statement_id=init_sid,
                send_lrs=True,
            )

            # 2. Chapter experienced (distinct per user navigation; deterministic only if explicit idempotency_key is provided)
            chap_sid = (
                uuid5(NAMESPACE_URL, f"edvidura:xapi:chap:{token_s}:{manual_id}:{v_num}:{chap_idx}:{idempotency_key}")
                if idempotency_key
                else None
            )
            xapi_mod.record_chapter_experienced(
                tenant_id=session["tenant_id"],
                subject=sub,
                learner_name=lname,
                manual_id=manual_id,
                manual_title=mtitle,
                chapter_index=chap_idx,
                chapter_title=current_chapter_title,
                version=v_num,
                statement_id=chap_sid,
                send_lrs=True,
            )

            # 3. Reading progressed (distinct per progress milestone; deterministic only if explicit idempotency_key is provided)
            prog_sid = (
                uuid5(NAMESPACE_URL, f"edvidura:xapi:prog:{token_s}:{manual_id}:{v_num}:{chap_idx}:{calc_percent}:{idempotency_key}")
                if idempotency_key
                else None
            )
            xapi_mod.record_reading_progressed(
                tenant_id=session["tenant_id"],
                subject=sub,
                learner_name=lname,
                manual_id=manual_id,
                manual_title=mtitle,
                chapter_index=chap_idx,
                progress_percent=calc_percent,
                cfi=standard_cfi or f"epub-cfi-chap-{chap_idx+1}",
                version=v_num,
                statement_id=prog_sid,
                send_lrs=True,
            )

            # 6. Reading completed (when reaches 100% or final chapter; scoped to milestone completion)
            if calc_percent >= 100 or chap_idx >= total_chapters - 1:
                comp_sid = uuid5(NAMESPACE_URL, f"edvidura:xapi:comp:{session['tenant_id']}:{sub}:{manual_id}:{v_num}")
                xapi_mod.record_reading_completed(
                    tenant_id=session["tenant_id"],
                    subject=sub,
                    learner_name=lname,
                    manual_id=manual_id,
                    manual_title=mtitle,
                    version=v_num,
                    statement_id=comp_sid,
                    send_lrs=True,
                )
        except Exception:  # noqa: BLE001
            pass

    return _shell(
        request,
        "manual_read.html",
        session,
        active_page="manuals",
        page_title=display_title,
        page_subtitle=f"Version {version['version']} · {resolved.get('language_name')}",
        extra={
            "manual": manual,
            "version": version,
            "versions": versions,
            "display_title": display_title,
            "body_html": (
                ""
                if is_epub
                else manuals_mod.render_body(body_md)
            ),
            "toc": toc_out if is_epub else manuals_mod.toc_from_body(body_md),
            "reader_language": resolved.get("language_code"),
            "reader_language_name": resolved.get("language_name"),
            "reader_language_native": resolved.get("language_native"),
            "is_locale": bool(resolved.get("is_locale")),
            "is_auto": bool(resolved.get("is_auto")),
            "just_translated": bool(resolved.get("just_translated")),
            "translate_error": resolved.get("translate_error") or "",
            "fallback_to_source": bool(resolved.get("fallback_to_source")),
            "source_language": resolved.get("source_language"),
            "manual_languages": manuals_mod.list_manual_languages(),
            "manual_states": manuals_mod.list_states(),
            "available_languages": sorted(published_langs),
            "preferred_state": session.get("preferred_state") or "",
            "is_epub": is_epub,
            "chapter_url": chapter_url,
            "prev_chap_url": prev_chap_url,
            "next_chap_url": next_chap_url,
            "chap_idx": chap_idx,
            "total_chapters": total_chapters,
            "current_chapter_title": current_chapter_title,
            "saved_progress": saved_progress,
            "bookmarks": bookmarks_list,
            "annotations": annotations_list,
            "progress_percent": calc_percent,
            "current_spine_id": current_spine_id,
            "current_cfi": standard_cfi or f"epub-cfi-chap-{chap_idx+1}",
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
            "pebl_counts": pebl_counts,
            "pebl_enabled": True,
            "subject": str(session.get("subject") or ""),
        },
    )


def _pebl_json_msg(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id") or ""),
        "thread_id": str(row.get("thread_id") or ""),
        "parent_id": str(row["parent_id"]) if row.get("parent_id") else None,
        "author_subject": str(row.get("author_subject") or ""),
        "author_name": str(row.get("author_name") or ""),
        "body": str(row.get("body") or ""),
        "client_id": str(row.get("client_id") or ""),
        "created_at": (
            row["created_at"].isoformat()
            if hasattr(row.get("created_at"), "isoformat")
            else str(row.get("created_at") or "")
        ),
    }


def _learner_may_access_manual(session: dict[str, Any], manual_id: UUID) -> bool:
    """Staff: any tenant manual. Learners: must be assigned to their class."""
    if session.get("is_instructor") or session.get("is_school_admin"):
        return True
    from app.modules import manuals as manuals_mod

    class_id = session.get("class_id")
    if not class_id:
        return False
    return bool(
        manuals_mod.manual_visible_to_class(
            session["tenant_id"], manual_id=manual_id, class_id=class_id
        )
    )


@router.get("/manuals/{manual_id}/discussions")
async def manual_discussions_list(
    request: Request,
    manual_id: UUID,
    token: str | None = None,
    chapter: str = "",
):
    """JSON: PeBL chapter thread messages for the ebook reader."""
    from app.modules import pebl as pebl_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    if not _learner_may_access_manual(session, manual_id):
        return JSONResponse(
            {"ok": False, "error": "Manual not available for this class"},
            status_code=403,
        )
    slug = (chapter or "").strip().lstrip("#")
    pack = pebl_mod.list_messages(
        tenant_id=session["tenant_id"],
        manual_id=manual_id,
        chapter_slug=slug,
        context_id=str(session.get("lti_context_id") or ""),
    )
    thread = pack.get("thread")
    return JSONResponse(
        {
            "ok": True,
            "chapter_slug": pack.get("chapter_slug") or slug,
            "thread_id": str(thread["id"]) if thread else None,
            "access_level": (thread or {}).get("access_level") or "class",
            "messages": [_pebl_json_msg(m) for m in pack.get("messages") or []],
        }
    )


@router.post("/manuals/{manual_id}/discussions")
async def manual_discussions_post(request: Request, manual_id: UUID, token: str | None = None):
    """JSON: post (or offline-sync) a PeBL in-book discussion message."""
    from app.modules import pebl as pebl_mod
    from app.modules import xapi as xapi_mod
    from app.settings import get_settings

    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        body = {}
    if not isinstance(body, dict):
        body = {}
    tok = str(body.get("token") or body.get("quiz_token") or token or "")
    session = require_session(request, token=tok or None)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    if not _learner_may_access_manual(session, manual_id):
        return JSONResponse(
            {"ok": False, "error": "Manual not available for this class"},
            status_code=403,
        )

    chapter_slug = str(body.get("chapter_slug") or body.get("chapter") or "").strip()
    chapter_title = str(body.get("chapter_title") or "").strip()
    text = str(body.get("body") or body.get("message") or "").strip()
    parent_id = body.get("parent_id") or None
    client_id = str(body.get("client_id") or "").strip()
    if not chapter_slug:
        return JSONResponse(
            {"ok": False, "error": "Pick a chapter first."}, status_code=400
        )
    if not text:
        return JSONResponse(
            {"ok": False, "error": "Type a message first."}, status_code=400
        )

    settings = get_settings()
    access = str(
        getattr(settings, "coach_xapi_access_level", None) or "class"
    )
    try:
        result = pebl_mod.post_message(
            tenant_id=session["tenant_id"],
            manual_id=manual_id,
            chapter_slug=chapter_slug,
            chapter_title=chapter_title,
            body=text,
            author_subject=str(session.get("subject") or ""),
            author_name=str(session.get("learner_name") or ""),
            context_id=str(session.get("lti_context_id") or ""),
            access_level=access,
            parent_id=parent_id,
            client_id=client_id,
        )
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)

    msg = result["message"]
    thread = result["thread"]
    if not result.get("deduped"):
        try:
            from app.modules import manuals as manuals_mod

            manual = manuals_mod.get_manual(session["tenant_id"], manual_id)
            xapi_mod.record_pebl_discussion(
                tenant_id=session["tenant_id"],
                subject=str(session.get("subject") or ""),
                learner_name=str(session.get("learner_name") or ""),
                message_text=str(msg.get("body") or ""),
                thread_id=str(thread.get("id") or ""),
                manual_id=manual_id,
                manual_title=str((manual or {}).get("title") or ""),
                chapter_slug=chapter_slug,
                chapter_title=chapter_title
                or str(thread.get("chapter_title") or ""),
                access_level=str(thread.get("access_level") or access),
                send_lrs=True,
            )
        except Exception:  # noqa: BLE001
            pass

    return JSONResponse(
        {
            "ok": True,
            "deduped": bool(result.get("deduped")),
            "thread_id": str(thread.get("id") or ""),
            "message": _pebl_json_msg(msg),
        }
    )


@router.get("/read/manuals/{manual_id}", response_class=HTMLResponse)
async def manual_standalone_read(
    request: Request,
    manual_id: UUID,
    tid: UUID,
    sig: str,
    v: int | None = None,
    focus: str | None = None,
    chapter: int | None = None,
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

    is_epub = version.get("content_type") == "epub"
    chapter_url = None
    prev_chap_url = None
    next_chap_url = None
    chap_idx = 0
    total_chapters = 0
    current_chapter_title = ""

    if is_epub:
        manifest = version.get("epub_manifest") or {}
        spine = manifest.get("spine") or []
        toc_items = manifest.get("toc") or []
        total_chapters = len(spine)
        if total_chapters > 0:
            chap_idx = max(0, min(int(chapter or 0), total_chapters - 1))
            current_spine = spine[chap_idx]
            current_chapter_title = current_spine.get("title") or f"Chapter {chap_idx + 1}"
            rel_path = current_spine.get("full_href") or current_spine.get("href") or ""
            chapter_url = f"/read/manuals/{manual_id}/epub-files/{rel_path}?tid={tid}&v={version_n}&sig={sig}"
            if chap_idx > 0:
                prev_chap_url = f"/read/manuals/{manual_id}?tid={tid}&v={version_n}&sig={sig}&chapter={chap_idx - 1}"
            if chap_idx < total_chapters - 1:
                next_chap_url = f"/read/manuals/{manual_id}?tid={tid}&v={version_n}&sig={sig}&chapter={chap_idx + 1}"

        formatted_toc = []
        if toc_items:
            for idx, item in enumerate(toc_items):
                formatted_toc.append({
                    "title": item.get("title") or f"Chapter {idx + 1}",
                    "chap_index": idx if idx < total_chapters else 0,
                    "slug": item.get("slug") or f"chap-{idx+1}",
                })
        else:
            for idx, item in enumerate(spine):
                formatted_toc.append({
                    "title": item.get("title") or f"Chapter {idx + 1}",
                    "chap_index": idx,
                    "slug": f"chap-{idx+1}",
                })
        toc_out = formatted_toc
    else:
        toc_out = manuals_mod.toc_from_body(body_md)

    return _TEMPLATES.TemplateResponse(
        request,
        "ebook_standalone.html",
        {
            "manual": manual,
            "version": version,
            "body_html": manuals_mod.render_body(body_md) if not is_epub else "",
            "toc": toc_out,
            "is_epub": is_epub,
            "chapter_url": chapter_url,
            "prev_chap_url": prev_chap_url,
            "next_chap_url": next_chap_url,
            "chap_idx": chap_idx,
            "total_chapters": total_chapters,
            "current_chapter_title": current_chapter_title,
            "tid": tid,
            "sig": sig,
            "focus": focus_slug,
            "focus_label": focus_slug.replace("-", " ").title() if focus_slug else "",
        },
    )


EPUB_ACTIVE_DOCUMENT_EXTENSIONS = {".html", ".xhtml", ".htm", ".svg"}

EPUB_ACTIVE_CSP = (
    "default-src 'none'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "font-src 'self' data:; "
    "media-src 'self'; "
    "script-src 'none'; "
    "connect-src 'none'; "
    "object-src 'none'; "
    "form-action 'none'; "
    "base-uri 'none'; "
    "frame-ancestors 'self';"
)


@router.get("/manuals/{manual_id}/epub-files/{file_path:path}")
async def manual_epub_file(
    request: Request,
    manual_id: UUID,
    file_path: str,
    token: str | None = None,
    v: int | None = None,
):
    from fastapi.responses import FileResponse
    from app.modules import manuals as manuals_mod

    if not token or v is None:
        referer = request.headers.get("referer") or ""
        if "token=" in referer or "v=" in referer:
            from urllib.parse import parse_qs, urlparse
            qs = parse_qs(urlparse(referer).query)
            if not token:
                tok_list = qs.get("token")
                if tok_list:
                    token = tok_list[0]
            if v is None:
                v_list = qs.get("v")
                if v_list and v_list[0].isdigit():
                    v = int(v_list[0])

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    manual = manuals_mod.get_manual(session["tenant_id"], manual_id)
    if not manual or (
        manual.get("status") != "published" and not session.get("is_instructor")
    ):
        return HTMLResponse("Manual not found", status_code=404)

    if v is not None:
        version = manuals_mod.get_version(session["tenant_id"], manual_id=manual_id, version=v)
    else:
        version = manuals_mod.latest_published_version(session["tenant_id"], manual_id)

    if not version or version.get("content_type") != "epub":
        return HTMLResponse("EPUB version not found", status_code=404)

    storage_dir = manuals_mod.get_epub_storage_dir(
        session["tenant_id"], manual_id, version["version"]
    ).resolve()
    target_file = (storage_dir / file_path).resolve()

    if not str(target_file).startswith(str(storage_dir)) or not target_file.exists() or not target_file.is_file():
        return HTMLResponse("Resource not found", status_code=404)

    ext = target_file.suffix.lower()
    media_types = {
        ".html": "application/xhtml+xml; charset=utf-8",
        ".xhtml": "application/xhtml+xml; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".otf": "font/otf",
    }
    mt = media_types.get(ext, "application/octet-stream")
    headers = {"X-Content-Type-Options": "nosniff"}
    if ext in EPUB_ACTIVE_DOCUMENT_EXTENSIONS:
        headers["Content-Security-Policy"] = EPUB_ACTIVE_CSP
        headers["X-Frame-Options"] = "SAMEORIGIN"

    return FileResponse(
        path=str(target_file),
        media_type=mt,
        headers=headers,
    )


@router.get("/read/manuals/{manual_id}/epub-files/{file_path:path}")
async def manual_standalone_epub_file(
    request: Request,
    manual_id: UUID,
    file_path: str,
    tid: UUID | None = None,
    sig: str | None = None,
    v: int | None = None,
):
    from fastapi.responses import FileResponse
    from app.modules import manuals as manuals_mod

    if not sig or not tid or v is None:
        referer = request.headers.get("referer") or ""
        if "sig=" in referer or "tid=" in referer or "v=" in referer:
            from urllib.parse import parse_qs, urlparse
            qs = parse_qs(urlparse(referer).query)
            if not sig:
                sig_list = qs.get("sig")
                if sig_list:
                    sig = sig_list[0]
            if not tid:
                tid_list = qs.get("tid")
                if tid_list:
                    try:
                        tid = UUID(tid_list[0])
                    except Exception:
                        tid = None
            if v is None:
                v_list = qs.get("v")
                if v_list and v_list[0].isdigit():
                    v = int(v_list[0])

    if not tid or not sig or v is None:
        return HTMLResponse("Invalid or missing eBook parameters", status_code=403)

    if not manuals_mod.verify_reader_token(
        token=sig, tenant_id=tid, manual_id=manual_id, version=v
    ):
        return HTMLResponse("Invalid or expired eBook link", status_code=403)

    manual = manuals_mod.get_manual(tid, manual_id)
    version = manuals_mod.get_version(tid, manual_id=manual_id, version=v)
    if not manual or not version or not version.get("is_published") or version.get("content_type") != "epub":
        return HTMLResponse("eBook not available", status_code=404)

    storage_dir = manuals_mod.get_epub_storage_dir(tid, manual_id, v).resolve()
    target_file = (storage_dir / file_path).resolve()

    if not str(target_file).startswith(str(storage_dir)) or not target_file.exists() or not target_file.is_file():
        return HTMLResponse("Resource not found", status_code=404)

    ext = target_file.suffix.lower()
    media_types = {
        ".html": "application/xhtml+xml; charset=utf-8",
        ".xhtml": "application/xhtml+xml; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".otf": "font/otf",
    }
    mt = media_types.get(ext, "application/octet-stream")
    headers = {"X-Content-Type-Options": "nosniff"}
    if ext in EPUB_ACTIVE_DOCUMENT_EXTENSIONS:
        headers["Content-Security-Policy"] = EPUB_ACTIVE_CSP
        headers["X-Frame-Options"] = "SAMEORIGIN"

    return FileResponse(
        path=str(target_file),
        media_type=mt,
        headers=headers,
    )


# —— Phase 2: Progress, Bookmarks & Annotations API ——

def _validate_manual_and_version(
    tenant_id: Any,
    manual_id: Any,
    version: int | None = None,
    *,
    is_instructor: bool = False,
    chapter_index: int | None = None,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """Validate manual and version accessibility for the authenticated tenant and role.

    Raises:
        fastapi.HTTPException(status_code=404) if manual/version nonexistent, cross-tenant, or unpublished for learners.
        fastapi.HTTPException(status_code=400) if location or chapter_index is out of range.
        manuals_mod.DatabaseUnavailableError if DB persistence/lookup is unavailable.
    """
    from fastapi import HTTPException
    from app.modules import manuals as manuals_mod
    import psycopg

    try:
        manual = manuals_mod.get_manual(tenant_id, manual_id)
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError, manuals_mod.DatabaseUnavailableError) as exc:
        raise manuals_mod.DatabaseUnavailableError("Database unavailable during manual lookup") from exc

    if not manual:
        # Safe 404: do not disclose existence of cross-tenant or missing manual
        raise HTTPException(status_code=404, detail="Manual not found")

    if not is_instructor and manual.get("status") != "published":
        raise HTTPException(status_code=404, detail="Manual not found")

    ver_row: dict[str, Any] | None = None
    if version is not None:
        try:
            ver_row = manuals_mod.get_version(tenant_id, manual_id=manual_id, version=int(version))
        except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError, manuals_mod.DatabaseUnavailableError) as exc:
            raise manuals_mod.DatabaseUnavailableError("Database unavailable during version lookup") from exc

        if not ver_row:
            raise HTTPException(status_code=404, detail="Manual version not found")

        if not is_instructor and not ver_row.get("is_published"):
            raise HTTPException(status_code=404, detail="Manual version not found")

        if ver_row.get("manual_id") and str(ver_row.get("manual_id")) != str(manual_id):
            raise HTTPException(status_code=404, detail="Manual version not found")

        if chapter_index is not None:
            if chapter_index < 0:
                raise HTTPException(status_code=400, detail="Invalid chapter index")
            manifest = ver_row.get("epub_manifest")
            if isinstance(manifest, dict) and "spine_items" in manifest:
                spine = manifest.get("spine_items")
                if isinstance(spine, list) and len(spine) > 0 and chapter_index >= len(spine):
                    raise HTTPException(status_code=400, detail="Chapter index out of range for EPUB manifest")

    return manual, ver_row


@router.post("/api/v1/manuals/{manual_id}/progress")
async def api_save_progress(
    request: Request,
    manual_id: UUID,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    try:
        version = int(data.get("v") or data.get("version") or 1)
        chapter_index = int(data.get("chapter_index") or data.get("chapter") or 0)
        progress_percent = int(data.get("progress_percent") or 0)
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid numeric fields"}, status_code=400)

    if progress_percent < 0 or progress_percent > 100:
        return JSONResponse({"error": "Progress percent must be between 0 and 100"}, status_code=400)

    cfi = str(data.get("cfi") or f"epub-cfi-chap-{chapter_index+1}")
    if len(cfi) > 1000:
        return JSONResponse({"error": "CFI length exceeds limit"}, status_code=400)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        manual, ver_row = _validate_manual_and_version(
            tid,
            manual_id,
            version=version,
            is_instructor=is_inst,
            chapter_index=chapter_index,
        )
        progress = manuals_mod.save_reading_progress(
            tenant_id=tid,
            manual_id=manual_id,
            version=version,
            subject=sub,
            chapter_index=chapter_index,
            cfi=cfi,
            progress_percent=progress_percent,
        )
        try:
            from app.modules import xapi as xapi_mod

            mtitle = str(manual.get("title") or "eBook") if manual else "eBook"
            xapi_mod.record_reading_progressed(
                tenant_id=tid,
                subject=sub,
                learner_name=str(session.get("learner_name") or ""),
                manual_id=manual_id,
                manual_title=mtitle,
                chapter_index=chapter_index,
                progress_percent=progress_percent,
                cfi=cfi,
                version=version,
                send_lrs=True,
            )
            if progress_percent >= 100:
                xapi_mod.record_reading_completed(
                    tenant_id=tid,
                    subject=sub,
                    learner_name=str(session.get("learner_name") or ""),
                    manual_id=manual_id,
                    manual_title=mtitle,
                    version=version,
                    send_lrs=True,
                )
        except Exception:  # noqa: BLE001
            pass

        return JSONResponse({"status": "ok", "progress": progress})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.get("/api/v1/manuals/{manual_id}/progress")
async def api_get_progress(
    request: Request,
    manual_id: UUID,
    v: int = 1,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        _validate_manual_and_version(tid, manual_id, version=v, is_instructor=is_inst)
        progress = manuals_mod.get_reading_progress(
            tenant_id=tid,
            manual_id=manual_id,
            version=v,
            subject=sub,
        )
        return JSONResponse({"progress": progress})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.post("/api/v1/manuals/{manual_id}/bookmarks")
async def api_create_bookmark(
    request: Request,
    manual_id: UUID,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    try:
        version = int(data.get("v") or data.get("version") or 1)
        chapter_index = int(data.get("chapter_index") or data.get("chapter") or 0)
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid numeric fields"}, status_code=400)

    cfi = str(data.get("cfi") or manuals_mod.generate_epub_cfi(chapter_index))
    if len(cfi) > 1000:
        return JSONResponse({"error": "CFI length exceeds limit"}, status_code=400)

    title = str(data.get("title") or f"Chapter {chapter_index + 1} Bookmark")
    if len(title) > 255:
        return JSONResponse({"error": "Title exceeds maximum length of 255 characters"}, status_code=400)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        manual, ver_row = _validate_manual_and_version(
            tid,
            manual_id,
            version=version,
            is_instructor=is_inst,
            chapter_index=chapter_index,
        )
        bookmark = manuals_mod.create_bookmark(
            tenant_id=tid,
            manual_id=manual_id,
            version=version,
            subject=sub,
            chapter_index=chapter_index,
            cfi=cfi,
            title=title,
        )
        try:
            from uuid import NAMESPACE_URL, uuid5
            from app.modules import xapi as xapi_mod

            bm_id = bookmark.get("id") if isinstance(bookmark, dict) else None
            bm_sid = uuid5(NAMESPACE_URL, f"edvidura:xapi:bm:{bm_id}") if bm_id else None
            mtitle = str(manual.get("title") or "eBook") if manual else "eBook"
            xapi_mod.record_bookmark_created(
                tenant_id=tid,
                subject=sub,
                learner_name=str(session.get("learner_name") or ""),
                manual_id=manual_id,
                manual_title=mtitle,
                chapter_index=chapter_index,
                bookmark_title=title,
                cfi=cfi,
                version=version,
                statement_id=bm_sid,
                send_lrs=True,
            )
        except Exception:  # noqa: BLE001
            pass

        return JSONResponse({"status": "ok", "bookmark": bookmark})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.get("/api/v1/manuals/{manual_id}/bookmarks")
async def api_list_bookmarks(
    request: Request,
    manual_id: UUID,
    v: int = 1,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        _validate_manual_and_version(tid, manual_id, version=v, is_instructor=is_inst)
        bookmarks = manuals_mod.list_bookmarks(
            tenant_id=tid,
            manual_id=manual_id,
            version=v,
            subject=sub,
        )
        return JSONResponse({"bookmarks": bookmarks})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.post("/api/v1/manuals/{manual_id}/bookmarks/{bookmark_id}/delete")
async def api_delete_bookmark(
    request: Request,
    manual_id: UUID,
    bookmark_id: UUID,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        _validate_manual_and_version(tid, manual_id, is_instructor=is_inst)
        bm = manuals_mod.get_bookmark(tenant_id=tid, bookmark_id=bookmark_id)
        if not bm or bm.get("subject") != sub or str(bm.get("manual_id")) != str(manual_id):
            return JSONResponse({"error": "Bookmark not found"}, status_code=404)

        ok = manuals_mod.delete_bookmark(
            tenant_id=tid,
            bookmark_id=bookmark_id,
            subject=sub,
        )
        return JSONResponse({"status": "ok", "deleted": ok})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.post("/api/v1/manuals/{manual_id}/annotations")
async def api_create_annotation(
    request: Request,
    manual_id: UUID,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    try:
        version = int(data.get("v") or data.get("version") or 1)
        chapter_index = int(data.get("chapter_index") or data.get("chapter") or 0)
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid numeric fields"}, status_code=400)

    cfi_range = str(data.get("cfi_range") or manuals_mod.generate_epub_cfi(chapter_index))
    if len(cfi_range) > 1000:
        return JSONResponse({"error": "CFI range exceeds limit"}, status_code=400)

    highlight_text = str(data.get("highlight_text") or "")
    if len(highlight_text) > 5000:
        return JSONResponse({"error": "Highlight text exceeds limit of 5000 characters"}, status_code=400)

    annotation_text = str(data.get("annotation_text") or "")
    if len(annotation_text) > 5000:
        return JSONResponse({"error": "Annotation text exceeds limit of 5000 characters"}, status_code=400)

    color = str(data.get("color") or "yellow").lower()
    if color not in {"yellow", "green", "blue", "pink"}:
        return JSONResponse({"error": "Invalid color; allowed colors: yellow, green, blue, pink"}, status_code=400)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        manual, ver_row = _validate_manual_and_version(
            tid,
            manual_id,
            version=version,
            is_instructor=is_inst,
            chapter_index=chapter_index,
        )
        annotation = manuals_mod.create_annotation(
            tenant_id=tid,
            manual_id=manual_id,
            version=version,
            subject=sub,
            chapter_index=chapter_index,
            cfi_range=cfi_range,
            highlight_text=highlight_text,
            annotation_text=annotation_text,
            color=color,
        )
        try:
            from uuid import NAMESPACE_URL, uuid5
            from app.modules import xapi as xapi_mod

            ann_id = annotation.get("id") if isinstance(annotation, dict) else None
            ann_sid = uuid5(NAMESPACE_URL, f"edvidura:xapi:ann:{ann_id}") if ann_id else None
            mtitle = str(manual.get("title") or "eBook") if manual else "eBook"
            xapi_mod.record_annotation_added(
                tenant_id=tid,
                subject=sub,
                learner_name=str(session.get("learner_name") or ""),
                manual_id=manual_id,
                manual_title=mtitle,
                chapter_index=chapter_index,
                annotation_text=annotation_text,
                highlight_text=highlight_text,
                color=color,
                cfi_range=cfi_range,
                version=version,
                statement_id=ann_sid,
                send_lrs=True,
            )
        except Exception:  # noqa: BLE001
            pass

        return JSONResponse({"status": "ok", "annotation": annotation})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.get("/api/v1/manuals/{manual_id}/annotations")
async def api_list_annotations(
    request: Request,
    manual_id: UUID,
    v: int = 1,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        _validate_manual_and_version(tid, manual_id, version=v, is_instructor=is_inst)
        annotations = manuals_mod.list_annotations(
            tenant_id=tid,
            manual_id=manual_id,
            version=v,
            subject=sub,
        )
        return JSONResponse({"annotations": annotations})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.post("/api/v1/manuals/{manual_id}/annotations/{annotation_id}")
async def api_update_annotation(
    request: Request,
    manual_id: UUID,
    annotation_id: UUID,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    try:
        _validate_manual_and_version(tid, manual_id, is_instructor=is_inst)
        ann = manuals_mod.get_annotation(tenant_id=tid, annotation_id=annotation_id)
        if not ann or ann.get("subject") != sub or str(ann.get("manual_id")) != str(manual_id):
            return JSONResponse({"error": "Annotation not found"}, status_code=404)

        # Validate that annotation's version is still an allowed version for the operation
        _validate_manual_and_version(tid, manual_id, version=ann.get("version"), is_instructor=is_inst)

        new_text: str | None = None
        if "annotation_text" in data:
            new_text = str(data["annotation_text"] or "")
            if len(new_text) > 5000:
                return JSONResponse({"error": "Annotation text exceeds limit of 5000 characters"}, status_code=400)

        new_color: str | None = None
        if "color" in data and data["color"]:
            col_candidate = str(data["color"]).lower()
            if col_candidate not in {"yellow", "green", "blue", "pink"}:
                return JSONResponse({"error": "Invalid color; allowed colors: yellow, green, blue, pink"}, status_code=400)
            new_color = col_candidate

        ok = manuals_mod.update_annotation(
            tenant_id=tid,
            annotation_id=annotation_id,
            subject=sub,
            annotation_text=new_text,
            color=new_color,
        )
        return JSONResponse({"status": "ok", "updated": ok})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


@router.post("/api/v1/manuals/{manual_id}/annotations/{annotation_id}/delete")
async def api_delete_annotation(
    request: Request,
    manual_id: UUID,
    annotation_id: UUID,
    token: str | None = None,
):
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    from app.modules import manuals as manuals_mod

    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    sub = str(session.get("subject") or "").strip()
    if not sub:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tid = session["tenant_id"]
    is_inst = bool(session.get("is_instructor"))

    try:
        _validate_manual_and_version(tid, manual_id, is_instructor=is_inst)
        ann = manuals_mod.get_annotation(tenant_id=tid, annotation_id=annotation_id)
        if not ann or ann.get("subject") != sub or str(ann.get("manual_id")) != str(manual_id):
            return JSONResponse({"error": "Annotation not found"}, status_code=404)

        ok = manuals_mod.delete_annotation(
            tenant_id=tid,
            annotation_id=annotation_id,
            subject=sub,
        )
        return JSONResponse({"status": "ok", "deleted": ok})
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except manuals_mod.DatabaseUnavailableError:
        return JSONResponse({"error": "Database service is currently unavailable"}, status_code=503)


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
        page_subtitle="Approved manuals & lessons for Ask Vidura",
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
        page_title="Micro-learning planner",
        page_subtitle="Upload skill reels · students swipe them in Micro-learning",
        extra={
            "missing": pack.get("missing") or [],
            "covered": pack.get("covered") or [],
            "missing_count": pack.get("missing_count") or 0,
            "covered_count": pack.get("covered_count") or 0,
            "ok_message": ok or "",
            "all_skills": (pack.get("missing") or []) + (pack.get("covered") or []),
        },
    )


@router.post("/teacher/dct/reel", response_class=HTMLResponse)
async def teacher_dct_reel_upload(request: Request, token: str | None = None):
    """Upload or link a short reel video for a skill → student Micro Reels."""
    from app.modules import adaptive as adaptive_mod
    from uuid import uuid4

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    skill_id = str(form.get("skill_id") or "").strip()
    caption = str(form.get("caption") or "").strip()
    video_url = str(form.get("video_url") or "").strip()
    tid = str(session["tenant_id"])

    upload = form.get("video_file") or form.get("reel_file")
    if upload is not None and getattr(upload, "filename", None):
        fname = _safe_upload_name(str(upload.filename))
        lower = fname.lower()
        if not any(lower.endswith(ext) for ext in (".mp4", ".webm", ".mov", ".m4v")):
            return RedirectResponse(
                url=f"/teacher/dct?token={tok}&ok=Use+mp4+webm+or+mov",
                status_code=303,
            )
        raw = await upload.read()
        max_bytes = 40 * 1024 * 1024
        if len(raw) > max_bytes:
            return RedirectResponse(
                url=f"/teacher/dct?token={tok}&ok=Video+too+large+(max+40MB)",
                status_code=303,
            )
        if len(raw) < 64:
            return RedirectResponse(
                url=f"/teacher/dct?token={tok}&ok=Empty+video+file",
                status_code=303,
            )
        dest_dir = (
            Path(__file__).resolve().parents[1] / "static" / "uploads" / tid / "reels"
        )
        dest_dir.mkdir(parents=True, exist_ok=True)
        stored = f"{uuid4().hex[:12]}-{fname}"
        (dest_dir / stored).write_bytes(raw)
        video_url = f"/static/uploads/{tid}/reels/{stored}"

    if not skill_id or not video_url:
        return RedirectResponse(
            url=f"/teacher/dct?token={tok}&ok=Pick+a+skill+and+upload+or+paste+a+video",
            status_code=303,
        )

    course = _bound_course(session) or content.ensure_primary_course(
        session["tenant_id"]
    )
    try:
        adaptive_mod.publish_skill_reel(
            session["tenant_id"],
            skill_id,
            video_url=video_url,
            caption=caption,
            course_id=(course or {}).get("id"),
        )
    except ValueError as exc:
        return RedirectResponse(
            url=f"/teacher/dct?token={tok}&ok={str(exc).replace(' ', '+')[:80]}",
            status_code=303,
        )
    return RedirectResponse(
        url=f"/teacher/dct?token={tok}&ok=Reel+saved+—+students+see+it+in+Micro-learning",
        status_code=303,
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
    classes = list_classes_with_roster(session["tenant_id"])
    class_opts = [
        {
            "id": str(c["id"]),
            "label": (
                f"{c.get('class_name') or c.get('class_code') or 'Class'}"
                + (f" · {c.get('subject')}" if c.get("subject") else "")
            ),
        }
        for c in classes
    ]
    rows = manuals_mod.list_manuals(session["tenant_id"], include_unpublished=True)
    enriched = []
    for m in rows:
        vers = manuals_mod.list_versions(session["tenant_id"], m["id"])
        item = dict(m)
        item["versions"] = vers
        item["latest"] = vers[0] if vers else None
        item["class_ids"] = manuals_mod.class_ids_for_manual(
            session["tenant_id"], m["id"]
        )
        item["locales"] = manuals_mod.list_locales(session["tenant_id"], m["id"])
        enriched.append(item)
    return _shell(
        request,
        "teacher_manuals.html",
        session,
        active_page="teacher_manuals",
        page_title="Manual versions",
        page_subtitle="Technical manuals with version history · assign per class",
        extra={
            "manuals": enriched,
            "class_opts": class_opts,
            "session_class_id": str(session.get("class_id") or ""),
            "ok_message": ok or "",
            "manual_languages": manuals_mod.list_manual_languages(),
            "manual_states": manuals_mod.list_states(),
        },
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
    source_language = str(form.get("source_language") or "en-IN")
    if not title:
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Title+required",
            status_code=303,
        )
    try:
        created = manuals_mod.create_manual(
            tenant_id=session["tenant_id"],
            title=title,
            description=description,
            body_md=body_md,
            subject=str(session.get("subject") or ""),
            publish=publish,
            source_language=source_language,
        )
        # Assign to checked classes, else current LTI class
        form_classes = [
            str(v).strip()
            for v in form.getlist("class_ids")
            if str(v).strip()
        ]
        if not form_classes:
            bound = str(session.get("class_id") or "").strip()
            if bound:
                form_classes = [bound]
        if form_classes:
            manuals_mod.set_manual_classes(
                session["tenant_id"],
                manual_id=created["id"],
                class_ids=form_classes,
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


@router.post("/teacher/manuals/{manual_id}/classes", response_class=HTMLResponse)
async def teacher_manual_set_classes(
    request: Request, manual_id: UUID, token: str | None = None
):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    class_ids = [
        str(v).strip() for v in form.getlist("class_ids") if str(v).strip()
    ]
    manuals_mod.set_manual_classes(
        session["tenant_id"], manual_id=manual_id, class_ids=class_ids
    )
    n = len(class_ids)
    return RedirectResponse(
        url=(
            f"/teacher/manuals?token={tok}&ok=Assigned+to+{n}+class"
            + ("es" if n != 1 else "")
        ),
        status_code=303,
    )


@router.post("/teacher/manuals/from-pdf", response_class=HTMLResponse)
async def teacher_manual_from_pdf(
    request: Request, token: str | None = None
):
    """D10: PDF/text upload → versioned manual (no quiz generation).

    Set source language (e.g. Sanskrit) so the reader dropdown can
    auto-translate into state languages.
    """
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
    source_language = str(form.get("source_language") or "sa-IN")
    if upload is None or not getattr(upload, "filename", None):
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Choose+a+PDF+or+text+file",
            status_code=303,
        )
    fname = str(upload.filename or "upload.pdf")
    data = await upload.read()
    try:
        # Larger cap for discourse / handbook PDFs (incl. Sanskrit).
        extracted = extract_text_from_bytes(
            data, filename=fname, max_chars=120_000
        )
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
            manuals_mod.set_source_language(
                tenant_id=session["tenant_id"],
                manual_id=manual_id,
                source_language=source_language,
            )
            # Stale Telugu/etc. from older PDF must re-translate.
            manuals_mod.clear_auto_locales(session["tenant_id"], manual_id)
            msg = "Version+from+PDF+added"
        else:
            created = manuals_mod.create_manual(
                tenant_id=session["tenant_id"],
                title=title,
                description=description or f"Imported from {fname}",
                body_md=body,
                subject=str(session.get("subject") or ""),
                publish=publish,
                source_language=source_language,
            )
            bound = str(session.get("class_id") or "").strip()
            if bound:
                manuals_mod.link_manual_to_class(
                    session["tenant_id"],
                    manual_id=created["id"],
                    class_id=bound,
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


@router.post("/teacher/manuals/upload-epub", response_class=HTMLResponse)
async def teacher_upload_epub(
    request: Request, token: str | None = None
):
    """EPUB3 archive upload → validate, extract, and store as eBook version."""
    import shutil
    import tempfile
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    upload = form.get("epub_file")
    title = str(form.get("title") or "").strip()
    description = str(form.get("description") or "").strip()
    publish = str(form.get("publish") or "1") != "0"
    manual_id = str(form.get("manual_id") or "").strip()

    if upload is None or not getattr(upload, "filename", None):
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Choose+an+EPUB+file",
            status_code=303,
        )

    fname = str(upload.filename or "ebook.epub")
    if not fname.lower().endswith(".epub"):
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=File+must+have+.epub+extension",
            status_code=303,
        )

    data = await upload.read()
    tid = session["tenant_id"]

    if manual_id:
        existing = manuals_mod.get_manual(tid, manual_id)
        if not existing:
            return RedirectResponse(
                url=f"/teacher/manuals?token={tok}&ok=Manual+not+found",
                status_code=303,
            )
        versions = manuals_mod.list_versions(tid, manual_id)
        next_v = max([int(v["version"]) for v in versions], default=0) + 1
        target_mid = manual_id
    else:
        next_v = 1
        target_mid = None

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            manifest, sha256_hash = manuals_mod.validate_and_extract_epub(
                data, target_dir=tmpdir
            )
        except manuals_mod.EPUBValidationError as exc:
            msg = f"EPUB validation error: {exc}".replace(" ", "+")
            return RedirectResponse(
                url=f"/teacher/manuals?token={tok}&ok={msg}",
                status_code=303,
            )
        except Exception as exc:  # noqa: BLE001
            msg = f"Error unpacking EPUB: {exc}".replace(" ", "+")
            return RedirectResponse(
                url=f"/teacher/manuals?token={tok}&ok={msg}",
                status_code=303,
            )

        epub_title = title or manifest.get("title") or Path(fname).stem.replace("_", " ").title()

        if target_mid:
            storage_dir = manuals_mod.get_epub_storage_dir(tid, target_mid, next_v)
            shutil.copytree(tmpdir, storage_dir, dirs_exist_ok=True)
            manuals_mod.add_version(
                tenant_id=tid,
                manual_id=target_mid,
                body_md="",
                changelog=f"Uploaded EPUB {fname}",
                subject=str(session.get("subject") or ""),
                publish=publish,
                content_type="epub",
                epub_filename=fname,
                epub_sha256=sha256_hash,
                epub_manifest=manifest,
            )
        else:
            created = manuals_mod.create_manual(
                tenant_id=tid,
                title=epub_title,
                description=description or f"Uploaded EPUB {fname}",
                body_md="",
                subject=str(session.get("subject") or ""),
                publish=publish,
                content_type="epub",
                epub_filename=fname,
                epub_sha256=sha256_hash,
                epub_manifest=manifest,
            )
            target_mid = str(created["id"])
            storage_dir = manuals_mod.get_epub_storage_dir(tid, target_mid, 1)
            shutil.copytree(tmpdir, storage_dir, dirs_exist_ok=True)

    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok=eBook+uploaded+successfully",
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


@router.post("/teacher/manuals/{manual_id}/locales", response_class=HTMLResponse)
async def teacher_manual_upsert_locale(
    request: Request, manual_id: UUID, token: str | None = None
):
    """Add or update a state-language body (e.g. Telugu for Sanskrit source)."""
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    language_code = str(form.get("language_code") or "").strip()
    state = str(form.get("state") or "").strip()
    # State picker wins when set (maps AP→te-IN, TN→ta-IN, …).
    if state:
        language_code = manuals_mod.language_for_state(state)
    title = str(form.get("title") or "").strip()
    body_md = str(form.get("body_md") or "")
    publish = str(form.get("publish") or "1") != "0"
    if not language_code:
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Pick+a+language+or+state",
            status_code=303,
        )
    if not body_md.strip():
        return RedirectResponse(
            url=f"/teacher/manuals?token={tok}&ok=Locale+body+required",
            status_code=303,
        )
    try:
        row = manuals_mod.upsert_locale(
            tenant_id=session["tenant_id"],
            manual_id=manual_id,
            language_code=language_code,
            body_md=body_md,
            title=title,
            publish=publish,
        )
        msg = f"Locale+{row['language_code']}+saved"
    except ValueError as exc:
        msg = str(exc).replace(" ", "+")
    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok={msg}",
        status_code=303,
    )


@router.post(
    "/teacher/manuals/{manual_id}/source-language",
    response_class=HTMLResponse,
)
async def teacher_manual_set_source_language(
    request: Request, manual_id: UUID, token: str | None = None
):
    from app.modules import manuals as manuals_mod

    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    form = await request.form()
    tok = str(form.get("quiz_token") or token or _ensure_token(session))
    source_language = str(form.get("source_language") or "en-IN")
    manuals_mod.set_source_language(
        tenant_id=session["tenant_id"],
        manual_id=manual_id,
        source_language=source_language,
    )
    return RedirectResponse(
        url=f"/teacher/manuals?token={tok}&ok=Source+language+updated",
        status_code=303,
    )
