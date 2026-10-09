"""Clarify-once: ask one clarifying question when the student ask is ambiguous."""
from __future__ import annotations

import re
from typing import Any

from app.settings import get_settings

_AMBIGUOUS_WHOLE = re.compile(
    r"^(help|what|how|why|explain|tell me|idk|i don'?t know|"
    r"confused|stuck|this|that|it)\??$",
    re.I,
)
_VAGUE_PHRASES = (
    "help me",
    "i don't get it",
    "i dont get it",
    "i'm stuck",
    "im stuck",
    "what is this",
    "explain this",
    "tell me more",
    "can you help",
    "please help",
    "not sure",
    "confused",
)


def clarify_enabled() -> bool:
    return bool(getattr(get_settings(), "coach_clarify_enabled", True))


def needs_clarify(
    question: str,
    *,
    lesson_titles: list[str] | None = None,
) -> bool:
    """True when the question is too vague to ground in a lesson."""
    if not clarify_enabled():
        return False
    q = (question or "").strip()
    if len(q) < 3:
        return False
    # Already a follow-up after clarify → caller sets skip_clarify.
    ql = q.lower()
    if _AMBIGUOUS_WHOLE.match(q.strip()):
        return True
    if any(p in ql for p in _VAGUE_PHRASES) and len(q) < 48:
        return True
    # Very short with no overlap against lesson titles
    titles = [str(t) for t in (lesson_titles or []) if t]
    if len(q) <= 18 and titles:
        tokens = {w.lower() for w in re.findall(r"[A-Za-z]{3,}", q)}
        indic = {w for w in re.findall(r"[\u0900-\u0D7F]{2,}", q)}
        blob = " ".join(titles).lower()
        blob_raw = " ".join(titles)
        hit = any(t in blob for t in tokens) or any(t in blob_raw for t in indic)
        if not hit and "?" not in q:
            return True
    return False


def build_clarify_reply(
    question: str,
    *,
    lesson_titles: list[str] | None = None,
    class_name: str = "",
    course_title: str = "",
) -> dict[str, Any]:
    """One clarifying question — no LLM spend."""
    scope = (class_name or course_title or "this class").strip()
    titles = [str(t).strip() for t in (lesson_titles or []) if str(t).strip()][:5]
    if titles:
        examples = "; ".join(f"“{t}”" for t in titles[:3])
        clarify_q = (
            f"Which lesson topic should we focus on — for example {examples}? "
            "Name the idea in a few words."
        )
    else:
        clarify_q = (
            f"What topic from {scope} should we work on? "
            "Name the idea or lesson in a few words."
        )
    answer = (
        "I want to help from your class lessons — your question is a bit broad. "
        + clarify_q
    )
    return {
        "answer": answer,
        "citations": [],
        "citation_links": [],
        "grounded": False,
        "refusal_reason": None,
        "clarify": True,
        "clarify_question": clarify_q,
        "integrity_blocked": False,
        "provider": "clarify",
        "model": "heuristic-v1",
        "strategy": "socratic",
        "strategy_label": "Clarify",
        "strategy_reason": "Asked one clarifying question before answering.",
        "check_question": clarify_q[:240],
        "practice_hint": False,
        "scope": "class_lessons",
        "course_title": course_title,
        "class_name": class_name,
    }


__all__ = [
    "build_clarify_reply",
    "clarify_enabled",
    "needs_clarify",
]
