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
    """Block /dev/* in production; require ops auth otherwise."""
    from app.admin_auth import resolve_ops_principal

    settings = get_settings()
    if settings.is_production:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    key = request.headers.get("X-Admin-Key")
    auth = request.headers.get("Authorization")
    if resolve_ops_principal(request, authorization=auth, x_admin_key=key) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Admin-Key or ops Bearer required for /dev tools",
        )
