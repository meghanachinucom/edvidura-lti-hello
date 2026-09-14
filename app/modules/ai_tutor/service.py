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
            continue  # drop citations that are not in class materials
        body = str(c.get("body") or "")
        excerpt = _strip_markdown(body)[:180]
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


def _match_chunk_title(chunks: list[dict[str, Any]], cite: str) -> dict[str, Any] | None:
    cite_l = (cite or "").strip().lower()
    if not cite_l:
        return None
    for c in chunks:
        title = str(c.get("title") or "")
        if title.lower() == cite_l:
            return c
    for c in chunks:
        title = str(c.get("title") or "")
        if cite_l in title.lower() or title.lower() in cite_l:
            return c
    return None


def _enforce_class_citations(
    *,
    chunks: list[dict[str, Any]],
    answer: str,
    citations: list[str],
    grounded: bool,
    course_title: str,
    class_name: str,
) -> dict[str, Any]:
    """Drop non-class citations; refuse when the model cannot ground in lessons."""
    valid_cites: list[str] = []
    for cite in citations:
        matched = _match_chunk_title(chunks, cite)
        if matched:
            title = str(matched["title"])
            if title not in valid_cites:
                valid_cites.append(title)
    scope_label = class_name or course_title or "this class"
    if grounded and not valid_cites:
        return {
            "answer": (
                f"I can only answer from the lessons for {scope_label}. "
                "That question is not covered in your class materials — "
                "try asking about a topic from this class’s lessons."
            ),
            "citations": [],
            "citation_links": [],
            "grounded": False,
            "refusal_reason": "off_class_materials",
        }
    if not grounded:
        return {
            "answer": (
                str(answer or "").strip()
                or (
                    f"I can only help with lessons for {scope_label}. "
                    "Ask about a topic from this class’s materials."
                )
            ),
            "citations": [],
            "citation_links": [],
            "grounded": False,
            "refusal_reason": "off_class_materials",
        }
    return {
        "answer": str(answer or "").strip(),
        "citations": valid_cites[:6],
        "citation_links": _citation_links(chunks, valid_cites[:6]),
        "grounded": True,
        "refusal_reason": None,
    }


