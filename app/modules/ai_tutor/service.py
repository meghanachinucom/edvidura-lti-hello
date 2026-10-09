"""Student AI tutor: wrong-answer hints + curriculum-grounded Ask Vidura."""
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
    q = (question or "").lower()
    title_l = (lesson_title or "").lower()
    blob = f"{title_l} {clean.lower()}"

    # Topic-line lessons (common in seed): expand into a plain student tip.
    if "variable" in q and "variable" in blob:
        return (
            "In simple words: a variable is a letter (like x or y) that stands "
            "for a number we do not know yet. Your Algebra lesson also covers "
            "expressions and solving for x."
        )
    if "expression" in q and "expression" in blob:
        return (
            "In simple words: an expression is a math phrase with numbers, "
            "variables, and operations (like 2x + 3). It does not have an equals sign."
        )
    if ("solv" in q or "solve" in q) and ("solv" in blob or "solving" in blob):
        return (
            "In simple words: solving for x means finding the number that makes "
            "the equation true. Use the lesson steps to isolate x on one side."
        )

    parts = re.split(r"(?<=[.!?])\s+", clean)
    sentences = [p.strip() for p in parts if len(p.strip()) > 20][:2]
    # Skip bare topic lists with no real sentence.
    if not sentences:
        return (
            f"Your class lesson “{lesson_title}” covers: {clean}. "
            "Ask a more specific question (for example: What is a variable?)."
        )
    core = " ".join(sentences)
    if len(core) > 220:
        core = core[:217].rstrip() + "…"
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
    learner_context: dict[str, Any] | None = None,
    preferred_strategy: str | None = None,
    skip_clarify: bool = False,
) -> dict[str, Any]:
    """Answer only from this class's lesson materials (no general knowledge).

    Uses an explicit cognitive strategy (socratic / hint / explain /
    practice_handoff) so the coach behaves like a careful human tutor.

    Phase A gates (before LLM):
    1. Academic integrity refuse (exam / assignment writing)
    2. Clarify-once when the question is ambiguous (unless skip_clarify)
    """
    from app.modules.ai_tutor.clarify import build_clarify_reply, needs_clarify
    from app.modules.ai_tutor.cognitive import (
        context_prompt_block,
        local_check_question,
        normalize_coach_strategy,
        pick_coach_strategy,
        strategy_instruction,
        strategy_label,
    )
    from app.modules.ai_tutor.integrity import detect_integrity_violation
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
    ctx = dict(learner_context or {})
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

    # Phase A — integrity (before any LLM / Jev spend on prose).
    blocked = detect_integrity_violation(q)
    if blocked:
        blocked["reply_language"] = lang
        blocked["reply_language_name"] = lang_meta["name"]
        blocked["retention"] = "stateless" if not store_turns else "session"
        blocked["scope"] = "class_lessons"
        blocked["course_title"] = course_title
        blocked["class_name"] = class_name
        return blocked

    titles = [c["title"] for c in chunks]
    if not skip_clarify and needs_clarify(q, lesson_titles=titles):
        clarify = build_clarify_reply(
            q,
            lesson_titles=titles,
            class_name=class_name,
            course_title=course_title,
        )
        clarify["reply_language"] = lang
        clarify["reply_language_name"] = lang_meta["name"]
        clarify["retention"] = "stateless" if not store_turns else "session"
        return clarify

    jev_meta: dict[str, Any] = {
        "used": False,
        "strategy_source": "heuristic",
        "on_topic": None,
        "on_topic_p": None,
        "strategy_confidence": None,
        "model": None,
    }
    try:
        from app.modules import jev as jev_mod

        jev_meta = jev_mod.coach_decisions(
            question=q,
            lesson_excerpts=[{"title": c["title"], "body": c["body"]} for c in chunks],
            learner_context=ctx,
            preferred_strategy=preferred_strategy,
        )
    except Exception:  # noqa: BLE001
        jev_meta = {
            "used": False,
            "strategy": pick_coach_strategy(
                question=q, learner_context=ctx, preferred=preferred_strategy
            ),
            "strategy_source": "heuristic",
            "on_topic": None,
            "on_topic_p": None,
            "strategy_confidence": None,
            "model": None,
            "fallback_reason": "jev_error",
        }
    strategy = normalize_coach_strategy(jev_meta.get("strategy")) or pick_coach_strategy(
        question=q, learner_context=ctx, preferred=preferred_strategy
    )
    src = str(jev_meta.get("strategy_source") or "heuristic")
    if src == "jev":
        strategy_reason = (
            f"Jev chose {strategy_label(strategy)} "
            f"(confidence {jev_meta.get('strategy_confidence')})"
        )
    else:
        strategy_reason = (
            f"Chose {strategy_label(strategy)} from learner quiz level "
            f"({ctx.get('difficulty_label') or 'Medium'}) and question shape."
        )

    def _with_cognitive(payload: dict[str, Any], *, lesson_title: str = "") -> dict[str, Any]:
        out = dict(payload)
        chosen = normalize_coach_strategy(out.get("strategy")) or strategy
        out["strategy"] = chosen
        out["strategy_label"] = strategy_label(chosen)
        out["strategy_reason"] = str(
            out.get("strategy_reason") or strategy_reason
        ).strip()[:240]
        check = str(out.get("check_question") or "").strip()
        if out.get("grounded") and not check:
            check = local_check_question(
                strategy=chosen,
                lesson_title=lesson_title or (chunks[0]["title"] if chunks else ""),
                question=q,
            )
        if not out.get("grounded"):
            check = ""
        out["check_question"] = check[:240]
        out["learner_difficulty"] = str(ctx.get("difficulty") or "core")
        out["learner_difficulty_label"] = str(
            ctx.get("difficulty_label") or "Medium"
        )
        out["weak_skills"] = list(ctx.get("weak_skills") or [])[:5]
        out["practice_hint"] = True
        if chosen == "practice_handoff":
            out["practice_hint"] = True
        out["jev_used"] = bool(jev_meta.get("used"))
        out["jev_model"] = jev_meta.get("model")
        out["jev_strategy_source"] = jev_meta.get("strategy_source")
        out["jev_strategy_confidence"] = jev_meta.get("strategy_confidence")
        out["jev_on_topic_p"] = jev_meta.get("on_topic_p")
        out["jev_llm_tier"] = jev_meta.get("llm_tier")
        out["jev_skipped_remote"] = bool(jev_meta.get("skipped_remote"))
        return out

    # Jev on-topic gate (when confident) — refuse before spending LLM tokens.
    if jev_meta.get("used") and jev_meta.get("on_topic") is False and chunks:
        return _with_cognitive(
            {
                "answer": (
                    f"I can only help with lessons for {scope_label}. "
                    "Try asking about a topic from this class."
                ),
                "citations": [],
                "citation_links": [],
                "grounded": False,
                "refusal_reason": "off_class_materials",
                "retention": "stateless" if not store_turns else "session",
                "provider": "jev",
                "model": str(jev_meta.get("model") or "jev"),
                "reply_language": lang,
                "reply_language_name": lang_meta["name"],
                "scope": "class_lessons",
                "course_title": course_title,
                "class_name": class_name,
            }
        )

    if not chunks:
        return _with_cognitive(
            {
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
                "provider": "local",
                "model": "heuristic-v1",
                "reply_language": lang,
                "reply_language_name": lang_meta["name"],
                "scope": "class_lessons",
                "course_title": course_title,
                "class_name": class_name,
            }
        )

    allowed_titles = [c["title"] for c in chunks]
    learner_block = context_prompt_block(ctx)

    def _openai():
        data = openai_chat_json(
            system=(
                "You are a friendly Ask Vidura tutor for school students. "
                "Think like a careful human tutor: notice the learner, pick one "
                "teaching move, then answer. "
                "Never write exams, assignments, essays, or answer keys — refuse "
                "those and offer a hint or explanation from the lessons instead. "
                f"You may ONLY use the provided lessons for “{scope_label}”. "
                "Do NOT use general knowledge, other courses, or the open web. "
                "If the question is not clearly answered by those lessons, "
                "refuse and set grounded=false. "
                "Every grounded answer MUST cite one or more lesson titles "
                "exactly as listed. Prefer the most relevant lesson. "
                "Do not invent URLs or source titles. "
                f"Use strategy={strategy}. {strategy_instruction(strategy)} "
                f"{_easy_reply_instruction()} "
                f"{lang_instruction} "
                "Return ONLY JSON: "
                '{"answer":"...","citations":["exact lesson title",...],'
                '"grounded":true,"strategy":"socratic|hint|explain|practice_handoff",'
                '"check_question":"...","strategy_reason":"short why"}'
            ),
            user=(
                f"Class: {scope_label}\n"
                f"Course: {course_title or scope_label}\n"
                f"Reply language: {lang_meta['name']} ({lang})\n"
                f"Learner context: {learner_block}\n"
                f"Chosen strategy: {strategy}\n"
                f"Allowed lesson titles: {allowed_titles}\n"
                f"Student question: {q}\n"
                f"Class lesson materials: "
                f"{[{'title': c['title'], 'body': c['body']} for c in chunks]}"
            ),
            temperature=0.3,
        )
        cites = [str(x) for x in (data.get("citations") or [])][:6]
        grounded = bool(data.get("grounded", False))
        enforced = _enforce_class_citations(
            chunks=chunks,
            answer=str(data.get("answer") or ""),
            citations=cites,
            grounded=grounded,
            course_title=course_title,
            class_name=class_name,
        )
        enforced["strategy"] = data.get("strategy") or strategy
        enforced["check_question"] = str(data.get("check_question") or "")
        enforced["strategy_reason"] = str(data.get("strategy_reason") or "")
        best_title = ""
        if enforced.get("citations"):
            best_title = str(enforced["citations"][0])
        return _with_cognitive(enforced, lesson_title=best_title)

    def _local():
        scored: list[tuple[int, dict[str, Any]]] = []
        for c in chunks:
            scored.append((_token_overlap_score(q, c), c))
        scored.sort(key=lambda t: t[0], reverse=True)
        best_score, best = scored[0] if scored else (0, chunks[0])
        if best_score < 1:
            return _with_cognitive(
                {
                    "answer": (
                        f"I can only help with lessons for {scope_label}. "
                        "Try asking about a topic from this class."
                    ),
                    "citations": [],
                    "citation_links": [],
                    "grounded": False,
                    "refusal_reason": "off_class_materials",
                }
            )
        cites = [best["title"]]
        title = str(best["title"])
        body = str(best["body"])
        if strategy == "socratic":
            answer = (
                f"Let’s think from “{title}” together. "
                "What clue in that lesson matches your question? "
                "I’ll explain after you try."
            )
        elif strategy == "hint":
            plain = _simple_plain_answer(question=q, lesson_title=title, body=body)
            # Keep only the first sentence as a nudge when possible.
            first = re.split(r"(?<=[.!?])\s+", plain)[0].strip()
            answer = (
                f"Hint from “{title}”: {first} "
                "Look for that idea in the lesson, then answer the check below."
            )
        elif strategy == "practice_handoff":
            answer = (
                f"Quick pointer from “{title}”: "
                f"{_simple_plain_answer(question=q, lesson_title=title, body=body)} "
                "A short practice quiz will lock this in."
            )
        else:
            answer = _simple_plain_answer(question=q, lesson_title=title, body=body)
        return _with_cognitive(
            {
                "answer": answer,
                "citations": cites,
                "citation_links": _citation_links(chunks, cites),
                "grounded": True,
                "refusal_reason": None,
            },
            lesson_title=title,
        )

    if jev_meta.get("llm_tier") == "local" or jev_meta.get("skipped_remote"):
        # Honor Jev cost route: skip remote chat when local is enough.
        result = _local()
        if isinstance(result, dict):
            result["provider"] = "local"
            result["model"] = "heuristic-v1"
            result["jev_route"] = {
                "tier": "local",
                "used": bool(jev_meta.get("used")),
                "skipped_remote": True,
                "confidence": jev_meta.get("llm_tier_confidence"),
                "model": jev_meta.get("model"),
            }
            result["note"] = (
                "Jev routed Ask Vidura to local heuristics — skipped remote LLM."
            )
    else:
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
        result = _with_cognitive(result)
    else:
        result = _with_cognitive(
            result,
            lesson_title=str((result.get("citations") or [""])[0] or ""),
        )
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
