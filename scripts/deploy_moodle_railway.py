#!/usr/bin/env python3
"""Create a Moodle service on the linked Railway project and deploy it.

Usage (repo root, railway CLI logged in):
  python scripts/deploy_moodle_railway.py
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOODLE_DIR = ROOT / "moodle"
SERVICE = "moodle"


def _railway(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    exe = shutil.which("railway") or shutil.which("railway.exe")
    if not exe:
        print("Railway CLI not found. Install: npm i -g @railway/cli", file=sys.stderr)
        sys.exit(2)
    return subprocess.run(
        [exe, *args],
        cwd=ROOT,
        check=check,
        text=True,
        capture_output=True,
    )


def _services() -> list[dict]:
    proc = _railway("service", "list", "--json")
    return json.loads(proc.stdout or "[]")


def main() -> int:
    if not (MOODLE_DIR / "Dockerfile").exists():
        print("moodle/Dockerfile missing", file=sys.stderr)
        return 1

    names = {s.get("name") for s in _services()}
    if SERVICE not in names:
        print("Creating moodle service…")
        add = _railway("add", "--service", SERVICE, check=False)
        if add.returncode != 0:
            print(add.stderr or add.stdout, file=sys.stderr)
            return add.returncode
    else:
        print("moodle service already exists")

    names = {s.get("name") for s in _services()}
    postgres_names = sorted(n for n in names if n and str(n).lower().startswith("postgres"))
    # Keep EdVidura's existing DBs; add a dedicated Moodle Postgres if we only have
    # the original pair (or fewer).
    moodle_pg = next((n for n in postgres_names if "moodle" in n.lower()), None)
    if moodle_pg is None and len(postgres_names) < 3:
        print("Adding Postgres plugin for Moodle…")
        pg = _railway("add", "--database", "postgres", check=False)
        if pg.returncode != 0:
            print(pg.stderr or pg.stdout or "railway add postgres failed", file=sys.stderr)
            return pg.returncode or 1
        names = {s.get("name") for s in _services()}
        postgres_names = sorted(n for n in names if n and str(n).lower().startswith("postgres"))
        # Newest name is usually the one just added.
        known = {"Postgres", "Postgres-PA_L"}
        moodle_pg = next((n for n in postgres_names if n not in known), postgres_names[-1] if postgres_names else None)
    elif moodle_pg is None and postgres_names:
        moodle_pg = postgres_names[-1]
        print(f"Using existing Postgres service {moodle_pg} (set DATABASE_URL yourself if this is wrong)")

    if not moodle_pg:
        print("Could not determine Moodle Postgres service name", file=sys.stderr)
        return 1

    print(f"Linking DATABASE_URL from {moodle_pg}")
    ref = "${{" + moodle_pg + ".DATABASE_URL}}"
    vars_pairs = [
        "DB_TYPE=pgsql",
        "SSLPROXY=true",
        "REVERSEPROXY=false",
        "PORT=8080",
        "MOODLE_USERNAME=admin",
        "MOODLE_PASSWORD=Admin@12345",
        "MOODLE_EMAIL=admin@example.com",
        "MOODLE_SITENAME=EdVidura",
        "AUTO_UPDATE_MOODLE=true",
        f"DATABASE_URL={ref}",
    ]
    setv = _railway("variables", "-s", SERVICE, "set", "--skip-deploys", *vars_pairs, check=False)
    if setv.returncode != 0:
        print(setv.stderr or setv.stdout, file=sys.stderr)
        return setv.returncode or 1

    vols = _railway("volume", "list", "--json", check=False)
    has_moodledata = False
    if vols.returncode == 0 and vols.stdout.strip():
        try:
            data = json.loads(vols.stdout)
            items = data if isinstance(data, list) else data.get("volumes", [])
            for v in items:
                if v.get("mountPath") == "/var/www/moodledata" or (
                    v.get("serviceName") == SERVICE and "moodle" in str(v.get("name", "")).lower()
                ):
                    has_moodledata = True
        except json.JSONDecodeError:
            pass
    if not has_moodledata:
        print("Adding moodledata volume…")
        _railway(
            "volume",
            "add",
            "--service",
            SERVICE,
            "--mount-path",
            "/var/www/moodledata",
            check=False,
        )

    print("Generating public domain…")
    _railway("domain", "-s", SERVICE, check=False)

    print("Deploying Moodle image (first boot can take several minutes)…")
    up = subprocess.run(
        [
            shutil.which("railway") or "railway",
            "up",
            str(MOODLE_DIR),
            "--path-as-root",
            "-s",
            SERVICE,
            "--detach",
            "-y",
        ],
        cwd=ROOT,
        check=False,
        text=True,
    )
    if up.returncode != 0:
        return up.returncode
    print("Deploy started.")
    print("Watch: railway logs -s moodle")
    print("Login: {MOODLE_URL}/login/index.php  (admin / Admin@12345)")
    print("Then register that HTTPS issuer on EdVidura and point the LTI tool at APP_BASE_URL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
