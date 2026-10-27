"""PeBL in-book chapter discussions (multi-user micro-forums)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db

_MAX_BODY = 4000
_ACCESS = frozenset({"class", "team", "all", "school"})


def _clean_slug(slug: str) -> str:
    return (slug or "").strip().lstrip("#")[:120]


def _clean_body(body: str) -> str:
    text = (body or "").strip()
    if not text:
        raise ValueError("Message required")
    if len(text) > _MAX_BODY:
        raise ValueError(f"Message too long (max {_MAX_BODY})")
    return text


def get_or_create_thread(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    chapter_slug: str,
    chapter_title: str = "",
    context_id: str = "",
    access_level: str = "class",
) -> dict[str, Any]:
    tid = str(tenant_id)
    mid = str(manual_id)
    slug = _clean_slug(chapter_slug)
    ctx = (context_id or "").strip()[:200]
    level = (access_level or "class").strip().lower()
    if level not in _ACCESS:
        level = "class"
    title = (chapter_title or "").strip()[:200] or slug.replace("-", " ").title()
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, manual_id, chapter_slug, chapter_title,
                   context_id, access_level, created_at
            FROM pebl_threads
            WHERE manual_id = %s AND chapter_slug = %s AND context_id = %s
            """,
            (mid, slug, ctx),
        ).fetchone()
        if row:
            return dict(row)
        row = conn.execute(
            """
            INSERT INTO pebl_threads (
                tenant_id, manual_id, chapter_slug, chapter_title,
                context_id, access_level
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (tenant_id, manual_id, chapter_slug, context_id)
            DO UPDATE SET chapter_title = EXCLUDED.chapter_title
            RETURNING id, tenant_id, manual_id, chapter_slug, chapter_title,
                      context_id, access_level, created_at
            """,
            (tid, mid, slug, title, ctx, level),
        ).fetchone()
        return dict(row)


def list_messages(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    chapter_slug: str,
    context_id: str = "",
    limit: int = 100,
) -> dict[str, Any]:
    tid = str(tenant_id)
    mid = str(manual_id)
    slug = _clean_slug(chapter_slug)
    ctx = (context_id or "").strip()[:200]
    lim = max(1, min(int(limit or 100), 200))
    with db.tenant_connection(tid) as conn:
        thread = conn.execute(
            """
            SELECT id, tenant_id, manual_id, chapter_slug, chapter_title,
                   context_id, access_level, created_at
            FROM pebl_threads
            WHERE manual_id = %s AND chapter_slug = %s AND context_id = %s
            """,
            (mid, slug, ctx),
        ).fetchone()
        if not thread:
            return {
                "thread": None,
                "messages": [],
                "chapter_slug": slug,
                "context_id": ctx,
            }
        rows = conn.execute(
            """
            SELECT id, thread_id, parent_id, author_subject, author_name,
                   body, client_id, created_at
            FROM pebl_messages
            WHERE thread_id = %s
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (str(thread["id"]), lim),
        ).fetchall()
        return {
            "thread": dict(thread),
            "messages": [dict(r) for r in rows],
            "chapter_slug": slug,
            "context_id": ctx,
        }


def post_message(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    chapter_slug: str,
    body: str,
    author_subject: str,
    author_name: str = "",
    chapter_title: str = "",
    context_id: str = "",
    access_level: str = "class",
    parent_id: UUID | str | None = None,
    client_id: str = "",
) -> dict[str, Any]:
    text = _clean_body(body)
    sub = (author_subject or "").strip()
    if not sub:
        raise ValueError("Author required")
    cid = (client_id or "").strip()[:80]
    thread = get_or_create_thread(
        tenant_id=tenant_id,
        manual_id=manual_id,
        chapter_slug=chapter_slug,
        chapter_title=chapter_title,
        context_id=context_id,
        access_level=access_level,
    )
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        if cid:
            existing = conn.execute(
                """
                SELECT id, thread_id, parent_id, author_subject, author_name,
                       body, client_id, created_at
                FROM pebl_messages
                WHERE client_id = %s
                """,
                (cid,),
            ).fetchone()
            if existing:
                return {"message": dict(existing), "thread": thread, "deduped": True}

        parent = str(parent_id) if parent_id else None
        if parent:
            ok = conn.execute(
                """
                SELECT 1 FROM pebl_messages
                WHERE id = %s AND thread_id = %s
                """,
                (parent, str(thread["id"])),
            ).fetchone()
            if not ok:
                raise ValueError("Parent message not in this thread")

        row = conn.execute(
            """
            INSERT INTO pebl_messages (
                tenant_id, thread_id, parent_id, author_subject, author_name,
                body, client_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, thread_id, parent_id, author_subject, author_name,
                      body, client_id, created_at
            """,
            (
                tid,
                str(thread["id"]),
                parent,
                sub,
                (author_name or "").strip()[:120],
                text,
                cid,
            ),
        ).fetchone()
        return {"message": dict(row), "thread": thread, "deduped": False}


def chapter_counts(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    context_id: str = "",
) -> dict[str, int]:
    """Message counts keyed by chapter_slug for TOC badges."""
    tid = str(tenant_id)
    mid = str(manual_id)
    ctx = (context_id or "").strip()[:200]
    with db.tenant_connection(tid) as conn:
        rows = conn.execute(
            """
            SELECT t.chapter_slug, COUNT(m.id)::int AS n
            FROM pebl_threads t
            LEFT JOIN pebl_messages m ON m.thread_id = t.id
            WHERE t.manual_id = %s AND t.context_id = %s
            GROUP BY t.chapter_slug
            """,
            (mid, ctx),
        ).fetchall()
        return {str(r["chapter_slug"]): int(r["n"] or 0) for r in rows}
