"""Sealed learning receipts — HMAC evidence for quiz attempts."""
from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any
from uuid import UUID

from app.settings import get_settings
from app.modules.specials import grade_receipt, lookup_xapi_for_attempt


def _signing_key() -> bytes:
    # Prefer dedicated key; fall back to session secret (dev-safe).
    s = get_settings()
    raw = (
        getattr(s, "receipt_signing_key", "")
        or s.session_secret
        or "dev-only-change-me"
    )
    return str(raw).encode("utf-8")


def _canonical_payload(data: dict[str, Any]) -> str:
    body = {
        "attempt_id": str(data.get("attempt_id") or ""),
        "tenant_id": str(data.get("tenant_id") or ""),
        "subject": str(data.get("subject") or ""),
        "learner_name": str(data.get("learner_name") or ""),
        "score": int(data.get("score") or 0),
        "max_score": int(data.get("max_score") or 0),
        "percent": int(data.get("percent") or 0),
        "grade_sent": bool(data.get("grade_sent")),
        "practice": bool(data.get("practice")),
        "xapi_statement_id": str(data.get("xapi_statement_id") or ""),
        "issued_at": str(data.get("issued_at") or ""),
    }
    return json.dumps(body, sort_keys=True, separators=(",", ":"))


def seal_digest(payload: dict[str, Any]) -> str:
    msg = _canonical_payload(payload).encode("utf-8")
    return hmac.new(_signing_key(), msg, hashlib.sha256).hexdigest()


def seal_receipt(payload: dict[str, Any]) -> dict[str, Any]:
    """Attach HMAC seal + algorithm metadata (does not mutate Moodle)."""
    out = dict(payload)
    out["alg"] = "HMAC-SHA256"
    out["seal"] = seal_digest(out)
    out["sealed"] = True
    return out


def verify_seal(payload: dict[str, Any]) -> dict[str, Any]:
    """Verify seal; returns {ok, reason, expected?}."""
    if not isinstance(payload, dict):
        return {"ok": False, "reason": "Invalid payload"}
    given = str(payload.get("seal") or "").strip().lower()
    if not given:
        return {"ok": False, "reason": "Missing seal"}
    expected = seal_digest(payload).lower()
    ok = hmac.compare_digest(given, expected)
    return {
        "ok": ok,
        "reason": "Valid seal" if ok else "Seal mismatch — evidence may be altered",
        "alg": str(payload.get("alg") or "HMAC-SHA256"),
    }


def sealed_grade_receipt(
    *,
    tenant_id: UUID | str,
    attempt: dict[str, Any],
    ags_available: bool,
) -> dict[str, Any]:
    """Build specials grade_receipt then seal it for verification."""
    xapi_id = lookup_xapi_for_attempt(tenant_id, attempt["id"])
    base = grade_receipt(
        attempt=attempt,
        xapi_statement_id=xapi_id,
        ags_available=ags_available,
    )
    base["tenant_id"] = str(tenant_id)
    base["subject"] = str(attempt.get("subject") or "")
    base["learner_name"] = str(
        attempt.get("learner_name") or attempt.get("subject") or ""
    )
    return seal_receipt(base)
