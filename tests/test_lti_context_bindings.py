"""Phase 7: LTI context → class matching helpers."""
from __future__ import annotations

from app.modules.school.service import _score_class_match, suggest_course_for_class


def test_score_exact_class_code():
    cls = {
        "class_code": "RHS-MATH-P1",
        "class_name": "Algebra I — Period 1",
        "subject": "Mathematics",
    }
    assert _score_class_match(cls, label="RHS-MATH-P1", title="") >= 100


def test_score_subject_in_moodle_title():
    cls = {
        "class_code": "RHS-SCI-P2",
        "class_name": "Intro Science — Period 2",
        "subject": "Science",
    }
    assert _score_class_match(cls, label="", title="Intro Science") >= 55


def test_score_no_weak_match():
    cls = {
        "class_code": "RHS-HIST-B",
        "class_name": "World History — B",
        "subject": "History",
    }
    assert _score_class_match(cls, label="BIO101", title="Biology") == 0


def test_suggest_course_prefers_existing_link():
    cls = {"course_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "subject": "Science"}
    assert (
        suggest_course_for_class("ignored", cls)
        == "cccccccc-cccc-cccc-cccc-cccccccccccc"
    )
