"""Python port of ADL xi-lite Experience Index query filters.

Upstream: adlnet/xi-lite ``xi/util/mongo.js`` + ``xi/app.js``
(see ``vendor/xi_lite/``). Portable — no app/DB imports.

xi-lite API contract mirrored:
  GET /api/v1/experiences?competency=&url=&limit=&offset=
  GET /api/v1/experiences/{id}
"""
from __future__ import annotations

from typing import Any


def _competency_match(
    entry: dict[str, Any], competency: str, *, exact: bool
) -> bool:
    needle = (competency or "").strip()
    if not needle:
        return True
    alignments = entry.get("educationalAlignment") or []
    if not isinstance(alignments, list):
        return False
    for row in alignments:
        if not isinstance(row, dict):
            continue
        val = str(row.get("competency") or "")
        if exact:
            if val == needle:
                return True
        elif needle.lower() in val.lower():
            return True
    return False


def _url_match(entry: dict[str, Any], url: str, *, exact: bool) -> bool:
    needle = (url or "").strip()
    if not needle:
        return True
    val = str(entry.get("url") or "")
    if exact:
        return val == needle
    return needle.lower() in val.lower()


def filter_experiences(
    entries: list[dict[str, Any]],
    *,
    competency: str | None = None,
    url: str | None = None,
    limit: int = 1000,
    offset: int = 0,
    exact_matching: bool = False,
) -> list[dict[str, Any]]:
    """In-memory equivalent of xi-lite ``mongo.get`` + pagination."""
    lim = max(1, min(int(limit or 1000), 5000))
    off = max(0, int(offset or 0))
    out: list[dict[str, Any]] = []
    for entry in entries:
        if competency and not _competency_match(
            entry, competency, exact=exact_matching
        ):
            continue
        if url and not _url_match(entry, url, exact=exact_matching):
            continue
        out.append(entry)
    return out[off : off + lim]


def get_experience_by_id(
    entries: list[dict[str, Any]], experience_id: str
) -> dict[str, Any] | None:
    """xi-lite ``GET /api/v1/experiences/:id`` over an in-memory list."""
    want = str(experience_id or "").strip()
    if not want:
        return None
    for entry in entries:
        if str(entry.get("id") or entry.get("_id") or "") == want:
            return entry
    return None


def attach_handle(
    entry: dict[str, Any], *, base_url: str, root: str = "/api/v1"
) -> dict[str, Any]:
    """Mirror xi-lite ``handle`` URL assignment."""
    eid = str(entry.get("id") or entry.get("_id") or "")
    base = (base_url or "").rstrip("/")
    root_path = root if root.startswith("/") else f"/{root}"
    out = dict(entry)
    out["handle"] = f"{base}{root_path}/xi/experiences/{eid}"
    return out
