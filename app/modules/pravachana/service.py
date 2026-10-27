"""Government pravachana catalogue — video library, progress, notes, dept stats.

Not a school module: no classes, quizzes, or Moodle. Tenant-scoped via RLS.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db

_MAX_NOTE = 4000
_PACKS = frozenset({"public", "no_bag_day", "library_hour"})


def _tid(tenant_id: UUID | str) -> str:
    return str(tenant_id)


def upsert_series(
    tenant_id: UUID | str,
    *,
    slug: str,
    title_te: str,
    title_en: str = "",
    description_te: str = "",
    description_en: str = "",
    scripture: str = "",
    cover_url: str = "",
    position: int = 0,
) -> dict[str, Any]:
    tid = _tid(tenant_id)
    slug_s = (slug or "").strip()[:80]
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            INSERT INTO pravachana_series (
                tenant_id, slug, title_te, title_en, description_te,
                description_en, scripture, cover_url, position
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tenant_id, slug) DO UPDATE SET
                title_te = EXCLUDED.title_te,
                title_en = EXCLUDED.title_en,
                description_te = EXCLUDED.description_te,
                description_en = EXCLUDED.description_en,
                scripture = EXCLUDED.scripture,
                cover_url = EXCLUDED.cover_url,
                position = EXCLUDED.position
            RETURNING id, slug, title_te, title_en, description_te,
                      description_en, scripture, cover_url, position
            """,
            (
                tid,
                slug_s,
                title_te.strip(),
                (title_en or title_te).strip(),
                description_te,
                description_en,
                scripture,
                cover_url,
                int(position),
            ),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        return item


