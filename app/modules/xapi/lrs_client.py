"""LRS HTTP client — portable (no DB imports).

Supports generic xAPI 1.0.3 Basic-Auth LRS and **Yet Analytics SQL LRS**
(`yetanalytics/lrsql`): endpoint ``…/xapi``, statements ``…/xapi/statements``.

Docs: https://yetanalytics.github.io/lrsql/
"""
from __future__ import annotations

import base64
import logging
import time
from typing import Any, Literal
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

Provider = Literal["yet", "generic", "auto"]

# Yet SQL LRS accepts 200 with a JSON array of statement UUIDs on POST.
_OK_STATUS = frozenset({200, 204})


def normalize_statements_url(endpoint: str, *, provider: Provider = "auto") -> str:
    """Return the absolute Statements resource URL.

    Accepts:
      - ``https://host:8080/xapi``
      - ``https://host:8080/xapi/statements``
      - ``https://host:8080`` (Yet → append ``/xapi/statements``)
    """
    raw = (endpoint or "").strip().rstrip("/")
    if not raw:
        return ""
    lower = raw.lower()
    if lower.endswith("/statements"):
        return raw
    if lower.endswith("/xapi"):
        return f"{raw}/statements"
    prov = detect_provider(raw, provider)
    if prov == "yet":
        return f"{raw}/xapi/statements"
    return f"{raw}/statements"


def detect_provider(endpoint: str, provider: Provider = "auto") -> Provider:
    if provider in {"yet", "generic"}:
        return provider
    lower = (endpoint or "").lower()
    if "lrsql" in lower or "/xapi" in lower or ":8080" in lower:
        # Heuristic only; callers should set XAPI_LRS_PROVIDER=yet explicitly.
        if "lrsql" in lower or lower.rstrip("/").endswith("/xapi"):
            return "yet"
    return "generic"


def basic_auth_header(key: str, secret: str) -> str:
    token = base64.b64encode(f"{key}:{secret}".encode()).decode()
    return f"Basic {token}"


def xapi_headers(key: str, secret: str) -> dict[str, str]:
    return {
        "Authorization": basic_auth_header(key, secret),
        "X-Experience-API-Version": "1.0.3",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def post_statement(
    statement: dict[str, Any],
    *,
    endpoint: str,
    key: str,
    secret: str,
    provider: Provider = "auto",
    retries: int = 3,
    timeout: float = 12.0,
) -> tuple[bool, str | None, int, dict[str, Any]]:
    """POST one statement. Returns (ok, error, attempts, meta)."""
    url = normalize_statements_url(endpoint, provider=provider)
    if not url:
        return False, None, 0, {"skipped": True}
    if not key or not secret:
        return False, "LRS key/secret missing", 0, {}
    headers = xapi_headers(key, secret)
    last_err: str | None = None
    attempts = 0
    meta: dict[str, Any] = {
        "url": url,
        "provider": detect_provider(endpoint, provider),
    }
    for i in range(max(1, retries)):
        attempts = i + 1
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(url, headers=headers, json=statement)
            meta["status_code"] = resp.status_code
            if resp.status_code in _OK_STATUS:
                # Yet SQL LRS returns [uuid, …]
                try:
                    body = resp.json()
                    meta["response"] = body
                except Exception:  # noqa: BLE001
                    meta["response"] = (resp.text or "")[:200]
                return True, None, attempts, meta
            last_err = f"LRS HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as exc:  # noqa: BLE001
            last_err = str(exc)
            logger.warning("LRS forward attempt %s failed: %s", attempts, exc)
        if i + 1 < retries:
            time.sleep(0.4 * (2**i))
    return False, last_err, attempts, meta


def probe_lrs(
    *,
    endpoint: str,
    key: str,
    secret: str,
    provider: Provider = "auto",
    timeout: float = 8.0,
) -> dict[str, Any]:
    """Lightweight connectivity check (GET statements?limit=1)."""
    base = (endpoint or "").strip().rstrip("/")
    if not base:
        return {
            "configured": False,
            "ok": False,
            "provider": provider,
            "detail": "XAPI_LRS_ENDPOINT empty",
        }
    url = normalize_statements_url(base, provider=provider)
    if not key or not secret:
        return {
            "configured": True,
            "ok": False,
            "provider": detect_provider(base, provider),
            "statements_url": url,
            "detail": "XAPI_LRS_KEY / XAPI_LRS_SECRET missing",
        }
    headers = xapi_headers(key, secret)
    # GET with limit=0/1 — Yet and most LRS support statement query.
    get_url = url + ("&" if "?" in url else "?") + "limit=1"
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(get_url, headers=headers)
        ok = resp.status_code in {200, 204}
        return {
            "configured": True,
            "ok": ok,
            "provider": detect_provider(base, provider),
            "statements_url": url,
            "status_code": resp.status_code,
            "host": urlparse(url).netloc,
            "detail": None if ok else (resp.text or "")[:200],
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "configured": True,
            "ok": False,
            "provider": detect_provider(base, provider),
            "statements_url": url,
            "detail": str(exc),
        }
