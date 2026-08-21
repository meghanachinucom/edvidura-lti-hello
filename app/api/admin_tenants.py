"""Admin API: create tenants and register BYO-Moodle LTI platforms."""
from __future__ import annotations

import logging
from typing import List
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app import db
from app.admin_auth import require_admin_key
from app.schemas.tenant import (
    LtiPlatformCreate,
    LtiPlatformResponse,
    TenantCreate,
    TenantResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["Admin — Tenants"],
    dependencies=[Depends(require_admin_key)],
)


def _serialize_tenant(row: dict) -> dict:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "name": row["name"],
        "status": row["status"],
        "created_at": row["created_at"],
    }


def _serialize_platform(row: dict) -> dict:
    return {
        "id": row["id"],
        "tenant_id": row["tenant_id"],
        "issuer": row["issuer"],
        "client_id": row["client_id"],
        "deployment_ids": list(row.get("deployment_ids") or []),
        "auth_login_url": row["auth_login_url"],
        "auth_token_url": row["auth_token_url"],
        "key_set_url": row["key_set_url"],
        "active": bool(row.get("active", True)),
        "last_launch_at": row.get("last_launch_at"),
        "created_at": row["created_at"],
        "tenant_slug": row.get("tenant_slug"),
        "tenant_name": row.get("tenant_name"),
    }


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate) -> dict:
    existing = db.get_tenant_by_slug(payload.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant slug '{payload.slug}' already exists.",
        )
    try:
        row = db.create_tenant(slug=payload.slug, name=payload.name, status=payload.status)
        logger.info("Created tenant slug=%s id=%s", row["slug"], row["id"])
        return _serialize_tenant(row)
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant slug '{payload.slug}' already exists.",
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("create_tenant failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/tenants", response_model=List[TenantResponse])
def list_tenants() -> list[dict]:
    return [_serialize_tenant(r) for r in db.list_tenants()]


@router.post(
    "/tenants/{tenant_id}/lti-platforms",
    response_model=LtiPlatformResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lti_platform(tenant_id: UUID, payload: LtiPlatformCreate) -> dict:
    tenant = db.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' does not exist.",
        )
    issuer = payload.issuer.strip().rstrip("/")
    deployments = [d.strip() for d in payload.deployment_ids if d and str(d).strip()]
    if not deployments:
        deployments = ["1"]
    auth_login = (payload.auth_login_url or f"{issuer}/mod/lti/auth.php").strip()
    auth_token = (payload.auth_token_url or f"{issuer}/mod/lti/token.php").strip()
    key_set = (payload.key_set_url or f"{issuer}/mod/lti/certs.php").strip()
    try:
        row = db.upsert_platform(
            tenant_id=str(tenant_id),
            issuer=issuer,
            client_id=payload.client_id.strip(),
            deployment_ids=deployments,
            auth_login_url=auth_login,
            auth_token_url=auth_token,
            key_set_url=key_set,
        )
        row["tenant_slug"] = tenant["slug"]
        row["tenant_name"] = tenant["name"]
        logger.info(
            "Upserted LTI platform tenant=%s issuer=%s client_id=%s",
            tenant["slug"],
            issuer,
            payload.client_id,
        )
        return _serialize_platform(row)
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' does not exist.",
        )
    except Exception as exc:  # noqa: BLE001
        # Missing last_launch_at column on older DBs — retry without RETURNING extras
        logger.error("create_lti_platform failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "/tenants/{tenant_id}/lti-platforms",
    response_model=List[LtiPlatformResponse],
)
def list_lti_platforms(tenant_id: UUID) -> list[dict]:
    tenant = db.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' does not exist.",
        )
    rows = db.list_platforms_for_tenant(tenant_id)
    out = []
    for r in rows:
        r = dict(r)
        r["tenant_slug"] = tenant["slug"]
        r["tenant_name"] = tenant["name"]
        out.append(_serialize_platform(r))
    return out


@router.get("/lti-platforms", response_model=List[LtiPlatformResponse])
def list_all_lti_platforms() -> list[dict]:
    return [_serialize_platform(r) for r in db.list_all_platforms()]
