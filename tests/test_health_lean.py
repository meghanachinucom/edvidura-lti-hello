"""Public /health stays lean in production-like environments."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_lean_in_production(monkeypatch):
    from app.main import app
    from app.settings import Settings, get_settings

    real = get_settings()
    prod = Settings(**{**real.__dict__, "environment": "production"})
    monkeypatch.setattr("app.main._boot", prod)

    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert "ok" in body
    assert "service" in body
    assert "db_ok" in body
    assert "platforms" not in body
    assert "integrations" not in body
    assert "db_error" not in body


def test_health_detail_flag(monkeypatch):
    from app.main import app
    from app.settings import Settings, get_settings

    real = get_settings()
    prod = Settings(**{**real.__dict__, "environment": "production"})
    monkeypatch.setattr("app.main._boot", prod)

    client = TestClient(app)
    r = client.get("/health", params={"detail": 1})
    assert r.status_code == 200
    body = r.json()
    assert "environment" in body
    assert "integrations" in body
