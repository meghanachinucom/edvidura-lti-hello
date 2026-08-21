"""Product specials (receipts, teleport, radar, coach, stickers, competencies, …)."""

from app.modules.specials.service import (
    COMPETENCIES,
    REMEDIATION,
    at_risk_learners,
    build_time_capsule,
    class_competency_map,
    competency_profile,
    enrichment_for_review,
    failed_question_ids,
    ghost_coach_gate,
    grade_receipt,
    launch_fingerprint,
    lookup_xapi_for_attempt,
    quiet_class_radar,
    record_incident,
    skill_stickers,
    tenant_theme,
)

__all__ = [
    "COMPETENCIES",
    "REMEDIATION",
    "at_risk_learners",
    "build_time_capsule",
    "class_competency_map",
    "competency_profile",
    "enrichment_for_review",
    "failed_question_ids",
    "ghost_coach_gate",
    "grade_receipt",
    "launch_fingerprint",
    "lookup_xapi_for_attempt",
    "quiet_class_radar",
    "record_incident",
    "skill_stickers",
    "tenant_theme",
]
