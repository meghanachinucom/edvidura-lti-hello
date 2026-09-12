#!/usr/bin/env python3
"""Seed EdVidura on Railway for a full Riverside presentation demo.

Requires Railway CLI linked to the edvidura project.

  python scripts/seed_presentation_railway.py
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

MOODLE_URL = "https://moodle-production-1516.up.railway.app"
APP_URL = "https://edvidura-app-production.up.railway.app"
CLIENT_ID = "BKPKN9TJatibTdT"


def _railway(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    exe = shutil.which("railway") or shutil.which("railway.exe")
    if not exe:
        raise SystemExit("Railway CLI not found")
    return subprocess.run(
        [exe, *args],
        cwd=ROOT,
        check=check,
        text=True,
        capture_output=True,
    )


def _dump_moodle_contexts() -> str:
    """Redeploy Moodle briefly to print SEED_MOODLE_CLASS_CONTEXTS, then disable hook."""
    print("Deploying Moodle context dump…")
    _railway(
        "variables",
        "-s",
        "moodle",
        "set",
        "--skip-deploys",
        "SEED_SCHOOL=0",
        "POST_CONFIGURE_COMMANDS=php /opt/edvidura-seed/dump_contexts.php",
        check=False,
    )
    up = subprocess.run(
        [
            shutil.which("railway") or "railway",
            "up",
            str(ROOT / "moodle"),
            "--path-as-root",
            "-s",
            "moodle",
            "--detach",
            "-y",
        ],
        cwd=ROOT,
        check=False,
        text=True,
    )
    if up.returncode != 0:
        raise SystemExit("Moodle redeploy failed")

    seed_line = ""
    for _ in range(48):
        time.sleep(10)
        logs = _railway("logs", "-s", "moodle", "--lines", "80", check=False)
        text = (logs.stdout or "") + (logs.stderr or "")
        m = re.search(r"SEED_MOODLE_CLASS_CONTEXTS=([^\s]+)", text)
        if m:
            seed_line = m.group(1).strip()
            print(f"  contexts: {seed_line[:120]}…")
            break
        if "fpm is running" in text and "SEED_MOODLE_CLASS_CONTEXTS=" not in text:
            # Image may be old; keep waiting for new deploy
            continue
    else:
        raise SystemExit("Could not read Moodle context map from logs")

    # Stop re-running dump on every restart
    _railway("variable", "delete", "POST_CONFIGURE_COMMANDS", "-s", "moodle", check=False)
    _railway(
        "variables",
        "-s",
        "moodle",
        "set",
        "--skip-deploys",
        "SEED_SCHOOL=0",
        check=False,
    )
    return seed_line


def main() -> int:
    os.chdir(ROOT)
    contexts = os.getenv("SEED_MOODLE_CLASS_CONTEXTS", "").strip()
    if not contexts:
        contexts = _dump_moodle_contexts()

    print("Pulling EdVidura DATABASE_URL via railway run…")
    # Export env for seed without printing secrets
    env = os.environ.copy()
    env["MOODLE_ISSUER"] = MOODLE_URL
    env["MOODLE_CLIENT_ID"] = CLIENT_ID
    env["MOODLE_DEPLOYMENT_IDS"] = "1"
    env["MOODLE_AUTH_LOGIN_URL"] = f"{MOODLE_URL}/mod/lti/auth.php"
    env["MOODLE_AUTH_TOKEN_URL"] = f"{MOODLE_URL}/mod/lti/token.php"
    env["MOODLE_KEY_SET_URL"] = f"{MOODLE_URL}/mod/lti/certs.php"
    env["SEED_MOODLE_CLASS_CONTEXTS"] = contexts
    env["APP_BASE_URL"] = APP_URL

    # Inject DATABASE_URL from Railway into the child process
    proc = subprocess.run(
        [
            shutil.which("railway") or "railway",
            "run",
            "-s",
            "edvidura-app",
            "--",
            sys.executable,
            str(ROOT / "scripts" / "reset_seed_single_school.py"),
        ],
        cwd=ROOT,
        env=env,
        check=False,
        text=True,
    )
    # railway run merges service env; our MOODLE_* must be passed through.
    # railway run may override with service vars — set them on the service too.
    if proc.returncode != 0:
        print(proc.stdout or "")
        print(proc.stderr or "", file=sys.stderr)
        print("Retrying with explicit env prefix via railway run…")
        # Write a tiny wrapper that loads MOODLE_* from a file
        wrapper = ROOT / "scripts" / "_seed_presentation_once.py"
        wrapper.write_text(
            f"""
import os, runpy
os.environ["MOODLE_ISSUER"] = {MOODLE_URL!r}
os.environ["MOODLE_CLIENT_ID"] = {CLIENT_ID!r}
os.environ["MOODLE_DEPLOYMENT_IDS"] = "1"
os.environ["MOODLE_AUTH_LOGIN_URL"] = {MOODLE_URL + "/mod/lti/auth.php"!r}
os.environ["MOODLE_AUTH_TOKEN_URL"] = {MOODLE_URL + "/mod/lti/token.php"!r}
os.environ["MOODLE_KEY_SET_URL"] = {MOODLE_URL + "/mod/lti/certs.php"!r}
os.environ["SEED_MOODLE_CLASS_CONTEXTS"] = {contexts!r}
os.environ["APP_BASE_URL"] = {APP_URL!r}
runpy.run_path({str(ROOT / "scripts" / "reset_seed_single_school.py")!r}, run_name="__main__")
""",
            encoding="utf-8",
        )
        proc = subprocess.run(
            [
                shutil.which("railway") or "railway",
                "run",
                "-s",
                "edvidura-app",
                "--",
                sys.executable,
                str(wrapper),
            ],
            cwd=ROOT,
            check=False,
            text=True,
        )
        try:
            wrapper.unlink()
        except OSError:
            pass

    print(proc.stdout or "")
    if proc.returncode != 0:
        print(proc.stderr or "", file=sys.stderr)
        return proc.returncode

    print()
    print("Presentation seed ready.")
    print(f"  Moodle:  {MOODLE_URL}/login/index.php")
    print(f"  App:     {APP_URL}")
    print("  Logins:  admin / Admin@12345")
    print("           riverside_priya / Demo@12345  (Class 8 teacher)")
    print("           riverside_alice / Demo@12345  (Class 8 student)")
    print("           riverside_admin / Demo@12345  (principal → school admin)")
    print("  Demo:    Class 8 · Algebra I → Open EdVidura")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
