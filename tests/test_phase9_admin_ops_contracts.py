"""FastAPI HTTP Contract and Integration Tests for Phase 9 Admin & Operator APIs."""
from __future__ import annotations

from typing import Any
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules import school as school_mod
from app.modules import quiz as quiz_mod
from app.modules import xapi as xapi_mod
from app import db
from tests.phase2_mock_db import GLOBAL_PHASE2_STORE, mock_phase2_tenant_connection


SESSION_REGISTRY: dict[str, dict] = {}
TENANT_A = "11111111-1111-1111-1111-111111111111"
TENANT_B = "22222222-2222-2222-2222-222222222222"
ADMIN_KEY = "test-operator-secret-key"


@pytest.fixture
def client():
    return TestClient(app)


def _admin_headers(tenant_id: str | None = None, subject: str = "admin-1") -> dict[str, str]:
    tid = tenant_id or TENANT_A
    tok = f"tok-admin-{subject}"
    SESSION_REGISTRY[tok] = {
        "tenant_id": tid,
        "subject": subject,
        "learner_name": "Admin Sharma",
        "is_instructor": False,
        "is_school_admin": True,
        "is_admin": True,
        "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator"],
        "quiz_token": tok,
    }
    return {"Authorization": f"Bearer {tok}"}


def _learner_headers(tenant_id: str | None = None, subject: str = "learner-1") -> dict[str, str]:
    tid = tenant_id or TENANT_A
    tok = f"tok-learn-{subject}"
    SESSION_REGISTRY[tok] = {
        "tenant_id": tid,
        "subject": subject,
        "learner_name": "Learner Meena",
        "is_instructor": False,
        "is_school_admin": False,
        "is_admin": False,
        "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
        "quiz_token": tok,
    }
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(autouse=True)
def setup_phase9_mocks(monkeypatch):
    GLOBAL_PHASE2_STORE.clear()
    SESSION_REGISTRY.clear()
    monkeypatch.setattr(db, "tenant_connection", mock_phase2_tenant_connection)

    from app.api.app_client import auth as app_auth
    from app import quiz_routes
    from app import admin_auth, ops_routes
    from app.settings import get_settings

    # Set admin key
    monkeypatch.setattr(admin_auth, "admin_key_matches", lambda cand: cand == ADMIN_KEY)
    monkeypatch.setattr(ops_routes, "admin_key_matches", lambda cand: cand == ADMIN_KEY)

    def _resolve_mock(request=None, token=None):
        if token and token in SESSION_REGISTRY:
            return SESSION_REGISTRY[token]
        return None

    monkeypatch.setattr(app_auth, "resolve_quiz_session", _resolve_mock)
    monkeypatch.setattr(app_auth, "load_quiz_context", lambda tok: SESSION_REGISTRY.get(tok))
    monkeypatch.setattr(quiz_routes, "resolve_quiz_session", _resolve_mock)
    monkeypatch.setattr(quiz_routes, "load_quiz_context", lambda tok: SESSION_REGISTRY.get(tok))

    # Disable RateLimitMiddleware during Phase 9 contracts to allow exhaustive matrix testing
    from app.rate_limit import RateLimitMiddleware
    monkeypatch.setattr(RateLimitMiddleware, "_allow", lambda *a, **k: True)

    # Mock school service
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
    mock_teachers = [
        {"id": "t1", "teacher_code": "TCH001", "name": "Instructor Suresh", "email": "suresh@example.edu", "status": "active"}
    ]
    mock_students = [
        {"id": "s1", "student_code": "STU001", "name": "Learner Meena", "email": "meena@example.edu", "status": "active"}
    ]

    monkeypatch.setattr(school_mod, "list_classes_with_roster", lambda tid: mock_classes)
    monkeypatch.setattr(school_mod, "list_teachers", lambda tid: mock_teachers)
    monkeypatch.setattr(school_mod, "list_school_students", lambda tid: mock_students)
    monkeypatch.setattr(
        school_mod,
        "school_snapshot",
        lambda tid: {
            "course": {"id": "co1", "title": "Electrician Curriculum"},
            "chapters": [],
            "admins": [{"id": "a1", "name": "Admin Sharma"}],
            "teachers": mock_teachers,
            "classes": mock_classes,
            "lti_bindings": [{"id": "b1"}],
            "student_count": 28,
            "teacher_count": 2,
            "class_count": 1,
            "chapter_count": 12,
            "binding_count": 1,
            "admin_count": 1,
        },
    )
    monkeypatch.setattr(
        school_mod,
        "create_teacher",
        lambda tid, *, teacher_code, name, email: {
            "id": str(uuid4()),
            "teacher_code": teacher_code,
            "name": name,
            "email": email,
            "status": "active",
        },
    )
    monkeypatch.setattr(quiz_mod, "list_attempts_for_tenant", lambda *a, **k: [])

    # Mock DB tenant & platform methods
    mock_tenant_row = {
        "id": TENANT_A,
        "slug": "iti-nashik",
        "name": "Govt ITI Nashik",
        "status": "active",
        "segment": "school",
        "capabilities": {},
        "enabled_blocks": [],
        "created_at": "2026-09-01T00:00:00Z",
    }
    monkeypatch.setattr(db, "get_tenant", lambda tid: mock_tenant_row if str(tid) == TENANT_A else None)
    monkeypatch.setattr(db, "list_tenants", lambda: [mock_tenant_row])
    monkeypatch.setattr(
        db,
        "list_institutions",
        lambda: [
            {
                "id": str(uuid4()),
                "tenant_id": TENANT_A,
                "institution_code": "ITI-NSK",
                "institution_name": "Govt ITI Nashik",
                "issuer": "http://127.0.0.1:8085",
                "client_id": "client-123",
                "deployment_ids": ["1"],
                "status": "active",
                "created_at": "2026-09-01T00:00:00Z",
            }
        ],
    )
    monkeypatch.setattr(db, "list_all_platforms", lambda: [])
    monkeypatch.setattr(xapi_mod, "retry_failed_lrs", lambda tid: {"retried": 5, "sent": 5})


