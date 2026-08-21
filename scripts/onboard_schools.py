"""Onboard Riverside + Lakeside LTI platforms from Moodle tool Client IDs.

Usage:
  # After scripts/create_moodle_school_tools.php created the tools:
  python scripts/onboard_schools.py

Or pass client IDs explicitly:
  python scripts/onboard_schools.py --riverside CLIENT_A --lakeside CLIENT_B
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app import db  # noqa: E402
from app.tenancy import TENANT_A_ID, TENANT_B_ID  # noqa: E402

SCHOOL_A_ID = "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SCHOOL_B_ID = "22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def _moodle_tools_via_php() -> list[dict]:
    script = ROOT / "scripts" / "create_moodle_school_tools.php"
    subprocess.run(
        [
            "docker",
            "cp",
            str(script),
            "moodle-moodle-1:/tmp/create_moodle_school_tools.php",
        ],
        check=True,
    )
    out = subprocess.check_output(
        [
            "docker",
            "exec",
            "-w",
            "/var/www/html",
            "moodle-moodle-1",
            "php",
            "/tmp/create_moodle_school_tools.php",
        ],
        text=True,
    )
    print(out)
    for line in out.splitlines():
        if line.startswith("JSON:"):
            return json.loads(line[5:])
    raise RuntimeError("Moodle tool script did not return JSON payload")


def _upsert_platform(tenant_id: str, client_id: str, label: str) -> None:
    issuer = os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
    auth_login = os.getenv("MOODLE_AUTH_LOGIN_URL", f"{issuer}/mod/lti/auth.php")
    auth_token = os.getenv("MOODLE_AUTH_TOKEN_URL", f"{issuer}/mod/lti/token.php")
    key_set = os.getenv("MOODLE_KEY_SET_URL", f"{issuer}/mod/lti/certs.php")
    deployments = [
        d.strip()
        for d in os.getenv("MOODLE_DEPLOYMENT_IDS", "1,2").split(",")
        if d.strip()
    ] or ["1", "2"]

    row = db.upsert_platform(
        tenant_id=tenant_id,
        issuer=issuer,
        client_id=client_id,
        deployment_ids=deployments,
        auth_login_url=auth_login,
        auth_token_url=auth_token,
        key_set_url=key_set,
    )
    print(f"Platform OK [{label}] tenant={tenant_id} client_id={client_id} id={row.get('id')}")


def _update_institution(code: str, tenant_id: str, inst_id: str, client_id: str, name: str) -> None:
    issuer = os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
    with db.connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO institutions (
                    id, tenant_id, institution_code, institution_name,
                    issuer, client_id, deployment_ids, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
                ON CONFLICT (institution_code) DO UPDATE SET
                    tenant_id = EXCLUDED.tenant_id,
                    institution_name = EXCLUDED.institution_name,
                    issuer = EXCLUDED.issuer,
                    client_id = EXCLUDED.client_id,
                    deployment_ids = EXCLUDED.deployment_ids,
                    status = 'active'
                """,
                (
                    inst_id,
                    tenant_id,
                    code,
                    name,
                    issuer,
                    client_id,
                    ["1"],
                ),
            )
    print(f"Institution OK [{code}] client_id={client_id}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--riverside", default="")
    parser.add_argument("--lakeside", default="")
    parser.add_argument("--skip-moodle-create", action="store_true")
    args = parser.parse_args()

    riverside_cid = args.riverside.strip()
    lakeside_cid = args.lakeside.strip()

    if not args.skip_moodle_create and (not riverside_cid or not lakeside_cid):
        tools = _moodle_tools_via_php()
        by_name = {t["name"]: t["clientid"] for t in tools}
        riverside_cid = riverside_cid or by_name.get("EdVidura Riverside", "")
        lakeside_cid = lakeside_cid or by_name.get("EdVidura Lakeside", "")

    if not riverside_cid or not lakeside_cid:
        raise SystemExit(
            "Need both Client IDs. Re-run after Moodle tools exist, or pass "
            "--riverside / --lakeside."
        )

    # Ensure tenant display names
    with db.connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO tenants (id, slug, name, status) VALUES
                  (%s, 'tenant-a', 'Riverside High', 'active'),
                  (%s, 'tenant-b', 'Lakeside Academy', 'active')
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'
                """,
                (TENANT_A_ID, TENANT_B_ID),
            )

    _upsert_platform(TENANT_A_ID, riverside_cid, "Riverside")
    _upsert_platform(TENANT_B_ID, lakeside_cid, "Lakeside")
    _update_institution(
        "riverside", TENANT_A_ID, SCHOOL_A_ID, riverside_cid, "Riverside High School"
    )
    _update_institution(
        "lakeside", TENANT_B_ID, SCHOOL_B_ID, lakeside_cid, "Lakeside Academy"
    )

    print()
    print("Onboard complete. In Moodle:")
    print("  1. Add activity -> External tool -> EdVidura Riverside  (Riverside course)")
    print("  2. Add activity -> External tool -> EdVidura Lakeside   (Lakeside course)")
    print("  3. Launch each tool to verify tenant isolation.")
    print()
    print(f"Riverside Client ID: {riverside_cid}")
    print(f"Lakeside Client ID:  {lakeside_cid}")


if __name__ == "__main__":
    main()
