"""Portable launch/quiz session context store (memory cache + Postgres).

Inject ``cache_get`` / ``cache_set`` to avoid coupling to EdVidura's LAUNCH_CACHE
when reusing in another project.
"""
from __future__ import annotations

from typing import Any, Callable
from uuid import uuid4

from app import db

CTX_PREFIX = "quizctx:"

CacheGet = Callable[[str], Any]
CacheSet = Callable[..., None]


def store_context(
    data: dict[str, Any],
    *,
    ttl_sec: int = 3600,
    cache_set: CacheSet | None = None,
    token: str | None = None,
) -> str:
    tok = (token or uuid4().hex).strip() or uuid4().hex
    payload = {**dict(data), "quiz_token": tok}
    if cache_set is not None:
        try:
            cache_set(f"{CTX_PREFIX}{tok}", payload, exp=ttl_sec)
        except TypeError:
            cache_set(f"{CTX_PREFIX}{tok}", payload)
    try:
        db.save_quiz_context(tok, payload, ttl_sec=ttl_sec)
    except Exception:  # noqa: BLE001
        pass
    return tok


def load_context(
    token: str | None,
    *,
    cache_get: CacheGet | None = None,
    cache_set: CacheSet | None = None,
    ttl_sec: int = 3600,
) -> dict[str, Any] | None:
    if not token:
        return None
    key = f"{CTX_PREFIX}{token}"
    if cache_get is not None:
        data = cache_get(key)
        if isinstance(data, dict):
            return dict(data)
    try:
        data = db.get_quiz_context(token)
    except Exception:  # noqa: BLE001
        return None
    if isinstance(data, dict):
        if cache_set is not None:
            try:
                cache_set(key, data, exp=ttl_sec)
            except TypeError:
                cache_set(key, data)
        return dict(data)
    return None


def persist_context(
    token: str,
    data: dict[str, Any],
    *,
    ttl_sec: int = 3600,
    cache_set: CacheSet | None = None,
) -> None:
    payload = {**dict(data), "quiz_token": token}
    if cache_set is not None:
        try:
            cache_set(f"{CTX_PREFIX}{token}", payload, exp=ttl_sec)
        except TypeError:
            cache_set(f"{CTX_PREFIX}{token}", payload)
    try:
        db.save_quiz_context(token, payload, ttl_sec=ttl_sec)
    except Exception:  # noqa: BLE001
        pass


__all__ = [
    "CTX_PREFIX",
    "load_context",
    "persist_context",
    "store_context",
]