def test_school_admin_overview_endpoint(client: TestClient):
    headers = _admin_headers()
    res = client.get("/api/v1/app/school-admin/overview", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["data"]["institution"]["code"] == "iti-nashik"
    assert body["data"]["snapshot"]["student_count"] == 28
    assert body["data"]["figures"]["learnersLaunched"] == 28
    assert body["data"]["figures"]["classesLinks"] == 1

    # Learner rejected with 403
    l_headers = _learner_headers()
    l_res = client.get("/api/v1/app/school-admin/overview", headers=l_headers)
    assert l_res.status_code == 403


def test_teachers_list_and_creation(client: TestClient):
    headers = _admin_headers()

    # 1. List teachers
    g_res = client.get("/api/v1/app/teachers", headers=headers)
    assert g_res.status_code == 200
    assert len(g_res.json()["data"]["teachers"]) == 1
    assert g_res.json()["data"]["teachers"][0]["name"] == "Instructor Suresh"

    # 2. Create teacher
    payload = {
        "teacher_code": "TCH002",
        "name": "Farhan Qureshi",
        "email": "farhan@example.edu",
    }
    c_res = client.post("/api/v1/app/teachers", headers=headers, json=payload)
    assert c_res.status_code == 201
    assert c_res.json()["data"]["teacher"]["name"] == "Farhan Qureshi"

    # Learner rejected with 403
    l_headers = _learner_headers()
    l_res = client.post("/api/v1/app/teachers", headers=l_headers, json=payload)
    assert l_res.status_code == 403


def test_students_list(client: TestClient):
    headers = _admin_headers()
    res = client.get("/api/v1/app/students", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert len(body["data"]["students"]) == 1
    assert body["data"]["students"][0]["student_code"] == "STU001"

    # Learner rejected with 403
    l_headers = _learner_headers()
    l_res = client.get("/api/v1/app/students", headers=l_headers)
    assert l_res.status_code == 403


def test_operator_login_flow(client: TestClient):
    # Missing Origin and Referer -> 403 CSRF rejection (even with valid key, no session is established)
    no_hdr_res = client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY})
    assert no_hdr_res.status_code == 403
    # Verify no session was created: subsequent protected request fails with 401
    assert client.get("/api/v1/ops/overview").status_code == 401

    # Bad key with trusted origin -> 401
    bad_res = client.post(
        "/api/v1/ops/login",
        json={"admin_key": "wrong-key"},
        headers={"Origin": "http://localhost:3000"},
    )
    assert bad_res.status_code == 401
    assert bad_res.json()["ok"] is False

    # Untrusted origin login -> 403 CSRF rejection
    csrf_login = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://evil-site.com"},
    )
    assert csrf_login.status_code == 403

    # Good key with trusted origin or no-origin CLI -> 200 OK + session cookie set
    good_res = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:3000"},
    )
    assert good_res.status_code == 200
    assert good_res.json()["ok"] is True
    assert good_res.json()["data"]["signed_in"] is True
    # Confirm raw admin key is NEVER returned in response
    assert "admin_key" not in good_res.json()["data"]


