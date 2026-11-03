"""DCT F-6: ETIMS / external document refresh → new manual version."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Any
from uuid import UUID

from app.modules import manuals as manuals_mod
from app.settings import get_settings


def verify_etims_signature(body: bytes, signature: str | None) -> bool:
    secret = (get_settings().etims_webhook_secret or "").strip()
    if not secret:
        # Dev / unset: allow only when signature header absent (local only)
        return not (signature or "").strip()
    provided = (signature or "").strip()
    if provided.lower().startswith("sha256="):
        provided = provided.split("=", 1)[1].strip()
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return bool(provided) and secrets.compare_digest(provided.lower(), expected.lower())


def apply_external_document_refresh(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str | None = None,
    slug: str = "",
    title: str = "",
    body_md: str = "",
    changelog: str = "",
    publish: bool = True,
    reindex: bool = True,
) -> dict[str, Any]:
    """Create a new manual version from an external push (ETIMS / webhook)."""
    tid = str(tenant_id)
    body = (body_md or "").strip()
    if len(body) < 20:
        raise ValueError("body_md is required (min 20 chars)")

    mid = str(manual_id or "").strip()
    if not mid and slug:
        # Resolve by slug within tenant
        manuals = manuals_mod.list_manuals(tid) if hasattr(manuals_mod, "list_manuals") else []
        for m in manuals:
            if str(m.get("slug") or "") == slug:
                mid = str(m["id"])
                break
    if not mid:
        # create_manual already inserts v1 with body_md
        created = manuals_mod.create_manual(
            tenant_id=tid,
            title=(title or slug or "ETIMS document").strip() or "ETIMS document",
            body_md=body,
            subject="etims",
            publish=bool(publish),
            description=changelog or "ETIMS auto refresh",
        )
        mid = str(created["id"])
        ver = {
            "version": 1,
            "is_published": bool(publish),
        }
    else:
        ver = manuals_mod.add_version(
            tenant_id=tid,
            manual_id=mid,
            body_md=body,
            changelog=changelog or "ETIMS auto refresh",
            subject="etims",
            publish=bool(publish),
        )
    index_result = None
    if reindex:
        try:
            from app.modules import sme as sme_mod

            index_result = sme_mod.index_manual(
                tid, mid, version=int(ver.get("version") or 0) or None
            )
        except Exception as exc:  # noqa: BLE001
            index_result = {"error": str(exc)[:200]}

    return {
        "manual_id": mid,
        "version": int(ver.get("version") or 0),
        "published": bool(ver.get("is_published")),
        "index": index_result,
    }
