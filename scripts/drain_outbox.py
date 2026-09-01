#!/usr/bin/env python3
"""Drain EVENT_ENVELOPE_V1 outbox for one tenant (D17 webhook when configured)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env", override=False)
except ImportError:
    pass

from app.modules import events as events_mod  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("tenant_id", type=UUID)
    p.add_argument("--limit", type=int, default=50)
    args = p.parse_args()
    result = events_mod.drain_tenant(args.tenant_id, limit=args.limit)
    print(json.dumps(result, indent=2, default=str))
    return 0 if int(result.get("failed") or 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
