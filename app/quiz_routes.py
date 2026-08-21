"""Slice A quiz routes: launch session → quiz → score → optional AGS + teacher list."""
from __future__ import annotations

import html
import traceback
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.requests import Request as StarletteRequest

from app import db
from app.ags_passback import send_quiz_grade
from app.launch_cache import LAUNCH_CACHE
from app.lti_fastapi import FastAPIMessageLaunch, FastAPIRequest, make_launch_data_storage
from app.quiz_content import grade_answers, questions_for_tenant
from app.modules.tenancy import build_tool_conf_from_db

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
    button:disabled {{ opacity:0.6; cursor:wait; }}
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
    """Persist launch context (memory + DB so submit survives uvicorn --reload)."""
    token = uuid4().hex
    payload = {**dict(data), "quiz_token": token}
    LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{token}", payload, exp=ttl_sec)
    try:
        db.save_quiz_context(token, payload, ttl_sec=ttl_sec)
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: could not persist quiz context: {exc}", flush=True)
    return token


def load_quiz_context(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    data = LAUNCH_CACHE.get(f"{QUIZ_CTX_PREFIX}{token}")
    if isinstance(data, dict):
        return dict(data)
    try:
        data = db.get_quiz_context(token)
    except Exception as exc:  # noqa: BLE001
        print(f"Quiz context lookup failed: {exc}", flush=True)
        return None
    if isinstance(data, dict):
        LAUNCH_CACHE.set(f"{QUIZ_CTX_PREFIX}{token}", data, exp=3600)
        return dict(data)
    return None


def resolve_quiz_session(
    request: Request, *, token: str | None = None
) -> dict[str, Any] | None:
    # Prefer quiz token (tied to this launch) over cookie session, which can
    # be stale after a reload or a dropped Set-Cookie.
    cached = load_quiz_context(token)
    if cached and cached.get("tenant_id") and cached.get("subject"):
        request.session[SESSION_KEY] = cached
        return dict(cached)
    data = request.session.get(SESSION_KEY)
    if isinstance(data, dict) and data.get("tenant_id") and data.get("subject"):
        return dict(data)
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


def _fake_request_with_launch(launch_id: str, launch_data: dict[str, Any] | None = None) -> StarletteRequest:
    data = launch_data if launch_data is not None else _load_launch_data(str(launch_id))
    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 0),
        "server": ("127.0.0.1", 8000),
        "session": {str(launch_id): data} if data is not None else {},
    }

    async def receive() -> dict[str, str]:
        return {"type": "http.disconnect"}

    return StarletteRequest(scope, receive)


def _load_launch_data(launch_id: str) -> dict[str, Any] | None:
    if not launch_id:
        return None
    # PyLTI stores under the bare launch_id; we also keep a launchdata: alias.
    for key in (launch_id, f"launchdata:{launch_id}"):
        cached = LAUNCH_CACHE.get(key)
        if isinstance(cached, dict):
            return dict(cached)
    try:
        data = db.get_launch_snapshot(launch_id)
        if data is None:
            print(f"No launch snapshot for {launch_id!r}", flush=True)
        return data
    except Exception as exc:  # noqa: BLE001
        print(f"Launch snapshot lookup failed for {launch_id!r}: {exc}", flush=True)
        return None


def _restore_launch_from_id(
    launch_id: str, launch_data: dict[str, Any] | None = None
) -> FastAPIMessageLaunch:
    data = launch_data if launch_data is not None else _load_launch_data(str(launch_id))
    if data is None:
        raise RuntimeError(f"Launch data missing for {launch_id}")
    # from_cache → SessionService.get_launch_data(launch_id) reads this key.
    LAUNCH_CACHE.set(str(launch_id), data, exp=3600)
    LAUNCH_CACHE.set(f"launchdata:{launch_id}", data, exp=3600)
    starlette_request = _fake_request_with_launch(str(launch_id), data)
    tool_conf = build_tool_conf_from_db(require_platforms=True)
    fastapi_request = FastAPIRequest(starlette_request)
    storage = make_launch_data_storage(fastapi_request, LAUNCH_CACHE)
    return FastAPIMessageLaunch.from_cache(
        str(launch_id),
        fastapi_request,
        tool_conf,
        launch_data_storage=storage,
    )


