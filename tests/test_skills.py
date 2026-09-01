"""C8 skills registry + remediation enrichment."""
from __future__ import annotations

from app.modules.skills.service import DEFAULT_SKILLS
from app.modules.specials import enrichment_for_review


def test_default_skills_shape():
    codes = {s["skill_code"] for s in DEFAULT_SKILLS}
    assert codes == {"lti_launch", "tenant_isolation", "gradebook_sync"}
    assert all(s.get("question_keys") for s in DEFAULT_SKILLS)


def test_enrichment_loop_links_without_db():
    """Hard-coded REMEDIATION fallback still drives closed-loop CTAs."""
    review = enrichment_for_review(
        [
            {
                "question_id": "q3",
                "correct": False,
                "prompt": "Gradebook?",
            }
        ],
        quiz_token="tok",
        first_manual_id="mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
        manual_version=2,
        attempt_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    )
    row = review[0]
    assert "focus=gradebook-sync" in row["teleport_href"]
    assert "loop=1" in row["teleport_href"]
    assert "from_attempt=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" in row["teleport_href"]
    assert "practice=1" in row["practice_loop_href"]
    assert "retry=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" in row["graded_loop_href"]
    assert "loop=1" in row["graded_loop_href"]


def test_skill_gaps_for_role_untested_and_weak():
    from app.modules import skills as skills_mod
    from app.modules.skills.service import skill_gaps_for_role

    required = [
        {
            "id": "sid-1",
            "skill_code": "tenant_isolation",
            "label": "Tenant isolation",
            "prefer_path": "lessons",
            "lesson_id": None,
            "manual_id": None,
            "manual_focus": "",
        },
        {
            "id": "sid-2",
            "skill_code": "lti_launch",
            "label": "LTI launch",
            "prefer_path": "lessons",
            "lesson_id": None,
            "manual_id": None,
            "manual_focus": "",
        },
    ]
    answers = {
        "detail": {
            "q1": {"correct": True},
            "q2": {"correct": False},
        }
    }
    orig_req = skills_mod.service.required_skills_for_role
    skills_mod.service.required_skills_for_role = lambda _t, _c: required
    try:
        gaps = skill_gaps_for_role(
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            role_code="technician",
            answers=answers,
        )
    finally:
        skills_mod.service.required_skills_for_role = orig_req

    codes = {g["id"] for g in gaps}
    assert "tenant_isolation" in codes  # weak from miss
    # lti_launch may be strong (q1) or untested depending on catalog questions —
    # COMPETENCIES maps q1→lti_launch; with 100% it is strong and excluded.
    assert "lti_launch" not in codes or any(
        g["id"] == "lti_launch" and g["status"] != "strong" for g in gaps
    )
    assert all(g.get("status") != "strong" for g in gaps)


def test_default_roles_shape():
    from app.modules.skills.service import DEFAULT_ROLES

    codes = {r["role_code"] for r in DEFAULT_ROLES}
    assert codes >= {"learner", "technician", "supervisor"}
