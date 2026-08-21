"""Versioned manuals / technical eBook path."""

from app.modules.manuals.service import (
    add_version,
    create_manual,
    get_manual,
    get_version,
    latest_published_version,
    list_manuals,
    list_versions,
    publish_version,
    render_body,
)

__all__ = [
    "list_manuals",
    "get_manual",
    "create_manual",
    "list_versions",
    "get_version",
    "latest_published_version",
    "add_version",
    "publish_version",
    "render_body",
]
