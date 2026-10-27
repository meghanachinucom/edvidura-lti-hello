"""Assessment export — Markdown + a small printable PDF (no chart libraries)."""
from __future__ import annotations

import re
from typing import Any


def _as_questions(rows: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, raw in enumerate(rows or [], start=1):
        if not isinstance(raw, dict):
            continue
        prompt = str(raw.get("prompt") or raw.get("question") or "").strip()
        if not prompt:
            continue
        choices = raw.get("choices") or []
        if isinstance(choices, str):
            choices = [choices]
        clean_choices = [str(c).strip() for c in choices if str(c).strip()]
        qtype = str(raw.get("qtype") or raw.get("type") or "single")
        out.append(
            {
                "n": i,
                "id": str(raw.get("id") or raw.get("question_key") or f"q{i}"),
                "prompt": prompt,
                "choices": clean_choices,
                "qtype": qtype,
                "topic": str(raw.get("topic") or ""),
                "correct_index": int(raw.get("correct_index") or 0),
                "correct_text": str(raw.get("correct_text") or ""),
            }
        )
    return out


def assessment_markdown(
    questions: list[dict[str, Any]],
    *,
    title: str = "Assessment",
    course: str = "",
    include_answers: bool = False,
) -> str:
    """F-5: quiz / bank as Markdown."""
    items = _as_questions(questions)
    lines = [
        f"# {title.strip() or 'Assessment'}",
        "",
    ]
    if course:
        lines.append(f"**Course:** {course}")
        lines.append("")
    lines.append(f"**Items:** {len(items)}")
    lines.append("")
    letters = "ABCDEFGH"
    for q in items:
        topic = f" ({q['topic']})" if q["topic"] else ""
        lines.append(f"## {q['n']}. {q['prompt']}{topic}")
        lines.append("")
        if q["choices"]:
            for i, choice in enumerate(q["choices"]):
                mark = " **" if include_answers and i == q["correct_index"] else ""
                tail = " ← correct**" if mark else ""
                letter = letters[i] if i < len(letters) else str(i + 1)
                lines.append(f"- {letter}. {choice}{mark}{tail}")
            lines.append("")
        elif include_answers and q["correct_text"]:
            lines.append(f"_Instructor answer:_ {q['correct_text']}")
            lines.append("")
        elif q["qtype"] in {"essay", "short", "numeric", "open"}:
            lines.append("_Write your answer below._")
            lines.append("")
    if include_answers:
        lines.append("---")
        lines.append("")
        lines.append("## Answer key")
        lines.append("")
        for q in items:
            if q["choices"] and 0 <= q["correct_index"] < len(q["choices"]):
                key = letters[q["correct_index"]] if q["correct_index"] < len(letters) else str(
                    q["correct_index"] + 1
                )
                lines.append(f"{q['n']}. {key}")
            elif q["correct_text"]:
                lines.append(f"{q['n']}. {q['correct_text']}")
            else:
                lines.append(f"{q['n']}. (open / teacher graded)")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _pdf_escape(text: str) -> str:
    cleaned = (
        (text or "")
        .encode("latin-1", "replace")
        .decode("latin-1")
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )
    return cleaned


def _wrap(text: str, width: int = 92) -> list[str]:
    words = re.sub(r"\s+", " ", text or "").strip().split(" ")
    lines: list[str] = []
    buf = ""
    for word in words:
        trial = f"{buf} {word}".strip()
        if len(trial) <= width:
            buf = trial
            continue
        if buf:
            lines.append(buf)
        buf = word
    if buf:
        lines.append(buf)
    return lines or [""]


def assessment_pdf(
    questions: list[dict[str, Any]],
    *,
    title: str = "Assessment",
    course: str = "",
    include_answers: bool = False,
) -> bytes:
    """F-5: printable exam PDF (Helvetica, no extra dependency)."""
    md_lines: list[str] = [title.strip() or "Assessment"]
    if course:
        md_lines.append(f"Course: {course}")
    items = _as_questions(questions)
    md_lines.append(f"Items: {len(items)}")
    md_lines.append("")
    letters = "ABCDEFGH"
    for q in items:
        md_lines.extend(_wrap(f"{q['n']}. {q['prompt']}"))
        for i, choice in enumerate(q["choices"]):
            letter = letters[i] if i < len(letters) else str(i + 1)
            suffix = " *" if include_answers and i == q["correct_index"] else ""
            md_lines.extend(_wrap(f"    {letter}. {choice}{suffix}", width=88))
        if not q["choices"]:
            md_lines.append("    ________________________________")
            md_lines.append("    ________________________________")
        md_lines.append("")
    if include_answers:
        md_lines.append("Answer key")
        for q in items:
            if q["choices"] and 0 <= q["correct_index"] < len(q["choices"]):
                key = letters[q["correct_index"]] if q["correct_index"] < len(letters) else "?"
                md_lines.append(f"{q['n']}. {key}")
            elif q["correct_text"]:
                md_lines.extend(_wrap(f"{q['n']}. {q['correct_text']}", width=88))
            else:
                md_lines.append(f"{q['n']}. (open)")

    per_page = 48
    pages = [md_lines[i : i + per_page] for i in range(0, len(md_lines), per_page)] or [[title]]
    content_ids = list(range(4, 4 + len(pages)))
    page_ids = list(range(4 + len(pages), 4 + 2 * len(pages)))

    objs: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objs[2] = f"<< /Type /Pages /Count {len(pages)} /Kids [{kids}] >>".encode("ascii")

    for i, lines in enumerate(pages):
        stream_parts = ["BT", "/F1 11 Tf", "14 TL", "48 780 Td"]
        for line in lines:
            stream_parts.append(f"({_pdf_escape(line)}) Tj")
            stream_parts.append("T*")
        stream_parts.append("ET")
        stream = "\n".join(stream_parts).encode("latin-1", "replace")
        objs[content_ids[i]] = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("ascii")
            + stream
            + b"\nendstream"
        )
        objs[page_ids[i]] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_ids[i]} 0 R /Resources << /Font << /F1 3 0 R >> >> >>"
        ).encode("ascii")

    order = [1, 2, 3, *content_ids, *page_ids]
    chunks = [b"%PDF-1.4\n"]
    offsets = [0]
    pos = len(chunks[0])
    for oid in order:
        body = objs[oid]
        rec = f"{oid} 0 obj\n".encode("ascii") + body + b"\nendobj\n"
        offsets.append(pos)
        chunks.append(rec)
        pos += len(rec)
    xref_pos = pos
    xref = [f"xref\n0 {len(order) + 1}\n", "0000000000 65535 f \n"]
    for off in offsets[1:]:
        xref.append(f"{off:010d} 00000 n \n")
    trailer = (
        f"trailer\n<< /Size {len(order) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    )
    chunks.append("".join(xref).encode("ascii"))
    chunks.append(trailer.encode("ascii"))
    return b"".join(chunks)
