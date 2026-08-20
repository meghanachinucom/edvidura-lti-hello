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
    lesson = content.get_lesson(session["tenant_id"], lesson_id)
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
    lessons = content.list_lessons(session["tenant_id"], lesson["course_id"])
    _, next_l = content.neighbor_lessons(lessons, lesson_id)
    if next_l and next_l.get("lesson_type") == "quiz":
        return RedirectResponse(url=f"/quiz?token={qtok}", status_code=303)
    if next_l:
        return RedirectResponse(
            url=f"/lessons/{next_l['id']}?token={qtok}", status_code=303
        )
    return RedirectResponse(url=f"/lessons?token={qtok}", status_code=303)


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
async def quiz_form(request: Request, token: str | None = None):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    questions = questions_for_tenant(session.get("tenant_id"))
    return _shell(
        request,
        "quiz_session.html",
        session,
        active_page="quiz_session",
        page_title="Take the quiz",
        page_subtitle="Answer each question, then submit",
        extra={"questions": questions, "max_score": len(questions)},
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

    session["last_result_id"] = str(attempt["id"])
    request.session[SESSION_KEY] = session
    return _shell(
        request,
        "quiz_result.html",
        session,
        active_page="quiz_result",
        page_title="Your result",
        page_subtitle="Course readiness check",
        extra={
            "score": attempt["score"],
            "max_score": attempt["max_score"],
            "grade_sent": attempt["grade_sent"],
            "grade_error": attempt.get("grade_error"),
            "attempt_id": str(attempt["id"]),
            "learner_name": attempt.get("learner_name") or attempt.get("subject"),
            "review": _build_review(
                attempt.get("answers"),
                questions_for_tenant(session.get("tenant_id")),
            ),
        },
    )


@router.get("/teacher/attempts", response_class=HTMLResponse)
async def teacher_attempts(request: Request, token: str | None = None):
    session = require_instructor(request, token=token)
    if isinstance(session, HTMLResponse):
        return session
    summary = db.quiz_attempt_class_summary(session["tenant_id"], limit=200)
    learners = []
    for L in summary["learners"]:
        item = dict(L)
        item["best_at"] = (
            L["best_at"].isoformat() if getattr(L.get("best_at"), "isoformat", None) else str(L.get("best_at") or "")
        )
        learners.append(item)
    course = content.get_primary_course(session["tenant_id"])
    progress_roster = []
    if course:
        progress_roster = content.lesson_completion_roster(
            session["tenant_id"], course_id=course["id"]
        )
        # Prefer display names from quiz attempts when available
        names = {
            str(L["subject"]): str(L["learner_name"])
            for L in learners
            if L.get("subject")
        }
        for row in progress_roster:
            row["learner_name"] = names.get(row["subject"], row["subject"])
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
            "learner_count": summary["learner_count"],
            "avg_percent": summary["avg_percent"],
            "pass_rate": summary["pass_rate"],
            "synced_count": summary["synced_count"],
            "learners": learners,
            "progress_roster": progress_roster,
            "course_title": (course or {}).get("title") or "Course",
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
    lessons = content.list_lessons(session["tenant_id"], course["id"])
    from app.modules.quiz import get_primary_quiz, list_quiz_question_rows

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
    existing = content.get_lesson(session["tenant_id"], lesson_id)
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
