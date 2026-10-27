"""Where to send the browser after LTI / client-launch.

Local Moodle (port 8085) must land on the Vite SPA, not the Jinja launch hub.
Production serves the built SPA from ``/app/`` when ``frontend/dist`` is in the image.
"""
from __future__ import annotations

import os
from pathlib import Path


def spa_dist_index() -> Path:
    return Path(__file__).resolve().parents[1] / "frontend" / "dist" / "index.html"


def bundled_spa() -> bool:
    try:
        return spa_dist_index().is_file()
    except Exception:  # noqa: BLE001
        return False


def spa_enabled() -> bool:
    raw_shell = os.getenv("FRONTEND_SHELL", "").strip().lower()
    if raw_shell in {"1", "true", "yes", "on"}:
        return False
    from app.settings import get_settings

    settings = get_settings()
    if settings.is_production_like and bundled_spa():
        return True
    explicit = os.getenv("FRONTEND_ORIGIN", "").strip()
    if settings.is_production_like:
        return bool(explicit)
    if "FRONTEND_ORIGIN" in os.environ and not explicit:
        return False
    return True


def spa_origin() -> str:
    from app.settings import get_settings

    return (get_settings().frontend_origin or "http://127.0.0.1:3000").rstrip("/")


def launch_destination(token: str, *, shell: bool = False) -> str:
    tok = (token or "").strip()
    if shell or not spa_enabled():
        return f"/launch-hub?token={tok}"
    from app.settings import get_settings

    settings = get_settings()
    if settings.is_production_like and bundled_spa():
        extra = (os.getenv("FRONTEND_ORIGIN") or "").rstrip("/")
        base = (settings.app_base_url or "").rstrip("/")
        if extra and extra not in {base, f"{base}/app"}:
            return f"{extra}/?token={tok}"
        return f"/app/?token={tok}"
    return f"{spa_origin()}/?token={tok}"
