"""Teacher-facing AI: MCQs, simplify, grade assist, activity & next-step suggestions."""
from __future__ import annotations

import re
from typing import Any

from app.modules.ai_assessment.llm import ai_status, openai_chat_json, run_ai

GENERIC_DISTRACTORS = (
    "This is not covered in the lesson",
    "None of the above apply",
    "The opposite of what the lesson states",
)


def generate_mcqs_from_text(
    body: str,
    *,
    count: int = 3,
    title: str = "",
) -> dict[str, Any]:
    text = (body or "").strip()
    if len(text) < 40:
        raise ValueError("Lesson text is too short to generate questions")
    n = max(1, min(int(count), 5))

    def _openai():
        questions = _openai_mcqs(text, count=n, title=title)
        return {"questions": questions}

    def _local():
        return {"questions": _local_mcqs(text, count=n, title=title)}

    return run_ai(openai_fn=_openai, local_fn=_local, feature="mcq")


def extract_text_from_bytes(
    data: bytes,
    *,
    filename: str = "",
) -> dict[str, Any]:
    """Extract plain text from PDF / .txt / .md for MCQ drafting."""
    raw = data or b""
    if not raw:
        raise ValueError("Empty upload")
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError("File too large (max 8 MB)")
    name = (filename or "upload").lower().strip()
    if name.endswith((".txt", ".md", ".markdown")):
        text = raw.decode("utf-8", errors="replace").strip()
        if len(text) < 40:
            raise ValueError("Text file is too short to generate questions")
        return {
            "text": text,
            "source_kind": "text",
            "page_count": None,
            "filename": filename or "upload.txt",
        }
    if not name.endswith(".pdf"):
        raise ValueError("Upload a PDF or .txt / .md file")
    try:
        from io import BytesIO

        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover
        raise ValueError(
            "PDF support requires pypdf — run: pip install pypdf"
        ) from exc
    try:
        reader = PdfReader(BytesIO(raw))
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"Could not read PDF: {exc}") from exc
    pages: list[str] = []
    for page in reader.pages[:40]:
        try:
            pages.append((page.extract_text() or "").strip())
        except Exception:  # noqa: BLE001
            continue
    text = "\n\n".join(p for p in pages if p).strip()
    if len(text) < 40:
        raise ValueError(
            "Could not extract enough text from this PDF "
            "(scanned images need OCR — paste text or use a text PDF)"
        )
    return {
        "text": text[:50000],
        "source_kind": "pdf",
        "page_count": len(reader.pages),
        "filename": filename or "upload.pdf",
    }


def generate_mcqs_from_document(
    data: bytes,
    *,
    filename: str = "",
    count: int = 3,
    title: str = "",
) -> dict[str, Any]:
    """PDF/text upload → extract → MCQ draft (teacher reviews before save)."""
    extracted = extract_text_from_bytes(data, filename=filename)
    label = (title or "").strip() or (filename or "Uploaded document")
    result = generate_mcqs_from_text(
        extracted["text"], count=count, title=label
    )
    result["source_kind"] = extracted["source_kind"]
    result["source_filename"] = extracted["filename"]
    result["page_count"] = extracted.get("page_count")
    result["extracted_chars"] = len(extracted["text"])
    return result


def simplify_lesson_text(
    body: str,
    *,
    title: str = "",
    level: str = "simpler",
) -> dict[str, Any]:
    """Rewrite lesson text for a clearer reading level (teacher reviews before save)."""
    text = (body or "").strip()
    if len(text) < 40:
        raise ValueError("Lesson text is too short to simplify")

    def _openai():
        data = openai_chat_json(
            system=(
                "You rewrite educational lesson text for teachers. "
                'Return ONLY JSON: {"title":"...","body_md":"...","summary":"one sentence"}. '
                "Keep facts; use shorter sentences; Markdown allowed. No preamble."
            ),
            user=(
                f"Rewrite at a {level} reading level"
                + (f' for lesson "{title}"' if title else "")
                + f":\n\n{text[:6000]}"
            ),
        )
        return {
            "title": str(data.get("title") or title or "").strip(),
            "body_md": str(data.get("body_md") or "").strip(),
            "summary": str(data.get("summary") or "").strip(),
        }

    def _local():
        sents = _sentences(text)
        short = ". ".join(s[:120] for s in sents[:8])
        if not short:
            short = text[:800]
        body_md = (
            f"## {title or 'Simplified lesson'}\n\n"
            f"{short}.\n\n"
            "_Local simplify: shorter sentences from the original. "
            "Enable OpenAI for a fuller rewrite._"
        )
        return {
            "title": title or "Simplified lesson",
            "body_md": body_md,
            "summary": "Shortened local rewrite of the lesson text.",
        }

    return run_ai(openai_fn=_openai, local_fn=_local, feature="simplify")


