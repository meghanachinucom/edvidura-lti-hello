"""Structured request logging with optional tenant_id."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.tenant_context import get_tenant_context

logger = logging.getLogger("edvidura.request")


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        start = time.perf_counter()
        response: Response | None = None
        err: Exception | None = None
        try:
            response = await call_next(request)
            return response
        except Exception as exc:  # noqa: BLE001
            err = exc
            raise
        finally:
            duration_ms = int((time.perf_counter() - start) * 1000)
            ctx = get_tenant_context()
            tenant_id = str(ctx.tenant_id) if ctx else None
            status = getattr(response, "status_code", 500 if err else 0)
            logger.info(
                "request",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": status,
                    "duration_ms": duration_ms,
                    "tenant_id": tenant_id,
                },
            )
            if response is not None:
                response.headers["X-Request-Id"] = request_id
