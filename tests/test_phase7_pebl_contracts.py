"""FastAPI HTTP Contract and Integration Tests for Phase 7 PeBL eBook APIs."""
from __future__ import annotations

import uuid
from typing import Any
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules import manuals as manuals_mod
from app.modules import xapi as xapi_mod
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection
from app import db


TENANT_ID = "11111111-1111-1111-1111-111111111111"
OTHER_TENANT = "22222222-2222-2222-2222-222222222222"
MANUAL_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
OTHER_MANUAL = uuid.UUID("44444444-4444-4444-4444-444444444444")
CLASS_ID = "cls-electricians-1"


@pytest.fixture(autouse=True)
def setup_pebl_mocks(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)

    from app.modules import pebl as pebl_mod

    # Mock pebl chapter counts
    monkeypatch.setattr(pebl_mod, "chapter_counts", lambda *a, **k: {})

    # Mock xAPI record methods to return successful statement dict
    monkeypatch.setattr(xapi_mod, "record_ebook_initialized", lambda *a, **k: {"id": "xapi-init-uuid"})
    monkeypatch.setattr(xapi_mod, "record_chapter_experienced", lambda *a, **k: {"id": "xapi-chap-uuid"})
    monkeypatch.setattr(xapi_mod, "record_resource_experienced", lambda *a, **k: {"id": "xapi-res-uuid"})
    monkeypatch.setattr(xapi_mod, "record_reading_progressed", lambda *a, **k: {"id": "xapi-prog-uuid"})
    monkeypatch.setattr(xapi_mod, "record_reading_completed", lambda *a, **k: {"id": "xapi-comp-uuid"})
    monkeypatch.setattr(xapi_mod, "record_bookmark_created", lambda *a, **k: {"id": "xapi-bm-uuid"})

    # Mock manual lookup
    def mock_get_manual(tenant_id: Any, manual_id: Any) -> dict[str, Any] | None:
        if str(tenant_id) == TENANT_ID and str(manual_id) == str(MANUAL_ID):
            return {
                "id": str(MANUAL_ID),
                "tenant_id": TENANT_ID,
                "slug": "domestic-wiring",
                "title": "Domestic Wiring Practice",
                "description": "Circuits and cables.",
                "status": "published",
            }
        return None

    # Mock version lookup
    def mock_latest_version(tenant_id: Any, manual_id: Any) -> dict[str, Any] | None:
        if str(tenant_id) == TENANT_ID and str(manual_id) == str(MANUAL_ID):
            return {
                "id": "ver-1-uuid",
                "manual_id": str(MANUAL_ID),
                "version": 1,
                "is_published": True,
                "changelog": "Initial release",
                "page_count": 62,
                "body_md": (
                    "## Chapter 1 — Supply to the home\n\n"
                    "Power reaches a home through the service cable.\n\n"
                    "Each circuit has its own MCB.\n\n"
                    "## Chapter 2 — Ring circuits\n\n"
                    "A ring circuit starts and ends at the distribution board.\n\n"
                    "Choose cable size for load."
                ),
            }
        return None

    # Mock class visibility
    def mock_visible(tenant_id: Any, *, manual_id: Any, class_id: Any) -> bool:
        return str(tenant_id) == TENANT_ID and str(manual_id) == str(MANUAL_ID) and str(class_id) == CLASS_ID

    def mock_list_for_class(tenant_id: Any, class_id: Any) -> list[dict[str, Any]]:
        if str(tenant_id) == TENANT_ID and str(class_id) == CLASS_ID:
            return [
                {
                    "id": str(MANUAL_ID),
                    "slug": "domestic-wiring",
                    "title": "Domestic Wiring Practice",
                    "description": "Circuits and cables.",
                    "status": "published",
                }
            ]
        return []

    monkeypatch.setattr(manuals_mod, "get_manual", mock_get_manual)
    monkeypatch.setattr(manuals_mod, "latest_published_version", mock_latest_version)
    monkeypatch.setattr(manuals_mod, "get_version", lambda tid, manual_id, version: mock_latest_version(tid, manual_id))
    monkeypatch.setattr(manuals_mod, "manual_visible_to_class", mock_visible)
    monkeypatch.setattr(manuals_mod, "list_manuals_for_class", mock_list_for_class)
    yield
    GLOBAL_PHASE2_STORE.clear()