def generate_remediation_micro_lesson(
    *,
    skill_label: str,
    skill_code: str = "",
    skill_description: str = "",
    course_title: str = "",
    source_excerpt: str = "",
) -> dict[str, Any]:
    """
    Draft a short remediation lesson for one skill (teacher reviews before save).

    DCT content-generation slice — does not auto-publish or rewrite author order.
    """
    label = (skill_label or skill_code or "Skill").strip()
    if not label:
        raise ValueError("Skill label is required")
    code = (skill_code or "").strip()
    desc = (skill_description or "").strip()
    course = (course_title or "").strip()
    excerpt = (source_excerpt or "").strip()[:4000]

    def _openai():
        data = openai_chat_json(
            system=(
                "You write short remediation micro-lessons for teachers. "
                'Return ONLY JSON: {"title":"...","body_md":"...","summary":"one sentence"}. '
                "Markdown body: one ## overview, 2–4 short sections, one practice tip. "
                "Keep under ~400 words. Accurate, encouraging, no preamble."
            ),
            user=(
                f"Course: {course or 'General'}\n"
                f"Skill code: {code or 'n/a'}\n"
                f"Skill: {label}\n"
                f"Description: {desc or 'Help the learner master this skill.'}\n"
                + (
                    f"Ground in this approved excerpt when useful:\n{excerpt}\n"
                    if excerpt
                    else ""
                )
                + "Write a remediation micro-lesson for students who missed this skill."
            ),
        )
        title = str(data.get("title") or f"Review: {label}").strip()
        body_md = str(data.get("body_md") or "").strip()
        summary = str(data.get("summary") or "").strip()
        if len(body_md) < 40:
            raise ValueError("Model returned empty lesson body")
        return {
            "title": title,
            "body_md": body_md,
            "summary": summary,
            "skill_code": code,
            "skill_label": label,
        }

    def _local():
        title = f"Review: {label}"
        bits = [
            f"## {label}",
            "",
            desc
            or f"This short lesson helps you rebuild confidence with **{label}**.",
            "",
            "### Why it matters",
            f"You missed items tied to this skill"
            + (f" in {course}" if course else "")
            + ". A focused review closes that gap before the graded retry.",
            "",
            "### Core idea",
            desc
            or f"Re-read the key idea behind **{label}**, then try a small practice step.",
            "",
            "### Try this",
            "1. Restate the idea in your own words.",
            "2. Work one practice item slowly.",
            "3. Check your answer against the lesson.",
            "",
        ]
        if excerpt:
            bits.extend(
                [
                    "### From your materials",
                    excerpt[:600],
                    "",
                ]
            )
        bits.append(
            "_Local draft — enable OpenAI for a fuller rewrite. Teacher must review before publish._"
        )
        return {
            "title": title,
            "body_md": "\n".join(bits),
            "summary": f"Local remediation draft for {label}.",
            "skill_code": code,
            "skill_label": label,
        }

    return run_ai(
        openai_fn=_openai, local_fn=_local, feature="remediation_micro_lesson"
    )

