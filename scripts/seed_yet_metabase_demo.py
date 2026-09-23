"""Seed demo learning data for Metabase (Postgres bi_*) and Yet LRS.

Typical local run (SSH tunnel to Railway Postgres):

  railway connect Postgres-PA_L --tunnel-only -P 15432
  # then in another shell:
  set DATABASE_URL=postgresql://postgres:…@127.0.0.1:15432/railway?sslmode=disable
  set XAPI_LRS_ENDPOINT=https://yet-lrs-production.up.railway.app/xapi
  set XAPI_LRS_KEY=…
  set XAPI_LRS_SECRET=…
  set XAPI_LRS_PROVIDER=yet
  set APP_BASE_URL=https://edvidura-app-production.up.railway.app
  python scripts/seed_yet_metabase_demo.py

Safe to re-run. Does not print secrets.
"""
from __future__ import annotations

import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _normalize_database_url() -> None:
    """Local SSH tunnels often need sslmode=disable; keep existing query if set."""
    raw = (os.getenv("DATABASE_URL") or "").strip()
    if not raw:
        return
    parsed = urlparse(raw)
    host = (parsed.hostname or "").lower()
    if host not in {"127.0.0.1", "localhost"}:
        return
    qs = parse_qs(parsed.query)
    if "sslmode" not in qs:
        qs["sslmode"] = ["disable"]
        new_query = urlencode({k: v[0] for k, v in qs.items()})
        os.environ["DATABASE_URL"] = urlunparse(parsed._replace(query=new_query))


_normalize_database_url()

from app import db  # noqa: E402
from app.modules.xapi import (  # noqa: E402
    record_coach_interaction,
    record_lesson_completed,
    record_quiz_attempt,
    retry_failed_lrs,
)
from app.modules.xapi.lrs_client import post_statement, probe_lrs  # noqa: E402
from app.settings import get_settings  # noqa: E402

DEMO_LEARNERS = [
    ("stu-alice", "Alice Nguyen"),
    ("stu-bob", "Bob Okonkwo"),
    ("stu-carol", "Carol Singh"),
    ("demo-learner-04", "Dev Patel"),
    ("demo-learner-05", "Elena Rossi"),
    ("demo-learner-06", "Farah Khan"),
    ("demo-learner-07", "Gabe Mensah"),
    ("demo-learner-08", "Hana Suzuki"),
]


def _tenant_id() -> str:
    override = (os.getenv("DEMO_TENANT_ID") or "").strip()
    if override:
        return override
    for slug in ("riverside", "tenant-a"):
        row = db.get_tenant_by_slug(slug)
        if row:
            return str(row["id"])
    tenants = db.list_tenants()
    active = [t for t in tenants if str(t.get("status") or "") == "active"]
    if not active and not tenants:
        raise SystemExit("No tenant found — seed Riverside first")
    pick = active[0] if active else tenants[0]
    return str(pick["id"])


def _ensure_quiz_attempts(tenant_id: str) -> list[dict]:
    """Return existing attempts; if thin, insert a demo batch in one transaction."""
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id::text AS id, subject, learner_name, course_label,
                   score, max_score, created_at
            FROM quiz_attempts
            ORDER BY created_at DESC
            LIMIT 80
            """
        ).fetchall()
        existing = [dict(r) for r in rows]
        if len(existing) >= 20:
            return existing

        print(f"  quiz_attempts thin ({len(existing)}) — inserting demo batch…")
        now = datetime.now(timezone.utc)
        for i, (subject, name) in enumerate(DEMO_LEARNERS):
            for day_back in (0, 1, 3, 7):
                score = (i + day_back) % 4
                max_score = 3
                if score > max_score:
                    score = max_score
                created = now - timedelta(days=day_back, hours=i)
                conn.execute(
                    """
                    INSERT INTO quiz_attempts (
                        tenant_id, subject, learner_name, course_label,
                        score, max_score, answers, grade_sent, created_at
                    )
                    VALUES (
                        %s::uuid, %s, %s, %s, %s, %s, %s::jsonb, %s, %s
                    )
                    """,
                    (
                        tenant_id,
                        subject,
                        name,
                        "Class 8 · Algebra demo",
                        score,
                        max_score,
                        json.dumps({"seed": "yet_metabase_demo", "i": i, "d": day_back}),
                        score >= 2,
                        created,
                    ),
                )
        rows = conn.execute(
            """
            SELECT id::text AS id, subject, learner_name, course_label,
                   score, max_score, created_at
            FROM quiz_attempts
            ORDER BY created_at DESC
            LIMIT 80
            """
        ).fetchall()
        return [dict(r) for r in rows]


def _lesson_ids(tenant_id: str) -> list[dict]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id::text AS id, title
            FROM lessons
            WHERE lesson_type <> 'quiz' AND COALESCE(status, 'published') = 'published'
            ORDER BY position
            LIMIT 8
            """
        ).fetchall()
        return [dict(r) for r in rows]