def _learner_session(monkeypatch, *, class_id=CLASS_ID, subject="student-alice"):
    from app.api.app_client import auth as app_auth

    fake = {
        "tenant_id": TENANT_ID,
        "subject": subject,
        "learner_name": "Alice Learner",
        "quiz_token": f"tok-{subject}",
        "class_id": class_id,
        "is_instructor": False,
        "is_school_admin": False,
        "lti_context_id": "ctx-1",
    }
    monkeypatch.setattr(app_auth, "resolve_quiz_session", lambda *a, **k: fake)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda *a, **k: fake)
    return fake


def test_app_manuals_catalogue_with_class(monkeypatch):
    """Assigned manuals returned with reading progress for learner with class."""
    _learner_session(monkeypatch)
    client = TestClient(app)
    res = client.get("/api/v1/app/manuals", headers={"Authorization": "Bearer tok-student-alice"})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    manuals = body["data"]["manuals"]
    assert len(manuals) == 1
    assert manuals[0]["id"] == str(MANUAL_ID)
    assert manuals[0]["title"] == "Domestic Wiring Practice"
    assert manuals[0]["total_pages"] == 62


def test_app_manuals_empty_without_class_binding(monkeypatch):
    """Learners without class binding receive empty catalogue."""
    _learner_session(monkeypatch, class_id=None)
    client = TestClient(app)
    res = client.get("/api/v1/app/manuals", headers={"Authorization": "Bearer tok-student-alice"})
    assert res.status_code == 200
    assert res.json()["data"]["manuals"] == []


