"""SME R-2 automated indexing + R-13 public keyword query."""
from __future__ import annotations

import re
import time
from typing import Any
from uuid import UUID

from app import db
from app.modules.sme.service import split_manual_sections


def _page_chunks(body_md: str, *, chars_per_page: int = 1800) -> list[dict[str, Any]]:
    """Split long text into ~page-sized chunks when markdown headings are sparse."""
    text = (body_md or "").strip()
    if not text:
        return []
    sections = split_manual_sections(text)
    if len(sections) >= 3:
        return [
            {
                "page_no": i,
                "slug": sec.get("slug") or f"sec-{i}",
                "title": sec.get("title") or f"Section {i}",
                "body": str(sec.get("body") or "")[:4000],
            }
            for i, sec in enumerate(sections, start=1)
        ]
    # Fall back to sliding windows (~100 pages for a long manual)
    pages: list[dict[str, Any]] = []
    step = max(800, chars_per_page)
    for i, start in enumerate(range(0, len(text), step), start=1):
        chunk = text[start : start + step].strip()
        if len(chunk) < 40:
            continue
        pages.append(
            {
                "page_no": i,
                "slug": f"page-{i}",
                "title": f"Page {i}",
                "body": chunk[:4000],
            }
        )
        if i >= 120:
            break
    return pages


def index_manual(
    tenant_id: UUID | str,
    manual_id: UUID | str,
    *,
    version: int | None = None,
) -> dict[str, Any]:
    """Index a published manual into sme_index_chunks (SME R-2).

    Target: ~100 pages within a couple of minutes on typical hosts (text PDFs /
    markdown already extracted into body_md).
    """
    from app.modules import manuals as manuals_mod

    t0 = time.monotonic()
    tid = str(tenant_id)
    mid = str(manual_id)
    manual = manuals_mod.get_manual(tid, mid)
    if not manual:
        raise ValueError("Manual not found")
    ver = None
    if version is not None:
        ver = manuals_mod.get_version(tid, manual_id=mid, version=int(version))
    if not ver:
        ver = manuals_mod.latest_published_version(tid, mid)
    if not ver:
        # Fall back to newest version even if unpublished (authoring preview)
        versions = manuals_mod.list_versions(tid, mid) if hasattr(manuals_mod, "list_versions") else []
        ver = versions[0] if versions else None
    if not ver:
        raise ValueError("No manual version to index")

    body = str(ver.get("body_md") or "")
    pages = _page_chunks(body)
    vnum = int(ver.get("version") or 1)

    with db.tenant_connection(tid) as conn:
        conn.execute(
            "DELETE FROM sme_index_chunks WHERE manual_id = %s AND version = %s",
            (mid, vnum),
        )
        for p in pages:
            conn.execute(
                """
                INSERT INTO sme_index_chunks (
                    tenant_id, manual_id, version, page_no, slug, title, body
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    tid,
                    mid,
                    vnum,
                    int(p["page_no"]),
                    str(p["slug"])[:120],
                    str(p["title"])[:240],
                    str(p["body"]),
                ),
            )

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    return {
        "manual_id": mid,
        "manual_title": str(manual.get("title") or ""),
        "version": vnum,
        "chunk_count": len(pages),
        "elapsed_ms": elapsed_ms,
        "within_sla": elapsed_ms <= 120_000,
    }


def list_index_chunks(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    tid = str(tenant_id)
    lim = max(1, min(int(limit or 200), 500))
    with db.tenant_connection(tid) as conn:
        if manual_id:
            rows = conn.execute(
                """
                SELECT id, manual_id, version, page_no, slug, title, body, indexed_at
                FROM sme_index_chunks
                WHERE manual_id = %s
                ORDER BY version DESC, page_no
                LIMIT %s
                """,
                (str(manual_id), lim),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, manual_id, version, page_no, slug, title, body, indexed_at
                FROM sme_index_chunks
                ORDER BY indexed_at DESC, page_no
                LIMIT %s
                """,
                (lim,),
            ).fetchall()
    out = []
    for r in rows:
        item = dict(r)
        item["id"] = str(item["id"])
        item["manual_id"] = str(item["manual_id"])
        out.append(item)
    return out


def search_index(
    tenant_id: UUID | str,
    query: str,
    *,
    limit: int = 8,
) -> list[dict[str, Any]]:
    """Keyword search over indexed chunks (no embeddings — CrossCheck stance)."""
    q = (query or "").strip()
    if not q:
        return []
    tokens = [t for t in re.split(r"\W+", q.lower()) if len(t) >= 2][:8]
    if not tokens:
        tokens = [q.lower()[:40]]
    tid = str(tenant_id)
    lim = max(1, min(int(limit or 8), 20))
    # Simple ILIKE OR — scores by number of token hits in Python
    with db.tenant_connection(tid) as conn:
        rows = conn.execute(
            """
            SELECT id, manual_id, version, page_no, slug, title, body
            FROM sme_index_chunks
            ORDER BY indexed_at DESC
            LIMIT 400
            """
        ).fetchall()
    scored: list[tuple[int, dict[str, Any]]] = []
    for r in rows:
        item = dict(r)
        blob = f"{item.get('title') or ''} {item.get('body') or ''}".lower()
        hits = sum(1 for t in tokens if t in blob)
        if hits <= 0:
            continue
        item["id"] = str(item["id"])
        item["manual_id"] = str(item["manual_id"])
        item["score"] = hits
        item["excerpt"] = str(item.get("body") or "")[:500]
        scored.append((hits, item))
    scored.sort(key=lambda x: (-x[0], x[1].get("page_no") or 0))
    return [s[1] for s in scored[:lim]]


def public_query(
    tenant_id: UUID | str,
    query: str,
    *,
    limit: int = 5,
) -> dict[str, Any]:
    """SME R-13: external app query over approved/indexed SME sources."""
    hits = search_index(tenant_id, query, limit=limit)
    if not hits:
        # Fall back to live resolve when index empty
        from app.modules.sme.service import coach_chunks_for_tenant

        _title, chunks, _sources = coach_chunks_for_tenant(tenant_id)
        qlow = (query or "").lower()
        tokens = [t for t in re.split(r"\W+", qlow) if len(t) >= 2][:6]
        scored = []
        for ch in chunks:
            blob = f"{ch.get('title') or ''} {ch.get('body') or ''}".lower()
            hits_n = sum(1 for t in tokens if t in blob) if tokens else 0
            if hits_n or (qlow and qlow in blob):
                scored.append((hits_n, ch))
        scored.sort(key=lambda x: -x[0])
        hits = [
            {
                "title": c.get("title"),
                "excerpt": str(c.get("body") or "")[:500],
                "manual_id": c.get("manual_id"),
                "href": c.get("href"),
                "score": n,
                "source": "live_chunks",
            }
            for n, c in scored[:limit]
        ]
    else:
        for h in hits:
            h["source"] = "index"
            h["href"] = (
                f"/manuals/{h['manual_id']}?v={h.get('version')}"
                + (f"&focus={h['slug']}" if h.get("slug") else "")
            )
    return {
        "query": query,
        "hit_count": len(hits),
        "hits": hits,
    }
