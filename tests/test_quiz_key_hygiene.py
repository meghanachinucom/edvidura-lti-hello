"""Quiz answer keys must not leak to cookies / App API clients."""
from __future__ import annotations

from app.modules.quiz.service import (
    Question,
    client_safe_grade_detail,
    cookie_safe_session,
    grade_answers,
    strip_answer_keys_from_bank,
)


def test_client_safe_grade_detail_strips_correct_index():
    score, detail = grade_answers({"q1": "0", "q2": "0"})
    assert score >= 0
    assert "correct_index" in detail["q1"]
    safe = client_safe_grade_detail(detail)
    assert "correct_index" not in safe["q1"]
    assert "correct" in safe["q1"]
    assert "chosen" in safe["q1"]
    # Original untouched for server storage
    assert "correct_index" in detail["q1"]


def test_strip_answer_keys_from_bank():
    bank = {
        "subject": "s1",
        "questions": [
            {
                "id": "a",
                "prompt": "P?",
                "choices": ["x", "y"],
                "correct_index": 1,
            }
        ],
        "meta": {"source": "teacher_bank"},
    }
    public = strip_answer_keys_from_bank(bank)
    assert public["questions"][0]["id"] == "a"
    assert "correct_index" not in public["questions"][0]
    assert bank["questions"][0]["correct_index"] == 1


def test_cookie_safe_session_strips_bank_keys():
    session = {
        "tenant_id": "t1",
        "subject": "s1",
        "personal_quiz_bank": {
            "subject": "s1",
            "questions": [
                {
                    "id": "q9",
                    "prompt": "?",
                    "choices": ["a", "b", "c", "d"],
                    "correct_index": 2,
                }
            ],
        },
    }
    cookie = cookie_safe_session(session)
    assert "correct_index" not in cookie["personal_quiz_bank"]["questions"][0]
    assert session["personal_quiz_bank"]["questions"][0]["correct_index"] == 2


def test_app_quiz_submit_detail_has_no_keys(monkeypatch):
    from fastapi.testclient import TestClient

    from app.api.app_client import auth as app_auth
    from app.main import app
    from app.modules import quiz as quiz_mod

    fake = {
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "subject": "student-1",
        "learner_name": "Ada",
        "quiz_token": "tok-ada",
        "class_id": "22222222-2222-2222-2222-222222222222",
        "edvidura_course_id": None,
        "course": "Welding",
        "is_instructor": False,
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)

    q = Question(
        id="qx",
        prompt="Pick one",
        choices=("a", "b", "c", "d"),
        correct_index=1,
    )

    def _grade(**kwargs):
        return {
            "score": 1,
            "max_score": 1,
            "detail": {
                "qx": {
                    "chosen": 1,
                    "correct_index": 1,
                    "correct": True,
                    "prompt": "Pick one",
                    "topic": "",
                }
            },
            "answers_payload": {},
            "questions": (q,),
            "practice_mode": True,
            "personalized_mode": False,
        }

    monkeypatch.setattr(quiz_mod, "grade_submitted_form", _grade)
    monkeypatch.setattr(
        quiz_mod,
        "record_graded_attempt",
        lambda **kw: {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "grade_sent": False},
    )

    client = TestClient(app)
    r = client.post(
        "/api/v1/app/quiz/submit",
        headers={"Authorization": "Bearer tok-ada"},
        json={"answers": {"qx": "1"}, "practice": True},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["ok"] is True
    detail = body["data"]["detail"]
    assert "qx" in detail
    assert "correct_index" not in detail["qx"]
    assert detail["qx"]["correct"] is True
