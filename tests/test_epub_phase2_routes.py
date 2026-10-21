"""FastAPI HTTP Route Tests for PeBL Phase 2 APIs.

MOCKED HTTP TESTS:
These tests use FastAPI TestClient with explicit mocked service/DB boundaries to isolate
route tests when PostgreSQL is unavailable. They verify routing, authentication, tenant/learner
derivation, version validation, ownership checks, and 503 error handling.
They do NOT prove live PostgreSQL integration or live PostgreSQL RLS policies.
"""
from __future__ import annotations

import uuid
from typing import Any
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import db
from app.quiz_routes import store_quiz_context
from app.modules import manuals as manuals_mod
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection


# Constant test IDs
TENANT_1 = "00000000-0000-0000-0000-000000000001"
TENANT_2 = "00000000-0000-0000-0000-000000000002"
MANUAL_1 = "11111111-1111-1111-1111-111111111111"
MANUAL_DRAFT = "22222222-2222-2222-2222-222222222222"
LEARNER_A = "learner-alice"
LEARNER_B = "learner-bob"
INSTRUCTOR = "instructor-carol"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def setup_route_mocks(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    from app.launch_cache import LAUNCH_CACHE
    LAUNCH_CACHE.set("rl:/api/v1/:testclient", None)
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)

    # Mock get_manual and get_version to simulate tenant and manual catalogue
    def mock_get_manual(tenant_id: Any, manual_id: Any) -> dict[str, Any] | None:
        tid = str(tenant_id)
        mid = str(manual_id)
        if tid == TENANT_1:
            if mid == MANUAL_1:
                return {
                    "id": MANUAL_1,
                    "tenant_id": TENANT_1,
                    "slug": "epub-guide",
                    "title": "EPUB Guide",
                    "status": "published",
                }
            elif mid == MANUAL_DRAFT:
                return {
                    "id": MANUAL_DRAFT,
                    "tenant_id": TENANT_1,
                    "slug": "draft-guide",
                    "title": "Draft Guide",
                    "status": "draft",
                }
        return None

    def mock_get_version(tenant_id: Any, *, manual_id: Any, version: int) -> dict[str, Any] | None:
        tid = str(tenant_id)
        mid = str(manual_id)
        v = int(version)
        if tid == TENANT_1 and mid == MANUAL_1:
            if v == 1:
                return {
                    "id": "v1-uuid",
                    "manual_id": MANUAL_1,
                    "version": 1,
                    "is_published": True,
                    "content_type": "epub",
                    "epub_manifest": {
                        "spine_items": [{"id": "ch1"}, {"id": "ch2"}, {"id": "ch3"}]
                    },
                }
            elif v == 2:
                # Draft version 2
                return {
                    "id": "v2-uuid",
                    "manual_id": MANUAL_1,
                    "version": 2,
                    "is_published": False,
                    "content_type": "epub",
                }
        elif tid == TENANT_1 and mid == MANUAL_DRAFT and v == 1:
            return {
                "id": "vdraft-uuid",
                "manual_id": MANUAL_DRAFT,
                "version": 1,
                "is_published": True,
            }
        return None

    monkeypatch.setattr(manuals_mod, "get_manual", mock_get_manual)
    monkeypatch.setattr(manuals_mod, "get_version", mock_get_version)
    yield
    GLOBAL_PHASE2_STORE.clear()


@pytest.fixture
def token_learner_a():
    return store_quiz_context({
        "tenant_id": TENANT_1,
        "subject": LEARNER_A,
        "is_instructor": False,
    })


@pytest.fixture
def token_learner_b():
    return store_quiz_context({
        "tenant_id": TENANT_1,
        "subject": LEARNER_B,
        "is_instructor": False,
    })


@pytest.fixture
def token_instructor():
    return store_quiz_context({
        "tenant_id": TENANT_1,
        "subject": INSTRUCTOR,
        "is_instructor": True,
    })


@pytest.fixture
def token_tenant_2():
    return store_quiz_context({
        "tenant_id": TENANT_2,
        "subject": LEARNER_A,
        "is_instructor": False,
    })


