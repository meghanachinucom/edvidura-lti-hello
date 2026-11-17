"""Wave C workforce pathways — Live boards (empty until tenant data / examples)."""
from __future__ import annotations

from typing import Any
from uuid import UUID


def _example_placements() -> list[dict[str, Any]]:
    return [
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
    ]


def _example_credentials() -> list[dict[str, Any]]:
    return [
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
    ]


def _example_pairs() -> list[dict[str, Any]]:
    return [
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
    ]


def apprenticeship_board(
    tenant_id: UUID | str | None = None,
    *,
    subject: str | None = None,
    examples: bool = False,
) -> dict[str, Any]:
    """Mentor ↔ apprentice placements (empty by default; opt-in examples)."""
    _ = tenant_id  # reserved for tenant-scoped placements DB
    placements: list[dict[str, Any]] = list(_example_placements()) if examples else []
    sub = (subject or "").strip().lower()
    if sub and placements:
        mine = [p for p in placements if sub in str(p["apprentice"]).lower()]
        placements = mine
    elif sub and not placements:
        # Learner with no rows: eligible empty pathway card (no invented peers).
        placements = [
            {
                "id": "ap-self",
                "apprentice": subject or "You",
                "mentor": "Unassigned",
                "role": "Pathway apprentice",
                "skill_focus": [],
                "hours_logged": 0,
                "hours_target": 40,
                "status": "eligible",
                "next_checkpoint": "Request mentor assignment",
            }
        ]
    active = sum(1 for p in placements if p["status"] == "active")
    return {
        "product": "Apprenticeship Manager",
        "wave": "C",
        "state": "live",
        "tenant_id": str(tenant_id) if tenant_id else None,
        "count": len(placements),
        "active": active,
        "placements": placements,
        "examples": bool(examples),
        "depends_on": ("skills_passport",),
        "note": (
            "Live board: empty until placements are recorded. "
            "Pass examples=1 for sales seed rows only."
        ),
    }


def continuity_tracker(
    tenant_id: UUID | str | None = None,
    *,
    subject: str | None = None,
    examples: bool = False,
) -> dict[str, Any]:
    """Qualification currency board (empty by default)."""
    _ = (tenant_id, subject)
    credentials = list(_example_credentials()) if examples else []
    due = sum(1 for c in credentials if c["status"] in {"due_soon", "expired"})
    return {
        "product": "Qualification & Continuity Tracker",
        "wave": "C",
        "state": "live",
        "count": len(credentials),
        "due_soon": due,
        "credentials": credentials,
        "examples": bool(examples),
        "renewal_window_days": 60,
        "depends_on": ("skills_passport",),
        "note": (
            "Live currency board: empty until credentials are issued. "
            "Pass examples=1 for sales seed rows only."
        ),
    }


def sim_to_real_report(
    tenant_id: UUID | str | None = None,
    *,
    examples: bool = False,
) -> dict[str, Any]:
    """Transfer analytics board (empty until XR×EvalPro join ships data)."""
    _ = tenant_id
    pairs = list(_example_pairs()) if examples else []
    avg_gap = (
        round(sum(p["gap_pct"] for p in pairs) / max(1, len(pairs)), 1) if pairs else 0.0
    )
    return {
        "product": "Sim-to-Real Transfer Analytics",
        "wave": "C",
        "state": "live",
        "pair_count": len(pairs),
        "avg_gap_pct": avg_gap,
        "pairs": pairs,
        "examples": bool(examples),
        "depends_on": ("analytics_dashboard", "xr_store"),
        "note": (
            "Live board: empty until XR attempt xAPI joins observed EvalPro scores. "
            "Pass examples=1 for sales seed rows only."
        ),
    }


def wave_c_overview() -> dict[str, Any]:
    return {
        "wave": "C",
        "state": "live",
        "products": [
            apprenticeship_board()["product"],
            continuity_tracker()["product"],
            sim_to_real_report()["product"],
        ],
    }
