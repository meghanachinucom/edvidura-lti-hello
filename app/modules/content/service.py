"""Tenant-isolated course content.

All curriculum reads/writes go through tenant_connection so RLS applies.
Routes must never load lesson bodies without a resolved tenant_id from the
LTI session — there is no shared global course catalog.
"""
from __future__ import annotations

import html
import re
from typing import Any
from uuid import UUID

from app import db

# Seed IDs from db/migration_course_content.sql (Tenant A demo curriculum)
TENANT_A_COURSE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
TENANT_B_COURSE_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"


def body_md_to_html(body_md: str) -> str:
    """Minimal safe formatting — escape HTML, paragraphs, simple [label](url) links."""
    text = (body_md or "").strip()
    if not text:
        return ""
    link_re = re.compile(
        r"\[([^\]]+)\]\(((?:/static/|https?://)[^)\s]+)\)"
    )
    holders: list[tuple[str, str]] = []

    def _hold(m: re.Match[str]) -> str:
        holders.append((m.group(1), m.group(2)))
        return f"\x00L{len(holders) - 1}\x00"

    text = link_re.sub(_hold, text)
    parts = re.split(r"\n\s*\n", text)
    blocks: list[str] = []
    for part in parts:
        lines = [html.escape(line.strip()) for line in part.splitlines() if line.strip()]
        if not lines:
            continue
        blocks.append("<p>" + "<br/>".join(lines) + "</p>")
    out = "\n".join(blocks)
    for i, (label, href) in enumerate(holders):
        safe_href = html.escape(href, quote=True)
        safe_label = html.escape(label)
        out = out.replace(
            html.escape(f"\x00L{i}\x00"),
            f'<a href="{safe_href}" target="_blank" rel="noopener">{safe_label}</a>',
        )
    return out


def list_published_courses(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, slug, title, description, status, created_at
            FROM courses
            WHERE status = 'published'
            ORDER BY created_at ASC
            """
        ).fetchall()
        return [dict(r) for r in rows]


def get_primary_course(tenant_id: UUID | str) -> dict[str, Any] | None:
    """First published course for this tenant (demo: one course per org)."""
    courses = list_published_courses(tenant_id)
    return courses[0] if courses else None


def get_course(tenant_id: UUID | str, course_id: UUID | str) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, slug, title, description, status, created_at
            FROM courses
            WHERE id = %s AND status = 'published'
            """,
            (str(course_id),),
        ).fetchone()
        return dict(row) if row else None


def list_lessons(tenant_id: UUID | str, course_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, tenant_id, course_id, slug, title, position,
                   lesson_type, body_md, video_url, created_at
            FROM lessons
            WHERE course_id = %s
            ORDER BY position ASC
            """,
            (str(course_id),),
        ).fetchall()
        return [dict(r) for r in rows]


def get_lesson(
    tenant_id: UUID | str, lesson_id: UUID | str
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, course_id, slug, title, position,
                   lesson_type, body_md, video_url, created_at
            FROM lessons
            WHERE id = %s
            """,
            (str(lesson_id),),
        ).fetchone()
        return dict(row) if row else None


def completed_lesson_ids(
    tenant_id: UUID | str, *, course_id: UUID | str, subject: str
) -> set[str]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT lesson_id
            FROM lesson_progress
            WHERE course_id = %s AND subject = %s
            """,
            (str(course_id), subject),
        ).fetchall()
        return {str(r["lesson_id"]) for r in rows}


def mark_lesson_complete(
    *,
    tenant_id: UUID | str,
    course_id: UUID | str,
    lesson_id: UUID | str,
    subject: str,
) -> None:
    subject_clean = (subject or "").strip()
    if not subject_clean:
        raise ValueError("Cannot record progress without an LTI subject")
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            INSERT INTO lesson_progress (tenant_id, course_id, lesson_id, subject)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (lesson_id, subject) DO UPDATE SET
                completed_at = now()
            """,
            (str(tenant_id), str(course_id), str(lesson_id), subject_clean),
        )


