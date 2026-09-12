"""Present xAPI rows as an activity feed for shell UI (portable helpers)."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from app.modules.xapi import verbs
from app.modules.xapi.service import list_statements

_EXT = "https://edvidura.local/xapi/extensions/"

_VERB_LABELS = {
    verbs.VERB_COMPLETED: "Completed",
    verbs.VERB_ATTEMPTED: "Attempted",
    verbs.VERB_PASSED: "Passed",
    verbs.VERB_FAILED: "Failed",
    verbs.VERB_EXPERIENCED: "Opened",
    verbs.VERB_MASTERED: "Mastered",
    verbs.VERB_INTERACTED: "Coach chat",
}


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:  # noqa: BLE001
            return {}
    return {}


def _short_object(object_id: str) -> str:
    oid = (object_id or "").rstrip("/")
    if not oid:
        return "—"
    if "/study-coach" in oid:
        return "Study coach"
    parts = oid.split("/")
    if len(parts) >= 2 and parts[-2] in {
        "lesson",
        "quiz",
        "manual",
        "skill",
        "activities",
    }:
        return f"{parts[-2]}: {parts[-1][:36]}"
    return parts[-1][:48] or "—"


def present_statement_row(row: dict[str, Any]) -> dict[str, Any]:
    """Map a DB xAPI row to a UI-friendly activity card."""
    stmt = _as_dict(row.get("statement"))
    verb_id = str(row.get("verb_id") or (stmt.get("verb") or {}).get("id") or "")
    obj = stmt.get("object") if isinstance(stmt.get("object"), dict) else {}
    obj_def = obj.get("definition") if isinstance(obj.get("definition"), dict) else {}
    name = ""
    if isinstance(obj_def.get("name"), dict):
        name = str(obj_def["name"].get("en-US") or obj_def["name"].get("en") or "")
    ctx = stmt.get("context") if isinstance(stmt.get("context"), dict) else {}
    ext = ctx.get("extensions") if isinstance(ctx.get("extensions"), dict) else {}
    result = stmt.get("result") if isinstance(stmt.get("result"), dict) else {}

    preview = str(ext.get(f"{_EXT}question_preview") or "")
    full_msg = str(ext.get(f"{_EXT}message_text") or "")
    grounded = ext.get(f"{_EXT}grounded")
    citations = ext.get(f"{_EXT}citation_count")
    course = str(ext.get(f"{_EXT}course_label") or "")
    refusal = str(ext.get(f"{_EXT}refusal_reason") or "")
    thread_id = str(ext.get(f"{_EXT}thread_id") or "")
    access_level = str(ext.get(f"{_EXT}access_level") or "")
    actor_name = ""
    actor = stmt.get("actor") if isinstance(stmt.get("actor"), dict) else {}
    if actor.get("name"):
        actor_name = str(actor["name"])

    created = row.get("created_at")
    when = (
        created.isoformat()
        if hasattr(created, "isoformat")
        else str(created or stmt.get("timestamp") or "")
    )

    detail_bits: list[str] = []
    if full_msg:
        detail_bits.append(full_msg[:200] + ("…" if len(full_msg) > 200 else ""))
    elif preview:
        detail_bits.append(preview)
    elif verb_id == verbs.VERB_INTERACTED:
        qlen = ext.get(f"{_EXT}question_len")
        if qlen:
            detail_bits.append(f"Question ({qlen} chars)")
    if thread_id:
        detail_bits.append(f"Thread {thread_id[-12:]}")
    if access_level:
        detail_bits.append(f"Access:{access_level}")
    if grounded is True:
        detail_bits.append("Grounded")
    elif grounded is False and verb_id == verbs.VERB_INTERACTED:
        detail_bits.append("Not grounded")
    if citations not in (None, "", 0):
        detail_bits.append(f"{citations} citations")
    if refusal:
        detail_bits.append(f"Refusal: {refusal}")
    if course:
        detail_bits.append(course)
    score = result.get("score") if isinstance(result.get("score"), dict) else None
    if score and score.get("raw") is not None:
        detail_bits.append(
            f"Score {score.get('raw')}/{score.get('max') or '?'}"
        )

    return {
        "statement_id": str(row.get("statement_id") or ""),
        "when": when,
        "actor_sub": str(row.get("actor_sub") or ""),
        "actor_name": actor_name or str(row.get("actor_sub") or "Learner"),
        "verb_id": verb_id,
        "verb_label": _VERB_LABELS.get(verb_id) or verb_id.rsplit("/", 1)[-1],
        "object_id": str(row.get("object_id") or obj.get("id") or ""),
        "object_label": name or _short_object(str(row.get("object_id") or "")),
        "tier": str(row.get("tier") or ""),
        "sent_to_lrs": bool(row.get("sent_to_lrs")),
        "detail": " · ".join(detail_bits) if detail_bits else "",
        "question_preview": preview or full_msg[:120],
        "message_text": full_msg,
        "thread_id": thread_id,
        "access_level": access_level,
        "grounded": grounded,
        "citation_count": citations,
    }


def activity_feed(
    tenant_id: UUID | str,
    *,
    subject: str | None = None,
    limit: int = 100,
    verb_id: str | None = None,
) -> list[dict[str, Any]]:
    """RLS-scoped activity list for learner / teacher / school-admin UI."""
    rows = list_statements(
        tenant_id,
        limit=min(max(int(limit), 1), 500),
        subject=(subject.strip() if subject else None),
    )
    out = [present_statement_row(dict(r)) for r in rows]
    if verb_id:
        want = verb_id.strip()
        out = [r for r in out if r["verb_id"] == want]
    return out
