"""D13 authoring SME assistant — teacher drafts grounded in approved sources."""
from __future__ import annotations

import re
from typing import Any

from app.modules.ai_assessment.llm import openai_chat_json, run_ai


def author_assist(
    *,
    prompt: str,
    source_chunks: list[dict[str, Any]],
    mode: str = "lesson",
    course_title: str = "",
) -> dict[str, Any]:
    """
    Teacher-facing authoring help (separate from learner study coach).

    mode: lesson | manual | mcq
    Returns draft_md + citations; never writes grades or publishes alone.
    """
    q = (prompt or "").strip()
    if len(q) < 5:
        raise ValueError("Describe what you want to draft (at least a few words)")
    mode_s = (mode or "lesson").strip().lower()
    if mode_s not in {"lesson", "manual", "mcq"}:
        mode_s = "lesson"

    chunks: list[dict[str, Any]] = []
    for c in source_chunks[:20]:
        title = str(c.get("title") or "Source").strip()
        body = str(c.get("body") or "").strip()
        if not body:
            continue
        chunks.append(
            {
                "title": title,
                "body": body[:2000],
                "href": c.get("href") or "",
                "kind": c.get("kind") or "",
            }
        )
    if not chunks:
        return {
            "draft_md": "",
            "title": "",
            "summary": "",
            "citations": [],
            "citation_links": [],
            "grounded": False,
            "refusal_reason": "no_sources",
            "mode": mode_s,
            "answer": (
                "No approved SME sources. Add manuals/lessons under Teach → SME sources "
                "before using the authoring assistant."
            ),
            "provider": "local",
            "model": "heuristic-v1",
        }

    mode_instructions = {
        "lesson": (
            "Draft a short student-facing lesson in Markdown (headings, short paragraphs). "
            'Return JSON: {"title":"...","draft_md":"...","summary":"...","citations":[...],"grounded":true}'
        ),
        "manual": (
            "Draft a technical manual chapter in Markdown with ## section headings. "
            'Return JSON: {"title":"...","draft_md":"...","summary":"...","citations":[...],"grounded":true}'
        ),
        "mcq": (
            "Draft 3 multiple-choice items as Markdown (question + A/B/C/D + mark correct). "
            'Return JSON: {"title":"...","draft_md":"...","summary":"...","citations":[...],"grounded":true}'
        ),
    }

    def _openai():
        data = openai_chat_json(
            system=(
                "You are an SME authoring assistant for teachers. "
                "Use ONLY the provided approved sources. "
                "Do not invent facts. Teachers will review before publishing. "
                + mode_instructions[mode_s]
            ),
            user=(
                f"Course: {course_title or 'this course'}\n"
                f"Author request: {q}\n"
                f"Mode: {mode_s}\n"
                f"Approved sources: {[{'title': c['title'], 'body': c['body']} for c in chunks]}"
            ),
            temperature=0.35,
        )
        cites = [str(x) for x in (data.get("citations") or [])][:8]
        return {
            "title": str(data.get("title") or "").strip(),
            "draft_md": str(data.get("draft_md") or data.get("answer") or "").strip(),
            "summary": str(data.get("summary") or "").strip(),
            "citations": cites,
            "grounded": bool(data.get("grounded", True)),
        }

    def _local():
        q_words = {w.lower() for w in re.findall(r"[A-Za-z]{3,}", q)}
        scored: list[tuple[int, dict[str, Any]]] = []
        for c in chunks:
            blob = (c["title"] + " " + c["body"]).lower()
            score = sum(1 for w in q_words if w in blob)
            scored.append((score, c))
        scored.sort(key=lambda t: t[0], reverse=True)
        best = scored[0][1] if scored else chunks[0]
        if scored and scored[0][0] < 1:
            best = chunks[0]
        excerpt = re.sub(r"\s+", " ", best["body"]).strip()[:500]
        if mode_s == "mcq":
            draft = (
                f"## Practice items (from {best['title']})\n\n"
                f"1. Based on the source, which statement is accurate?\n"
                f"   A. (review the section)\n"
                f"   B. (distractor)\n"
                f"   C. (distractor)\n"
                f"   D. (distractor)\n"
                f"   **Correct:** A — refine after reading:\n\n> {excerpt}\n"
            )
            title = f"MCQ draft · {best['title']}"
        elif mode_s == "manual":
            draft = (
                f"## {best['title']}\n\n"
                f"{excerpt}\n\n"
                f"## Check your understanding\n\n"
                f"- Restate the key idea in one sentence.\n"
                f"- Apply it to a classroom example.\n"
            )
            title = f"Manual draft · {best['title']}"
        else:
            draft = (
                f"# Review: {best['title']}\n\n"
                f"{excerpt}\n\n"
                f"## Try it\n\n"
                f"Write one example that uses this idea, then check against the source.\n"
            )
            title = f"Lesson draft · {best['title']}"
        return {
            "title": title,
            "draft_md": draft,
            "summary": f"Local draft grounded in “{best['title']}”.",
            "citations": [best["title"]],
            "grounded": True,
        }

    result = run_ai(openai_fn=_openai, local_fn=_local, feature="author")
    cites = list(result.get("citations") or [])
    by_title = {c["title"]: c for c in chunks}
    links = []
    for cite in cites:
        c = by_title.get(cite) or next(
            (
                x
                for x in chunks
                if cite.lower() in x["title"].lower()
                or x["title"].lower() in cite.lower()
            ),
            None,
        )
        if c:
            links.append({"title": c["title"], "href": c.get("href") or "", "kind": c.get("kind")})
        else:
            links.append({"title": cite, "href": "", "kind": ""})
    result["citation_links"] = links
    result["mode"] = mode_s
    result.setdefault("refusal_reason", None if result.get("grounded") else "off_curriculum")
    if not result.get("draft_md"):
        result["grounded"] = False
        result["refusal_reason"] = "empty_draft"
    return result