def lesson_completion_roster(
    tenant_id: UUID | str, *, course_id: UUID | str
) -> list[dict[str, Any]]:
    """Per-learner completion counts for a course (learnable lessons only)."""
    lessons = list_lessons(tenant_id, course_id)
    learnable_ids = {
        str(L["id"]) for L in lessons if L["lesson_type"] != "quiz"
    }
    total = len(learnable_ids)
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT subject, lesson_id, completed_at
            FROM lesson_progress
            WHERE course_id = %s
            ORDER BY completed_at DESC
            """,
            (str(course_id),),
        ).fetchall()
    by_subject: dict[str, set[str]] = {}
    for r in rows:
        lid = str(r["lesson_id"])
        if lid not in learnable_ids:
            continue
        sub = str(r["subject"] or "")
        by_subject.setdefault(sub, set()).add(lid)
    roster: list[dict[str, Any]] = []
    for subject, done in sorted(by_subject.items(), key=lambda x: (-len(x[1]), x[0])):
        n = len(done)
        roster.append(
            {
                "subject": subject,
                "completed_count": n,
                "total_count": total,
                "percent": int(round(100 * n / total)) if total else 0,
            }
        )
    return roster


def update_lesson(
    *,
    tenant_id: UUID | str,
    lesson_id: UUID | str,
    title: str,
    body_md: str = "",
    video_url: str = "",
    lesson_type: str | None = None,
) -> dict[str, Any] | None:
    tid = str(tenant_id)
    title_clean = (title or "").strip()
    if not title_clean:
        raise ValueError("Lesson title required")
    with db.tenant_connection(tid) as conn:
        existing = conn.execute(
            "SELECT id, lesson_type FROM lessons WHERE id = %s",
            (str(lesson_id),),
        ).fetchone()
        if not existing:
            return None
        ltype = lesson_type if lesson_type in {"article", "video", "quiz"} else existing["lesson_type"]
        row = conn.execute(
            """
            UPDATE lessons
            SET title = %s, body_md = %s, video_url = %s, lesson_type = %s
            WHERE id = %s
            RETURNING id, tenant_id, course_id, slug, title, position,
                      lesson_type, body_md, video_url, quiz_id, created_at
            """,
            (
                title_clean,
                body_md or "",
                (video_url or "").strip(),
                ltype,
                str(lesson_id),
            ),
        ).fetchone()
        return dict(row) if row else None


def delete_lesson(*, tenant_id: UUID | str, lesson_id: UUID | str) -> bool:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        conn.execute(
            "DELETE FROM lesson_progress WHERE lesson_id = %s",
            (str(lesson_id),),
        )
        row = conn.execute(
            "DELETE FROM lessons WHERE id = %s RETURNING id",
            (str(lesson_id),),
        ).fetchone()
        return bool(row)


def delete_quiz_question(*, tenant_id: UUID | str, question_id: UUID | str) -> bool:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            "DELETE FROM quiz_questions WHERE id = %s RETURNING id",
            (str(question_id),),
        ).fetchone()
        return bool(row)


def course_progress(
    tenant_id: UUID | str, *, course_id: UUID | str, subject: str
) -> dict[str, Any]:
    lessons = list_lessons(tenant_id, course_id)
    learnable = [L for L in lessons if L["lesson_type"] != "quiz"]
    done = completed_lesson_ids(tenant_id, course_id=course_id, subject=subject)
    completed_n = sum(1 for L in learnable if str(L["id"]) in done)
    total = len(learnable)
    next_lesson = None
    for L in lessons:
        if L["lesson_type"] == "quiz":
            if completed_n >= total:
                next_lesson = L
            break
        if str(L["id"]) not in done:
            next_lesson = L
            break
    if next_lesson is None and lessons:
        next_lesson = lessons[-1]
    return {
        "lessons": lessons,
        "completed_ids": done,
        "completed_count": completed_n,
        "total_count": total,
        "percent": int(round(100 * completed_n / total)) if total else 0,
        "next_lesson": next_lesson,
        "all_lessons_done": completed_n >= total and total > 0,
    }


def neighbor_lessons(
    lessons: list[dict[str, Any]], lesson_id: UUID | str
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    ids = [str(L["id"]) for L in lessons]
    try:
        i = ids.index(str(lesson_id))
    except ValueError:
        return None, None
    prev_l = lessons[i - 1] if i > 0 else None
    next_l = lessons[i + 1] if i + 1 < len(lessons) else None
    return prev_l, next_l


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s or "item")[:80]


def ensure_primary_course(
    tenant_id: UUID | str,
    *,
    title: str | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    """Return the school course, creating a default one if missing."""
    existing = get_primary_course(tenant_id)
    if existing:
        return existing
    tid = str(tenant_id)
    slug = "school-course"
    course_title = title or "School course"
    course_desc = description or "Lessons and quizzes for this school."
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            INSERT INTO courses (tenant_id, slug, title, description, status)
            VALUES (%s, %s, %s, %s, 'published')
            ON CONFLICT (tenant_id, slug) DO UPDATE SET
                title = EXCLUDED.title,
                status = 'published'
            RETURNING id, tenant_id, slug, title, description, status, created_at
            """,
            (tid, slug, course_title, course_desc),
        ).fetchone()
        return dict(row)


