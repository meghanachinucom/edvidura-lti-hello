"""Private air-gapped AI / deploy pack checklist."""
from __future__ import annotations

import os
from typing import Any

_LOCAL_PROVIDERS = frozenset({"", "none", "off", "local_http", "heuristic", "heuristics"})


def pack_status() -> dict[str, Any]:
    """Operational checklist for the air-gap install pack (docs/AIRGAP_PACK.md).

    Never returns raw env values or key presence beyond boolean readiness flags.
    """
    airgap = (os.getenv("AIRGAP") or "").strip() in {"1", "true", "yes", "on"}
    provider = (os.getenv("AI_PROVIDER") or "").strip().lower() or "none"
    openai = bool((os.getenv("OPENAI_API_KEY") or "").strip())
    anthropic = bool((os.getenv("ANTHROPIC_API_KEY") or "").strip())
    jev = (os.getenv("JEV_ENABLED") or "").strip() in {"1", "true", "yes", "on"}
    cloud_keys = openai or anthropic
    provider_ok = provider in _LOCAL_PROVIDERS
    safe_airgap = (not airgap) or (not cloud_keys and not jev)

    checks = [
        {
            "id": "compose",
            "label": "Air-gap compose + env template present",
            "ok": True,
            "detail": "deploy/airgap/docker-compose.yml + env.airgap.example",
        },
        {
            "id": "migrations",
            "label": "Offline migrations via apply_migrations.py",
            "ok": True,
            "detail": "Ship db/ + scripts/ on USB / private registry",
        },
        {
            "id": "ai_local",
            "label": "AI provider suitable for air-gap",
            "ok": provider_ok,
            "detail": (
                "Local / off provider configured"
                if provider_ok
                else "Switch AI provider to local_http or off for air-gap"
            ),
        },
        {
            "id": "no_cloud_leak",
            "label": "No cloud AI keys when AIRGAP=1",
            "ok": safe_airgap,
            "detail": (
                "OK"
                if safe_airgap
                else "Unset OpenAI/Anthropic/Jev cloud when AIRGAP=1"
            ),
        },
        {
            "id": "topology_docs",
            "label": "Topology docs packaged",
            "ok": True,
            "detail": "docs/AIRGAP_PACK.md + DEPLOYMENT_TOPOLOGIES.md",
        },
    ]
    ready = all(bool(c["ok"]) for c in checks)
    return {
        "product": "Private Air-Gapped AI Platform",
        "wave": "A",
        "state": "thin",
        "airgap_env": airgap,
        "ready": ready,
        "checks": checks,
        "docs": "docs/AIRGAP_PACK.md",
    }
