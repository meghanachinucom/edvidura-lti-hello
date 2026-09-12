"""Yet Analytics LRS + Metabase integration status — domain helpers."""
from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx

from app.modules.analytics.service import metabase_embed_url
from app.modules.xapi.lrs_client import probe_lrs
from app.settings import get_settings


def metabase_status(*, probe: bool = False) -> dict[str, Any]:
    """Report Metabase config + optional HTTP reachability."""
    s = get_settings()
    base = (s.metabase_url or "").rstrip("/")
    secret = (s.metabase_secret_key or "").strip()
    dash = int(s.metabase_embed_dashboard_id or 0)
    embed_ready = bool(base and secret and dash > 0)
    sample_embed = (
        metabase_embed_url(tenant_slug="demo", resource_id=dash)
        if embed_ready
        else None
    )
    out: dict[str, Any] = {
        "configured_url": bool(base),
        "url": base or None,
        "host": urlparse(base).netloc if base else None,
        "embed_signing": bool(secret),
        "embed_dashboard_id": dash or None,
        "embed_ready": embed_ready,
        "sample_embed_path": (
            "/embed/dashboard/…" if sample_embed else None
        ),
        "reachable": None,
        "detail": None,
    }
    if probe and base:
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{base}/api/health")
            # Metabase health returns 200 with {"status":"ok"} when up
            out["reachable"] = resp.status_code == 200
            out["status_code"] = resp.status_code
            if resp.status_code != 200:
                out["detail"] = (resp.text or "")[:200]
        except Exception as exc:  # noqa: BLE001
            out["reachable"] = False
            out["detail"] = str(exc)
    return out


def lrs_status(*, probe: bool = False) -> dict[str, Any]:
    """Report Yet Analytics / generic LRS config + optional probe."""
    s = get_settings()
    provider = (s.xapi_lrs_provider or "auto").strip().lower() or "auto"
    endpoint = (s.xapi_lrs_endpoint or "").strip()
    base = {
        "provider": provider,
        "endpoint": endpoint or None,
        "key_set": bool(s.xapi_lrs_key),
        "secret_set": bool(s.xapi_lrs_secret),
    }
    if not probe:
        return {
            **base,
            "configured": bool(endpoint and s.xapi_lrs_key and s.xapi_lrs_secret),
            "probe": None,
        }
    probe_result = probe_lrs(
        endpoint=endpoint,
        key=s.xapi_lrs_key,
        secret=s.xapi_lrs_secret,
        provider=provider,  # type: ignore[arg-type]
    )
    return {**base, **probe_result}


def integration_status(*, probe: bool = False) -> dict[str, Any]:
    """Combined Yet LRS + Metabase status for ops / demos."""
    return {
        "schema": "edvidura.analytics.integrations.v1",
        "yet_analytics_lrs": lrs_status(probe=probe),
        "metabase": metabase_status(probe=probe),
        "docs": "docs/YET_LRS_METABASE.md",
    }
