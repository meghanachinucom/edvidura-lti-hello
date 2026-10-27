"""Government pravachana video library (AP cultural / Chaganti pack)."""

from app.modules.pravachana.service import (
    add_note,
    catalog,
    dept_stats,
    get_episode,
    learner_progress,
    list_notes,
    record_progress,
    upsert_episode,
    upsert_series,
)

__all__ = [
    "add_note",
    "catalog",
    "dept_stats",
    "get_episode",
    "learner_progress",
    "list_notes",
    "record_progress",
    "upsert_episode",
    "upsert_series",
]
