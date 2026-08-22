"""Unit tests for shared cache packing and rate limits."""
from __future__ import annotations

import os

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("RATE_LIMIT_ENABLED", "1")

from app.launch_cache import MemoryCache, _pack, _unpack
from app.rate_limit import RateLimitMiddleware
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from starlette.testclient import TestClient


def test_pack_unpack_roundtrip():
    for value in ({"a": 1}, ["x", 2], "nonce", 3, True, True):
        assert _unpack(_pack(value)) == value


def test_memory_cache_expiry():
    c = MemoryCache()
    c.set("k", "v", exp=3600)
    assert c.get("k") == "v"
    c.set("k", None)
    assert c.get("k") is None


def test_rate_limit_returns_429():
    async def ok(request):
        return PlainTextResponse("ok")

    app = Starlette(routes=[Route("/onboard", ok)])
    app.add_middleware(
        RateLimitMiddleware,
        enabled=True,
        limits=[("/onboard", 3, 60)],
    )
    client = TestClient(app)
    assert client.get("/onboard").status_code == 200
    assert client.get("/onboard").status_code == 200
    assert client.get("/onboard").status_code == 200
    r = client.get("/onboard")
    assert r.status_code == 429
