from pathlib import Path

src = Path("app/modules/content/service.py").read_text(encoding="utf-8")
marker = "def list_school_admins"
idx = src.find(marker)
if idx < 0:
    raise SystemExit("marker not found")

header = '''"""School roster: admins, teachers, classes, snapshot."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db
from app.modules.content.service import get_primary_course, list_lessons


'''
Path("app/modules/school/service.py").write_text(header + src[idx:], encoding="utf-8")
Path("app/modules/content/service.py").write_text(src[:idx].rstrip() + "\n", encoding="utf-8")
print("split ok")
