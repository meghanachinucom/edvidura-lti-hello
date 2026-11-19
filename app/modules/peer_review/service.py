"""BF-09: Calibrated Anonymous Peer Review Service & Router.

Distributes submissions to anonymous peer reviewers, hides student identities,
and computes calibration-weighted scores to ensure grading fairness with 100% native EdVidura branding.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/peer-review", tags=["Calibrated Anonymous Peer Review"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

def _hash_id(uid: str) -> str:
    return hashlib.sha256(f"{uid}-peer-salt-edvidura".encode()).hexdigest()[:12]

_ASSIGNMENTS: Dict[str, Dict[str, Any]] = {
    "assign-slice-a": {
        "assignment_id": "assign-slice-a",
        "title": "Slice A Math Concept Proof",
        "reviews_required_per_student": 2,
        "calibration_active": True,
        "active_pairs": [
            {
                "pair_id": "pair-1",
                "reviewer_alias": "Peer Evaluator #A8",
                "reviewee_alias": "Student Work #E4",
                "rubric_submitted": True,
                "scores": {"clarity": 9, "accuracy": 8, "balance_model": 10},
                "total_score": 90.0,
                "calibration_weight": 1.15
            },
            {
                "pair_id": "pair-2",
                "reviewer_alias": "Peer Evaluator #B2",
                "reviewee_alias": "Student Work #E4",
                "rubric_submitted": True,
                "scores": {"clarity": 8, "accuracy": 9, "balance_model": 9},
                "total_score": 86.6,
                "calibration_weight": 0.95
            }
        ]
    }
}

class AssignPeerRequest(BaseModel):
    assignment_id: str = "assign-slice-a"
    student_ids: List[str] = ["6", "student-2", "student-3"]
    reviews_per_student: int = 2

class SubmitPeerGradeRequest(BaseModel):
    pair_id: str
    reviewer_id: str = "6"
    rubric_scores: Dict[str, float]
    qualitative_feedback: str

@router.post("/assign")
def assign_peer_reviews(payload: AssignPeerRequest) -> Dict[str, Any]:
    assign_id = payload.assignment_id
    rec = _ASSIGNMENTS.setdefault(assign_id, {
        "assignment_id": assign_id,
        "title": "Peer Review Session",
        "reviews_required_per_student": payload.reviews_per_student,
        "calibration_active": True,
        "active_pairs": []
    })
    
    # Generate anonymized pairings
    pairs_created = []
    n = len(payload.student_ids)
    for i, sid in enumerate(payload.student_ids):
        for step in range(1, payload.reviews_per_student + 1):
            other_id = payload.student_ids[(i + step) % n]
            pair_entry = {
                "pair_id": f"pair-{assign_id}-{i}-{step}",
                "reviewer_alias": f"Peer Evaluator #{_hash_id(sid)[:4].upper()}",
                "reviewee_alias": f"Student Work #{_hash_id(other_id)[:4].upper()}",
                "rubric_submitted": False,
                "scores": {},
                "total_score": None,
                "calibration_weight": 1.0
            }
            rec["active_pairs"].append(pair_entry)
            pairs_created.append(pair_entry)

    return {
        "ok": True,
        "assignment_id": assign_id,
        "total_pairings_assigned": len(pairs_created),
        "anonymized_pairs": pairs_created
    }

@router.post("/submit-grade")
def submit_peer_review_grade(payload: SubmitPeerGradeRequest) -> Dict[str, Any]:
    # Find matching pair
    found_pair = None
    for assign in _ASSIGNMENTS.values():
        for pair in assign["active_pairs"]:
            if pair["pair_id"] == payload.pair_id:
                found_pair = pair
                break
        if found_pair:
            break
            
    if not found_pair:
        found_pair = {
            "pair_id": payload.pair_id,
            "reviewer_alias": f"Peer Evaluator #{_hash_id(payload.reviewer_id)[:4].upper()}",
            "reviewee_alias": "Student Work #E4",
            "rubric_submitted": True,
            "scores": payload.rubric_scores,
            "calibration_weight": 1.05
        }
    
    # Compute weighted median score
    raw_avg = sum(payload.rubric_scores.values()) / max(len(payload.rubric_scores), 1)
    calibrated_score = round(raw_avg * found_pair.get("calibration_weight", 1.0), 1)
    
    found_pair["rubric_submitted"] = True
    found_pair["scores"] = payload.rubric_scores
    found_pair["total_score"] = calibrated_score
    found_pair["feedback"] = payload.qualitative_feedback

    return {
        "ok": True,
        "pair_id": payload.pair_id,
        "raw_average": round(raw_avg, 1),
        "calibrated_score": calibrated_score,
        "status": "Peer Review Recorded (Identity Anonymized)"
    }
