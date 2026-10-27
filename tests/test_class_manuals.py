"""Class-scoped manuals helpers (pure / no DB)."""
from __future__ import annotations

from app.modules.manuals import service as manuals_svc


def test_list_manuals_for_class_empty_without_class():
    assert manuals_svc.list_manuals_for_class("t1", None) == []
    assert manuals_svc.list_manuals_for_class("t1", "") == []


def test_manual_visible_to_class_requires_class():
    assert manuals_svc.manual_visible_to_class(
        "t1", manual_id="m1", class_id=None
    ) is False
