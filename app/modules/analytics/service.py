"""Tenant analytics aggregations for in-app BI + Metabase-ready exports."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from app import db

_SESSION_GAP = timedelta(minutes=30)


def _short_verb(verb_id: str) -> str:
    v = (verb_id or "").rstrip("/")
    if "/" in v:
        v = v.rsplit("/", 1)[-1]
    return v or "unknown"


def _as_dt(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _tool_from_object_id(object_id: str) -> str:
    parts = [p for p in (object_id or "").split("/") if p]
    if "activities" in parts:
        i = parts.index("activities")
        if i + 1 < len(parts):
            return parts[i + 1]
    return "other"


def group_progress_by_tool(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Attempt / complete / ongoing / incomplete counts grouped by activity kind."""
    buckets: dict[str, dict[str, Any]] = {}
    for row in rows:
        tool = _tool_from_object_id(str(row.get("object_id") or ""))
        verb = _short_verb(str(row.get("verb_id") or "")).lower()
        actor = str(row.get("actor_sub") or "")
        when = _as_dt(row.get("created_at"))
        bucket = buckets.setdefault(
            tool,
            {
                "tool": tool,
                "attempts": 0,
                "complete": 0,
                "ongoing": 0,
                "incomplete": 0,
                "actors": set(),
                "last_progress": None,
            },
        )
        bucket["attempts"] += 1
        if actor:
            bucket["actors"].add(actor)
        if verb in {"completed", "passed", "mastered"}:
            bucket["complete"] += 1
        elif verb in {"failed", "abandoned"}:
            bucket["incomplete"] += 1
        else:
            bucket["ongoing"] += 1
        if when and (
            bucket["last_progress"] is None or when > bucket["last_progress"]
        ):
            bucket["last_progress"] = when
    out: list[dict[str, Any]] = []
    for tool, bucket in sorted(
        buckets.items(), key=lambda kv: kv[1]["attempts"], reverse=True
    ):
        last = bucket["last_progress"]
        out.append(
            {
                "tool": tool,
                "attempts": int(bucket["attempts"]),
                "complete": int(bucket["complete"]),
                "ongoing": int(bucket["ongoing"]),
                "incomplete": int(bucket["incomplete"]),
                "learner_count": len(bucket["actors"]),
                "last_progress": last.isoformat() if last else None,
            }
        )
    return out


def derive_sessions(
    rows: list[dict[str, Any]], *, gap: timedelta = _SESSION_GAP
) -> list[dict[str, Any]]:
    """Collapse xAPI rows into actor sessions (30-minute idle gap)."""
    by_actor: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        actor = str(row.get("actor_sub") or "").strip()
        when = _as_dt(row.get("created_at"))
        if not actor or when is None:
            continue
        by_actor.setdefault(actor, []).append({**row, "_when": when})
    sessions: list[dict[str, Any]] = []
    for actor, events in by_actor.items():
        events.sort(key=lambda r: r["_when"])
        current: list[dict[str, Any]] = []
        for event in events:
            if current and event["_when"] - current[-1]["_when"] > gap:
                sessions.append(_session_from_events(actor, current))
                current = []
            current.append(event)
        if current:
            sessions.append(_session_from_events(actor, current))
    sessions.sort(key=lambda s: str(s.get("ended_at") or ""), reverse=True)
    return sessions