def grade_open_response(
    *,
    prompt: str,
    rubric: str,
    student_answer: str,
    max_score: int = 5,
) -> dict[str, Any]:
    """Suggest a score for an open response — never sends to Moodle/AGS."""
    prompt_s = (prompt or "").strip()
    answer = (student_answer or "").strip()
    if not prompt_s or not answer:
        raise ValueError("Prompt and student answer are required")
    max_s = max(1, min(int(max_score), 20))
    rubric_s = (rubric or "Award points for accuracy, clarity, and completeness.").strip()

    def _pack(core: dict[str, Any]) -> dict[str, Any]:
        score = int(core.get("score") or 0)
        score = max(0, min(score, max_s))
        feedback = str(core.get("feedback") or "").strip()
        strengths = [str(x) for x in (core.get("strengths") or [])][:5]
        improvements = [str(x) for x in (core.get("improvements") or [])][:5]
        confidence = str(core.get("confidence") or "medium")
        copy_text = (
            f"Score: {score}/{max_s}\n"
            f"Confidence: {confidence}\n"
            f"Feedback: {feedback}\n"
        )
        if strengths:
            copy_text += "Strengths: " + "; ".join(strengths) + "\n"
        if improvements:
            copy_text += "Improvements: " + "; ".join(improvements) + "\n"
        copy_text += (
            "\n— EdVidura AI suggestion only. Not sent to Moodle. "
            "Teacher enters the official grade in the LMS."
        )
        return {
            "score": score,
            "max_score": max_s,
            "feedback": feedback,
            "strengths": strengths,
            "improvements": improvements,
            "confidence": confidence,
            "disclaimer": (
                "Suggestion only — never sent to Moodle automatically. "
                "Copy and enter the official grade yourself in the LMS."
            ),
            "moodle_passback": False,
            "copy_text": copy_text,
        }

    def _openai():
        data = openai_chat_json(
            system=(
                "You assist teachers grading short answers. "
                "Return ONLY JSON: "
                '{"score":0,"max_score":5,"feedback":"...","strengths":["..."],'
                '"improvements":["..."],"confidence":"low|medium|high"}. '
                "Never invent facts not in the answer. "
                "You do NOT send grades to any LMS."
            ),
            user=(
                f"Max score: {max_s}\nRubric: {rubric_s}\n"
                f"Question: {prompt_s}\nStudent answer: {answer}"
            ),
            temperature=0.2,
        )
        return _pack(data if isinstance(data, dict) else {})

    def _local():
        words = len(answer.split())
        has_key = any(
            w.lower() in answer.lower()
            for w in re.findall(r"[A-Za-z]{4,}", prompt_s)[:6]
        )
        score = min(max_s, max(1, words // 12 + (2 if has_key else 0)))
        return _pack(
            {
                "score": score,
                "feedback": (
                    f"Local estimate from length ({words} words) and keyword overlap. "
                    "Review carefully before grading in Moodle."
                ),
                "strengths": ["Attempt submitted"] if words else [],
                "improvements": ["Add more specific detail from the lesson"],
                "confidence": "low",
            }
        )

    return run_ai(openai_fn=_openai, local_fn=_local, feature="grade_assist")


def suggest_deeplink_activities(
    lessons: list[dict[str, Any]],
    *,
    course_title: str = "",
) -> dict[str, Any]:
    """Suggest which lesson/quiz to deep-link into Moodle."""
    items = []
    for L in lessons[:20]:
        items.append(
            {
                "id": str(L.get("id") or ""),
                "title": str(L.get("title") or ""),
                "lesson_type": str(L.get("lesson_type") or "article"),
            }
        )
    if not items:
        return {
            "suggestions": [],
            "provider": "local",
            "note": "No lessons published yet.",
        }

    def _openai():
        data = openai_chat_json(
            system=(
                "You help teachers pick LTI deep-link activities for Moodle. "
                'Return ONLY JSON: {"suggestions":[{"lesson_id":"...","reason":"...","priority":1}]} '
                "priority 1 = best first. Use only provided lesson ids."
            ),
            user=(
                f"Course: {course_title or 'this course'}\n"
                f"Lessons: {items}"
            ),
        )
        raw = data.get("suggestions") or []
        out = []
        ids = {i["id"] for i in items}
        for s in raw[:5]:
            if not isinstance(s, dict):
                continue
            lid = str(s.get("lesson_id") or "")
            if lid not in ids:
                continue
            title = next((i["title"] for i in items if i["id"] == lid), lid)
            out.append(
                {
                    "lesson_id": lid,
                    "title": title,
                    "reason": str(s.get("reason") or "").strip(),
                    "priority": int(s.get("priority") or 99),
                }
            )
        out.sort(key=lambda x: x["priority"])
        return {"suggestions": out}

    def _local():
        # Prefer first reading, then quiz step
        ranked = sorted(
            items,
            key=lambda i: (
                0 if i["lesson_type"] == "article" else 1 if i["lesson_type"] == "quiz" else 2,
                i["title"],
            ),
        )
        out = []
        for i, it in enumerate(ranked[:3], start=1):
            reason = (
                "Good first reading to embed in Moodle"
                if it["lesson_type"] == "article"
                else "Quiz checkpoint for the Moodle course"
                if it["lesson_type"] == "quiz"
                else "Media activity for the course"
            )
            out.append(
                {
                    "lesson_id": it["id"],
                    "title": it["title"],
                    "reason": reason,
                    "priority": i,
                }
            )
        return {"suggestions": out}

    return run_ai(openai_fn=_openai, local_fn=_local, feature="deeplink")


def suggest_teacher_next_steps(
    *,
    at_risk: list[dict[str, Any]],
    avg_percent: float | None,
    course_title: str = "",
) -> dict[str, Any]:
    """Natural-language next steps from class results (teacher-facing)."""
    compact = []
    for r in (at_risk or [])[:8]:
        compact.append(
            {
                "learner": str(r.get("learner_name") or "Learner"),
                "reasons": list(r.get("reasons") or [])[:3],
                "latest_percent": r.get("latest_percent"),
            }
        )

    def _openai():
        data = openai_chat_json(
            system=(
                "You coach teachers using class analytics. "
                'Return ONLY JSON: {"actions":[{"title":"...","detail":"...","urgency":"low|medium|high"}]} '
                "Be specific and actionable. No student PII beyond given names."
            ),
            user=(
                f"Course: {course_title or 'class'}\n"
                f"Avg score: {avg_percent}\n"
                f"At-risk: {compact}"
            ),
        )
        actions = []
        for a in (data.get("actions") or [])[:5]:
            if not isinstance(a, dict):
                continue
            title = str(a.get("title") or "").strip()
            if not title:
                continue
            actions.append(
                {
                    "title": title,
                    "detail": str(a.get("detail") or "").strip(),
                    "urgency": str(a.get("urgency") or "medium"),
                }
            )
        return {"actions": actions}

    def _local():
        actions = []
        if compact:
            actions.append(
                {
                    "title": "Check in with at-risk learners",
                    "detail": (
                        f"{len(compact)} learner(s) flagged — review reasons and "
                        "offer practice lane before graded retry."
                    ),
                    "urgency": "high",
                }
            )
        if avg_percent is not None and avg_percent < 60:
            actions.append(
                {
                    "title": "Re-teach the weakest lesson",
                    "detail": (
                        f"Class average is {int(avg_percent)}%. "
                        "Simplify the reading or deep-link a review activity in Moodle."
                    ),
                    "urgency": "medium",
                }
            )
        if not actions:
            actions.append(
                {
                    "title": "Keep the learning path moving",
                    "detail": "Scores look steady. Deep-link the next lesson into Moodle.",
                    "urgency": "low",
                }
            )
        return {"actions": actions}

    return run_ai(openai_fn=_openai, local_fn=_local, feature="next_steps")


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
    snippet = text[:6000]
    data = openai_chat_json(
        system=(
            "You write multiple-choice quiz items for teachers. "
            "Return ONLY valid JSON: "
            '{"questions":[{"prompt":"...","choices":["A","B","C","D"],"correct_index":0}]} '
            "correct_index is 0-based. Exactly 4 choices each. No markdown."
        ),
        user=(
            f"Create {count} MCQs from this lesson"
            + (f' titled "{title}"' if title else "")
            + f":\n\n{snippet}"
        ),
    )
    raw = data.get("questions") if isinstance(data, dict) else None
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
