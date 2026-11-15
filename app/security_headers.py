"""Baseline security headers for browser responses."""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add conservative headers without breaking LTI iframe embeds."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        # LTI tools often run in LMS iframes — avoid frame-ancestors that break Moodle.
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        # Do not set X-Frame-Options: DENY — Moodle embeds require framing.
        path = request.url.path or ""
        if path.startswith(("/api/", "/admin", "/sales", "/ops")):
            response.headers.setdefault("Cache-Control", "no-store")
        return response
