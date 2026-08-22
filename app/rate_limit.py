"""Simple shared rate limiting (memory + shared_cache when available)."""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("edvidura.ratelimit")

# path prefix -> (max_requests, window_seconds)
DEFAULT_LIMITS: list[tuple[str, int, int]] = [
    ("/lti/login", 60, 60),
    ("/lti/launch", 120, 60),
    ("/lti/register", 30, 60),
    ("/onboard", 40, 60),
    ("/auth/login", 30, 60),
    ("/admin/", 60, 60),
    ("/api/v1/", 60, 60),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        *,
        enabled: bool = True,
        limits: list[tuple[str, int, int]] | None = None,
    ):
        super().__init__(app)
        self.enabled = enabled
        self.limits = limits or DEFAULT_LIMITS
        self._local: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _match(self, path: str) -> tuple[int, int] | None:
        for prefix, max_req, window in self.limits:
            if path == prefix or path.startswith(prefix):
                return max_req, window
        return None

    def _client_key(self, request: Request, prefix: str) -> str:
        fwd = request.headers.get("x-forwarded-for") or ""
        ip = (fwd.split(",")[0].strip() if fwd else "") or (
            request.client.host if request.client else "unknown"
        )
        return f"rl:{prefix}:{ip}"

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self.enabled:
            return await call_next(request)
        path = request.url.path
        matched = None
        matched_prefix = ""
        for prefix, max_req, window in self.limits:
            if path == prefix or path.startswith(prefix):
                matched = (max_req, window)
                matched_prefix = prefix
                break
        if not matched:
            return await call_next(request)

        max_req, window = matched
        key = self._client_key(request, matched_prefix)
        now = time.time()
        allowed = self._allow(key, max_req, window, now)
        if not allowed:
            logger.warning("rate_limit path=%s key=%s", path, key)
            return JSONResponse(
                {"ok": False, "error": "Rate limit exceeded. Try again shortly."},
                status_code=429,
                headers={"Retry-After": str(window)},
            )
        return await call_next(request)

    def _allow(self, key: str, max_req: int, window: int, now: float) -> bool:
        # Prefer shared cache so multiple workers share the bucket.
        try:
            from app.launch_cache import LAUNCH_CACHE

            raw = LAUNCH_CACHE.get(key)
            stamps: list[float]
            if isinstance(raw, list):
                stamps = [float(x) for x in raw]
            else:
                stamps = []
            stamps = [t for t in stamps if now - t < window]
            if len(stamps) >= max_req:
                LAUNCH_CACHE.set(key, stamps, exp=window)
                return False
            stamps.append(now)
            LAUNCH_CACHE.set(key, stamps, exp=window)
            return True
        except Exception:  # noqa: BLE001
            pass

        with self._lock:
            stamps = [t for t in self._local[key] if now - t < window]
            if len(stamps) >= max_req:
                self._local[key] = stamps
                return False
            stamps.append(now)
            self._local[key] = stamps
            return True
