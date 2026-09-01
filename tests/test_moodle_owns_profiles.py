"""Moodle owns people; EdVidura filters by Moodle course labels."""
from __future__ import annotations

from app.modules.school.service import class_moodle_filter_labels


def test_class_moodle_filter_labels_empty_without_db(monkeypatch):
    monkeypatch.setattr(
        "app.modules.school.service.list_lti_context_bindings",
        lambda _tid: [
            {
                "class_id": "c1",
                "context_title": "Algebra I",
                "context_label": "ALG1",
            }
        ],
    )
    monkeypatch.setattr(
        "app.modules.school.service.list_classes_with_roster",
        lambda _tid: [
            {
                "id": "c1",
                "class_name": "Algebra I — Period 1",
                "subject": "Mathematics",
                "class_code": "RHS-MATH-P1",
                "course_title": "Algebra I",
            }
        ],
    )
    labels = class_moodle_filter_labels("tenant", "c1")
    assert "Algebra I" in labels
    assert "ALG1" in labels
    assert "RHS-MATH-P1" in labels
