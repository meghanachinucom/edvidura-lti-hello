"""AuditPro — sealed grade evidence for teacher / ops review (Wave A)."""

from app.modules.audit_pro.service import audit_trail, verify_attempt_receipt

__all__ = ["audit_trail", "verify_attempt_receipt"]
