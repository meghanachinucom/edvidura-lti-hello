"""Flashcards from class lesson chunks (local + optional LLM)."""
from __future__ import annotations

import re
from typing import Any

from app.modules.ai_assessment.llm import openai_chat_json, run_ai
from app.settings import get_settings


def flashcards_enabled() -> bool:
    return bool(getattr(get_settings(), "coach_flashcards_enabled", True))


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    return [p.strip() for p in parts if len(p.strip()) >= 24]


def _local_cards_from_chunk(
    *, title: str, body: str, lesson_id: str = "", limit: int = 3
) -> list[dict[str, Any]]:
    sents = _sentences(body)[:8]
    cards: list[dict[str, Any]] = []
    if not sents:
        plain = re.sub(r"\s+", " ", body).strip()[:220]
        if plain:
            cards.append(
                {
                    "front": f"What is the main idea of “{title}”?",
                    "back": plain,
                    "lesson_title": title,
                    "lesson_id": lesson_id,
                    "source": "local",
                }
            )
        return cards
    for i, sent in enumerate(sents[:limit]):
        # Cloze-ish: hide a mid-length word
        words = re.findall(r"[A-Za-z\u0900-\u0D7F]{4,}", sent)
        blank = words[min(1, len(words) - 1)] if words else ""
        if blank and len(words) >= 2:
            front = sent.replace(blank, "______", 1)
            back = f"{blank} — {sent}"
        else:
            front = f"Recall from “{title}”: what does this mean?"
            back = sent
        cards.append(
            {
                "front": front[:280],
                "back": back[:480],
                "lesson_title": title,
                "lesson_id": lesson_id,
                "source": "local",
            }
        )
    return cards


def flashcards_from_chunks(
    curriculum_chunks: list[dict[str, Any]],
    *,
    max_cards: int = 12,
    prefer_llm: bool = False,
) -> dict[str, Any]:
    """Build flashcards from lesson materials.

    Returns: {cards, provider, model, count, enabled}.
    """
    if not flashcards_enabled():
        return {
            "cards": [],
            "provider": "off",
            "model": None,
            "count": 0,
            "enabled": False,
        }

    chunks: list[dict[str, Any]] = []
    for c in curriculum_chunks[:16]:
        title = str(c.get("title") or "Lesson").strip()
        body = str(c.get("body") or c.get("body_md") or "").strip()
        if len(body) < 40:
            continue
        chunks.append(
            {
                "title": title,
                "body": body[:2000],
                "lesson_id": str(c.get("lesson_id") or ""),
            }
        )

    if not chunks:
        return {
            "cards": [],
            "provider": "local",
            "model": "heuristic-v1",
            "count": 0,
            "enabled": True,
            "note": "No class lessons with enough text yet.",
        }

    def _local() -> dict[str, Any]:
        cards: list[dict[str, Any]] = []
        per = max(1, max_cards // max(1, len(chunks)))
        for c in chunks:
            cards.extend(
                _local_cards_from_chunk(
                    title=c["title"],
                    body=c["body"],
                    lesson_id=c["lesson_id"],
                    limit=min(3, per),
                )
            )
            if len(cards) >= max_cards:
                break
        return {
            "cards": cards[:max_cards],
            "provider": "local",
            "model": "heuristic-v1",
        }

    def _openai() -> dict[str, Any]:
        data = openai_chat_json(
            system=(
                "You create simple school flashcards from class lesson text only. "
                "Return ONLY JSON: "
                '{"cards":[{"front":"...","back":"...","lesson_title":"..."}]} '
                "Keep fronts short questions; backs 1–2 plain sentences. "
                "No markdown. Max 12 cards."
            ),
            user=(
                f"Make up to {max_cards} flashcards from these lessons:\n"
                f"{[{'title': c['title'], 'body': c['body'][:900]} for c in chunks]}"
            ),
            temperature=0.3,
        )
        raw = data.get("cards") or []
        cards: list[dict[str, Any]] = []
        by_title = {c["title"]: c for c in chunks}
        for item in raw[:max_cards]:
            if not isinstance(item, dict):
                continue
            front = str(item.get("front") or "").strip()
            back = str(item.get("back") or "").strip()
            lt = str(item.get("lesson_title") or "").strip()
            if not front or not back:
                continue
            lid = ""
            match = by_title.get(lt) or next(
                (
                    c
                    for c in chunks
                    if lt.lower() in c["title"].lower()
                    or c["title"].lower() in lt.lower()
                ),
                None,
            )
            if match:
                lt = match["title"]
                lid = match["lesson_id"]
            cards.append(
                {
                    "front": front[:280],
                    "back": back[:480],
                    "lesson_title": lt or chunks[0]["title"],
                    "lesson_id": lid,
                    "source": "llm",
                }
            )
        if not cards:
            return _local()
        return {"cards": cards, "provider": "openai", "model": None}

    if prefer_llm:
        result = run_ai(openai_fn=_openai, local_fn=_local, feature="flashcards")
    else:
        result = _local()
        # Enrich with LLM only when remote AI is already configured for coach.
        try:
            from app.modules.ai_assessment.llm import ai_status

            st = ai_status()
            if st.get("remote_ready") and prefer_llm is False:
                # Keep local default for speed/cost; teacher can request LLM later.
                pass
        except Exception:  # noqa: BLE001
            pass

    cards = list(result.get("cards") or [])[:max_cards]
    return {
        "cards": cards,
        "provider": str(result.get("provider") or "local"),
        "model": result.get("model"),
        "count": len(cards),
        "enabled": True,
        "note": str(result.get("note") or "") or None,
    }


__all__ = [
    "flashcards_enabled",
    "flashcards_from_chunks",
]