def _ags_background(
    *,
    launch_id: str,
    subject: str,
    score: int,
    score_maximum: int,
    tenant_id: str,
    attempt_id: str,
    ags_available: bool | None,
    launch_data: dict[str, Any] | None = None,
) -> None:
    if ags_available is False:
        db.update_quiz_attempt_grade(
            tenant_id=tenant_id,
            attempt_id=attempt_id,
            grade_sent=False,
            grade_error=(
                "AGS not on this launch. In Moodle: tool Services → Assignment and Grade "
                "Services = Use this service; activity Privacy → Accept grades = Yes; "
                "Grade type = Point. Then relaunch as a student."
            ),
        )
        return

    data = launch_data if isinstance(launch_data, dict) else None
    if data is None:
        data = _load_launch_data(launch_id) if launch_id else None
    if not launch_id or data is None:
        db.update_quiz_attempt_grade(
            tenant_id=tenant_id,
            attempt_id=attempt_id,
            grade_sent=False,
            grade_error=(
                "Launch data expired (server reloaded?). "
                f"Relaunch from Moodle and submit again. (launch_id={launch_id or 'missing'})"
            ),
        )
        return

    try:
        message_launch = _restore_launch_from_id(launch_id, data)
        grade_sent, grade_error = send_quiz_grade(
            message_launch,
            user_id=subject,
            score=float(score),
            score_maximum=float(score_maximum),
        )
    except Exception as exc:  # noqa: BLE001
        grade_sent, grade_error = False, f"AGS failed: {exc}"

    try:
        db.update_quiz_attempt_grade(
            tenant_id=tenant_id,
            attempt_id=attempt_id,
            grade_sent=grade_sent,
            grade_error=grade_error,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to update quiz grade status: {exc}", flush=True)


@router.post("/quiz/submit", response_class=HTMLResponse)
async def quiz_submit(
    request: Request,
    background_tasks: BackgroundTasks,
    quiz_token: str = Form(""),
):
    session = require_quiz_session(request, token=quiz_token or None)
    if isinstance(session, HTMLResponse):
        return session

    try:
        form = await request.form()
        questions = questions_for_tenant(session.get("tenant_id"))
        submitted = {q.id: str(form.get(q.id) or "") for q in questions}
        score, detail = grade_answers(submitted, questions)
        max_score = len(questions)

        # Save + redirect immediately; AGS runs in background so the browser never hangs
        attempt = db.insert_quiz_attempt(
            tenant_id=session["tenant_id"],
            subject=str(session["subject"]),
            learner_name=str(session.get("learner_name") or ""),
            course_label=str(session.get("course") or ""),
            score=score,
            max_score=max_score,
            answers={"submitted": submitted, "detail": detail},
            grade_sent=False,
            grade_error="Grade passback queued…",
        )

        try:
            from app.modules.events import enqueue_quiz_attempt_submitted

            enqueue_quiz_attempt_submitted(
                tenant_id=session["tenant_id"],
                subject=str(session["subject"]),
                attempt_id=attempt["id"],
                score=score,
                max_score=max_score,
                course_label=str(session.get("course") or ""),
            )
        except Exception as outbox_exc:  # noqa: BLE001
            print(f"Outbox enqueue failed (attempt saved): {outbox_exc}", flush=True)

        launch_id = str(session.get("launch_id") or "")
        launch_data = _load_launch_data(launch_id) if launch_id else None
        background_tasks.add_task(
            _ags_background,
            launch_id=launch_id,
            subject=str(session["subject"]),
            score=score,
            score_maximum=max_score,
            tenant_id=str(session["tenant_id"]),
            attempt_id=str(attempt["id"]),
            ags_available=session.get("ags_available"),
            launch_data=launch_data,
        )

        session["last_result_id"] = str(attempt["id"])
        if quiz_token:
            session["quiz_token"] = quiz_token
            LAUNCH_CACHE.set(
                f"{QUIZ_CTX_PREFIX}{quiz_token}",
                {**session, "quiz_token": quiz_token},
                exp=3600,
            )
            try:
                db.save_quiz_context(
                    quiz_token, {**session, "quiz_token": quiz_token}, ttl_sec=3600
                )
            except Exception:  # noqa: BLE001
                pass
        request.session[SESSION_KEY] = session

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

