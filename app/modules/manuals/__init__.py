"""Versioned technical manuals / PeBL-ish eBook path."""

from app.modules.manuals.service import (
    add_version,
    create_manual,
    get_manual,
    get_version,
    latest_published_version,
    list_manuals,
    list_versions,
    publish_version,
    reader_share_path,
    render_body,
    seal_reader_token,
    toc_from_body,
    verify_reader_token,
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
    "toc_from_body",
    "seal_reader_token",
    "verify_reader_token",
    "reader_share_path",
]
