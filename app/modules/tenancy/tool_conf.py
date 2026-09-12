"""Build PyLTI ToolConfDict from active lti_platforms rows."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from pylti1p3.exception import LtiException
from pylti1p3.tool_config import ToolConfDict

from app import db
from app.settings import get_settings


def build_tool_conf_from_db(*, require_platforms: bool = True) -> ToolConfDict:
    """Build ToolConfDict from all active lti_platforms rows (multi-issuer)."""
    settings = get_settings()
    if not settings.has_private_key:
        raise LtiException(
            "Missing private key. Set LTI_PRIVATE_KEY_PEM or run: python scripts/generate_keys.py"
        )

    platforms = db.fetch_all_active_platforms()
    if require_platforms and not platforms:
        raise LtiException(
            "No active LTI platforms in DB. Run: python scripts/seed_platforms.py"
        )

    conf: dict[str, list[dict[str, Any]]] = {}
    for p in platforms:
        issuer = str(p["issuer"]).rstrip("/")
        conf.setdefault(issuer, []).append(
            {
                "client_id": p["client_id"],
                "auth_login_url": p["auth_login_url"],
                "auth_token_url": p["auth_token_url"],
                "auth_audience": None,
                "key_set_url": p["key_set_url"],
                "key_set": None,
                "deployment_ids": list(p["deployment_ids"] or ["1"]),
            }
        )

    if not conf:
        conf = {
            "http://localhost:8085": [
                {
                    "client_id": "pending",
                    "auth_login_url": "http://localhost:8085/mod/lti/auth.php",
                    "auth_token_url": "http://localhost:8085/mod/lti/token.php",
                    "auth_audience": None,
                    "key_set_url": "http://localhost:8085/mod/lti/certs.php",
                    "key_set": None,
                    "deployment_ids": ["1", "2"],
                }
            ]
        }

    tool_conf = ToolConfDict(conf)
    public_pem = _public_pem_for_tool(settings.private_key_pem)

    for issuer, clients in conf.items():
        for client in clients:
            cid = client["client_id"]
            tool_conf.set_private_key(
                issuer, settings.private_key_pem, client_id=cid
            )
            if public_pem:
                tool_conf.set_public_key(issuer, public_pem, client_id=cid)

    return tool_conf


def _public_pem_for_tool(private_pem: str) -> str | None:
    """Prefer keys/public.key; otherwise derive from the private PEM (Railway)."""
    public_key = Path("keys") / "public.key"
    if public_key.exists():
        return public_key.read_text(encoding="utf-8")
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.serialization import load_pem_private_key

        private = load_pem_private_key(private_pem.encode("utf-8"), password=None)
        return (
            private.public_key()
            .public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
            .decode("utf-8")
        )
    except Exception:  # noqa: BLE001
        return None
