# Seed Tenant A LTI platform row after Moodle registration.
#
# Usage:
#   python scripts/seed_platforms.py
#
# Reads MOODLE_* from .env

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app.db import upsert_platform
from app.tenancy import TENANT_A_ID


def _seed_a() -> None:
    client_id = os.getenv("MOODLE_CLIENT_ID", "").strip()
    if not client_id:
        print("Skip Tenant A: MOODLE_CLIENT_ID empty")
        return
    issuer = os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
    deployments = [
        d.strip()
        for d in os.getenv("MOODLE_DEPLOYMENT_IDS", "1").split(",")
        if d.strip()
    ]
    upsert_platform(
        tenant_id=TENANT_A_ID,
        issuer=issuer,
        client_id=client_id,
        deployment_ids=deployments or ["1"],
        auth_login_url=os.getenv(
            "MOODLE_AUTH_LOGIN_URL", f"{issuer}/mod/lti/auth.php"
        ),
        auth_token_url=os.getenv(
            "MOODLE_AUTH_TOKEN_URL", f"{issuer}/mod/lti/token.php"
        ),
        key_set_url=os.getenv(
            "MOODLE_KEY_SET_URL", f"{issuer}/mod/lti/certs.php"
        ),
    )
    print(f"Seeded Tenant A platform: {issuer} / {client_id}")


if __name__ == "__main__":
    _seed_a()
