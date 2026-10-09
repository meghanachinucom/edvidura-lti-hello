"""Portable Ask Vidura turn orchestration (no FastAPI / Request).

Another host imports this module, passes plain dicts, and applies
``session_patch`` to whatever session store it uses.
"""
from __future__ import annotations

from typing import Any, Callable
from uuid import uuid4

from app.modules.ai_tutor.flashcards import flashcards_from_chunks
from app.modules.ai_tutor.service import (
    curriculum_chunks_for_session,
    study_coach_answer,
)
from app.modules.ai_tutor.shortcuts import shortcuts_for_learner
from app.settings import get_settings


def apply_clarify_pending(
    session: dict[str, Any], answer: dict[str, Any] | None
) -> dict[str, Any]:
    """Return a shallow-copied session with clarify-once flag updated."""
    out = dict(session)
    if answer and answer.get("clarify"):
        out["coach_clarify_pending"] = True
    else:
        out.pop("coach_clarify_pending", None)
    return out


def ensure_coach_thread_id(session: dict[str, Any]) -> tuple[dict[str, Any], str]:
    out = dict(session)
    tid = str(out.get("coach_thread_id") or "").strip()
    if not tid:
        tid = f"coach-{out.get('subject') or 'anon'}-{uuid4().hex[:10]}"
        out["coach_thread_id"] = tid
    return out, tid


def run_coach_turn(
    *,
    session: dict[str, Any],
    question: str,
    reply_language: str = "en-IN",
    list_lessons_fn: Callable[..., Any],
    get_bound_course_fn: Callable[..., Any],
    preferred_strategy: str | None = None,
    record_xapi: bool = True,
    note_signals: bool = True,
) -> dict[str, Any]:
    """One Ask Vidura turn — portable.

    Returns:
      answer, session_patch, course_title, class_name, chunks_count,
      xapi_ok, signals_ok, error (str|None)
    """
    from app.modules.ai_tutor.cognitive import build_coach_learner_context
    from app.modules.ai_tutor.voice import normalize_voice_lang

    sess = dict(session)
    lang = normalize_voice_lang(
        reply_language or sess.get("coach_voice_lang") or "en-IN"
    )
    if lang != sess.get("coach_voice_lang"):
        sess["coach_voice_lang"] = lang

    class_name = str(sess.get("class_name") or "")
    course_title, chunks = curriculum_chunks_for_session(
        str(sess.get("tenant_id") or ""),
        sess.get("edvidura_course_id") or None,
        list_lessons_fn=list_lessons_fn,
        get_bound_course_fn=get_bound_course_fn,
        class_name=class_name,
    )

    learner_ctx: dict[str, Any] = {}
    try:
        learner_ctx = build_coach_learner_context(
            sess["tenant_id"],
            str(sess.get("subject") or ""),
            course_label=course_title or str(sess.get("course") or ""),
        )
    except Exception:  # noqa: BLE001
        learner_ctx = {}

    skip_clarify = bool(sess.get("coach_clarify_pending"))
    try:
        answer = study_coach_answer(
            question=question,
            curriculum_chunks=chunks,
            course_title=course_title,
            class_name=class_name,
            reply_language=lang,
            learner_context=learner_ctx,
            preferred_strategy=preferred_strategy,
            skip_clarify=skip_clarify,
        )
    except ValueError as exc:
        return {
            "answer": None,
            "session_patch": sess,
            "course_title": course_title,
            "class_name": class_name,
            "chunks_count": len(chunks),
            "xapi_ok": False,
            "signals_ok": False,
            "error": str(exc),
        }

    sess = apply_clarify_pending(sess, answer)
    sess, thread_id = ensure_coach_thread_id(sess)

    xapi_ok = False
    signals_ok = False
    if record_xapi and answer is not None:
        try:
            from app.modules import xapi as xapi_mod

            cites = answer.get("citations") or answer.get("citation_links") or []
            xapi_mod.record_coach_interaction(
                tenant_id=sess["tenant_id"],
                subject=str(sess.get("subject") or ""),
                learner_name=str(sess.get("learner_name") or ""),
                question=question,
                grounded=bool(answer.get("grounded")),
                refusal_reason=str(answer.get("refusal_reason") or "") or None,
                citation_count=len(cites) if isinstance(cites, list) else 0,
                course_title=course_title or str(sess.get("course") or ""),
                course_id=sess.get("edvidura_course_id") or None,
                thread_id=thread_id,
                answer_text=str(answer.get("answer") or "") or None,
                strategy=str(answer.get("strategy") or "") or None,
                check_question=str(answer.get("check_question") or "") or None,
                jev_used=bool(answer.get("jev_used")),
                jev_model=str(answer.get("jev_model") or "") or None,
                jev_strategy_source=str(answer.get("jev_strategy_source") or "")
                or None,
                jev_strategy_confidence=_opt_float(
                    answer.get("jev_strategy_confidence")
                ),
                jev_on_topic_p=_opt_float(answer.get("jev_on_topic_p")),
                jev_skipped_remote=bool(
                    answer.get("jev_skipped_remote")
                    or (answer.get("jev_route") or {}).get("skipped_remote")
                ),
            )
            xapi_ok = True
        except Exception:  # noqa: BLE001
            xapi_ok = False

        if note_signals and xapi_ok:
            try:
                from app.modules import signals as signals_mod

                signals_mod.note_learner_activity(
                    sess["tenant_id"],
                    subject=str(sess.get("subject") or ""),
                    channel="chatbot",
                    quiz_token=str(sess.get("quiz_token") or "") or None,
                    course_id=sess.get("edvidura_course_id") or None,
                    course_label=course_title or str(sess.get("course") or ""),
                )
                signals_ok = True
            except Exception:  # noqa: BLE001
                signals_ok = False

    return {
        "answer": answer,
        "session_patch": sess,
        "course_title": course_title,
        "class_name": class_name,
        "chunks_count": len(chunks),
        "thread_id": thread_id,
        "reply_language": lang,
        "xapi_ok": xapi_ok,
        "signals_ok": signals_ok,
        "error": None,
    }


