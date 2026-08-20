"""Map verified LTI iss+client_id(+deployment) → tenant."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from pylti1p3.exception import LtiException

from app import db


@dataclass(frozen=True)
class ResolvedTenant:
    tenant_id: UUID
    slug: str
    name: str
    issuer: str
    client_id: str
    deployment_ids: list[str]


def resolve_platform(
    issuer: str, client_id: str, deployment_id: str | None = None
) -> ResolvedTenant:
    """Map iss+client_id(+deployment) → tenant. Fail closed if unknown."""
    if not issuer or not client_id:
        raise LtiException("Missing issuer or client_id for tenant resolution")

    platform = db.find_platform(issuer, client_id)
    if not platform:
        raise LtiException(
            f"Unknown LTI platform (issuer={issuer!r}, client_id={client_id!r}). "
            "Register the tool and seed lti_platforms."
        )
    if not db.platform_allows_deployment(platform, deployment_id):
        raise LtiException(
            f"Deployment {deployment_id!r} not allowed for this platform"
        )
    return ResolvedTenant(
        tenant_id=UUID(str(platform["tenant_id"])),
        slug=platform["tenant_slug"],
        name=platform["tenant_name"],
        issuer=str(platform["issuer"]).rstrip("/"),
        client_id=platform["client_id"],
        deployment_ids=list(platform["deployment_ids"] or []),
    )
