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


def learner_dashboard(
    tenant_id: UUID | str, subject: str
) -> dict[str, Any]:
    """Personal analytics for the logged-in learner (RLS + subject filter)."""
    sub = (subject or "").strip()
    if not sub:
        return {
            "subject": "",
            "attempt_count": 0,
            "avg_percent": None,
            "best_percent": None,
            "pass_count": 0,
            "fail_count": 0,
            "xapi_count": 0,
            "lesson_completions": 0,
            "recent": [],
            "skill_verbs": [],
        }
    with db.tenant_connection(tenant_id) as conn:
        stats = conn.execute(
            """
            SELECT
                COUNT(*)::int AS attempt_count,
                COALESCE(ROUND(AVG(
                    CASE WHEN max_score > 0
                        THEN 100.0 * score / max_score END
                )), 0)::int AS avg_percent,
                COALESCE(MAX(
                    CASE WHEN max_score > 0
                        THEN ROUND(100.0 * score / max_score)::int ELSE 0 END
                ), 0)::int AS best_percent,
                COALESCE(SUM(
                    CASE WHEN max_score > 0 AND score::float / max_score >= 0.6
                        THEN 1 ELSE 0 END
                ), 0)::int AS pass_count
            FROM quiz_attempts
            WHERE subject = %s
            """,
            (sub,),
        ).fetchone()
        recent = conn.execute(
            """
            SELECT id, score, max_score, grade_sent, course_label, created_at,
                   CASE WHEN max_score > 0
                        THEN ROUND(100.0 * score / max_score)::int
                        ELSE 0 END AS percent
            FROM quiz_attempts
            WHERE subject = %s
            ORDER BY created_at DESC
            LIMIT 8
            """,
            (sub,),
        ).fetchall()
        xapi_n = conn.execute(
            """
            SELECT COUNT(*)::int AS n FROM xapi_statements
            WHERE actor_sub = %s
            """,
            (sub,),
        ).fetchone()
        lessons = conn.execute(
            """
            SELECT COUNT(*)::int AS n FROM lesson_progress
            WHERE subject = %s
            """,
            (sub,),
        ).fetchone()
        verbs = conn.execute(
            """
            SELECT verb_id, COUNT(*)::int AS n
            FROM xapi_statements
            WHERE actor_sub = %s
            GROUP BY verb_id
            ORDER BY n DESC
            LIMIT 8
            """,
            (sub,),
        ).fetchall()

    a = dict(stats or {})
    attempts = int(a.get("attempt_count") or 0)
    passes = int(a.get("pass_count") or 0)
    return {
        "subject": sub,
        "attempt_count": attempts,
        "avg_percent": int(a.get("avg_percent") or 0) if attempts else None,
        "best_percent": int(a.get("best_percent") or 0) if attempts else None,
        "pass_count": passes,
        "fail_count": max(attempts - passes, 0),
        "xapi_count": int((xapi_n or {}).get("n") or 0),
        "lesson_completions": int((lessons or {}).get("n") or 0),
        "recent": [
            {
                "id": str(r["id"]),
                "score": int(r["score"]),
                "max_score": int(r["max_score"]),
                "percent": int(r["percent"]),
                "grade_sent": bool(r["grade_sent"]),
                "course_label": str(r.get("course_label") or ""),
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r.get("created_at"), "isoformat")
                    else str(r.get("created_at") or "")
                ),
            }
            for r in recent
        ],
        "skill_verbs": [
            {
                "verb_id": r["verb_id"],
                "label": _short_verb(str(r["verb_id"])),
                "count": int(r["n"]),
            }
            for r in verbs
        ],
        "study_plan": None,
    }


def attach_study_plan(
    dash: dict[str, Any],
    *,
    tenant_id: UUID | str,
    subject: str,
    quiz_token: str,
    course_id: UUID | str | None = None,
    course_label: str = "",
    first_lesson_id: str | None = None,
    role_code: str | None = None,
) -> dict[str, Any]:
    """Phase B1: attach portable study-plan summary onto learner_dashboard."""
    out = dict(dash or {})
    try:
        from app.modules.adaptive import learner_plan_summary

        out["study_plan"] = learner_plan_summary(
            tenant_id,
            subject=subject,
            quiz_token=quiz_token,
            course_id=course_id,
            course_label=course_label,
            first_lesson_id=first_lesson_id,
            role_code=role_code,
        )
    except Exception:  # noqa: BLE001
        out["study_plan"] = {
            "active": False,
            "plan_href": f"/learn/gap?token={quiz_token}" if quiz_token else "/learn/gap",
            "message": "Plan unavailable right now.",
        }
    return out


