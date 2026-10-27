"""PLE risk score, trend, and xAPI statement validation (no database)."""
from __future__ import annotations

from app.modules.specials import classify_trend, composite_risk_score
from app.modules.xapi import validate_statement
from app.modules.ai_assessment import questions_for_page_count


def test_composite_risk_and_trend():
    high = composite_risk_score(
        latest_percent=30,
        attempt_count=4,
        reasons=["Failed same item 2+ times", "Path incomplete (1/4 lessons)"],
    )
    assert high["band"] == "high"
    assert high["score"] >= 60
    assert classify_trend([40, 55, 70]) == "improving"
    assert classify_trend([80, 70, 50]) == "declining"
    assert classify_trend([60]) == "stable"


def test_xapi_validate_statement_reports_errors():
    assert validate_statement({"verb": {"id": "x"}})  # missing actor + object
    ok = validate_statement(
        {
            "actor": {"name": "Lakshmi"},
            "verb": {"id": "http://adlnet.gov/expapi/verbs/experienced"},
            "object": {"id": "http://localhost/xapi/activities/manual/1"},
        }
    )
    assert ok == []


def test_five_questions_per_ten_pages():
    assert questions_for_page_count(1) == 5
    assert questions_for_page_count(10) == 5
    assert questions_for_page_count(11) == 10
    assert questions_for_page_count(20) == 10
