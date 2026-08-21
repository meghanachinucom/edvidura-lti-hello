# Seed Tenant A LTI platform after Moodle registration.
#
# Prefers Admin API (POST /admin/tenants/{id}/lti-platforms) when the app is up.
# Falls back to direct DB upsert for offline/local bootstrap.
#
# Usage:
#   python scripts/seed_platforms.py
#
# Reads MOODLE_* and ADMIN_API_KEY / APP_BASE_URL from .env

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app.db import upsert_platform  # noqa: E402
from app.tenancy import TENANT_A_ID  # noqa: E402


def _seed_via_admin_api(
    *,
    issuer: str,
    client_id: str,
    deployments: list[str],
    auth_login_url: str,
    auth_token_url: str,
    key_set_url: str,
) -> bool:
    base = os.getenv("APP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    # Browser-facing host.docker.internal may not resolve from host Python
    if "host.docker.internal" in base:
        base = base.replace("host.docker.internal", "127.0.0.1")
    admin_key = os.getenv("ADMIN_API_KEY", "dev-admin-change-me").strip()
    url = f"{base}/admin/tenants/{TENANT_A_ID}/lti-platforms"
    body = json.dumps(
        {
            "issuer": issuer,
            "client_id": client_id,
            "deployment_ids": deployments,
            "auth_login_url": auth_login_url,
            "auth_token_url": auth_token_url,
            "key_set_url": key_set_url,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Key": admin_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if 200 <= resp.status < 300:
                print(f"Seeded Tenant A via Admin API: {issuer} / {client_id}")
                return True
    except urllib.error.URLError as exc:
        print(f"Admin API unavailable ({exc}); falling back to DB upsert")
    except Exception as exc:  # noqa: BLE001
        print(f"Admin API seed failed ({exc}); falling back to DB upsert")
    return False


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
    ] or ["1"]
    auth_login_url = os.getenv("MOODLE_AUTH_LOGIN_URL", f"{issuer}/mod/lti/auth.php")
    auth_token_url = os.getenv("MOODLE_AUTH_TOKEN_URL", f"{issuer}/mod/lti/token.php")
    key_set_url = os.getenv("MOODLE_KEY_SET_URL", f"{issuer}/mod/lti/certs.php")

    if _seed_via_admin_api(
        issuer=issuer,
        client_id=client_id,
        deployments=deployments,
        auth_login_url=auth_login_url,
        auth_token_url=auth_token_url,
        key_set_url=key_set_url,
    ):
        return

    upsert_platform(
        tenant_id=TENANT_A_ID,
        issuer=issuer,
        client_id=client_id,
        deployment_ids=deployments,
        auth_login_url=auth_login_url,
        auth_token_url=auth_token_url,
        key_set_url=key_set_url,
    )
    print(f"Seeded Tenant A platform (DB): {issuer} / {client_id}")


if __name__ == "__main__":
    _seed_a()
