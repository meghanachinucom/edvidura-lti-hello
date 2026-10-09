"""Cognitive tutor strategies — human-like teaching moves for Ask Vidura.

Strategies are explicit tutor behaviours (not free-form “personality”):
socratic → ask before telling; hint → nudge; explain → plain teach;
practice_handoff → send to practice after a short check.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

COACH_STRATEGIES = ("socratic", "hint", "explain", "practice_handoff")

_STRATEGY_LABELS = {
    "socratic": "Guiding question",
    "hint": "Hint first",
    "explain": "Clear explanation",
    "practice_handoff": "Try practice",
}

_STRATEGY_INSTRUCTIONS = {
    "socratic": (
        "Strategy=socratic: Do NOT give the full answer first. "
        "Reply with 1–2 short guiding sentences that help the student think, "
        "then put one concrete check question in check_question."
    ),
    "hint": (
        "Strategy=hint: Give a short nudge toward the idea without stating "
        "the full definition. Put one follow-up check question in check_question."
    ),
    "explain": (
        "Strategy=explain: Teach in 2–4 plain sentences from the class lessons. "
        "End with one short check_question so the student can self-check."
    ),
    "practice_handoff": (
        "Strategy=practice_handoff: Give a brief pointer from the lessons, "
        "then encourage a short practice quiz. "
        "check_question should ask if they are ready to try practice."
    ),
}


def normalize_coach_strategy(value: str | None) -> str | None:
    raw = (value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "guide": "socratic",
        "guiding": "socratic",
        "question": "socratic",
        "nudge": "hint",
        "teach": "explain",
        "answer": "explain",
        "practice": "practice_handoff",
        "quiz": "practice_handoff",
        "handoff": "practice_handoff",
    }
    if raw in COACH_STRATEGIES:
        return raw
    if raw in aliases:
        return aliases[raw]
    return None


def strategy_label(value: str | None) -> str:
    key = normalize_coach_strategy(value) or "explain"
    return _STRATEGY_LABELS.get(key, "Clear explanation")


def strategy_instruction(value: str | None) -> str:
    key = normalize_coach_strategy(value) or "explain"
    return _STRATEGY_INSTRUCTIONS[key]


def pick_coach_strategy(
    *,
    question: str,
    learner_context: dict[str, Any] | None = None,
    preferred: str | None = None,
) -> str:
    """Choose a teaching move from question shape + learner evidence."""
    forced = normalize_coach_strategy(preferred)
    if forced:
        return forced

    ctx = learner_context or {}
    q = (question or "").strip().lower()
    difficulty = str(ctx.get("difficulty") or "core").strip().lower()
    weak = list(ctx.get("weak_skills") or [])
    avg = ctx.get("avg_score_ratio")
    try:
        avg_f = float(avg) if avg is not None else None
    except (TypeError, ValueError):
        avg_f = None

    practice_cues = (
        "practice",
        "quiz",
        "test me",
        "try me",
        "exercise",
        "hand me",
        "drill",
    )
    if any(c in q for c in practice_cues):
        return "practice_handoff"

    struggling = (
        difficulty in {"foundational", "easy"}
        or (avg_f is not None and avg_f < 0.55)
        or len(weak) >= 2
    )
    wants_explain = any(
        p in q
        for p in ("explain", "tell me", "what is", "what are", "define", "meaning of")
    )
    wants_reason = any(
        p in q for p in ("why", "how", "compare", "difference", "when should")
    )

    if struggling and wants_reason:
        return "socratic"
    if struggling and wants_explain:
        return "hint"
    if struggling:
        return "socratic"
    if wants_reason:
        return "socratic"
    if wants_explain:
        return "explain"
    if len(weak) >= 1:
        return "hint"
    return "explain"


def local_check_question(
    *,
    strategy: str,
    lesson_title: str = "",
    question: str = "",
) -> str:
    """Heuristic follow-up when the LLM path is offline."""
    title = (lesson_title or "your lesson").strip() or "your lesson"
    key = normalize_coach_strategy(strategy) or "explain"
    if key == "socratic":
        return f"Before I explain more — what do you already know about “{title}”?"
    if key == "hint":
        return f"Which sentence in “{title}” seems closest to your question?"
    if key == "practice_handoff":
        return "Ready to try a short practice quiz on this?"
    topic = (question or "").strip()
    if len(topic) > 60:
        topic = topic[:57].rstrip() + "…"
    if topic:
        return f"Can you say that idea back in one short sentence?"
    return f"Can you give one example from “{title}”?"


def build_coach_learner_context(
    tenant_id: UUID | str | None,
    subject: str | None,
    *,
    course_label: str = "",
) -> dict[str, Any]:
    """Load difficulty + weak skills for coach prompting (best-effort)."""
    from app.modules.ai_assessment import difficulty_label, normalize_difficulty

    empty: dict[str, Any] = {
        "difficulty": "core",
        "difficulty_label": "Medium",
        "weak_skills": [],
        "weak_prompts": [],
        "avg_score_ratio": None,
        "attempts": 0,
    }
    if not tenant_id or not (subject or "").strip():
        return empty

    difficulty = "core"
    avg = None
    attempts = 0
    weak_prompts: list[str] = []
    try:
        from app.modules.quiz import (
            get_tenant_quiz_difficulty,
            student_performance_profile,
        )

        profile = student_performance_profile(
            tenant_id, subject, course_label=course_label or ""
        )
        attempts = int(profile.get("attempts") or 0)
        avg = profile.get("avg_score_ratio")
        weak_prompts = list(profile.get("weak_prompts") or [])[:6]
        teacher = get_tenant_quiz_difficulty(tenant_id)
        if teacher and str(teacher).strip().lower() != "auto":
            difficulty = normalize_difficulty(teacher)
        else:
            difficulty = normalize_difficulty(str(profile.get("difficulty") or "core"))
    except Exception:  # noqa: BLE001
        pass

    weak_skills: list[dict[str, str]] = []
    try:
        from app import db
        from app.modules.adaptive import weak_skills_from_attempt

        rows = db.list_quiz_attempts_for_tenant(tenant_id, limit=40)
        subject_s = str(subject).strip()
        mine = [
            r
            for r in rows
            if str(r.get("subject") or "") == subject_s
            and not (
                isinstance(r.get("answers"), dict)
                and str((r.get("answers") or {}).get("mode") or "") == "practice"
            )
        ]
        if course_label:
            labeled = [
                r
                for r in mine
                if course_label.lower() in str(r.get("course_label") or "").lower()
            ]
            if labeled:
                mine = labeled
        if mine:
            latest = mine[0]
            for row in weak_skills_from_attempt(
                latest.get("answers"), tenant_id=tenant_id
            )[:5]:
                weak_skills.append(
                    {
                        "code": str(row.get("code") or row.get("skill_code") or ""),
                        "label": str(row.get("label") or row.get("name") or "skill"),
                        "status": str(row.get("status") or ""),
                    }
                )
    except Exception:  # noqa: BLE001
        weak_skills = []

    signal_sources: list[str] = []
    try:
        from app.modules import signals as signals_mod

        profile = signals_mod.build_learner_signal_profile(
            tenant_id, str(subject), course_label=course_label or ""
        )
        signal_sources = list(profile.get("sources") or [])
        fused = signals_mod.suggest_skill_gaps_from_signals(
            tenant_id, profile, max_skills=5
        )
        if fused:
            seen = {str(w.get("code") or "").lower() for w in weak_skills}
            for row in fused:
                code = str(row.get("id") or row.get("skill_code") or "")
                if code.lower() in seen:
                    continue
                weak_skills.append(
                    {
                        "code": code,
                        "label": str(row.get("label") or code or "skill"),
                        "status": str(row.get("status") or ""),
                        "source": str(row.get("source") or ""),
                    }
                )
                seen.add(code.lower())
    except Exception:  # noqa: BLE001
        pass

    return {
        "difficulty": difficulty,
        "difficulty_label": difficulty_label(difficulty),
        "weak_skills": weak_skills[:6],
        "weak_prompts": weak_prompts,
        "avg_score_ratio": avg,
        "attempts": attempts,
        "signal_sources": signal_sources,
    }


def context_prompt_block(learner_context: dict[str, Any] | None) -> str:
    """Compact learner evidence for the system/user prompt."""
    ctx = learner_context or {}
    weak = ctx.get("weak_skills") or []
    labels = [
        str(w.get("label") or w.get("code") or "").strip()
        for w in weak
        if isinstance(w, dict)
    ]
    labels = [x for x in labels if x][:5]
    prompts = [str(p).strip() for p in (ctx.get("weak_prompts") or []) if str(p).strip()][
        :4
    ]
    parts = [
        f"Learner quiz level: {ctx.get('difficulty_label') or 'Medium'} "
        f"({ctx.get('difficulty') or 'core'}).",
        f"Recent graded attempts: {int(ctx.get('attempts') or 0)}.",
    ]
    avg = ctx.get("avg_score_ratio")
    if avg is not None:
        try:
            parts.append(f"Average score ratio: {float(avg):.2f}.")
        except (TypeError, ValueError):
            pass
    if labels:
        parts.append("Weak skills to support: " + ", ".join(labels) + ".")
    if prompts:
        parts.append("Recently missed ideas: " + "; ".join(prompts) + ".")
    return " ".join(parts)