def _strip_markdown(text: str) -> str:
    t = text or ""
    t = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", t)
    t = re.sub(r"[*`_#>]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _simple_plain_answer(*, question: str, lesson_title: str, body: str) -> str:
    """Short, easy student answer from a lesson excerpt (no raw markdown dump)."""
    clean = _strip_markdown(body)
    # Prefer 1–2 short sentences.
    parts = re.split(r"(?<=[.!?])\s+", clean)
    sentences = [p.strip() for p in parts if len(p.strip()) > 12][:2]
    core = " ".join(sentences) if sentences else clean[:160]
    if len(core) > 220:
        core = core[:217].rstrip() + "…"
    q = (question or "").lower()
    if "what is" in q or "what are" in q or "define" in q:
        return f"In simple words: {core}"
    if "how" in q:
        return f"Here’s the easy way from your lesson: {core}"
    return f"From your class lesson “{lesson_title}”: {core}"


def _easy_reply_instruction() -> str:
    return (
        "Write for a school student. Keep the answer short and easy: "
        "2 to 4 simple sentences. No markdown headings. "
        "Avoid jargon; if you must use a term, explain it in plain words. "
        "Do not paste lesson text verbatim — explain it simply."
    )


def _token_overlap_score(question: str, chunk: dict[str, Any]) -> int:
    """Score question↔chunk overlap (Latin + long Unicode tokens)."""
    q = question or ""
    latin = {w.lower() for w in re.findall(r"[A-Za-z]{3,}", q)}
    indic = {w for w in re.findall(r"[\u0900-\u0D7F]{2,}", q)}
    body = f"{chunk.get('title') or ''} {chunk.get('body') or ''}".lower()
    body_raw = f"{chunk.get('title') or ''} {chunk.get('body') or ''}"
    score = sum(1 for w in latin if w in body)
    score += sum(1 for w in indic if w in body_raw)
    return score


def study_coach_answer(
    *,
    question: str,
    curriculum_chunks: list[dict[str, Any]],
    course_title: str = "",
    class_name: str = "",
    reply_language: str = "en-IN",
) -> dict[str, Any]:
    """Answer only from this class's lesson materials (no general knowledge)."""
    from app.modules.ai_tutor.voice import (
        normalize_voice_lang,
        reply_language_instruction,
        voice_language_meta,
    )
    from app.settings import get_settings

    q = (question or "").strip()
    if len(q) < 3:
        raise ValueError("Ask a short question about your class lessons")
    lang = normalize_voice_lang(reply_language)
    lang_meta = voice_language_meta(lang)
    lang_instruction = reply_language_instruction(lang)
    store_turns = bool(getattr(get_settings(), "coach_store_turns", False))
    scope_label = (class_name or course_title or "this class").strip()
    chunks: list[dict[str, Any]] = []
    for c in curriculum_chunks[:24]:
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
                "lesson_id": str(c.get("lesson_id") or ""),
                "course_id": str(c.get("course_id") or ""),
            }
        )
    if not chunks:
        return {
            "answer": (
                f"No lessons are linked for {scope_label} yet. "
                "Ask your teacher to publish class lessons (or SME lesson sources) "
                "for this course."
            ),
            "citations": [],
            "citation_links": [],
            "grounded": False,
            "refusal_reason": "no_class_materials",
            "retention": "stateless" if not store_turns else "session",
            "practice_hint": True,
            "provider": "local",
            "model": "heuristic-v1",
            "reply_language": lang,
            "reply_language_name": lang_meta["name"],
            "scope": "class_lessons",
            "course_title": course_title,
            "class_name": class_name,
        }

    allowed_titles = [c["title"] for c in chunks]

    def _openai():
        data = openai_chat_json(
            system=(
                "You are a friendly class study coach for school students. "
                f"You may ONLY use the provided lessons for “{scope_label}”. "
                "Do NOT use general knowledge, other courses, or the open web. "
                "If the question is not clearly answered by those lessons, "
                "refuse and set grounded=false. "
                "Every grounded answer MUST cite one or more lesson titles "
                "exactly as listed. Prefer the most relevant lesson. "
                "Do not invent URLs or source titles. "
                f"{_easy_reply_instruction()} "
                f"{lang_instruction} "
                "Return ONLY JSON: "
                '{"answer":"...","citations":["exact lesson title",...],"grounded":true}'
            ),
            user=(
                f"Class: {scope_label}\n"
                f"Course: {course_title or scope_label}\n"
                f"Reply language: {lang_meta['name']} ({lang})\n"
                f"Allowed lesson titles: {allowed_titles}\n"
                f"Student question: {q}\n"
                f"Class lesson materials: "
                f"{[{'title': c['title'], 'body': c['body']} for c in chunks]}"
            ),
            temperature=0.2,
        )
        cites = [str(x) for x in (data.get("citations") or [])][:6]
        grounded = bool(data.get("grounded", False))
        return _enforce_class_citations(
            chunks=chunks,
            answer=str(data.get("answer") or ""),
            citations=cites,
            grounded=grounded,
            course_title=course_title,
            class_name=class_name,
        )

    def _local():
        scored: list[tuple[int, dict[str, Any]]] = []
        for c in chunks:
            scored.append((_token_overlap_score(q, c), c))
        scored.sort(key=lambda t: t[0], reverse=True)
        best_score, best = scored[0] if scored else (0, chunks[0])
        if best_score < 1:
            return {
                "answer": (
                    f"I can only help with lessons for {scope_label}. "
                    "Try asking about a topic from this class."
                ),
                "citations": [],
                "citation_links": [],
                "grounded": False,
                "refusal_reason": "off_class_materials",
            }
        cites = [best["title"]]
        return {
            "answer": _simple_plain_answer(
                question=q,
                lesson_title=str(best["title"]),
                body=str(best["body"]),
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
    # Final pass: never keep grounded=true without in-class citations.
    if result.get("grounded") and not (result.get("citations") or []):
        result = _enforce_class_citations(
            chunks=chunks,
            answer=str(result.get("answer") or ""),
            citations=[],
            grounded=True,
            course_title=course_title,
            class_name=class_name,
        )
        if "provider" not in result:
            result["provider"] = "local"
            result["model"] = "heuristic-v1"
    # Students should not see technical LLM fallback notes.
    if result.get("note") and (
        "fallback" in str(result.get("note")).lower()
        or "OPENAI" in str(result.get("note"))
        or "ANTHROPIC" in str(result.get("note"))
        or ".env" in str(result.get("note"))
    ):
        result["note"] = ""
    result.setdefault(
        "refusal_reason",
        None if result.get("grounded") else "off_class_materials",
    )
    result["retention"] = "stateless" if not store_turns else "session"
    result["practice_hint"] = True
    result["reply_language"] = lang
    result["reply_language_name"] = lang_meta["name"]
    result["scope"] = "class_lessons"
    result["course_title"] = course_title
    result["class_name"] = class_name
    return result


def curriculum_chunks_for_session(
    tenant_id: str,
    course_id: str | None,
    *,
    list_lessons_fn,
    get_bound_course_fn,
    class_name: str = "",
) -> tuple[str, list[dict[str, Any]]]:
    """Load lesson materials for the bound class course only.

    Guardrail: never pull lessons from other courses or tenant-wide dumps.
    If the teacher curated SME lesson sources for this course, prefer those;
    otherwise use all published reading lessons on the course.
    """
    if not tenant_id or not course_id:
        return "", []
    course = get_bound_course_fn(tenant_id, course_id)
    if not course:
        return "", []
    course_key = str(course["id"])
    title = str(course.get("title") or "")
    lessons = list_lessons_fn(tenant_id, course_key) or []

    sme_allowed: set[str] | None = None
    try:
        from app.modules import sme as sme_mod

        approved: set[str] = set()
        for s in sme_mod.list_sources(tenant_id):
            if s.get("source_kind") != "lesson" or not s.get("lesson_id"):
                continue
            approved.add(str(s["lesson_id"]))
        if approved:
            course_lesson_ids = {
                str(L["id"])
                for L in lessons
                if L.get("lesson_type") != "quiz"
            }
            sme_allowed = approved & course_lesson_ids
            if not sme_allowed:
                sme_allowed = None  # fall back to all course lessons
    except Exception:  # noqa: BLE001
        sme_allowed = None

    chunks: list[dict[str, Any]] = []
    for L in lessons:
        if L.get("lesson_type") == "quiz":
            continue
        lid = str(L.get("id") or "")
        if sme_allowed is not None and lid not in sme_allowed:
            continue
        body = str(L.get("body_md") or "").strip()
        if len(body) < 20:
            continue
        chunks.append(
            {
                "title": str(L.get("title") or "Lesson"),
                "body": body,
                "kind": "lesson",
                "href": f"/lessons/{lid}",
                "lesson_id": lid,
                "course_id": course_key,
                "class_name": class_name,
            }
        )
    return title, chunks


__all__ = [
    "ai_status",
    "hint_for_missed_question",
    "study_coach_answer",
    "curriculum_chunks_for_session",
]
