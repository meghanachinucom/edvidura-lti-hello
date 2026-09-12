"""TLA-shaped catalogue / experience / profile read APIs (ops-auth)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app import db
from app.admin_auth import OpsAuth
from app.modules import tla

router = APIRouter(prefix="/api/v1", tags=["tla"])


def _require_tenant(tenant_id: UUID) -> None:
    if not db.get_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' not found",
        )


@router.get("/tla/maturity")
def tla_maturity(_ops: OpsAuth) -> dict[str, Any]:
    """TLA/CMM requirements (all levels) + ADL refs + vendored artifacts."""
    return tla.maturity_report()


@router.get("/tla/cmi5/requirements")
def tla_cmi5_requirements(
    _ops: OpsAuth,
    limit: int = Query(20, ge=1, le=200),
    req_id: str | None = Query(None, description="CATAPULT requirement id"),
) -> dict[str, Any]:
    """Vendored ADL CATAPULT cmi5 requirements.json lookup."""
    if req_id:
        row = tla.get_requirement(req_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Requirement '{req_id}' not found",
            )
        return {"id": req_id, "requirement": row}
    return tla.summarize_requirements(limit=limit)


@router.get("/xi/experiences")
def list_xi_experiences(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    competency: str | None = Query(
        None, description="Filter educationalAlignment.competency (xi-lite)"
    ),
    url: str | None = Query(None, description="Filter content url (xi-lite)"),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
) -> list[dict[str, Any]]:
    """ADL xi-lite compatible Experience Index listing."""
    _require_tenant(tenant_id)
    return tla.xi_experiences(
        tenant_id,
        competency=competency,
        url=url,
        limit=limit,
        offset=offset,
    )


@router.get("/xi/experiences/{experience_id}")
def get_xi_experience(
    experience_id: str,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    """ADL xi-lite compatible single Experience Index entry."""
    _require_tenant(tenant_id)
    row = tla.xi_experience(tenant_id, experience_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found"
        )
    return row


@router.get("/catalogue/courses")
def list_catalogue_courses(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    return {
        "tenant_id": str(tenant_id),
        "courses": tla.catalogue_courses(tenant_id),
    }


@router.get("/catalogue/courses/{course_id}")
def get_catalogue_course(
    course_id: UUID,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    row = tla.catalogue_course(tenant_id, course_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )
    return {"tenant_id": str(tenant_id), "course": row}


@router.get("/experiences")
def list_experiences(
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
    actor: str | None = Query(None, description="LMS subject / actor_sub"),
    limit: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    return {
        "tenant_id": str(tenant_id),
        "actor": actor or None,
        "experiences": tla.experience_index(
            tenant_id, actor=actor, limit=limit
        ),
    }


@router.get("/profiles/{subject}")
def get_learner_profile(
    subject: str,
    _ops: OpsAuth,
    tenant_id: UUID = Query(...),
) -> dict[str, Any]:
    _require_tenant(tenant_id)
    return tla.learner_profile(tenant_id, subject)
