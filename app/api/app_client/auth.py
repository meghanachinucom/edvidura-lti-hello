"""Learner auth for App API (web + mobile) — quiz_token after LTI launch."""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, Query, Request

from app.api.app_client.errors import AppApiError
from app.quiz_routes import load_quiz_context, resolve_quiz_session


def extract_app_token(
    request: Request,
    *,
    authorization: str | None,
    x_token: str | None,
    token_q: str | None,
    allow_query_token: bool = True,
) -> str | None:
    if authorization:
        parts = authorization.strip().split(None, 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            t = parts[1].strip()
            if t:
                return t
    candidates = [x_token]
    if allow_query_token:
        candidates.append(token_q)
    for candidate in candidates:
        t = (candidate or "").strip()
        if t:
            return t
    sess = resolve_quiz_session(request, token=None)
    if sess:
        return str(sess.get("quiz_token") or "") or None
    return None


def require_learner(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_edvidura_token: Annotated[
        str | None, Header(alias="X-EdVidura-Token")
    ] = None,
    token: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """Resolve learner session from Bearer / X-EdVidura-Token / cookie.

    ``?token=`` is allowed only outside production-like environments.
    """
    from app.settings import get_settings

    settings = get_settings()
    allow_q = not settings.is_production_like
    tok = extract_app_token(
        request,
        authorization=authorization,
        x_token=x_edvidura_token,
        token_q=token,
        allow_query_token=allow_q,
    )
    session = resolve_quiz_session(request, token=tok) if tok else None
    if not session and tok:
        session = load_quiz_context(tok)
    if not session or not session.get("tenant_id") or not session.get("subject"):
        raise AppApiError(
            "Launch from Moodle (LTI) first, then send the learner token "
            "as Authorization: Bearer <token> or X-EdVidura-Token.",
            code="auth_required",
            status_code=401,
        )
    out = dict(session)
    if tok and not out.get("quiz_token"):
        out["quiz_token"] = tok
    return out


LearnerSession = Annotated[dict[str, Any], Depends(require_learner)]