# —— 1. UNAUTHENTICATED ACCESS ——

def test_unauthenticated_requests_rejected(client: TestClient):
    endpoints = [
        ("POST", f"/api/v1/manuals/{MANUAL_1}/progress", {"v": 1, "chapter_index": 0}),
        ("GET", f"/api/v1/manuals/{MANUAL_1}/progress?v=1", None),
        ("POST", f"/api/v1/manuals/{MANUAL_1}/bookmarks", {"v": 1, "title": "B"}),
        ("GET", f"/api/v1/manuals/{MANUAL_1}/bookmarks?v=1", None),
        ("POST", f"/api/v1/manuals/{MANUAL_1}/bookmarks/{uuid.uuid4()}/delete", None),
        ("POST", f"/api/v1/manuals/{MANUAL_1}/annotations", {"v": 1, "annotation_text": "A"}),
        ("GET", f"/api/v1/manuals/{MANUAL_1}/annotations?v=1", None),
        ("POST", f"/api/v1/manuals/{MANUAL_1}/annotations/{uuid.uuid4()}", {"annotation_text": "Updated"}),
        ("POST", f"/api/v1/manuals/{MANUAL_1}/annotations/{uuid.uuid4()}/delete", None),
    ]

    for method, url, body in endpoints:
        if method == "POST":
            res = client.post(url, json=body or {})
        else:
            res = client.get(url)
        assert res.status_code == 401, f"{method} {url} returned {res.status_code}, expected 401"
        assert res.json().get("error") == "Unauthorized"


# —— 2. MANUAL & VERSION VALIDATION ——

def test_invalid_manual_returns_404(client: TestClient, token_learner_a: str):
    fake_manual = str(uuid.uuid4())
    res = client.get(f"/api/v1/manuals/{fake_manual}/progress?v=1&token={token_learner_a}")
    assert res.status_code == 404
    assert res.json().get("error") == "Manual not found"


def test_tenant_scope_violation_returns_404(client: TestClient, token_tenant_2: str):
    # Tenant 2 token accessing Tenant 1 manual
    res = client.get(f"/api/v1/manuals/{MANUAL_1}/progress?v=1&token={token_tenant_2}")
    assert res.status_code == 404
    assert res.json().get("error") == "Manual not found"


def test_unpublished_manual_inaccessible_to_learner(client: TestClient, token_learner_a: str, token_instructor: str):
    # Learner access to draft manual -> 404
    res_learner = client.get(f"/api/v1/manuals/{MANUAL_DRAFT}/progress?v=1&token={token_learner_a}")
    assert res_learner.status_code == 404

    # Instructor access to draft manual -> allowed
    res_inst = client.get(f"/api/v1/manuals/{MANUAL_DRAFT}/progress?v=1&token={token_instructor}")
    assert res_inst.status_code == 200


def test_unpublished_version_inaccessible_to_learner(client: TestClient, token_learner_a: str, token_instructor: str):
    # Version 2 of MANUAL_1 is unpublished
    res_learner = client.get(f"/api/v1/manuals/{MANUAL_1}/progress?v=2&token={token_learner_a}")
    assert res_learner.status_code == 404
    assert res_learner.json().get("error") == "Manual version not found"

    # Instructor can access unpublished version
    res_inst = client.get(f"/api/v1/manuals/{MANUAL_1}/progress?v=2&token={token_instructor}")
    assert res_inst.status_code == 200


def test_nonexistent_version_returns_404(client: TestClient, token_learner_a: str):
    res = client.get(f"/api/v1/manuals/{MANUAL_1}/progress?v=99&token={token_learner_a}")
    assert res.status_code == 404
    assert res.json().get("error") == "Manual version not found"


# —— 3. LOCATION & INPUT VALIDATION ——

