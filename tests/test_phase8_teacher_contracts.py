import pytest
from unittest.mock import MagicMock
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.modules import school as school_mod
from app.modules import content as content_mod
from app.modules import manuals as manuals_mod
from app.modules import quiz as quiz_mod
from app import db
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection


SESSION_REGISTRY: dict[str, dict] = {}


@pytest.fixture
def client():
    return TestClient(app)


def _instructor_headers(tenant_id: str | None = None, subject: str = "inst-1"):
    tid = tenant_id or "11111111-1111-1111-1111-111111111111"
    tok = f"tok-inst-{subject}"
    SESSION_REGISTRY[tok] = {
        "tenant_id": tid,
        "subject": subject,
        "learner_name": "Instructor Suresh",
        "is_instructor": True,
        "is_school_admin": False,
        "is_admin": False,
        "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"],
        "course_title": "Electrician Trade Practical & Theory",
        "quiz_token": tok,
    }
    return {"Authorization": f"Bearer {tok}"}


def _learner_headers(tenant_id: str | None = None, subject: str = "learner-1", class_id: str | None = None):
    tid = tenant_id or "11111111-1111-1111-1111-111111111111"
    tok = f"tok-learn-{subject}"
    SESSION_REGISTRY[tok] = {
        "tenant_id": tid,
        "subject": subject,
        "learner_name": "Learner Meena",
        "is_instructor": False,
        "is_school_admin": False,
        "is_admin": False,
        "class_id": class_id,
        "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
        "course_title": "Electrician Trade Practical & Theory",
        "quiz_token": tok,
    }
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def setup_teacher_mocks(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    SESSION_REGISTRY.clear()
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)

    from app.api.app_client import auth as app_auth
    from app import quiz_routes

    def _resolve_mock(request=None, token=None):
        if token and token in SESSION_REGISTRY:
            return SESSION_REGISTRY[token]
        return None

    monkeypatch.setattr(app_auth, "resolve_quiz_session", _resolve_mock)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda tok: SESSION_REGISTRY.get(tok))
    monkeypatch.setattr(quiz_routes, "resolve_quiz_session", _resolve_mock)
    monkeypatch.setattr(quiz_routes, "load_quiz_context", lambda tok: SESSION_REGISTRY.get(tok))

    mock_classes = [
        {
            "id": "c1111111-1111-1111-1111-111111111111",
            "class_code": "ELE-A",
            "class_name": "Electrician Batch A",
            "subject": "Electrical",
            "teachers": [{"name": "Instructor Suresh", "email": "suresh@example.edu"}],
            "students": [{"name": "Learner Meena", "student_code": "STU001"}],
        }
    ]

    mock_lessons = [
        {
            "id": "l1111111-1111-1111-1111-111111111111",
            "title": "Workshop Safety Regulations",
            "body_md": "# Safety first",
            "slug": "workshop-safety",
            "position": 1,
            "status": "published",
            "lesson_type": "article",
            "course_id": "co111111-1111-1111-1111-111111111111",
        }
    ]

    monkeypatch.setattr(school_mod, "list_classes_with_roster", lambda tid: mock_classes)
    monkeypatch.setattr(
        school_mod,
        "school_snapshot",
        lambda tid: {
            "course": {"id": "co111111-1111-1111-1111-111111111111", "title": "Electrician Course"},
            "chapters": mock_lessons,
            "classes": mock_classes,
            "student_count": 28,
            "teacher_count": 2,
            "class_count": 1,
            "chapter_count": 1,
            "binding_count": 1,
        },
    )
    monkeypatch.setattr(
        school_mod,
        "class_workspace_snapshot",
        lambda tid, cid: {
            "class_id": str(cid),
            "class_code": "ELE-A",
            "class_name": "Electrician Batch A",
            "subject": "Electrical",
            "student_count": 28,
            "teacher_count": 2,
            "lesson_count": 1,
            "attempt_count": 15,
            "avg_percent": 82,
            "synced_count": 14,
        },
    )
    monkeypatch.setattr(
        school_mod,
        "create_class",
        lambda *a, class_code, class_name, subject="", term="", **k: {
            "id": str(uuid4()),
            "class_code": class_code,
            "class_name": class_name,
            "subject": subject,
            "term": term,
        },
    )

    monkeypatch.setattr(quiz_mod, "list_attempts_for_tenant", lambda *a, **k: [])

    monkeypatch.setattr(content_mod, "list_lessons", lambda tid, course_id=None, include_unpublished=False: mock_lessons)
    monkeypatch.setattr(content_mod, "get_lesson", lambda tid, lid, allow_unpublished=False: mock_lessons[0])
    monkeypatch.setattr(
        content_mod,
        "create_lesson",
        lambda *, tenant_id, title, body_md="", lesson_type="article", video_url="", status="published", course_id=None: {
            "id": str(uuid4()),
            "title": title,
            "body_md": body_md,
            "lesson_type": lesson_type,
            "video_url": video_url,
            "status": status,
        },
    )
    monkeypatch.setattr(
        content_mod,
        "update_lesson",
        lambda *, tenant_id, lesson_id, title, body_md="", video_url="", lesson_type=None, status=None: {
            "id": str(lesson_id),
            "title": title,
            "body_md": body_md,
            "lesson_type": lesson_type or "article",
            "status": status or "published",
        },
    )
    monkeypatch.setattr(content_mod, "delete_lesson", lambda *, tenant_id, lesson_id: True)
    monkeypatch.setattr(content_mod, "set_lesson_status", lambda *, tenant_id, lesson_id, status: {"id": str(lesson_id), "status": status})
    monkeypatch.setattr(content_mod, "reorder_lesson", lambda *, tenant_id, lesson_id, direction: True)

    monkeypatch.setattr(
        content_mod,
        "add_quiz_question",
        lambda *, tenant_id, prompt, choices, correct_index, qtype="single", topic="": {
            "id": str(uuid4()),
            "prompt": prompt,
            "choices": choices,
            "correct_index": correct_index,
            "position": 1,
        },
    )
    monkeypatch.setattr(content_mod, "delete_quiz_question", lambda *, tenant_id, question_id: True)

    monkeypatch.setattr(manuals_mod, "class_ids_for_manual", lambda tid, mid: ["c1111111-1111-1111-1111-111111111111"])
    monkeypatch.setattr(manuals_mod, "set_manual_classes", lambda tid, *, manual_id, class_ids: [str(c) for c in class_ids])


