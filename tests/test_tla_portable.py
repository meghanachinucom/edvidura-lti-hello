"""Portable TLA shapes, xi-lite query port, CATAPULT requirements."""
from __future__ import annotations

from app.modules.tla.adl_refs import list_adl_refs
from app.modules.tla.cmi5_requirements import (
    get_requirement,
    load_cmi5_requirements,
    summarize_requirements,
)
from app.modules.tla.requirements import assess_requirements
from app.modules.tla.shapes import (
    SCHEMA_CATALOGUE,
    SCHEMA_EXPERIENCE,
    SCHEMA_PROFILE,
    SCHEMA_XI_COURSE,
    shape_catalogue_entry,
    shape_experience_from_xapi_row,
    shape_learner_profile,
    shape_xi_course_entry,
)
from app.modules.tla.xi_query import filter_experiences, get_experience_by_id
from app.modules.tla.service import maturity_report


def test_shape_catalogue_and_experience():
    entry = shape_catalogue_entry(
        {"id": "1", "slug": "a", "title": "Algebra", "status": "published"}
    )
    assert entry["schema"] == SCHEMA_CATALOGUE
    assert entry["activity_type"].endswith("/course")
    row = shape_experience_from_xapi_row(
        {
            "statement_id": "s1",
            "actor_sub": "u1",
            "verb_id": "http://adlnet.gov/expapi/verbs/completed",
            "object_id": "act:1",
            "tier": "transactional",
            "statement": {
                "verb": {
                    "id": "http://adlnet.gov/expapi/verbs/completed",
                    "display": {"en-US": "completed"},
                },
                "object": {
                    "id": "act:1",
                    "definition": {
                        "name": {"en-US": "Quiz"},
                        "type": "http://adlnet.gov/expapi/activities/assessment",
                    },
                },
                "result": {"success": True, "score": {"scaled": 0.9}},
            },
        }
    )
    assert row["schema"] == SCHEMA_EXPERIENCE
    assert row["verb_display"] == "completed"
    assert row["result"]["score_scaled"] == 0.9


def test_shape_profile_and_assess():
    prof = shape_learner_profile(
        subject="u1",
        tenant_id="t1",
        analytics={"attempt_count": 3},
        competencies=[{"skill_code": "lti_launch", "label": "LTI"}],
        experience_count=2,
    )
    assert prof["schema"] == SCHEMA_PROFILE
    assert prof["competency_count"] == 1
    report = assess_requirements()
    assert report["schema"] == "edvidura.tla.requirements.v2"
    assert report["maturity_pct"] > 0
    assert len(report["by_cmm"]) == 4
    assert any(i["id"] == "tla.cmm1.xapi_emit" for i in report["requirements"])


def test_xi_lite_query_port():
    entries = [
        shape_xi_course_entry(
            entry_id="c1",
            name="Algebra",
            url="https://app.example/learn/courses/c1",
            competencies=["http://example.org/comp/lti", "solve_linear"],
        ),
        shape_xi_course_entry(
            entry_id="c2",
            name="Geometry",
            url="https://app.example/learn/courses/c2",
            competencies=["geometry"],
        ),
    ]
    assert entries[0]["schema"] == SCHEMA_XI_COURSE
    hit = filter_experiences(entries, competency="solve_linear")
    assert len(hit) == 1 and hit[0]["id"] == "c1"
    hit2 = filter_experiences(entries, url="courses/c2")
    assert len(hit2) == 1 and hit2[0]["id"] == "c2"
    assert get_experience_by_id(entries, "c2")["name"] == "Geometry"


def test_cmi5_requirements_vendored():
    data = load_cmi5_requirements()
    assert len(data) > 100
    row = get_requirement("3.0.0.0-1")
    assert row and "txt" in row
    summary = summarize_requirements(limit=3)
    assert summary["count"] == len(data)
    assert len(summary["sample"]) == 3


def test_maturity_report_includes_adl_and_vendor():
    m = maturity_report()
    assert "adl_refs" in m
    assert any(r["id"] == "xi_lite" for r in list_adl_refs())
    assert m["vendored"]["cmi5_requirements"].endswith("requirements.json")
    assert "portable_modules" in m["reuse"]
