"""CrossCheck Diff F-3 / F-5 — placement + differential curriculum."""
from __future__ import annotations


def test_generate_difference_curriculum_creates_and_links(monkeypatch):
    from app.modules import adaptive as adaptive_mod

    tid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    gaps = [
        {
            "id": "tenant_isolation",
            "label": "Tenant isolation",
            "status": "untested",
            "skill_id": "s1",
            "lesson_id": None,
        },
        {
            "id": "gradebook_sync",
            "label": "Gradebook sync",
            "status": "untested",
            "skill_id": "s2",
            "lesson_id": "already-linked",
        },
    ]
    linked = []

    monkeypatch.setattr(
        adaptive_mod.service.skills_mod,
        "skill_gaps_for_role",
        lambda _t, **_kw: gaps,
    )
    monkeypatch.setattr(
        adaptive_mod.service.skills_mod,
        "set_skill_remediation",
        lambda *_a, **kw: linked.append(kw),
    )
    monkeypatch.setattr(
        adaptive_mod.service.skills_mod,
        "ensure_default_skills",
        lambda _t: [
            {
                "id": "s1",
                "skill_code": "tenant_isolation",
                "label": "Tenant isolation",
                "prefer_path": "lessons",
                "lesson_id": None,
                "question_keys": [],
            }
        ],
    )

    class _Content:
        @staticmethod
        def get_course(_t, _id):
            return {"id": "c1", "title": "Algebra"}

        @staticmethod
        def ensure_primary_course(_t):
            return {"id": "c1", "title": "Algebra"}

        @staticmethod
        def create_lesson(**kwargs):
            return {
                "id": "new-lesson-1",
                "title": kwargs.get("title") or "Review",
                "status": kwargs.get("status") or "draft",
            }

    import app.modules.content as content_mod

    monkeypatch.setattr(
        "app.modules.content.get_course", _Content.get_course, raising=False
    )
    monkeypatch.setattr(
        "app.modules.content.ensure_primary_course",
        _Content.ensure_primary_course,
        raising=False,
    )
    monkeypatch.setattr(
        "app.modules.content.create_lesson",
        _Content.create_lesson,
        raising=False,
    )

    def _fake_draft(**kwargs):
        return {
            "title": f"Review: {kwargs.get('skill_label')}",
            "body_md": "## Overview\n\nPractice this skill carefully.\n\n### Try this\n1. Restate.\n",
            "summary": "Short remediation",
            "provider": "local",
        }

    monkeypatch.setattr(
        "app.modules.ai_assessment.generate_remediation_micro_lesson",
        _fake_draft,
    )
    monkeypatch.setattr(
        adaptive_mod.service,
        "build_gap_path",
        lambda *_a, **_kw: {
            "active": True,
            "mode": "difference",
            "steps": [{"n": 1, "label": "Review"}],
            "skills": [{"id": "tenant_isolation"}],
            "first_href": "/lessons/x",
        },
    )

    out = adaptive_mod.generate_difference_curriculum(
        tid, role_code="technician", quiz_token="tok", max_skills=5
    )
    assert out["generated_count"] == 1
    assert out["skipped_count"] == 1
    assert out["generated"][0]["lesson_id"] == "new-lesson-1"
    assert out["role_code"] == "technician"
    assert linked and linked[0].get("lesson_id") == "new-lesson-1"


def test_placement_assessment_for_role_tags_skills(monkeypatch):
    from app.modules.skills import placement_assessment_for_role
    import app.modules.skills.cat as cat_mod

    required = [
        {
            "id": "s1",
            "skill_code": "tenant_isolation",
            "label": "Tenant isolation",
            "description": "RLS boundaries",
        },
        {
            "id": "s2",
            "skill_code": "gradebook_sync",
            "label": "Gradebook sync",
            "description": "AGS passback",
        },
    ]
    monkeypatch.setattr(
        "app.modules.skills.service.required_skills_for_role",
        lambda _t, _c: required,
    )
    monkeypatch.setattr(
        cat_mod,
        "generate_cat_bank",
        lambda *_a, **_kw: {
            "questions": [
                {
                    "prompt": "Q1?",
                    "choices": ["a", "b", "c", "d"],
                    "correct_index": 0,
                },
                {
                    "prompt": "Q2?",
                    "choices": ["a", "b", "c", "d"],
                    "correct_index": 1,
                },
            ]
        },
    )

    bank = placement_assessment_for_role(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        role_code="technician",
        count=8,
    )
    assert bank["placement"] is True
    assert bank["role_code"] == "technician"
    assert bank["skill_count"] == 2
    assert len(bank["questions"]) == 2
    assert bank["questions"][0].get("skill_code") == "tenant_isolation"
    assert bank["questions"][0].get("placement") is True


def test_build_difference_path_without_attempt(monkeypatch):
    from app.modules import adaptive as adaptive_mod
    from app.modules.adaptive import build_difference_path

    gaps = [
        {
            "id": "tenant_isolation",
            "label": "Tenant isolation",
            "status": "untested",
            "prefer_path": "lessons",
            "lesson_id": "llllllll-llll-llll-llll-llllllllllll",
        }
    ]
    monkeypatch.setattr(
        adaptive_mod.service.skills_mod,
        "skill_gaps_for_role",
        lambda *_a, **_kw: gaps,
    )
    monkeypatch.setattr(
        adaptive_mod.service.skills_mod,
        "ensure_default_skills",
        lambda _t: [
            {
                "id": "s1",
                "skill_code": "tenant_isolation",
                "label": "Tenant isolation",
                "prefer_path": "lessons",
                "lesson_id": "llllllll-llll-llll-llll-llllllllllll",
                "question_keys": ["q2"],
            }
        ],
    )
    path = build_difference_path(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        role_code="technician",
        attempt=None,
        quiz_token="tok",
        first_lesson_id="llllllll-llll-llll-llll-llllllllllll",
    )
    assert path["mode"] == "difference"
    assert path["needs_placement"] is True
    assert path["role_code"] == "technician"
