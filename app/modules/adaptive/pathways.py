"""BF-03: Adaptive Learning Pathways Service & Router.

Routes learners into Support (<60%), Core (60-85%), or Enrichment (>85%) tracks
automatically based on quiz score assessments with 100% native EdVidura branding.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import connect

router = APIRouter(prefix="/api/v1/adaptive", tags=["Adaptive Learning Pathways"])

# In-memory store fallback seeded for Riverside High Class 8
_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
_MEM_PATHS: Dict[str, Dict[str, Any]] = {
    "mod-algebra-linear": {
        "id": "33333333-0003-0003-0003-000000000001",
        "tenant_id": _DEFAULT_TENANT,
        "course_id": "RHS-C08",
        "module_id": "mod-algebra-linear",
        "threshold_support": 60,
        "threshold_enrichment": 85,
        "support_branch": {
            "track": "Support",
            "name": "Foundations & Balance Modeling",
            "resources": [
                {"type": "book", "id": "de7900fd-488b-4740-bf7e-7a11b3475cd6", "title": "Algebra I Ch. 1: Balance Model Basics"},
                {"type": "tutor", "topic": "Solving One-Step Equations", "label": "Ask Vidura Guided Remediation"}
            ]
        },
        "core_branch": {
            "track": "Core",
            "name": "Linear Equations & Multi-Step Isolation",
            "resources": [
                {"type": "book", "id": "de7900fd-488b-4740-bf7e-7a11b3475cd6", "title": "Algebra I Ch. 2: Two-Step Equations"},
                {"type": "reel", "id": "reel-linear-1", "title": "Concept Reel: Multi-Step Isolation"}
            ]
        },
        "enrichment_branch": {
            "track": "Enrichment",
            "name": "Advanced Cartesian & Applied Modeling",
            "resources": [
                {"type": "lab", "id": "xr-cartesian-3d", "title": "Cartesian 3D Spatial Simulator"},
                {"type": "challenge", "title": "Real-World Multi-Variable Word Problems"}
            ]
        }
    }
}

_STUDENT_SCORES: Dict[str, float] = {
    "6": 88.0,  # Alice Nguyen -> Enrichment
    "student-2": 55.0,  # Bob -> Support
    "student-3": 74.0,  # Charlie -> Core
}

class MasteryPathCreate(BaseModel):
    course_id: str
    module_id: str
    threshold_support: int = 60
    threshold_enrichment: int = 85
    support_branch: Dict[str, Any]
    core_branch: Dict[str, Any]
    enrichment_branch: Dict[str, Any]

@router.post("/mastery-path")
def create_or_update_path(payload: MasteryPathCreate) -> Dict[str, Any]:
    path_id = str(uuid4())
    rec = {
        "id": path_id,
        "tenant_id": _DEFAULT_TENANT,
        **payload.model_dump()
    }
    _MEM_PATHS[payload.module_id] = rec
    try:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO mastery_paths (id, tenant_id, course_id, module_id, threshold_support, threshold_enrichment, support_branch, core_branch, enrichment_branch)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    (path_id, _DEFAULT_TENANT, payload.course_id, payload.module_id, payload.threshold_support, payload.threshold_enrichment,
                     str(payload.support_branch), str(payload.core_branch), str(payload.enrichment_branch))
                )
    except Exception:
        pass
    return {"ok": True, "pathway": rec}

@router.get("/student-route/{student_id}")
def get_student_route(student_id: str, module_id: str = "mod-algebra-linear", score: Optional[float] = None) -> Dict[str, Any]:
    effective_score = score if score is not None else _STUDENT_SCORES.get(student_id, 75.0)
    path = _MEM_PATHS.get(module_id) or next(iter(_MEM_PATHS.values()))
    
    t_supp = path.get("threshold_support", 60)
    t_enrich = path.get("threshold_enrichment", 85)

    if effective_score < t_supp:
        track = "Support"
        details = path.get("support_branch", {})
        recommendation = "Foundational scaffolding unlocked to strengthen algebraic balance concepts."
    elif effective_score > t_enrich:
        track = "Enrichment"
        details = path.get("enrichment_branch", {})
        recommendation = "Mastery demonstrated! Advanced spatial 3D simulation and modeling unlocked."
    else:
        track = "Core"
        details = path.get("core_branch", {})
        recommendation = "On-track progression: continue with two-step linear equations."

    return {
        "ok": True,
        "student_id": student_id,
        "module_id": module_id,
        "assessed_score": effective_score,
        "active_track": track,
        "recommendation": recommendation,
        "branch_payload": details,
        "all_tracks": [
            {"track": "Support", "threshold": f"< {t_supp}%"},
            {"track": "Core", "threshold": f"{t_supp}% - {t_enrich}%"},
            {"track": "Enrichment", "threshold": f"> {t_enrich}%"}
        ]
    }
