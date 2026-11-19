"""BF-02: Unified Rubric Grader & Annotations Service & Router.

Provides instructors with full-spectrum rubric grading, inline criteria scoring,
and muted grade publication (holding grades hidden from students until released) with 100% native EdVidura branding.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/grader", tags=["Unified Rubric Grader"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

_SUBMISSIONS: Dict[str, Dict[str, Any]] = {
    "sub-alice-slice-a": {
        "submission_id": "sub-alice-slice-a",
        "student_id": "6",
        "student_name": "Alice Nguyen",
        "assignment_title": "Class 8 Slice A Assessment: Linear Foundations",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "is_muted": True,
        "overall_grade": 92.0,
        "rubric": [
            {
                "id": "crit-balance",
                "title": "Application of Balance Scale Model",
                "max_score": 25,
                "awarded_score": 24,
                "feedback": "Flawless demonstration of symmetric operations on both sides."
            },
            {
                "id": "crit-isolation",
                "title": "Variable Isolation & Algebraic Steps",
                "max_score": 35,
                "awarded_score": 33,
                "feedback": "Correct division of coefficient, clearly documented steps."
            },
            {
                "id": "crit-real-world",
                "title": "Applied Word Problem Formulation",
                "max_score": 40,
                "awarded_score": 35,
                "feedback": "Minor unit label omission in step 3; conceptual model was exact."
            }
        ],
        "instructor_notes": "Outstanding engagement with Ask Vidura during the study prep."
    }
}

class RubricScoreItem(BaseModel):
    criteria_id: str
    awarded_score: float
    feedback: Optional[str] = None

class SaveAnnotationRequest(BaseModel):
    submission_id: str
    rubric_scores: List[RubricScoreItem]
    instructor_notes: Optional[str] = None
    is_muted: Optional[bool] = True

class PublishGradesRequest(BaseModel):
    submission_id: str
    release_notification: bool = True

@router.get("/submissions/{id}")
def get_submission_grading(id: str) -> Dict[str, Any]:
    sub = _SUBMISSIONS.get(id) or _SUBMISSIONS["sub-alice-slice-a"]
    return {"ok": True, "submission": sub}

@router.post("/annotations")
def save_rubric_annotation(payload: SaveAnnotationRequest) -> Dict[str, Any]:
    sub = _SUBMISSIONS.get(payload.submission_id)
    if not sub:
        sub = {
            "submission_id": payload.submission_id,
            "student_id": "6",
            "student_name": "Alice Nguyen",
            "assignment_title": "Class 8 Assignment",
            "is_muted": True,
            "overall_grade": 0.0,
            "rubric": []
        }
        _SUBMISSIONS[payload.submission_id] = sub
    
    total_awarded = sum(r.awarded_score for r in payload.rubric_scores)
    sub["overall_grade"] = total_awarded
    if payload.instructor_notes is not None:
        sub["instructor_notes"] = payload.instructor_notes
    if payload.is_muted is not None:
        sub["is_muted"] = payload.is_muted

    return {
        "ok": True,
        "submission_id": payload.submission_id,
        "total_grade": total_awarded,
        "is_muted": sub["is_muted"],
        "status": "Saved (Muted - hidden from student)" if sub["is_muted"] else "Saved (Published)"
    }

@router.post("/publish-grades")
def publish_grades(payload: PublishGradesRequest) -> Dict[str, Any]:
    sub = _SUBMISSIONS.get(payload.submission_id)
    if sub:
        sub["is_muted"] = False
        sub["published_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "ok": True,
        "submission_id": payload.submission_id,
        "status": "Published to Learner Portal",
        "released_at": datetime.now(timezone.utc).isoformat()
    }
