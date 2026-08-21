"""Production boot / API auth guards."""
from __future__ import annotations

import os
from dataclasses import replace
from pathlib import Path
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key-for-guards")
os.environ.setdefault("SESSION_SECRET", "dev-only-change-me")


def test_assert_safe_allows_development():
    from app.security_boot import assert_safe_for_environment
    from app.settings import get_settings

    s = get_settings()
    assert s.environment == "development"
    assert_safe_for_environment(s)


def test_assert_safe_rejects_weak_production_secrets():
    from app.security_boot import assert_safe_for_environment
    from app.settings import get_settings

    s = get_settings()
    bad = replace(
        s,
        environment="production",
        session_secret="dev-only-change-me",
        admin_api_key="dev-admin-change-me",
        app_base_url="http://localhost:8000",
        private_key_pem_env="",
        private_key_path=Path("keys/missing-private.key"),
    )
    with pytest.raises(RuntimeError) as exc:
        assert_safe_for_environment(bad)
    msg = str(exc.value)
    assert "SESSION_SECRET" in msg
    assert "ADMIN_API_KEY" in msg
    assert "APP_BASE_URL" in msg


def test_require_dev_tools_404_in_production(monkeypatch):
    from app import security_boot
    from app.security_boot import require_dev_tools
    from app.settings import get_settings
    from fastapi import HTTPException

    s = replace(get_settings(), environment="production")
    monkeypatch.setattr(security_boot, "get_settings", lambda: s)
    req = MagicMock()
    req.headers = {}
    with pytest.raises(HTTPException) as exc:
        require_dev_tools(req)
    assert exc.value.status_code == 404


def test_institutions_require_auth():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    r = client.get("/api/v1/institutions")
    assert r.status_code == 401
    r2 = client.get("/dev/tenancy/cross-check")
    assert r2.status_code == 401
