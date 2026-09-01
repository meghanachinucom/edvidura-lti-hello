"""C13 SME chatbot — approved source registry for study coach grounding."""
from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from app import db


def _slugify_heading(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s or "section")[:80]


def split_manual_sections(body_md: str) -> list[dict[str, str]]:
    """Split markdown on ## headings into {slug, title, body} chunks."""
    text = (body_md or "").strip()
    if not text:
        return []
    parts = re.split(r"(?m)^(##\s+.+)$", text)
    out: list[dict[str, str]] = []
    # parts[0] may be preface before first ##
    preface = (parts[0] or "").strip()
    if preface and len(parts) == 1:
        return [{"slug": "overview", "title": "Overview", "body": preface}]
    i = 1
    while i < len(parts):
        heading = parts[i].lstrip("#").strip()
        body = (parts[i + 1] if i + 1 < len(parts) else "").strip()
        i += 2
        if not heading:
            continue
        out.append(
            {
                "slug": _slugify_heading(heading),
                "title": heading,
                "body": body or heading,
            }
        )
    if preface and out:
        out.insert(
            0, {"slug": "overview", "title": "Overview", "body": preface}
        )
    return out


def list_sources(
    tenant_id: UUID | str, *, include_archived: bool = False
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        if include_archived:
            rows = conn.execute(
                """
                SELECT id, source_kind, manual_id, lesson_id, pin_version,
                       focus_slug, label, status, position, created_at
                FROM sme_sources
                ORDER BY position, created_at
                """
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, source_kind, manual_id, lesson_id, pin_version,
                       focus_slug, label, status, position, created_at
                FROM sme_sources
                WHERE status = 'active'
                ORDER BY position, created_at
                """
            ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item["id"] = str(item["id"])
            if item.get("manual_id"):
                item["manual_id"] = str(item["manual_id"])
            if item.get("lesson_id"):
                item["lesson_id"] = str(item["lesson_id"])
            out.append(item)
        return out


def add_manual_source(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str,
    pin_version: int | None = None,
    focus_slug: str = "",
    label: str = "",
) -> dict[str, Any]:
    tid = str(tenant_id)
    mid = str(manual_id)
    focus = (focus_slug or "").strip().lstrip("#")
    with db.tenant_connection(tid) as conn:
        m = conn.execute(
            "SELECT id, title FROM manuals WHERE id = %s", (mid,)
        ).fetchone()
        if not m:
            raise ValueError("Manual not found")
        label_s = (label or "").strip() or str(m["title"])
        if focus:
            label_s = f"{label_s} · {focus.replace('-', ' ').title()}"
        pos = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM sme_sources"
        ).fetchone()
        # Soft-archive prior active duplicate then insert
        conn.execute(
            """
            UPDATE sme_sources SET status = 'archived'
            WHERE tenant_id = %s AND source_kind = 'manual'
              AND manual_id = %s
              AND COALESCE(pin_version, 0) = COALESCE(%s, 0)
              AND focus_slug = %s
              AND status = 'active'
            """,
            (tid, mid, pin_version, focus),
        )
        row = conn.execute(
            """
            INSERT INTO sme_sources (
                tenant_id, source_kind, manual_id, pin_version, focus_slug,
                label, status, position
            )
            VALUES (%s, 'manual', %s, %s, %s, %s, 'active', %s)
            RETURNING id, source_kind, manual_id, lesson_id, pin_version,
                      focus_slug, label, status, position
            """,
            (tid, mid, pin_version, focus, label_s, int(pos["n"])),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        item["manual_id"] = str(item["manual_id"])
        return item


def add_lesson_source(
    tenant_id: UUID | str,
    *,
    lesson_id: UUID | str,
    label: str = "",
) -> dict[str, Any]:
    tid = str(tenant_id)
    lid = str(lesson_id)
    with db.tenant_connection(tid) as conn:
        L = conn.execute(
            "SELECT id, title FROM lessons WHERE id = %s", (lid,)
        ).fetchone()
        if not L:
            raise ValueError("Lesson not found")
        label_s = (label or "").strip() or str(L["title"])
        pos = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM sme_sources"
        ).fetchone()
        conn.execute(
            """
            UPDATE sme_sources SET status = 'archived'
            WHERE tenant_id = %s AND source_kind = 'lesson'
              AND lesson_id = %s AND focus_slug = ''
              AND status = 'active'
            """,
            (tid, lid),
        )
        row = conn.execute(
            """
            INSERT INTO sme_sources (
                tenant_id, source_kind, lesson_id, focus_slug, label, status, position
            )
            VALUES (%s, 'lesson', %s, '', %s, 'active', %s)
            RETURNING id, source_kind, manual_id, lesson_id, pin_version,
                      focus_slug, label, status, position
            """,
            (tid, lid, label_s, int(pos["n"])),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        if item.get("lesson_id"):
            item["lesson_id"] = str(item["lesson_id"])
        return item


def archive_source(tenant_id: UUID | str, source_id: UUID | str) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            UPDATE sme_sources SET status = 'archived'
            WHERE id = %s AND status = 'active'
            """,
            (str(source_id),),
        )


def ensure_default_sources(
    tenant_id: UUID | str,
    *,
    course_id: UUID | str | None = None,
) -> list[dict[str, Any]]:
    """If registry empty, pin published manuals + reading lessons for course."""
    existing = list_sources(tenant_id)
    if existing:
        return existing
    from app.modules import manuals as manuals_mod
    from app.modules import content

    tid = str(tenant_id)
    for m in manuals_mod.list_manuals(tid):
        pub = manuals_mod.latest_published_version(tid, m["id"])
        if not pub:
            continue
        try:
            add_manual_source(
                tid,
                manual_id=m["id"],
                pin_version=int(pub["version"]),
                label=str(m.get("title") or "Manual"),
            )
        except ValueError:
            continue
    if course_id:
        for L in content.list_lessons(tid, course_id):
            if L.get("lesson_type") == "quiz":
                continue
            body = str(L.get("body_md") or "").strip()
            if len(body) < 20:
                continue
            try:
                add_lesson_source(tid, lesson_id=L["id"], label=str(L.get("title") or ""))
            except ValueError:
                continue
    return list_sources(tenant_id)


def resolve_source_chunks(
    tenant_id: UUID | str, sources: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """Materialize registry rows into coach chunks (title, body, citation meta)."""
    from app.modules import manuals as manuals_mod
    from app.modules import content

    tid = str(tenant_id)
    rows = sources if sources is not None else list_sources(tid)
    chunks: list[dict[str, Any]] = []
    for s in rows:
        if s.get("source_kind") == "manual" and s.get("manual_id"):
            mid = s["manual_id"]
            manual = manuals_mod.get_manual(tid, mid)
            if not manual:
                continue
            ver = None
            pin = s.get("pin_version")
            if pin is not None:
                ver = manuals_mod.get_version(tid, manual_id=mid, version=int(pin))
                if ver and not ver.get("is_published"):
                    ver = None
            if not ver:
                ver = manuals_mod.latest_published_version(tid, mid)
            if not ver:
                continue
            body = str(ver.get("body_md") or "")
            focus = (s.get("focus_slug") or "").strip()
            sections = split_manual_sections(body)
            vnum = int(ver["version"])
            base_title = str(s.get("label") or manual.get("title") or "Manual")
            matched: list[dict[str, str]] = []
            if focus and sections:
                matched = [sec for sec in sections if sec["slug"] == focus]
                use = matched or sections
            elif sections and len(sections) > 1:
                use = sections
            else:
                use = [
                    {
                        "slug": focus or "manual",
                        "title": base_title,
                        "body": body,
                    }
                ]
            for sec in use:
                if focus and matched and sec["slug"] != focus:
                    continue
                title = f"{base_title} (v{vnum})"
                if sec["title"] and sec["title"] != base_title:
                    title = f"{manual.get('title')} · {sec['title']} (v{vnum})"
                chunks.append(
                    {
                        "title": title,
                        "body": sec["body"][:2000],
                        "kind": "manual",
                        "manual_id": str(mid),
                        "version": vnum,
                        "focus": sec["slug"],
                        "href": (
                            f"/manuals/{mid}?v={vnum}"
                            + (f"&focus={sec['slug']}" if sec.get("slug") else "")
                        ),
                    }
                )
        elif s.get("source_kind") == "lesson" and s.get("lesson_id"):
            L = content.get_lesson(tid, s["lesson_id"], allow_unpublished=False)
            if not L:
                continue
            body = str(L.get("body_md") or "").strip()
            if len(body) < 10:
                continue
            title = str(s.get("label") or L.get("title") or "Lesson")
            chunks.append(
                {
                    "title": title,
                    "body": body[:2000],
                    "kind": "lesson",
                    "lesson_id": str(L["id"]),
                    "href": f"/lessons/{L['id']}",
                }
            )
    return chunks


def coach_chunks_for_tenant(
    tenant_id: UUID | str,
    *,
    course_id: UUID | str | None = None,
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Return (course_title, chunks, sources_used).
    Uses SME registry; auto-seeds from manuals/lessons when empty.
    """
    from app.modules import content

    tid = str(tenant_id)
    course = None
    if course_id:
        course = content.get_bound_course(tid, course_id)
    if not course:
        try:
            course = content.ensure_primary_course(tid)
        except Exception:  # noqa: BLE001
            course = None
    title = str((course or {}).get("title") or "")
    cid = str((course or {}).get("id") or "") or None
    try:
        sources = ensure_default_sources(tid, course_id=cid)
    except Exception:  # noqa: BLE001
        sources = []
    chunks = resolve_source_chunks(tid, sources)
    return title, chunks, sources
