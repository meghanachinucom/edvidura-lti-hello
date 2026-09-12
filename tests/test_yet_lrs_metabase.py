"""Yet Analytics LRS client + analytics integration status."""
from __future__ import annotations

from app.modules.analytics.integrations import integration_status
from app.modules.xapi.lrs_client import normalize_statements_url, post_statement


def test_normalize_yet_endpoints():
    assert (
        normalize_statements_url("http://localhost:8080/xapi", provider="yet")
        == "http://localhost:8080/xapi/statements"
    )
    assert (
        normalize_statements_url(
            "http://localhost:8080/xapi/statements", provider="yet"
        )
        == "http://localhost:8080/xapi/statements"
    )
    assert (
        normalize_statements_url("http://localhost:8080", provider="yet")
        == "http://localhost:8080/xapi/statements"
    )
    assert (
        normalize_statements_url("https://lrs.example/xAPI", provider="generic")
        == "https://lrs.example/xAPI/statements"
    )


def test_post_statement_success(monkeypatch):
    class _Resp:
        status_code = 200
        text = '["11111111-1111-1111-1111-111111111111"]'

        def json(self):
            return ["11111111-1111-1111-1111-111111111111"]

    class _Client:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, headers=None, json=None):
            assert url.endswith("/xapi/statements")
            assert "Authorization" in headers
            assert headers["X-Experience-API-Version"] == "1.0.3"
            return _Resp()

    import app.modules.xapi.lrs_client as lc

    monkeypatch.setattr(lc.httpx, "Client", _Client)
    ok, err, attempts, meta = post_statement(
        {"actor": {}, "verb": {}, "object": {}},
        endpoint="http://localhost:8080/xapi",
        key="k",
        secret="s",
        provider="yet",
        retries=1,
    )
    assert ok and err is None and attempts == 1
    assert meta["provider"] == "yet"


def test_integration_status_shape(monkeypatch):
    from app import settings as settings_mod

    class _S:
        metabase_url = "http://localhost:3001"
        metabase_secret_key = ""
        metabase_embed_dashboard_id = 0
        xapi_lrs_endpoint = ""
        xapi_lrs_key = ""
        xapi_lrs_secret = ""
        xapi_lrs_provider = "yet"

    monkeypatch.setattr(settings_mod, "get_settings", lambda: _S())
    # integrations imports get_settings at call time via module
    import app.modules.analytics.integrations as integ

    monkeypatch.setattr(integ, "get_settings", lambda: _S())
    st = integration_status(probe=False)
    assert st["schema"].startswith("edvidura.analytics.integrations")
    assert st["yet_analytics_lrs"]["provider"] == "yet"
    assert st["metabase"]["configured_url"] is True
    assert st["metabase"]["embed_ready"] is False
