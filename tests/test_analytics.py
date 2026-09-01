"""Analytics module unit tests (no DB)."""
from __future__ import annotations

from app.modules.analytics import learner_dashboard, metabase_embed_url


def test_learner_dashboard_empty_subject():
    dash = learner_dashboard("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "")
    assert dash["attempt_count"] == 0
    assert dash["recent"] == []
    assert dash["avg_percent"] is None


def test_metabase_embed_url_none_without_secret(monkeypatch):
    from app import settings as settings_mod

    class _S:
        metabase_url = "http://localhost:3001"
        metabase_secret_key = ""
        metabase_embed_dashboard_id = 1

    monkeypatch.setattr(settings_mod, "get_settings", lambda: _S())
    assert metabase_embed_url(tenant_id="t", resource_id=1) is None


def test_metabase_embed_url_signed(monkeypatch):
    import jwt

    from app import settings as settings_mod

    class _S:
        metabase_url = "http://localhost:3001"
        metabase_secret_key = "test-secret"
        metabase_embed_dashboard_id = 7

    monkeypatch.setattr(settings_mod, "get_settings", lambda: _S())
    url = metabase_embed_url(
        tenant_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        tenant_slug="riverside",
    )
    assert url is not None
    assert url.startswith("http://localhost:3001/embed/dashboard/")
    token = url.split("/embed/dashboard/")[1].split("#")[0]
    payload = jwt.decode(token, "test-secret", algorithms=["HS256"])
    assert payload["resource"]["dashboard"] == 7
    assert payload["params"]["tenant_slug"] == ["riverside"]
