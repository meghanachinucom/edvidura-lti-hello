"""Boot-time production safety checks."""
from __future__ import annotations

from fastapi import HTTPException, Request, status

from app.settings import Settings, get_settings

_WEAK_SESSION_SECRETS = frozenset(
    {
        "",
        "dev-only-change-me",
        "change-me-to-a-long-random-string",
        "change-me",
        "secret",
    }
)
_WEAK_ADMIN_KEYS = frozenset(
    {
        "",
        "dev-admin-change-me",
        "test-admin-key",
        "admin",
        "changeme",
    }
)


def assert_airgap_safe(settings: Settings | None = None) -> None:
    """When AIRGAP=1, refuse cloud egress credentials and force local AI posture."""
    s = settings or get_settings()
    if not s.airgap:
        return
    problems: list[str] = []
    if s.openai_api_key:
        problems.append("AIRGAP=1 but OPENAI_API_KEY is set — unset cloud OpenAI")
    if s.anthropic_api_key:
        problems.append("AIRGAP=1 but ANTHROPIC_API_KEY is set — unset cloud Anthropic")
    if s.typesafe_api_key or s.jev_enabled:
        problems.append("AIRGAP=1 — set JEV_ENABLED=0 and unset TYPESAFE_API_KEY")
    if s.sentry_dsn and "sentry.io" in s.sentry_dsn.lower():
        problems.append("AIRGAP=1 but cloud SENTRY_DSN is set — unset or use LAN sink")
    if s.xapi_lrs_endpoint and (
        s.xapi_lrs_endpoint.startswith("https://")
        and "localhost" not in s.xapi_lrs_endpoint
        and ".internal" not in s.xapi_lrs_endpoint
    ):
        problems.append(
            "AIRGAP=1 but XAPI_LRS_ENDPOINT looks like a public URL — use LAN LRS or unset"
        )
    if s.ai_enabled and s.ai_provider in {"openai", "anthropic"}:
        problems.append(
            "AIRGAP=1 — set AI_PROVIDER=local_http (or disable AI) instead of cloud providers"
        )
    if problems:
        raise RuntimeError(
            "Refusing to start in air-gap mode:\n- " + "\n- ".join(problems)
        )


def assert_safe_for_environment(settings: Settings | None = None) -> None:
    """Raise RuntimeError if production/staging secrets are unsafe."""
    s = settings or get_settings()
    assert_airgap_safe(s)
    if not s.is_production_like:
        return
    problems: list[str] = []
    if s.session_secret.strip() in _WEAK_SESSION_SECRETS or len(s.session_secret) < 24:
        problems.append(
            "SESSION_SECRET must be a unique random string of at least 24 characters"
        )
    if s.admin_api_key.strip() in _WEAK_ADMIN_KEYS or len(s.admin_api_key) < 16:
        problems.append(
            "ADMIN_API_KEY must be a unique secret of at least 16 characters"
        )
    # Air-gap LANs often use http://edvidura.internal with TLS terminated elsewhere.
    if not s.app_base_url.startswith("https://") and not s.airgap:
        problems.append("APP_BASE_URL must be https:// in production/staging")
    if not s.has_private_key:
        problems.append("LTI private key missing (LTI_PRIVATE_KEY_PEM or key file)")
    if problems:
        raise RuntimeError(
            "Refusing to start with unsafe production settings:\n- "
            + "\n- ".join(problems)
        )


def require_dev_tools(request: Request) -> None:
    """Block /dev/* in production and staging; require ops auth in local/dev."""
    from app.admin_auth import resolve_ops_principal

    settings = get_settings()
    if settings.is_production_like:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    key = request.headers.get("X-Admin-Key")
    auth = request.headers.get("Authorization")
    if resolve_ops_principal(request, authorization=auth, x_admin_key=key) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Admin-Key or ops Bearer required for /dev tools",
        )


def safe_relative_next(path: str | None, *, default: str = "/ops/dashboard") -> str:
    """Allow only same-origin relative paths (block //evil open redirects)."""
    nxt = (path or "").strip() or default
    if not nxt.startswith("/"):
        return default
    if nxt.startswith("//") or nxt.startswith("/\\"):
        return default
    if "\\" in nxt or "://" in nxt:
        return default
    return nxt


def path_is_under(child, parent) -> bool:
    """True when resolved child is inside resolved parent (path-traversal safe)."""
    from pathlib import Path

    try:
        child_p = Path(child).resolve()
        parent_p = Path(parent).resolve()
        return child_p.is_relative_to(parent_p)
    except (OSError, ValueError, AttributeError):
        return False


def assert_public_http_url(url: str, *, purpose: str = "outbound URL") -> str:
    """Reject non-http(s) and clearly private/link-local hosts (SSRF guard).

    Resolves DNS and blocks loopback, RFC1918, link-local, and metadata ranges.
    Call before server-side GET/POST to caller-supplied URLs (e.g. LTI dynreg).
    Local/dev allows localhost so Moodle-on-:8085 registration still works.
    """
    import ipaddress
    import socket
    from urllib.parse import urlparse

    raw = (url or "").strip()
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"Invalid {purpose}: only http(s) URLs with a host are allowed")
    host = parsed.hostname
    settings = get_settings()
    allow_local = not settings.is_production_like
    if host.lower() == "metadata.google.internal":
        raise ValueError(f"Refusing metadata host for {purpose}")
    if host.lower() in {"localhost", "127.0.0.1", "::1"} and allow_local:
        return raw
    if host.lower() in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError(f"Refusing private host for {purpose}")
    try:
        infos = socket.getaddrinfo(host, parsed.port or None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve host for {purpose}") from exc
    if not infos:
        raise ValueError(f"Could not resolve host for {purpose}")
    for info in infos:
        ip_s = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_s)
        except ValueError:
            continue
        if ip_s in {"169.254.169.254", "fd00:ec2::254"}:
            raise ValueError(f"Refusing metadata address for {purpose}")
        if allow_local and (ip.is_loopback or ip.is_private):
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise ValueError(f"Refusing private/reserved address for {purpose}")
    return raw
