"""Tenant segment + capability flags (school vs corporate vs government).

Same app; each client tenant picks segment + optional capability overrides
+ content packs (e.g. school Class 8 vs government Chaganti vs corporate welding).

School: class path, Ask Vidura, graded quiz / AGS, manuals.
Corporate: video library first; exams off by default.
Government: public pravachana library; no Moodle, no exams.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

SEGMENTS = ("school", "corporate", "government")

# Stable keys used by shell / App API / gates.
CAP_KEYS = (
    "lessons",
    "manuals",
    "video_library",
    "ask_vidura",
    "flashcards",
    "quiz_graded",
    "quiz_practice",
    "ghost_coach_gate",
    "study_plan",
    "learner_progress",
)

_SCHOOL: dict[str, bool] = {
    "lessons": True,
    "manuals": True,
    "video_library": True,
    "ask_vidura": True,
    "flashcards": True,
    "quiz_graded": True,
    "quiz_practice": True,
    "ghost_coach_gate": True,
    "study_plan": True,
    "learner_progress": True,
}

_CORPORATE: dict[str, bool] = {
    "lessons": False,
    "manuals": False,
    "video_library": True,
    "ask_vidura": True,
    "flashcards": False,
    "quiz_graded": False,
    "quiz_practice": False,
    "ghost_coach_gate": False,
    "study_plan": False,
    "learner_progress": True,
}

_GOVERNMENT: dict[str, bool] = {
    "lessons": False,
    "manuals": True,
    "video_library": True,
    "ask_vidura": True,
    "flashcards": False,
    "quiz_graded": False,
    "quiz_practice": False,
    "ghost_coach_gate": False,
    "study_plan": False,
    "learner_progress": True,
}


def normalize_segment(raw: Any) -> str:
    s = str(raw or "school").strip().lower()
    if s in {"corp", "company", "enterprise", "training", "l&d", "ld"}:
        return "corporate"
    if s in {
        "gov",
        "govt",
        "government",
        "public",
        "cultural",
        "pravachana",
        "chaganti",
    }:
        return "government"
    if s in SEGMENTS:
        return s
    return "school"


def defaults_for_segment(segment: Any) -> dict[str, bool]:
    seg = normalize_segment(segment)
    if seg == "corporate":
        return dict(_CORPORATE)
    if seg == "government":
        return dict(_GOVERNMENT)
    return dict(_SCHOOL)


def merge_capabilities(
    segment: Any,
    stored: dict[str, Any] | None = None,
) -> dict[str, bool]:
    """Segment defaults, then optional per-tenant overrides."""
    out = defaults_for_segment(segment)
    if isinstance(stored, dict):
        for key in CAP_KEYS:
            if key in stored:
                out[key] = bool(stored[key])
    return out


def can(caps: dict[str, Any] | None, key: str) -> bool:
    if not caps:
        return bool(_SCHOOL.get(key, False))
    return bool(caps.get(key, False))


def profile_from_row(row: dict[str, Any] | None) -> dict[str, Any]:
    row = row or {}
    segment = normalize_segment(row.get("segment"))
    raw_caps = row.get("capabilities")
    if isinstance(raw_caps, str):
        import json

        try:
            raw_caps = json.loads(raw_caps)
        except Exception:  # noqa: BLE001
            raw_caps = {}
    caps = merge_capabilities(
        segment, raw_caps if isinstance(raw_caps, dict) else None
    )
    return {
        "segment": segment,
        "capabilities": caps,
        "is_corporate": segment == "corporate",
        "is_school": segment == "school",
        "is_government": segment == "government",
    }


def profile_for_tenant(tenant_id: UUID | str) -> dict[str, Any]:
    from app import db

    try:
        row = db.get_tenant(tenant_id)
    except Exception:  # noqa: BLE001
        row = None
    return profile_from_row(row)


def attach_to_session(session: dict[str, Any]) -> dict[str, Any]:
    """Ensure session has segment + capabilities (refresh from DB when possible)."""
    tid = session.get("tenant_id")
    if tid:
        profile = profile_for_tenant(tid)
    else:
        profile = profile_from_row(
            {
                "segment": session.get("segment") or "school",
                "capabilities": session.get("capabilities"),
            }
        )
    session["segment"] = profile["segment"]
    session["capabilities"] = profile["capabilities"]
    session["is_corporate"] = profile["is_corporate"]
    session["is_school"] = profile.get("is_school", profile["segment"] == "school")
    session["is_government"] = profile.get(
        "is_government", profile["segment"] == "government"
    )
    tid = session.get("tenant_id")
    if tid:
        try:
            from app import db as _db

            row = _db.get_tenant(tid) or {}
            session.setdefault(
                "preferred_language", str(row.get("preferred_language") or "")
            )
            session.setdefault(
                "preferred_state", str(row.get("preferred_state") or "")
            )
            session.setdefault("tenant_name", str(row.get("name") or ""))
        except Exception:  # noqa: BLE001
            pass
    return session


__all__ = [
    "CAP_KEYS",
    "SEGMENTS",
    "attach_to_session",
    "can",
    "defaults_for_segment",
    "merge_capabilities",
    "normalize_segment",
    "profile_for_tenant",
    "profile_from_row",
]
