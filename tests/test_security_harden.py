"""BE hardenings: lab pack sanitize, airgap facade, rate-limit prefixes, headers."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.modules.airgap import pack_status
from app.modules.interactive_labs import propose_lab_pack, sanitize_lab_pack
from app.rate_limit import DEFAULT_LIMITS


def test_sanitize_lab_pack_allowlists_and_strips_junk():
    dirty = {
        "title": "x" * 500,
        "playground_type": "eval(os.system)",
        "age_band": "wizard",
        "callouts": [
            {
                "id": "a",
                "label": "ok",
                "body": "b" * 900,
                "action": "drop_table",
                "target": "../../../etc",
            }
        ]
        + [{"id": f"n{i}", "label": "n", "body": "x"} for i in range(40)],
        "presets": [{"label": "p", "m": 999, "b": 0}, {"label": "ok", "m": 1.5, "b": -0.25}],
        "extra_secret": "should-not-persist",
        "textbook_excerpt": "e" * 5000,
    }
    clean = sanitize_lab_pack(dirty)
    assert clean["playground_type"] == "cartesian"
    assert clean["age_band"] == "secondary"
    assert len(clean["title"]) <= 200
    assert len(clean["callouts"]) <= 24
    assert clean["callouts"][0]["action"] == "focus"
    assert clean["callouts"][0]["target"] == "line"
    assert len(clean["callouts"][0]["body"]) <= 400
    assert all(abs(p["m"]) <= 20 for p in clean["presets"])
    assert "extra_secret" not in clean
    assert len(clean["textbook_excerpt"]) <= 1200


def test_propose_stays_draft_and_sanitize_drops_status():
    pack = propose_lab_pack(
        title="Gate",
        body_md="The slope m is rise over run on the Cartesian plane for our school chapter.",
    )
    assert pack["state"] == "draft_proposal"
    assert "status" not in sanitize_lab_pack(pack)


def test_airgap_pack_status_does_not_leak_provider(monkeypatch):
    monkeypatch.setenv("AIRGAP", "1")
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-leak-test")
    status = pack_status()
    blob = str(status)
    assert "sk-leak-test" not in blob
    assert "AI_PROVIDER=" not in blob
    ai = next(c for c in status["checks"] if c["id"] == "ai_local")
    assert ai["ok"] is False
    assert "openai" not in ai["detail"].lower()
    leak = next(c for c in status["checks"] if c["id"] == "no_cloud_leak")
    assert leak["ok"] is False
    assert status["ready"] is False


def test_rate_limits_cover_wave_and_labs():
    prefixes = [p for p, _, _ in DEFAULT_LIMITS]
    for p in (
        "/api/v1/app/labs/",
        "/api/v1/app/audit-pro",
        "/api/v1/app/iq-review",
        "/api/v1/app/document-search",
        "/api/v1/app/airgap-pack",
        "/api/v1/app/xr/",
        "/api/v1/app/workforce/",
    ):
        assert p in prefixes


def test_security_headers_on_api(monkeypatch):
    from app.main import app

    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert "strict-origin-when-cross-origin" in (
        r.headers.get("referrer-policy") or ""
    )
