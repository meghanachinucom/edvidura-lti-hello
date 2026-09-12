"""Pure TLA-shaped transformers — portable (no app / DB imports).

Copy into another product and feed plain dicts from that product's SoR.
Shapes follow ADL TLA reference concepts (catalogue, experience index,
learner profile) without requiring Kafka/ELRR runtime.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


SCHEMA_CATALOGUE = "edvidura.tla.catalogue.v1"
SCHEMA_EXPERIENCE = "edvidura.tla.experience.v1"
SCHEMA_PROFILE = "edvidura.tla.profile.v1"
SCHEMA_XI_COURSE = "edvidura.tla.xi_course.v1"  # ADL xi-lite / schema.org Course


def _iso(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()  # type: ignore[no-any-return]
        except Exception:  # noqa: BLE001
            pass
    return str(value)


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


def shape_catalogue_entry(course: dict[str, Any]) -> dict[str, Any]:
    """Map a course-like row to a TLA catalogue entry."""
    return {
        "schema": SCHEMA_CATALOGUE,
        "id": str(course.get("id") or ""),
        "slug": str(course.get("slug") or ""),
        "title": str(course.get("title") or ""),
        "description": str(course.get("description") or ""),
        "status": str(course.get("status") or "published"),
        "provider": str(course.get("provider") or "edvidura"),
        "activity_type": "http://adlnet.gov/expapi/activities/course",
    }


def shape_catalogue_course(
    course: dict[str, Any],
    lessons: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Course + nested experience opportunities (lessons)."""
    base = shape_catalogue_entry(course)
    experiences = []
    for L in lessons or []:
        experiences.append(
            {
                "id": str(L.get("id") or ""),
                "slug": str(L.get("slug") or ""),
                "title": str(L.get("title") or ""),
                "lesson_type": str(L.get("lesson_type") or "reading"),
                "position": int(L.get("position") or 0),
                "kind": "lesson",
                "activity_type": "http://adlnet.gov/expapi/activities/lesson",
            }
        )
    base["experiences"] = experiences
    return base


def shape_experience_from_xapi_row(
    row: dict[str, Any],
    *,
    default_actor: str | None = None,
) -> dict[str, Any]:
    """Map a stored xAPI row (or statement blob) to an Experience Index record."""
    stmt = _as_dict(row.get("statement"))
    verb = _as_dict(stmt.get("verb"))
    obj = _as_dict(stmt.get("object"))
    obj_def = _as_dict(obj.get("definition"))
    result = _as_dict(stmt.get("result"))
    score = _as_dict(result.get("score"))
    actor_sub = str(row.get("actor_sub") or default_actor or "")
    verb_id = str(row.get("verb_id") or verb.get("id") or "")
    object_id = str(row.get("object_id") or obj.get("id") or "")
    ts = row.get("created_at") or stmt.get("timestamp") or ""
    return {
        "schema": SCHEMA_EXPERIENCE,
        "statement_id": str(row.get("statement_id") or stmt.get("id") or ""),
        "actor": actor_sub,
        "verb_id": verb_id,
        "verb_display": str(
            (verb.get("display") or {}).get("en-US")
            or (verb.get("display") or {}).get("en")
            or ""
        ),
        "object_id": object_id,
        "object_name": str(
            (obj_def.get("name") or {}).get("en-US")
            or (obj_def.get("name") or {}).get("en")
            or ""
        ),
        "activity_type": str(obj_def.get("type") or ""),
        "tier": str(row.get("tier") or "noisy"),
        "timestamp": _iso(ts),
        "result": {
            "success": result.get("success"),
            "completion": result.get("completion"),
            "score_scaled": score.get("scaled"),
            "score_raw": score.get("raw"),
            "score_max": score.get("max"),
        }
        if result
        else None,
    }


def shape_learner_profile(
    *,
    subject: str,
    tenant_id: str,
    analytics: dict[str, Any] | None = None,
    competencies: list[dict[str, Any]] | None = None,
    experience_count: int | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """TLA / ELRR-inspired learner profile projection (not a full P2997 SoR)."""
    comps = []
    for s in competencies or []:
        comps.append(
            {
                "skill_code": s.get("skill_code") or s.get("code"),
                "label": s.get("label") or s.get("title") or s.get("name"),
                "framework": s.get("framework") or s.get("framework_id"),
            }
        )
    out: dict[str, Any] = {
        "schema": SCHEMA_PROFILE,
        "subject": (subject or "").strip(),
        "tenant_id": str(tenant_id),
        "identity": {
            "account_homePage": "lti",
            "name": (analytics or {}).get("display_name")
            or (analytics or {}).get("name"),
        },
        "analytics": analytics or {},
        "competency_count": len(comps),
        "competencies": comps[:100],
        "experience_count": experience_count,
        "updated_at": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
    }
    if extra:
        out["extensions"] = extra
    return out


def shape_xi_course_entry(
    *,
    entry_id: str,
    name: str,
    description: str = "",
    url: str = "",
    provider: str = "edvidura",
    competencies: list[str] | None = None,
) -> dict[str, Any]:
    """ADL xi-lite Experience Index document (schema.org Course shaped).

    Compatible with ``xi_query.filter_experiences`` (competency / url filters).
    """
    alignments = [
        {"competency": c, "alignmentType": "teaches"}
        for c in (competencies or [])
        if c
    ]
    return {
        "schema": SCHEMA_XI_COURSE,
        "@context": "https://schema.org",
        "@type": "Course",
        "id": str(entry_id),
        "name": str(name or ""),
        "description": str(description or ""),
        "url": str(url or ""),
        "provider": str(provider or "edvidura"),
        "educationalAlignment": alignments,
    }
