"""Academic integrity gate for Ask Vidura (refuse exam / assignment writing)."""
from __future__ import annotations

import re
from typing import Any

from app.settings import get_settings

# Patterns that ask the coach to do graded work for the student.
_INTEGRITY_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\b(write|do|complete|finish|solve)\s+(my|the|this|an?)?\s*"
        r"(assignment|homework|essay|paper|lab\s*report)\b",
        r"\b(write|give|provide|generate)\s+(me\s+)?(the\s+)?"
        r"(answers?|solutions?)\b",
        r"\b(exam|test|quiz)\s+(answers?|solutions?|cheat\s*sheet)\b",
        r"\bcheat\s*(on|for)?\s*(the\s+)?(exam|test|quiz|assignment)\b",
        r"\b(do\s+my|finish\s+my|complete\s+my)\s+"
        r"(homework|assignment|essay|paper)\b",
        r"\bplagiar",
        r"\bwrite\s+(an?\s+)?(essay|paper|report)\s+(for\s+me|about)\b",
        r"\bgive\s+me\s+(all\s+)?(the\s+)?(correct\s+)?answers?\b",
        r"\banswer\s+(key|sheet)\b",
    )
)

_REFUSAL = (
    "I can’t write exams, assignments, or answer keys for you. "
    "I can explain a lesson idea, give a hint, or ask a check question "
    "from this class’s materials — try asking that way."
)


def integrity_enabled() -> bool:
    s = get_settings()
    raw = getattr(s, "coach_integrity_enabled", True)
    return bool(raw)


def detect_integrity_violation(question: str) -> dict[str, Any] | None:
    """Return a refusal payload if the question asks for graded work.

    Heuristic first (always on when enabled). Optional Jev confirmation can
    be layered by callers; this function stays dependency-light for reuse.
    """
    if not integrity_enabled():
        return None
    q = (question or "").strip()
    if len(q) < 6:
        return None
    for pat in _INTEGRITY_PATTERNS:
        if pat.search(q):
            return {
                "answer": _REFUSAL,
                "citations": [],
                "citation_links": [],
                "grounded": False,
                "refusal_reason": "academic_integrity",
                "integrity_blocked": True,
                "clarify": False,
                "provider": "integrity",
                "model": "heuristic-v1",
                "strategy": "explain",
                "strategy_label": "Integrity",
                "strategy_reason": "Refused request to write graded work.",
                "check_question": "",
                "practice_hint": True,
            }
    return None


__all__ = [
    "detect_integrity_violation",
    "integrity_enabled",
]
