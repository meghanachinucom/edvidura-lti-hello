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

    # Ensure schema is synced so native SQL against bi_* views works
    print("Syncing schema…")
    client.post(f"/api/database/{edvidura_db_id}/sync_schema", headers=headers)
    time.sleep(2)

    print("Building owner-readable dashboard…")
    dash_id = ensure_owner_dashboard(client, headers, edvidura_db_id)
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

    skip_deploy = os.getenv("METABASE_SKIP_APP_DEPLOY", "").strip() in {
        "1",
        "true",
        "yes",
    }
    if skip_deploy:
        print("Skipping app redeploy (METABASE_SKIP_APP_DEPLOY=1)")
    else:
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
    print("  Open /ops/dashboard after app picks up METABASE_EMBED_DASHBOARD_ID")
    return 0


DASHBOARD_NAME = "EdVidura owner overview"

# Readable xAPI verbs (matches app/modules/xapi/activity.py labels)
_VERB_LABEL_CASE = """
    CASE verb_id
        WHEN 'http://adlnet.gov/expapi/verbs/completed' THEN 'Lesson completed'
        WHEN 'http://adlnet.gov/expapi/verbs/attempted' THEN 'Quiz attempted'
        WHEN 'http://adlnet.gov/expapi/verbs/passed' THEN 'Quiz passed'
        WHEN 'http://adlnet.gov/expapi/verbs/failed' THEN 'Quiz not passed'
        WHEN 'http://adlnet.gov/expapi/verbs/experienced' THEN 'Opened content'
        WHEN 'http://adlnet.gov/expapi/verbs/mastered' THEN 'Skill mastered'
        WHEN 'http://adlnet.gov/expapi/verbs/interacted' THEN 'Ask Vidura / coach'
        ELSE COALESCE(NULLIF(split_part(verb_id, '/', -1), ''), 'Other')
    END
"""


def _list_cards(client: httpx.Client, headers: dict[str, str]) -> list[dict]:
    r = client.get("/api/card", headers=headers)
    if r.status_code >= 400:
        return []
    data = r.json()
    return data if isinstance(data, list) else data.get("data") or []


def _list_dashboards(client: httpx.Client, headers: dict[str, str]) -> list[dict]:
    r = client.get("/api/dashboard", headers=headers)
    if r.status_code >= 400:
        return []
    data = r.json()
    return data if isinstance(data, list) else data.get("data") or []


def upsert_native_card(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    db_id: int,
    name: str,
    sql: str,
    display: str,
    viz: dict | None = None,
    description: str = "",
) -> int:
    """Create or update a native-SQL card by exact name."""
    body = {
        "name": name,
        "description": description,
        "display": display,
        "visualization_settings": viz or {},
        "dataset_query": {
            "database": db_id,
            "type": "native",
            "native": {"query": sql.strip(), "template-tags": {}},
        },
    }
    existing = None
    for c in _list_cards(client, headers):
        if str(c.get("name") or "") == name and not c.get("archived"):
            existing = c
            break
    if existing:
        cid = int(existing["id"])
        ur = client.put(f"/api/card/{cid}", headers=headers, json={**body, "id": cid})
        if ur.status_code >= 400:
            raise SystemExit(
                f"update card {name!r} failed: {ur.status_code} {ur.text[:300]}"
            )
        print(f"  updated card {name!r} id={cid}")
        return cid
    cr = client.post("/api/card", headers=headers, json=body)
    if cr.status_code >= 400:
        raise SystemExit(
            f"create card {name!r} failed: {cr.status_code} {cr.text[:300]}"
        )
    cid = int(cr.json()["id"])
    print(f"  created card {name!r} id={cid}")
    return cid


def archive_stale_ev_cards(
    client: httpx.Client, headers: dict[str, str], keep_names: set[str]
) -> None:
    """Archive old EV-* cards not on the current dashboard."""
    for c in _list_cards(client, headers):
        name = str(c.get("name") or "")
        if not name.startswith("EV ") and not name.startswith("EV -"):
            continue
        if name in keep_names or c.get("archived"):
            continue
        cid = int(c["id"])
        client.put(f"/api/card/{cid}", headers=headers, json={"archived": True})
        print(f"  archived stale card {name!r} id={cid}")


