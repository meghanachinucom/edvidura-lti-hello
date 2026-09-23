"""Create Yet LRS + Metabase on Railway from public images and wire edvidura-app.

  python scripts/deploy_yet_metabase_railway.py
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = "edvidura-app"
YET = "yet-lrs"
META = "metabase"

YET_KEY = "edvidura_key"
YET_SECRET = "edvidura_secret"
YET_ADMIN_USER = "edvidura_admin"
YET_ADMIN_PASS = "EdViduraAdmin1!"


def railway() -> str:
    cmd = shutil.which("railway") or shutil.which("railway.cmd")
    if not cmd:
        raise SystemExit("railway CLI not on PATH")
    return cmd


def run(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [railway(), *args],
        cwd=str(ROOT),
        check=check,
        text=True,
        capture_output=True,
    )


def status_text() -> str:
    p = run(["status"], check=False)
    return (p.stdout or "") + (p.stderr or "")


def has_service(name: str) -> bool:
    t = status_text()
    return f"{name}:" in t or f"- {name}" in t


def ensure_image_service(name: str, image: str, variables: list[str]) -> None:
    if has_service(name):
        print(f"  {name}: exists — updating vars")
        if variables:
            p = run(
                ["variable", "set", "-s", name, "--skip-deploys", *variables],
                check=False,
            )
            if p.returncode != 0:
                print(p.stderr or p.stdout)
        return
    print(f"  {name}: creating from {image}")
    args = ["add", "--image", image, "--service", name, "--json"]
    for v in variables:
        args.extend(["--variables", v])
    p = run(args, check=False)
    print(p.stdout or "")
    if p.returncode != 0:
        print(p.stderr or "")
        raise SystemExit(f"failed to create {name}")


def find_or_create_domain(service: str) -> str | None:
    p = run(["domain", "-s", service], check=False)
    text = (p.stdout or "") + (p.stderr or "")
    m = re.search(r"https://[a-zA-Z0-9.-]+\.up\.railway\.app", text)
    if m:
        return m.group(0).rstrip("/")
    m = re.search(r"([a-zA-Z0-9.-]+\.up\.railway\.app)", text)
    if m:
        return "https://" + m.group(1)
    # generate
    p2 = run(["domain", "generate", "-s", service], check=False)
    text2 = (p2.stdout or "") + (p2.stderr or "") + text
    m2 = re.search(r"https://[a-zA-Z0-9.-]+\.up\.railway\.app", text2)
    if m2:
        return m2.group(0).rstrip("/")
    m3 = re.search(r"([a-zA-Z0-9.-]+\.up\.railway\.app)", text2)
    if m3:
        return "https://" + m3.group(1)
    print(f"  domain for {service}: {text2[:400]}")
    return None


def main() -> int:
    print("Deploy Yet Analytics LRS + Metabase on Railway")

    ensure_image_service(
        YET,
        "yetanalytics/lrsql:latest",
        [
            f"LRSQL_API_KEY_DEFAULT={YET_KEY}",
            f"LRSQL_API_SECRET_DEFAULT={YET_SECRET}",
            f"LRSQL_ADMIN_USER_DEFAULT={YET_ADMIN_USER}",
            f"LRSQL_ADMIN_PASS_DEFAULT={YET_ADMIN_PASS}",
            "LRSQL_DB_NAME=/tmp/lrsql.sqlite.db",
            "LRSQL_ALLOW_ALL_ORIGINS=true",
            "PORT=8080",
        ],
    )
    ensure_image_service(
        META,
        "metabase/metabase:v0.52.14",
        [
            "JAVA_TIMEZONE=UTC",
            "MB_JETTY_PORT=3000",
            "PORT=3000",
        ],
    )

    print("Public domains…")
    yet_url = find_or_create_domain(YET)
    meta_url = find_or_create_domain(META)
    print(f"  Yet:      {yet_url or 'PENDING'}")
    print(f"  Metabase: {meta_url or 'PENDING'}")

    app_vars = [
        "XAPI_LRS_PROVIDER=yet",
        f"XAPI_LRS_KEY={YET_KEY}",
        f"XAPI_LRS_SECRET={YET_SECRET}",
    ]
    if yet_url:
        app_vars.append(f"XAPI_LRS_ENDPOINT={yet_url}/xapi")
    if meta_url:
        app_vars.append(f"METABASE_URL={meta_url}")

    print(f"Wiring {APP}…")
    p = run(["variable", "set", "-s", APP, "--skip-deploys", *app_vars], check=False)
    if p.returncode != 0:
        print(p.stderr or p.stdout)
        return 1

    example = ROOT / "keys" / "yet-metabase-railway.env.example"
    example.parent.mkdir(parents=True, exist_ok=True)
    example.write_text(
        "\n".join(
            [
                f"XAPI_LRS_PROVIDER=yet",
                f"XAPI_LRS_ENDPOINT={(yet_url or 'https://yet-lrs.up.railway.app')}/xapi",
                f"XAPI_LRS_KEY={YET_KEY}",
                f"XAPI_LRS_SECRET={YET_SECRET}",
                f"METABASE_URL={meta_url or 'https://metabase.up.railway.app'}",
                "METABASE_SECRET_KEY=",
                "METABASE_EMBED_DASHBOARD_ID=0",
                f"# Yet admin: {(yet_url or '')}/admin ({YET_ADMIN_USER} / {YET_ADMIN_PASS})",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(f"Wrote {example.relative_to(ROOT)}")
    print("Redeploy: railway up -s edvidura-app --detach")
    print("Then Metabase → Admin → Embedding → set METABASE_SECRET_KEY + dashboard id on app.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
