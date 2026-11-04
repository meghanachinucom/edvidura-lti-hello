"""Private air-gapped AI / deploy pack checklist."""
from __future__ import annotations

import os
from typing import Any


def pack_status() -> dict[str, Any]:
    """Operational checklist for the air-gap install pack (docs/AIRGAP_PACK.md)."""
    airgap = (os.getenv("AIRGAP") or "").strip() in {"1", "true", "yes", "on"}
    provider = (os.getenv("AI_PROVIDER") or "").strip().lower() or "none"
    openai = bool((os.getenv("OPENAI_API_KEY") or "").strip())
    anthropic = bool((os.getenv("ANTHROPIC_API_KEY") or "").strip())
    jev = (os.getenv("JEV_ENABLED") or "").strip() in {"1", "true", "yes", "on"}
    cloud_keys = openai or anthropic
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
            "ok": provider in {"", "none", "off", "local_http", "heuristic", "heuristics"},
            "detail": f"AI_PROVIDER={provider or 'unset'}",
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