def upsert_episode(
    tenant_id: UUID | str,
    *,
    series_id: UUID | str,
    slug: str,
    title_te: str,
    title_en: str = "",
    stream_url: str,
    position: int = 0,
    duration_sec: int = 0,
    source: str = "file",
    language: str = "te-IN",
    pack: str = "public",
    featured: bool = False,
    cover_url: str = "",
    transcript_sa: str = "",
    transcript_te: str = "",
    meaning_en: str = "",
    demo: bool = True,
) -> dict[str, Any]:
    tid = _tid(tenant_id)
    pack_s = pack if pack in _PACKS else "public"
    src = source if source in {"file", "hls", "youtube"} else "file"
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            INSERT INTO pravachana_episodes (
                tenant_id, series_id, slug, position, title_te, title_en,
                duration_sec, stream_url, source, language, pack, featured,
                cover_url, transcript_sa, transcript_te, meaning_en, demo
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            ON CONFLICT (tenant_id, slug) DO UPDATE SET
                series_id = EXCLUDED.series_id,
                position = EXCLUDED.position,
                title_te = EXCLUDED.title_te,
                title_en = EXCLUDED.title_en,
                duration_sec = EXCLUDED.duration_sec,
                stream_url = EXCLUDED.stream_url,
                source = EXCLUDED.source,
                language = EXCLUDED.language,
                pack = EXCLUDED.pack,
                featured = EXCLUDED.featured,
                cover_url = EXCLUDED.cover_url,
                transcript_sa = EXCLUDED.transcript_sa,
                transcript_te = EXCLUDED.transcript_te,
                meaning_en = EXCLUDED.meaning_en,
                demo = EXCLUDED.demo,
                published = true
            RETURNING id, series_id, slug, position, title_te, title_en,
                      duration_sec, stream_url, source, language, pack,
                      featured, published, cover_url, transcript_sa,
                      transcript_te, meaning_en, demo
            """,
            (
                tid,
                str(series_id),
                (slug or "").strip()[:80],
                int(position),
                title_te.strip(),
                (title_en or title_te).strip(),
                int(duration_sec or 0),
                (stream_url or "").strip(),
                src,
                language or "te-IN",
                pack_s,
                bool(featured),
                cover_url,
                transcript_sa,
                transcript_te,
                meaning_en,
                bool(demo),
            ),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        item["series_id"] = str(item["series_id"])
        return item


def _progress_map(
    conn: Any, subject: str
) -> dict[str, dict[str, Any]]:
    if not subject:
        return {}
    rows = conn.execute(
        """
        SELECT episode_id, position_sec, duration_sec, completed, play_count
        FROM pravachana_progress
        WHERE subject = %s
        """,
        (subject,),
    ).fetchall()
    out: dict[str, dict[str, Any]] = {}
    for r in rows:
        item = dict(r)
        eid = str(item.pop("episode_id"))
        out[eid] = item
    return out


def catalog(
    tenant_id: UUID | str,
    *,
    subject: str = "",
    query: str = "",
    pack: str = "",
) -> dict[str, Any]:
    tid = _tid(tenant_id)
    q = (query or "").strip()
    pack_s = pack if pack in _PACKS else ""
    with db.tenant_connection(tid) as conn:
        series_rows = conn.execute(
            """
            SELECT id, slug, title_te, title_en, description_te, description_en,
                   scripture, cover_url, position
            FROM pravachana_series
            ORDER BY position, title_en
            """
        ).fetchall()
        ep_sql = """
            SELECT id, series_id, slug, position, title_te, title_en,
                   duration_sec, stream_url, source, language, pack, featured,
                   published, cover_url, transcript_sa, transcript_te,
                   meaning_en, demo
            FROM pravachana_episodes
            WHERE published = true
        """
        params: list[Any] = []
        if pack_s:
            ep_sql += " AND pack = %s"
            params.append(pack_s)
        if q:
            ep_sql += """
                AND (
                    title_te ILIKE %s OR title_en ILIKE %s
                    OR transcript_te ILIKE %s OR meaning_en ILIKE %s
                    OR transcript_sa ILIKE %s
                )
            """
            like = f"%{q}%"
            params.extend([like, like, like, like, like])
        ep_sql += " ORDER BY position, title_en"
        episodes = [dict(r) for r in conn.execute(ep_sql, tuple(params)).fetchall()]
        prog = _progress_map(conn, subject)

    featured = None
    by_series: dict[str, list[dict[str, Any]]] = {}
    cards = []
    for raw in episodes:
        item = _episode_card(raw, prog.get(str(raw["id"])))
        cards.append(item)
        by_series.setdefault(str(raw["series_id"]), []).append(item)
        if item.get("featured") and featured is None:
            featured = item
    if featured is None and cards:
        featured = cards[0]

    series_out = []
    for s in series_rows:
        sid = str(s["id"])
        eps = by_series.get(sid) or []
        if q and not eps:
            continue
        series_out.append(
            {
                "id": sid,
                "slug": s["slug"],
                "title_te": s["title_te"],
                "title_en": s["title_en"],
                "description_te": s["description_te"],
                "description_en": s["description_en"],
                "scripture": s["scripture"],
                "cover_url": s["cover_url"],
                "episode_count": len(eps),
                "episodes": eps,
            }
        )
    return {
        "featured": featured,
        "series": series_out,
        "episodes": cards,
        "count": len(cards),
    }


def get_episode(
    tenant_id: UUID | str,
    episode_id: UUID | str,
    *,
    subject: str = "",
) -> dict[str, Any] | None:
    tid = _tid(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            SELECT e.id, e.series_id, e.slug, e.position, e.title_te, e.title_en,
                   e.duration_sec, e.stream_url, e.source, e.language, e.pack,
                   e.featured, e.published, e.cover_url, e.transcript_sa,
                   e.transcript_te, e.meaning_en, e.demo,
                   s.title_te AS series_title_te, s.title_en AS series_title_en,
                   s.slug AS series_slug, s.scripture
            FROM pravachana_episodes e
            JOIN pravachana_series s ON s.id = e.series_id
            WHERE e.id = %s AND e.published = true
            """,
            (str(episode_id),),
        ).fetchone()
        if not row:
            return None
        prog = _progress_map(conn, subject)
        neighbors = conn.execute(
            """
            SELECT id, slug, title_te, title_en, position
            FROM pravachana_episodes
            WHERE series_id = %s AND published = true
            ORDER BY position
            """,
            (str(row["series_id"]),),
        ).fetchall()
    card = _episode_card(dict(row), prog.get(str(row["id"])))
    card["series_title_te"] = row["series_title_te"]
    card["series_title_en"] = row["series_title_en"]
    card["series_slug"] = row["series_slug"]
    card["scripture"] = row["scripture"]
    card["transcript_sa"] = row["transcript_sa"]
    card["transcript_te"] = row["transcript_te"]
    card["meaning_en"] = row["meaning_en"]
    seq = [dict(n) for n in neighbors]
    for n in seq:
        n["id"] = str(n["id"])
    idx = next((i for i, n in enumerate(seq) if n["id"] == card["id"]), -1)
    card["prev"] = seq[idx - 1] if idx > 0 else None
    card["next"] = seq[idx + 1] if 0 <= idx < len(seq) - 1 else None
    return card


