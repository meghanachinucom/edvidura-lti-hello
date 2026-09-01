"""Versioned technical manuals (Slice B content start — no AI)."""
from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from app import db
from app.modules.content.service import body_md_to_html


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s or "manual")[:80]


def list_manuals(
    tenant_id: UUID | str, *, include_unpublished: bool = False
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        if include_unpublished:
            rows = conn.execute(
                """
                SELECT id, tenant_id, slug, title, description, status, created_at
                FROM manuals
                ORDER BY title
                """
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, tenant_id, slug, title, description, status, created_at
                FROM manuals
                WHERE status = 'published'
                ORDER BY title
                """
            ).fetchall()
        return [dict(r) for r in rows]


def get_manual(tenant_id: UUID | str, manual_id: UUID | str) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, slug, title, description, status, created_at
            FROM manuals WHERE id = %s
            """,
            (str(manual_id),),
        ).fetchone()
        return dict(row) if row else None


def create_manual(
    *,
    tenant_id: UUID | str,
    title: str,
    description: str = "",
    body_md: str = "",
    subject: str = "",
    publish: bool = True,
) -> dict[str, Any]:
    tid = str(tenant_id)
    title_clean = (title or "").strip()
    if not title_clean:
        raise ValueError("Manual title required")
    base = _slugify(title_clean)
    with db.tenant_connection(tid) as conn:
        slug = base
        for i in range(0, 40):
            candidate = slug if i == 0 else f"{base}-{i+1}"
            clash = conn.execute(
                "SELECT 1 FROM manuals WHERE slug = %s",
                (candidate,),
            ).fetchone()
            if not clash:
                slug = candidate
                break
        status = "published" if publish else "draft"
        manual = conn.execute(
            """
            INSERT INTO manuals (tenant_id, slug, title, description, status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, tenant_id, slug, title, description, status, created_at
            """,
            (tid, slug, title_clean, description or "", status),
        ).fetchone()
        version = conn.execute(
            """
            INSERT INTO manual_versions (
                tenant_id, manual_id, version, body_md, changelog,
                is_published, created_by_subject, published_at
            )
            VALUES (%s, %s, 1, %s, %s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
            RETURNING id, manual_id, version, body_md, changelog, is_published,
                      created_by_subject, created_at, published_at
            """,
            (
                tid,
                str(manual["id"]),
                body_md or "",
                "Initial version",
                publish,
                subject or "",
                publish,
            ),
        ).fetchone()
        out = dict(manual)
        out["latest_version"] = dict(version)
        return out


def list_versions(tenant_id: UUID | str, manual_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, manual_id, version, body_md, changelog, is_published,
                   created_by_subject, created_at, published_at
            FROM manual_versions
            WHERE manual_id = %s
            ORDER BY version DESC
            """,
            (str(manual_id),),
        ).fetchall()
        return [dict(r) for r in rows]


def get_version(
    tenant_id: UUID | str, *, manual_id: UUID | str, version: int
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, manual_id, version, body_md, changelog, is_published,
                   created_by_subject, created_at, published_at
            FROM manual_versions
            WHERE manual_id = %s AND version = %s
            """,
            (str(manual_id), int(version)),
        ).fetchone()
        return dict(row) if row else None


def latest_published_version(
    tenant_id: UUID | str, manual_id: UUID | str
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, manual_id, version, body_md, changelog, is_published,
                   created_by_subject, created_at, published_at
            FROM manual_versions
            WHERE manual_id = %s AND is_published = TRUE
            ORDER BY version DESC
            LIMIT 1
            """,
            (str(manual_id),),
        ).fetchone()
        return dict(row) if row else None


def add_version(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    body_md: str,
    changelog: str = "",
    subject: str = "",
    publish: bool = False,
) -> dict[str, Any]:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        manual = conn.execute(
            "SELECT id FROM manuals WHERE id = %s",
            (str(manual_id),),
        ).fetchone()
        if not manual:
            raise ValueError("Manual not found")
        pos = conn.execute(
            "SELECT COALESCE(MAX(version), 0) + 1 AS n FROM manual_versions WHERE manual_id = %s",
            (str(manual_id),),
        ).fetchone()
        version_n = int(pos["n"])
        row = conn.execute(
            """
            INSERT INTO manual_versions (
                tenant_id, manual_id, version, body_md, changelog,
                is_published, created_by_subject, published_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
            RETURNING id, manual_id, version, body_md, changelog, is_published,
                      created_by_subject, created_at, published_at
            """,
            (
                tid,
                str(manual_id),
                version_n,
                body_md or "",
                changelog or f"Version {version_n}",
                publish,
                subject or "",
                publish,
            ),
        ).fetchone()
        if publish:
            conn.execute(
                "UPDATE manuals SET status = 'published' WHERE id = %s",
                (str(manual_id),),
            )
        return dict(row)


def publish_version(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE manual_versions
            SET is_published = TRUE, published_at = COALESCE(published_at, now())
            WHERE manual_id = %s AND version = %s
            RETURNING id, manual_id, version, body_md, changelog, is_published,
                      created_by_subject, created_at, published_at
            """,
            (str(manual_id), int(version)),
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE manuals SET status = 'published' WHERE id = %s",
                (str(manual_id),),
            )
        return dict(row) if row else None


def render_body(body_md: str) -> str:
    return body_md_to_html(body_md)


def toc_from_body(body_md: str) -> list[dict[str, str]]:
    """
    PeBL-ish chapter TOC from ## headings.

    Returns [{slug, title}] — same slugs as heading ids in render_body.
    """
    from app.modules.sme.service import split_manual_sections

    sections = split_manual_sections(body_md)
    return [
        {"slug": str(s.get("slug") or ""), "title": str(s.get("title") or "")}
        for s in sections
        if s.get("slug") and s.get("title")
    ]


def _reader_signing_key() -> bytes:
    from app.settings import get_settings

    s = get_settings()
    raw = (
        getattr(s, "receipt_signing_key", "")
        or s.session_secret
        or "dev-only-change-me"
    )
    return str(raw).encode("utf-8")


def seal_reader_token(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    exp_hours: int = 72,
) -> str:
    """HMAC token for standalone eBook read links (no LTI session)."""
    import hashlib
    import hmac
    import time

    exp = int(time.time()) + max(1, int(exp_hours)) * 3600
    payload = f"{tenant_id}|{manual_id}|{int(version)}|{exp}"
    dig = hmac.new(_reader_signing_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{exp}.{dig}"


def verify_reader_token(
    *,
    token: str,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
) -> bool:
    import hashlib
    import hmac
    import time

    raw = (token or "").strip()
    if "." not in raw:
        return False
    exp_s, dig = raw.split(".", 1)
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    if exp < int(time.time()):
        return False
    payload = f"{tenant_id}|{manual_id}|{int(version)}|{exp}"
    expected = hmac.new(
        _reader_signing_key(), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(dig.lower(), expected.lower())


def reader_share_path(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    focus: str = "",
    exp_hours: int = 72,
) -> str:
    """Relative URL for standalone PeBL reader."""
    from urllib.parse import urlencode

    sig = seal_reader_token(
        tenant_id=tenant_id,
        manual_id=manual_id,
        version=version,
        exp_hours=exp_hours,
    )
    q = {
        "tid": str(tenant_id),
        "v": int(version),
        "sig": sig,
    }
    focus_s = (focus or "").strip().lstrip("#")
    if focus_s:
        q["focus"] = focus_s
    return f"/read/manuals/{manual_id}?{urlencode(q)}"
