"""Unit tests for AGS grade passback helpers (mocked LMS)."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.ags_passback import send_quiz_grade


def _launch(*, has_ags=True, can_put=True, can_create=True, lineitem=None, lineitems=None, scopes=None):
    scopes = scopes or [
        "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    ]
    endpoint = {"scope": scopes}
    if lineitem:
        endpoint["lineitem"] = lineitem
    if lineitems:
        endpoint["lineitems"] = lineitems

    ags = MagicMock()
    ags.can_put_grade.return_value = can_put
    ags.can_create_lineitem.return_value = can_create
    ags.find_lineitem_by_tag.return_value = None
    ags.put_grade.return_value = {"body": {}}

    launch = MagicMock()
    launch.has_ags.return_value = has_ags
    launch.get_ags.return_value = ags
    launch.get_launch_data.return_value = {
        "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": endpoint
    }
    return launch, ags


def test_send_quiz_grade_uses_launch_lineitem():
    launch, ags = _launch(lineitem="https://moodle.example/lineitem/1")
    ok, err = send_quiz_grade(launch, user_id="u1", score=2, score_maximum=3)
    assert ok is True
    assert err is None
    ags.put_grade.assert_called_once()
    assert ags.put_grade.call_args.args[1] is None


def test_send_quiz_grade_creates_when_no_lineitem():
    launch, ags = _launch(lineitems="https://moodle.example/lineitems")
    ok, err = send_quiz_grade(launch, user_id="u1", score=3, score_maximum=3)
    assert ok is True
    assert err is None
    lineitem = ags.put_grade.call_args.args[1]
    assert lineitem is not None
    assert lineitem.get_tag() == "edvidura-quiz"


def test_send_quiz_grade_missing_ags():
    launch, _ = _launch(has_ags=False)
    ok, err = send_quiz_grade(launch, user_id="u1", score=1, score_maximum=3)
    assert ok is False
    assert err and "AGS not available" in err


def test_send_quiz_grade_no_lineitem_cannot_create():
    launch, ags = _launch(can_create=False, scopes=["https://purl.imsglobal.org/spec/lti-ags/scope/score"])
    ok, err = send_quiz_grade(launch, user_id="u1", score=1, score_maximum=3)
    assert ok is False
    assert err and "No line item" in err
    ags.put_grade.assert_not_called()