def submit_coach_feedback(
    *,
    session: dict[str, Any],
    rating: str,
    question_preview: str = "",
    answer_preview: str = "",
) -> dict[str, Any]:
    """Thumbs → xAPI. Portable; no HTTP types."""
    if not bool(getattr(get_settings(), "coach_feedback_enabled", True)):
        return {"ok": False, "error": "feedback_disabled"}
    rate = (rating or "").strip().lower()
    if rate not in {"up", "down", "helpful", "not_helpful"}:
        return {"ok": False, "error": "rating must be up or down"}
    try:
        from app.modules import xapi as xapi_mod

        xapi_mod.record_coach_feedback(
            tenant_id=session["tenant_id"],
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            rating=rate,
            thread_id=str(session.get("coach_thread_id") or "") or None,
            question_preview=question_preview[:120],
            answer_preview=answer_preview[:120],
            course_title=str(session.get("course") or ""),
            course_id=session.get("edvidura_course_id") or None,
        )
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}
    return {"ok": True, "rating": rate}


def flashcards_for_session(
    *,
    session: dict[str, Any],
    list_lessons_fn: Callable[..., Any],
    get_bound_course_fn: Callable[..., Any],
    max_cards: int = 12,
) -> dict[str, Any]:
    class_name = str(session.get("class_name") or "")
    course_title, chunks = curriculum_chunks_for_session(
        str(session.get("tenant_id") or ""),
        session.get("edvidura_course_id") or None,
        list_lessons_fn=list_lessons_fn,
        get_bound_course_fn=get_bound_course_fn,
        class_name=class_name,
    )
    pack = flashcards_from_chunks(chunks, max_cards=max_cards)
    pack["course_title"] = course_title
    pack["class_name"] = class_name
    return pack


def shortcuts_view(
    *,
    session: dict[str, Any],
    limit: int = 6,
) -> list[dict[str, str]]:
    return shortcuts_for_learner(
        session.get("tenant_id") or "",
        course_id=session.get("edvidura_course_id") or None,
        limit=limit,
    )


def coach_json_payload(
    *,
    question: str,
    turn: dict[str, Any],
) -> dict[str, Any]:
    """Map a turn result to a plain JSON-serializable dict for any HTTP layer."""
    answer = turn.get("answer") or {}
    cites_out: list[dict[str, Any]] = []
    raw_cites = answer.get("citations") or answer.get("citation_links") or []
    if isinstance(raw_cites, list):
        for c in raw_cites[:6]:
            if isinstance(c, dict):
                cites_out.append(
                    {
                        "title": str(c.get("title") or c.get("label") or "")[:120],
                        "excerpt": str(c.get("excerpt") or "")[:240],
                    }
                )
            elif c:
                cites_out.append({"title": str(c)[:120], "excerpt": ""})
    return {
        "ok": True,
        "question": question,
        "answer": str(answer.get("answer") or ""),
        "strategy": str(answer.get("strategy") or "") or None,
        "strategy_label": str(answer.get("strategy_label") or "") or None,
        "check_question": str(answer.get("check_question") or "") or None,
        "grounded": bool(answer.get("grounded")),
        "refusal_reason": str(answer.get("refusal_reason") or "") or None,
        "clarify": bool(answer.get("clarify")),
        "integrity_blocked": bool(answer.get("integrity_blocked")),
        "reply_language": turn.get("reply_language"),
        "citations": cites_out,
        "class_name": turn.get("class_name") or turn.get("course_title") or None,
        "thread_id": turn.get("thread_id"),
    }


def _opt_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


__all__ = [
    "apply_clarify_pending",
    "coach_json_payload",
    "ensure_coach_thread_id",
    "flashcards_for_session",
    "run_coach_turn",
    "shortcuts_view",
    "submit_coach_feedback",
]
