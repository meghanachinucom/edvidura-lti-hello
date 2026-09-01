"""NRPS member normalization (no Moodle call)."""
from __future__ import annotations

from app.modules.nrps import normalize_member, learners_from_roster


def test_normalize_member_basic():
    m = normalize_member(
        {
            "user_id": "42",
            "given_name": "Ada",
            "family_name": "Lovelace",
            "email": "ada@example.com",
            "roles": [
                "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
            ],
            "status": "Active",
        }
    )
    assert m is not None
    assert m["user_id"] == "42"
    assert m["name"] == "Ada Lovelace"
    assert m["is_learner"] is True
    assert m["is_instructor"] is False


def test_normalize_member_instructor():
    m = normalize_member(
        {
            "user_id": "7",
            "name": "Ms Teacher",
            "roles": [
                "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
            ],
        }
    )
    assert m["is_instructor"] is True
    assert m["is_learner"] is False


def test_normalize_member_requires_user_id():
    assert normalize_member({"name": "Nobody"}) is None
    assert normalize_member(None) is None  # type: ignore[arg-type]


def test_learners_from_roster_skips_instructors():
    roster = {
        "members": [
            {
                "user_id": "1",
                "name": "Student",
                "is_learner": True,
                "is_instructor": False,
                "status": "Active",
            },
            {
                "user_id": "2",
                "name": "Teacher",
                "is_learner": False,
                "is_instructor": True,
                "status": "Active",
            },
            {
                "user_id": "3",
                "name": "Gone",
                "is_learner": True,
                "is_instructor": False,
                "status": "Inactive",
            },
        ]
    }
    learners = learners_from_roster(roster)
    assert [m["user_id"] for m in learners] == ["1"]
