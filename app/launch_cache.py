"""In-memory launch data cache for local HTTP LTI (cross-site cookies don't work)."""
from __future__ import annotations

import time
from typing import Any


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


# Process-wide so /lti/login and /lti/launch share state/nonce
LAUNCH_CACHE = MemoryCache()