def test_invalid_location_and_chapter_index_rejected(client: TestClient, token_learner_a: str):
    # Negative chapter index
    res_neg = client.post(
        f"/api/v1/manuals/{MANUAL_1}/progress?token={token_learner_a}",
        json={"v": 1, "chapter_index": -1, "progress_percent": 10},
    )
    assert res_neg.status_code == 400

    # Chapter index out of bounds (MANUAL_1 v1 has 3 spine items: indices 0, 1, 2)
    res_oob = client.post(
        f"/api/v1/manuals/{MANUAL_1}/progress?token={token_learner_a}",
        json={"v": 1, "chapter_index": 5, "progress_percent": 10},
    )
    assert res_oob.status_code == 400
    assert "range" in res_oob.json().get("error", "").lower()

    # Progress percent out of range
    res_pct = client.post(
        f"/api/v1/manuals/{MANUAL_1}/progress?token={token_learner_a}",
        json={"v": 1, "chapter_index": 1, "progress_percent": 150},
    )
    assert res_pct.status_code == 400


def test_annotation_invalid_color_rejected(client: TestClient, token_learner_a: str):
    res = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations?token={token_learner_a}",
        json={"v": 1, "chapter_index": 0, "color": "purple_magic"},
    )
    assert res.status_code == 400
    assert "Invalid color" in res.json().get("error", "")


# —— 4. PROGRESS ENDPOINTS LIFECYCLE & ISOLATION ——

def test_reading_progress_lifecycle_and_learner_isolation(
    client: TestClient, token_learner_a: str, token_learner_b: str
):
    # Learner A saves progress
    res_save = client.post(
        f"/api/v1/manuals/{MANUAL_1}/progress?token={token_learner_a}",
        json={"v": 1, "chapter_index": 1, "cfi": "epub-cfi-chap-2", "progress_percent": 45},
    )
    assert res_save.status_code == 200
    prog = res_save.json().get("progress")
    assert prog["chapter_index"] == 1
    assert prog["progress_percent"] == 45

    # Learner A retrieves progress
    res_get_a = client.get(f"/api/v1/manuals/{MANUAL_1}/progress?v=1&token={token_learner_a}")
    assert res_get_a.status_code == 200
    assert res_get_a.json()["progress"]["chapter_index"] == 1

    # Learner B retrieves progress -> None
    res_get_b = client.get(f"/api/v1/manuals/{MANUAL_1}/progress?v=1&token={token_learner_b}")
    assert res_get_b.status_code == 200
    assert res_get_b.json()["progress"] is None


# —— 5. BOOKMARKS ENDPOINTS LIFECYCLE & ISOLATION ——

def test_bookmark_lifecycle_and_ownership(
    client: TestClient, token_learner_a: str, token_learner_b: str
):
    # Learner A creates bookmark
    res_create = client.post(
        f"/api/v1/manuals/{MANUAL_1}/bookmarks?token={token_learner_a}",
        json={"v": 1, "chapter_index": 0, "title": "Start Reading"},
    )
    assert res_create.status_code == 200
    bm = res_create.json()["bookmark"]
    bm_id = bm["id"]

    # Learner A lists bookmarks
    res_list_a = client.get(f"/api/v1/manuals/{MANUAL_1}/bookmarks?v=1&token={token_learner_a}")
    assert res_list_a.status_code == 200
    assert len(res_list_a.json()["bookmarks"]) == 1

    # Learner B lists bookmarks -> 0
    res_list_b = client.get(f"/api/v1/manuals/{MANUAL_1}/bookmarks?v=1&token={token_learner_b}")
    assert res_list_b.status_code == 200
    assert len(res_list_b.json()["bookmarks"]) == 0

    # Learner B attempts to delete Learner A's bookmark -> 404 (safe, no leak)
    res_del_b = client.post(
        f"/api/v1/manuals/{MANUAL_1}/bookmarks/{bm_id}/delete?token={token_learner_b}"
    )
    assert res_del_b.status_code == 404

    # Tampered/wrong manual ID delete attempt
    res_del_wrong_manual = client.post(
        f"/api/v1/manuals/{uuid.uuid4()}/bookmarks/{bm_id}/delete?token={token_learner_a}"
    )
    assert res_del_wrong_manual.status_code == 404

    # Learner A deletes bookmark -> 200
    res_del_a = client.post(
        f"/api/v1/manuals/{MANUAL_1}/bookmarks/{bm_id}/delete?token={token_learner_a}"
    )
    assert res_del_a.status_code == 200
    assert res_del_a.json()["status"] == "ok"


