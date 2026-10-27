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

DIFFICULTY_LEVELS = ("foundational", "core", "challenge")

_DIFFICULTY_HINTS = {
    "foundational": (
        "Easy recall and basic understanding. Short stems, clear wording, "
        "one idea per question."
    ),
    "core": (
        "Standard chapter checks: apply ideas, compare terms, simple multi-step "
        "thinking. Match typical classroom quiz depth."
    ),
    "challenge": (
        "Deeper application and analysis within the provided material. "
        "Fair secondary-school items — no tricks outside the text."
    ),
}


def difficulty_label(value: str | None) -> str:
    """Plain-language label for teachers and students."""
    raw = (value or "").strip().lower()
    if raw == "auto":
        return "Auto"
    level = normalize_difficulty(raw or "core")
    return {
        "foundational": "Easy",
        "core": "Medium",
        "challenge": "Hard",
    }.get(level, "Medium")


def normalize_difficulty(value: str | None) -> str:
    raw = (value or "core").strip().lower()
    if raw in {"easy", "basic", "beginner"}:
        return "foundational"
    if raw in {"hard", "advanced", "expert"}:
        return "challenge"
    if raw in {"medium", "normal", "standard"}:
        return "core"
    if raw in DIFFICULTY_LEVELS:
        return raw
    return "core"


