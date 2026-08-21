"""Dynamic Registration payload smoke tests."""
from __future__ import annotations

from app.modules.lti_dynreg import build_tool_registration_payload


def test_registration_payload_has_required_fields():
    p = build_tool_registration_payload()
    assert p["application_type"] == "web"
    assert "id_token" in p["response_types"]
    assert p["initiate_login_uri"].endswith("/lti/login")
    assert any(u.endswith("/lti/launch") for u in p["redirect_uris"])
    assert p["jwks_uri"].endswith("/.well-known/jwks.json")
    cfg = p["https://purl.imsglobal.org/spec/lti-tool-configuration"]
    assert cfg["domain"]
    assert any(m["type"] == "LtiDeepLinkingRequest" for m in cfg["messages"])
    assert "ags/scope/score" in p["scope"]
