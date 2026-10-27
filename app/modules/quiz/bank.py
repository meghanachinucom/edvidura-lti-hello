"""Teacher test-bank drafts: generate → review → promote into the live quiz."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from app import db

_BANK_SEED = (
    "LTI launch opens EdVidura from Moodle with a trusted handshake. "
    "Tenant isolation uses Postgres RLS so one school cannot read another. "
    "Assignment and Grade Services send official scores back to the Moodle gradebook. "
    "Practice attempts skip Moodle on purpose so students can rehearse. "
    "Names and Role Provisioning caches the class roster for awareness only. "
    "Group Services let a teacher assign a quiz to a Moodle group or a local group. "
    "Deep linking places a specific lesson, quiz, or manual into the LMS course. "
    "Ask Vidura answers from approved manuals and lessons with citations. "
    "A test bank is a reviewed set of questions a teacher promotes into the live quiz. "
    "Essay grading compares a student response with the instructor model answer and RAG excerpts. "
)


def source_text_for_bank(
    tenant_id: UUID | str,
    *,
    course_id: str | None = None,
    lesson_id: str | None = None,
) -> tuple[str, str]:
    """Lesson body for bulk generation, with a seed corpus if content is thin."""
    from app.modules import content as content_mod

    title = "Class materials"
    parts: list[str] = []
    if lesson_id:
        lesson = content_mod.get_lesson(
            tenant_id, lesson_id, allow_unpublished=True
        )
        if lesson:
            title = str(lesson.get("title") or title)
            parts.append(str(lesson.get("body_md") or ""))
    elif course_id:
        for row in content_mod.list_lessons(
            tenant_id, course_id, include_unpublished=True
        ) or []:
            if str(row.get("lesson_type") or "") == "quiz":
                continue
            lesson = content_mod.get_lesson(
                tenant_id, str(row.get("id") or ""), allow_unpublished=True
            )
            if not lesson:
                continue
            body = str(lesson.get("body_md") or "").strip()
            if body:
                parts.append(f"## {lesson.get('title') or 'Lesson'}\n{body}")
    text = "\n\n".join(p for p in parts if p.strip()).strip()
    if len(text) < 200:
        text = (text + "\n\n" + _BANK_SEED * 4).strip()
        title = title or "EdVidura classroom"
    return text, title


def save_bank_batch(
    tenant_id: UUID | str,
    *,
    title: str,
    questions: list[dict[str, Any]],
    source_kind: str = "lesson",
    source_label: str = "",
) -> dict[str, Any]:
    tid = str(tenant_id)
    items = [q for q in questions if isinstance(q, dict) and str(q.get("prompt") or "").strip()]
    if not items:
        raise ValueError("No questions to save")
    with db.tenant_connection(tid) as conn:
        batch = conn.execute(
            """
            INSERT INTO quiz_bank_batches (
                tenant_id, title, source_kind, source_label, status,
                requested_count, generated_count
            )
            VALUES (%s, %s, %s, %s, 'draft', %s, %s)
            RETURNING id, title, status, requested_count, generated_count, created_at
            """,
            (
                tid,
                (title or "Test bank")[:160],
                (source_kind or "lesson")[:40],
                (source_label or "")[:160],
                len(items),
                len(items),
            ),
        ).fetchone()
        bid = str(batch["id"])
        saved = 0
        for i, q in enumerate(items, start=1):
            choices = [str(c) for c in (q.get("choices") or [])]
            conn.execute(
                """
                INSERT INTO quiz_bank_items (
                    tenant_id, batch_id, position, prompt, choices, correct_index,
                    qtype, topic, difficulty, correct_text, status
                )
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, 'draft')
                """,
                (
                    tid,
                    bid,
                    i,
                    str(q.get("prompt") or "").strip(),
                    json.dumps(choices),
                    int(q.get("correct_index") or 0),
                    str(q.get("qtype") or "single")[:32],
                    str(q.get("topic") or "")[:120],
                    str(q.get("difficulty") or "core")[:32],
                    str(q.get("correct_text") or q.get("instructor_answer") or "")[:4000],
                ),
            )
            saved += 1
    pack = dict(batch)
    pack["id"] = bid
    pack["item_count"] = saved
    if hasattr(pack.get("created_at"), "isoformat"):
        pack["created_at"] = pack["created_at"].isoformat()
    return pack


def list_bank_items(
    tenant_id: UUID | str,
    *,
    batch_id: str | None = None,
    status: str | None = None,
    limit: int = 250,
) -> list[dict[str, Any]]:
    tid = str(tenant_id)
    cap = max(1, min(int(limit or 250), 400))
    with db.tenant_connection(tid) as conn:
        sql = """
            SELECT id, batch_id, position, prompt, choices, correct_index,
                   qtype, topic, difficulty, correct_text, status
            FROM quiz_bank_items
        """
        args: list[Any] = []
        clauses: list[str] = []
        if batch_id:
            clauses.append("batch_id = %s")
            args.append(batch_id)
        if status:
            clauses.append("status = %s")
            args.append(status)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY position ASC, created_at ASC LIMIT %s"
        args.append(cap)
        rows = conn.execute(sql, tuple(args)).fetchall()
    out = []
    for r in rows:
        item = dict(r)
        item["id"] = str(item["id"])
        item["batch_id"] = str(item["batch_id"])
        choices = item.get("choices") or []
        if isinstance(choices, str):
            choices = json.loads(choices)
        item["choices"] = list(choices)
        out.append(item)
    return out


def set_item_status(
    tenant_id: UUID | str,
    *,
    item_ids: list[str],
    status: str,
) -> int:
    want = (status or "draft").strip().lower()
    if want not in {"draft", "approved", "rejected"}:
        raise ValueError("status must be draft, approved, or rejected")
    ids = [str(i).strip() for i in item_ids if str(i).strip()]
    if not ids:
        return 0
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            UPDATE quiz_bank_items
            SET status = %s
            WHERE id = ANY(%s::uuid[])
            """,
            (want, ids),
        )
        return int(row.rowcount or 0)


def promote_approved(
    tenant_id: UUID | str,
    *,
    batch_id: str | None = None,
) -> dict[str, Any]:
    """Copy approved bank items into the live school quiz."""
    from app.modules.content import add_quiz_question

    items = list_bank_items(tenant_id, batch_id=batch_id, status="approved", limit=400)
    saved = 0
    skipped = 0
    for q in items:
        try:
            add_quiz_question(
                tenant_id=tenant_id,
                prompt=str(q.get("prompt") or ""),
                choices=[str(c) for c in (q.get("choices") or [])] or ["Correct", "Incorrect"],
                correct_index=int(q.get("correct_index") or 0),
                qtype=str(q.get("qtype") or "single"),
                correct_text=str(q.get("correct_text") or ""),
                topic=str(q.get("topic") or ""),
            )
            saved += 1
        except Exception:  # noqa: BLE001
            skipped += 1
    if batch_id and saved:
        tid = str(tenant_id)
        with db.tenant_connection(tid) as conn:
            conn.execute(
                "UPDATE quiz_bank_batches SET status = 'reviewed' WHERE id = %s",
                (batch_id,),
            )
    return {"saved": saved, "skipped": skipped, "approved": len(items)}
