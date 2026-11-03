"""SME R-2 indexing helpers + ETIMS signature (no DB)."""
from __future__ import annotations

import hashlib
import hmac


def test_page_chunks_prefer_headings():
    from app.modules.sme.index import _page_chunks

    body = "## One\n\nalpha\n\n## Two\n\nbeta\n\n## Three\n\ngamma\n"
    pages = _page_chunks(body)
    assert len(pages) >= 3
    assert pages[0]["title"] in {"One", "Overview"} or "One" in pages[0]["title"]


def test_page_chunks_fallback_windows():
    from app.modules.sme.index import _page_chunks

    body = "word " * 2000
    pages = _page_chunks(body, chars_per_page=500)
    assert len(pages) >= 5
    assert pages[0]["slug"].startswith("page-")


def test_etims_signature_roundtrip(monkeypatch):
    from app.modules.manuals import etims as etims_mod

    class _S:
        etims_webhook_secret = "test-secret-etims"

    monkeypatch.setattr(etims_mod, "get_settings", lambda: _S())
    body = b'{"tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","body_md":"hello world document content"}'
    dig = hmac.new(b"test-secret-etims", body, hashlib.sha256).hexdigest()
    assert etims_mod.verify_etims_signature(body, dig) is True
    assert etims_mod.verify_etims_signature(body, "sha256=" + dig) is True
    assert etims_mod.verify_etims_signature(body, "deadbeef") is False


def test_public_query_empty_falls_back(monkeypatch):
    from app.modules.sme import index as index_mod

    monkeypatch.setattr(index_mod, "search_index", lambda *_a, **_k: [])
    monkeypatch.setattr(
        "app.modules.sme.service.coach_chunks_for_tenant",
        lambda *_a, **_k: (
            "Course",
            [
                {
                    "title": "Slope",
                    "body": "The slope-intercept form is y = mx + b",
                    "manual_id": "m1",
                    "href": "/manuals/m1",
                }
            ],
            [],
        ),
    )
    out = index_mod.public_query(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "slope intercept", limit=3
    )
    assert out["hit_count"] >= 1
    assert out["hits"][0]["source"] == "live_chunks"
