"""C13 SME chatbot source registry."""

from app.modules.sme.service import (
    add_lesson_source,
    add_manual_source,
    archive_source,
    coach_chunks_for_tenant,
    ensure_default_sources,
    list_sources,
    resolve_source_chunks,
    split_manual_sections,
)

__all__ = [
    "list_sources",
    "add_manual_source",
    "add_lesson_source",
    "archive_source",
    "ensure_default_sources",
    "resolve_source_chunks",
    "coach_chunks_for_tenant",
    "split_manual_sections",
]
