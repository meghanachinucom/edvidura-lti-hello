"""Backward-compatible facade — prefer ``app.modules.content`` in new code."""

from app.modules.content import *  # noqa: F403
from app.modules.school import (  # noqa: F401
    list_classes_with_roster,
    list_school_admins,
    list_teachers,
    school_snapshot,
)
