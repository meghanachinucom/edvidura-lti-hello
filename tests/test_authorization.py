"""Focused tests for quiz result ownership and instructor route authorization."""
from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.quiz_routes import store_quiz_context


def get_client() -> TestClient:
    return TestClient(app)


def test_learner_viewing_own_quiz_result_allowed():
    client = get_client()
    attempt_id = str(uuid4())
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "subject": "student-123",
            "is_instructor": False,
            "learner_name": "Student One",
        }
    )
    mock_attempt = {
        "id": attempt_id,
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "subject": "student-123",
        "learner_name": "Student One",
        "score": 3,
        "max_score": 3,
        "grade_sent": True,
        "grade_error": None,
    }
    with patch("app.quiz_routes.db.get_quiz_attempt", return_value=mock_attempt):
        response = client.get(f"/quiz/result/{attempt_id}?token={token}")
        assert response.status_code == 200
        assert "Quiz Result Summary" in response.text
        assert "Quiz Attempt Completed" in response.text


def test_learner_viewing_other_learner_quiz_result_forbidden():
    client = get_client()
    attempt_id = str(uuid4())
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "subject": "student-456",  # Different student
            "is_instructor": False,
            "learner_name": "Student Two",
        }
    )
    mock_attempt = {
        "id": attempt_id,
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "subject": "student-123",  # Owned by student-123
        "learner_name": "Student One",
        "score": 3,
        "max_score": 3,
        "grade_sent": True,
        "grade_error": None,
    }
    with patch("app.quiz_routes.db.get_quiz_attempt", return_value=mock_attempt):
        response = client.get(f"/quiz/result/{attempt_id}?token={token}")
        assert response.status_code == 403
        assert "Access denied" in response.text


def test_instructor_viewing_learner_quiz_result_allowed():
    client = get_client()
    attempt_id = str(uuid4())
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "subject": "teacher-001",
            "is_instructor": True,
            "learner_name": "Teacher One",
        }
    )
    mock_attempt = {
        "id": attempt_id,
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "subject": "student-123",
        "learner_name": "Student One",
        "score": 3,
        "max_score": 3,
        "grade_sent": True,
        "grade_error": None,
    }
    with patch("app.quiz_routes.db.get_quiz_attempt", return_value=mock_attempt):
        response = client.get(f"/quiz/result/{attempt_id}?token={token}")
        assert response.status_code == 200
        assert "Quiz Result Summary" in response.text


def test_non_instructor_accessing_teacher_attempts_forbidden():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "subject": "student-123",
            "is_instructor": False,
            "learner_name": "Student One",
        }
    )
    response = client.get(f"/teacher/attempts?token={token}")
    assert response.status_code == 403
    assert "Teachers only" in response.text


def test_instructor_accessing_teacher_attempts_allowed():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "subject": "teacher-001",
            "is_instructor": True,
            "learner_name": "Teacher One",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]):
        response = client.get(f"/teacher/attempts?token={token}")
        assert response.status_code == 200
        assert "Instructor Overview" in response.text
        assert "Recent Quiz Attempts" in response.text


def test_launch_hub_authenticated_renders_page():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_name": "Stanford University Sandbox",
            "subject": "student-123",
            "learner_name": "Alex Mercer",
            "is_instructor": False,
            "course": "CS101: Introduction to Computer Science",
            "ags_available": True,
        }
    )
    response = client.get(f"/launch-hub?token={token}")
    assert response.status_code == 200
    assert "LTI Launch Hub" in response.text
    assert "CS101: Introduction to Computer Science" in response.text
    assert "Moodle LTI 1.3 Integration Verified" in response.text
    assert "View Quizzes" in response.text


def test_launch_hub_unauthenticated_returns_launch_required():
    client = get_client()
    response = client.get("/launch-hub")
    assert response.status_code == 401
    assert "Launch required" in response.text


def test_active_quizzes_authenticated_renders_page():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_name": "Stanford University Sandbox",
            "subject": "student-123",
            "learner_name": "Alex Mercer",
            "is_instructor": False,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]):
        response = client.get(f"/active-quizzes?token={token}")
        assert response.status_code == 200
        assert "Active Quizzes" in response.text
        assert "CS101: Introduction to Computer Science" in response.text
        assert "Start Quiz" in response.text
        assert "3 Questions" in response.text