def test_operator_overview_cross_tenant_access(client: TestClient):
    # 1. Server-to-server legacy X-Admin-Key still supported
    op_headers = {"X-Admin-Key": ADMIN_KEY}
    res = client.get("/api/v1/ops/overview", headers=op_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert len(body["data"]["tenants"]) == 1
    assert len(body["data"]["institutions"]) == 1

    # 2. Session cookie authentication without X-Admin-Key header
    # First sign in to establish session
    login_res = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:3000"},
    )
    assert login_res.status_code == 200

    # Next request uses cookie automatically via TestClient session
    cookie_res = client.get("/api/v1/ops/overview")
    assert cookie_res.status_code == 200
    assert cookie_res.json()["ok"] is True
    assert len(cookie_res.json()["data"]["tenants"]) == 1

    # 3. Learner token rejected from operator overview (401)
    l_headers = _learner_headers()
    # Create fresh client without ops cookie to test learner token rejection
    fresh_client = TestClient(app)
    l_res = fresh_client.get("/api/v1/ops/overview", headers=l_headers)
    assert l_res.status_code == 401

    # 4. Instructor / School Admin token rejected from operator overview (401)
    a_headers = _admin_headers()
    a_res = fresh_client.get("/api/v1/ops/overview", headers=a_headers)
    assert a_res.status_code == 401


def test_operator_lrs_retry_and_csrf(client: TestClient):
    # Login to get session
    login_res = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:3000"},
    )
    assert login_res.status_code == 200

    payload = {"tenant_id": TENANT_A}

    # 1. Successful retry using session cookie with trusted origin
    trusted_headers = {"Origin": "http://localhost:3000"}
    res = client.post("/api/v1/ops/retry-lrs", json=payload, headers=trusted_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["data"]["retried"] == 5
    assert body["data"]["sent"] == 5

    # 2. CSRF rejection on untrusted origin
    untrusted_headers = {"Origin": "http://malicious-site.com"}
    csrf_res = client.post("/api/v1/ops/retry-lrs", json=payload, headers=untrusted_headers)
    assert csrf_res.status_code == 403

    # 3. CSRF rejection on untrusted logout
    untrusted_logout = client.post("/api/v1/ops/logout", headers={"Origin": "http://evil-site.com"})
    assert untrusted_logout.status_code == 403

    # 4. Successful logout with trusted origin invalidates session
    logout_res = client.post("/api/v1/ops/logout", headers={"Origin": "http://localhost:3000"})
    assert logout_res.status_code == 200

    # 5. Subsequent request after logout fails (401)
    after_res = client.get("/api/v1/ops/overview")
    assert after_res.status_code == 401

    # 6. Legacy server-to-server admin key on retry endpoint continues to work without session cookie
    fresh_client = TestClient(app)
    s2s_res = fresh_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert s2s_res.status_code == 200
    assert s2s_res.json()["ok"] is True


def test_html_operator_csrf_and_session_lifecycle(client: TestClient):
    """Verify HTML operator routes: login, logout, retry-lrs CSRF & method constraints."""
    # 1. Untrusted origin on HTML login -> 403 CSRF rejection
    bad_login = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://evil-site.com"},
        follow_redirects=False,
    )
    assert bad_login.status_code == 403

    # 2. Trusted origin on HTML login -> 303 Redirect to /ops/dashboard
    good_login = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:8000"},
        follow_redirects=False,
    )
    assert good_login.status_code == 303
    assert good_login.headers["location"] == "/ops/dashboard"

    # 3. GET /ops/logout does NOT log out (returns 405 Method Not Allowed)
    get_logout = client.get("/ops/logout", follow_redirects=False)
    assert get_logout.status_code == 405

    # Confirm operator session is still active on dashboard
    dash_res = client.get("/ops/dashboard", follow_redirects=False)
    assert dash_res.status_code == 200

    # 4. Untrusted origin on HTML retry-lrs -> 403 CSRF rejection
    bad_retry = client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Origin": "http://evil-site.com"},
        follow_redirects=False,
    )
    assert bad_retry.status_code == 403

    # 5. Trusted origin on HTML retry-lrs -> 303 Redirect with success
    good_retry = client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Origin": "http://localhost:8000"},
        follow_redirects=False,
    )
    assert good_retry.status_code == 303
    assert "ok=" in good_retry.headers["location"]

    # 6. Untrusted origin on HTML logout -> 403 CSRF rejection
    bad_logout = client.post(
        "/ops/logout",
        headers={"Origin": "http://evil-site.com"},
        follow_redirects=False,
    )
    assert bad_logout.status_code == 403

    # 7. Trusted origin on HTML logout -> 303 Redirect to /ops/login
    good_logout = client.post(
        "/ops/logout",
        headers={"Origin": "http://localhost:8000"},
        follow_redirects=False,
    )
    assert good_logout.status_code == 303
    assert good_logout.headers["location"] == "/ops/login"

    # 8. Subsequent dashboard access after HTML logout redirects to /ops/login (303)
    post_dash = client.get("/ops/dashboard", follow_redirects=False)
    assert post_dash.status_code == 303
    assert post_dash.headers["location"] == "/ops/login"


