"""Loader for ADL CATAPULT cmi5 ``requirements.json``.

Upstream: https://github.com/adlnet/CATAPULT/tree/master/requirements
Vendored at ``vendor/cmi5/requirements.json`` (Apache-2.0).
Portable — no app imports.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_VENDOR = Path(__file__).resolve().parent / "vendor" / "cmi5" / "requirements.json"


@lru_cache(maxsize=1)
def load_cmi5_requirements() -> dict[str, Any]:
    """Return the full CATAPULT requirements map (id → requirement object)."""
    if not _VENDOR.is_file():
        return {}
    return json.loads(_VENDOR.read_text(encoding="utf-8"))


def list_requirement_ids() -> list[str]:
    return sorted(load_cmi5_requirements().keys())


def get_requirement(req_id: str) -> dict[str, Any] | None:
    data = load_cmi5_requirements()
    row = data.get(req_id)
    return dict(row) if isinstance(row, dict) else None


def summarize_requirements(*, limit: int = 20) -> dict[str, Any]:
    data = load_cmi5_requirements()
    ids = sorted(data.keys())
    sample = []
    for rid in ids[: max(0, limit)]:
        row = data[rid]
        if not isinstance(row, dict):
            continue
        sample.append(
            {
                "id": rid,
                "text": str(row.get("txt") or row.get("text") or "")[:240],
            }
        )
    return {
        "source": "adlnet/CATAPULT requirements/requirements.json",
        "count": len(ids),
        "sample": sample,
    }
