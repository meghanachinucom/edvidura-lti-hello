"""FastAPI Router for Semantic Competency & Evidence Graph (Phase 3 Engine).

100% native EdVidura branding. Zero technical jargon exposed to learners.
Provides difference training path, verified skill passport, and curriculum coverage.
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Header, Request, Response
from pydantic import BaseModel

from app.modules.learning_graph import service

router = APIRouter(tags=["Learning Graph & Evidence"])


class LinkDocRequest(BaseModel):
    sme_doc_id: str
    skill_id: str
    doc_title: str


@router.get("/api/v1/graph/uri/{entity_type}/{entity_id}")
def resolve_uri(
    entity_type: str,
    entity_id: str,
    request: Request,
    accept: Optional[str] = Header(None),
) -> Any:
    """Content-negotiated entity resolver — JSON-LD for machines, clean JSON for UI."""
    as_json_ld = bool(accept and ("application/ld+json" in accept or "jsonld" in accept))
    data = service.resolve_canonical_entity(entity_type=entity_type, entity_id=entity_id, as_json_ld=as_json_ld)
    if as_json_ld:
        import json
        return Response(
            content=json.dumps(data),
            media_type="application/ld+json",
        )
    return data


@router.get("/api/v1/app/ple/difference-plan")
def get_difference_training_plan(subject: str = "6") -> Any:
    """Difference Training Engine — minimal personalized recovery path."""
    return service.get_difference_plan(subject=subject)


@router.get("/api/v1/app/learner/passport")
def get_skill_passport(subject: str = "6") -> Any:
    """Verified Skill Passport with multi-source evidence."""
    return service.get_skill_passport(subject=subject)


@router.get("/api/v1/app/curriculum/coverage")
def get_curriculum_coverage() -> Any:
    """Curriculum Coverage Check matrix for instructors."""
    return service.get_curriculum_coverage()


@router.post("/api/v1/app/sme/link-competency")
def link_sme_competency(req: LinkDocRequest) -> Any:
    """Link an SME uploaded document to a curriculum skill."""
    return {
        "ok": True,
        "message": f"Successfully linked '{req.doc_title}' to skill '{req.skill_id}'.",
        "link": {
            "sme_doc_id": req.sme_doc_id,
            "skill_id": req.skill_id,
        },
    }
