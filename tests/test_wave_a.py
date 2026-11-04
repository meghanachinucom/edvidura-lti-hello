"""Wave A — AuditPro, IQ review, Skills Passport, air-gap pack."""
from __future__ import annotations

from app.modules.airgap import pack_status
from app.modules.iq_review import item_quality_report
from app.modules.tenancy.blocks import BLOCKS, merge_blocks


def test_wave_a_blocks_are_thin():
    for bid in (
        "audit_pro",
        "iq_review_pattern",
        "skills_passport",
        "document_search",
        "private_air_gapped_ai",
    ):
        assert BLOCKS[bid]["state"] == "thin", bid


def test_wave_a_pack_preset_enables_caps():
    result = merge_blocks("school", preset="wave_a_pack")
    caps = result["capabilities"]
    assert caps["audit_pro"] is True
    assert caps["iq_review"] is True
    assert caps["skills_passport"] is True
    assert caps["document_search"] is True
    assert caps["airgap_pack"] is True
    assert "xr_store" not in result["applied_blocks"]


def test_airgap_pack_status_shape():
    status = pack_status()
    assert status["product"].startswith("Private Air")
    assert status["wave"] == "A"
    assert isinstance(status["checks"], list)
    assert len(status["checks"]) >= 4


def test_iq_review_empty_tenant_safe(monkeypatch):
    """Without DB rows, report still returns thin product envelope."""

    class _FakeConn:
        def execute(self, *_a, **_k):
            class _R:
                def fetchall(self):
                    return []

            return _R()

        def __enter__(self):
            return self

        def __exit__(self, *_a):
            return False

    import app.modules.iq_review.service as svc

    monkeypatch.setattr(
        svc.db,
        "tenant_connection",
        lambda *_a, **_k: _FakeConn(),
    )
    report = item_quality_report("00000000-0000-0000-0000-000000000001")
    assert report["product"] == "IQ review pattern"
    assert report["questions"] == []
