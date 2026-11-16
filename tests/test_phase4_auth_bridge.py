"""Security and contract tests for Phase 4 Exchange-Code Auth and Session Bridge."""
from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient


def _make_dummy_launch_context(**overrides):
    base = {
        "launch_id": "lnch-test-1234",
        "tenant_id": "11111111-1111-1111-1111-111111111111",
        "tenant_slug": "electrician-iti",
        "tenant_name": "Govt ITI Hyderabad",
        "subject": "student-101",
        "learner_name": "Ravi Kumar",
        "roles": "Learner",
        "is_instructor": False,
        "is_school_admin": False,
        "quiz_token": "tok-dummy-secure-longlived-777",
        "class_name": "Electrician 1st Year",
    }
    base.update(overrides)
    return base


def test_exchange_code_happy_path(monkeypatch):
    from app.main import app
    from app.launch_cache import create_exchange_code

    ctx = _make_dummy_launch_context()
    code = create_exchange_code(ctx, ttl_sec=60)
    assert isinstance(code, str) and len(code) > 20

    client = TestClient(app)
    # Redeem code
    res = client.post("/api/v1/auth/exchange", json={"code": code})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["data"]["token"] == "tok-dummy-secure-longlived-777"
    assert body["data"]["subject"] == "student-101"
    assert body["data"]["tenant_id"] == "11111111-1111-1111-1111-111111111111"
    assert body["data"]["learner_name"] == "Ravi Kumar"


def test_exchange_code_single_use_atomic(monkeypatch):
    from app.main import app
    from app.launch_cache import create_exchange_code

    ctx = _make_dummy_launch_context()
    code = create_exchange_code(ctx, ttl_sec=60)

    client = TestClient(app)
    # 1st redemption succeeds
    r1 = client.post("/api/v1/auth/exchange", json={"code": code})
    assert r1.status_code == 200

    # 2nd redemption (replay attack) fails with 401
    r2 = client.post("/api/v1/auth/exchange", json={"code": code})
    assert r2.status_code == 401
    assert r2.json()["ok"] is False
    assert r2.json()["error"]["code"] == "invalid_code"


def test_exchange_code_expiry(monkeypatch):
    from app.main import app
    from app.launch_cache import create_exchange_code

    ctx = _make_dummy_launch_context()
    # TTL of 1 second
    code = create_exchange_code(ctx, ttl_sec=1)

    time.sleep(1.2)

    client = TestClient(app)
    res = client.post("/api/v1/auth/exchange", json={"code": code})
    assert res.status_code == 401
    assert res.json()["ok"] is False
    assert res.json()["error"]["code"] == "invalid_code"


def test_exchange_code_invalid_rejection():
    from app.main import app

    client = TestClient(app)
    # Completely fake code
    res = client.post("/api/v1/auth/exchange", json={"code": "completely-fake-unregistered-code-1234"})
    assert res.status_code == 401
    assert res.json()["ok"] is False
    assert res.json()["error"]["code"] == "invalid_code"


def test_identity_and_tenant_tampering_impossible(monkeypatch):
    from app.main import app
    from app.launch_cache import create_exchange_code

    ctx = _make_dummy_launch_context(
        tenant_id="33333333-3333-3333-3333-333333333333",
        subject="verified-learner-99",
        is_instructor=False,
    )
    code = create_exchange_code(ctx, ttl_sec=60)

    client = TestClient(app)
    # Even if client tries to inject different fields into the body, Pydantic ExchangeRequest only accepts 'code'
    res = client.post(
        "/api/v1/auth/exchange",
        json={
            "code": code,
            "tenant_id": "hacked-tenant",
            "is_instructor": True,
            "subject": "hacked-admin",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["tenant_id"] == "33333333-3333-3333-3333-333333333333"
    assert body["data"]["subject"] == "verified-learner-99"
    assert body["data"]["is_instructor"] is False


def test_authenticated_api_call_with_exchanged_session(monkeypatch):
    from app.main import app
    from app.launch_cache import create_exchange_code

    ctx = _make_dummy_launch_context(
        quiz_token="tok-live-session-abc",
        tenant_id="11111111-1111-1111-1111-111111111111",
    )
    code = create_exchange_code(ctx, ttl_sec=60)

    client = TestClient(app)
    # Redeem
    red_res = client.post("/api/v1/auth/exchange", json={"code": code})
    assert red_res.status_code == 200
    token = red_res.json()["data"]["token"]

    # Call /api/v1/app/session using the returned bearer token
    sess_res = client.get(
        "/api/v1/app/session",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sess_res.status_code == 200
    assert sess_res.json()["ok"] is True
    assert sess_res.json()["data"]["token"] == "tok-live-session-abc"

