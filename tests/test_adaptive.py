"""C9 adaptive + C10 gap path (unit tests, no DB)."""
from __future__ import annotations

from app.modules.adaptive import (
    build_gap_path,
    recommend_next_lesson,
    weak_skills_from_attempt,
)
from app.modules.specials import COMPETENCIES


def _answers_miss_q2_q3():
    return {
        "detail": {
            "q1": {"correct": True},
            "q2": {"correct": False},
            "q3": {"correct": False},
        }
    }


def test_weak_skills_from_attempt_fallback_catalog():
    weak = weak_skills_from_attempt(_answers_miss_q2_q3(), tenant_id=None)
    ids = {w["id"] for w in weak}
    assert "tenant_isolation" in ids
    assert "gradebook_sync" in ids
    assert "lti_launch" not in ids


def test_build_gap_path_ordered_steps():
    attempt = {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "answers": _answers_miss_q2_q3(),
    }
    # Without DB skills, competency_profile still uses COMPETENCIES;
    # build_gap_path calls ensure_default_skills which may fail — catch via empty skills map.
    # Use tenant_id=None path: competency_profile works; ensure_default_skills will throw.
    # So we patch by not calling ensure — instead test with monkeypatch via import.
    from app.modules import adaptive as adaptive_mod

    # Force skill rows from COMPETENCIES-shaped remediation fallbacks
    skill_pack = [
        {
            "id": "s1",
            "skill_code": "tenant_isolation",
            "label": "Tenant isolation",
            "prefer_path": "lessons",
            "teleport_label": "Review: tenant isolation",
            "lesson_id": "llllllll-llll-llll-llll-llllllllllll",
            "manual_id": None,
            "manual_focus": "tenant-isolation",
            "question_keys": ["q2"],
        },
        {
            "id": "s2",
            "skill_code": "gradebook_sync",
            "label": "Gradebook sync",
            "prefer_path": "manuals",
            "teleport_label": "Review: gradebook",
            "lesson_id": None,
            "manual_id": "mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
            "manual_focus": "gradebook-sync",
            "question_keys": ["q3"],
        },
    ]

    orig = adaptive_mod.service.skills_mod.ensure_default_skills

    def _fake_skills(_tid):
        return skill_pack

    adaptive_mod.service.skills_mod.ensure_default_skills = _fake_skills
    try:
        path = build_gap_path(
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            attempt=attempt,
            quiz_token="tok",
            first_lesson_id="llllllll-llll-llll-llll-llllllllllll",
            first_manual_id="mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
            manual_version=1,
        )
    finally:
        adaptive_mod.service.skills_mod.ensure_default_skills = orig

    assert path["active"] is True
    kinds = [s["kind"] for s in path["steps"]]
    assert kinds.count("review") >= 2
    assert kinds[-2:] == ["practice", "graded"]
    assert "practice=1" in path["practice_href"]
    assert "retry=" in path["graded_href"]
    assert path["first_href"]


def test_recommend_next_lesson_adaptive_vs_linear():
    from app.modules import adaptive as adaptive_mod

    skill_pack = [
        {
            "id": "s1",
            "skill_code": "tenant_isolation",
            "label": "Tenant isolation",
            "prefer_path": "lessons",
            "lesson_id": "llllllll-llll-llll-llll-llllllllllll",
            "manual_id": None,
            "manual_focus": "",
            "question_keys": ["q2"],
            "teleport_label": "Review isolation",
        }
    ]
    orig = adaptive_mod.service.skills_mod.ensure_default_skills
    adaptive_mod.service.skills_mod.ensure_default_skills = lambda _t: skill_pack
    try:
        rec = recommend_next_lesson(
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            course_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
            attempt={
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "answers": _answers_miss_q2_q3(),
            },
            linear_next={
                "id": "nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn",
                "title": "Linear next",
                "lesson_type": "article",
            },
        )
    finally:
        adaptive_mod.service.skills_mod.ensure_default_skills = orig

    assert rec["mode"] == "adaptive"
    assert rec["lesson_id"] == "llllllll-llll-llll-llll-llllllllllll"

    linear = recommend_next_lesson(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        course_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        attempt=None,
        linear_next={
            "id": "nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn",
            "title": "Linear next",
            "lesson_type": "article",
        },
    )
    assert linear["mode"] == "linear"
    assert linear["lesson_id"].startswith("nnnn")


def test_competencies_catalog_keys():
    assert set(COMPETENCIES) >= {"lti_launch", "tenant_isolation", "gradebook_sync"}


