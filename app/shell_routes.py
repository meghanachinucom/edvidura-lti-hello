"""Nine product screens in the cinematic shell (Syne / Outfit / amber)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app import db
from app.modules import content
from app.modules.quiz import MAX_SCORE, QUESTIONS, questions_for_tenant
from app.modules.school import (
    class_roster_match_keys,
    create_class,
    create_teacher,
    list_classes_with_roster,
    list_school_students,
    list_teachers,
    school_snapshot,
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


def _browser_moodle_url(url: str | None, *, base: str | None = None) -> str:
    raw = str(url or "").strip()
    moodle_base = (
        str(base or "").strip().rstrip("/")
        or os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
        or "http://localhost:8085"
    )
    if not raw:
        return f"{moodle_base}/my/"
    if raw.startswith("/"):
        raw = f"{moodle_base}{raw}"
    raw = raw.replace("://host.docker.internal", "://localhost")
    for docker_host in ("http://moodle", "https://moodle", "http://moodle-moodle-1"):
        if raw == docker_host or raw.startswith(docker_host + "/"):
            raw = "http://localhost:8085" + raw[len(docker_host) :]
            break
    return raw


def resolve_moodle_return(session: dict[str, Any]) -> str:
    base = str(session.get("moodle_base_url") or "").strip() or None
    return _browser_moodle_url(
        session.get("moodle_return_url") or base or None,
        base=base,
    )


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
    """Sidebar + Home continue path from primary course progress."""
    course = content.get_primary_course(session["tenant_id"])
    progress = None
    up_next_title = "Lessons"
    up_next_href = f"/lessons?token={token}"
    up_next_meta = "Open your course path"
    path_lessons = "now"
    path_quiz = ""
    path_results = ""
    if course:
        progress = content.course_progress(
            session["tenant_id"],
            course_id=course["id"],
            subject=str(session.get("subject") or ""),
        )
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
            up_next_meta = "Continue where you left off"
        if session.get("last_result_id"):
            path_results = "done" if path_quiz == "now" else "now"
            if progress.get("all_lessons_done"):
                path_quiz = "done"
                path_results = "now"
    return {
        "shell_course": course,
        "shell_progress": progress,
        "up_next_title": up_next_title,
        "up_next_href": up_next_href,
        "up_next_meta": up_next_meta,
        "path_lessons": path_lessons,
        "path_quiz": path_quiz,
        "path_results": path_results,
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
    moodle_return = resolve_moodle_return(session)
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
        "moodle_return_url": moodle_return,
        "moodle_return_href": f"/return-to-moodle?token={token}",
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


@router.get("/return-to-moodle", response_class=HTMLResponse)
async def return_to_moodle(request: Request, token: str | None = None):
    from app.quiz_routes import resolve_quiz_session

    session = resolve_quiz_session(request, token=token) or {}
    target = resolve_moodle_return(session) if session else _browser_moodle_url(None)
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
<title>Returning to Moodle…</title>
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
  <p>Returning to Moodle…</p>
  <p><a href="{safe}" target="_top" style="color:#fca311">Continue to Moodle</a></p>
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
        course_row = content.get_primary_course(session["tenant_id"])
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

    course = content.get_primary_course(session["tenant_id"])
    progress = None
    continue_href = f"/lessons?token={_ensure_token(session)}"
    continue_label = "Start lessons"
    chapter_items: list[dict[str, Any]] = []
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
            continue_href = f"/quiz?token={_ensure_token(session)}"
            continue_label = "Start quiz"
        elif nxt:
            continue_href = f"/lessons/{nxt['id']}?token={_ensure_token(session)}"
            continue_label = (
                "Continue learning"
                if progress.get("completed_count")
                else "Start lessons"
            )
        elif progress.get("all_lessons_done"):
            continue_href = f"/quiz?token={_ensure_token(session)}"
            continue_label = "Start quiz"

    return _shell(
        request,
        "launch_hub.html",
        session,
        active_page="launch_hub",
        page_title="Home",
        page_subtitle=str(session.get("course") or ""),
        extra={
            "my_attempt_count": len(mine),
            "last_score": last.get("score") if last else None,
            "last_max": last.get("max_score") if last else MAX_SCORE,
            "course_row": course,
            "progress": progress,
            "chapter_items": chapter_items,
            "continue_href": continue_href,
            "continue_label": continue_label,
        },
    )


@router.get("/lessons", response_class=HTMLResponse)
async def lessons_list(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    course = content.get_primary_course(session["tenant_id"])
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
                "href": (
                    f"/quiz?token={_ensure_token(session)}"
                    if L["lesson_type"] == "quiz"
                    else f"/lessons/{lid}?token={_ensure_token(session)}"
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
        },
    )


@router.get("/lessons/{lesson_id}", response_class=HTMLResponse)
async def lesson_player(
    request: Request, lesson_id: UUID, token: str | None = None
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
    prev_l, next_l = content.neighbor_lessons(lessons, lesson_id)
    done = content.completed_lesson_ids(
        session["tenant_id"],
        course_id=lesson["course_id"],
        subject=str(session.get("subject") or ""),
    )
    next_href = None
    if next_l:
        next_href = (
            f"/quiz?token={_ensure_token(session)}"
            if next_l["lesson_type"] == "quiz"
            else f"/lessons/{next_l['id']}?token={_ensure_token(session)}"
        )
    prev_href = (
        f"/lessons/{prev_l['id']}?token={_ensure_token(session)}" if prev_l else None
    )
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
    questions = questions_for_tenant(session.get("tenant_id"))
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

    questions = list(questions_for_tenant(session.get("tenant_id")))
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
    return _shell(
        request,
        "quiz_session.html",
        session,
        active_page="quiz_session",
        page_title="Practice quiz" if is_practice else "Take the quiz",
        page_subtitle=(
            "Sandbox — no Moodle grade sync"
            if is_practice
            else (
                f"Retry {len(questions)} missed item(s)"
                if retry_ids
                else "Answer each question, then submit"
            )
        ),
        extra={
            "questions": questions,
            "max_score": len(questions),
            "practice_mode": is_practice,
            "retry_from": retry or "",
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

    session["last_result_id"] = str(attempt["id"])
    request.session[SESSION_KEY] = session
    token_s = _ensure_token(session)
    questions = questions_for_tenant(session.get("tenant_id"))
    review = _build_review(attempt.get("answers"), questions)
    first_lesson_id = None
    first_manual_id = None
    manual_version = None
    try:
        course = content.get_primary_course(session["tenant_id"])
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
    )
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
    competencies = competency_profile(attempt.get("answers"))
    failed = [r for r in review if not r.get("correct")]
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
            "attempt_id": str(attempt["id"]),
            "learner_name": attempt.get("learner_name") or attempt.get("subject"),
            "review": review,
            "receipt": receipt,
            "stickers": stickers,
            "competencies": competencies,
            "retry_href": (
                f"/quiz?token={token_s}&retry={attempt['id']}"
                if failed
                else f"/quiz?token={token_s}"
            ),
            "practice_href": f"/quiz?token={token_s}&practice=1",
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
):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    classes = list_classes_with_roster(session["tenant_id"])
    subjects = None
    name_keys = None
    selected_class = None
    if class_id:
        names, codes = class_roster_match_keys(session["tenant_id"], class_id)
        name_keys = names
        subjects = codes
        selected_class = next((c for c in classes if str(c["id"]) == str(class_id)), None)
    summary = db.quiz_attempt_class_summary(
        session["tenant_id"],
        limit=500,
        course_label=(course or "").strip() or None,
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
    course_row = content.get_primary_course(session["tenant_id"])
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
        # If filtering by class, keep progress for matching names/subjects only
        if class_id and (subjects is not None or name_keys is not None):
            sub_set = {str(s).lower() for s in (subjects or [])}
            name_set = {str(n).lower() for n in (name_keys or [])}
            progress_roster = [
                p
                for p in progress_roster
                if str(p.get("subject") or "").lower() in sub_set
                or str(p.get("learner_name") or p.get("subject") or "").lower() in name_set
                or str(names_map.get(str(p.get("subject") or ""), "")).lower() in name_set
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
    competency_map = class_competency_map(summary.get("attempts") or [])
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
        },
    )


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
    subjects = None
    name_keys = None
    if class_id:
        names, codes = class_roster_match_keys(session["tenant_id"], class_id)
        name_keys = names
        subjects = codes
    summary = db.quiz_attempt_class_summary(
        session["tenant_id"],
        limit=1000,
        course_label=(course or "").strip() or None,
        date_from=(date_from or "").strip() or None,
        date_to=(date_to or "").strip() or None,
        subjects=subjects,
        name_keys=name_keys,
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
            "admin_count": 0,
            "teacher_count": 0,
            "class_count": 0,
            "chapter_count": 0,
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
        },
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
        page_subtitle="Staff for this school only",
        extra={
            "teachers": teachers,
            "ok_message": ok,
        },
    )


@router.post("/school-admin/teachers", response_class=HTMLResponse)
async def school_admin_teachers_create(
    request: Request,
    token: str = Form(""),
    teacher_code: str = Form(""),
    name: str = Form(""),
    email: str = Form(""),
):
    session = require_school_admin(request, token=token or None)
    if isinstance(session, HTMLResponse):
        return session
    tok = _ensure_token(session)
    if not teacher_code.strip() or not name.strip() or not email.strip():
        return RedirectResponse(
            url=f"/school-admin/teachers?token={tok}&ok=Code,+name,+and+email+required",
            status_code=303,
        )
    create_teacher(
        session["tenant_id"],
        teacher_code=teacher_code,
        name=name,
        email=email,
    )
    return RedirectResponse(
        url=f"/school-admin/teachers?token={tok}&ok=Teacher+saved",
        status_code=303,
    )


@router.get("/school-admin/classes", response_class=HTMLResponse)
async def school_admin_classes(
    request: Request, token: str | None = None, ok: str | None = None
):
    session = require_school_admin(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    classes = list_classes_with_roster(session["tenant_id"])
    return _shell(
        request,
        "school_admin_classes.html",
        session,
        active_page="school_admin_classes",
        page_title="Classes",
        page_subtitle="Rosters for this school only",
        extra={"classes": classes, "ok_message": ok},
    )


@router.post("/school-admin/classes", response_class=HTMLResponse)
async def school_admin_classes_create(
    request: Request,
    token: str = Form(""),
    class_code: str = Form(""),
    class_name: str = Form(""),
    subject: str = Form(""),
    term: str = Form(""),
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
    )
    return RedirectResponse(
        url=f"/school-admin/classes?token={tok}&ok=Class+saved",
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
        page_subtitle="Enrolled learners in this school",
        extra={"students": students, "classes": classes},
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

    return _shell(
        request,
        "teacher_analytics.html",
        session,
        active_page="teacher_analytics",
        page_title="Analytics",
        page_subtitle="In-app BI from attempts + xAPI",
        extra={"dash": dash, "metabase_url": get_settings().metabase_url},
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
            "provider": result.get("provider"),
            "model": result.get("model"),
            "note": result.get("note") or "",
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
            "focus": focus_slug,
            "focus_label": focus_label,
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