def test_operator_csrf_rigorous_edge_cases(client: TestClient):
    """Exhaustive edge-case verification for CSRF on all operator state-changing endpoints."""
    # --- Part 1: Login Endpoints (POST /api/v1/ops/login & POST /ops/login) ---
    # 1. Valid trusted Origin accepted
    r1 = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:3000"},
    )
    assert r1.status_code == 200

    r1_html = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:8000"},
        follow_redirects=False,
    )
    assert r1_html.status_code == 303
    assert r1_html.headers["location"] == "/ops/dashboard"

    # 2. Origin absent, valid trusted Referer accepted
    r2 = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Referer": "http://localhost:3000/ops/login"},
    )
    assert r2.status_code == 200

    r2_html = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={"Referer": "http://localhost:8000/ops/login"},
        follow_redirects=False,
    )
    assert r2_html.status_code == 303

    # 3. Untrusted Origin rejected (403)
    r3 = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://evil.com"},
    )
    assert r3.status_code == 403

    r3_html = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://evil.com"},
        follow_redirects=False,
    )
    assert r3_html.status_code == 403

    # 4. Untrusted Referer rejected when Origin absent (403)
    r4 = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Referer": "http://evil.com/page"},
    )
    assert r4.status_code == 403

    r4_html = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={"Referer": "http://evil.com/page"},
        follow_redirects=False,
    )
    assert r4_html.status_code == 403

    # 7 & 8. Untrusted Origin must not be overridden by trusted Referer; scheme/host/port exact match
    r7_8 = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={
            "Origin": "http://localhost:3000.evil.com",
            "Referer": "http://localhost:3000/ops/login",
        },
    )
    assert r7_8.status_code == 403

    r7_8_html = client.post(
        "/ops/login",
        data={"admin_key": ADMIN_KEY},
        headers={
            "Origin": "http://localhost:8000.evil.com",
            "Referer": "http://localhost:8000/ops/login",
        },
        follow_redirects=False,
    )
    assert r7_8_html.status_code == 403

    # Malformed Origin rejected
    r_mal = client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "javascript:alert(1)"},
    )
    assert r_mal.status_code == 403

    # Missing both headers on login rejected with 403 (no session established)
    r_no_hdr_api = client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY})
    assert r_no_hdr_api.status_code == 403
    r_no_hdr_html = client.post("/ops/login", data={"admin_key": ADMIN_KEY}, follow_redirects=False)
    assert r_no_hdr_html.status_code == 403

    # --- Part 2: Cookie-authenticated Endpoints (API and HTML) ---
    # Establish cookie session
    session_client = TestClient(app)
    init_login = session_client.post(
        "/api/v1/ops/login",
        json={"admin_key": ADMIN_KEY},
        headers={"Origin": "http://localhost:3000"},
    )
    assert init_login.status_code == 200

    payload = {"tenant_id": TENANT_A}

    # 1. Valid trusted Origin accepted
    ok_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Origin": "http://localhost:3000"},
    )
    assert ok_retry.status_code == 200

    ok_html_retry = session_client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Origin": "http://localhost:8000"},
        follow_redirects=False,
    )
    assert ok_html_retry.status_code == 303

    # 2. Origin absent, valid trusted Referer accepted
    ref_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Referer": "http://localhost:3000/ops/dashboard"},
    )
    assert ref_retry.status_code == 200

    ref_html_retry = session_client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Referer": "http://localhost:8000/ops/dashboard"},
        follow_redirects=False,
    )
    assert ref_html_retry.status_code == 303

    # 3. Untrusted Origin rejected
    bad_org_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Origin": "http://evil.com"},
    )
    assert bad_org_retry.status_code == 403

    bad_org_logout = session_client.post(
        "/api/v1/ops/logout",
        headers={"Origin": "http://evil.com"},
    )
    assert bad_org_logout.status_code == 403

    bad_org_html_retry = session_client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Origin": "http://evil.com"},
        follow_redirects=False,
    )
    assert bad_org_html_retry.status_code == 403

    bad_org_html_logout = session_client.post(
        "/ops/logout",
        headers={"Origin": "http://evil.com"},
        follow_redirects=False,
    )
    assert bad_org_html_logout.status_code == 403

    # 4. Untrusted Referer rejected when Origin is absent
    bad_ref_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Referer": "http://evil.com/page"},
    )
    assert bad_ref_retry.status_code == 403

    bad_ref_logout = session_client.post(
        "/api/v1/ops/logout",
        headers={"Referer": "http://evil.com/page"},
    )
    assert bad_ref_logout.status_code == 403

    bad_ref_html_retry = session_client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Referer": "http://evil.com/page"},
        follow_redirects=False,
    )
    assert bad_ref_html_retry.status_code == 403

    bad_ref_html_logout = session_client.post(
        "/ops/logout",
        headers={"Referer": "http://evil.com/page"},
        follow_redirects=False,
    )
    assert bad_ref_html_logout.status_code == 403

    # 5. Missing BOTH Origin and Referer on cookie-authenticated request is rejected (403)
    no_hdr_retry = session_client.post("/api/v1/ops/retry-lrs", json=payload)
    assert no_hdr_retry.status_code == 403

    no_hdr_logout = session_client.post("/api/v1/ops/logout")
    assert no_hdr_logout.status_code == 403

    no_hdr_html_retry = session_client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        follow_redirects=False,
    )
    assert no_hdr_html_retry.status_code == 403

    no_hdr_html_logout = session_client.post("/ops/logout", follow_redirects=False)
    assert no_hdr_html_logout.status_code == 403

    # 6. Malformed Origin or Referer is rejected
    mal_org_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Origin": "http://localhost:3000/unexpected/path"},
    )
    assert mal_org_retry.status_code == 403

    mal_ref_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Referer": "javascript:alert(1)"},
    )
    assert mal_ref_retry.status_code == 403

    mal_ref_html = session_client.post(
        "/ops/retry-lrs",
        data={"tenant_id": TENANT_A},
        headers={"Referer": "://invalid-url"},
        follow_redirects=False,
    )
    assert mal_ref_html.status_code == 403

    # 7. Exact scheme, hostname, and port matching (no unsafe prefix/suffix/substring matching)
    sub_org_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Origin": "http://localhost:3000.evil.com"},
    )
    assert sub_org_retry.status_code == 403

    port_org_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Origin": "http://localhost:3001"},
    )
    assert port_org_retry.status_code == 403

    userinfo_ref_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Referer": "http://localhost:3000@evil.com/page"},
    )
    assert userinfo_ref_retry.status_code == 403

    # 8. Supplied untrusted Origin must NOT be overridden by trusted Referer
    mixed_retry = session_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={
            "Origin": "http://evil.com",
            "Referer": "http://localhost:3000/ops/dashboard",
        },
    )
    assert mixed_retry.status_code == 403

    mixed_logout = session_client.post(
        "/api/v1/ops/logout",
        headers={
            "Origin": "http://evil.com",
            "Referer": "http://localhost:3000/ops/dashboard",
        },
    )
    assert mixed_logout.status_code == 403

    mixed_html_logout = session_client.post(
        "/ops/logout",
        headers={
            "Origin": "http://evil.com",
            "Referer": "http://localhost:8000/ops/dashboard",
        },
        follow_redirects=False,
    )
    assert mixed_html_logout.status_code == 403

    # 9. Legacy server-to-server X-Admin-Key continues to work without browser Origin/Referer
    s2s_client = TestClient(app)
    s2s_res = s2s_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert s2s_res.status_code == 200
    assert s2s_res.json()["ok"] is True

    # 10. GET /ops/logout cannot modify session
    get_logout = session_client.get("/ops/logout", follow_redirects=False)
    assert get_logout.status_code == 405
    # Confirm session is still valid
    dash_check = session_client.get("/ops/dashboard", follow_redirects=False)
    assert dash_check.status_code == 200


