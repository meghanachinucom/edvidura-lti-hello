"""Teacher-configurable Ask Vidura welcome chips (shortcuts)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db
from app.settings import get_settings

DEFAULT_SHORTCUTS: list[dict[str, str]] = [
    {
        "label": "Explain simply",
        "prompt": "Explain the main idea of this class in simple words.",
    },
    {
        "label": "Give a hint",
        "prompt": "Give me a small hint about the hardest idea in our lessons.",
    },
    {
        "label": "Check me",
        "prompt": "Ask me a short check question from today's lessons.",
    },
]


def shortcuts_enabled() -> bool:
    return bool(getattr(get_settings(), "coach_shortcuts_enabled", True))


def _row(r: Any) -> dict[str, Any]:
    item = dict(r)
    item["id"] = str(item["id"])
    if item.get("course_id"):
        item["course_id"] = str(item["course_id"])
    item["tenant_id"] = str(item["tenant_id"])
    return item


def list_shortcuts(
    tenant_id: UUID | str,
    *,
    course_id: UUID | str | None = None,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    """Active shortcuts for a course (or tenant-wide when course_id is None)."""
    if not shortcuts_enabled() or not tenant_id:
        return []
    with db.tenant_connection(tenant_id) as conn:
        if course_id:
            if include_archived:
                rows = conn.execute(
                    """
                    SELECT id, tenant_id, course_id, label, prompt, position,
                           status, created_at, updated_at
                    FROM coach_shortcuts
                    WHERE course_id = %s::uuid
                       OR course_id IS NULL
                    ORDER BY
                      CASE WHEN course_id = %s::uuid THEN 0 ELSE 1 END,
                      position, created_at
                    """,
                    (str(course_id), str(course_id)),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT id, tenant_id, course_id, label, prompt, position,
                           status, created_at, updated_at
                    FROM coach_shortcuts
                    WHERE status = 'active'
                      AND (course_id = %s::uuid OR course_id IS NULL)
                    ORDER BY
                      CASE WHEN course_id = %s::uuid THEN 0 ELSE 1 END,
                      position, created_at
                    """,
                    (str(course_id), str(course_id)),
                ).fetchall()
        else:
            sql = """
                SELECT id, tenant_id, course_id, label, prompt, position,
                       status, created_at, updated_at
                FROM coach_shortcuts
            """
            if not include_archived:
                sql += " WHERE status = 'active'"
            sql += " ORDER BY position, created_at"
            rows = conn.execute(sql).fetchall()
        return [_row(r) for r in rows]


def shortcuts_for_learner(
    tenant_id: UUID | str,
    *,
    course_id: UUID | str | None = None,
    limit: int = 6,
) -> list[dict[str, str]]:
    """Chips for the Ask Vidura UI — DB rows or safe defaults."""
    if not shortcuts_enabled():
        return []
    try:
        rows = list_shortcuts(tenant_id, course_id=course_id)
    except Exception:  # noqa: BLE001 — table may not exist yet
        rows = []
    out: list[dict[str, str]] = []
    for r in rows:
        label = str(r.get("label") or "").strip()
        prompt = str(r.get("prompt") or "").strip()
        if label and prompt:
            out.append({"id": str(r.get("id") or ""), "label": label, "prompt": prompt})
        if len(out) >= limit:
            break
    if out:
        return out
    return [
        {"id": f"default-{i}", "label": s["label"], "prompt": s["prompt"]}
        for i, s in enumerate(DEFAULT_SHORTCUTS[:limit])
    ]


def replace_shortcuts(
    tenant_id: UUID | str,
    *,
    course_id: UUID | str | None,
    items: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """Archive existing course shortcuts and insert the new active set."""
    cleaned: list[tuple[str, str]] = []
    for raw in items[:12]:
        label = str(raw.get("label") or "").strip()[:80]
        prompt = str(raw.get("prompt") or "").strip()[:500]
        if label and prompt:
            cleaned.append((label, prompt))
    if not cleaned:
        cleaned = [(s["label"], s["prompt"]) for s in DEFAULT_SHORTCUTS]

    with db.tenant_connection(tenant_id) as conn:
        if course_id:
            conn.execute(
                """
                UPDATE coach_shortcuts
                SET status = 'archived', updated_at = now()
                WHERE course_id = %s::uuid AND status = 'active'
                """,
                (str(course_id),),
            )
        else:
            conn.execute(
                """
                UPDATE coach_shortcuts
                SET status = 'archived', updated_at = now()
                WHERE course_id IS NULL AND status = 'active'
                """
            )
        out: list[dict[str, Any]] = []
        for i, (label, prompt) in enumerate(cleaned, start=1):
            if course_id:
                row = conn.execute(
                    """
                    INSERT INTO coach_shortcuts
                        (tenant_id, course_id, label, prompt, position, status)
                    VALUES (%s::uuid, %s::uuid, %s, %s, %s, 'active')
                    RETURNING id, tenant_id, course_id, label, prompt, position,
                              status, created_at, updated_at
                    """,
                    (str(tenant_id), str(course_id), label, prompt, i),
                ).fetchone()
            else:
                row = conn.execute(
                    """
                    INSERT INTO coach_shortcuts
                        (tenant_id, course_id, label, prompt, position, status)
                    VALUES (%s::uuid, NULL, %s, %s, %s, 'active')
                    RETURNING id, tenant_id, course_id, label, prompt, position,
                              status, created_at, updated_at
                    """,
                    (str(tenant_id), label, prompt, i),
                ).fetchone()
            out.append(_row(row))
        return out


__all__ = [
    "DEFAULT_SHORTCUTS",
    "list_shortcuts",
    "replace_shortcuts",
    "shortcuts_enabled",
    "shortcuts_for_learner",
]
