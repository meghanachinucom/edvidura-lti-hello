"""Propose + persist lab packs from *school-owned* textbook text (no fixed curriculum)."""
from __future__ import annotations

import json
import re
from typing import Any
from uuid import UUID

from app import db
from app.modules.sme.service import split_manual_sections

MAX_BODY_MD_CHARS = 100_000
MAX_PACK_JSON_CHARS = 48_000
MAX_CALLOUTS = 24
MAX_PRESETS = 12
ALLOWED_PLAYGROUNDS = frozenset(
    {
        "cartesian",
        "number_line",
        "geometry",
        "science_demo",
        "match_tap",
        "quiz_micro",
    }
)
ALLOWED_AGE_BANDS = frozenset({"foundations", "core", "secondary"})
ALLOWED_ACTIONS = frozenset({"focus", "set", "cite"})
ALLOWED_TARGETS = frozenset({"line", "rise", "run", "b"})


def _slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s or "item")[:64]


def sanitize_lab_pack(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Allowlist + size-bound pack payload before persistence."""
    src = raw if isinstance(raw, dict) else {}
    playground = str(src.get("playground_type") or "cartesian").strip().lower()
    if playground not in ALLOWED_PLAYGROUNDS:
        playground = "cartesian"
    band = str(src.get("age_band") or "secondary").strip().lower()
    if band not in ALLOWED_AGE_BANDS:
        band = "secondary"
    callouts_in = src.get("callouts") if isinstance(src.get("callouts"), list) else []
    callouts: list[dict[str, Any]] = []
    for item in callouts_in[:MAX_CALLOUTS]:
        if not isinstance(item, dict):
            continue
        action = str(item.get("action") or "focus").strip().lower()
        if action not in ALLOWED_ACTIONS:
            action = "focus"
        target = str(item.get("target") or "line").strip().lower()
        if target not in ALLOWED_TARGETS:
            target = "line"
        callouts.append(
            {
                "id": _slug(str(item.get("id") or item.get("label") or "idea"))[:64],
                "label": str(item.get("label") or "Idea")[:120],
                "body": str(item.get("body") or "")[:400],
                "action": action,
                "target": target,
            }
        )
    presets_in = src.get("presets") if isinstance(src.get("presets"), list) else []
    presets: list[dict[str, Any]] = []
    for item in presets_in[:MAX_PRESETS]:
        if not isinstance(item, dict):
            continue
        try:
            m = float(item.get("m"))
            b = float(item.get("b"))
        except (TypeError, ValueError):
            continue
        if abs(m) > 20 or abs(b) > 20:
            continue
        presets.append(
            {
                "label": str(item.get("label") or f"m={m}")[:40],
                "m": round(m, 4),
                "b": round(b, 4),
            }
        )
    out = {
        "title": str(src.get("title") or "Interactive chapter")[:200],
        "chapter_slug": _slug(str(src.get("chapter_slug") or "overview"))[:80],
        "playground_type": playground,
        "age_band": band,
        "callouts": callouts,
        "presets": presets,
        "textbook_excerpt": str(src.get("textbook_excerpt") or "")[:1200],
        "note": str(src.get("note") or "")[:300],
    }
    encoded = json.dumps(out, separators=(",", ":"))
    if len(encoded) > MAX_PACK_JSON_CHARS:
        out["callouts"] = out["callouts"][:8]
        out["textbook_excerpt"] = out["textbook_excerpt"][:400]
        out["note"] = "Pack truncated for size limits."
    return out


def propose_lab_pack(
    *,
    title: str = "",
    body_md: str = "",
    chapter_slug: str | None = None,
    age_band: str | None = None,
) -> dict[str, Any]:
    """Heuristic draft from the school's chapter text (teacher must approve).

    Does not assume Class 1–10 content — only inspects the uploaded/pasted body.
    """
    text = (body_md or "").strip()
    if len(text) > MAX_BODY_MD_CHARS:
        text = text[:MAX_BODY_MD_CHARS]
    low = text.lower()
    sections = split_manual_sections(text)
    slug = (chapter_slug or "").strip() or (
        sections[0]["slug"] if sections else "overview"
    )
    chapter_title = (title or "").strip()
    if not chapter_title and sections:
        chapter_title = sections[0].get("title") or "Chapter"
    if not chapter_title:
        chapter_title = "Interactive chapter"

    band = (age_band or "").strip().lower()
    if band not in {"foundations", "core", "secondary"}:
        # Light hint from language density — still overridden by teacher
        if len(text) < 400 or any(
            w in low for w in ("count", "colour", "color", "picture", "trace")
        ):
            band = "foundations"
        elif any(w in low for w in ("fraction", "decimal", "perimeter", "area")):
            band = "core"
        else:
            band = "secondary"

    playground = "cartesian"
    if any(w in low for w in ("fraction", "numerator", "denominator", "number line")):
        playground = "number_line"
    elif any(w in low for w in ("triangle", "circle", "solid", "geometry", "angle")):
        playground = "geometry"
    elif any(w in low for w in ("energy", "force", "circuit", "cell", "photosynthesis")):
        playground = "science_demo"
    elif band == "foundations":
        playground = "match_tap"

    callouts: list[dict[str, Any]] = []
    if playground == "cartesian" or any(
        w in low for w in ("slope", "intercept", "cartesian", "linear", "graph")
    ):
        playground = "cartesian"
        callouts = [
            {
                "id": "line",
                "label": "The line",
                "body": "All points (x, mx + b) on the graph.",
                "action": "focus",
                "target": "line",
            },
            {
                "id": "rise",
                "label": "Rise (Δy)",
                "body": "How much y changes when x increases.",
                "action": "focus",
                "target": "rise",
            },
            {
                "id": "run",
                "label": "Run (Δx)",
                "body": "Horizontal step. Slope m = rise ÷ run.",
                "action": "focus",
                "target": "run",
            },
            {
                "id": "b",
                "label": "Intercept b",
                "body": "Where the line crosses the y-axis (x = 0).",
                "action": "focus",
                "target": "b",
            },
        ]
    else:
        # Generic: turn first headings / sentences into callouts (cite + quiz later)
        source = sections[:4] if sections else []
        if not source and text:
            bits = re.split(r"(?<=[.!?])\s+", text)
            source = [
                {"slug": f"p{i}", "title": f"Idea {i}", "body": b.strip()[:220]}
                for i, b in enumerate(bits[:4], start=1)
                if b.strip()
            ]
        for sec in source:
            callouts.append(
                {
                    "id": _slug(str(sec.get("slug") or sec.get("title") or "idea")),
                    "label": str(sec.get("title") or "Idea")[:80],
                    "body": str(sec.get("body") or "")[:240],
                    "action": "focus",
                    "target": "line",
                }
            )

    presets: list[dict[str, Any]] = []
    if playground == "cartesian":
        presets = [
            {"label": "m=1, b=0", "m": 1, "b": 0},
            {"label": "Steep", "m": 2, "b": -1},
            {"label": "Negative", "m": -1.5, "b": 2},
            {"label": "Flat", "m": 0, "b": 2},
        ]

    clean = sanitize_lab_pack(
        {
            "title": chapter_title[:200],
            "chapter_slug": slug,
            "playground_type": playground,
            "age_band": band,
            "callouts": callouts,
            "presets": presets,
            "textbook_excerpt": text[:1200],
            "note": (
                "Draft from this school's text only — teacher reviews before publish. "
                "No global Class 1–10 corpus required."
            ),
        }
    )
    clean["product"] = "Adaptive interactive lab"
    clean["state"] = "draft_proposal"
    return clean


def upsert_lab_pack(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str | None,
    chapter_slug: str,
    pack: dict[str, Any],
    created_by: str = "",
    status: str = "draft",
) -> dict[str, Any]:
    """Save teacher-approved (or draft) pack for a tenant chapter.

    Publish must go through ``publish_lab_pack`` — save never accepts published.
    """
    clean = sanitize_lab_pack(pack)
    slug = _slug(chapter_slug or clean.get("chapter_slug") or "overview")
    # Security: only draft/archived via upsert; publish is a separate action.
    st = "archived" if status == "archived" else "draft"
    title = str(clean.get("title") or slug)[:200]
    playground = str(clean.get("playground_type") or "cartesian")
    band = str(clean.get("age_band") or "secondary")
    body = json.dumps(clean, separators=(",", ":"))
    mid = str(manual_id) if manual_id else None

    with db.tenant_connection(tenant_id) as conn:
        existing = None
        if mid:
            existing = conn.execute(
                """
                SELECT id FROM lab_packs
                WHERE manual_id = %s::uuid AND chapter_slug = %s
                LIMIT 1
                """,
                (mid, slug),
            ).fetchone()
        if existing:
            row = conn.execute(
                """
                UPDATE lab_packs SET
                    title = %s,
                    playground_type = %s,
                    age_band = %s,
                    status = %s,
                    pack = %s::jsonb,
                    created_by = %s,
                    updated_at = now()
                WHERE id = %s::uuid
                RETURNING id, tenant_id, manual_id, chapter_slug, title,
                          playground_type, age_band, status, pack, created_at, updated_at
                """,
                (
                    title,
                    playground,
                    band,
                    st,
                    body,
                    (created_by or "")[:200],
                    str(existing["id"]),
                ),
            ).fetchone()
        else:
            row = conn.execute(
                """
                INSERT INTO lab_packs (
                    tenant_id, manual_id, chapter_slug, title, playground_type,
                    age_band, status, pack, created_by, updated_at
                ) VALUES (
                    %s::uuid, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, now()
                )
                RETURNING id, tenant_id, manual_id, chapter_slug, title,
                          playground_type, age_band, status, pack, created_at, updated_at
                """,
                (
                    str(tenant_id),
                    mid,  # may be None
                    slug,
                    title,
                    playground,
                    band,
                    st,
                    body,
                    (created_by or "")[:200],
                ),
            ).fetchone()
    return _row(row)


def get_lab_pack(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str | None = None,
    chapter_slug: str = "overview",
    pack_id: UUID | str | None = None,
    published_only: bool = False,
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        if pack_id:
            row = conn.execute(
                """
                SELECT id, tenant_id, manual_id, chapter_slug, title,
                       playground_type, age_band, status, pack, created_at, updated_at
                FROM lab_packs WHERE id = %s::uuid
                """,
                (str(pack_id),),
            ).fetchone()
        elif manual_id:
            row = conn.execute(
                """
                SELECT id, tenant_id, manual_id, chapter_slug, title,
                       playground_type, age_band, status, pack, created_at, updated_at
                FROM lab_packs
                WHERE manual_id = %s::uuid AND chapter_slug = %s
                """,
                (str(manual_id), (chapter_slug or "overview").strip() or "overview"),
            ).fetchone()
        else:
            return None
    if not row:
        return None
    out = _row(row)
    if published_only and out.get("status") != "published":
        return None
    return out


def list_lab_packs(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str | None = None,
    published_only: bool = False,
) -> list[dict[str, Any]]:
    clauses = ["TRUE"]
    params: list[Any] = []
    if manual_id:
        clauses.append("manual_id = %s::uuid")
        params.append(str(manual_id))
    if published_only:
        clauses.append("status = 'published'")
    where = " AND ".join(clauses)
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            f"""
            SELECT id, tenant_id, manual_id, chapter_slug, title,
                   playground_type, age_band, status, pack, created_at, updated_at
            FROM lab_packs
            WHERE {where}
            ORDER BY updated_at DESC
            LIMIT 100
            """,
            tuple(params),
        ).fetchall()
    return [_row(r) for r in rows]


def publish_lab_pack(tenant_id: UUID | str, pack_id: UUID | str) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE lab_packs
            SET status = 'published', updated_at = now()
            WHERE id = %s::uuid
            RETURNING id, tenant_id, manual_id, chapter_slug, title,
                      playground_type, age_band, status, pack, created_at, updated_at
            """,
            (str(pack_id),),
        ).fetchone()
    return _row(row) if row else None


def _row(row: Any) -> dict[str, Any]:
    d = dict(row)
    d["id"] = str(d["id"])
    d["tenant_id"] = str(d["tenant_id"])
    if d.get("manual_id"):
        d["manual_id"] = str(d["manual_id"])
    pack = d.get("pack")
    if isinstance(pack, str):
        try:
            pack = json.loads(pack)
        except Exception:  # noqa: BLE001
            pack = {}
    d["pack"] = sanitize_lab_pack(pack if isinstance(pack, dict) else {})
    return d