# —— 6. ANNOTATION ENDPOINTS LIFECYCLE, UPDATE & ISOLATION ——

def test_annotation_lifecycle_update_and_ownership(
    client: TestClient, token_learner_a: str, token_learner_b: str
):
    # Learner A creates annotation
    res_create = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations?token={token_learner_a}",
        json={
            "v": 1,
            "chapter_index": 1,
            "cfi_range": "epub-cfi-chap-2",
            "highlight_text": "Essential note",
            "annotation_text": "Initial thought",
            "color": "yellow",
        },
    )
    assert res_create.status_code == 200
    ann = res_create.json()["annotation"]
    ann_id = ann["id"]

    # Learner A lists annotations
    res_list = client.get(f"/api/v1/manuals/{MANUAL_1}/annotations?v=1&token={token_learner_a}")
    assert res_list.status_code == 200
    assert len(res_list.json()["annotations"]) == 1

    # Learner B attempts to update Learner A's annotation -> 404 (safe)
    res_up_b = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations/{ann_id}?token={token_learner_b}",
        json={"annotation_text": "Tampered note"},
    )
    assert res_up_b.status_code == 404

    # Learner A updates annotation (valid text & color)
    res_up_a = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations/{ann_id}?token={token_learner_a}",
        json={"annotation_text": "Updated reflection", "color": "green"},
    )
    assert res_up_a.status_code == 200
    assert res_up_a.json()["status"] == "ok"

    # Verify update persisted
    res_verify = client.get(f"/api/v1/manuals/{MANUAL_1}/annotations?v=1&token={token_learner_a}")
    anns = res_verify.json()["annotations"]
    assert anns[0]["annotation_text"] == "Updated reflection"
    assert anns[0]["color"] == "green"

    # Update with invalid color rejected with 400
    res_up_bad_color = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations/{ann_id}?token={token_learner_a}",
        json={"color": "invalid_magenta"},
    )
    assert res_up_bad_color.status_code == 400

    # Tampered/wrong manual ID update attempt
    res_up_wrong_manual = client.post(
        f"/api/v1/manuals/{uuid.uuid4()}/annotations/{ann_id}?token={token_learner_a}",
        json={"annotation_text": "test"},
    )
    assert res_up_wrong_manual.status_code == 404

    # Learner B attempts to delete Learner A's annotation -> 404
    res_del_b = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations/{ann_id}/delete?token={token_learner_b}"
    )
    assert res_del_b.status_code == 404

    # Learner A deletes annotation -> 200
    res_del_a = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations/{ann_id}/delete?token={token_learner_a}"
    )
    assert res_del_a.status_code == 200


# —— 7. DATABASE PERSISTENCE UNAVAILABLE (HTTP 503) ——

def test_database_unavailable_returns_503(
    client: TestClient, token_learner_a: str, monkeypatch
):
    import psycopg

    def failing_conn(*args, **kwargs):
        raise psycopg.OperationalError("Could not connect to server: Connection refused")

    monkeypatch.setattr(db, "tenant_connection", failing_conn)

    # Routes must return HTTP 503 rather than 500 or fake in-memory success
    res_prog = client.post(
        f"/api/v1/manuals/{MANUAL_1}/progress?token={token_learner_a}",
        json={"v": 1, "chapter_index": 0, "progress_percent": 10},
    )
    assert res_prog.status_code == 503
    assert res_prog.json().get("error") == "Database service is currently unavailable"

    res_bm = client.post(
        f"/api/v1/manuals/{MANUAL_1}/bookmarks?token={token_learner_a}",
        json={"v": 1, "title": "B"},
    )
    assert res_bm.status_code == 503

    res_ann = client.post(
        f"/api/v1/manuals/{MANUAL_1}/annotations?token={token_learner_a}",
        json={"v": 1, "annotation_text": "A"},
    )
    assert res_ann.status_code == 503