def segment_text_for_coverage(
    text: str,
    *,
    title: str = "",
    max_segments: int = 20,
) -> list[dict[str, str]]:
    """Split lesson/text into ordered topic segments for end-to-end coverage.

    Prefers markdown ``##`` / ``#`` headings; otherwise equal-sized chunks so
    later pages/sections are not skipped.
    """
    body = (text or "").strip()
    if not body:
        return []
    # Heading-based chapters
    parts = re.split(r"(?m)^#{1,3}\s+", body)
    if len(parts) > 1:
        segments: list[dict[str, str]] = []
        # First chunk may be preface before first heading
        preface = (parts[0] or "").strip()
        heading_chunks = parts[1:]
        idx = 0
        if preface and len(preface) >= 40:
            idx += 1
            segments.append(
                {
                    "label": f"{title or 'Intro'} · part {idx}".strip(" ·"),
                    "text": preface[:2500],
                }
            )
        for chunk in heading_chunks:
            chunk = (chunk or "").strip()
            if len(chunk) < 40:
                continue
            lines = chunk.split("\n", 1)
            head = lines[0].strip()[:80] or f"Section {idx + 1}"
            rest = lines[1] if len(lines) > 1 else chunk
            idx += 1
            segments.append(
                {
                    "label": head,
                    "text": (rest or chunk)[:2500],
                }
            )
            if len(segments) >= max_segments:
                break
        if segments:
            return segments

    # Equal chunks — covers start→end of long material
    clean = re.sub(r"\s+", " ", body).strip()
    if len(clean) < 80:
        return [{"label": title or "Topic 1", "text": clean}]
    target = max(3, min(max_segments, max(3, len(clean) // 900)))
    chunk_size = max(400, len(clean) // target)
    segments = []
    for i in range(0, len(clean), chunk_size):
        piece = clean[i : i + chunk_size].strip()
        if len(piece) < 40:
            continue
        segments.append(
            {
                "label": f"{title or 'Part'} {len(segments) + 1}",
                "text": piece[:2500],
            }
        )
        if len(segments) >= max_segments:
            break
    return segments or [{"label": title or "Topic 1", "text": clean[:2500]}]


def coverage_question_count(requested: int, segment_count: int, *, cap: int = 40) -> int:
    """At least one question per page/section; extras allowed up to ``cap``.

    Never drop below ``segment_count`` — later pages must not be skipped to
    keep the quiz short.
    """
    req = max(1, int(requested or 1))
    segs = max(1, int(segment_count or 1))
    extras_cap = max(segs, int(cap or segs))
    return max(segs, min(req, extras_cap))


def questions_for_page_count(page_count: int) -> int:
    """SME R-8: at least 5 questions per 10 pages (round up)."""
    pages = max(1, int(page_count or 1))
    blocks = (pages + 9) // 10
    return 5 * blocks


def _extract_docx_text(data: bytes, *, filename: str = "upload.docx") -> tuple[str, list[dict[str, str]]]:
    """Plain-text extract from a .docx (OOXML) without extra packages."""
    import zipfile
    from io import BytesIO
    from xml.etree import ElementTree as ET

    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    try:
        with zipfile.ZipFile(BytesIO(data)) as zf:
            xml = zf.read("word/document.xml")
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"Could not read Word document: {exc}") from exc
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise ValueError(f"Could not parse Word document: {exc}") from exc
    paras: list[str] = []
    for para in root.iter(f"{ns}p"):
        texts = [t.text or "" for t in para.iter(f"{ns}t")]
        line = "".join(texts).strip()
        if line:
            paras.append(line)
    text = "\n".join(paras).strip()
    chunks: list[str] = []
    buf: list[str] = []
    chars = 0
    for line in paras:
        buf.append(line)
        chars += len(line)
        if chars >= 800:
            chunks.append("\n".join(buf))
            buf = []
            chars = 0
    if buf:
        chunks.append("\n".join(buf))
    segments = [
        {"label": f"Section {i}", "text": chunk[:2500]}
        for i, chunk in enumerate(chunks or [text], start=1)
        if chunk.strip()
    ]
    if not segments and text:
        segments = [{"label": filename or "Document", "text": text[:2500]}]
    return text, segments


def generate_mcqs_from_text(
    body: str,
    *,
    count: int = 3,
    title: str = "",
    difficulty: str = "core",
    complexity: str = "apply",
    segments: list[dict[str, str]] | None = None,
    cap: int | None = None,
) -> dict[str, Any]:
    text = (body or "").strip()
    if len(text) < 40 and not segments:
        raise ValueError("Lesson text is too short to generate questions")
    level = normalize_difficulty(difficulty)
    from app.modules.quiz.personalized import (
        complexity_label,
        normalize_complexity,
    )

    depth = normalize_complexity(complexity)
    segs = segments or segment_text_for_coverage(text, title=title)
    if not segs:
        raise ValueError("Lesson text is too short to generate questions")
    limit = 200 if (cap and int(cap) >= 100) or int(count or 0) >= 100 else int(cap or 40)
    n = coverage_question_count(count, len(segs), cap=limit)

    def _local():
        return {
            "questions": _local_mcqs_covered(
                segs, count=n, title=title, difficulty=level, complexity=depth
            )
        }

    if n >= 100:
        # Bulk banks stay on the local generator so 100+ items are reliable.
        result = {
            **_local(),
            "provider": "local",
            "model": "heuristic",
            "note": "Bulk bank (100+). Review each item before promoting to the live quiz.",
        }
    else:

        def _openai():
            questions = _openai_mcqs_covered(
                segs, count=n, title=title, difficulty=level, complexity=depth
            )
            return {"questions": questions}

        result = run_ai(
            openai_fn=_openai,
            local_fn=_local,
            feature="mcq",
            route_state={
                "segment_count": len(segs),
                "difficulty": level,
                "complexity": depth,
                "title": (title or "")[:120],
                "goal": (
                    "Draft full-coverage MCQs from lesson segments. Prefer local for "
                    "Easy/Recall and few segments; prefer remote for Analyze/Hard."
                ),
            },
        )
    result["difficulty"] = level
    result["complexity"] = depth
    result["complexity_label"] = complexity_label(depth)
    result["segments"] = [s["label"] for s in segs]
    result["covers_all_topics"] = True
    result["covers_all_pages"] = True
    result["segment_count"] = len(segs)
    return result


def extract_text_from_bytes(
    data: bytes,
    *,
    filename: str = "",
    max_chars: int = 50_000,
) -> dict[str, Any]:
    """Extract plain text from PDF / .txt / .md for MCQ drafting.

    PDFs keep **per-page** text so quizzes can cover pages 1…N end-to-end
    (not only early pages). ``max_chars`` caps returned text (manuals may
    pass a higher limit for long Sanskrit PDFs).
    """
    raw = data or b""
    if not raw:
        raise ValueError("Empty upload")
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError("File too large (max 8 MB)")
    cap = max(1_000, int(max_chars or 50_000))
    name = (filename or "upload").lower().strip()
    if name.endswith((".txt", ".md", ".markdown")):
        text = raw.decode("utf-8", errors="replace").strip()
        if len(text) < 40:
            raise ValueError("Text file is too short to generate questions")
        segments = segment_text_for_coverage(text, title=filename or "Document")
        return {
            "text": text[:cap],
            "source_kind": "text",
            "page_count": None,
            "filename": filename or "upload.txt",
            "segments": segments,
        }
    if name.endswith((".docx", ".doc")):
        text, segments = _extract_docx_text(raw, filename=filename or "upload.docx")
        if len(text) < 40:
            raise ValueError("Word document is too short to generate questions")
        return {
            "text": text[:cap],
            "source_kind": "docx",
            "page_count": max(1, len(segments)),
            "filename": filename or "upload.docx",
            "segments": segments,
        }
    if not name.endswith(".pdf"):
        raise ValueError("Upload a PDF, Word (.docx), or .txt / .md file")
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
    segments: list[dict[str, str]] = []
    for i, page in enumerate(reader.pages[:40], start=1):
        try:
            page_text = (page.extract_text() or "").strip()
        except Exception:  # noqa: BLE001
            page_text = ""
        if page_text:
            pages.append(page_text)
            segments.append(
                {
                    "label": f"Page {i}",
                    "text": page_text[:2500],
                }
            )
    text = "\n\n".join(pages).strip()
    if len(text) < 40:
        raise ValueError(
            "Could not extract enough text from this PDF "
            "(scanned images need OCR — paste text or use a text PDF)"
        )
    if not segments:
        segments = segment_text_for_coverage(text, title=filename or "PDF")
    return {
        "text": text[:cap],
        "source_kind": "pdf",
        "page_count": len(reader.pages),
        "filename": filename or "upload.pdf",
        "segments": segments,
    }


def generate_mcqs_from_document(
    data: bytes,
    *,
    filename: str = "",
    count: int = 3,
    title: str = "",
    difficulty: str = "core",
    complexity: str = "apply",
) -> dict[str, Any]:
    """PDF/text/DOCX upload → extract → MCQ draft covering all pages/sections."""
    extracted = extract_text_from_bytes(data, filename=filename)
    label = (title or "").strip() or (filename or "Uploaded document")
    pages = extracted.get("page_count")
    wanted = max(int(count or 1), questions_for_page_count(int(pages or 1)) if pages else int(count or 1))
    result = generate_mcqs_from_text(
        extracted["text"],
        count=wanted,
        title=label,
        difficulty=difficulty,
        complexity=complexity,
        segments=extracted.get("segments"),
    )
    result["source_kind"] = extracted["source_kind"]
    result["source_filename"] = extracted["filename"]
    result["page_count"] = extracted.get("page_count")
    result["extracted_chars"] = len(extracted["text"])
    return result


def generate_test_bank(
    body: str,
    *,
    count: int = 120,
    title: str = "",
    difficulty: str = "core",
    complexity: str = "apply",
    segments: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """F-4: 100+ item draft bank. Teacher review is required before save."""
    wanted = max(100, min(int(count or 120), 200))
    result = generate_mcqs_from_text(
        body,
        count=wanted,
        title=title,
        difficulty=difficulty,
        complexity=complexity,
        segments=segments,
        cap=200,
    )
    questions = list(result.get("questions") or [])
    if len(questions) < 100:
        segs = segments or segment_text_for_coverage(body, title=title)
        extra = _local_mcqs_covered(
            segs or [{"label": title or "Topic", "text": body}],
            count=wanted,
            title=title,
            difficulty=normalize_difficulty(difficulty),
            complexity=complexity,
        )
        seen = {str(q.get("prompt") or "") for q in questions}
        for q in extra:
            if str(q.get("prompt") or "") in seen:
                continue
            questions.append(q)
            seen.add(str(q.get("prompt") or ""))
            if len(questions) >= wanted:
                break
    for q in questions:
        q["review_status"] = "draft"
    result["questions"] = questions[:wanted]
    result["bank_size"] = len(result["questions"])
    result["review_required"] = True
    result["min_size"] = 100
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

def _tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-zA-Z]{3,}", (text or "").lower())}


def grade_essay_against_instructor(
    student_answer: str,
    *,
    prompt: str,
    instructor_answer: str = "",
    rubric: str = "",
    rag_chunks: list[dict[str, Any]] | None = None,
    max_score: int = 5,
) -> dict[str, Any]:
    """F-12: compare a student essay to the instructor model answer + RAG chunks."""
    prompt_s = (prompt or "").strip()
    answer = (student_answer or "").strip()
    if not prompt_s or not answer:
        raise ValueError("Prompt and student answer are required")
    max_s = max(1, min(int(max_score), 20))
    model = (instructor_answer or "").strip()
    rubric_s = (
        rubric or "Award points for accuracy against the instructor answer and source text."
    ).strip()
    chunks = [c for c in (rag_chunks or []) if isinstance(c, dict)][:12]
    rag_text = " ".join(
        str(c.get("body") or c.get("text") or c.get("excerpt") or "") for c in chunks
    )
    st, mt, rt = _tokens(answer), _tokens(model), _tokens(rag_text)
    coverage = (len(st & mt) / max(len(mt), 1)) if mt else 0.0
    rag_hit = (len(st & rt) / max(min(len(rt), 40), 1)) if rt else 0.0
    length_ok = min(1.0, len(answer.split()) / 40.0)
    if mt and rt:
        raw = 0.5 * coverage + 0.3 * rag_hit + 0.2 * length_ok
        compared = "instructor_answer+rag"
    elif mt:
        raw = 0.75 * coverage + 0.25 * length_ok
        compared = "instructor_answer"
    elif rt:
        raw = 0.65 * rag_hit + 0.35 * length_ok
        compared = "rag"
    else:
        raw = 0.7 * length_ok
        compared = "length"
    percent = int(round(100 * max(0.0, min(1.0, raw))))
    score = int(round(percent / 100 * max_s))
    citations = []
    for c in chunks:
        title = str(c.get("title") or c.get("label") or "").strip()
        body = str(c.get("body") or c.get("text") or "")
        if title and (_tokens(body) & st):
            citations.append({"title": title, "ref": title})
    core = {
        "score": score,
        "max_score": max_s,
        "percent": percent,
        "feedback": (
            f"Compared with the instructor answer ({compared}). "
            f"Key-point coverage {int(round(coverage * 100))}% · "
            f"source overlap {int(round(rag_hit * 100))}%."
        ),
        "strengths": (
            ["Touches instructor key points"] if coverage >= 0.3 else ["Attempt submitted"]
        ),
        "improvements": (
            []
            if coverage >= 0.6
            else ["Bring the answer closer to the instructor model and cited sources"]
        ),
        "confidence": "high" if mt and coverage >= 0.5 else "medium" if mt or rt else "low",
        "compared_to": compared,
        "instructor_overlap": round(coverage, 3),
        "rag_overlap": round(rag_hit, 3),
        "citations": citations[:6],
    }

    def _openai():
        data = openai_chat_json(
            system=(
                "You grade student essays against an instructor model answer and "
                "retrieved source excerpts. Return ONLY JSON: "
                '{"score":0,"feedback":"...","strengths":["..."],'
                '"improvements":["..."],"confidence":"low|medium|high"}. '
                "Do not invent sources. You do NOT send grades to any LMS."
            ),
            user=(
                f"Max score: {max_s}\nRubric: {rubric_s}\nQuestion: {prompt_s}\n"
                f"Instructor answer: {model[:2500]}\n"
                f"Sources: {[c.get('title') for c in chunks]}\n"
                f"{rag_text[:2500]}\nStudent answer: {answer[:4000]}"
            ),
            temperature=0.2,
        )
        if isinstance(data, dict) and data.get("score") is not None:
            try:
                core["score"] = max(0, min(max_s, int(data.get("score") or score)))
            except (TypeError, ValueError):
                pass
            if data.get("feedback"):
                core["feedback"] = str(data.get("feedback"))
            if data.get("strengths"):
                core["strengths"] = [str(x) for x in data["strengths"]][:5]
            if data.get("improvements"):
                core["improvements"] = [str(x) for x in data["improvements"]][:5]
            if data.get("confidence"):
                core["confidence"] = str(data.get("confidence"))
            core["percent"] = int(round(100 * core["score"] / max_s))
        return core

    def _local():
        return core

    packed = run_ai(openai_fn=_openai, local_fn=_local, feature="essay_grade")
    packed.setdefault("score", score)
    packed.setdefault("max_score", max_s)
    packed["percent"] = int(packed.get("percent") or percent)
    packed["compared_to"] = compared
    packed["instructor_overlap"] = core["instructor_overlap"]
    packed["rag_overlap"] = core["rag_overlap"]
    packed["citations"] = citations[:6]
    packed["moodle_passback"] = False
    packed["disclaimer"] = (
        "Suggestion only — never sent to Moodle automatically. "
        "Teacher enters the official grade in the LMS."
    )
    packed["copy_text"] = (
        f"Score: {packed['score']}/{max_s} ({packed['percent']}%)\n"
        f"Compared to: {compared}\n"
        f"Confidence: {packed.get('confidence')}\n"
        f"Feedback: {packed.get('feedback')}\n\n"
        "— EdVidura AI suggestion only. Not sent to Moodle."
    )
    return packed


def grade_open_response(
    *,
    prompt: str,
    rubric: str,
    student_answer: str,
    max_score: int = 5,
    instructor_answer: str = "",
    rag_chunks: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Suggest a score for an open response — never sends to Moodle/AGS."""
    if (instructor_answer or "").strip() or rag_chunks:
        return grade_essay_against_instructor(
            student_answer,
            prompt=prompt,
            instructor_answer=instructor_answer,
            rubric=rubric,
            rag_chunks=rag_chunks,
            max_score=max_score,
        )
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
    segs = segment_text_for_coverage(text, title=title)
    return _local_mcqs_covered(segs, count=count, title=title, difficulty="core")


def _local_mcqs_covered(
    segments: list[dict[str, str]],
    *,
    count: int,
    title: str,
    difficulty: str,
    complexity: str = "apply",
) -> list[dict[str, Any]]:
    """Round-robin across segments so later pages/topics are always included."""
    from app.modules.quiz.personalized import normalize_complexity

    level = normalize_difficulty(difficulty)
    depth = normalize_complexity(complexity)
    pools: list[list[tuple[str, str]]] = []
    for seg in segments:
        label = seg.get("label") or title or "Topic"
        sents = _sentences(seg.get("text") or "")
        if not sents:
            chunk = re.sub(r"\s+", " ", seg.get("text") or "").strip()[:160]
            if chunk:
                sents = [chunk]
        if sents:
            pools.append([(label, s) for s in sents[:4]])
    if not pools:
        topic = (title or "this lesson").strip() or "this lesson"
        return [
            {
                "prompt": f"According to {topic}, which statement is correct?",
                "choices": [
                    f"{topic} is part of this unit.",
                    GENERIC_DISTRACTORS[0],
                    GENERIC_DISTRACTORS[1],
                    GENERIC_DISTRACTORS[2],
                ],
                "correct_index": 0,
                "source_excerpt": topic,
                "topic": topic,
                "difficulty": level,
                "complexity": depth,
            }
        ]

    facts: list[tuple[str, str]] = []
    max_len = max(len(p) for p in pools)
    for i in range(max_len):
        for pool in pools:
            if i < len(pool):
                facts.append(pool[i])

    n = max(1, min(int(count or 1), 200))
    first_pass = [pool[0] for pool in pools]
    ordered = first_pass + [f for f in facts if f not in first_pass]
    if not ordered:
        ordered = [(title or "Topic", "This lesson is part of the unit.")]
    stems = (
        "According to “{label}”, which statement is correct?",
        "From “{label}”: which fact is stated in the lesson?",
        "Based on “{label}”, which choice is true?",
        "Using “{label}”, which statement best matches the material?",
        "From “{label}”: which option restates a point in the lesson?",
    )
    questions: list[dict[str, Any]] = []
    while len(questions) < n:
        i = len(questions)
        label, fact = ordered[i % len(ordered)]
        cycle = i // len(ordered)
        others = [f for j, (_l, f) in enumerate(ordered) if j != (i % len(ordered))][:3]
        while len(others) < 3:
            others.append(GENERIC_DISTRACTORS[len(others) % 3])
        kind = i % 10
        if kind == 7:
            questions.append(
                {
                    "prompt": f"True or false — the lesson on “{label}” includes: “{fact[:90]}”",
                    "choices": ["True", "False"],
                    "correct_index": 0,
                    "qtype": "true_false",
                    "source_excerpt": fact[:120],
                    "topic": label,
                    "difficulty": level,
                    "complexity": depth,
                    "review_status": "draft",
                }
            )
            continue
        if kind == 8:
            questions.append(
                {
                    "prompt": f"In one or two sentences, explain this point from “{label}”: {fact[:110]}",
                    "choices": [],
                    "correct_index": 0,
                    "qtype": "essay",
                    "correct_text": fact[:400],
                    "instructor_answer": fact[:400],
                    "source_excerpt": fact[:120],
                    "topic": label,
                    "difficulty": level,
                    "complexity": depth,
                    "review_status": "draft",
                }
            )
            continue
        correct_index = i % 4
        ordered_choices = [""] * 4
        ordered_choices[correct_index] = fact[:160]
        di = 0
        for idx in range(4):
            if idx == correct_index:
                continue
            ordered_choices[idx] = others[di][:160]
            di += 1
        if depth == "analyze" or level == "challenge":
            stem = stems[3]
        elif depth == "recall" or level == "foundational":
            stem = stems[1]
        else:
            stem = stems[cycle % len(stems)]
        prompt = stem.format(label=label)
        if cycle:
            prompt = f"{prompt} (item {cycle + 1})"
        questions.append(
            {
                "prompt": prompt[:240],
                "choices": ordered_choices,
                "correct_index": correct_index,
                "qtype": "single",
                "source_excerpt": fact[:120],
                "topic": label,
                "difficulty": level,
                "complexity": depth,
                "review_status": "draft",
            }
        )
    return questions[:n]


def _openai_mcqs(text: str, *, count: int, title: str) -> list[dict[str, Any]]:
    segs = segment_text_for_coverage(text, title=title)
    return _openai_mcqs_covered(
        segs, count=count, title=title, difficulty="core"
    )


def _openai_mcqs_covered(
    segments: list[dict[str, str]],
    *,
    count: int,
    title: str,
    difficulty: str,
    complexity: str = "apply",
) -> list[dict[str, Any]]:
    from app.modules.quiz.personalized import (
        _COMPLEXITY_HINTS,
        normalize_complexity,
    )

    level = normalize_difficulty(difficulty)
    depth = normalize_complexity(complexity)
    hint = _DIFFICULTY_HINTS.get(level, _DIFFICULTY_HINTS["core"])
    depth_hint = _COMPLEXITY_HINTS.get(depth, _COMPLEXITY_HINTS["apply"])
    corpus = [
        {"topic": s["label"], "text": (s.get("text") or "")[:1200]}
        for s in segments[:40]
    ]
    labels = [s["label"] for s in segments]
    data = openai_chat_json(
        system=(
            "You write multiple-choice quiz items for teachers. "
            f"Difficulty: {level}. Guidance: {hint} "
            f"{depth_hint} "
            "CRITICAL COVERAGE RULE: questions must cover the material "
            "end-to-end. Include at least one question for EVERY topic/page "
            "listed. Never put all questions on early pages only — later "
            "pages/topics must appear. Use ONLY the provided texts. "
            "Return ONLY valid JSON: "
            '{"questions":[{"prompt":"...","choices":["A","B","C","D"],'
            '"correct_index":0,"topic":"..."}]} '
            "correct_index is 0-based. Exactly 4 choices each. No markdown."
        ),
        user=(
            f"Source: {title or 'document'}\n"
            f"Difficulty: {level}\n"
            f"Complexity: {depth}\n"
            f"Create exactly {count} MCQs covering ALL of these topics/pages "
            f"in order: {labels}\n"
            f"Corpus:\n{corpus}"
        ),
        temperature=0.35,
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
        topic = str(item.get("topic") or "").strip()
        out.append(
            {
                "prompt": prompt,
                "choices": choices,
                "correct_index": ci,
                "source_excerpt": topic,
                "topic": topic,
                "difficulty": level,
                "complexity": depth,
            }
        )
    if not out:
        raise ValueError("OpenAI returned no usable questions")
    return out