def test_active_quizzes_unauthenticated_returns_launch_required():
    client = get_client()
    response = client.get("/active-quizzes")
    assert response.status_code == 401
    assert "Launch required" in response.text


def test_quiz_form_authenticated_renders_quiz_session():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_name": "Stanford University Sandbox",
            "subject": "student-123",
            "learner_name": "Alex Mercer",
            "is_instructor": False,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    response = client.get(f"/quiz?token={token}")
    assert response.status_code == 200
    assert "Quiz in Session" in response.text
    assert "CS101: Introduction to Computer Science" in response.text
    assert 'action="/quiz/submit"' in response.text
    assert 'name="q1"' in response.text
    assert 'name="q2"' in response.text
    assert 'name="q3"' in response.text


def test_lti_integration_authenticated_renders_page():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    response = client.get(f"/lti-integration?token={token}")
    assert response.status_code == 200
    assert "LTI Integration Status" in response.text
    assert "Stanford University Sandbox" in response.text
    assert "CS101: Introduction to Computer Science" in response.text
    assert "/lti/login" in response.text
    assert "/lti/launch" in response.text
    assert "/.well-known/jwks.json" in response.text


def test_lti_integration_unauthenticated_returns_launch_required():
    client = get_client()
    response = client.get("/lti-integration")
    assert response.status_code == 401
    assert "Launch required" in response.text


def test_institution_detail_authenticated_renders_page():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]):
        response = client.get(f"/institution-detail?token={token}")
        assert response.status_code == 200
        assert "Tenant Institution Profile" in response.text
        assert "Stanford University Sandbox" in response.text
        assert "CS101: Introduction to Computer Science" in response.text


def test_institution_detail_unauthenticated_returns_launch_required():
    client = get_client()
    response = client.get("/institution-detail")
    assert response.status_code == 401
    assert "Launch required" in response.text


def test_institution_detail_ignores_arbitrary_institution_id():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]) as mock_list:
        # Pass an arbitrary institution_id parameter in query string
        response = client.get(f"/institution-detail?token={token}&institution_id=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        assert response.status_code == 200
        # Ensure db query was called ONLY with tenant_id from session, NOT client-supplied institution_id
        mock_list.assert_called_once_with("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        assert "Stanford University Sandbox" in response.text


def test_student_directory_authenticated_renders_page():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]):
        response = client.get(f"/student-directory?token={token}")
        assert response.status_code == 200
        assert "Tenant Student Directory" in response.text
        assert "Stanford University Sandbox" in response.text


def test_student_directory_unauthenticated_returns_launch_required():
    client = get_client()
    response = client.get("/student-directory")
    assert response.status_code == 401
    assert "Launch required" in response.text


def test_student_directory_ignores_arbitrary_tenant_id():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]) as mock_list:
        response = client.get(f"/student-directory?token={token}&tenant_id=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        assert response.status_code == 200
        mock_list.assert_called_once_with("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        assert "Stanford University Sandbox" in response.text


def test_registered_institutions_authenticated_renders_page():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]):
        response = client.get(f"/institutions?token={token}")
        assert response.status_code == 200
        assert "Tenant Institution Profile" in response.text
        assert "Stanford University Sandbox" in response.text


def test_registered_institutions_unauthenticated_returns_launch_required():
    client = get_client()
    response = client.get("/institutions")
    assert response.status_code == 401
    assert "Launch required" in response.text


def test_registered_institutions_ignores_arbitrary_params():
    client = get_client()
    token = store_quiz_context(
        {
            "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_slug": "stanford",
            "tenant_name": "Stanford University Sandbox",
            "subject": "teacher-123",
            "learner_name": "Dr. Smith",
            "is_instructor": True,
            "course": "CS101: Introduction to Computer Science",
        }
    )
    with patch("app.quiz_routes.db.list_quiz_attempts_for_tenant", return_value=[]) as mock_list:
        response = client.get(f"/institutions?token={token}&institution_id=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb&tenant_id=cccccccc-cccc-cccc-cccc-cccccccccccc")
        assert response.status_code == 200
        mock_list.assert_called_once_with("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        assert "Stanford University Sandbox" in response.text
