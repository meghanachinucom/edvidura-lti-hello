"""Jev (TypeSafe System One) — typed decisions for EdVidura AI flows.

Jev does not generate student-facing prose. It returns Choice / Score / Noul
answers that modules use to gate or route LLM work. When disabled or down,
callers keep their existing heuristics.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.settings import get_settings

logger = logging.getLogger("edvidura.jev")

JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
COACH_STRATEGY_CRITERIA = {
    "socratic": "Ask a guiding question before explaining; student needs to think first",
    "hint": "Give a short nudge without the full answer; student is building basics",
    "explain": "Give a clear short explanation from the lesson text",
    "practice_handoff": "Brief pointer then send the student to practice quiz",
}

# Cheapest path that still does the job — Jev is ~$0.042/MTok input, free output;
# remote LLM chat is far more expensive (input + output tokens).
LLM_TIER_CRITERIA = {
    "local": (
        "Cheap local/heuristic path is enough: short definitions, Easy/foundational "
        "or Recall items, practice handoff, small corpus, or simple coverage fill"
    ),
    "remote": (
        "Needs a generative LLM: Analyze/Hard depth, long multi-page synthesis, "
        "nuanced grounded prose, or non-trivial multi-skill wording"
    ),
}


def route_llm_tier(
    *,
    feature: str,
    state: dict[str, Any] | str | None = None,
    preferred: str | None = None,
) -> dict[str, Any]:
    """Decide local vs remote LLM before spending chat tokens.

    Returns: used, tier ('local'|'remote'), confidence, model, skipped_remote,
    fallback_reason, cost_note.
    """
    out: dict[str, Any] = {
        "used": False,
        "tier": "remote",
        "confidence": None,
        "model": None,
        "skipped_remote": False,
        "fallback_reason": None,
        "feature": str(feature or ""),
        "cost_note": (
            "Jev routes to local heuristics when confident — saves remote "
            "chat input+output tokens (~100x–400x cheaper than LLM for decisions)."
        ),
    }
    pref = str(preferred or "").strip().lower()
    if pref in {"local", "remote"}:
        out["tier"] = pref
        out["fallback_reason"] = "preferred"
        out["skipped_remote"] = pref == "local"
        return out

    s = get_settings()
    if not bool(getattr(s, "jev_route_llm", True)):
        out["fallback_reason"] = "route_disabled"
        return out
    if not jev_ready():
        out["fallback_reason"] = "jev_disabled"
        return out

    payload_state: dict[str, Any] = {
        "feature": str(feature or "ai"),
        "goal": "Pick the cheapest path that still produces a fair school result.",
    }
    if isinstance(state, dict):
        payload_state.update(state)
    elif isinstance(state, str) and state.strip():
        payload_state["detail"] = state.strip()[:1200]

    data = decide(
        state=payload_state,
        questions={
            "llm_tier": {
                "type": "choice",
                "instructions": (
                    "Choose local (cheap heuristics / no remote chat LLM) or "
                    "remote (call OpenAI/Anthropic/local-HTTP chat). Prefer local "
                    "whenever quality stays acceptable for school use."
                ),
                "criteria": LLM_TIER_CRITERIA,
            },
        },
        timeout=6.0,
    )
    if not data:
        out["fallback_reason"] = "jev_unavailable"
        return out

    choice, conf = read_choice(data, "llm_tier")
    out["used"] = True
    out["model"] = str(data.get("model") or "")
    out["confidence"] = conf
    min_conf = float(getattr(s, "jev_min_confidence", 0.55) or 0.55)
    tier = str(choice or "").strip().lower()
    if tier in {"local", "remote"} and conf >= min_conf:
        out["tier"] = tier
        out["skipped_remote"] = tier == "local"
    else:
        out["tier"] = "remote"
        out["fallback_reason"] = "low_confidence" if choice else "no_choice"
    return out


def jev_status() -> dict[str, Any]:
    s = get_settings()
    enabled = bool(getattr(s, "jev_enabled", False))
    key = bool(getattr(s, "typesafe_api_key", "") or "")
    return {
        "enabled": enabled,
        "configured": enabled and key,
        "model": getattr(s, "jev_model", "jev-latest") or "jev-latest",
        "min_confidence": float(getattr(s, "jev_min_confidence", 0.55) or 0.55),
        "route_llm": bool(getattr(s, "jev_route_llm", True)),
    }


def jev_ready() -> bool:
    st = jev_status()
    return bool(st["configured"])


def decide(
    *,
    state: str | dict[str, Any] | list[Any],
    questions: dict[str, Any],
    timeout: float = 8.0,
) -> dict[str, Any] | None:
    """POST state + questions to Jev. Returns full response or None on skip/error."""
    s = get_settings()
    if not getattr(s, "jev_enabled", False):
        return None
    key = (getattr(s, "typesafe_api_key", "") or "").strip()
    if not key:
        return None
    if not questions:
        return None
    model = (getattr(s, "jev_model", "") or "jev-latest").strip() or "jev-latest"
    payload = {"model": model, "state": state, "questions": questions}
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                JEV_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if resp.status_code >= 400:
            logger.warning("Jev HTTP %s: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        if not isinstance(data, dict):
            return None
        return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("Jev call failed: %s", exc)
        return None


def _answers(data: dict[str, Any] | None) -> dict[str, Any]:
    if not data or not isinstance(data, dict):
        return {}
    raw = data.get("answers")
    return raw if isinstance(raw, dict) else {}


def read_noul(data: dict[str, Any] | None, key: str) -> float | None:
    ans = _answers(data).get(key)
    if not isinstance(ans, dict):
        return None
    try:
        return float(ans.get("noul"))
    except (TypeError, ValueError):
        return None


def read_choice(data: dict[str, Any] | None, key: str) -> tuple[str | None, float]:
    ans = _answers(data).get(key)
    if not isinstance(ans, dict):
        return None, 0.0
    choice = str(ans.get("choice") or "").strip() or None
    try:
        conf = float(ans.get("confidence") or 0.0)
    except (TypeError, ValueError):
        conf = 0.0
    return choice, max(0.0, min(1.0, conf))


def read_score(data: dict[str, Any] | None, key: str) -> tuple[float | None, float]:
    ans = _answers(data).get(key)
    if not isinstance(ans, dict):
        return None, 0.0
    try:
        score = float(ans.get("score"))
    except (TypeError, ValueError):
        score = None
    try:
        conf = float(ans.get("confidence") or 0.0)
    except (TypeError, ValueError):
        conf = 0.0
    return score, max(0.0, min(1.0, conf))


def coach_decisions(
    *,
    question: str,
    lesson_excerpts: list[dict[str, str]],
    learner_context: dict[str, Any] | None = None,
    preferred_strategy: str | None = None,
) -> dict[str, Any]:
    """Decide on-topic + teaching strategy for Ask Vidura.

    Returns keys: used, on_topic (bool|None), on_topic_p, strategy, strategy_confidence,
    model, fallback_reason.
    """
    from app.modules.ai_tutor.cognitive import (
        COACH_STRATEGIES,
        normalize_coach_strategy,
        pick_coach_strategy,
    )

    ctx = learner_context or {}
    heuristic = pick_coach_strategy(
        question=question,
        learner_context=ctx,
        preferred=preferred_strategy,
    )
    out: dict[str, Any] = {
        "used": False,
        "on_topic": None,
        "on_topic_p": None,
        "strategy": heuristic,
        "strategy_confidence": None,
        "strategy_source": "heuristic",
        "llm_tier": "remote",
        "llm_tier_confidence": None,
        "skipped_remote": False,
        "model": None,
        "fallback_reason": None,
    }
    if preferred_strategy and normalize_coach_strategy(preferred_strategy):
        out["strategy"] = normalize_coach_strategy(preferred_strategy)
        out["strategy_source"] = "preferred"
        return out
    if not jev_ready():
        out["fallback_reason"] = "jev_disabled"
        return out

    excerpts = []
    for ex in lesson_excerpts[:8]:
        title = str(ex.get("title") or "").strip()
        body = str(ex.get("body") or "").strip()[:600]
        if body:
            excerpts.append({"title": title, "text": body})
    state = {
        "student_question": (question or "").strip()[:800],
        "class_lessons": excerpts,
        "learner_quiz_level": str(ctx.get("difficulty_label") or ctx.get("difficulty") or ""),
        "weak_skills": [
            str(w.get("label") or w.get("code") or "")
            for w in (ctx.get("weak_skills") or [])[:5]
            if isinstance(w, dict)
        ],
        "reply_language": str(ctx.get("reply_language") or "en"),
    }
    route_on = bool(getattr(get_settings(), "jev_route_llm", True))
    questions: dict[str, Any] = {
        "on_class": {
            "type": "noul",
            "instructions": (
                "Can this student question be answered using ONLY the "
                "provided class_lessons texts (not general world knowledge)?"
            ),
        },
        "strategy": {
            "type": "choice",
            "instructions": (
                "Pick the best tutoring move for this school student given "
                "their quiz level and weak skills. Prefer guiding or hinting "
                "when they are struggling; explain for clear definition asks; "
                "practice_handoff when they ask to practice or drill."
            ),
            "criteria": COACH_STRATEGY_CRITERIA,
        },
    }
    if route_on:
        questions["llm_tier"] = {
            "type": "choice",
            "instructions": (
                "Choose local (no remote chat LLM — use short heuristic reply) "
                "or remote (call generative LLM). Prefer local for hint, "
                "practice_handoff, Easy/foundational, or short definition asks "
                "when lesson text is enough. Prefer remote for Analyze depth, "
                "long explanations, or non-English reply quality."
            ),
            "criteria": LLM_TIER_CRITERIA,
        }
    data = decide(
        state=state,
        questions=questions,
    )
    if not data:
        out["fallback_reason"] = "jev_unavailable"
        return out

    out["used"] = True
    out["model"] = str(data.get("model") or "")
    p = read_noul(data, "on_class")
    out["on_topic_p"] = p
    if p is not None:
        out["on_topic"] = p >= 0.45
    choice, conf = read_choice(data, "strategy")
    min_conf = float(getattr(get_settings(), "jev_min_confidence", 0.55) or 0.55)
    norm = normalize_coach_strategy(choice)
    if norm in COACH_STRATEGIES and conf >= min_conf:
        out["strategy"] = norm
        out["strategy_confidence"] = conf
        out["strategy_source"] = "jev"
    else:
        out["strategy"] = heuristic
        out["strategy_confidence"] = conf if choice else None
        out["strategy_source"] = "heuristic"
        out["fallback_reason"] = "low_confidence" if choice else "no_choice"

    # Off-topic → never spend remote LLM tokens.
    if out.get("on_topic") is False:
        out["llm_tier"] = "local"
        out["skipped_remote"] = True
        out["fallback_reason"] = out.get("fallback_reason") or "off_topic_skip_llm"
        return out

    if route_on:
        tier_choice, tier_conf = read_choice(data, "llm_tier")
        out["llm_tier_confidence"] = tier_conf
        tier = str(tier_choice or "").strip().lower()
        if tier in {"local", "remote"} and tier_conf >= min_conf:
            out["llm_tier"] = tier
            out["skipped_remote"] = tier == "local"
        elif out["strategy"] in {"hint", "practice_handoff"} and (
            str(ctx.get("difficulty") or "") in {"foundational", "easy"}
        ):
            # Soft heuristic when Jev is unsure — still saves cost.
            out["llm_tier"] = "local"
            out["skipped_remote"] = True
            out["fallback_reason"] = out.get("fallback_reason") or "heuristic_cheap_path"
    return out


def quiz_coverage_ok(
    *,
    unit_titles: list[str],
    question_stems: list[str],
) -> dict[str, Any]:
    """Judge whether quiz stems cover the whole book (pages/sections).

    Returns: used, covers_all (bool|None), score, confidence, model, fallback_reason.
    """
    out: dict[str, Any] = {
        "used": False,
        "covers_all": None,
        "score": None,
        "confidence": None,
        "model": None,
        "fallback_reason": None,
    }
    if not unit_titles or not question_stems:
        out["fallback_reason"] = "empty_input"
        return out
    if not jev_ready():
        out["fallback_reason"] = "jev_disabled"
        return out
    state = {
        "required_pages": unit_titles[:40],
        "quiz_prompts": [str(p)[:180] for p in question_stems[:40]],
    }
    data = decide(
        state=state,
        questions={
            "full_book": {
                "type": "noul",
                "instructions": (
                    "Do the quiz_prompts together cover essentially ALL "
                    "required_pages/sections (including later ones), not only early pages?"
                ),
            },
            "coverage_quality": {
                "type": "score",
                "instructions": "How complete is end-to-end page coverage?",
                "criteria": [
                    "Many pages missing",
                    "Partial — later pages weak",
                    "Adequate spread",
                    "Strong full-book coverage",
                ],
            },
        },
    )
    if not data:
        out["fallback_reason"] = "jev_unavailable"
        return out
    out["used"] = True
    out["model"] = str(data.get("model") or "")
    p = read_noul(data, "full_book")
    score, conf = read_score(data, "coverage_quality")
    out["score"] = score
    out["confidence"] = conf
    min_conf = float(getattr(get_settings(), "jev_min_confidence", 0.55) or 0.55)
    if p is not None and conf >= min_conf:
        out["covers_all"] = p >= 0.55
    elif p is not None:
        out["covers_all"] = p >= 0.55
        out["fallback_reason"] = "low_confidence"
    else:
        out["fallback_reason"] = "no_noul"
    return out