def record_progress(
    tenant_id: UUID | str,
    *,
    episode_id: UUID | str,
    subject: str,
    learner_name: str = "",
    position_sec: int = 0,
    duration_sec: int = 0,
    completed: bool = False,
) -> dict[str, Any]:
    tid = _tid(tenant_id)
    eid = str(episode_id)
    sub = (subject or "").strip()[:200]
    if not sub:
        raise ValueError("subject required")
    pos = max(0, int(position_sec or 0))
    dur = max(0, int(duration_sec or 0))
    done = bool(completed) or (dur > 0 and pos >= max(dur * 0.9, dur - 5))
    with db.tenant_connection(tid) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pravachana_episodes WHERE id = %s AND published = true",
            (eid,),
        ).fetchone()
        if not exists:
            raise ValueError("Episode not found")
        row = conn.execute(
            """
            INSERT INTO pravachana_progress (
                tenant_id, episode_id, subject, learner_name,
                position_sec, duration_sec, completed, play_count
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 1)
            ON CONFLICT (tenant_id, episode_id, subject) DO UPDATE SET
                position_sec = GREATEST(pravachana_progress.position_sec, EXCLUDED.position_sec),
                duration_sec = GREATEST(pravachana_progress.duration_sec, EXCLUDED.duration_sec),
                completed = pravachana_progress.completed OR EXCLUDED.completed,
                learner_name = COALESCE(NULLIF(EXCLUDED.learner_name, ''), pravachana_progress.learner_name),
                play_count = pravachana_progress.play_count
                    + CASE WHEN EXCLUDED.position_sec <= 3 THEN 1 ELSE 0 END,
                updated_at = now()
            RETURNING episode_id, position_sec, duration_sec, completed, play_count
            """,
            (tid, eid, sub, (learner_name or "").strip()[:120], pos, dur, done),
        ).fetchone()
        item = dict(row)
        item["episode_id"] = str(item["episode_id"])
        return item


