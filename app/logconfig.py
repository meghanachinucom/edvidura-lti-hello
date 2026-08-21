"""Configure app log format for structured fields."""
from __future__ import annotations

import logging
import sys


class _KeyValueFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        extras = []
        for key in ("request_id", "method", "path", "status", "duration_ms", "tenant_id"):
            val = getattr(record, key, None)
            if val is not None and val != "":
                extras.append(f"{key}={val}")
        if extras:
            return f"{base} | {' '.join(extras)}"
        return base


def configure_logging() -> None:
    root = logging.getLogger()
    if getattr(root, "_edvidura_configured", False):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        _KeyValueFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    logging.getLogger("edvidura.request").setLevel(logging.INFO)
    root._edvidura_configured = True  # type: ignore[attr-defined]
