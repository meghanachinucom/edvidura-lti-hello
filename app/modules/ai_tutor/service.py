"""Student AI tutor: wrong-answer hints + curriculum-grounded study coach."""
from __future__ import annotations

import re
from typing import Any

from app.modules.ai_assessment.llm import ai_status, openai_chat_json, run_ai


def hint_for_missed_question(
    *,
    prompt: str,
    correct_choice: str = "",
    lesson_excerpts: list[str] | None = None,
) -> dict[str, Any]:
    """Short hint for a missed MCQ — does not reveal the answer unless needed."""
    q = (prompt or "").strip()
    if not q:
        raise ValueError("Question prompt required")
    excerpts = [e.strip() for e in (lesson_excerpts or []) if e and str(e).strip()]
    context = "\n".join(excerpts[:4])[:3000]

    def _openai():
        data = openai_chat_json(
            system=(
                "You give brief study hints to students who missed a quiz question. "
                "Do NOT state the correct choice directly unless the student cannot "
                "progress without it. Return ONLY JSON: "
                '{"hint":"...","review_focus":"...","reveal_answer":false}'
            ),
            user=(
                f"Question: {q}\n"
                + (f"Correct choice (private): {correct_choice}\n" if correct_choice else "")
                + (f"Lesson context:\n{context}\n" if context else "")
            ),
            temperature=0.4,
        )
        return {
            "hint": str(data.get("hint") or "").strip(),
            "review_focus": str(data.get("review_focus") or "").strip(),
            "reveal_answer": bool(data.get("reveal_answer")),
        }

    def _local():
        focus = correct_choice[:80] if correct_choice else "the key idea in the lesson"
        hint = (
            "Re-read the lesson section that matches this question. "
            f"Look for language about: {focus}. "
            "Then try the practice lane before a graded retry."
        )
        if excerpts:
            hint = (
                f"Review this from your course: “{excerpts[0][:160]}…”. "
                "Then retry the missed items."
            )
        return {
            "hint": hint,
            "review_focus": "Lesson review + practice",
            "reveal_answer": False,
        }

    return run_ai(openai_fn=_openai, local_fn=_local, feature="hint")


def _citation_links(
    chunks: list[dict[str, Any]], citations: list[str]
) -> list[dict[str, Any]]:
    by_title = {str(c["title"]): c for c in chunks}
    out: list[dict[str, Any]] = []
    for cite in citations:
        c = by_title.get(cite)
        if not c:
            c = next(
                (
                    x
                    for x in chunks
                    if cite.lower() in x["title"].lower()
                    or x["title"].lower() in cite.lower()
                ),
                None,
            )
        if not c:
            out.append(
                {
                    "title": cite,
                    "href": "",
                    "kind": "",
                    "excerpt": "",
                    "version": None,
                    "focus": "",
                }
            )
            continue
        body = str(c.get("body") or "")
        excerpt = re.sub(r"\s+", " ", body).strip()[:180]
        if len(body) > 180:
            excerpt += "…"
        out.append(
            {
                "title": str(c["title"]),
                "href": str(c.get("href") or ""),
                "kind": str(c.get("kind") or ""),
                "excerpt": excerpt,
                "version": c.get("version"),
                "focus": str(c.get("focus") or ""),
            }
        )
    return out


