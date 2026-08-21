"""Tenant analytics aggregations for in-app BI + Metabase-ready exports."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from app import db


def _short_verb(verb_id: str) -> str:
    v = (verb_id or "").rstrip("/")
    if "/" in v:
        v = v.rsplit("/", 1)[-1]
    return v or "unknown"


def tenant_dashboard(tenant_id: UUID | str) -> dict[str, Any]:
    """Roll-up for teacher Analytics page (RLS-scoped)."""
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        attempt_stats = conn.execute(
            """
            SELECT
                COUNT(*)::int AS attempt_count,
                COUNT(DISTINCT subject)::int AS learner_count,
                COALESCE(ROUND(AVG(
                    CASE WHEN max_score > 0
                        THEN 100.0 * score / max_score END
                )), 0)::int AS avg_percent,
                COALESCE(SUM(CASE WHEN grade_sent THEN 1 ELSE 0 END), 0)::int
                    AS synced_count,
                COALESCE(SUM(
                    CASE WHEN max_score > 0 AND score::float / max_score >= 0.6
                        THEN 1 ELSE 0 END
                ), 0)::int AS pass_count
            FROM quiz_attempts
            """
        ).fetchone()

        daily_raw = conn.execute(
            """
            SELECT date_trunc('day', created_at)::date AS day,
                   COUNT(*)::int AS attempts,
                   COALESCE(ROUND(AVG(
                       CASE WHEN max_score > 0
                           THEN 100.0 * score / max_score END
                   )), 0)::int AS avg_percent
            FROM quiz_attempts
            WHERE created_at >= now() - interval '30 days'
            GROUP BY 1
            ORDER BY 1 ASC
            """
        ).fetchall()

        buckets = conn.execute(
            """
            SELECT
                COALESCE(SUM(CASE WHEN max_score > 0
                    AND (100.0 * score / max_score) < 40 THEN 1 ELSE 0 END), 0)::int
                    AS low,
                COALESCE(SUM(CASE WHEN max_score > 0
                    AND (100.0 * score / max_score) >= 40
                    AND (100.0 * score / max_score) < 60 THEN 1 ELSE 0 END), 0)::int
                    AS mid,
                COALESCE(SUM(CASE WHEN max_score > 0
                    AND (100.0 * score / max_score) >= 60
                    AND (100.0 * score / max_score) < 80 THEN 1 ELSE 0 END), 0)::int
                    AS pass_band,
                COALESCE(SUM(CASE WHEN max_score > 0
                    AND (100.0 * score / max_score) >= 80 THEN 1 ELSE 0 END), 0)::int
                    AS high
            FROM quiz_attempts
            """
        ).fetchone()

        top_learners = conn.execute(
            """
            SELECT COALESCE(NULLIF(learner_name, ''), subject) AS label,
                   COUNT(*)::int AS attempts,
                   COALESCE(ROUND(AVG(
                       CASE WHEN max_score > 0
                           THEN 100.0 * score / max_score END
                   )), 0)::int AS avg_percent,
                   MAX(CASE WHEN max_score > 0
                       THEN ROUND(100.0 * score / max_score)::int ELSE 0 END)
                       AS best_percent
            FROM quiz_attempts
            GROUP BY 1
            ORDER BY attempts DESC, avg_percent DESC
            LIMIT 8
            """
        ).fetchall()

        verbs = conn.execute(
            """
            SELECT verb_id, COUNT(*)::int AS n
            FROM xapi_statements
            GROUP BY verb_id
            ORDER BY n DESC
            LIMIT 12
            """
        ).fetchall()

        xapi_total = conn.execute(
            "SELECT COUNT(*)::int AS n FROM xapi_statements"
        ).fetchone()

        lesson_done = conn.execute(
            """
            SELECT COUNT(*)::int AS n,
                   COUNT(DISTINCT subject)::int AS learners
            FROM lesson_progress
            """
        ).fetchone()

    a = dict(attempt_stats or {})
    attempts = int(a.get("attempt_count") or 0)
    passes = int(a.get("pass_count") or 0)
    synced = int(a.get("synced_count") or 0)
    fails = max(attempts - passes, 0)
    b = dict(buckets or {})

    by_day = {
        str(r["day"]): {
            "day": str(r["day"]),
            "attempts": int(r["attempts"]),
            "avg_percent": int(r["avg_percent"]),
        }
        for r in daily_raw
    }
    today = date.today()
    daily: list[dict[str, Any]] = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        daily.append(
            by_day.get(
                d,
                {"day": d, "attempts": 0, "avg_percent": 0},
            )
        )

    verb_rows = [
        {
            "verb_id": r["verb_id"],
            "label": _short_verb(str(r["verb_id"])),
            "count": int(r["n"]),
        }
        for r in verbs
    ]

    return {
        "attempt_count": attempts,
        "learner_count": int(a.get("learner_count") or 0),
        "avg_percent": int(a.get("avg_percent") or 0) if attempts else None,
        "synced_count": synced,
        "pass_count": passes,
        "fail_count": fails,
        "unsynced_count": max(attempts - synced, 0),
        "pass_rate": round(100 * passes / attempts) if attempts else None,
        "xapi_count": int((xapi_total or {}).get("n") or 0),
        "lesson_completions": int((lesson_done or {}).get("n") or 0),
        "lesson_learners": int((lesson_done or {}).get("learners") or 0),
        "daily": daily,
        "score_buckets": {
            "labels": ["0–39%", "40–59%", "60–79%", "80–100%"],
            "values": [
                int(b.get("low") or 0),
                int(b.get("mid") or 0),
                int(b.get("pass_band") or 0),
                int(b.get("high") or 0),
            ],
        },
        "top_learners": [
            {
                "label": str(r["label"]),
                "attempts": int(r["attempts"]),
                "avg_percent": int(r["avg_percent"]),
                "best_percent": int(r["best_percent"]),
            }
            for r in top_learners
        ],
        "xapi_verbs": verb_rows,
        "charts": {
            "daily_labels": [d["day"][5:] for d in daily],  # MM-DD
            "daily_attempts": [d["attempts"] for d in daily],
            "daily_avg": [d["avg_percent"] for d in daily],
            "outcome_labels": ["Passed (≥60%)", "Below pass"],
            "outcome_values": [passes, fails],
            "sync_labels": ["Synced to Moodle", "Not synced"],
            "sync_values": [synced, max(attempts - synced, 0)],
            "verb_labels": [v["label"] for v in verb_rows],
            "verb_values": [v["count"] for v in verb_rows],
            "bucket_labels": ["0–39%", "40–59%", "60–79%", "80–100%"],
            "bucket_values": [
                int(b.get("low") or 0),
                int(b.get("mid") or 0),
                int(b.get("pass_band") or 0),
                int(b.get("high") or 0),
            ],
            "learner_labels": [str(r["label"])[:18] for r in top_learners],
            "learner_attempts": [int(r["attempts"]) for r in top_learners],
            "learner_avg": [int(r["avg_percent"]) for r in top_learners],
        },
    }


def export_rows(tenant_id: UUID | str, *, limit: int = 500) -> list[dict[str, Any]]:
    """Flat attempt rows for CSV / Metabase-style export."""
    lim = max(1, min(int(limit), 5000))
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, subject, learner_name, course_label, score, max_score,
                   grade_sent, created_at,
                   CASE WHEN max_score > 0
                        THEN ROUND(100.0 * score / max_score)::int
                        ELSE 0 END AS percent
            FROM quiz_attempts
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (lim,),
        ).fetchall()
        return [dict(r) for r in rows]