def _session_from_events(actor: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    start = events[0]["_when"]
    end = events[-1]["_when"]
    minutes = max(1, int(round((end - start).total_seconds() / 60.0))) if end != start else 1
    tools = []
    seen: set[str] = set()
    for event in events:
        tool = _tool_from_object_id(str(event.get("object_id") or ""))
        if tool not in seen:
            seen.add(tool)
            tools.append(tool)
    return {
        "actor_sub": actor,
        "started_at": start.isoformat(),
        "ended_at": end.isoformat(),
        "duration_minutes": minutes,
        "event_count": len(events),
        "tools": tools,
        "content": tools[0] if tools else "other",
    }


def heatmap_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    hours = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"]
    hour_starts = (8, 10, 12, 14, 16, 18, 20)
    cells = [[0 for _ in hours] for _ in days]
    for row in rows:
        when = _as_dt(row.get("created_at"))
        if when is None:
            continue
        local = when.astimezone(timezone.utc)
        d = local.weekday()  # Mon=0
        h = local.hour
        bucket = 0
        for i, start in enumerate(hour_starts):
            if h >= start:
                bucket = i
        cells[d][bucket] += 1
    peak = max((n for row in cells for n in row), default=1) or 1
    intensity = [
        [min(4, int(round(4 * n / peak)) if n else 0) for n in row] for row in cells
    ]
    return {"days": days, "hours": hours, "cells": intensity, "counts": cells}


def _short_actor(actor: str) -> str:
    s = (actor or "").strip()
    if not s:
        return "Learner"
    if ":" in s:
        s = s.rsplit(":", 1)[-1]
    if len(s) > 18:
        return s[:8] + "…" + s[-6:]
    return s


def _week_key(day: date) -> str:
    iso = day.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _month_key(day: date) -> str:
    return f"{day.year}-{day.month:02d}"


def _quarter_key(day: date) -> str:
    return f"{day.year}-Q{(day.month - 1) // 3 + 1}"


def _period_key(when: datetime, grain: str) -> str:
    day = when.date()
    if grain == "week":
        return _week_key(day)
    if grain == "month":
        return _month_key(day)
    if grain == "quarter":
        return _quarter_key(day)
    return day.isoformat()


def _grain_axis(grain: str, *, today: date) -> list[str]:
    if grain == "day":
        return [(today - timedelta(days=13 - i)).isoformat() for i in range(14)]
    if grain == "week":
        monday = today - timedelta(days=today.weekday())
        return [_week_key(monday - timedelta(weeks=11 - i)) for i in range(12)]
    if grain == "month":
        y, m = today.year, today.month
        out: list[str] = []
        for i in range(5, -1, -1):
            mm = m - i
            yy = y
            while mm <= 0:
                mm += 12
                yy -= 1
            out.append(f"{yy}-{mm:02d}")
        return out
    q = (today.month - 1) // 3 + 1
    y = today.year
    out = []
    for i in range(3, -1, -1):
        qq = q - i
        yy = y
        while qq <= 0:
            qq += 4
            yy -= 1
        out.append(f"{yy}-Q{qq}")
    return out


def _axis_label(grain: str, key: str) -> str:
    if grain == "day":
        return key[5:] if len(key) >= 10 else key
    if grain == "week":
        return key[-3:]
    if grain == "month" and len(key) >= 7:
        return key[5:]
    return key


def learner_date_heatmap(
    rows: list[dict[str, Any]],
    *,
    days: int = 30,
    max_learners: int = 16,
    names: dict[str, str] | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    """F-1: noisy LRS heatmap — calendar dates × learners (all xAPI verbs)."""
    end = today or date.today()
    span = max(1, min(int(days or 30), 90))
    dates = [(end - timedelta(days=span - 1 - i)).isoformat() for i in range(span)]
    index = {d: i for i, d in enumerate(dates)}
    counts: dict[str, list[int]] = {}
    totals: dict[str, int] = {}
    for row in rows:
        actor = str(row.get("actor_sub") or "").strip()
        when = _as_dt(row.get("created_at"))
        if not actor or when is None:
            continue
        idx = index.get(when.date().isoformat())
        if idx is None:
            continue
        if actor not in counts:
            counts[actor] = [0] * span
        counts[actor][idx] += 1
        totals[actor] = totals.get(actor, 0) + 1
    ranked = sorted(totals, key=lambda a: totals[a], reverse=True)[:max_learners]
    cells = [counts[a] for a in ranked]
    peak = max((n for row in cells for n in row), default=1) or 1
    intensity = [
        [
            0 if n == 0 else max(1, min(4, int(round(4 * n / peak))))
            for n in row
        ]
        for row in cells
    ]
    labels = [(names or {}).get(a) or _short_actor(a) for a in ranked]
    return {
        "dates": dates,
        "date_labels": [d[5:] for d in dates],
        "learners": [
            {"id": a, "label": lab, "total": int(totals[a])}
            for a, lab in zip(ranked, labels)
        ],
        "cells": cells,
        "intensity": intensity,
        "peak": int(peak),
    }


def learner_time_series(
    xapi_rows: list[dict[str, Any]],
    attempt_rows: list[dict[str, Any]],
    *,
    names: dict[str, str] | None = None,
    today: date | None = None,
    max_learners: int = 8,
) -> dict[str, Any]:
    """F-6: per-student activity + quiz % at day / week / month / quarter (8 charts)."""
    end = today or date.today()
    activity_totals: dict[str, int] = {}
    activity_buckets: dict[str, dict[str, dict[str, int]]] = {
        g: {} for g in ("day", "week", "month", "quarter")
    }
    score_sum: dict[str, dict[str, dict[str, float]]] = {
        g: {} for g in ("day", "week", "month", "quarter")
    }
    score_n: dict[str, dict[str, dict[str, int]]] = {
        g: {} for g in ("day", "week", "month", "quarter")
    }

    for row in xapi_rows:
        actor = str(row.get("actor_sub") or "").strip()
        when = _as_dt(row.get("created_at"))
        if not actor or when is None:
            continue
        activity_totals[actor] = activity_totals.get(actor, 0) + 1
        for grain in activity_buckets:
            key = _period_key(when, grain)
            by_actor = activity_buckets[grain].setdefault(actor, {})
            by_actor[key] = by_actor.get(key, 0) + 1

    for row in attempt_rows:
        actor = str(row.get("subject") or row.get("actor_sub") or "").strip()
        when = _as_dt(row.get("created_at"))
        if not actor or when is None:
            continue
        max_s = max(int(row.get("max_score") or 0), 1)
        pct = 100.0 * int(row.get("score") or 0) / max_s
        for grain in score_sum:
            key = _period_key(when, grain)
            score_sum[grain].setdefault(actor, {})
            score_n[grain].setdefault(actor, {})
            score_sum[grain][actor][key] = score_sum[grain][actor].get(key, 0.0) + pct
            score_n[grain][actor][key] = score_n[grain][actor].get(key, 0) + 1
        activity_totals.setdefault(actor, 0)

    merged_names = dict(names or {})
    for row in attempt_rows:
        sub = str(row.get("subject") or row.get("actor_sub") or "").strip()
        label = str(row.get("learner_name") or "").strip()
        if sub and label and sub not in merged_names:
            merged_names[sub] = label

    ranked = sorted(
        activity_totals, key=lambda a: activity_totals[a], reverse=True
    )[:max_learners]
    learners = [
        {
            "id": a,
            "label": merged_names.get(a) or _short_actor(a),
            "total": int(activity_totals.get(a) or 0),
        }
        for a in ranked
    ]

    charts: list[dict[str, Any]] = []
    specs = (
        ("activity", "day", "Daily activity", "events"),
        ("score", "day", "Daily quiz average", "%"),
        ("activity", "week", "Weekly activity", "events"),
        ("score", "week", "Weekly quiz average", "%"),
        ("activity", "month", "Monthly activity", "events"),
        ("score", "month", "Monthly quiz average", "%"),
        ("activity", "quarter", "Quarterly activity", "events"),
        ("score", "quarter", "Quarterly quiz average", "%"),
    )
    for metric, grain, title, unit in specs:
        keys = _grain_axis(grain, today=end)
        class_values: list[int | float | None] = []
        per: dict[str, list[int | float | None]] = {a: [] for a in ranked}
        for key in keys:
            if metric == "activity":
                total = 0
                for actor in ranked:
                    n = int(activity_buckets[grain].get(actor, {}).get(key) or 0)
                    per[actor].append(n)
                    total += n
                class_values.append(total)
            else:
                acc = 0.0
                n_all = 0
                for actor in ranked:
                    s = score_sum[grain].get(actor, {}).get(key)
                    c = score_n[grain].get(actor, {}).get(key) or 0
                    if c:
                        avg = round(s / c)
                        per[actor].append(avg)
                        acc += s
                        n_all += c
                    else:
                        per[actor].append(None)
                class_values.append(round(acc / n_all) if n_all else None)
        charts.append(
            {
                "id": f"{metric}_{grain}",
                "title": title,
                "grain": grain,
                "metric": metric,
                "unit": unit,
                "keys": keys,
                "labels": [_axis_label(grain, k) for k in keys],
                "class_values": class_values,
                "learners": per,
            }
        )
    return {"learners": learners, "charts": charts}


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

        xapi_rows = conn.execute(
            """
            SELECT actor_sub, verb_id, object_id, created_at
            FROM xapi_statements
            WHERE created_at >= now() - interval '400 days'
            ORDER BY created_at DESC
            LIMIT 8000
            """
        ).fetchall()

        attempt_series = conn.execute(
            """
            SELECT subject, learner_name, score, max_score, created_at
            FROM quiz_attempts
            WHERE created_at >= now() - interval '400 days'
            ORDER BY created_at DESC
            LIMIT 4000
            """
        ).fetchall()

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

    pack = {
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
    statement_rows = [dict(r) for r in (xapi_rows or [])]
    attempt_rows = [dict(r) for r in (attempt_series or [])]
    names: dict[str, str] = {}
    for row in attempt_rows:
        sub = str(row.get("subject") or "").strip()
        label = str(row.get("learner_name") or "").strip()
        if sub and label and sub not in names:
            names[sub] = label
    by_tool = group_progress_by_tool(statement_rows)
    sessions = derive_sessions(statement_rows)[:12]
    durations = [int(s["duration_minutes"]) for s in sessions if s.get("duration_minutes")]
    pack["by_tool"] = by_tool
    pack["sessions"] = sessions
    pack["avg_session_minutes"] = (
        int(round(sum(durations) / len(durations))) if durations else None
    )
    pack["heatmap"] = heatmap_from_rows(statement_rows)
    pack["learner_heatmap"] = learner_date_heatmap(
        statement_rows, days=90, names=names
    )
    pack["time_series"] = learner_time_series(
        statement_rows, attempt_rows, names=names
    )
    pack["charts"]["tool_labels"] = [t["tool"] for t in by_tool[:8]]
    pack["charts"]["tool_attempts"] = [t["attempts"] for t in by_tool[:8]]
    return pack


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
