"""Pydantic schemas for institution onboarding."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class InstitutionCreate(BaseModel):
    tenant_id: UUID = Field(..., description="UUID of the tenant owning this institution")
    institution_code: str = Field(..., description="Unique code for institution")
    institution_name: str = Field(..., description="Name of the institution")
    issuer: str = Field(..., description="LTI issuer URL")
    client_id: str = Field(..., description="LTI client ID")
    deployment_ids: List[str] = Field(default_factory=lambda: ["1"], description="Deployment IDs")
    auth_login_url: Optional[str] = Field(default=None, description="Optional LTI auth login URL")
    auth_token_url: Optional[str] = Field(default=None, description="Optional LTI auth token URL")
    key_set_url: Optional[str] = Field(default=None, description="Optional LTI key set URL")


class InstitutionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    institution_code: str
    institution_name: str
    issuer: str
    client_id: str
    deployment_ids: List[str]
    status: str
    created_at: datetime
