"""Adaptive interactive labs — school textbook → lab pack → playground."""

from app.modules.interactive_labs.service import (
    get_lab_pack,
    list_lab_packs,
    propose_lab_pack,
    publish_lab_pack,
    upsert_lab_pack,
)

__all__ = [
    "propose_lab_pack",
    "upsert_lab_pack",
    "get_lab_pack",
    "list_lab_packs",
    "publish_lab_pack",
]
