"""AuditPro thin product — sealed attempt receipts + sync status."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.modules import quiz as quiz_mod
from app.modules.receipts import sealed_grade_receipt, verify_seal


def audit_trail(
    tenant_id: UUID | str,
    *,
    limit: int = 40,
    course_label: str | None = None,
) -> dict[str, Any]:
    """Recent graded attempts with seal + Moodle sync flags."""
    rows = quiz_mod.list_attempts_for_tenant(
        tenant_id,
        limit=max(1, min(int(limit or 40), 100)),
        course_label=course_label,
    )
    items: list[dict[str, Any]] = []
    sealed_ok = 0
    synced = 0
    for row in rows:
        try:
            receipt = sealed_grade_receipt(
                tenant_id=tenant_id,
                attempt=row,
                ags_available=True,
            )
            check = verify_seal(receipt)
        except Exception:  # noqa: BLE001
            receipt = {}
            check = {"ok": False, "reason": "Could not seal"}
        if check.get("ok"):
            sealed_ok += 1
        if row.get("grade_sent"):
            synced += 1
        items.append(
            {
                "attempt_id": str(row.get("id") or ""),
                "learner_name": str(row.get("learner_name") or row.get("subject") or ""),
                "subject": str(row.get("subject") or ""),
                "score": int(row.get("score") or 0),
                "max_score": int(row.get("max_score") or 0),
                "percent": int(receipt.get("percent") or 0)
                if receipt
                else (
                    int(
                        round(
                            100
                            * int(row.get("score") or 0)
                            / max(1, int(row.get("max_score") or 1))
                        )
                    )
                ),
                "grade_sent": bool(row.get("grade_sent")),
                "grade_error": str(row.get("grade_error") or "") or None,
                "created_at": str(row.get("created_at") or ""),
                "seal_ok": bool(check.get("ok")),
                "seal_reason": str(check.get("reason") or ""),
                "seal": str(receipt.get("seal") or "")[:16] or None,
            }
        )
    return {
        "product": "AuditPro",
        "wave": "A",
        "state": "thin",
        "total": len(items),
        "sealed_ok": sealed_ok,
        "synced_to_lms": synced,
        "items": items,
    }


def verify_attempt_receipt(
    tenant_id: UUID | str,
    attempt_id: UUID | str,
) -> dict[str, Any]:
    """Re-seal and verify one attempt (ops / teacher evidence check)."""
    from app import db

    row = db.get_quiz_attempt(tenant_id, attempt_id)
    if not row:
        return {"ok": False, "reason": "Attempt not found", "product": "AuditPro"}
    receipt = sealed_grade_receipt(
        tenant_id=tenant_id,
        attempt=row,
        ags_available=True,
    )
    check = verify_seal(receipt)
    return {
        "ok": bool(check.get("ok")),
        "reason": check.get("reason"),
        "product": "AuditPro",
        "receipt": {
            "attempt_id": receipt.get("attempt_id"),
            "percent": receipt.get("percent"),
            "grade_sent": receipt.get("grade_sent"),
            "seal": receipt.get("seal"),
            "alg": receipt.get("alg"),
        },
    }
