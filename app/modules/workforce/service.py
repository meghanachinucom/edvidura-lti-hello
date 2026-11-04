"""Wave C thin products — corporate / gov workforce pathways."""
from __future__ import annotations

from typing import Any
from uuid import UUID


def apprenticeship_board(
    tenant_id: UUID | str | None = None,
    *,
    subject: str | None = None,
) -> dict[str, Any]:
    """Mentor ↔ apprentice placements keyed to Skills Passport roles."""
    _ = tenant_id  # reserved for tenant-scoped placements DB
    placements = [
        {
            "id": "ap-001",
            "apprentice": "Priya N.",
            "mentor": "Suresh K.",
            "role": "Junior maintainer",
            "skill_focus": ["lti_launch", "gradebook_sync"],
            "hours_logged": 42,
            "hours_target": 120,
            "status": "active",
            "next_checkpoint": "Seal replacement observed",
        },
        {
            "id": "ap-002",
            "apprentice": "Imran A.",
            "mentor": "Suresh K.",
            "role": "Field tech apprentice",
            "skill_focus": ["tenant_isolation"],
            "hours_logged": 18,
            "hours_target": 120,
            "status": "active",
            "next_checkpoint": "Lockout drill with mentor",
        },
        {
            "id": "ap-003",
            "apprentice": "Demo learner",
            "mentor": "Faculty lead",
            "role": "Classroom pathway",
            "skill_focus": ["lti_launch"],
            "hours_logged": 8,
            "hours_target": 40,
            "status": "onboarding",
            "next_checkpoint": "First observed quiz attempt",
        },
    ]
    sub = (subject or "").strip().lower()
    if sub:
        # Learner view: filter to self-ish demo row or show pathway template
        mine = [p for p in placements if sub in str(p["apprentice"]).lower()]
        if not mine:
            mine = [
                {
                    **placements[2],
                    "apprentice": subject or "You",
                    "status": "eligible",
                }
            ]
        placements = mine
    active = sum(1 for p in placements if p["status"] == "active")
    return {
        "product": "Apprenticeship Manager",
        "wave": "C",
        "state": "thin",
        "tenant_id": str(tenant_id) if tenant_id else None,
        "count": len(placements),
        "active": active,
        "placements": placements,
        "depends_on": ("skills_passport",),
        "note": "Thin Wave C: placement board + hours vs target. Roster sync is Live-track.",
    }


def continuity_tracker(
    tenant_id: UUID | str | None = None,
    *,
    subject: str | None = None,
) -> dict[str, Any]:
    """Qualification currency / recency for credentials tied to skills."""
    _ = (tenant_id, subject)
    credentials = [
        {
            "id": "cred-loto",
            "label": "Lockout / Tagout",
            "skill_codes": ["gradebook_sync"],
            "issued_at": "2025-06-12",
            "expires_at": "2027-06-12",
            "status": "current",
            "days_to_expiry": 585,
        },
        {
            "id": "cred-seal",
            "label": "Mechanical seal competency",
            "skill_codes": ["tenant_isolation"],
            "issued_at": "2024-11-01",
            "expires_at": "2026-11-01",
            "status": "due_soon",
            "days_to_expiry": 30,
        },
        {
            "id": "cred-xr-pump",
            "label": "VR Pump Maintainer observed",
            "skill_codes": ["lti_launch"],
            "issued_at": "2025-09-20",
            "expires_at": "2026-09-20",
            "status": "current",
            "days_to_expiry": 320,
        },
    ]
    due = sum(1 for c in credentials if c["status"] in {"due_soon", "expired"})
    return {
        "product": "Qualification & Continuity Tracker",
        "wave": "C",
        "state": "thin",
        "count": len(credentials),
        "due_soon": due,
        "credentials": credentials,
        "renewal_window_days": 60,
        "depends_on": ("skills_passport",),
        "note": "Thin: currency board from Skills Passport evidence. LMS badge push is later.",
    }


def sim_to_real_report(tenant_id: UUID | str | None = None) -> dict[str, Any]:
    """Transfer analytics: XR / sim performance vs live / observed tasks."""
    _ = tenant_id
    pairs = [
        {
            "skill": "Seal replacement",
            "sim_source": "xr-vr-pump-maintainer",
            "sim_score_pct": 88,
            "real_score_pct": 74,
            "gap_pct": 14,
            "n_learners": 12,
            "transfer": "moderate",
        },
        {
            "skill": "Cartesian slope reading",
            "sim_source": "xr-cartesian-3d",
            "sim_score_pct": 91,
            "real_score_pct": 86,
            "gap_pct": 5,
            "n_learners": 24,
            "transfer": "strong",
        },
        {
            "skill": "AR geometry placement",
            "sim_source": "xr-geometry-hologram",
            "sim_score_pct": 79,
            "real_score_pct": 61,
            "gap_pct": 18,
            "n_learners": 9,
            "transfer": "weak",
        },
    ]
    avg_gap = round(sum(p["gap_pct"] for p in pairs) / max(1, len(pairs)), 1)
    return {
        "product": "Sim-to-Real Transfer Analytics",
        "wave": "C",
        "state": "thin",
        "pair_count": len(pairs),
        "avg_gap_pct": avg_gap,
        "pairs": pairs,
        "depends_on": ("analytics_dashboard", "xr_store"),
        "note": "Thin: demo transfer table. Live joins XR attempt xAPI to observed EvalPro scores.",
    }


def wave_c_overview() -> dict[str, Any]:
    return {
        "wave": "C",
        "state": "thin",
        "products": [
            apprenticeship_board()["product"],
            continuity_tracker()["product"],
            sim_to_real_report()["product"],
        ],
    }