def test_app_manual_read_returns_structured_chapters(monkeypatch):
    """Manual reader endpoint returns structured chapters with paragraphs and metadata."""
    _learner_session(monkeypatch)
    client = TestClient(app)
    res = client.get(f"/api/v1/app/manuals/{MANUAL_ID}", headers={"Authorization": "Bearer tok-student-alice"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["manual"]["title"] == "Domestic Wiring Practice"
    assert data["version"]["version"] == 1
    assert len(data["chapters"]) == 2
    ch1 = data["chapters"][0]
    assert "Supply to the home" in ch1["title"]
    assert len(ch1["paragraphs"]) == 2
    assert "service cable" in ch1["paragraphs"][0]


def test_app_manual_read_forbidden_for_unassigned_class(monkeypatch):
    """Access denied (403) when learner's class is not assigned to the manual."""
    _learner_session(monkeypatch, class_id="cls-unrelated-99")
    client = TestClient(app)
    res = client.get(f"/api/v1/app/manuals/{MANUAL_ID}", headers={"Authorization": "Bearer tok-student-alice"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "forbidden"


def test_app_manual_reading_progress_save_and_retrieve(monkeypatch):
    """Saving and retrieving reading progress persists to DB and triggers xAPI."""
    _learner_session(monkeypatch)
    client = TestClient(app)

    # 1. Save progress at chapter 1, 50%
    save_res = client.post(
        f"/api/v1/app/manuals/{MANUAL_ID}/progress",
        json={"version": 1, "chapter_index": 1, "progress_percent": 50, "cfi": "epubcfi(/6/2!/4/2)"},
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert save_res.status_code == 200
    save_body = save_res.json()
    assert save_body["ok"] is True
    assert save_body["data"]["progress"]["chapter_index"] == 1
    assert save_body["data"]["progress"]["progress_percent"] == 50

    # 2. Retrieve progress
    get_res = client.get(
        f"/api/v1/app/manuals/{MANUAL_ID}/progress?v=1",
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert get_res.status_code == 200
    get_body = get_res.json()
    assert get_body["data"]["progress"]["chapter_index"] == 1
    assert get_body["data"]["progress"]["progress_percent"] == 50


def test_app_manual_bookmark_create_list_and_delete(monkeypatch):
    """Creating, listing, and deleting bookmarks enforces subject ownership."""
    _learner_session(monkeypatch)
    client = TestClient(app)

    # 1. Create bookmark
    create_res = client.post(
        f"/api/v1/app/manuals/{MANUAL_ID}/bookmarks",
        json={"version": 1, "chapter_index": 0, "title": "Service Cable Note"},
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert create_res.status_code == 201
    bm = create_res.json()["data"]["bookmark"]
    assert bm["title"] == "Service Cable Note"
    bm_id = bm["id"]

    # 2. List bookmarks
    list_res = client.get(
        f"/api/v1/app/manuals/{MANUAL_ID}/bookmarks?v=1",
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert list_res.status_code == 200
    bms = list_res.json()["data"]["bookmarks"]
    assert len(bms) == 1
    assert bms[0]["id"] == bm_id

    # 3. Learner Bob attempts to delete Alice's bookmark -> 404 Not Found
    _learner_session(monkeypatch, subject="student-bob")
    del_bob = client.delete(
        f"/api/v1/app/manuals/{MANUAL_ID}/bookmarks/{bm_id}",
        headers={"Authorization": "Bearer tok-student-bob"},
    )
    assert del_bob.status_code == 404

    # 4. Learner Alice deletes her own bookmark -> 200 OK
    _learner_session(monkeypatch, subject="student-alice")
    del_alice = client.delete(
        f"/api/v1/app/manuals/{MANUAL_ID}/bookmarks/{bm_id}",
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert del_alice.status_code == 200
    assert del_alice.json()["data"]["deleted"] is True


def test_app_manual_events_xapi_tracking(monkeypatch):
    """xAPI event milestones are recorded with statement IDs."""
    _learner_session(monkeypatch)
    client = TestClient(app)

    # 1. eBook initialized
    r1 = client.post(
        f"/api/v1/app/manuals/{MANUAL_ID}/events",
        json={"event_type": "ebook_initialized", "version": 1},
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert r1.status_code == 200
    assert r1.json()["data"]["recorded"] is True
    assert r1.json()["data"]["event_type"] == "ebook_initialized"

    # 2. Chapter experienced
    r2 = client.post(
        f"/api/v1/app/manuals/{MANUAL_ID}/events",
        json={"event_type": "chapter_experienced", "version": 1, "chapter_index": 0, "chapter_title": "Chapter 1"},
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert r2.status_code == 200
    assert r2.json()["data"]["recorded"] is True

    # 3. Audio started
    r3 = client.post(
        f"/api/v1/app/manuals/{MANUAL_ID}/events",
        json={"event_type": "audio_started", "version": 1, "chapter_index": 0, "chapter_title": "Chapter 1"},
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert r3.status_code == 200
    assert r3.json()["data"]["recorded"] is True

    # 4. Audio completed
    r4 = client.post(
        f"/api/v1/app/manuals/{MANUAL_ID}/events",
        json={"event_type": "audio_completed", "version": 1, "chapter_index": 0, "chapter_title": "Chapter 1", "duration_seconds": 45},
        headers={"Authorization": "Bearer tok-student-alice"},
    )
    assert r4.status_code == 200
    assert r4.json()["data"]["recorded"] is True


def test_shell_manuals_route_accepts_bearer_token(monkeypatch):
    """Legacy shell manual routes accept Authorization: Bearer token header."""
    from app.quiz_routes import store_quiz_context

    token = store_quiz_context({
        "tenant_id": TENANT_ID,
        "subject": "student-alice",
        "is_instructor": False,
    })
    client = TestClient(app)
    res = client.get(
        f"/api/v1/manuals/{MANUAL_ID}/progress?v=1",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert "progress" in res.json()

