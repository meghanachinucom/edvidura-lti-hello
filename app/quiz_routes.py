"""Slice A quiz routes: launch session → quiz → score → optional AGS + teacher list."""
from __future__ import annotations

import html
import traceback
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from app import db
from app.ags_passback import send_quiz_grade
from app.launch_cache import LAUNCH_CACHE
from app.lti_fastapi import FastAPIMessageLaunch, FastAPIRequest, make_launch_data_storage
from app.quiz_content import MAX_SCORE, QUESTIONS, grade_answers
from app.tenancy import build_tool_conf_from_db

router = APIRouter(tags=["quiz"])

SESSION_KEY = "lti_slice_a"
QUIZ_CTX_PREFIX = "quizctx:"


def _page(title: str, body: str, status_code: int = 200) -> HTMLResponse:
    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{html.escape(title)}</title>
  <style>
    :root {{ --ink:#1c2430; --muted:#5b6474; --bg:#f7f4ef; --card:#fff; --line:#e5e1d8;
             --accent:#0f6b6b; --ok:#15803d; --bad:#b91c1c; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; font-family:"Segoe UI",system-ui,sans-serif; background:var(--bg);
           color:var(--ink); line-height:1.5; }}
    .wrap {{ max-width:640px; margin:0 auto; padding:28px 18px 48px; }}
    h1 {{ font-size:1.45rem; margin:0 0 8px; color:var(--accent); }}
    .sub {{ color:var(--muted); font-size:0.92rem; margin-bottom:18px; }}
    .card {{ background:var(--card); border:1px solid var(--line); border-radius:12px;
             padding:18px 20px; margin:12px 0; }}
    .q {{ margin-bottom:18px; }}
    .q legend {{ font-weight:600; margin-bottom:8px; }}
    label {{ display:block; margin:6px 0; cursor:pointer; }}
    button, .btn {{ display:inline-block; background:var(--accent); color:#fff; border:0;
                    border-radius:8px; padding:10px 16px; font-size:0.95rem; cursor:pointer;
                    text-decoration:none; }}
    .btn.secondary {{ background:transparent; color:var(--accent); border:1px solid var(--accent); }}
    table {{ width:100%; border-collapse:collapse; font-size:0.9rem; }}
    th, td {{ text-align:left; padding:8px 6px; border-bottom:1px solid var(--line);
              vertical-align:top; }}
    th {{ color:var(--muted); font-weight:600; }}
    .ok {{ color:var(--ok); font-weight:600; }}
    .bad {{ color:var(--bad); font-weight:600; }}
    .meta {{ font-size:0.85rem; color:var(--muted); }}
    code {{ background:#efece4; padding:1px 5px; border-radius:4px; }}
  </style>
</head>
<body><div class="wrap">{body}</div></body>
</html>""",
        status_code=status_code,
    )


def store_quiz_context(data: dict[str, Any], *, ttl_sec: int = 3600) -> str:
    """Persist launch context in memory cache (survives cookie/session loss on local HTTP)."""
    token = uuid4().hex
    payload = {**dict(data), "quiz_token": token}
    LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{token}", payload, exp=ttl_sec)
    return token


def load_quiz_context(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    data = LAUNCH_CACHE.get(f"{QUIZ_CTX_PREFIX}{token}")
    return dict(data) if isinstance(data, dict) else None


def resolve_quiz_session(
    request: Request, *, token: str | None = None
) -> dict[str, Any] | None:
    data = request.session.get(SESSION_KEY)
    if isinstance(data, dict) and data.get("tenant_id") and data.get("subject"):
        return dict(data)
    cached = load_quiz_context(token)
    if cached and cached.get("tenant_id") and cached.get("subject"):
        request.session[SESSION_KEY] = cached
        return dict(cached)
    return None


def require_quiz_session(
    request: Request, *, token: str | None = None
) -> dict[str, Any] | HTMLResponse:
    data = resolve_quiz_session(request, token=token)
    if not data:
        return _page(
            "Launch required",
            """
            <h1>Launch required</h1>
            <p class="sub">Open this tool from Moodle (LTI launch) first, then submit the quiz.</p>
            <p><a class="btn secondary" href="/">Home</a></p>
            """,
            status_code=401,
        )
    return data


def _restore_launch(request: Request, launch_id: str) -> FastAPIMessageLaunch:
    # Re-inject cached JWT body when session cookies were dropped (local HTTP / new window)
    cached = LAUNCH_CACHE.get(f"launchdata:{launch_id}")
    if cached is not None:
        request.session[launch_id] = cached

    tool_conf = build_tool_conf_from_db(require_platforms=True)
    fastapi_request = FastAPIRequest(request)
    storage = make_launch_data_storage(fastapi_request, LAUNCH_CACHE)
    return FastAPIMessageLaunch.from_cache(
        launch_id,
        fastapi_request,
        tool_conf,
        launch_data_storage=storage,
    )


def _try_ags(
    request: Request, session: dict[str, Any], *, score: int
) -> tuple[bool, str | None]:
    """Run AGS in-request (not a worker thread) so session/launch restore works."""
    launch_id = session.get("launch_id")
    if not launch_id:
        return False, "No launch_id in session — grade not sent"

    if session.get("ags_available") is False:
        return (
            False,
            "AGS not on this launch. In Moodle: tool Services → Assignment and Grade Services "
            "= Use this service; activity Privacy → Accept grades = Yes; Grade type = Point. "
            "Then relaunch as a student.",
        )

    try:
        message_launch = _restore_launch(request, str(launch_id))
        return send_quiz_grade(
            message_launch,
            user_id=str(session["subject"]),
            score=float(score),
            score_maximum=float(MAX_SCORE),
        )
    except Exception as exc:  # noqa: BLE001
        return False, f"AGS failed: {exc}"


@router.get("/launch-hub", response_class=HTMLResponse)
async def launch_hub(request: Request, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session

    quiz_token = token or session.get("quiz_token") or ""

    from app.main import templates

    return templates.TemplateResponse(
        request=request,
        name="launch_hub.html",
        context={
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug") or "Current Institution",
            "course": session.get("course") or "Current Course",
            "user_name": session.get("learner_name") or session.get("subject") or "Learner",
            "user_role": "Instructor" if session.get("is_instructor") else "Student",
            "quiz_token": quiz_token,
            "active_page": "launch_hub",
            "page_title": "LTI Launch Hub",
            "ags_available": session.get("ags_available", False),
            "session": session,
        },
    )


@router.get("/active-quizzes", response_class=HTMLResponse)
async def active_quizzes(request: Request, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session

    quiz_token = token or session.get("quiz_token") or ""

    recent_attempts = []
    try:
        attempts = db.list_quiz_attempts_for_tenant(session["tenant_id"], limit=10)
        if not session.get("is_instructor"):
            recent_attempts = [
                a for a in attempts if str(a.get("subject")) == str(session.get("subject"))
            ]
        else:
            recent_attempts = attempts
    except Exception:  # noqa: BLE001
        recent_attempts = []

    from app.main import templates

    return templates.TemplateResponse(
        request=request,
        name="active_quizzes.html",
        context={
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug") or "Current Institution",
            "course": session.get("course") or "Current Course",
            "user_name": session.get("learner_name") or session.get("subject") or "Learner",
            "user_role": "Instructor" if session.get("is_instructor") else "Student",
            "quiz_token": quiz_token,
            "active_page": "active_quizzes",
            "page_title": "Active Quizzes",
            "recent_attempts": recent_attempts,
            "questions_count": len(QUESTIONS),
            "max_score": MAX_SCORE,
            "session": session,
        },
    )


@router.get("/quiz", response_class=HTMLResponse)
async def quiz_form(request: Request, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session

    # Prefer token from query; else create one so submit works without cookies
    quiz_token = token or session.get("quiz_token")
    if not quiz_token or not load_quiz_context(str(quiz_token)):
        quiz_token = store_quiz_context(session)
        session = {**session, "quiz_token": quiz_token}
        request.session[SESSION_KEY] = session

    from app.main import templates

    return templates.TemplateResponse(
        request=request,
        name="quiz_session.html",
        context={
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug") or "Current Institution",
            "course": session.get("course") or "Current Course",
            "user_name": session.get("learner_name") or session.get("subject") or "Learner",
            "user_role": "Instructor" if session.get("is_instructor") else "Student",
            "quiz_token": quiz_token,
            "active_page": "quiz_session",
            "page_title": "Quiz in Session",
            "questions": QUESTIONS,
            "questions_count": len(QUESTIONS),
            "max_score": MAX_SCORE,
            "ags_available": session.get("ags_available", False),
            "session": session,
        },
    )


@router.post("/quiz/submit", response_class=HTMLResponse)
async def quiz_submit(
    request: Request,
    quiz_token: str = Form(""),
    q1: str = Form(...),
    q2: str = Form(...),
    q3: str = Form(...),
):
    session = require_quiz_session(request, token=quiz_token or None)
    if isinstance(session, HTMLResponse):
        return session

    try:
        score, detail = grade_answers({"q1": q1, "q2": q2, "q3": q3})

        # Save first so submit always succeeds even if AGS hangs
        attempt = db.insert_quiz_attempt(
            tenant_id=session["tenant_id"],
            subject=str(session["subject"]),
            learner_name=str(session.get("learner_name") or ""),
            course_label=str(session.get("course") or ""),
            score=score,
            max_score=MAX_SCORE,
            answers={"submitted": {"q1": q1, "q2": q2, "q3": q3}, "detail": detail},
            grade_sent=False,
            grade_error="pending",
        )

        grade_sent, grade_error = _try_ags(request, session, score=score)
        db.update_quiz_attempt_grade(
            tenant_id=session["tenant_id"],
            attempt_id=attempt["id"],
            grade_sent=grade_sent,
            grade_error=grade_error,
        )

        token_q = f"?token={quiz_token}" if quiz_token else ""
        return RedirectResponse(
            url=f"/quiz/result/{attempt['id']}{token_q}",
            status_code=303,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Quiz submit failed: {exc}\n{traceback.format_exc()}", flush=True)
        return _page(
            "Submit failed",
            f"""
            <h1>Submit failed</h1>
            <p class="bad">{html.escape(str(exc))}</p>
            <p class="sub">Check that Postgres is up and <code>quiz_attempts</code> migration was applied.</p>
            <p><a class="btn secondary" href="/quiz{'?token=' + html.escape(quiz_token) if quiz_token else ''}">Back to quiz</a></p>
            """,
            status_code=500,
        )


@router.get("/quiz/result/{attempt_id}", response_class=HTMLResponse)
async def quiz_result(request: Request, attempt_id: UUID, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session

    attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)
    if not attempt:
        return _page(
            "Not found",
            "<h1>Attempt not found</h1><p class='sub'>It may belong to another tenant or does not exist.</p>",
        )

    is_owner = str(attempt.get("subject", "")) == str(session.get("subject", ""))
    is_instructor = bool(session.get("is_instructor"))
    if not (is_owner or is_instructor):
        return _page(
            "Access denied",
            "<h1>Access denied</h1><p class='sub'>You are not authorized to view this result.</p>",
            status_code=403,
        )

    answers_data = attempt.get("answers") or {}
    detail_map = answers_data.get("detail") or {}

    question_details = []
    for q in QUESTIONS:
        info = detail_map.get(q.id) or {}
        chosen_idx = info.get("chosen", -1)
        if isinstance(chosen_idx, int) and 0 <= chosen_idx < len(q.choices):
            chosen_text = q.choices[chosen_idx]
        else:
            chosen_text = "No answer selected"

        is_correct = bool(info.get("correct", False))
        question_details.append(
            {
                "id": q.id,
                "prompt": q.prompt,
                "chosen_text": chosen_text,
                "is_correct": is_correct,
            }
        )

    quiz_token = token or session.get("quiz_token") or ""
    score = attempt.get("score", 0)
    max_score = attempt.get("max_score", MAX_SCORE)
    pct = int((score / max_score) * 100) if max_score > 0 else 0

    from app.main import templates

    return templates.TemplateResponse(
        request=request,
        name="quiz_result.html",
        context={
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug") or "Current Institution",
            "course": session.get("course") or attempt.get("course_label") or "Current Course",
            "user_name": attempt.get("learner_name") or session.get("learner_name") or session.get("subject") or "Learner",
            "user_role": "Instructor" if session.get("is_instructor") else "Student",
            "quiz_token": quiz_token,
            "active_page": "quiz_result",
            "page_title": "Quiz Result Summary",
            "attempt": attempt,
            "attempt_id": str(attempt["id"]),
            "score": score,
            "max_score": max_score,
            "pct": pct,
            "created_at": attempt.get("created_at"),
            "grade_sent": bool(attempt.get("grade_sent")),
            "has_grade_error": bool(attempt.get("grade_error")),
            "question_details": question_details,
            "session": session,
        },
    )


@router.get("/teacher/attempts", response_class=HTMLResponse)
async def teacher_attempts(request: Request, token: str | None = None):
    session = require_quiz_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return session

    if not session.get("is_instructor"):
        return _page(
            "Teachers only",
            f"""
            <h1>Teachers only</h1>
            <p class="sub">This list is available when the LTI launch includes an Instructor role.</p>
            <p><a class="btn secondary" href="/quiz{'?token=' + html.escape(token) if token else ''}">Back to quiz</a></p>
            """,
            status_code=403,
        )

    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    quiz_token = token or session.get("quiz_token") or ""

    formatted_attempts = []
    for r in rows:
        pct = int((r["score"] / r["max_score"]) * 100) if r.get("max_score") else 0
        has_error = bool(not r.get("grade_sent") and r.get("grade_error"))
        formatted_attempts.append(
            {
                **r,
                "pct": pct,
                "has_error": has_error,
            }
        )

    total_attempts = len(formatted_attempts)
    recorded_learners = len(
        set(str(r.get("subject")) for r in formatted_attempts if r.get("subject"))
    )
    if total_attempts > 0:
        avg_score = round(
            sum((r["score"] / r["max_score"]) * 100 for r in formatted_attempts if r.get("max_score"))
            / total_attempts,
            1,
        )
        sync_rate = round(
            (sum(1 for r in formatted_attempts if r.get("grade_sent")) / total_attempts) * 100,
            1,
        )
    else:
        avg_score = 0.0
        sync_rate = 0.0

    from app.main import templates

    return templates.TemplateResponse(
        request=request,
        name="instructor_overview.html",
        context={
            "tenant_name": session.get("tenant_name") or session.get("tenant_slug") or "Current Institution",
            "course": session.get("course") or "Current Course",
            "user_name": session.get("learner_name") or session.get("subject") or "Instructor",
            "user_role": "Instructor",
            "quiz_token": quiz_token,
            "active_page": "instructor_overview",
            "page_title": "Instructor Overview",
            "attempts": formatted_attempts,
            "recorded_learners": recorded_learners,
            "total_attempts": total_attempts,
            "avg_score": avg_score,
            "sync_rate": sync_rate,
            "session": session,
        },
    )
