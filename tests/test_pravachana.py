"""Government pravachana segment — isolated from school."""


def test_government_segment_defaults():
    from app.modules.tenancy.capabilities import (
        defaults_for_segment,
        normalize_segment,
    )

    assert normalize_segment("govt") == "government"
    assert normalize_segment("chaganti") == "government"
    assert normalize_segment("AP") == "school"
    caps = defaults_for_segment("government")
    assert caps["video_library"] is True
    assert caps["ask_vidura"] is True
    assert caps["lessons"] is False
    assert caps["quiz_graded"] is False
    assert caps["ghost_coach_gate"] is False
    school = defaults_for_segment("school")
    assert school["quiz_graded"] is True
    assert school["lessons"] is True


def test_public_session_flags_government():
    from app.api.app_client.envelope import public_session

    out = public_session(
        {
            "quiz_token": "t",
            "tenant_id": "",
            "segment": "government",
            "is_government": True,
            "is_corporate": False,
            "capabilities": {},
            "learner_name": "Sita Devi",
        }
    )
    assert out["is_government"] is True
    assert out["segment"] == "government"
