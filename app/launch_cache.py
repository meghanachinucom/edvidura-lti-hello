"""Launch / OIDC cache — memory L1 + Postgres shared store (multi-instance safe)."""
from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger("edvidura.cache")


class MemoryCache:
    """Minimal cache with get/set matching PyLTI1p3 CacheDataStorage expectations."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float | None]] = {}

    def get(self, key: str) -> Any:
        item = self._store.get(key)
        if item is None:
            return None
        value, expires = item
        if expires is not None and time.time() > expires:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, exp: int | None = None) -> None:
        if value is None:
            self._store.pop(key, None)
            return
        expires = (time.time() + exp) if exp else None
        self._store[key] = (value, expires)


def _pack(value: Any) -> dict[str, Any]:
    if isinstance(value, (dict, list, str, int, float, bool)) or value is None:
        return {"t": "json", "v": value}
    # Fallback: string form (rare for LTI state)
    return {"t": "repr", "v": str(value)}


def _unpack(payload: Any) -> Any:
    if not isinstance(payload, dict):
        return payload
    kind = payload.get("t")
    if kind == "json":
        return payload.get("v")
    if kind == "repr":
        return payload.get("v")
    return payload


class SharedCache:
    """Process memory + Postgres ``shared_cache`` table.

    All app instances sharing DATABASE_URL see the same LTI nonce/state keys.
    Memory L1 avoids a DB round-trip on hot same-worker paths.
    """

    def __init__(self) -> None:
        self._local = MemoryCache()
        self._db_ok = True
        self._last_prune = 0.0

    @property
    def backend(self) -> str:
        return "memory+postgres" if self._db_ok else "memory-only"

    def get(self, key: str) -> Any:
        local = self._local.get(key)
        if local is not None:
            return local
        if not self._db_ok:
            return None
        try:
            from app import db

            with db.connect() as conn:
                row = conn.execute(
                    """
                    SELECT payload
                    FROM shared_cache
                    WHERE cache_key = %s
                      AND (expires_at IS NULL OR expires_at > now())
                    """,
                    (key,),
                ).fetchone()
            if not row:
                return None
            value = _unpack(row["payload"])
            # Warm L1 briefly (60s) — expiry still enforced by DB on next miss
            self._local.set(key, value, exp=60)
            return value
        except Exception as exc:  # noqa: BLE001
            self._db_ok = False
            logger.warning("shared_cache get failed; falling back to memory: %s", exc)
            return None

    def set(self, key: str, value: Any, exp: int | None = None) -> None:
        self._local.set(key, value, exp=exp)
        if value is None:
            self._delete_db(key)
            return
        if not self._db_ok:
            return
        try:
            from app import db

            payload = json.dumps(_pack(value))
            with db.connect() as conn:
                with conn.transaction():
                    if exp:
                        conn.execute(
                            """
                            INSERT INTO shared_cache (cache_key, payload, expires_at)
                            VALUES (%s, %s::jsonb, now() + (%s || ' seconds')::interval)
                            ON CONFLICT (cache_key) DO UPDATE SET
                                payload = EXCLUDED.payload,
                                expires_at = EXCLUDED.expires_at
                            """,
                            (key, payload, str(int(exp))),
                        )
                    else:
                        conn.execute(
                            """
                            INSERT INTO shared_cache (cache_key, payload, expires_at)
                            VALUES (%s, %s::jsonb, NULL)
                            ON CONFLICT (cache_key) DO UPDATE SET
                                payload = EXCLUDED.payload,
                                expires_at = NULL
                            """,
                            (key, payload),
                        )
            self._maybe_prune()
            self._db_ok = True
        except Exception as exc:  # noqa: BLE001
            self._db_ok = False
            logger.warning("shared_cache set failed; memory-only: %s", exc)

    def _delete_db(self, key: str) -> None:
        if not self._db_ok:
            return
        try:
            from app import db

            with db.connect() as conn:
                with conn.transaction():
                    conn.execute(
                        "DELETE FROM shared_cache WHERE cache_key = %s", (key,)
                    )
        except Exception:  # noqa: BLE001
            pass

    def _maybe_prune(self) -> None:
        now = time.time()
        if now - self._last_prune < 300:
            return
        self._last_prune = now
        try:
            from app import db

            with db.connect() as conn:
                with conn.transaction():
                    conn.execute(
                        """
                        DELETE FROM shared_cache
                        WHERE expires_at IS NOT NULL AND expires_at < now()
                        """
                    )
        except Exception:  # noqa: BLE001
            pass


def build_launch_cache() -> MemoryCache | SharedCache:
    """Prefer shared Postgres cache; fall back to memory if table missing."""
    try:
        from app import db

        with db.connect() as conn:
            row = conn.execute(
                "SELECT to_regclass('public.shared_cache') IS NOT NULL AS ok"
            ).fetchone()
        if row and row["ok"]:
            return SharedCache()
    except Exception as exc:  # noqa: BLE001
        logger.warning("shared_cache unavailable at boot: %s", exc)
    return MemoryCache()


# Process-wide so /lti/login and /lti/launch share state/nonce (and across workers via DB)
LAUNCH_CACHE = build_launch_cache()
