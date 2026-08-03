"""Slice A quiz routes: launch session → quiz → score → optional AGS + teacher list."""
from __future__ import annotations

import html
from typing import Any
from uuid import UUID

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


def _page(title: str, body: str) -> HTMLResponse:
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
</html>"""
    )


def get_lti_session(request: Request) -> dict[str, Any] | None:
    data = request.session.get(SESSION_KEY)
    return dict(data) if isinstance(data, dict) else None


def require_lti_session(request: Request) -> dict[str, Any] | HTMLResponse:
    data = get_lti_session(request)
    if not data or not data.get("tenant_id") or not data.get("subject"):
        return _page(
            "Launch required",
            """
            <h1>Launch required</h1>
            <p class="sub">Open this tool from Moodle (LTI launch) first.</p>
            <p><a class="btn secondary" href="/">Home</a></p>
            """,
        )
    return data


def _restore_launch(request: Request, launch_id: str) -> FastAPIMessageLaunch:
    tool_conf = build_tool_conf_from_db(require_platforms=True)
    fastapi_request = FastAPIRequest(request)
    storage = make_launch_data_storage(fastapi_request, LAUNCH_CACHE)
    return FastAPIMessageLaunch.from_cache(
        launch_id,
        fastapi_request,
        tool_conf,
        launch_data_storage=storage,
    )


@router.get("/quiz", response_class=HTMLResponse)
async def quiz_form(request: Request):
    session = require_lti_session(request)
    if isinstance(session, HTMLResponse):
        return session

    fields = []
    for i, q in enumerate(QUESTIONS, start=1):
        opts = []
        for idx, choice in enumerate(q.choices):
            opts.append(
                f'<label><input type="radio" name="{html.escape(q.id)}" value="{idx}" required/> '
                f"{html.escape(choice)}</label>"
            )
        fields.append(
            f'<fieldset class="q"><legend>Q{i}. {html.escape(q.prompt)}</legend>'
            + "".join(opts)
            + "</fieldset>"
        )

    teacher_link = ""
    if session.get("is_instructor"):
        teacher_link = '<p><a class="btn secondary" href="/teacher/attempts">Teacher: view attempts</a></p>'

    body = f"""
    <h1>EdVidura — Slice A Quiz</h1>
    <p class="sub">
      {html.escape(str(session.get('learner_name') or session.get('subject')))}
      · {html.escape(str(session.get('tenant_slug') or ''))}
      · {html.escape(str(session.get('course') or ''))}
    </p>
    <div class="card">
      <form method="post" action="/quiz/submit">
        {''.join(fields)}
        <button type="submit">Submit quiz</button>
      </form>
    </div>
    {teacher_link}
    """
    return _page("Quiz", body)


@router.post("/quiz/submit", response_class=HTMLResponse)
async def quiz_submit(
    request: Request,
    q1: str = Form(...),
    q2: str = Form(...),
    q3: str = Form(...),
):
    session = require_lti_session(request)
    if isinstance(session, HTMLResponse):
        return session

    score, detail = grade_answers({"q1": q1, "q2": q2, "q3": q3})
    grade_sent = False
    grade_error: str | None = None

    launch_id = session.get("launch_id")
    if launch_id:
        try:
            message_launch = _restore_launch(request, str(launch_id))
            grade_sent, grade_error = send_quiz_grade(
                message_launch,
                user_id=str(session["subject"]),
                score=float(score),
                score_maximum=float(MAX_SCORE),
            )
        except Exception as exc:  # noqa: BLE001
            grade_sent = False
            grade_error = f"Could not restore launch for AGS: {exc}"
    else:
        grade_error = "No launch_id in session — grade not sent"

    attempt = db.insert_quiz_attempt(
        tenant_id=session["tenant_id"],
        subject=str(session["subject"]),
        learner_name=str(session.get("learner_name") or ""),
        course_label=str(session.get("course") or ""),
        score=score,
        max_score=MAX_SCORE,
        answers={"submitted": {"q1": q1, "q2": q2, "q3": q3}, "detail": detail},
        grade_sent=grade_sent,
        grade_error=grade_error,
    )
    return RedirectResponse(url=f"/quiz/result/{attempt['id']}", status_code=303)


@router.get("/quiz/result/{attempt_id}", response_class=HTMLResponse)
async def quiz_result(request: Request, attempt_id: UUID):
    session = require_lti_session(request)
    if isinstance(session, HTMLResponse):
        return session

    attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)
    if not attempt:
        return _page(
            "Not found",
            "<h1>Attempt not found</h1><p class='sub'>It may belong to another tenant or does not exist.</p>",
        )

    grade_line = (
        '<p class="ok">Grade sent to Moodle gradebook (AGS).</p>'
        if attempt["grade_sent"]
        else f'<p class="bad">Grade not sent: {html.escape(str(attempt.get("grade_error") or "unknown"))}</p>'
    )
    teacher_link = ""
    if session.get("is_instructor"):
        teacher_link = '<p><a class="btn secondary" href="/teacher/attempts">Teacher: view attempts</a></p>'

    body = f"""
    <h1>Quiz result</h1>
    <p class="sub">{html.escape(str(attempt['learner_name'] or attempt['subject']))}</p>
    <div class="card">
      <p style="font-size:1.4rem;margin:0">
        Score: <strong>{attempt['score']}</strong> / {attempt['max_score']}
      </p>
      {grade_line}
      <p class="meta">Attempt <code>{html.escape(str(attempt['id']))}</code></p>
    </div>
    <p>
      <a class="btn" href="/quiz">Retake quiz</a>
      {teacher_link}
    </p>
    """
    return _page("Result", body)


@router.get("/teacher/attempts", response_class=HTMLResponse)
async def teacher_attempts(request: Request):
    session = require_lti_session(request)
    if isinstance(session, HTMLResponse):
        return session

    if not session.get("is_instructor"):
        return _page(
            "Teachers only",
            """
            <h1>Teachers only</h1>
            <p class="sub">This list is available when the LTI launch includes an Instructor role.</p>
            <p><a class="btn secondary" href="/quiz">Back to quiz</a></p>
            """,
        )

    rows = db.list_quiz_attempts_for_tenant(session["tenant_id"])
    if not rows:
        table = "<p class='sub'>No attempts yet for this tenant.</p>"
    else:
        trs = []
        for r in rows:
            sent = "yes" if r["grade_sent"] else "no"
            trs.append(
                "<tr>"
                f"<td>{html.escape(str(r['learner_name'] or r['subject']))}</td>"
                f"<td>{html.escape(str(r['course_label'] or '—'))}</td>"
                f"<td>{r['score']}/{r['max_score']}</td>"
                f"<td>{sent}</td>"
                f"<td class='meta'>{html.escape(r['created_at'].isoformat())}</td>"
                "</tr>"
            )
        table = (
            "<table><thead><tr>"
            "<th>Learner</th><th>Course</th><th>Score</th><th>Grade sent</th><th>When</th>"
            "</tr></thead><tbody>"
            + "".join(trs)
            + "</tbody></table>"
        )

    body = f"""
    <h1>Quiz attempts</h1>
    <p class="sub">
      Tenant {html.escape(str(session.get('tenant_slug') or ''))} —
      only rows visible under this tenant’s RLS context.
    </p>
    <div class="card">{table}</div>
    <p><a class="btn secondary" href="/quiz">Back to quiz</a></p>
    """
    return _page("Attempts", body)