def test_teacher_dashboard_endpoint(client):
    headers = _instructor_headers()
    res = client.get("/api/v1/app/teacher/dashboard", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["data"]["overview"]["student_count"] == 28
    assert body["data"]["overview"]["class_count"] == 1
    assert len(body["data"]["classes"]) == 1

    # Forbidden for learner
    l_headers = _learner_headers()
    l_res = client.get("/api/v1/app/teacher/dashboard", headers=l_headers)
    assert l_res.status_code == 403


def test_classes_list_and_detail(client):
    headers = _instructor_headers()
    # 1. List classes
    res = client.get("/api/v1/app/classes", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) == 1
    assert res.json()["data"][0]["class_code"] == "ELE-A"

    # 2. Class detail
    cid = "c1111111-1111-1111-1111-111111111111"
    d_res = client.get(f"/api/v1/app/classes/{cid}", headers=headers)
    assert d_res.status_code == 200
    assert d_res.json()["data"]["class"]["class_code"] == "ELE-A"
    assert d_res.json()["data"]["class"]["avg_percent"] == 82

    # Forbidden for learner
    l_headers = _learner_headers()
    l_res = client.get(f"/api/v1/app/classes/{cid}", headers=l_headers)
    assert l_res.status_code == 403


def test_class_creation(client):
    headers = _instructor_headers()
    payload = {
        "class_code": "ELE-B",
        "class_name": "Electrician Batch B",
        "subject": "Electrical",
        "term": "Term 1",
    }
    res = client.post("/api/v1/app/classes", headers=headers, json=payload)
    assert res.status_code == 201
    assert res.json()["data"]["class"]["class_code"] == "ELE-B"

    # Forbidden for learner
    l_headers = _learner_headers()
    l_res = client.post("/api/v1/app/classes", headers=l_headers, json=payload)
    assert l_res.status_code == 403


def test_lesson_authoring_lifecycle(client):
    headers = _instructor_headers()
    # 1. Create lesson
    create_payload = {
        "title": "Three Phase Alternators",
        "body_md": "## Introduction to alternators",
        "kind": "article",
        "status": "published",
    }
    c_res = client.post("/api/v1/app/lessons", headers=headers, json=create_payload)
    assert c_res.status_code == 201
    lid = c_res.json()["data"]["lesson"]["id"]

    # 2. Update lesson
    update_payload = {
        "title": "Three Phase Alternators & Synchronization",
        "body_md": "## Detailed theory",
    }
    u_res = client.put(f"/api/v1/app/lessons/{lid}", headers=headers, json=update_payload)
    assert u_res.status_code == 200
    assert u_res.json()["data"]["lesson"]["title"] == "Three Phase Alternators & Synchronization"

    # 3. Status change
    s_res = client.post(f"/api/v1/app/lessons/{lid}/status", headers=headers, json={"status": "draft"})
    assert s_res.status_code == 200
    assert s_res.json()["data"]["lesson"]["status"] == "draft"

    # 4. Reorder
    r_res = client.post(f"/api/v1/app/lessons/{lid}/reorder", headers=headers, json={"direction": "up"})
    assert r_res.status_code == 200
    assert r_res.json()["data"]["reordered"] is True

    # 5. Delete
    d_res = client.delete(f"/api/v1/app/lessons/{lid}", headers=headers)
    assert d_res.status_code == 200
    assert d_res.json()["data"]["deleted"] is True

    # Forbidden for learner
    l_headers = _learner_headers()
    l_res = client.post("/api/v1/app/lessons", headers=l_headers, json=create_payload)
    assert l_res.status_code == 403


def test_quiz_question_creation_and_deletion(client):
    headers = _instructor_headers()
    # 1. Add question
    q_payload = {
        "prompt": "What is the unit of electrical resistance?",
        "choices": ["Ampere", "Volt", "Ohm", "Watt"],
        "correct_index": 2,
        "qtype": "single",
        "topic": "Fundamentals",
    }
    res = client.post("/api/v1/app/quiz/questions", headers=headers, json=q_payload)
    assert res.status_code == 201
    qid = res.json()["data"]["question"]["id"]

    # 2. Delete question
    d_res = client.delete(f"/api/v1/app/quiz/questions/{qid}", headers=headers)
    assert d_res.status_code == 200
    assert d_res.json()["data"]["deleted"] is True

    # Forbidden for learner
    l_headers = _learner_headers()
    l_res = client.post("/api/v1/app/quiz/questions", headers=l_headers, json=q_payload)
    assert l_res.status_code == 403


def test_manual_class_assignments(client):
    headers = _instructor_headers()
    mid = str(uuid4())

    # 1. Get class assignments
    g_res = client.get(f"/api/v1/app/manuals/{mid}/classes", headers=headers)
    assert g_res.status_code == 200
    assert "class_ids" in g_res.json()["data"]

    # 2. Update class assignments
    payload = {"class_ids": ["c1111111-1111-1111-1111-111111111111", "c2222222-2222-2222-2222-222222222222"]}
    s_res = client.post(f"/api/v1/app/manuals/{mid}/classes", headers=headers, json=payload)
    assert s_res.status_code == 200
    assert len(s_res.json()["data"]["class_ids"]) == 2

    # Forbidden for learner
    l_headers = _learner_headers()
    l_res = client.post(f"/api/v1/app/manuals/{mid}/classes", headers=l_headers, json=payload)
    assert l_res.status_code == 403
