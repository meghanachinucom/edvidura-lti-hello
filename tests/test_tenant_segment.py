"""School vs corporate segment + capability gating."""
from __future__ import annotations

from app.modules.tenancy.capabilities import (
    can,
    defaults_for_segment,
    merge_capabilities,
    normalize_segment,
    profile_from_row,
)


def test_normalize_segment_aliases():
    assert normalize_segment("school") == "school"
    assert normalize_segment("corporate") == "corporate"
    assert normalize_segment("corp") == "corporate"
    assert normalize_segment("enterprise") == "corporate"
    assert normalize_segment("weird") == "school"
    assert normalize_segment(None) == "school"


def test_school_defaults_enable_quiz():
    caps = defaults_for_segment("school")
    assert caps["quiz_graded"] is True
    assert caps["lessons"] is True
    assert caps["ghost_coach_gate"] is True
    assert caps["video_library"] is True


def test_corporate_defaults_disable_exams():
    caps = defaults_for_segment("corporate")
    assert caps["quiz_graded"] is False
    assert caps["quiz_practice"] is False
    assert caps["lessons"] is False
    assert caps["manuals"] is False
    assert caps["ghost_coach_gate"] is False
    assert caps["video_library"] is True
    assert caps["ask_vidura"] is True
    assert can(caps, "quiz_graded") is False
    assert can(caps, "video_library") is True


def test_merge_capabilities_overrides():
    caps = merge_capabilities("corporate", {"quiz_practice": True, "lessons": True})
    assert caps["quiz_graded"] is False
    assert caps["quiz_practice"] is True
    assert caps["lessons"] is True
    assert caps["video_library"] is True


def test_profile_from_row():
    profile = profile_from_row(
        {"segment": "corporate", "capabilities": {"ask_vidura": False}}
    )
    assert profile["is_corporate"] is True
    assert profile["is_school"] is False
    assert profile["capabilities"]["ask_vidura"] is False
    assert profile["capabilities"]["video_library"] is True


def test_attach_to_session_without_tenant(monkeypatch):
    from app.modules.tenancy import attach_to_session

    session = {"segment": "corporate"}
    attach_to_session(session)
    assert session["is_corporate"] is True
    assert session["capabilities"]["quiz_graded"] is False


def test_app_api_quiz_denied_for_corporate(monkeypatch):
    import pytest

    from app.api.app_client import routes as app_routes
    from app.api.app_client.errors import AppApiError

    session = {
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "segment": "corporate",
        "capabilities": defaults_for_segment("corporate"),
        "subject": "learner-1",
    }

    def fake_attach(sess):
        sess["segment"] = "corporate"
        sess["capabilities"] = defaults_for_segment("corporate")
        sess["is_corporate"] = True
        return sess

    monkeypatch.setattr(
        "app.modules.tenancy.attach_to_session", fake_attach
    )
    with pytest.raises(AppApiError) as exc:
        app_routes._require_cap(
            session,
            "quiz_graded",
            message="Graded quiz is not enabled for this organization.",
        )
    assert exc.value.status_code == 403
    assert exc.value.code == "capability_denied"
