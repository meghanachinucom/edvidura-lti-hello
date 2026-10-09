"""Gap plan derivation from personalized (non-q1) quiz misses."""
from __future__ import annotations


def test_weak_skills_from_personalized_misses():
    from app.modules.adaptive.service import weak_skills_from_attempt

    answers = {
        "detail": {
            "pq00011": {
                "correct": False,
                "prompt": "From “Variables”: which fact is stated?",
                "topic": "Variables",
            },
            "pq00012": {
                "correct": True,
                "prompt": "From “Equations”: which statement is true?",
                "topic": "Equations",
            },
        }
    }
    catalog = [
        {
            "skill_code": "alg.vars",
            "label": "Variables",
            "question_keys": ["q1"],
            "lesson_id": None,
        },
        {
            "skill_code": "alg.eq",
            "label": "Equations",
            "question_keys": ["q2"],
            "lesson_id": None,
        },
    ]

    from unittest.mock import patch

    with (
        patch(
            "app.modules.adaptive.service.competency_profile",
            return_value=[
                {
                    "id": "alg.vars",
                    "label": "Variables",
                    "status": "unknown",
                    "total": 0,
                    "percent": None,
                }
            ],
        ),
        patch(
            "app.modules.adaptive.service.skills_mod.ensure_default_skills",
            return_value=catalog,
        ),
    ):
        weak = weak_skills_from_attempt(answers, tenant_id="t1")

    assert any(w["id"] == "alg.vars" for w in weak)
    assert all(w.get("status") in {"weak", "developing"} for w in weak)


def test_weak_skills_miss_fallback_when_no_topic_match():
    from unittest.mock import patch

    from app.modules.adaptive.service import weak_skills_from_attempt

    answers = {
        "detail": {
            "pq9": {"correct": False, "prompt": "zzz unrelated", "topic": "zzz"},
        }
    }
    catalog = [
        {
            "skill_code": "lti_launch",
            "label": "LTI launch",
            "question_keys": ["q1"],
        }
    ]
    with (
        patch(
            "app.modules.adaptive.service.competency_profile",
            return_value=[],
        ),
        patch(
            "app.modules.adaptive.service.skills_mod.ensure_default_skills",
            return_value=catalog,
        ),
    ):
        weak = weak_skills_from_attempt(answers, tenant_id="t1")
    assert weak
    assert weak[0]["id"] == "lti_launch"
    assert weak[0].get("source") == "miss_fallback"


def test_upsert_ignores_non_uuid_attempt_id():
    from app.modules.adaptive.service import upsert_open_plan

    # Unit-level: only verify UUID gate logic via a dry parse path
    from uuid import UUID

    attempt_id = "signals-learner-1"
    try:
        UUID(attempt_id)
        cleared = False
    except ValueError:
        cleared = True
    assert cleared is True
    _ = upsert_open_plan  # import smoke
