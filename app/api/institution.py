"""Institution onboarding router (ops-authenticated)."""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, HTTPException, status
import psycopg

from app import db
from app.admin_auth import OpsAuth
from app.schemas.institution import InstitutionCreate, InstitutionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/institutions", tags=["Institutions"])


@router.post("", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_institution(payload: InstitutionCreate, _ops: OpsAuth) -> dict:
    logger.info(
        "Creating institution code=%s for tenant_id=%s",
        payload.institution_code,
        payload.tenant_id,
    )

    tenant = db.get_tenant(payload.tenant_id)
    if not tenant:
        logger.warning("Tenant %s not found for institution creation", payload.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id '{payload.tenant_id}' does not exist.",
        )

    existing = db.get_institution_by_code(payload.institution_code)
    if existing:
        logger.warning("Duplicate institution_code: %s", payload.institution_code)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Institution with code '{payload.institution_code}' already exists.",
        )

    try:
        institution = db.create_institution(
            tenant_id=payload.tenant_id,
            institution_code=payload.institution_code,
            institution_name=payload.institution_name,
            issuer=payload.issuer,
            client_id=payload.client_id,
            deployment_ids=payload.deployment_ids,
        )

        issuer_clean = payload.issuer.rstrip("/")
        auth_login_url = payload.auth_login_url or f"{issuer_clean}/mod/lti/auth.php"
        auth_token_url = payload.auth_token_url or f"{issuer_clean}/mod/lti/token.php"
        key_set_url = payload.key_set_url or f"{issuer_clean}/mod/lti/certs.php"

        db.upsert_platform(
            tenant_id=str(payload.tenant_id),
            issuer=issuer_clean,
            client_id=payload.client_id,
            deployment_ids=payload.deployment_ids,
            auth_login_url=auth_login_url,
            auth_token_url=auth_token_url,
            key_set_url=key_set_url,
        )
        logger.info(
            "Successfully created institution %s and upserted platform for tenant %s",
            institution["id"],
            payload.tenant_id,
        )
        return institution

    except psycopg.errors.UniqueViolation:
        logger.warning("Unique violation for institution_code: %s", payload.institution_code)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Institution with code '{payload.institution_code}' already exists.",
        )
    except psycopg.errors.ForeignKeyViolation:
        logger.warning("Foreign key violation for tenant_id: %s", payload.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id '{payload.tenant_id}' does not exist.",
        )
    except Exception as exc:
        logger.error("Failed to create institution: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get("", response_model=List[InstitutionResponse])
@router.get("/", response_model=List[InstitutionResponse], include_in_schema=False)
def list_institutions(_ops: OpsAuth) -> list[dict]:
    logger.info("Listing all institutions")
    return db.list_institutions()