def ensure_owner_dashboard(
    client: httpx.Client, headers: dict[str, str], db_id: int
) -> int:
    """Readable owner dashboard: KPIs, school table, trends, health (no mixed pies)."""
    verb_case = _VERB_LABEL_CASE.strip()
    specs: list[dict] = [
        {
            "name": "EV - Active schools",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*)::bigint AS "Active schools"
                FROM tenants WHERE status = 'active'
            """,
            "description": "Schools currently active on EdVidura",
            "row": 0,
            "col": 0,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Quiz attempts",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*)::bigint AS "Quiz attempts (all time)"
                FROM quiz_attempts
            """,
            "description": "Total quiz attempts across all schools",
            "row": 0,
            "col": 3,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Quiz learners",
            "display": "scalar",
            "sql": """
                SELECT COUNT(DISTINCT subject)::bigint AS "Learners who attempted"
                FROM quiz_attempts
            """,
            "description": "Distinct learners with at least one quiz attempt",
            "row": 0,
            "col": 6,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Avg quiz score %",
            "display": "scalar",
            "sql": """
                SELECT COALESCE(
                    ROUND(AVG(100.0 * score / NULLIF(max_score, 0)))::bigint,
                    0
                ) AS "Avg score"
                FROM quiz_attempts
                WHERE max_score > 0
            """,
            "description": "Average percent across all quiz attempts",
            "viz": {"scalar.suffix": "%"},
            "row": 0,
            "col": 9,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Pass rate %",
            "display": "scalar",
            "sql": """
                SELECT COALESCE(
                    ROUND(
                        100.0 * COUNT(*) FILTER (
                            WHERE max_score > 0 AND score::float / max_score >= 0.6
                        ) / NULLIF(COUNT(*) FILTER (WHERE max_score > 0), 0)
                    )::bigint,
                    0
                ) AS "Pass rate"
                FROM quiz_attempts
            """,
            "description": "Share of scored attempts at or above 60%",
            "viz": {"scalar.suffix": "%"},
            "row": 3,
            "col": 0,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Grades sent to Moodle",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*) FILTER (WHERE grade_sent)::bigint AS "Grades in Moodle"
                FROM quiz_attempts
            """,
            "description": "Quiz attempts with grade pushed via AGS",
            "row": 3,
            "col": 3,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Grades pending Moodle",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*) FILTER (WHERE NOT grade_sent)::bigint AS "Awaiting Moodle sync"
                FROM quiz_attempts
            """,
            "description": "Attempts not yet pushed to Moodle gradebook",
            "row": 3,
            "col": 6,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Quiz attempts (7 days)",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*)::bigint AS "Attempts this week"
                FROM quiz_attempts
                WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
            """,
            "description": "Quiz activity in the last 7 days — platform pulse",
            "row": 3,
            "col": 9,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Ask Vidura sessions",
            "display": "scalar",
            "sql": f"""
                SELECT COUNT(*)::bigint AS "Coach / Ask Vidura events"
                FROM xapi_statements
                WHERE verb_id = 'http://adlnet.gov/expapi/verbs/interacted'
            """,
            "description": "Study coach and Ask Vidura interactions recorded",
            "row": 6,
            "col": 0,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Lesson completions",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*)::bigint AS "Lesson completions"
                FROM lesson_progress
            """,
            "description": "Lesson completion marks stored in EdVidura",
            "row": 6,
            "col": 3,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Learning events",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*)::bigint AS "Learning events (xAPI)"
                FROM xapi_statements
            """,
            "description": "All learning events in EdVidura Postgres",
            "row": 6,
            "col": 6,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - LRS forward backlog",
            "display": "scalar",
            "sql": """
                SELECT COUNT(*)::bigint AS "Events not in Yet yet"
                FROM xapi_statements
                WHERE sent_to_lrs IS NOT TRUE
            """,
            "description": "Statements still to forward to Yet (0 is healthy)",
            "row": 6,
            "col": 9,
            "size_x": 3,
            "size_y": 3,
        },
        {
            "name": "EV - Schools at a glance",
            "display": "table",
            "sql": """
                SELECT
                    t.name AS "School",
                    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.tenant_id = t.id)
                        AS "Attempts",
                    (SELECT COUNT(DISTINCT subject) FROM quiz_attempts qa
                     WHERE qa.tenant_id = t.id) AS "Learners",
                    (SELECT COALESCE(
                        ROUND(
                            100.0 * COUNT(*) FILTER (
                                WHERE max_score > 0 AND score::float / max_score >= 0.6
                            ) / NULLIF(COUNT(*) FILTER (WHERE max_score > 0), 0)
                        )::int, 0)
                     FROM quiz_attempts qa WHERE qa.tenant_id = t.id) AS "Pass rate %",
                    (SELECT COALESCE(
                        ROUND(AVG(100.0 * score / NULLIF(max_score, 0)))::int, 0)
                     FROM quiz_attempts qa
                     WHERE qa.tenant_id = t.id AND max_score > 0) AS "Avg score %",
                    (SELECT COUNT(*) FILTER (WHERE NOT grade_sent)
                     FROM quiz_attempts qa WHERE qa.tenant_id = t.id)
                        AS "Grades pending",
                    (SELECT MAX(qa.created_at) FROM quiz_attempts qa
                     WHERE qa.tenant_id = t.id) AS "Last quiz activity"
                FROM tenants t
                WHERE t.status = 'active'
                ORDER BY "Attempts" DESC, t.name
            """,
            "description": "Compare schools side by side — sort by attempts or pass rate",
            "row": 9,
            "col": 0,
            "size_x": 12,
            "size_y": 6,
        },
        {
            "name": "EV - Daily quiz attempts",
            "display": "line",
            "sql": """
                SELECT
                    date_trunc('day', created_at)::date AS "Day",
                    COUNT(*)::bigint AS "Quiz attempts"
                FROM quiz_attempts
                WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days')
                GROUP BY 1
                ORDER BY 1
            """,
            "description": "Quiz volume per day — did students actually take quizzes?",
            "viz": {
                "graph.dimensions": ["Day"],
                "graph.metrics": ["Quiz attempts"],
                "graph.x_axis.title_text": "Day",
                "graph.y_axis.title_text": "Attempts",
            },
            "row": 15,
            "col": 0,
            "size_x": 6,
            "size_y": 5,
        },
        {
            "name": "EV - Daily learning activity",
            "display": "line",
            "sql": """
                SELECT
                    date_trunc('day', created_at)::date AS "Day",
                    COUNT(*)::bigint AS "All learning events"
                FROM xapi_statements
                WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days')
                GROUP BY 1
                ORDER BY 1
            """,
            "description": "Lessons, quizzes, coach — all xAPI events per day",
            "viz": {
                "graph.dimensions": ["Day"],
                "graph.metrics": ["All learning events"],
                "graph.x_axis.title_text": "Day",
                "graph.y_axis.title_text": "Events",
            },
            "row": 15,
            "col": 6,
            "size_x": 6,
            "size_y": 5,
        },
        {
            "name": "EV - Score bands",
            "display": "bar",
            "sql": """
                SELECT band AS "Score band", COUNT(*)::bigint AS "Attempts"
                FROM (
                    SELECT CASE
                        WHEN max_score <= 0 THEN 'Unscored'
                        WHEN 100.0 * score / max_score < 40 THEN 'Under 40%'
                        WHEN 100.0 * score / max_score < 60 THEN '40–59%'
                        WHEN 100.0 * score / max_score < 80 THEN '60–79%'
                        ELSE '80% and above'
                    END AS band,
                    CASE
                        WHEN max_score <= 0 THEN 0
                        WHEN 100.0 * score / max_score < 40 THEN 1
                        WHEN 100.0 * score / max_score < 60 THEN 2
                        WHEN 100.0 * score / max_score < 80 THEN 3
                        ELSE 4
                    END AS ord
                    FROM quiz_attempts
                ) s
                GROUP BY band, ord
                ORDER BY ord
            """,
            "description": "How scores cluster — not a pie of unrelated KPIs",
            "viz": {
                "graph.dimensions": ["Score band"],
                "graph.metrics": ["Attempts"],
            },
            "row": 20,
            "col": 0,
            "size_x": 6,
            "size_y": 5,
        },
        {
            "name": "EV - What learners did",
            "display": "bar",
            "sql": f"""
                SELECT
                    {verb_case} AS "Activity type",
                    COUNT(*)::bigint AS "Count"
                FROM xapi_statements
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 10
            """,
            "description": "Human-readable event types (not raw xAPI URLs)",
            "viz": {
                "graph.dimensions": ["Activity type"],
                "graph.metrics": ["Count"],
            },
            "row": 20,
            "col": 6,
            "size_x": 6,
            "size_y": 5,
        },
        {
            "name": "EV - Attempts by school",
            "display": "row",
            "sql": """
                SELECT
                    COALESCE(t.name, t.slug) AS "School",
                    COUNT(*)::bigint AS "Attempts"
                FROM quiz_attempts qa
                JOIN tenants t ON t.id = qa.tenant_id
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 10
            """,
            "description": "Which schools drive the most quiz volume",
            "viz": {
                "graph.dimensions": ["School"],
                "graph.metrics": ["Attempts"],
            },
            "row": 25,
            "col": 0,
            "size_x": 6,
            "size_y": 5,
        },
        {
            "name": "EV - Top courses by attempts",
            "display": "row",
            "sql": """
                SELECT
                    COALESCE(NULLIF(course_label, ''), '(no course label)') AS "Course",
                    COUNT(*)::bigint AS "Attempts"
                FROM quiz_attempts
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 10
            """,
            "description": "Most attempted Moodle / class labels",
            "viz": {
                "graph.dimensions": ["Course"],
                "graph.metrics": ["Attempts"],
            },
            "row": 25,
            "col": 6,
            "size_x": 6,
            "size_y": 5,
        },
        {
            "name": "EV - Schools quiet this week",
            "display": "table",
            "sql": """
                SELECT
                    t.name AS "School",
                    (SELECT MAX(qa.created_at) FROM quiz_attempts qa
                     WHERE qa.tenant_id = t.id) AS "Last quiz ever",
                    (SELECT COUNT(*) FROM quiz_attempts qa
                     WHERE qa.tenant_id = t.id) AS "Attempts (all time)"
                FROM tenants t
                WHERE t.status = 'active'
                  AND NOT EXISTS (
                    SELECT 1 FROM quiz_attempts qa
                    WHERE qa.tenant_id = t.id
                      AND qa.created_at >= (CURRENT_DATE - INTERVAL '7 days')
                  )
                ORDER BY "Last quiz ever" NULLS FIRST, t.name
            """,
            "description": "Active schools with no quiz attempts in the last 7 days",
            "row": 30,
            "col": 0,
            "size_x": 12,
            "size_y": 4,
        },
        {
            "name": "EV - Recent quiz attempts",
            "display": "table",
            "sql": """
                SELECT
                    qa.created_at AS "When",
                    t.name AS "School",
                    COALESCE(NULLIF(qa.learner_name, ''), qa.subject) AS "Learner",
                    COALESCE(qa.course_label, '—') AS "Course",
                    CASE
                        WHEN qa.max_score > 0
                        THEN ROUND(100.0 * qa.score / qa.max_score)::int
                        ELSE NULL
                    END AS "Score %",
                    CASE
                        WHEN qa.max_score > 0 AND qa.score::float / qa.max_score >= 0.6
                        THEN 'Passed' ELSE 'Below 60%'
                    END AS "Result",
                    CASE WHEN qa.grade_sent THEN 'In Moodle' ELSE 'Pending' END AS "Grade sync"
                FROM quiz_attempts qa
                JOIN tenants t ON t.id = qa.tenant_id
                ORDER BY qa.created_at DESC
                LIMIT 50
            """,
            "description": "Latest attempts with plain pass / sync labels",
            "row": 34,
            "col": 0,
            "size_x": 12,
            "size_y": 7,
        },
    ]

    keep_names = {str(s["name"]) for s in specs}
    archive_stale_ev_cards(client, headers, keep_names)

    dash_cards: list[dict] = []
    for i, spec in enumerate(specs):
        cid = upsert_native_card(
            client,
            headers,
            db_id=db_id,
            name=spec["name"],
            sql=spec["sql"],
            display=spec["display"],
            viz=spec.get("viz"),
            description=str(spec.get("description") or ""),
        )
        dash_cards.append(
            {
                "id": -(i + 1),
                "card_id": cid,
                "row": spec["row"],
                "col": spec["col"],
                "size_x": spec["size_x"],
                "size_y": spec["size_y"],
                "parameter_mappings": [],
            }
        )

    dash_id = None
    for d in _list_dashboards(client, headers):
        if str(d.get("name") or "") == DASHBOARD_NAME and not d.get("archived"):
            dash_id = int(d["id"])
            break
    if dash_id is None:
        # Prefer upgrading the legacy single-card dashboard if present
        for d in _list_dashboards(client, headers):
            if str(d.get("name") or "") == "EdVidura overview" and not d.get("archived"):
                dash_id = int(d["id"])
                client.put(
                    f"/api/dashboard/{dash_id}",
                    headers=headers,
                    json={"name": DASHBOARD_NAME},
                )
                print(f"  renamed legacy dashboard id={dash_id}")
                break
    if dash_id is None:
        dash_r = client.post(
            "/api/dashboard",
            headers=headers,
            json={
                "name": DASHBOARD_NAME,
                "description": (
                    "Owner KPIs: schools, quizzes, coach usage, Moodle sync, trends. "
                    "One metric per number card; tables for detail."
                ),
                "parameters": [],
            },
        )
        if dash_r.status_code >= 400:
            raise SystemExit(
                f"create dashboard failed: {dash_r.status_code} {dash_r.text[:300]}"
            )
        dash_id = int(dash_r.json()["id"])
        print(f"  created dashboard id={dash_id}")
    else:
        print(f"  using dashboard id={dash_id}")

    # Replace dashboard cards (Metabase 0.49+ uses PUT /api/dashboard/:id/cards)
    put_cards = client.put(
        f"/api/dashboard/{dash_id}/cards",
        headers=headers,
        json={"cards": dash_cards},
    )
    if put_cards.status_code >= 400:
        # Metabase 0.52+ sometimes wants /api/dashboard/:id with dashcards
        alt = client.put(
            f"/api/dashboard/{dash_id}",
            headers=headers,
            json={
                "name": DASHBOARD_NAME,
                "enable_embedding": True,
                "embedding_params": {},
                "dashcards": [
                    {
                        "id": dc["id"],
                        "card_id": dc["card_id"],
                        "row": dc["row"],
                        "col": dc["col"],
                        "size_x": dc["size_x"],
                        "size_y": dc["size_y"],
                        "parameter_mappings": [],
                    }
                    for dc in dash_cards
                ],
            },
        )
        if alt.status_code >= 400:
            raise SystemExit(
                f"set dashboard cards failed: {put_cards.status_code} "
                f"{put_cards.text[:200]} / {alt.status_code} {alt.text[:200]}"
            )
        print("  dashboard cards set via dashboard PUT")
    else:
        print(f"  dashboard cards set ({len(dash_cards)})")

    en = client.put(
        f"/api/dashboard/{dash_id}",
        headers=headers,
        json={
            "name": DASHBOARD_NAME,
            "enable_embedding": True,
            "embedding_params": {},
        },
    )
    if en.status_code >= 400:
        print(f"  warn enable dashboard embed: {en.status_code} {en.text[:200]}")

    return dash_id


if __name__ == "__main__":
    sys.exit(main())
