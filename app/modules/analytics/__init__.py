"""Analytics / BI aggregations (in-app + Metabase + Yet LRS status)."""

from app.modules.analytics.integrations import (
    integration_status,
    lrs_status,
    metabase_status,
)
from app.modules.analytics.service import (
    attach_study_plan,
    class_coach_insights,
    derive_sessions,
    export_rows,
    group_progress_by_tool,
    heatmap_from_rows,
    learner_dashboard,
    learner_date_heatmap,
    learner_time_series,
    live_school_users,
    metabase_embed_url,
    tenant_dashboard,
)

__all__ = [
    "export_rows",
    "tenant_dashboard",
    "group_progress_by_tool",
    "derive_sessions",
    "heatmap_from_rows",
    "learner_date_heatmap",
    "learner_time_series",
    "learner_dashboard",
    "attach_study_plan",
    "class_coach_insights",
    "live_school_users",
    "metabase_embed_url",
    "integration_status",
    "lrs_status",
    "metabase_status",
]
