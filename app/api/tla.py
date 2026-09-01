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
