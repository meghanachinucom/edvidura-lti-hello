"""Sealed receipt HMAC round-trip."""
from __future__ import annotations

from app.modules.receipts import seal_receipt, verify_seal


def test_seal_and_verify_round_trip():
    payload = {
        "attempt_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "tenant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "subject": "moodle-user-1",
        "learner_name": "Demo Student",
        "score": 4,
        "max_score": 5,
        "percent": 80,
        "grade_sent": True,
        "practice": False,
        "xapi_statement_id": "stmt-1",
        "issued_at": "2026-08-27T12:00:00+00:00",
    }
    sealed = seal_receipt(payload)
    assert sealed["sealed"] is True
    assert sealed["alg"] == "HMAC-SHA256"
    assert len(sealed["seal"]) == 64
    result = verify_seal(sealed)
    assert result["ok"] is True


def test_tamper_breaks_seal():
    sealed = seal_receipt(
        {
            "attempt_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "tenant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "subject": "u1",
            "learner_name": "A",
            "score": 5,
            "max_score": 5,
            "percent": 100,
            "grade_sent": False,
            "practice": False,
            "xapi_statement_id": "",
            "issued_at": "2026-01-01T00:00:00+00:00",
        }
    )
    tampered = dict(sealed)
    tampered["score"] = 1
    tampered["percent"] = 20
    assert verify_seal(tampered)["ok"] is False


def test_missing_seal():
    assert verify_seal({"attempt_id": "x"})["ok"] is False
    assert verify_seal(None)["ok"] is False  # type: ignore[arg-type]