def list_notes(
    tenant_id: UUID | str, episode_id: UUID | str, *, limit: int = 80
) -> list[dict[str, Any]]:
    tid = _tid(tenant_id)
    with db.tenant_connection(tid) as conn:
        rows = conn.execute(
            """
            SELECT id, author_subject, author_name, body, created_at
            FROM pravachana_notes
            WHERE episode_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (str(episode_id), max(1, min(int(limit), 200))),
        ).fetchall()
    out = []
    for r in rows:
        item = dict(r)
        item["id"] = str(item["id"])
        out.append(item)
    return out


def add_note(
    tenant_id: UUID | str,
    *,
    episode_id: UUID | str,
    author_subject: str,
    author_name: str,
    body: str,
) -> dict[str, Any]:
    text = (body or "").strip()
    if not text:
        raise ValueError("Message required")
    if len(text) > _MAX_NOTE:
        raise ValueError(f"Message too long (max {_MAX_NOTE})")
    tid = _tid(tenant_id)
    with db.tenant_connection(tid) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pravachana_episodes WHERE id = %s AND published = true",
            (str(episode_id),),
        ).fetchone()
        if not exists:
            raise ValueError("Episode not found")
        row = conn.execute(
            """
            INSERT INTO pravachana_notes (
                tenant_id, episode_id, author_subject, author_name, body
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, author_subject, author_name, body, created_at
            """,
            (
                tid,
                str(episode_id),
                (author_subject or "").strip()[:200],
                (author_name or "Citizen").strip()[:120],
                text,
            ),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        return item


def learner_progress(
    tenant_id: UUID | str, subject: str
) -> dict[str, Any]:
    tid = _tid(tenant_id)
    with db.tenant_connection(tid) as conn:
        total = conn.execute(
            "SELECT COUNT(*) AS n FROM pravachana_episodes WHERE published = true"
        ).fetchone()
        done = conn.execute(
            """
            SELECT COUNT(*) AS n FROM pravachana_progress
            WHERE subject = %s AND completed = true
            """,
            (subject,),
        ).fetchone()
        recent = conn.execute(
            """
            SELECT p.episode_id, p.position_sec, p.completed, p.updated_at,
                   e.title_te, e.title_en, e.cover_url, e.duration_sec
            FROM pravachana_progress p
            JOIN pravachana_episodes e ON e.id = p.episode_id
            WHERE p.subject = %s
            ORDER BY p.updated_at DESC
            LIMIT 8
            """,
            (subject,),
        ).fetchall()
    total_n = int((total or {}).get("n") or 0)
    done_n = int((done or {}).get("n") or 0)
    rows = []
    for r in recent:
        item = dict(r)
        item["episode_id"] = str(item["episode_id"])
        rows.append(item)
    return {
        "completed_count": done_n,
        "total_count": total_n,
        "percent": int(round(100 * done_n / total_n)) if total_n else 0,
        "recent": rows,
    }


def dept_stats(tenant_id: UUID | str) -> dict[str, Any]:
    tid = _tid(tenant_id)
    with db.tenant_connection(tid) as conn:
        totals = conn.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM pravachana_episodes WHERE published) AS episodes,
              (SELECT COUNT(*) FROM pravachana_progress) AS watches,
              (SELECT COUNT(*) FROM pravachana_progress WHERE completed) AS completed,
              (SELECT COUNT(DISTINCT subject) FROM pravachana_progress) AS viewers
            """
        ).fetchone()
        by_ep = conn.execute(
            """
            SELECT e.id, e.title_te, e.title_en, e.pack, e.featured,
                   COALESCE(SUM(p.play_count), 0)::int AS plays,
                   COUNT(p.id)::int AS viewers,
                   COALESCE(SUM(CASE WHEN p.completed THEN 1 ELSE 0 END), 0)::int AS completed
            FROM pravachana_episodes e
            LEFT JOIN pravachana_progress p ON p.episode_id = e.id
            WHERE e.published
            GROUP BY e.id
            ORDER BY plays DESC, e.position
            """
        ).fetchall()
    episodes = []
    for r in by_ep:
        item = dict(r)
        item["id"] = str(item["id"])
        episodes.append(item)
    t = dict(totals or {})
    return {
        "episodes": int(t.get("episodes") or 0),
        "watches": int(t.get("watches") or 0),
        "completed": int(t.get("completed") or 0),
        "viewers": int(t.get("viewers") or 0),
        "by_episode": episodes,
    }


def _episode_card(
    raw: dict[str, Any], progress: dict[str, Any] | None
) -> dict[str, Any]:
    eid = str(raw["id"])
    prog = progress or {}
    return {
        "id": eid,
        "series_id": str(raw.get("series_id") or ""),
        "slug": raw.get("slug"),
        "position": int(raw.get("position") or 0),
        "title_te": raw.get("title_te") or "",
        "title_en": raw.get("title_en") or "",
        "duration_sec": int(raw.get("duration_sec") or 0),
        "stream_url": raw.get("stream_url") or "",
        "source": raw.get("source") or "file",
        "language": raw.get("language") or "te-IN",
        "pack": raw.get("pack") or "public",
        "featured": bool(raw.get("featured")),
        "cover_url": raw.get("cover_url") or "",
        "demo": bool(raw.get("demo", True)),
        "progress": {
            "position_sec": int(prog.get("position_sec") or 0),
            "duration_sec": int(prog.get("duration_sec") or raw.get("duration_sec") or 0),
            "completed": bool(prog.get("completed")),
            "play_count": int(prog.get("play_count") or 0),
        }
        if prog
        else None,
    }
