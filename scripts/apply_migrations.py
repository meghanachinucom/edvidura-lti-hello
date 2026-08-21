#!/usr/bin/env python3
"""Apply init.sql + migration_*.sql in a fixed order.

Tracks applied files in schema_migrations. Fails on unexpected SQL errors.
Idempotent Postgres errors (already exists / duplicate) are allowed when
re-running a file that was interrupted mid-way.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "db"

# Single source of truth — keep CI / Railway in sync via this list.
MIGRATIONS = [
    "init.sql",
    "migration_platform_last_launch.sql",
    "migration_course_content.sql",
    "migration_school_org.sql",
    "migration_school_admins.sql",
    "migration_lesson_workflow.sql",
    "migration_event_outbox.sql",
    "migration_manuals.sql",
    "migration_xapi_statements.sql",
    "migration_specials.sql",
    "migration_quiz_attempts.sql",
    "migration_launch_snapshots.sql",
    "migration_bi_views.sql",
    "migration_xapi_tiers.sql",
    "migration_lti_dynreg.sql",
]

# Postgres SQLSTATE values that mean "already applied" / safe to continue.
_IDEMPOTENT = frozenset(
    {
        "42P07",  # duplicate_table
        "42710",  # duplicate_object
        "42701",  # duplicate_column
        "42P06",  # duplicate_schema
        "42723",  # duplicate_function
        "42712",  # duplicate_alias
        "23505",  # unique_violation (seed upserts)
        "23503",  # foreign_key_violation (partial seed re-run)
        "42P16",  # invalid_table_definition (some IF NOT EXISTS races)
    }
)


def _normalize_dsn(url: str) -> str:
    u = (url or "").strip()
    if u.startswith("postgres://"):
        u = "postgresql://" + u[len("postgres://") :]
    return u


def _statements(sql: str) -> list[str]:
    """Split on semicolons outside quotes, dollar-quotes, and comments."""
    stmts: list[str] = []
    buf: list[str] = []
    i = 0
    n = len(sql)
    in_single = False
    in_line_comment = False
    in_block_comment = False
    dollar_tag: str | None = None

    def flush() -> None:
        stmt = "".join(buf).strip()
        buf.clear()
        if not stmt:
            return
        meaningful = [
            ln
            for ln in stmt.splitlines()
            if ln.strip() and not ln.strip().startswith("--")
        ]
        if meaningful:
            stmts.append(stmt)

    while i < n:
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < n else ""

        if in_line_comment:
            buf.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            buf.append(ch)
            if ch == "*" and nxt == "/":
                buf.append("/")
                i += 2
                in_block_comment = False
                continue
            i += 1
            continue

        if dollar_tag is not None:
            if sql.startswith(dollar_tag, i):
                buf.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
            buf.append(ch)
            i += 1
            continue

        if in_single:
            buf.append(ch)
            if ch == "'" and nxt == "'":
                buf.append("'")
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue

        if ch == "-" and nxt == "-":
            in_line_comment = True
            buf.append(ch)
            i += 1
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            buf.append(ch)
            i += 1
            continue

        if ch == "$":
            m = re.match(r"\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$", sql[i:])
            if m:
                dollar_tag = m.group(0)
                buf.append(dollar_tag)
                i += len(dollar_tag)
                continue

        if ch == "'":
            in_single = True
            buf.append(ch)
            i += 1
            continue

        if ch == ";":
            flush()
            i += 1
            continue

        buf.append(ch)
        i += 1

    flush()
    return stmts


def _ensure_registry(conn) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def _already_applied(conn, name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM schema_migrations WHERE filename = %s",
        (name,),
    ).fetchone()
    return row is not None


def _mark_applied(conn, name: str) -> None:
    conn.execute(
        """
        INSERT INTO schema_migrations (filename)
        VALUES (%s)
        ON CONFLICT (filename) DO NOTHING
        """,
        (name,),
    )


def _sqlstate(exc: BaseException) -> str | None:
    # psycopg.Error has .sqlstate
    return getattr(exc, "sqlstate", None)


def main() -> int:
    dsn = _normalize_dsn(os.getenv("DATABASE_URL", ""))
    if not dsn:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1

    strict = os.getenv("MIGRATE_STRICT", "1").strip().lower() not in {
        "0",
        "false",
        "no",
        "off",
    }

    try:
        import psycopg
    except ImportError:
        print("psycopg is required", file=sys.stderr)
        return 1

    hard_fail = 0
    with psycopg.connect(dsn, autocommit=True) as conn:
        _ensure_registry(conn)
        for name in MIGRATIONS:
            path = DB / name
            if not path.exists():
                print(f"ERROR: required migration missing: {name}", file=sys.stderr)
                return 1
            if _already_applied(conn, name):
                print(f"skip applied {name}")
                continue
            # Fresh installs need init.sql; existing local/Railway DBs already have it.
            if name == "init.sql":
                row = conn.execute(
                    "SELECT to_regclass('public.tenants') IS NOT NULL"
                ).fetchone()
                if row and row[0]:
                    print("skip init.sql (tenants already present) — baselining")
                    _mark_applied(conn, name)
                    continue
            print(f"apply {name}…")
            sql = path.read_text(encoding="utf-8")
            ok = soft = 0
            for stmt in _statements(sql):
                try:
                    conn.execute(stmt)
                    ok += 1
                except Exception as exc:  # noqa: BLE001
                    code = _sqlstate(exc)
                    msg = str(exc).split("\n")[0]
                    if code in _IDEMPOTENT:
                        soft += 1
                        print(f"  idempotent ({code}): {msg}")
                        continue
                    hard_fail += 1
                    print(f"  ERROR ({code or '?'}): {msg}", file=sys.stderr)
                    if strict:
                        print(
                            f"Stopped on {name}. Fix SQL or set MIGRATE_STRICT=0 "
                            "(not recommended).",
                            file=sys.stderr,
                        )
                        return 1
            _mark_applied(conn, name)
            print(f"  done ({ok} ok, {soft} idempotent)")
    if hard_fail:
        print(f"migrations finished with {hard_fail} soft-failed statements", file=sys.stderr)
        return 1
    print("migrations finished")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
