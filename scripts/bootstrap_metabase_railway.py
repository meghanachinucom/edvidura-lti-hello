"""Bootstrap Metabase on Railway: admin, Postgres source, dashboard, embedding.

Does not print secrets. Sets METABASE_SECRET_KEY + METABASE_EMBED_DASHBOARD_ID
on edvidura-app when successful.

  python scripts/bootstrap_metabase_railway.py
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse, unquote

import httpx

ROOT = Path(__file__).resolve().parents[1]
META_URL = os.getenv(
    "METABASE_URL", "https://metabase-production-4a03.up.railway.app"
).rstrip("/")
APP = "edvidura-app"
ADMIN_EMAIL = os.getenv("METABASE_ADMIN_EMAIL", "admin@edvidura.local")
ADMIN_PASS = os.getenv("METABASE_ADMIN_PASSWORD", "EdViduraMeta1!")
SITE_NAME = "EdVidura"


def railway() -> str:
    cmd = shutil.which("railway") or shutil.which("railway.cmd")
    if not cmd:
        raise SystemExit("railway CLI not on PATH")
    return cmd


def railway_var(service: str, key: str) -> str:
    """Fetch one Railway variable value without echoing it."""
    p = subprocess.run(
        [railway(), "variable", "list", "-s", service, "--json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if p.returncode != 0:
        raise SystemExit(f"railway variable list failed: {p.stderr[:200]}")
    data = json.loads(p.stdout or "{}")
    # shapes vary: dict of vars, or list of {name,value}
    if isinstance(data, dict):
        # sometimes {"variables": {...}} or flat
        if key in data:
            return str(data[key] or "")
        vars_ = data.get("variables") or data.get("Variables") or {}
        if isinstance(vars_, dict) and key in vars_:
            return str(vars_[key] or "")
        for item in data.get("serviceVariables") or data.get("sharedVariables") or []:
            if isinstance(item, dict) and item.get("name") == key:
                return str(item.get("value") or "")
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("name") == key:
                return str(item.get("value") or item.get("valueString") or "")
    raise SystemExit(f"{key} not found on {service}")


def parse_database_url(url: str) -> dict[str, str | int]:
    u = urlparse(url)
    if u.scheme not in {"postgres", "postgresql"}:
        raise SystemExit(f"unexpected DATABASE_URL scheme: {u.scheme}")
    host = u.hostname or ""
    # Prefer public proxy host for Metabase (separate service)
    port = u.port or 5432
    user = unquote(u.username or "")
    password = unquote(u.password or "")
    db = (u.path or "/").lstrip("/") or "railway"
    return {
        "host": host,
        "port": int(port),
        "user": user,
        "password": password,
        "dbname": db,
    }


def main() -> int:
    client = httpx.Client(base_url=META_URL, timeout=60.0, follow_redirects=True)
    print(f"Metabase: {META_URL}")

    props = client.get("/api/session/properties").json()
    has_setup = bool(props.get("has-user-setup"))
    setup_token = props.get("setup-token")
    print(f"has-user-setup={has_setup}")

    session_id: str | None = None

    if not has_setup:
        if not setup_token:
            raise SystemExit("No setup-token; cannot bootstrap")
        print("Running /api/setup…")
        body = {
            "token": setup_token,
            "user": {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASS,
                "first_name": "EdVidura",
                "last_name": "Admin",
                "site_name": SITE_NAME,
            },
            "prefs": {
                "site_name": SITE_NAME,
                "site_locale": "en",
                "allow_tracking": False,
            },
        }
        r = client.post("/api/setup", json=body)
        if r.status_code >= 400:
            raise SystemExit(f"setup failed {r.status_code}: {r.text[:300]}")
        # setup may return session id in body or Set-Cookie
        try:
            session_id = r.json().get("id")
        except Exception:
            session_id = None
        if not session_id:
            # login
            lr = client.post(
                "/api/session",
                json={"username": ADMIN_EMAIL, "password": ADMIN_PASS},
            )
            lr.raise_for_status()
            session_id = lr.json()["id"]
        print("Admin created")
    else:
        print("Already set up — logging in…")
        lr = client.post(
            "/api/session",
            json={"username": ADMIN_EMAIL, "password": ADMIN_PASS},
        )
        if lr.status_code >= 400:
            # try alternate password from env only
            raise SystemExit(
                "Login failed. Set METABASE_ADMIN_EMAIL / METABASE_ADMIN_PASSWORD "
                "to the existing admin, then re-run."
            )
        session_id = lr.json()["id"]

    assert session_id
    headers = {"X-Metabase-Session": session_id}

    # Enable embedding
    print("Enabling embedding…")
    # Get current settings
    emb = client.get("/api/setting/enable-embedding", headers=headers)
    # Put enable-embedding true
    for path, value in [
        ("/api/setting/enable-embedding", True),
        ("/api/setting/enable-embedding-static", True),
    ]:
        pr = client.put(path, headers=headers, json={"value": value})
        # older metabase uses different keys — ignore 404
        if pr.status_code not in {200, 204, 404}:
            print(f"  warn {path} -> {pr.status_code}")

    # Embedding secret
    secret_r = client.get("/api/setting/embedding-secret-key", headers=headers)
    secret = ""
    if secret_r.status_code == 200:
        try:
            secret = secret_r.json()
            if isinstance(secret, dict):
                secret = str(secret.get("value") or "")
            else:
                secret = str(secret or "")
        except Exception:
            secret = (secret_r.text or "").strip().strip('"')
    if not secret or secret in {"null", "None"}:
        # generate
        import secrets as pysecrets

        secret = pysecrets.token_urlsafe(32)
        put = client.put(
            "/api/setting/embedding-secret-key",
            headers=headers,
            json={"value": secret},
        )
        if put.status_code not in {200, 204}:
            raise SystemExit(f"set embedding secret failed: {put.status_code} {put.text[:200]}")
        print("Embedding secret generated")
    else:
        print("Embedding secret present")

    # Add Postgres database from edvidura-app DATABASE_URL
    print("Resolving EdVidura DATABASE_URL…")
    db_url = railway_var(APP, "DATABASE_URL")
    # Railway may inject template refs — try Postgres service if empty/template
    if not db_url or "${{" in db_url:
        # try common service names
        for svc in ("Postgres-U4Ak", "Postgres", "Postgres-PA_L"):
            try:
                db_url = railway_var(svc, "DATABASE_URL")
                if db_url and "${{" not in db_url:
                    print(f"  using DATABASE_URL from {svc}")
                    break
            except SystemExit:
                continue
    if not db_url or "${{" in db_url:
        raise SystemExit("Could not resolve concrete DATABASE_URL")

    info = parse_database_url(db_url)
    # List existing DBs
    dbs = client.get("/api/database", headers=headers).json()
    data_list = dbs if isinstance(dbs, list) else dbs.get("data") or []
    edvidura_db_id = None
    for d in data_list:
        if str(d.get("name", "")).lower().startswith("edvidura"):
            edvidura_db_id = d["id"]
            break

    if edvidura_db_id is None:
        print("Adding EdVidura Postgres database…")
        payload = {
            "engine": "postgres",
            "name": "EdVidura",
            "details": {
                "host": info["host"],
                "port": info["port"],
                "dbname": info["dbname"],
                "user": info["user"],
                "password": info["password"],
                "ssl": True,
                "ssl-mode": "require",
                "tunnel-enabled": False,
            },
            "is_full_sync": True,
            "is_on_demand": False,
        }
        cr = client.post("/api/database", headers=headers, json=payload)
        if cr.status_code >= 400:
            # retry without ssl-mode for some hosts
            payload["details"]["ssl"] = True
            cr = client.post("/api/database", headers=headers, json=payload)
        if cr.status_code >= 400:
            raise SystemExit(f"add database failed: {cr.status_code} {cr.text[:400]}")
        edvidura_db_id = cr.json()["id"]
        # sync schema
        client.post(f"/api/database/{edvidura_db_id}/sync_schema", headers=headers)
        time.sleep(3)
    else:
        print(f"EdVidura DB already id={edvidura_db_id}")

    # Find a table for a simple question — prefer bi_tenant_kpis or quiz_attempts / xapi_statements
    print("Looking up fields…")
    # wait briefly for sync
    table_id = None
    field_id = None
    table_name = None
    for _ in range(8):
        meta = client.get(
            f"/api/database/{edvidura_db_id}/metadata", headers=headers
        ).json()
        tables = meta.get("tables") or []
        prefer = (
            "bi_tenant_kpis",
            "bi_xapi_daily",
            "bi_xapi_statements",
            "xapi_statements",
            "quiz_attempts",
            "tenants",
        )
        by_name = {str(t.get("name")): t for t in tables}
        for name in prefer:
            if name in by_name:
                table_id = by_name[name]["id"]
                table_name = name
                fields = by_name[name].get("fields") or []
                # pick first numeric/PK-ish field
                for f in fields:
                    if f.get("name") in {"id", "attempt_count", "xapi_count", "statement_count"}:
                        field_id = f["id"]
                        break
                if not field_id and fields:
                    field_id = fields[0]["id"]
                break
        if table_id and field_id:
            break
        client.post(f"/api/database/{edvidura_db_id}/sync_schema", headers=headers)
        time.sleep(2)

    if not table_id:
        raise SystemExit("No usable tables found after sync — apply migrations first")

    print(f"Using table {table_name} id={table_id}")

    # Create a count card
    card_body = {
        "name": "EdVidura activity",
        "dataset_query": {
            "database": edvidura_db_id,
            "type": "query",
            "query": {
                "source-table": table_id,
                "aggregation": [["count"]],
            },
        },
        "display": "scalar",
        "visualization_settings": {},
    }
    card_r = client.post("/api/card", headers=headers, json=card_body)
    if card_r.status_code >= 400:
        raise SystemExit(f"create card failed: {card_r.status_code} {card_r.text[:300]}")
    card_id = card_r.json()["id"]

    # Create dashboard
    dash_r = client.post(
        "/api/dashboard",
        headers=headers,
        json={"name": "EdVidura overview", "parameters": []},
    )
    if dash_r.status_code >= 400:
        raise SystemExit(f"create dashboard failed: {dash_r.status_code} {dash_r.text[:300]}")
    dash_id = dash_r.json()["id"]

    # Add card to dashboard
    put_cards = client.put(
        f"/api/dashboard/{dash_id}/cards",
        headers=headers,
        json={
            "cards": [
                {
                    "id": -1,
                    "card_id": card_id,
                    "row": 0,
                    "col": 0,
                    "size_x": 6,
                    "size_y": 4,
                    "parameter_mappings": [],
                }
            ]
        },
    )
    # Metabase API evolved — try alternate
    if put_cards.status_code >= 400:
        alt = client.post(
            f"/api/dashboard/{dash_id}/cards",
            headers=headers,
            json={
                "cardId": card_id,
                "row": 0,
                "col": 0,
                "size_x": 6,
                "size_y": 4,
            },
        )
        if alt.status_code >= 400:
            print(f"  warn add card to dashboard: {put_cards.status_code}/{alt.status_code}")

    # Enable embedding on dashboard
    en = client.put(
        f"/api/dashboard/{dash_id}",
        headers=headers,
        json={
            "enable_embedding": True,
            "embedding_params": {},
        },
    )
    if en.status_code >= 400:
        print(f"  warn enable dashboard embed: {en.status_code} {en.text[:200]}")

    print(f"Dashboard id={dash_id}")

    # Wire edvidura-app (no print of secret)
    print("Setting edvidura-app Metabase embed vars…")
    p = subprocess.run(
        [
            railway(),
            "variable",
            "set",
            "-s",
            APP,
            "--skip-deploys",
            f"METABASE_URL={META_URL}",
            f"METABASE_SECRET_KEY={secret}",
            f"METABASE_EMBED_DASHBOARD_ID={dash_id}",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if p.returncode != 0:
        raise SystemExit(f"railway variable set failed: {p.stderr[:300]}")

    # Redeploy app
    print("Redeploying edvidura-app…")
    p2 = subprocess.run(
        [railway(), "up", "-s", APP, "--detach"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if p2.returncode != 0:
        print(p2.stderr[:400])
        print("Variable set OK — run: railway up -s edvidura-app --detach")
    else:
        print("Deploy started")

    print("DONE")
    print(f"  Metabase admin: {ADMIN_EMAIL}")
    print(f"  Dashboard id: {dash_id}")
    print("  embed_ready will be true after app deploy finishes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
