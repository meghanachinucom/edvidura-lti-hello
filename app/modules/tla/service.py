"""EdVidura wiring for TLA adapters — portable shapes + vendored ADL contracts.

Pure / reusable (copy into another app):
  shapes, requirements, adl_refs, xi_query, cmi5_requirements, vendor/
Product wiring: this file.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import settings
from app.modules import analytics as analytics_mod
from app.modules import content
from app.modules import skills as skills_mod
from app.modules import xapi as xapi_mod
from app.modules.tla import adl_refs, requirements as req_mod
from app.modules.tla import cmi5_requirements, shapes, xi_query


def catalogue_courses(tenant_id: UUID | str) -> list[dict[str, Any]]:
    rows = content.list_published_courses(tenant_id)
    return [shapes.shape_catalogue_entry(dict(c)) for c in rows]


def catalogue_course(
    tenant_id: UUID | str, course_id: UUID | str
) -> dict[str, Any] | None:
    course = content.get_course(tenant_id, course_id)
    if not course:
        return None
    lessons = content.list_lessons(tenant_id, course["id"])
    return shapes.shape_catalogue_course(dict(course), [dict(L) for L in lessons])


def experience_index(
    tenant_id: UUID | str,
    *,
    actor: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    rows = xapi_mod.list_statements(
        tenant_id, limit=limit, subject=(actor or None)
    )
    return [
        shapes.shape_experience_from_xapi_row(dict(r), default_actor=actor)
        for r in rows
    ]


def learner_profile(
    tenant_id: UUID | str, subject: str
) -> dict[str, Any]:
    sub = (subject or "").strip()
    dash = analytics_mod.learner_dashboard(tenant_id, sub)
    try:
        skill_rows = skills_mod.list_skills(tenant_id)
    except Exception:  # noqa: BLE001
        skill_rows = []
    try:
        ex_count = len(
            xapi_mod.list_statements(tenant_id, limit=500, subject=sub)
        )
    except Exception:  # noqa: BLE001
        ex_count = None
    return shapes.shape_learner_profile(
        subject=sub,
        tenant_id=str(tenant_id),
        analytics=dict(dash) if isinstance(dash, dict) else {"raw": dash},
        competencies=[dict(s) for s in skill_rows],
        experience_count=ex_count,
    )


def _skill_codes(tenant_id: UUID | str) -> list[str]:
    try:
        return [
            str(s.get("skill_code") or "")
            for s in skills_mod.list_skills(tenant_id)
            if s.get("skill_code")
        ]
    except Exception:  # noqa: BLE001
        return []


def build_xi_entries(tenant_id: UUID | str) -> list[dict[str, Any]]:
    """Build ADL xi-lite Course documents from published courses + lessons."""
    base = (getattr(settings, "app_base_url", None) or "").rstrip("/")
    codes = _skill_codes(tenant_id)
    entries: list[dict[str, Any]] = []
    for c in content.list_published_courses(tenant_id):
        cid = str(c["id"])
        course_url = f"{base}/learn/courses/{cid}" if base else f"course:{cid}"
        entries.append(
            shapes.shape_xi_course_entry(
                entry_id=cid,
                name=str(c.get("title") or ""),
                description=str(c.get("description") or ""),
                url=course_url,
                competencies=codes[:20],
            )
        )
        try:
            lessons = content.list_lessons(tenant_id, c["id"])
        except Exception:  # noqa: BLE001
            lessons = []
        for L in lessons:
            lid = str(L["id"])
            lesson_url = (
                f"{base}/learn/lessons/{lid}" if base else f"lesson:{lid}"
            )
            entries.append(
                shapes.shape_xi_course_entry(
                    entry_id=lid,
                    name=str(L.get("title") or ""),
                    description=str(L.get("lesson_type") or "lesson"),
                    url=lesson_url,
                    competencies=codes[:20],
                )
            )
    return entries


def xi_experiences(
    tenant_id: UUID | str,
    *,
    competency: str | None = None,
    url: str | None = None,
    limit: int = 1000,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """xi-lite compatible Experience Index listing."""
    base = (getattr(settings, "app_base_url", None) or "").rstrip("/")
    entries = build_xi_entries(tenant_id)
    filtered = xi_query.filter_experiences(
        entries,
        competency=competency,
        url=url,
        limit=limit,
        offset=offset,
    )
    return [
        xi_query.attach_handle(e, base_url=base or "http://localhost", root="/api/v1")
        for e in filtered
    ]


def xi_experience(
    tenant_id: UUID | str, experience_id: str
) -> dict[str, Any] | None:
    base = (getattr(settings, "app_base_url", None) or "").rstrip("/")
    entry = xi_query.get_experience_by_id(build_xi_entries(tenant_id), experience_id)
    if not entry:
        return None
    return xi_query.attach_handle(
        entry, base_url=base or "http://localhost", root="/api/v1"
    )


def maturity_report(
    evidence: dict[str, req_mod.Status] | None = None,
) -> dict[str, Any]:
    report = req_mod.assess_requirements(evidence)
    report["adl_refs"] = adl_refs.list_adl_refs()
    report["cmi5"] = cmi5_requirements.summarize_requirements(limit=5)
    report["vendored"] = {
        "xi_lite": "app/modules/tla/vendor/xi_lite/",
        "cmi5_requirements": "app/modules/tla/vendor/cmi5/requirements.json",
        "attribution": "app/modules/tla/vendor/ATTRIBUTION.md",
    }
    report["reuse"] = {
        "portable_modules": [
            "app.modules.tla.shapes",
            "app.modules.tla.requirements",
            "app.modules.tla.adl_refs",
            "app.modules.tla.xi_query",
            "app.modules.tla.cmi5_requirements",
            "app.modules.tla.vendor",
        ],
        "note": (
            "Copy portable modules + vendor/ into another app; keep service.py "
            "as product-specific wiring to your content/xAPI stores."
        ),
    }
    return report
