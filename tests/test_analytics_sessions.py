"""Tool grouping and session derivation from xAPI-shaped rows (no database)."""
from __future__ import annotations

from app.modules.analytics.service import derive_sessions, group_progress_by_tool


def test_group_progress_by_tool():
    rows = [
        {
            "object_id": "http://localhost:8000/xapi/activities/quiz/1",
            "verb_id": "http://adlnet.gov/expapi/verbs/passed",
            "actor_sub": "a",
            "created_at": "2026-10-27T10:00:00+00:00",
        },
        {
            "object_id": "http://localhost:8000/xapi/activities/quiz/1",
            "verb_id": "http://adlnet.gov/expapi/verbs/attempted",
            "actor_sub": "b",
            "created_at": "2026-10-27T10:05:00+00:00",
        },
        {
            "object_id": "http://localhost:8000/xapi/activities/manual/m1/page/ch1",
            "verb_id": "http://adlnet.gov/expapi/verbs/experienced",
            "actor_sub": "a",
            "created_at": "2026-10-27T10:20:00+00:00",
        },
    ]
    grouped = {g["tool"]: g for g in group_progress_by_tool(rows)}
    assert grouped["quiz"]["attempts"] == 2
    assert grouped["quiz"]["complete"] == 1
    assert grouped["quiz"]["ongoing"] == 1
    assert grouped["manual"]["attempts"] == 1


def test_derive_sessions_splits_on_idle_gap():
    rows = [
        {
            "object_id": "http://localhost:8000/xapi/activities/quiz/1",
            "verb_id": "http://adlnet.gov/expapi/verbs/attempted",
            "actor_sub": "lakshmi",
            "created_at": "2026-10-27T10:00:00+00:00",
        },
        {
            "object_id": "http://localhost:8000/xapi/activities/manual/m1",
            "verb_id": "http://adlnet.gov/expapi/verbs/experienced",
            "actor_sub": "lakshmi",
            "created_at": "2026-10-27T10:10:00+00:00",
        },
        {
            "object_id": "http://localhost:8000/xapi/activities/quiz/1",
            "verb_id": "http://adlnet.gov/expapi/verbs/passed",
            "actor_sub": "lakshmi",
            "created_at": "2026-10-27T12:00:00+00:00",
        },
    ]
    sessions = derive_sessions(rows)
    assert len(sessions) == 2
    assert sessions[0]["duration_minutes"] >= 1
    assert "quiz" in sessions[1]["tools"] or "manual" in sessions[1]["tools"]


def test_learner_date_heatmap_noisy_verbs():
    from datetime import date

    from app.modules.analytics.service import learner_date_heatmap

    today = date(2026, 10, 27)
    rows = [
        {
            "actor_sub": "lakshmi",
            "verb_id": "http://adlnet.gov/expapi/verbs/experienced",
            "created_at": "2026-10-27T10:00:00+00:00",
        },
        {
            "actor_sub": "lakshmi",
            "verb_id": "http://adlnet.gov/expapi/verbs/interacted",
            "created_at": "2026-10-27T11:00:00+00:00",
        },
        {
            "actor_sub": "ramesh",
            "verb_id": "http://adlnet.gov/expapi/verbs/attempted",
            "created_at": "2026-10-26T09:00:00+00:00",
        },
    ]
    hm = learner_date_heatmap(
        rows, days=7, today=today, names={"lakshmi": "Lakshmi"}
    )
    assert len(hm["dates"]) == 7
    assert hm["dates"][-1] == "2026-10-27"
    assert hm["learners"][0]["id"] == "lakshmi"
    assert hm["learners"][0]["label"] == "Lakshmi"
    assert hm["learners"][0]["total"] == 2
    assert hm["cells"][0][-1] == 2
    assert hm["cells"][1][-2] == 1
    assert hm["peak"] == 2
    assert hm["intensity"][0][-1] == 4


def test_learner_time_series_eight_charts():
    from datetime import date

    from app.modules.analytics.service import learner_time_series

    today = date(2026, 10, 27)
    pack = learner_time_series(
        [
            {"actor_sub": "lakshmi", "created_at": "2026-10-27T10:00:00+00:00"},
            {"actor_sub": "lakshmi", "created_at": "2026-10-27T11:00:00+00:00"},
            {"actor_sub": "ramesh", "created_at": "2026-10-20T10:00:00+00:00"},
        ],
        [
            {
                "subject": "lakshmi",
                "learner_name": "Lakshmi",
                "score": 8,
                "max_score": 10,
                "created_at": "2026-10-27T12:00:00+00:00",
            },
            {
                "subject": "lakshmi",
                "learner_name": "Lakshmi",
                "score": 6,
                "max_score": 10,
                "created_at": "2026-10-20T12:00:00+00:00",
            },
        ],
        today=today,
    )
    ids = [c["id"] for c in pack["charts"]]
    assert ids == [
        "activity_day",
        "score_day",
        "activity_week",
        "score_week",
        "activity_month",
        "score_month",
        "activity_quarter",
        "score_quarter",
    ]
    day_act = pack["charts"][0]
    assert day_act["keys"][-1] == "2026-10-27"
    assert day_act["learners"]["lakshmi"][-1] == 2
    assert day_act["class_values"][-1] == 2
    day_score = pack["charts"][1]
    assert day_score["learners"]["lakshmi"][-1] == 80
    assert pack["learners"][0]["label"] == "Lakshmi"
