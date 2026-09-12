"""Analytics / BI aggregations (in-app + Metabase + Yet LRS status)."""

from app.modules.analytics.integrations import (
    integration_status,
    lrs_status,
    metabase_status,
)
from app.modules.analytics.service import (
    export_rows,
    learner_dashboard,
    live_school_users,
    metabase_embed_url,
    tenant_dashboard,
)

__all__ = [
    "export_rows",
    "tenant_dashboard",
    "learner_dashboard",
    "live_school_users",
    "metabase_embed_url",
    "integration_status",
    "lrs_status",
    "metabase_status",
]
