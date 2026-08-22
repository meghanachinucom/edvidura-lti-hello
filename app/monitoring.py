"""Optional Sentry / error monitoring hooks."""
from __future__ import annotations

import logging

logger = logging.getLogger("edvidura.monitoring")


def init_monitoring() -> None:
    """Initialize Sentry when SENTRY_DSN is set."""
    from app.settings import get_settings

    settings = get_settings()
    dsn = settings.sentry_dsn
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=settings.environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
            ],
            send_default_pii=False,
        )
        logger.info("Sentry monitoring enabled env=%s", settings.environment)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Sentry init failed: %s", exc)