def test_server_to_server_exemption_and_matrix_verification(client: TestClient):
    """Verify server-to-server auth boundary and exhaustive 6-endpoint CSRF matrix."""
    payload = {"tenant_id": TENANT_A}

    # === SECTION 1: Server-to-Server Exemption Boundary Verification ===
    # 1. Valid legacy X-Admin-Key without session cookie succeeds without Origin/Referer
    s2s = TestClient(app)
    res_retry = s2s.post("/api/v1/ops/retry-lrs", json=payload, headers={"X-Admin-Key": ADMIN_KEY})
    assert res_retry.status_code == 200
    res_over = s2s.get("/api/v1/ops/overview", headers={"X-Admin-Key": ADMIN_KEY})
    assert res_over.status_code == 200

    # 2. Invalid X-Admin-Key is rejected with 401
    bad_key_res = s2s.post("/api/v1/ops/retry-lrs", json=payload, headers={"X-Admin-Key": "wrong-key"})
    assert bad_key_res.status_code == 401
    bad_key_over = s2s.get("/api/v1/ops/overview", headers={"X-Admin-Key": "wrong-key"})
    assert bad_key_over.status_code == 401

    # 3. Requests with BOTH operator session cookie AND X-Admin-Key do NOT bypass CSRF
    dual_client = TestClient(app)
    # Login to create session cookie
    dual_client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:3000"})
    # Attacker tries to bypass CSRF on session by adding X-Admin-Key from untrusted origin -> must be 403!
    dual_csrf_org = dual_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"Origin": "http://evil.com", "X-Admin-Key": ADMIN_KEY},
    )
    assert dual_csrf_org.status_code == 403

    # Attacker tries to bypass CSRF on session by stripping both headers -> must be 403!
    dual_csrf_none = dual_client.post(
        "/api/v1/ops/retry-lrs",
        json=payload,
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert dual_csrf_none.status_code == 403

    # 4. Arbitrary / unrecognized headers without valid auth fail with 401
    arb_res = s2s.post("/api/v1/ops/retry-lrs", json=payload, headers={"X-Arbitrary-Auth": "true"})
    assert arb_res.status_code == 401

    # === SECTION 2: Exhaustive 6-Endpoint Request-Level Matrix ===

    # Helper for authenticated session
    def _make_auth_client():
        c = TestClient(app)
        c.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:8000"}, follow_redirects=False)
        return c

    # --- 1. POST /ops/login ---
    # Trusted Origin
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:8000"}, follow_redirects=False).status_code == 303
    # Trusted Referer fallback
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Referer": "http://localhost:8000/ops/login"}, follow_redirects=False).status_code == 303
    # Untrusted Origin
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://evil.com"}, follow_redirects=False).status_code == 403
    # Untrusted Referer
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Referer": "http://evil.com/ops/login"}, follow_redirects=False).status_code == 403
    # Missing both headers -> 403 Forbidden (no session created)
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, follow_redirects=False).status_code == 403
    assert client.post("/ops/login", data={"admin_key": "wrong"}, follow_redirects=False).status_code == 403
    # Malformed headers
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:8000/path"}, follow_redirects=False).status_code == 403
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Referer": "://invalid"}, follow_redirects=False).status_code == 403
    # Origin spoofing & incorrect ports
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:8000.evil.com"}, follow_redirects=False).status_code == 403
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:8001"}, follow_redirects=False).status_code == 403
    # Untrusted Origin + trusted Referer
    assert client.post("/ops/login", data={"admin_key": ADMIN_KEY}, headers={"Origin": "http://evil.com", "Referer": "http://localhost:8000/ops/login"}, follow_redirects=False).status_code == 403

    # --- 2. POST /api/v1/ops/login ---
    # Trusted Origin
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:3000"}).status_code == 200
    # Trusted Referer fallback
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Referer": "http://localhost:3000/ops"}).status_code == 200
    # Untrusted Origin
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://evil.com"}).status_code == 403
    # Untrusted Referer
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Referer": "http://evil.com/page"}).status_code == 403
    # Missing both headers -> 403 Forbidden (no session created)
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}).status_code == 403
    assert client.post("/api/v1/ops/login", json={"admin_key": "wrong"}).status_code == 403
    # Malformed headers
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:3000/path"}).status_code == 403
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Referer": "javascript:alert(1)"}).status_code == 403
    # Origin spoofing & incorrect ports
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:3000.evil.com"}).status_code == 403
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://localhost:3001"}).status_code == 403
    # Untrusted Origin + trusted Referer
    assert client.post("/api/v1/ops/login", json={"admin_key": ADMIN_KEY}, headers={"Origin": "http://evil.com", "Referer": "http://localhost:3000/ops"}).status_code == 403

    # --- 3. POST /ops/logout ---
    # Trusted Origin
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Origin": "http://localhost:8000"}, follow_redirects=False).status_code == 303
    # Trusted Referer fallback
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Referer": "http://localhost:8000/ops/dashboard"}, follow_redirects=False).status_code == 303
    # Untrusted Origin
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Origin": "http://evil.com"}, follow_redirects=False).status_code == 403
    # Untrusted Referer
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Referer": "http://evil.com/logout"}, follow_redirects=False).status_code == 403
    # Missing both headers
    c = _make_auth_client()
    assert c.post("/ops/logout", follow_redirects=False).status_code == 403
    # Malformed headers
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Origin": "http://localhost:8000/unexpected"}, follow_redirects=False).status_code == 403
    assert c.post("/ops/logout", headers={"Referer": "://bad"}, follow_redirects=False).status_code == 403
    # Origin spoofing & incorrect ports
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Origin": "http://localhost:8000.fake.com"}, follow_redirects=False).status_code == 403
    assert c.post("/ops/logout", headers={"Origin": "http://localhost:8002"}, follow_redirects=False).status_code == 403
    # Untrusted Origin + trusted Referer
    c = _make_auth_client()
    assert c.post("/ops/logout", headers={"Origin": "http://evil.com", "Referer": "http://localhost:8000/ops/dashboard"}, follow_redirects=False).status_code == 403

    # --- 4. POST /api/v1/ops/logout ---
    # Trusted Origin
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Origin": "http://localhost:3000"}).status_code == 200
    # Trusted Referer fallback
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Referer": "http://localhost:3000/ops/dashboard"}).status_code == 200
    # Untrusted Origin
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Origin": "http://evil.com"}).status_code == 403
    # Untrusted Referer
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Referer": "http://evil.com/page"}).status_code == 403
    # Missing both headers
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout").status_code == 403
    # Malformed headers
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Origin": "http://localhost:3000/path"}).status_code == 403
    assert c.post("/api/v1/ops/logout", headers={"Referer": "javascript:alert(1)"}).status_code == 403
    # Origin spoofing & incorrect ports
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Origin": "http://localhost:3000.evil.com"}).status_code == 403
    assert c.post("/api/v1/ops/logout", headers={"Origin": "http://localhost:3001"}).status_code == 403
    # Untrusted Origin + trusted Referer
    c = _make_auth_client()
    assert c.post("/api/v1/ops/logout", headers={"Origin": "http://evil.com", "Referer": "http://localhost:3000/ops"}).status_code == 403

    # --- 5. POST /ops/retry-lrs ---
    # Trusted Origin
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Origin": "http://localhost:8000"}, follow_redirects=False).status_code == 303
    # Trusted Referer fallback
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Referer": "http://localhost:8000/ops/dashboard"}, follow_redirects=False).status_code == 303
    # Untrusted Origin
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Origin": "http://evil.com"}, follow_redirects=False).status_code == 403
    # Untrusted Referer
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Referer": "http://evil.com/retry"}, follow_redirects=False).status_code == 403
    # Missing both headers
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, follow_redirects=False).status_code == 403
    # Malformed headers
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Origin": "http://localhost:8000/bad/path"}, follow_redirects=False).status_code == 403
    assert c.post("/ops/retry-lrs", data=payload, headers={"Referer": "://malformed"}, follow_redirects=False).status_code == 403
    # Origin spoofing & incorrect ports
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Origin": "http://localhost:8000.evil.com"}, follow_redirects=False).status_code == 403
    assert c.post("/ops/retry-lrs", data=payload, headers={"Origin": "http://localhost:8005"}, follow_redirects=False).status_code == 403
    # Untrusted Origin + trusted Referer
    c = _make_auth_client()
    assert c.post("/ops/retry-lrs", data=payload, headers={"Origin": "http://evil.com", "Referer": "http://localhost:8000/ops/dashboard"}, follow_redirects=False).status_code == 403

    # --- 6. POST /api/v1/ops/retry-lrs ---
    # Trusted Origin
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Origin": "http://localhost:3000"}).status_code == 200
    # Trusted Referer fallback
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Referer": "http://localhost:3000/ops/dashboard"}).status_code == 200
    # Untrusted Origin
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Origin": "http://evil.com"}).status_code == 403
    # Untrusted Referer
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Referer": "http://evil.com/page"}).status_code == 403
    # Missing both headers
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload).status_code == 403
    # Malformed headers
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Origin": "http://localhost:3000/unexpected/path"}).status_code == 403
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Referer": "javascript:alert(1)"}).status_code == 403
    # Origin spoofing & incorrect ports
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Origin": "http://localhost:3000.evil.com"}).status_code == 403
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Origin": "http://localhost:3001"}).status_code == 403
    # Untrusted Origin + trusted Referer
    c = _make_auth_client()
    assert c.post("/api/v1/ops/retry-lrs", json=payload, headers={"Origin": "http://evil.com", "Referer": "http://localhost:3000/ops/dashboard"}).status_code == 403


