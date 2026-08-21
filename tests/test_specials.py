"""Smoke tests for product specials helpers."""
from __future__ import annotations

from app.modules.specials import (
    at_risk_learners,
    class_competency_map,
    competency_profile,
    enrichment_for_review,
    failed_question_ids,
    ghost_coach_gate,
    grade_receipt,
    quiet_class_radar,
    skill_stickers,
    tenant_theme,
)


def test_grade_receipt_practice():
    r = grade_receipt(
        attempt={
            "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "score": 2,
            "max_score": 3,
            "grade_sent": False,
            "answers": {"mode": "practice"},
        },
        xapi_statement_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        ags_available=True,
    )
    assert r["practice"] is True
    assert r["percent"] == 67
    assert r["xapi_statement_id"]


def test_failed_question_ids():
    ids = failed_question_ids(
        {
            "detail": {
                "q1": {"correct": True},
                "q2": {"correct": False},
                "q3": {"correct": False},
            }
        }
    )
    assert ids == ["q2", "q3"]


def test_quiet_radar():
    radar = quiet_class_radar(
        [
            {
                "answers": {
                    "detail": {
                        "q1": {"correct": False, "prompt": "Launch?"},
                        "q2": {"correct": True, "prompt": "Tenant?"},
                    }
                }
            },
            {
                "answers": {
                    "detail": {
                        "q1": {"correct": False, "prompt": "Launch?"},
                        "q2": {"correct": False, "prompt": "Tenant?"},
                    }
                }
            },
        ]
    )
    assert radar["hottest"]["question_id"] == "q1"
    assert radar["hottest"]["fail_rate"] == 100


def test_ghost_coach_gate():
    g = ghost_coach_gate({"total_count": 3, "completed_count": 1})
    assert g["gate"] is True
    assert ghost_coach_gate({"total_count": 3, "completed_count": 3})["gate"] is False


def test_stickers_and_theme():
    s = skill_stickers(
        score=3,
        max_score=3,
        progress={"all_lessons_done": True},
        grade_sent=True,
    )
    labels = {x["id"] for x in s}
    assert "ace" in labels and "path" in labels and "sync" in labels
    t = tenant_theme("riverside|Algebra")
    assert t["accent"].startswith("hsl(")


def test_competency_profile_and_map():
    answers = {
        "detail": {
            "q1": {"correct": True},
            "q2": {"correct": False},
            "q3": {"correct": False},
        }
    }
    profile = {c["id"]: c for c in competency_profile(answers)}
    assert profile["lti_launch"]["status"] == "strong"
    assert profile["tenant_isolation"]["status"] == "weak"
    cmap = class_competency_map([{"answers": answers}, {"answers": answers}])
    assert any(c["id"] == "gradebook_sync" and c["percent"] == 0 for c in cmap)


def test_manual_loop_enrichment():
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
    )
    assert "focus=gradebook-sync" in review[0]["teleport_href"]
    assert "&v=2" in review[0]["teleport_href"]
    assert review[0]["competency_id"] == "gradebook_sync"


def test_at_risk_learners():
    attempts = [
        {
            "subject": "alice",
            "learner_name": "Alice",
            "score": 0,
            "max_score": 3,
            "created_at": "2026-01-02",
            "answers": {
                "detail": {
                    "q2": {"correct": False, "prompt": "Tenant?"},
                }
            },
        },
        {
            "subject": "alice",
            "learner_name": "Alice",
            "score": 1,
            "max_score": 3,
            "created_at": "2026-01-03",
            "answers": {
                "detail": {
                    "q2": {"correct": False, "prompt": "Tenant?"},
                }
            },
        },
    ]
    risks = at_risk_learners(
        attempts=attempts,
        progress_roster=[
            {
                "subject": "alice",
                "completed_count": 1,
                "total_count": 4,
            }
        ],
    )
    assert len(risks) == 1
    assert risks[0]["subject"] == "alice"
    joined = " ".join(risks[0]["reasons"])
    assert "2+" in joined
    assert "Path incomplete" in joined
