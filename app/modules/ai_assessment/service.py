"""AI assessment helpers — lesson text → MCQ draft (local or OpenAI)."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.settings import get_settings

logger = logging.getLogger("edvidura.ai")

GENERIC_DISTRACTORS = (
    "This is not covered in the lesson",
    "None of the above apply",
    "The opposite of what the lesson states",
)


def ai_status() -> dict[str, Any]:
    s = get_settings()
    has_key = bool(s.openai_api_key)
    return {
        "enabled": bool(s.ai_enabled),
        "provider": "openai" if (s.ai_enabled and has_key) else "local",
        "model": s.openai_model if has_key else "heuristic-v1",
    }


def generate_mcqs_from_text(
    body: str,
    *,
    count: int = 3,
    title: str = "",
) -> dict[str, Any]:
    """
    Return draft MCQs. Uses OpenAI when AI_ENABLED + OPENAI_API_KEY;
    otherwise a deterministic local heuristic (always available for demos).
    """
    text = (body or "").strip()
    if len(text) < 40:
        raise ValueError("Lesson text is too short to generate questions")
    n = max(1, min(int(count), 5))
    status = ai_status()
    if status["provider"] == "openai":
        try:
            questions = _openai_mcqs(text, count=n, title=title)
            return {
                "provider": "openai",
                "model": status["model"],
                "questions": questions,
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("OpenAI generate failed, falling back to local: %s", exc)
    questions = _local_mcqs(text, count=n, title=title)
    return {
        "provider": "local",
        "model": "heuristic-v1",
        "questions": questions,
        "note": "Local generator (set AI_ENABLED=1 and OPENAI_API_KEY for LLM)",
    }


def _sentences(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    out: list[str] = []
    for p in parts:
        s = p.strip()
        if len(s) < 35 or len(s) > 220:
            continue
        if s.startswith("#") or s.startswith("http"):
            continue
        out.append(s.rstrip("."))
    return out


def _local_mcqs(text: str, *, count: int, title: str) -> list[dict[str, Any]]:
    sents = _sentences(text)
    if not sents:
        chunk = re.sub(r"\s+", " ", text).strip()[:160]
        sents = [chunk]
    topic = (title or "this lesson").strip() or "this lesson"
    questions: list[dict[str, Any]] = []
    for i, fact in enumerate(sents[:count]):
        others = [s for j, s in enumerate(sents) if j != i]
        distractors: list[str] = []
        for s in others:
            if len(distractors) >= 3:
                break
            distractors.append(s[:160])
        while len(distractors) < 3:
            distractors.append(GENERIC_DISTRACTORS[len(distractors) % 3])
        correct_index = i % 4
        ordered = [""] * 4
        ordered[correct_index] = fact[:160]
        di = 0
        for idx in range(4):
            if idx == correct_index:
                continue
            ordered[idx] = distractors[di]
            di += 1
        questions.append(
            {
                "prompt": f"According to {topic}, which statement is correct?",
                "choices": ordered,
                "correct_index": correct_index,
                "source_excerpt": fact[:120],
            }
        )
    return questions


def _openai_mcqs(text: str, *, count: int, title: str) -> list[dict[str, Any]]:
    s = get_settings()
    snippet = text[:6000]
    system = (
        "You write multiple-choice quiz items for teachers. "
        "Return ONLY valid JSON: "
        '{"questions":[{"prompt":"...","choices":["A","B","C","D"],"correct_index":0}]} '
        "correct_index is 0-based. Exactly 4 choices each. No markdown."
    )
    user = (
        f"Create {count} MCQs from this lesson"
        + (f' titled "{title}"' if title else "")
        + f":\n\n{snippet}"
    )
    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {s.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": s.openai_model,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    data = json.loads(content)
    raw = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(raw, list):
        raise ValueError("OpenAI response missing questions list")
    out: list[dict[str, Any]] = []
    for item in raw[:count]:
        if not isinstance(item, dict):
            continue
        choices = item.get("choices") or []
        if not isinstance(choices, list) or len(choices) < 2:
            continue
        choices = [str(c).strip() for c in choices][:4]
        while len(choices) < 4:
            choices.append("N/A")
        try:
            ci = int(item.get("correct_index", 0))
        except (TypeError, ValueError):
            ci = 0
        ci = max(0, min(ci, len(choices) - 1))
        prompt = str(item.get("prompt") or "").strip()
        if not prompt:
            continue
        out.append(
            {
                "prompt": prompt,
                "choices": choices,
                "correct_index": ci,
                "source_excerpt": "",
            }
        )
    if not out:
        raise ValueError("OpenAI returned no usable questions")
    return out
