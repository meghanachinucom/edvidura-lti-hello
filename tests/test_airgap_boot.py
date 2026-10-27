"""AIRGAP=1 boot guard."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.security_boot import assert_airgap_safe


def _s(**over):
    base = dict(
        airgap=True,
        openai_api_key="",
        anthropic_api_key="",
        typesafe_api_key="",
        jev_enabled=False,
        ai_enabled=False,
        ai_provider="auto",
        sentry_dsn="",
        xapi_lrs_endpoint="",
    )
    base.update(over)
    return SimpleNamespace(**base)


def test_airgap_ok_without_cloud_keys():
    assert_airgap_safe(_s())  # type: ignore[arg-type]


def test_airgap_rejects_openai():
    with pytest.raises(RuntimeError, match="OPENAI"):
        assert_airgap_safe(_s(openai_api_key="sk-test"))  # type: ignore[arg-type]


def test_airgap_rejects_jev():
    with pytest.raises(RuntimeError, match="JEV"):
        assert_airgap_safe(_s(jev_enabled=True, typesafe_api_key="k"))  # type: ignore[arg-type]
