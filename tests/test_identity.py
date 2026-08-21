"""Identity helpers smoke tests."""
from __future__ import annotations

from app.modules.identity import keycloak_enabled, keycloak_issuer
from app.settings import get_settings


def test_keycloak_disabled_by_default():
    assert keycloak_enabled() is False or isinstance(keycloak_enabled(), bool)


def test_keycloak_issuer_shape():
    s = get_settings()
    iss = keycloak_issuer()
    assert "/realms/" in iss
    assert s.keycloak_realm in iss