def study_coach_answer(
    *,
    question: str,
    curriculum_chunks: list[dict[str, Any]],
    course_title: str = "",
) -> dict[str, Any]:
    """Answer a student question using only provided curriculum chunks."""
    from app.settings import get_settings

    q = (question or "").strip()
    if len(q) < 3:
        raise ValueError("Ask a short question about your course")
    # Retention: coach is intentionally stateless (no turn store by default).
    store_turns = bool(getattr(get_settings(), "coach_store_turns", False))
    chunks: list[dict[str, Any]] = []
    for c in curriculum_chunks[:16]:
        title = str(c.get("title") or "Lesson").strip()
        body = str(c.get("body") or c.get("body_md") or "").strip()
        if not body:
            continue
        chunks.append(
            {
                "title": title,
                "body": body[:1500],
                "href": c.get("href") or "",
                "kind": c.get("kind") or "lesson",
                "version": c.get("version"),
                "focus": c.get("focus") or "",
            }
        )
    if not chunks:
        return {
            "answer": (
                "No approved SME sources yet. Ask your teacher to add manuals "
                "or lessons under Teach → SME sources."
            ),
            "citations": [],
            "citation_links": [],
            "grounded": False,
            "refusal_reason": "no_sources",
            "retention": "stateless" if not store_turns else "session",
            "practice_hint": True,
            "provider": "local",
            "model": "heuristic-v1",
        }

    def _openai():
        data = openai_chat_json(
            system=(
                "You are an SME study coach for one school. "
                "Answer ONLY from the provided approved manuals and lessons. "
                "Prefer version-pinned manual sections when present. "
                "If the answer is not in the material, say you don't know from "
                "these sources and set grounded=false. "
                "Do not invent URLs or sources. Return ONLY JSON: "
                '{"answer":"...","citations":["source title",...],"grounded":true}'
            ),
            user=(
                f"Course: {course_title or 'this course'}\n"
                f"Student question: {q}\n"
                f"Approved sources: {[{'title': c['title'], 'body': c['body']} for c in chunks]}"
            ),
            temperature=0.3,
        )
        cites = [str(x) for x in (data.get("citations") or [])][:6]
        grounded = bool(data.get("grounded", True))
        return {
            "answer": str(data.get("answer") or "").strip(),
            "citations": cites,
            "citation_links": _citation_links(chunks, cites),
            "grounded": grounded,
            "refusal_reason": None if grounded else "off_curriculum",
        }

    def _local():
        q_words = {w.lower() for w in re.findall(r"[A-Za-z]{3,}", q)}
        scored: list[tuple[int, int, dict[str, Any]]] = []
        for c in chunks:
            body_l = c["body"].lower()
            title_l = c["title"].lower()
            score = sum(1 for w in q_words if w in body_l or w in title_l)
            manual_bonus = 1 if c.get("kind") == "manual" else 0
            scored.append((score, manual_bonus, c))
        scored.sort(key=lambda t: (t[0], t[1]), reverse=True)
        best = scored[0][2] if scored else chunks[0]
        if scored and scored[0][0] < 1:
            return {
                "answer": (
                    "I couldn't find that in the approved manuals/lessons. "
                    "Try asking about a topic from your handbook or class reading."
                ),
                "citations": [],
                "citation_links": [],
                "grounded": False,
                "refusal_reason": "off_curriculum",
            }
        excerpt = re.sub(r"\s+", " ", best["body"]).strip()[:280]
        cites = [best["title"]]
        return {
            "answer": (
                f"From “{best['title']}”: {excerpt}"
                + ("…" if len(best["body"]) > 280 else "")
            ),
            "citations": cites,
            "citation_links": _citation_links(chunks, cites),
            "grounded": True,
            "refusal_reason": None,
        }

    result = run_ai(openai_fn=_openai, local_fn=_local, feature="coach")
    if "citation_links" not in result:
        result["citation_links"] = _citation_links(
            chunks, list(result.get("citations") or [])
        )
    result.setdefault("refusal_reason", None if result.get("grounded") else "off_curriculum")
    result["retention"] = "stateless" if not store_turns else "session"
    result["practice_hint"] = True
    return result


def curriculum_chunks_for_session(
    tenant_id: str,
    course_id: str | None,
    *,
    list_lessons_fn,
    get_bound_course_fn,
) -> tuple[str, list[dict[str, Any]]]:
    """Prefer C13 SME registry; fall back to bound-course lessons."""
    if tenant_id:
        try:
            from app.modules import sme as sme_mod

            title, chunks, _sources = sme_mod.coach_chunks_for_tenant(
                tenant_id, course_id=course_id
            )
            if chunks:
                return title, chunks
        except Exception:  # noqa: BLE001
            pass
    course = get_bound_course_fn(tenant_id, course_id)
    if not course:
        return "", []
    lessons = list_lessons_fn(tenant_id, course["id"])
    chunks = []
    for L in lessons:
        if L.get("lesson_type") == "quiz":
            continue
        body = str(L.get("body_md") or "").strip()
        if len(body) < 20:
            continue
        chunks.append(
            {
                "title": str(L.get("title") or "Lesson"),
                "body": body,
                "kind": "lesson",
                "href": f"/lessons/{L['id']}",
            }
        )
    return str(course.get("title") or ""), chunks


__all__ = [
    "ai_status",
    "hint_for_missed_question",
    "study_coach_answer",
    "curriculum_chunks_for_session",
]