def test_origin_normalization_and_production_isolation(monkeypatch):
    """Focused validation for _normalize_configured_origin and production allowlist isolation."""
    from app.ops_routes import (
        _normalize_configured_origin,
        _trusted_origins,
        _clean_origin,
        _extract_referer_origin,
    )
    from app.settings import get_settings

    # 1. Valid HTTPS origin
    assert _normalize_configured_origin("https://app.edvidura.example.com") == "https://app.edvidura.example.com"

    # 2. Valid HTTP development origin
    assert _normalize_configured_origin("http://localhost:8000") == "http://localhost:8000"

    # 3. Configured URL with a supported path (normalized to RFC 6454 scheme://netloc origin)
    assert _normalize_configured_origin("https://app.example.com/some/path") == "https://app.example.com"
    assert _normalize_configured_origin("http://localhost:8000/app/") == "http://localhost:8000"

    # 4. URL containing username/password is rejected
    assert _normalize_configured_origin("https://user:pass@app.example.com") is None
    assert _normalize_configured_origin("https://user@app.example.com") is None
    assert _normalize_configured_origin("https://:pass@app.example.com") is None
    assert _normalize_configured_origin("http://admin:secret@localhost:8000") is None

    # 5. Invalid or out-of-range port is rejected
    assert _normalize_configured_origin("http://app.example.com:abc") is None
    assert _normalize_configured_origin("http://app.example.com:99999") is None
    assert _normalize_configured_origin("http://app.example.com:0") is None
    assert _normalize_configured_origin("http://app.example.com:-1") is None
    assert _normalize_configured_origin("http://app.example.com:") is None

    # 6. Missing hostname is rejected
    assert _normalize_configured_origin("http://:8000") is None
    assert _normalize_configured_origin("http://") is None
    assert _normalize_configured_origin("http:///path") is None
    assert _normalize_configured_origin("   ") is None
    assert _normalize_configured_origin(None) is None

    # 7. Unsupported scheme is rejected
    assert _normalize_configured_origin("ftp://app.example.com") is None
    assert _normalize_configured_origin("ws://app.example.com") is None
    assert _normalize_configured_origin("wss://app.example.com") is None
    assert _normalize_configured_origin("javascript:alert(1)") is None
    assert _normalize_configured_origin("file:///etc/passwd") is None

    # 8. Hostname case normalization
    assert _normalize_configured_origin("https://APP.EXAMPLE.COM:8000") == "https://app.example.com:8000"
    assert _normalize_configured_origin("http://LOCALHOST:8000") == "http://localhost:8000"

    # 9. Default-port consistency (omitted for standard ports)
    assert _normalize_configured_origin("http://example.com:80") == "http://example.com"
    assert _normalize_configured_origin("https://example.com:443") == "https://example.com"
    assert _clean_origin("http://example.com:80") == "http://example.com"
    assert _clean_origin("https://example.com:443") == "https://example.com"

    # 10. IPv6 handling
    assert _normalize_configured_origin("http://[::1]:8000") == "http://[::1]:8000"
    assert _normalize_configured_origin("http://[::1]:80") == "http://[::1]"
    assert _normalize_configured_origin("https://[2001:db8::1]:443") == "https://[2001:db8::1]"

    # 11. Production allowlist excludes localhost and testserver
    import dataclasses
    prod_settings = dataclasses.replace(
        get_settings(),
        environment="production",
        app_base_url="https://app.edvidura.example.com/prefix",
        frontend_origin="https://portal.edvidura.example.com",
    )
    monkeypatch.setattr("app.ops_routes.get_settings", lambda: prod_settings)

    trusted = _trusted_origins()
    assert trusted == {
        "https://app.edvidura.example.com",
        "https://portal.edvidura.example.com",
    }
    assert "testserver" not in trusted
    assert "http://testserver" not in trusted
    assert "http://localhost:8000" not in trusted
    assert "http://localhost:3000" not in trusted

    # In production, testrunner exceptions are disabled
    assert _clean_origin("testserver") is None
    assert _clean_origin("http://testserver") is None
    assert _extract_referer_origin("testserver") is None

    # Production application/frontend origins are accepted
    assert _clean_origin("https://app.edvidura.example.com") == "https://app.edvidura.example.com"
    assert _clean_origin("https://portal.edvidura.example.com") == "https://portal.edvidura.example.com"