def seed_local_xapi(tenant_id: str, attempts: list[dict], lessons: list[dict]) -> dict:
    """Phase 1: populate xapi_statements for Metabase bi_* (no LRS wait)."""
    stats = {"quiz_xapi": 0, "lesson_xapi": 0, "coach_xapi": 0, "errors": 0}
    for a in attempts[:40]:
        try:
            record_quiz_attempt(
                tenant_id=tenant_id,
                subject=str(a["subject"]),
                learner_name=str(a.get("learner_name") or a["subject"]),
                attempt_id=a["id"],
                score=int(a["score"] or 0),
                max_score=int(a["max_score"] or 3),
                course_label=str(a.get("course_label") or "Demo course"),
                send_lrs=False,
            )
            stats["quiz_xapi"] += 1
        except Exception as exc:  # noqa: BLE001
            stats["errors"] += 1
            print(f"  quiz xapi warn: {exc}")

    for i, (subject, name) in enumerate(DEMO_LEARNERS[:6]):
        for L in lessons[: min(2, len(lessons))]:
            try:
                record_lesson_completed(
                    tenant_id=tenant_id,
                    subject=subject,
                    learner_name=name,
                    lesson_id=L["id"],
                    lesson_title=str(L["title"]),
                    send_lrs=False,
                )
                stats["lesson_xapi"] += 1
            except Exception as exc:  # noqa: BLE001
                stats["errors"] += 1
                print(f"  lesson xapi warn: {exc}")

    for subject, name in DEMO_LEARNERS[:5]:
        try:
            record_coach_interaction(
                tenant_id=tenant_id,
                subject=subject,
                learner_name=name,
                thread_id=f"demo-thread-{subject}",
                question="How do I solve for x in 2x + 4 = 10?",
                answer_text="Subtract 4 from both sides, then divide by 2. x = 3.",
                grounded=True,
                citation_count=1,
                course_title="Class 8 · Algebra demo",
                send_lrs=False,
            )
            stats["coach_xapi"] += 1
        except Exception as exc:  # noqa: BLE001
            stats["errors"] += 1
            print(f"  coach xapi warn: {exc}")
    return stats


