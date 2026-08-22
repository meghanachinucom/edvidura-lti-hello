"""Load environment settings for EdVidura."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=True)


@dataclass(frozen=True)
class Settings:
    app_base_url: str
    session_secret: str
    private_key_path: Path
    database_url: str
    admin_api_key: str
    # development | staging | production
    environment: str
    # Optional LRS (Learning Record Store). Empty endpoint = local store only.
    xapi_lrs_endpoint: str
    xapi_lrs_key: str
    xapi_lrs_secret: str
    xapi_actor_homepage: str
    # Inline PEM for Railway (takes precedence over file when set).
    private_key_pem_env: str = ""
    # AI assessment (optional). Local heuristic works when disabled / no key.
    ai_enabled: bool = False
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    # Keycloak ops identity (optional). When disabled, X-Admin-Key still works.
    keycloak_enabled: bool = False
    keycloak_url: str = ""
    keycloak_realm: str = "edvidura"
    keycloak_client_id: str = "edvidura-api"
    keycloak_client_secret: str = ""
    # Metabase BI URL (optional link from teacher analytics).
    metabase_url: str = ""
    # Phase 6 ops
    rate_limit_enabled: bool = True
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_production_like(self) -> bool:
        return self.environment in {"production", "staging"}

    @property
    def private_key_pem(self) -> str:
        if self.private_key_pem_env.strip():
            return self.private_key_pem_env.strip().replace("\\n", "\n")
        return self.private_key_path.read_text(encoding="utf-8")

    @property
    def has_private_key(self) -> bool:
        if self.private_key_pem_env.strip():
            return True
        return self.private_key_path.exists()


def get_settings() -> Settings:
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
    ).strip()
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://") :]

    env_raw = os.getenv("ENVIRONMENT", "development").strip().lower() or "development"
    if env_raw in {"prod", "production"}:
        environment = "production"
    elif env_raw in {"stage", "staging"}:
        environment = "staging"
    else:
        environment = "development"

    rate_raw = os.getenv("RATE_LIMIT_ENABLED", "1").strip().lower()
    rate_limit_enabled = rate_raw not in {"0", "false", "no", "off"}

    try:
        traces = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0") or "0")
    except ValueError:
        traces = 0.0

    return Settings(
        app_base_url=os.getenv("APP_BASE_URL", "http://localhost:8000").rstrip(
            "/"
        ),
        session_secret=os.getenv("SESSION_SECRET", "dev-only-change-me"),
        private_key_path=ROOT
        / os.getenv("LTI_PRIVATE_KEY_PATH", "keys/private.key"),
        database_url=database_url,
        admin_api_key=os.getenv("ADMIN_API_KEY", "dev-admin-change-me").strip(),
        environment=environment,
        xapi_lrs_endpoint=os.getenv("XAPI_LRS_ENDPOINT", "").strip(),
        xapi_lrs_key=os.getenv("XAPI_LRS_KEY", "").strip(),
        xapi_lrs_secret=os.getenv("XAPI_LRS_SECRET", "").strip(),
        xapi_actor_homepage=os.getenv(
            "XAPI_ACTOR_HOMEPAGE", "http://localhost:8085"
        ).rstrip("/"),
        private_key_pem_env=os.getenv("LTI_PRIVATE_KEY_PEM", ""),
        ai_enabled=os.getenv("AI_ENABLED", "").strip().lower()
        in {"1", "true", "yes", "on"},
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        or "gpt-4o-mini",
        keycloak_enabled=os.getenv("KEYCLOAK_ENABLED", "").strip().lower()
        in {"1", "true", "yes", "on"},
        keycloak_url=os.getenv("KEYCLOAK_URL", "http://localhost:8087").rstrip(
            "/"
        ),
        keycloak_realm=os.getenv("KEYCLOAK_REALM", "edvidura").strip()
        or "edvidura",
        keycloak_client_id=os.getenv("KEYCLOAK_CLIENT_ID", "edvidura-api").strip()
        or "edvidura-api",
        keycloak_client_secret=os.getenv(
            "KEYCLOAK_CLIENT_SECRET", "edvidura-api-dev-secret"
        ).strip(),
        metabase_url=os.getenv("METABASE_URL", "http://localhost:3001").rstrip(
            "/"
        ),
        rate_limit_enabled=rate_limit_enabled,
        sentry_dsn=os.getenv("SENTRY_DSN", "").strip(),
        sentry_traces_sample_rate=max(0.0, min(1.0, traces)),
    )
