"""PeBL Phase 2: Learner Reading Progress, Bookmarks, and Annotations service layer.

Strictly tenant-isolated and learner-scoped via PostgreSQL RLS.
Durable persistence is required; volatile in-memory fallbacks are prohibited.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

import psycopg

from app import db


class DatabaseUnavailableError(RuntimeError):
    """Raised when the database backend is unreachable or unavailable."""
    pass


def _format_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    out = dict(row)
    if "id" in out and out["id"] is not None:
        out["id"] = str(out["id"])
    if "tenant_id" in out and out["tenant_id"] is not None:
        out["tenant_id"] = str(out["tenant_id"])
    if "manual_id" in out and out["manual_id"] is not None:
        out["manual_id"] = str(out["manual_id"])
    if "created_at" in out and out["created_at"] is not None and hasattr(out["created_at"], "isoformat"):
        out["created_at"] = out["created_at"].isoformat()
    if "updated_at" in out and out["updated_at"] is not None and hasattr(out["updated_at"], "isoformat"):
        out["updated_at"] = out["updated_at"].isoformat()
    return out


# —— STANDARD EPUB CFI (CANONICAL FRAGMENT IDENTIFIER) HELPERS ——

def generate_epub_cfi(
    chapter_index: int,
    itemref_id: str = "",
    element_step: int | None = 2,
    start_char: int = 0,
    end_char: int | None = None,
    start_subpath: str | None = None,
    end_subpath: str | None = None,
    parent_path: str | None = None,
) -> str:
    """Generate a standard EPUB Canonical Fragment Identifier (CFI).
    
    Conforms to the W3C EPUB Canonical Fragment Identifier (epubcfi) 1.1 Specification.
    - Point CFI: epubcfi(/6/{spine_step}[{itemref_id}]!/4/{element_step}:{start_char})
    - Range CFI: epubcfi({full_parent_path},{start_subpath},{end_subpath})
    """
    spine_num = 2 * (int(chapter_index) + 1)
    id_part = f"[{itemref_id}]" if itemref_id else ""

    if parent_path:
        base_parent = parent_path
    elif element_step is not None:
        base_parent = f"/6/{spine_num}{id_part}!/4/{element_step}"
    else:
        base_parent = f"/6/{spine_num}{id_part}!/4"

    if start_subpath is not None and end_subpath is not None:
        s_sub = start_subpath if start_subpath.startswith("/") or start_subpath.startswith(":") else f"/{start_subpath}"
        e_sub = end_subpath if end_subpath.startswith("/") or end_subpath.startswith(":") else f"/{end_subpath}"
        return f"epubcfi({base_parent},{s_sub},{e_sub})"

    if end_char is not None and end_char > start_char:
        return f"epubcfi({base_parent},/1:{start_char},/1:{end_char})"

    return f"epubcfi({base_parent}:{start_char})"


def parse_epub_cfi(cfi: str | None) -> dict[str, Any] | None:
    """Parse a standard EPUB CFI or legacy chapter marker into chapter index and offsets.
    
    Supports:
      - Standard EPUB Range CFI:
          epubcfi(/6/2[ch1]!/4/4,/1:10,/1:52)
          epubcfi(/6/2[ch1]!/4/6,/2/1:0,/3:39)
          epubcfi(/6/2[ch1]!/4,/4/1:10,/6/1:25)
          epubcfi(/6/2[ch1]!/4/4/1,:10,:52)
      - Standard EPUB Point CFI:
          epubcfi(/6/2[ch1]!/4/2:0)
          epubcfi(/6/4[ch2]!/4/4/1:15)
      - Tolerant fallback:
          epubcfi(/6/2[ch1]!/4/4,10,52)
      - Legacy custom markers:
          epub-cfi-chap-1
    """
    if not cfi or not isinstance(cfi, str):
        return None
    cfi = cfi.strip()
    import re

    # 1. Standard / Multi-segment Range CFI: epubcfi( parent , start_subpath , end_subpath )
    m_range = re.match(
        r"^epubcfi\((/6/(\d+)(?:\[([^\]]+)\])?!(.*?)),((?:/\d+)*:?\d+),((?:/\d+)*:?\d+)\)$",
        cfi,
    )
    if m_range:
        full_parent = m_range.group(1)
        spine_num = int(m_range.group(2))
        chap_idx = max(0, (spine_num // 2) - 1)
        itemref = m_range.group(3) or ""
        local_parent = m_range.group(4) or ""
        s_sub = m_range.group(5)
        e_sub = m_range.group(6)

        # Extract element step from local parent path if present (e.g. /4/6 -> 6)
        m_step = re.search(r"/4/(\d+)", local_parent)
        elem_step = int(m_step.group(1)) if m_step else 2

        # Extract character offsets if present
        m_schar = re.search(r":?(\d+)$", s_sub)
        start_char = int(m_schar.group(1)) if m_schar else 0
        m_echar = re.search(r":?(\d+)$", e_sub)
        end_char = int(m_echar.group(1)) if m_echar else start_char

        return {
            "chapter_index": chap_idx,
            "itemref_id": itemref,
            "element_step": elem_step,
            "parent_path": full_parent,
            "start_subpath": s_sub,
            "end_subpath": e_sub,
            "start_char": start_char,
            "end_char": end_char,
            "is_standard_cfi": True,
            "is_range": True,
        }

    # 2. Standard Point CFI: epubcfi(/6/2[ch1]!/4/2:0) or epubcfi(/6/4[ch2]!/4/4/1:15)
    m_point = re.match(
        r"^epubcfi\((/6/(\d+)(?:\[([^\]]+)\])?!(?:/4(?:/(\d+))?(?:/\d+)?(?::(\d+))?)?)\)$",
        cfi,
    )
    if m_point:
        full_parent = m_point.group(1)
        spine_num = int(m_point.group(2))
        chap_idx = max(0, (spine_num // 2) - 1)
        itemref = m_point.group(3) or ""
        elem_step = int(m_point.group(4)) if m_point.group(4) else 2
        start_char = int(m_point.group(5)) if m_point.group(5) else 0
        return {
            "chapter_index": chap_idx,
            "itemref_id": itemref,
            "element_step": elem_step,
            "parent_path": full_parent,
            "start_subpath": None,
            "end_subpath": None,
            "start_char": start_char,
            "end_char": None,
            "is_standard_cfi": True,
            "is_range": False,
        }

    # 3. Legacy chapter marker fallback: epub-cfi-chap-1
    m_leg = re.match(r"^epub-cfi-chap-(\d+)$", cfi)
    if m_leg:
        chap_idx = max(0, int(m_leg.group(1)) - 1)
        return {
            "chapter_index": chap_idx,
            "itemref_id": "",
            "element_step": 2,
            "parent_path": None,
            "start_subpath": None,
            "end_subpath": None,
            "start_char": 0,
            "end_char": None,
            "is_standard_cfi": False,
            "is_range": False,
        }
    return None


# —— READING POSITION & PROGRESS ——

def save_reading_progress(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    subject: str,
    chapter_index: int = 0,
    cfi: str | None = None,
    progress_percent: int = 0,
) -> dict[str, Any]:
    tid = str(tenant_id)
    mid = str(manual_id)
    sub = (subject or "").strip()
    if not sub:
        raise ValueError("Learner subject required")
    v = max(1, int(version))
    chap = max(0, int(chapter_index))
    pct = max(0, min(100, int(progress_percent)))

    try:
        with db.tenant_connection(tid) as conn:
            row = conn.execute(
                """
                INSERT INTO ebook_reading_progress (
                    tenant_id, manual_id, version, subject, chapter_index, cfi, progress_percent, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (tenant_id, manual_id, version, subject) DO UPDATE SET
                    chapter_index = EXCLUDED.chapter_index,
                    cfi = COALESCE(EXCLUDED.cfi, ebook_reading_progress.cfi),
                    progress_percent = EXCLUDED.progress_percent,
                    updated_at = now()
                RETURNING id, tenant_id, manual_id, version, subject, chapter_index, cfi, progress_percent, updated_at
                """,
                (tid, mid, v, sub, chap, cfi, pct),
            ).fetchone()
            if not row:
                raise DatabaseUnavailableError("Failed to persist reading progress")
            formatted = _format_row(dict(row))
            if not formatted:
                raise DatabaseUnavailableError("Failed to persist reading progress")
            return formatted
    except DatabaseUnavailableError:
        raise
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def get_reading_progress(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    subject: str,
) -> dict[str, Any] | None:
    tid = str(tenant_id)
    mid = str(manual_id)
    sub = (subject or "").strip()
    if not sub:
        return None
    v = max(1, int(version))

    try:
        with db.tenant_connection(tid) as conn:
            row = conn.execute(
                """
                SELECT id, tenant_id, manual_id, version, subject, chapter_index, cfi, progress_percent, updated_at
                FROM ebook_reading_progress
                WHERE manual_id = %s AND version = %s AND subject = %s
                """,
                (mid, v, sub),
            ).fetchone()
            if not row:
                return None
            return _format_row(dict(row))
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


# —— BOOKMARKS ——

def create_bookmark(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    subject: str,
    chapter_index: int = 0,
    cfi: str | None = None,
    title: str = "",
) -> dict[str, Any]:
    tid = str(tenant_id)
    mid = str(manual_id)
    sub = (subject or "").strip()
    if not sub:
        raise ValueError("Learner subject required")
    v = max(1, int(version))
    chap = max(0, int(chapter_index))
    title_clean = (title or "").strip() or f"Chapter {chap + 1} Bookmark"

    try:
        with db.tenant_connection(tid) as conn:
            row = conn.execute(
                """
                INSERT INTO ebook_bookmarks (
                    tenant_id, manual_id, version, subject, chapter_index, cfi, title
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, tenant_id, manual_id, version, subject, chapter_index, cfi, title, created_at
                """,
                (tid, mid, v, sub, chap, cfi, title_clean),
            ).fetchone()
            if not row:
                raise DatabaseUnavailableError("Failed to persist bookmark")
            formatted = _format_row(dict(row))
            if not formatted:
                raise DatabaseUnavailableError("Failed to persist bookmark")
            return formatted
    except DatabaseUnavailableError:
        raise
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def get_bookmark(
    *,
    tenant_id: UUID | str,
    bookmark_id: UUID | str,
) -> dict[str, Any] | None:
    tid = str(tenant_id)
    bid = str(bookmark_id)

    try:
        with db.tenant_connection(tid) as conn:
            row = conn.execute(
                """
                SELECT id, tenant_id, manual_id, version, subject, chapter_index, cfi, title, created_at
                FROM ebook_bookmarks
                WHERE id = %s
                """,
                (bid,),
            ).fetchone()
            if not row:
                return None
            return _format_row(dict(row))
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def list_bookmarks(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    subject: str,
) -> list[dict[str, Any]]:
    tid = str(tenant_id)
    mid = str(manual_id)
    sub = (subject or "").strip()
    if not sub:
        return []
    v = max(1, int(version))

    try:
        with db.tenant_connection(tid) as conn:
            rows = conn.execute(
                """
                SELECT id, tenant_id, manual_id, version, subject, chapter_index, cfi, title, created_at
                FROM ebook_bookmarks
                WHERE manual_id = %s AND version = %s AND subject = %s
                ORDER BY created_at DESC
                """,
                (mid, v, sub),
            ).fetchall()
            out = []
            for r in rows:
                item = _format_row(dict(r))
                if item:
                    out.append(item)
            return out
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def delete_bookmark(
    *,
    tenant_id: UUID | str,
    bookmark_id: UUID | str,
    subject: str,
) -> bool:
    tid = str(tenant_id)
    bid = str(bookmark_id)
    sub = (subject or "").strip()
    if not sub:
        return False

    try:
        with db.tenant_connection(tid) as conn:
            res = conn.execute(
                """
                DELETE FROM ebook_bookmarks
                WHERE id = %s AND subject = %s
                """,
                (bid, sub),
            )
            return getattr(res, "rowcount", 1) > 0
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


# —— ANNOTATIONS & HIGHLIGHTS ——

def create_annotation(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    subject: str,
    chapter_index: int = 0,
    cfi_range: str | None = None,
    highlight_text: str = "",
    annotation_text: str = "",
    color: str = "yellow",
) -> dict[str, Any]:
    tid = str(tenant_id)
    mid = str(manual_id)
    sub = (subject or "").strip()
    if not sub:
        raise ValueError("Learner subject required")
    v = max(1, int(version))
    chap = max(0, int(chapter_index))
    valid_color = color.lower() if color and color.lower() in {"yellow", "green", "blue", "pink"} else "yellow"

    try:
        with db.tenant_connection(tid) as conn:
            row = conn.execute(
                """
                INSERT INTO ebook_annotations (
                    tenant_id, manual_id, version, subject, chapter_index, cfi_range,
                    highlight_text, annotation_text, color
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, tenant_id, manual_id, version, subject, chapter_index, cfi_range,
                          highlight_text, annotation_text, color, created_at, updated_at
                """,
                (tid, mid, v, sub, chap, cfi_range, highlight_text or "", annotation_text or "", valid_color),
            ).fetchone()
            if not row:
                raise DatabaseUnavailableError("Failed to persist annotation")
            formatted = _format_row(dict(row))
            if not formatted:
                raise DatabaseUnavailableError("Failed to persist annotation")
            return formatted
    except DatabaseUnavailableError:
        raise
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def get_annotation(
    *,
    tenant_id: UUID | str,
    annotation_id: UUID | str,
) -> dict[str, Any] | None:
    tid = str(tenant_id)
    aid = str(annotation_id)

    try:
        with db.tenant_connection(tid) as conn:
            row = conn.execute(
                """
                SELECT id, tenant_id, manual_id, version, subject, chapter_index, cfi_range,
                       highlight_text, annotation_text, color, created_at, updated_at
                FROM ebook_annotations
                WHERE id = %s
                """,
                (aid,),
            ).fetchone()
            if not row:
                return None
            return _format_row(dict(row))
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def list_annotations(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    subject: str,
) -> list[dict[str, Any]]:
    tid = str(tenant_id)
    mid = str(manual_id)
    sub = (subject or "").strip()
    if not sub:
        return []
    v = max(1, int(version))

    try:
        with db.tenant_connection(tid) as conn:
            rows = conn.execute(
                """
                SELECT id, tenant_id, manual_id, version, subject, chapter_index, cfi_range,
                       highlight_text, annotation_text, color, created_at, updated_at
                FROM ebook_annotations
                WHERE manual_id = %s AND version = %s AND subject = %s
                ORDER BY created_at DESC
                """,
                (mid, v, sub),
            ).fetchall()
            out = []
            for r in rows:
                item = _format_row(dict(r))
                if item:
                    out.append(item)
            return out
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def update_annotation(
    *,
    tenant_id: UUID | str,
    annotation_id: UUID | str,
    subject: str,
    annotation_text: str | None = None,
    color: str | None = None,
) -> bool:
    tid = str(tenant_id)
    aid = str(annotation_id)
    sub = (subject or "").strip()
    if not sub:
        return False

    valid_color = color.lower() if color and color.lower() in {"yellow", "green", "blue", "pink"} else None

    try:
        with db.tenant_connection(tid) as conn:
            res = conn.execute(
                """
                UPDATE ebook_annotations
                SET annotation_text = COALESCE(%s, annotation_text),
                    color = COALESCE(%s, color),
                    updated_at = now()
                WHERE id = %s AND subject = %s
                """,
                (annotation_text, valid_color, aid, sub),
            )
            return getattr(res, "rowcount", 1) > 0
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc


def delete_annotation(
    *,
    tenant_id: UUID | str,
    annotation_id: UUID | str,
    subject: str,
) -> bool:
    tid = str(tenant_id)
    aid = str(annotation_id)
    sub = (subject or "").strip()
    if not sub:
        return False

    try:
        with db.tenant_connection(tid) as conn:
            res = conn.execute(
                """
                DELETE FROM ebook_annotations
                WHERE id = %s AND subject = %s
                """,
                (aid, sub),
            )
            return getattr(res, "rowcount", 1) > 0
    except (psycopg.OperationalError, psycopg.Error, OSError, ConnectionError, TimeoutError) as exc:
        raise DatabaseUnavailableError("Database persistence is currently unavailable") from exc
