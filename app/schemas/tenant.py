"""Pydantic schemas for tenant + LTI platform admin APIs."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TenantCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(..., min_length=2, max_length=200)
    status: str = Field(default="active", pattern=r"^(active|disabled)$")
    segment: str = Field(
        default="school", pattern=r"^(school|corporate|government)$"
    )
    capabilities: Optional[dict] = None
    enabled_blocks: Optional[List[str]] = None
    blocks_preset: Optional[str] = None


class TenantSegmentUpdate(BaseModel):
    segment: str = Field(..., pattern=r"^(school|corporate|government)$")
    capabilities: Optional[dict] = None
    reset_capabilities: bool = True


class TenantBlocksUpdate(BaseModel):
    """Apply a Lego block list or named preset to a tenant."""

    blocks: Optional[List[str]] = None
    preset: Optional[str] = None
    segment: Optional[str] = Field(
        default=None, pattern=r"^(school|corporate|government)$"
    )
    replace: bool = True


class TenantNameUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    status: str
    segment: str = "school"
    capabilities: Optional[dict] = None
    enabled_blocks: Optional[List[str]] = None
    created_at: datetime


class TenantBlocksResponse(BaseModel):
    tenant: TenantResponse
    applied_blocks: List[str] = Field(default_factory=list)
    unavailable: List[dict] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    preset: Optional[str] = None


class LtiPlatformCreate(BaseModel):
    issuer: str = Field(..., min_length=8, max_length=500)
    client_id: str = Field(..., min_length=1, max_length=200)
    deployment_ids: List[str] = Field(default_factory=lambda: ["1"])
    auth_login_url: Optional[str] = None
    auth_token_url: Optional[str] = None
    key_set_url: Optional[str] = None


class LtiPlatformResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    issuer: str
    client_id: str
    deployment_ids: List[str]
    auth_login_url: str
    auth_token_url: str
    key_set_url: str
    active: bool
    last_launch_at: Optional[datetime] = None
    created_at: datetime
    tenant_slug: Optional[str] = None
    tenant_name: Optional[str] = None
