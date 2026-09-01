"""Analytics / BI aggregations (in-app + Metabase views)."""

from app.modules.analytics.service import (
    export_rows,
    learner_dashboard,
    metabase_embed_url,
    tenant_dashboard,
)

__all__ = [
    "export_rows",
    "tenant_dashboard",
    "learner_dashboard",
    "metabase_embed_url",
]
