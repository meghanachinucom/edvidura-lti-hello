"""Tenant identity and LTI platform resolution (DEC-006)."""

from app.modules.tenancy.constants import TENANT_A_ID, TENANT_B_ID
from app.modules.tenancy.context import (
    TenantContext,
    get_tenant_context,
    require_tenant_context,
    reset_tenant_context,
    set_tenant_context,
    use_tenant_context,
    with_tenant,
)
from app.modules.tenancy.names import display_name_from_launch, greeting_first_name
from app.modules.tenancy.lms import (
    default_lms_home,
    default_lms_return_url,
    detect_lms_name,
)
from app.modules.tenancy.resolve import ResolvedTenant, resolve_platform
from app.modules.tenancy.tool_conf import build_tool_conf_from_db

__all__ = [
    "TENANT_A_ID",
    "TENANT_B_ID",
    "ResolvedTenant",
    "resolve_platform",
    "build_tool_conf_from_db",
    "TenantContext",
    "get_tenant_context",
    "require_tenant_context",
    "set_tenant_context",
    "reset_tenant_context",
    "use_tenant_context",
    "with_tenant",
    "display_name_from_launch",
    "greeting_first_name",
    "detect_lms_name",
    "default_lms_home",
    "default_lms_return_url",
]