def test_build_difference_path_uses_role_gaps():
    from app.modules import adaptive as adaptive_mod
    from app.modules.adaptive import build_difference_path

    skill_pack = [
        {
            "id": "s1",
            "skill_code": "tenant_isolation",
            "label": "Tenant isolation",
            "prefer_path": "lessons",
            "teleport_label": "Review isolation",
            "lesson_id": "llllllll-llll-llll-llll-llllllllllll",
            "manual_id": None,
            "manual_focus": "",
            "question_keys": ["q2"],
        },
        {
            "id": "s2",
            "skill_code": "gradebook_sync",
            "label": "Gradebook sync",
            "prefer_path": "manuals",
            "teleport_label": "Review gradebook",
            "lesson_id": None,
            "manual_id": "mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
            "manual_focus": "gradebook-sync",
            "question_keys": ["q3"],
        },
    ]
    gaps = [
        {
            "id": "tenant_isolation",
            "label": "Tenant isolation",
            "status": "weak",
            "percent": 0,
            "prefer_path": "lessons",
            "lesson_id": "llllllll-llll-llll-llll-llllllllllll",
        }
    ]
    orig_skills = adaptive_mod.service.skills_mod.ensure_default_skills
    orig_gaps = adaptive_mod.service.skills_mod.skill_gaps_for_role
    adaptive_mod.service.skills_mod.ensure_default_skills = lambda _t: skill_pack
    adaptive_mod.service.skills_mod.skill_gaps_for_role = (
        lambda _t, **_kw: gaps
    )
    try:
        path = build_difference_path(
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            role_code="technician",
            attempt={
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "answers": _answers_miss_q2_q3(),
            },
            quiz_token="tok",
            first_lesson_id="llllllll-llll-llll-llll-llllllllllll",
        )
    finally:
        adaptive_mod.service.skills_mod.ensure_default_skills = orig_skills
        adaptive_mod.service.skills_mod.skill_gaps_for_role = orig_gaps

    assert path["active"] is True
    assert path["mode"] == "difference"
    assert path["role_code"] == "technician"
    assert path["skills"][0]["id"] == "tenant_isolation"
    assert any("Role gap" in (s.get("meta") or "") for s in path["steps"])


def test_dct_planner_pack_splits_missing():
    from app.modules import adaptive as adaptive_mod
    from app.modules.adaptive import dct_planner_pack

    pack_skills = [
        {"id": "1", "skill_code": "a", "label": "A", "lesson_id": "L1"},
        {"id": "2", "skill_code": "b", "label": "B", "lesson_id": None},
        {"id": "3", "skill_code": "c", "label": "C", "lesson_id": ""},
    ]
    orig = adaptive_mod.service.skills_mod.ensure_default_skills
    adaptive_mod.service.skills_mod.ensure_default_skills = lambda _t: pack_skills
    try:
        out = dct_planner_pack("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    finally:
        adaptive_mod.service.skills_mod.ensure_default_skills = orig
    assert out["covered_count"] == 1
    assert out["missing_count"] == 2
    assert {s["skill_code"] for s in out["missing"]} == {"b", "c"}


def test_href_token_strip_and_restore():
    from app.modules.adaptive import href_with_token, href_without_token

    raw = "/manuals/m1?token=old&v=2&focus=x&loop=1"
    bare = href_without_token(raw)
    assert "token=" not in bare
    assert "v=2" in bare
    restored = href_with_token(bare, "newtok")
    assert "token=newtok" in restored
    assert "focus=x" in restored


def test_order_lessons_for_gaps_priority_first():
    from app.modules.adaptive import order_lessons_for_gaps

    lessons = [
        {"id": "l1", "title": "Intro", "lesson_type": "article", "position": 1},
        {"id": "l2", "title": "Isolation", "lesson_type": "article", "position": 2},
        {"id": "l3", "title": "Wrap", "lesson_type": "article", "position": 3},
        {"id": "lq", "title": "Quiz", "lesson_type": "quiz", "position": 4},
    ]
    skills = [
        {
            "skill_code": "tenant_isolation",
            "label": "Tenant isolation",
            "lesson_id": "l2",
        }
    ]
    result = order_lessons_for_gaps(
        lessons,
        weak_skill_codes=["tenant_isolation"],
        skill_rows=skills,
        completed_ids=set(),
    )
    assert result["order_mode"] == "adaptive"
    assert [L["id"] for L in result["lessons"]] == ["l2", "l1", "l3", "lq"]
    assert result["priority_ids"] == ["l2"]
    assert result["next_lesson"]["id"] == "l2"
    assert result["reasons"]["l2"] == "Tenant isolation"

    linear = order_lessons_for_gaps(
        lessons,
        weak_skill_codes=[],
        skill_rows=skills,
        completed_ids=set(),
    )
    assert linear["order_mode"] == "linear"
    assert [L["id"] for L in linear["lessons"]] == ["l1", "l2", "l3", "lq"]


def test_serialize_and_hydrate_plan_progress():
    from app.modules.adaptive import hydrate_plan, serialize_steps_for_storage

    gap = {
        "active": True,
        "attempt_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "skills": [{"id": "tenant_isolation", "label": "Tenant isolation"}],
        "steps": [
            {
                "kind": "review",
                "n": 1,
                "skill_code": "tenant_isolation",
                "label": "Review isolation",
                "href": "/lessons/l1?token=tok&loop=1",
                "meta": "Gap",
            },
            {
                "kind": "practice",
                "n": 2,
                "label": "Practice",
                "href": "/quiz?token=tok&practice=1",
                "meta": "",
            },
            {
                "kind": "graded",
                "n": 3,
                "label": "Graded",
                "href": "/quiz?token=tok&retry=a",
                "meta": "",
            },
        ],
    }
    steps = serialize_steps_for_storage(gap)
    assert steps[0]["key"] == "review:tenant_isolation"
    assert "token=" not in steps[0]["href"]
    steps[0]["done"] = True
    hydrated = hydrate_plan(
        {
            "id": "pppppppp-pppp-pppp-pppp-pppppppppppp",
            "status": "open",
            "source_attempt_id": gap["attempt_id"],
            "skills": gap["skills"],
            "steps": steps,
            "updated_at": "2026-08-27T12:00:00+00:00",
        },
        quiz_token="abc",
    )
    assert hydrated["persisted"] is True
    assert hydrated["done_count"] == 1
    assert hydrated["progress_pct"] == 33
    assert hydrated["first_href"].startswith("/quiz?")
    assert "token=abc" in hydrated["first_href"]
    assert hydrated["steps"][0]["done"] is True