def class_coach_insights(
    tenant_id: UUID | str,
    *,
    subjects: list[str] | set[str] | None = None,
    limit: int = 400,
) -> dict[str, Any]:
    """Phase B2: roll up Ask Vidura xAPI for a class (portable, no FastAPI).

    Topics = question previews; refusals; thumbs; strategies; JEV skipped-remote.
    """
    from collections import Counter

    from app.modules.xapi import verbs
    from app.modules.xapi.service import list_statements

    want_subs = {str(s).strip() for s in (subjects or []) if str(s).strip()}
    rows = list_statements(tenant_id, limit=max(1, min(int(limit), 500)))
    ext_base = "https://edvidura.local/xapi/extensions/"

    turns = 0
    grounded = 0
    refusals: Counter[str] = Counter()
    strategies: Counter[str] = Counter()
    topics: Counter[str] = Counter()
    thumbs_up = 0
    thumbs_down = 0
    jev_used = 0
    jev_skipped = 0
    actors: set[str] = set()
    recent: list[dict[str, Any]] = []

    for row in rows:
        actor = str(row.get("actor_sub") or "").strip()
        if want_subs and actor and actor not in want_subs:
            continue
        stmt = row.get("statement")
        if isinstance(stmt, str):
            import json

            try:
                stmt = json.loads(stmt)
            except Exception:  # noqa: BLE001
                stmt = {}
        if not isinstance(stmt, dict):
            stmt = {}
        ctx = stmt.get("context") if isinstance(stmt.get("context"), dict) else {}
        ext = ctx.get("extensions") if isinstance(ctx.get("extensions"), dict) else {}
        channel = str(ext.get(f"{ext_base}channel") or "")
        verb_id = str(row.get("verb_id") or (stmt.get("verb") or {}).get("id") or "")

        is_coach = channel == "study_coach" or verb_id in {
            verbs.VERB_INTERACTED,
            verbs.VERB_RESPONDED,
        }
        if not is_coach and "/study-coach" not in str(row.get("object_id") or ""):
            continue
        if actor:
            actors.add(actor)

        if verb_id == verbs.VERB_RESPONDED or ext.get(f"{ext_base}feedback_kind"):
            rating = str(ext.get(f"{ext_base}coach_rating") or "").lower()
            if rating in {"up", "helpful"}:
                thumbs_up += 1
            elif rating in {"down", "not_helpful"}:
                thumbs_down += 1
            continue

        # interacted / chat turns
        if channel != "study_coach" and verb_id != verbs.VERB_INTERACTED:
            continue
        turns += 1
        if ext.get(f"{ext_base}grounded") is True:
            grounded += 1
        refusal = str(ext.get(f"{ext_base}refusal_reason") or "").strip()
        if refusal:
            refusals[refusal] += 1
        strat = str(ext.get(f"{ext_base}coach_strategy") or "").strip()
        if strat:
            strategies[strat] += 1
        preview = str(ext.get(f"{ext_base}question_preview") or "").strip()
        if preview:
            topics[preview[:80]] += 1
        if ext.get(f"{ext_base}jev_used"):
            jev_used += 1
        if ext.get(f"{ext_base}jev_skipped_remote"):
            jev_skipped += 1

        if len(recent) < 8:
            when = row.get("created_at")
            recent.append(
                {
                    "when": (
                        when.isoformat()
                        if hasattr(when, "isoformat")
                        else str(when or "")
                    ),
                    "actor": actor,
                    "preview": preview[:100],
                    "strategy": strat,
                    "refusal": refusal,
                    "grounded": bool(ext.get(f"{ext_base}grounded")),
                }
            )

    return {
        "learner_count": len(actors),
        "turns": turns,
        "grounded": grounded,
        "grounded_pct": int(round(100.0 * grounded / turns)) if turns else 0,
        "refusals_total": sum(refusals.values()),
        "refusals_by_reason": [
            {"reason": k, "count": v} for k, v in refusals.most_common(8)
        ],
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "strategies": [
            {"strategy": k, "count": v} for k, v in strategies.most_common(8)
        ],
        "top_topics": [
            {"topic": k, "count": v} for k, v in topics.most_common(10)
        ],
        "jev_used": jev_used,
        "jev_skipped_remote": jev_skipped,
        "recent": recent,
    }


