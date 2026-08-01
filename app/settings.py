"""Load environment settings for the Hello multi-tenant spike."""
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

    @property
    def private_key_pem(self) -> str:
        return self.private_key_path.read_text(encoding="utf-8")


def get_settings() -> Settings:
    return Settings(
        app_base_url=os.getenv("APP_BASE_URL", "http://host.docker.internal:8000").rstrip(
            "/"
        ),
        session_secret=os.getenv("SESSION_SECRET", "dev-only-change-me"),
        private_key_path=ROOT
        / os.getenv("LTI_PRIVATE_KEY_PATH", "keys/private.key"),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
        ),
    )
