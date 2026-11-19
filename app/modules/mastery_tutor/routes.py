"""FastAPI Router for Guided Mastery Tutor (Phase 1 Engine).

100% native EdVidura branding. Exposes diagnostic placement,
real-time skill progression, spaced reviews, and stateful turn controller.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.modules.mastery_tutor import service

router = APIRouter(prefix="/api/v1/app/tutor", tags=["Mastery Tutor"])


class DiagnosticRequest(BaseModel):
    skill_id: Optional[str] = None
    answers: Optional[Dict[str, int]] = None
    subject: Optional[str] = "6"


class TurnRequest(BaseModel):
    skill_id: str = "solve-linear"
    step: int = 1
    answer: str = ""
    mode: str = "guided"
    language: str = "en-IN"
    subject: Optional[str] = "6"


@router.get("/skill-tree")
def get_skill_tree(subject: str = "6") -> Any:
    """Return learner skill tree with Levels 0 to 5, status tags, and lock state."""
    skills = service.get_learner_skills(subject=subject)
    return {
        "ok": True,
        "subject": subject,
        "skills": skills,
        "total_skills": len(skills),
    }


@router.get("/reviews-due")
def get_reviews_due(subject: str = "6") -> Any:
    """Return skills due for quick 2-minute daily refresher."""
    due = service.get_reviews_due(subject=subject)
    return {
        "ok": True,
        "subject": subject,
        "count": len(due),
        "reviews": due,
    }


@router.post("/diagnostic")
def run_diagnostic(req: DiagnosticRequest) -> Any:
    """Provide placement questions or evaluate answers to calibrate starting mastery level."""
    return service.run_diagnostic_placement(
        subject=req.subject or "6",
        skill_id=req.skill_id,
        answers=req.answers,
    )


@router.post("/turn")
def tutor_turn(req: TurnRequest) -> Any:
    """Stateful single question turn controller with 3-step hint ladder."""
    return service.execute_tutor_turn(
        subject=req.subject or "6",
        skill_id=req.skill_id,
        step=req.step,
        answer=req.answer,
        mode=req.mode,
        language=req.language,
    )