def seed_yet_forward(tenant_id: str) -> dict:
    """Phase 2: forward unsent statements + a few direct Yet posts for LRS UI."""
    from app.modules.xapi import forward_to_lrs

    settings = get_settings()
    stats: dict = {
        "forwarded": 0,
        "forward_fail": 0,
        "retry": None,
        "direct_yet": 0,
        "direct_yet_errors": [],
    }
    if not (settings.xapi_lrs_endpoint and settings.xapi_lrs_key):
        stats["skipped"] = "XAPI_LRS_* not set"
        return stats

    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT statement_id, statement, COALESCE(lrs_attempts, 0) AS lrs_attempts
            FROM xapi_statements
            WHERE sent_to_lrs IS NOT TRUE
            ORDER BY created_at DESC
            LIMIT 80
            """
        ).fetchall()
        pending = [dict(r) for r in rows]

    for r in pending:
        stmt = r["statement"]
        if isinstance(stmt, str):
            stmt = json.loads(stmt)
        ok, err, attempts = forward_to_lrs(stmt, retries=2)
        with db.tenant_connection(tenant_id) as conn:
            conn.execute(
                """
                UPDATE xapi_statements
                SET sent_to_lrs = %s,
                    lrs_error = %s,
                    lrs_attempts = COALESCE(lrs_attempts, 0) + %s
                WHERE statement_id = %s
                """,
                (ok, None if ok else err, attempts, str(r["statement_id"])),
            )
        if ok:
            stats["forwarded"] += 1
        else:
            stats["forward_fail"] += 1
        time.sleep(0.05)

    try:
        stats["retry"] = retry_failed_lrs(tenant_id, limit=40)
    except Exception as exc:  # noqa: BLE001
        stats["retry_error"] = str(exc)

    for i in range(8):
        subject, name = DEMO_LEARNERS[i % len(DEMO_LEARNERS)]
        stmt = {
            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"edvidura-demo-yet-{i}")),
            "actor": {
                "objectType": "Agent",
                "name": name,
                "account": {
                    "homePage": settings.xapi_actor_homepage or settings.app_base_url,
                    "name": subject,
                },
            },
            "verb": {
                "id": "http://adlnet.gov/expapi/verbs/experienced",
                "display": {"en-US": "experienced"},
            },
            "object": {
                "id": f"{settings.app_base_url}/xapi/activities/demo/spotlight/{i}",
                "objectType": "Activity",
                "definition": {
                    "name": {"en-US": f"Demo spotlight {i + 1}"},
                    "type": "http://adlnet.gov/expapi/activities/module",
                },
            },
            "timestamp": (
                datetime.now(timezone.utc) - timedelta(hours=i)
            ).isoformat().replace("+00:00", "Z"),
        }
        ok, err, _n, _m = post_statement(
            stmt,
            endpoint=settings.xapi_lrs_endpoint,
            key=settings.xapi_lrs_key,
            secret=settings.xapi_lrs_secret,
            provider=(settings.xapi_lrs_provider or "yet"),  # type: ignore[arg-type]
            retries=2,
        )
        if ok:
            stats["direct_yet"] += 1
        elif err:
            stats["direct_yet_errors"].append(err[:120])
        time.sleep(0.15)
    return stats


def main() -> int:
    settings = get_settings()
    if not (settings.database_url or "").strip():
        raise SystemExit("DATABASE_URL missing")

    print("Phase 0: resolve tenant…")
    tenant_id = _tenant_id()
    print(f"Tenant: {tenant_id[:8]}…")

    attempts = _ensure_quiz_attempts(tenant_id)
    print(f"Quiz attempts available: {len(attempts)}")
    lessons = _lesson_ids(tenant_id)
    print(f"Lessons available: {len(lessons)}")

    print("Phase 1: local xAPI (Metabase)…")
    local = seed_local_xapi(tenant_id, attempts, lessons)
    print("  local:", json.dumps(local))

    print("Phase 2: Yet LRS…")
    yet = seed_yet_forward(tenant_id)
    print(
        "  yet:",
        json.dumps({k: v for k, v in yet.items() if k != "direct_yet_errors"}),
    )
    if yet.get("direct_yet_errors"):
        print("  yet errors:", yet["direct_yet_errors"][:3])

    if settings.xapi_lrs_endpoint:
        probe = probe_lrs(
            endpoint=settings.xapi_lrs_endpoint,
            key=settings.xapi_lrs_key,
            secret=settings.xapi_lrs_secret,
            provider=(settings.xapi_lrs_provider or "yet"),  # type: ignore[arg-type]
        )
        print(
            f"Yet probe: ok={probe.get('ok')} status={probe.get('status_code')} "
            f"host={probe.get('host')}"
        )

    with db.tenant_connection(tenant_id) as conn:
        xa = conn.execute("SELECT COUNT(*)::int AS n FROM xapi_statements").fetchone()
        qa = conn.execute("SELECT COUNT(*)::int AS n FROM quiz_attempts").fetchone()
        sent = conn.execute(
            "SELECT COUNT(*)::int AS n FROM xapi_statements WHERE sent_to_lrs IS TRUE"
        ).fetchone()
    print(
        f"DB demo volume: quiz_attempts={qa['n']} xapi_statements={xa['n']} "
        f"sent_to_lrs={sent['n']}"
    )
    print("Metabase: Integrations embed / EdVidura overview dashboard")
    print("Yet admin: https://yet-lrs-production.up.railway.app/admin")
    return 0


if __name__ == "__main__":
    sys.exit(main())