def create_lesson(
    *,
    tenant_id: UUID | str,
    title: str,
    body_md: str = "",
    lesson_type: str = "article",
    video_url: str = "",
) -> dict[str, Any]:
    if lesson_type not in {"article", "video", "quiz"}:
        lesson_type = "article"
    course = ensure_primary_course(tenant_id)
    tid = str(tenant_id)
    base_slug = _slugify(title)
    with db.tenant_connection(tid) as conn:
        pos_row = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM lessons WHERE course_id = %s",
            (str(course["id"]),),
        ).fetchone()
        position = int(pos_row["n"])
        slug = base_slug
        # Avoid slug collisions
        for i in range(0, 50):
            candidate = slug if i == 0 else f"{base_slug}-{i+1}"
            clash = conn.execute(
                "SELECT 1 FROM lessons WHERE course_id = %s AND slug = %s",
                (str(course["id"]), candidate),
            ).fetchone()
            if not clash:
                slug = candidate
                break
        quiz_id = None
        if lesson_type == "quiz":
            quiz = ensure_primary_quiz(tid, course_id=str(course["id"]))
            quiz_id = quiz["id"]
        row = conn.execute(
            """
            INSERT INTO lessons (
                tenant_id, course_id, slug, title, position,
                lesson_type, body_md, video_url, quiz_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, tenant_id, course_id, slug, title, position,
                      lesson_type, body_md, video_url, quiz_id, created_at
            """,
            (
                tid,
                str(course["id"]),
                slug,
                title.strip(),
                position,
                lesson_type,
                body_md or "",
                video_url or "",
                str(quiz_id) if quiz_id else None,
            ),
        ).fetchone()
        return dict(row)


def ensure_primary_quiz(
    tenant_id: UUID | str, *, course_id: str | None = None
) -> dict[str, Any]:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, course_id, slug, title, description, status
            FROM quizzes
            WHERE status = 'published'
            ORDER BY created_at ASC
            LIMIT 1
            """
        ).fetchone()
        if row:
            return dict(row)
        if not course_id:
            course = ensure_primary_course(tid)
            course_id = str(course["id"])
        row = conn.execute(
            """
            INSERT INTO quizzes (tenant_id, course_id, slug, title, description, status)
            VALUES (%s, %s, 'school-quiz', 'School quiz', 'Questions for this school', 'published')
            ON CONFLICT (tenant_id, slug) DO UPDATE SET status = 'published'
            RETURNING id, tenant_id, course_id, slug, title, description, status
            """,
            (tid, course_id),
        ).fetchone()
        return dict(row)


def add_quiz_question(
    *,
    tenant_id: UUID | str,
    prompt: str,
    choices: list[str],
    correct_index: int,
) -> dict[str, Any]:
    quiz = ensure_primary_quiz(tenant_id)
    tid = str(tenant_id)
    choices_clean = [c.strip() for c in choices if str(c).strip()]
    if len(choices_clean) < 2:
        raise ValueError("Need at least 2 answer choices")
    if correct_index < 0 or correct_index >= len(choices_clean):
        correct_index = 0
    import json

    with db.tenant_connection(tid) as conn:
        pos_row = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM quiz_questions WHERE quiz_id = %s",
            (str(quiz["id"]),),
        ).fetchone()
        position = int(pos_row["n"])
        key = f"q{position}"
        row = conn.execute(
            """
            INSERT INTO quiz_questions (
                tenant_id, quiz_id, question_key, prompt, choices, correct_index, position
            )
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
            RETURNING id, question_key, prompt, choices, correct_index, position
            """,
            (
                tid,
                str(quiz["id"]),
                key,
                prompt.strip(),
                json.dumps(choices_clean),
                correct_index,
                position,
            ),
        ).fetchone()
        return dict(row)

