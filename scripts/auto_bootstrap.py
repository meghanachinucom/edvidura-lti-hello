#!/usr/bin/env python3
"""CLI wrapper for app.auto_bootstrap."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.auto_bootstrap import ensure_cloud_database_bootstrapped

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    ensure_cloud_database_bootstrapped()
    sys.exit(0)
