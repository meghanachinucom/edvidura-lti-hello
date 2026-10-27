"""xAPI middleware helpers + group assignment access (no database)."""
from __future__ import annotations

from app.modules.lti_groups.service import evaluate_activity_access
from app.modules.quiz.attempts import remaining_attempts
from app.modules.xapi.middleware import detect_file_kind


def test_detect_file_kind_routes_json_and_pdf():
    json_meta = detect_file_kind("bank.json", "application/json", b'{"ok":true}')
    assert json_meta["kind"] == "json"
    assert json_meta["route"] == "json"
    pdf_meta = detect_file_kind("paper.pdf", "", b"%PDF-1.4\n")
    assert pdf_meta["kind"] == "pdf"
    assert pdf_meta["route"] == "stream"
    md_meta = detect_file_kind("assessment.md")
    assert md_meta["kind"] == "markdown"
    assert md_meta["route"] == "stream"
    png_meta = detect_file_kind("shot.png", payload=b"\x89PNG\r\n\x1a\nxxxx")
    assert png_meta["kind"] == "image"


def test_remaining_attempts_enforces_limit():
    open_q = remaining_attempts(1, 3)
    assert open_q["used"] == 1
    assert open_q["remaining"] == 2
    assert open_q["allowed"] is True
    blocked = remaining_attempts(3, 3)
    assert blocked["remaining"] == 0
    assert blocked["allowed"] is False
    practice = remaining_attempts(9, 3, practice=True)
    assert practice["allowed"] is True
    assert practice["practice"] is True


def test_group_assignment_gates_unassigned_learners():
    assignments = [
        {
            "group_id": "g-a",
            "group_name": "Lab A",
            "activity_type": "quiz",
            "activity_id": "school-quiz",
            "title": "Checkpoint 2",
        }
    ]
    open_class = evaluate_activity_access(
        assignments=[],
        member_group_ids=set(),
        activity_type="quiz",
    )
    assert open_class["allowed"] is True
    assert open_class["restricted"] is False

    member = evaluate_activity_access(
        assignments=assignments,
        member_group_ids={"g-a"},
        activity_type="quiz",
        activity_id="school-quiz",
    )
    assert member["allowed"] is True
    assert member["reason"] == "assigned"
    assert member["assignment"]["group_name"] == "Lab A"

    outsider = evaluate_activity_access(
        assignments=assignments,
        member_group_ids={"g-b"},
        activity_type="quiz",
    )
    assert outsider["allowed"] is False
    assert outsider["reason"] == "not_assigned"

    staff = evaluate_activity_access(
        assignments=assignments,
        member_group_ids=set(),
        activity_type="quiz",
        is_staff=True,
    )
    assert staff["allowed"] is True
    assert staff["reason"] == "staff"