def metabase_embed_url(
    *,
    tenant_id: UUID | str | None = None,
    tenant_slug: str | None = None,
    resource: str = "dashboard",
    resource_id: int | None = None,
    minutes: int = 60,
    pass_tenant_filters: bool = False,
) -> str | None:
    """
    Signed Metabase static embed URL when METABASE_SECRET_KEY + dashboard id set.

    Returns None when not configured (UI falls back to external link).

    Important: JWT ``params`` must match the dashboard's ``embedding_params``.
    Our bootstrap dashboard has ``embedding_params: {}``, so extra keys like
    ``tenant_id`` cause Metabase to show “There was a problem displaying this chart.”
    Pass ``pass_tenant_filters=True`` only when the dashboard defines those filters.
    """
    import time

    import jwt

    from app.settings import get_settings

    s = get_settings()
    secret = (getattr(s, "metabase_secret_key", "") or "").strip()
    base = (s.metabase_url or "").rstrip("/")
    rid = resource_id if resource_id is not None else getattr(
        s, "metabase_embed_dashboard_id", 0
    )
    try:
        rid_i = int(rid or 0)
    except (TypeError, ValueError):
        rid_i = 0
    if not secret or not base or rid_i <= 0:
        return None
    kind = "dashboard" if resource != "question" else "question"
    params: dict[str, Any] = {}
    if pass_tenant_filters:
        if tenant_id:
            params["tenant_id"] = [str(tenant_id)]
        if tenant_slug:
            params["tenant_slug"] = [str(tenant_slug)]
    payload = {
        "resource": {kind: rid_i},
        "params": params,
        "exp": int(time.time()) + max(60, int(minutes) * 60),
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return f"{base}/embed/{kind}/{token}#bordered=true&titled=true"


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


def live_school_users(tenant_id: UUID | str) -> dict[str, Any]:
    """
    Real-time-ish people counts for one school (tenant).

    - Moodle NRPS cache = enrolled users (authoritative people count when synced)
    - launch_events = who actually opened EdVidura (active / today)
    - quiz_attempts DISTINCT = learners who submitted (activity, not enrolment)
    """
    from datetime import datetime, timezone

    from app.modules import nrps as nrps_mod

    roster = nrps_mod.school_roster_totals(tenant_id)
    with db.tenant_connection(tenant_id) as conn:
        active_15 = conn.execute(
            """
            SELECT COUNT(DISTINCT subject)::int AS n
            FROM launch_events
            WHERE created_at >= now() - interval '15 minutes'
              AND COALESCE(subject, '') <> ''
            """
        ).fetchone()
        active_today = conn.execute(
            """
            SELECT COUNT(DISTINCT subject)::int AS n
            FROM launch_events
            WHERE created_at >= date_trunc('day', now())
              AND COALESCE(subject, '') <> ''
            """
        ).fetchone()
        launchers = conn.execute(
            """
            SELECT COUNT(DISTINCT subject)::int AS n
            FROM launch_events
            WHERE COALESCE(subject, '') <> ''
            """
        ).fetchone()
        attempt_learners = conn.execute(
            """
            SELECT COUNT(DISTINCT subject)::int AS n
            FROM quiz_attempts
            WHERE COALESCE(subject, '') <> ''
            """
        ).fetchone()
        recent = conn.execute(
            """
            SELECT subject, MAX(created_at) AS last_seen
            FROM launch_events
            WHERE created_at >= now() - interval '15 minutes'
              AND COALESCE(subject, '') <> ''
            GROUP BY subject
            ORDER BY last_seen DESC
            LIMIT 20
            """
        ).fetchall()

    names = {
        str(m.get("user_id")): str(m.get("name") or m.get("user_id"))
        for m in (roster.get("members") or [])
    }
    active_now = [
        {
            "subject": str(r["subject"]),
            "name": names.get(str(r["subject"]), str(r["subject"])),
            "last_seen": (
                r["last_seen"].isoformat()
                if hasattr(r.get("last_seen"), "isoformat")
                else str(r.get("last_seen") or "")
            ),
        }
        for r in recent
    ]

    return {
        "tenant_id": str(tenant_id),
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "moodle_users": int(roster.get("users_total") or 0),
        "moodle_learners": int(roster.get("learners") or 0),
        "moodle_instructors": int(roster.get("instructors") or 0),
        "moodle_synced": bool(roster.get("synced")),
        "moodle_fetched_at": roster.get("fetched_at") or "",
        "moodle_contexts": int(roster.get("context_count") or 0),
        "active_now": int((active_15 or {}).get("n") or 0),
        "active_today": int((active_today or {}).get("n") or 0),
        "launchers_all_time": int((launchers or {}).get("n") or 0),
        "attempt_learners": int((attempt_learners or {}).get("n") or 0),
        "active_now_list": active_now,
        "members": roster.get("members") or [],
        "hint": (
            "Sync Moodle roster from Class results (teacher) to refresh enrolment counts."
            if not roster.get("synced")
            else "Enrolment counts from last Moodle NRPS sync; Active now = launches in last 15 min."
        ),
    }
