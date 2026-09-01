"""TLA-shaped read adapters (D06/D07/D16) — catalogue, experiences, profiles."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.modules import analytics as analytics_mod
from app.modules import content
from app.modules import skills as skills_mod
from app.modules import xapi as xapi_mod


def catalogue_courses(tenant_id: UUID | str) -> list[dict[str, Any]]:
    """Course catalogue entries for a tenant (published only)."""
    rows = content.list_published_courses(tenant_id)
    out: list[dict[str, Any]] = []
    for c in rows:
        out.append(
            {
                "id": str(c["id"]),
                "slug": str(c.get("slug") or ""),
                "title": str(c.get("title") or ""),
                "description": str(c.get("description") or ""),
                "status": str(c.get("status") or "published"),
            }
        )
    return out


def catalogue_course(
    tenant_id: UUID | str, course_id: UUID | str
) -> dict[str, Any] | None:
    course = content.get_course(tenant_id, course_id)
    if not course:
        return None
    lessons = content.list_lessons(tenant_id, course["id"])
    experiences = [
        {
            "id": str(L["id"]),
            "slug": str(L.get("slug") or ""),
            "title": str(L.get("title") or ""),
            "lesson_type": str(L.get("lesson_type") or "reading"),
            "position": int(L.get("position") or 0),
            "kind": "lesson",
        }
        for L in lessons
    ]
    return {
        "id": str(course["id"]),
        "slug": str(course.get("slug") or ""),
        "title": str(course.get("title") or ""),
        "description": str(course.get("description") or ""),
        "status": str(course.get("status") or "published"),
        "experiences": experiences,
    }


def experience_index(
    tenant_id: UUID | str,
    *,
    actor: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Experience index from stored xAPI statements (TLA-shaped read)."""
    rows = xapi_mod.list_statements(
        tenant_id, limit=limit, subject=(actor or None)
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        stmt = r.get("statement") or {}
        if isinstance(stmt, str):
            import json

            try:
                stmt = json.loads(stmt)
            except Exception:  # noqa: BLE001
                stmt = {}
        verb = (stmt.get("verb") or {}) if isinstance(stmt, dict) else {}
        obj = (stmt.get("object") or {}) if isinstance(stmt, dict) else {}
        out.append(
            {
                "statement_id": str(r.get("statement_id") or ""),
                "actor": str(r.get("actor_sub") or actor or ""),
                "verb_id": str(r.get("verb_id") or verb.get("id") or ""),
                "object_id": str(r.get("object_id") or obj.get("id") or ""),
                "tier": str(r.get("tier") or "noisy"),
                "timestamp": (
                    r["created_at"].isoformat()
                    if hasattr(r.get("created_at"), "isoformat")
                    else str(r.get("created_at") or "")
                ),
            }
        )
    return out


def learner_profile(
    tenant_id: UUID | str, subject: str
) -> dict[str, Any]:
    """Learner profile view — analytics + competency catalogue size (LMS sub)."""
    sub = (subject or "").strip()
    dash = analytics_mod.learner_dashboard(tenant_id, sub)
    try:
        skill_rows = skills_mod.list_skills(tenant_id)
    except Exception:  # noqa: BLE001
        skill_rows = []
    return {
        "subject": sub,
        "tenant_id": str(tenant_id),
        "analytics": dash,
        "competency_count": len(skill_rows),
        "competencies": [
            {
                "skill_code": s.get("skill_code"),
                "label": s.get("label"),
            }
            for s in skill_rows[:50]
        ],
    }
