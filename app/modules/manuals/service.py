"""Versioned technical manuals (Slice B content start — no AI)."""
from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from app import db
from app.modules.content.service import body_md_to_html


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s or "manual")[:80]


def list_manuals(
    tenant_id: UUID | str, *, include_unpublished: bool = False
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        if include_unpublished:
            rows = conn.execute(
                """
                SELECT id, tenant_id, slug, title, description, status,
                       COALESCE(source_language, 'en-IN') AS source_language,
                       created_at
                FROM manuals
                ORDER BY title
                """
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, tenant_id, slug, title, description, status,
                       COALESCE(source_language, 'en-IN') AS source_language,
                       created_at
                FROM manuals
                WHERE status = 'published'
                ORDER BY title
                """
            ).fetchall()
        return [dict(r) for r in rows]


def list_manuals_for_class(
    tenant_id: UUID | str,
    class_id: UUID | str | None,
    *,
    include_unpublished: bool = False,
) -> list[dict[str, Any]]:
    """Published (or all) manuals linked to one class. Empty class_id → []."""
    cid = str(class_id or "").strip()
    if not cid:
        return []
    with db.tenant_connection(tenant_id) as conn:
        if include_unpublished:
            rows = conn.execute(
                """
                SELECT m.id, m.tenant_id, m.slug, m.title, m.description,
                       m.status,
                       COALESCE(m.source_language, 'en-IN') AS source_language,
                       m.created_at
                FROM manuals m
                JOIN class_manuals cm ON cm.manual_id = m.id
                WHERE cm.class_id = %s
                ORDER BY m.title
                """,
                (cid,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT m.id, m.tenant_id, m.slug, m.title, m.description,
                       m.status,
                       COALESCE(m.source_language, 'en-IN') AS source_language,
                       m.created_at
                FROM manuals m
                JOIN class_manuals cm ON cm.manual_id = m.id
                WHERE cm.class_id = %s AND m.status = 'published'
                ORDER BY m.title
                """,
                (cid,),
            ).fetchall()
        return [dict(r) for r in rows]


def class_ids_for_manual(
    tenant_id: UUID | str, manual_id: UUID | str
) -> list[str]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT class_id FROM class_manuals WHERE manual_id = %s
            ORDER BY created_at
            """,
            (str(manual_id),),
        ).fetchall()
        return [str(r["class_id"]) for r in rows]


def manual_visible_to_class(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str,
    class_id: UUID | str | None,
) -> bool:
    cid = str(class_id or "").strip()
    if not cid:
        return False
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT 1 FROM class_manuals
            WHERE manual_id = %s AND class_id = %s
            """,
            (str(manual_id), cid),
        ).fetchone()
        return bool(row)


def link_manual_to_class(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str,
    class_id: UUID | str,
) -> None:
    tid = str(tenant_id)
    mid = str(manual_id)
    cid = str(class_id).strip()
    if not mid or not cid:
        raise ValueError("manual_id and class_id required")
    with db.tenant_connection(tid) as conn:
        conn.execute(
            """
            INSERT INTO class_manuals (tenant_id, class_id, manual_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (class_id, manual_id) DO NOTHING
            """,
            (tid, cid, mid),
        )


def unlink_manual_from_class(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str,
    class_id: UUID | str,
) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            DELETE FROM class_manuals
            WHERE manual_id = %s AND class_id = %s
            """,
            (str(manual_id), str(class_id)),
        )


def set_manual_classes(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str,
    class_ids: list[UUID | str],
) -> list[str]:
    """Replace class links for a manual. Returns linked class id strings."""
    tid = str(tenant_id)
    mid = str(manual_id)
    wanted = {str(c).strip() for c in class_ids if str(c).strip()}
    with db.tenant_connection(tid) as conn:
        conn.execute(
            "DELETE FROM class_manuals WHERE manual_id = %s",
            (mid,),
        )
        for cid in sorted(wanted):
            conn.execute(
                """
                INSERT INTO class_manuals (tenant_id, class_id, manual_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (class_id, manual_id) DO NOTHING
                """,
                (tid, cid, mid),
            )
    return sorted(wanted)


def get_manual(tenant_id: UUID | str, manual_id: UUID | str) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, tenant_id, slug, title, description, status,
                   COALESCE(source_language, 'en-IN') AS source_language,
                   created_at
            FROM manuals WHERE id = %s
            """,
            (str(manual_id),),
        ).fetchone()
        return dict(row) if row else None


def create_manual(
    *,
    tenant_id: UUID | str,
    title: str,
    description: str = "",
    body_md: str = "",
    subject: str = "",
    publish: bool = True,
    source_language: str = "en-IN",
) -> dict[str, Any]:
    from app.modules.ai_tutor.voice import normalize_voice_lang

    tid = str(tenant_id)
    title_clean = (title or "").strip()
    if not title_clean:
        raise ValueError("Manual title required")
    src = normalize_voice_lang(source_language, default="en-IN")
    base = _slugify(title_clean)
    with db.tenant_connection(tid) as conn:
        slug = base
        for i in range(0, 40):
            candidate = slug if i == 0 else f"{base}-{i+1}"
            clash = conn.execute(
                "SELECT 1 FROM manuals WHERE slug = %s",
                (candidate,),
            ).fetchone()
            if not clash:
                slug = candidate
                break
        status = "published" if publish else "draft"
        manual = conn.execute(
            """
            INSERT INTO manuals (
                tenant_id, slug, title, description, status, source_language
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, tenant_id, slug, title, description, status,
                      source_language, created_at
            """,
            (tid, slug, title_clean, description or "", status, src),
        ).fetchone()
        version = conn.execute(
            """
            INSERT INTO manual_versions (
                tenant_id, manual_id, version, body_md, changelog,
                is_published, created_by_subject, published_at
            )
            VALUES (%s, %s, 1, %s, %s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
            RETURNING id, manual_id, version, body_md, changelog, is_published,
                      created_by_subject, created_at, published_at
            """,
            (
                tid,
                str(manual["id"]),
                body_md or "",
                "Initial version",
                publish,
                subject or "",
                publish,
            ),
        ).fetchone()
        out = dict(manual)
        out["latest_version"] = dict(version)
        return out


def list_versions(tenant_id: UUID | str, manual_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, manual_id, version, body_md, changelog, is_published,
                   created_by_subject, created_at, published_at
            FROM manual_versions
            WHERE manual_id = %s
            ORDER BY version DESC
            """,
            (str(manual_id),),
        ).fetchall()
        return [dict(r) for r in rows]


def get_version(
    tenant_id: UUID | str, *, manual_id: UUID | str, version: int
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, manual_id, version, body_md, changelog, is_published,
                   created_by_subject, created_at, published_at
            FROM manual_versions
            WHERE manual_id = %s AND version = %s
            """,
            (str(manual_id), int(version)),
        ).fetchone()
        return dict(row) if row else None


def latest_published_version(
    tenant_id: UUID | str, manual_id: UUID | str
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, manual_id, version, body_md, changelog, is_published,
                   created_by_subject, created_at, published_at
            FROM manual_versions
            WHERE manual_id = %s AND is_published = TRUE
            ORDER BY version DESC
            LIMIT 1
            """,
            (str(manual_id),),
        ).fetchone()
        return dict(row) if row else None


def add_version(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    body_md: str,
    changelog: str = "",
    subject: str = "",
    publish: bool = False,
) -> dict[str, Any]:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        manual = conn.execute(
            "SELECT id FROM manuals WHERE id = %s",
            (str(manual_id),),
        ).fetchone()
        if not manual:
            raise ValueError("Manual not found")
        pos = conn.execute(
            "SELECT COALESCE(MAX(version), 0) + 1 AS n FROM manual_versions WHERE manual_id = %s",
            (str(manual_id),),
        ).fetchone()
        version_n = int(pos["n"])
        row = conn.execute(
            """
            INSERT INTO manual_versions (
                tenant_id, manual_id, version, body_md, changelog,
                is_published, created_by_subject, published_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
            RETURNING id, manual_id, version, body_md, changelog, is_published,
                      created_by_subject, created_at, published_at
            """,
            (
                tid,
                str(manual_id),
                version_n,
                body_md or "",
                changelog or f"Version {version_n}",
                publish,
                subject or "",
                publish,
            ),
        ).fetchone()
        if publish:
            conn.execute(
                "UPDATE manuals SET status = 'published' WHERE id = %s",
                (str(manual_id),),
            )
        return dict(row)


def publish_version(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE manual_versions
            SET is_published = TRUE, published_at = COALESCE(published_at, now())
            WHERE manual_id = %s AND version = %s
            RETURNING id, manual_id, version, body_md, changelog, is_published,
                      created_by_subject, created_at, published_at
            """,
            (str(manual_id), int(version)),
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE manuals SET status = 'published' WHERE id = %s",
                (str(manual_id),),
            )
        return dict(row) if row else None


def render_body(body_md: str) -> str:
    return body_md_to_html(body_md)


def toc_from_body(body_md: str) -> list[dict[str, str]]:
    """
    PeBL-ish chapter TOC from ## headings.

    Returns [{slug, title}] — same slugs as heading ids in render_body.
    """
    from app.modules.sme.service import split_manual_sections

    sections = split_manual_sections(body_md)
    return [
        {"slug": str(s.get("slug") or ""), "title": str(s.get("title") or "")}
        for s in sections
        if s.get("slug") and s.get("title")
    ]


def _reader_signing_key() -> bytes:
    from app.settings import get_settings

    s = get_settings()
    raw = (
        getattr(s, "receipt_signing_key", "")
        or s.session_secret
        or "dev-only-change-me"
    )
    return str(raw).encode("utf-8")


def seal_reader_token(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    exp_hours: int = 72,
) -> str:
    """HMAC token for standalone eBook read links (no LTI session)."""
    import hashlib
    import hmac
    import time

    exp = int(time.time()) + max(1, int(exp_hours)) * 3600
    payload = f"{tenant_id}|{manual_id}|{int(version)}|{exp}"
    dig = hmac.new(_reader_signing_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{exp}.{dig}"


def verify_reader_token(
    *,
    token: str,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
) -> bool:
    import hashlib
    import hmac
    import time

    raw = (token or "").strip()
    if "." not in raw:
        return False
    exp_s, dig = raw.split(".", 1)
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    if exp < int(time.time()):
        return False
    payload = f"{tenant_id}|{manual_id}|{int(version)}|{exp}"
    expected = hmac.new(
        _reader_signing_key(), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(dig.lower(), expected.lower())


def reader_share_path(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    version: int,
    focus: str = "",
    exp_hours: int = 72,
) -> str:
    """Relative URL for standalone PeBL reader."""
    from urllib.parse import urlencode

    sig = seal_reader_token(
        tenant_id=tenant_id,
        manual_id=manual_id,
        version=version,
        exp_hours=exp_hours,
    )
    q = {
        "tid": str(tenant_id),
        "v": int(version),
        "sig": sig,
    }
    focus_s = (focus or "").strip().lstrip("#")
    if focus_s:
        q["focus"] = focus_s
    return f"/read/manuals/{manual_id}?{urlencode(q)}"


def list_locales(
    tenant_id: UUID | str, manual_id: UUID | str
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, manual_id, language_code, title, body_md,
                   is_published,
                   COALESCE(is_auto, FALSE) AS is_auto,
                   created_at, updated_at
            FROM manual_locales
            WHERE manual_id = %s
            ORDER BY language_code
            """,
            (str(manual_id),),
        ).fetchall()
        return [dict(r) for r in rows]


def get_locale(
    tenant_id: UUID | str,
    *,
    manual_id: UUID | str,
    language_code: str,
    published_only: bool = False,
) -> dict[str, Any] | None:
    from app.modules.ai_tutor.voice import normalize_voice_lang

    if not str(language_code or "").strip():
        return None
    code = normalize_voice_lang(language_code)
    with db.tenant_connection(tenant_id) as conn:
        if published_only:
            row = conn.execute(
                """
                SELECT id, manual_id, language_code, title, body_md,
                       is_published,
                       COALESCE(is_auto, FALSE) AS is_auto,
                       created_at, updated_at
                FROM manual_locales
                WHERE manual_id = %s AND language_code = %s
                      AND is_published = TRUE
                """,
                (str(manual_id), code),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT id, manual_id, language_code, title, body_md,
                       is_published,
                       COALESCE(is_auto, FALSE) AS is_auto,
                       created_at, updated_at
                FROM manual_locales
                WHERE manual_id = %s AND language_code = %s
                """,
                (str(manual_id), code),
            ).fetchone()
        return dict(row) if row else None


def upsert_locale(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    language_code: str,
    body_md: str,
    title: str = "",
    publish: bool = True,
    is_auto: bool = False,
) -> dict[str, Any]:
    from app.modules.ai_tutor.voice import normalize_voice_lang

    tid = str(tenant_id)
    code = normalize_voice_lang(language_code)
    with db.tenant_connection(tid) as conn:
        manual = conn.execute(
            "SELECT id FROM manuals WHERE id = %s",
            (str(manual_id),),
        ).fetchone()
        if not manual:
            raise ValueError("Manual not found")
        row = conn.execute(
            """
            INSERT INTO manual_locales (
                tenant_id, manual_id, language_code, title, body_md,
                is_published, is_auto, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (manual_id, language_code) DO UPDATE SET
                title = EXCLUDED.title,
                body_md = EXCLUDED.body_md,
                is_published = EXCLUDED.is_published,
                is_auto = EXCLUDED.is_auto,
                updated_at = now()
            RETURNING id, manual_id, language_code, title, body_md,
                      is_published, COALESCE(is_auto, FALSE) AS is_auto,
                      created_at, updated_at
            """,
            (
                tid,
                str(manual_id),
                code,
                (title or "").strip(),
                body_md or "",
                bool(publish),
                bool(is_auto),
            ),
        ).fetchone()
        return dict(row)


def clear_auto_locales(
    tenant_id: UUID | str, manual_id: UUID | str
) -> int:
    """Drop cached LLM translations so a new source body can re-translate."""
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            DELETE FROM manual_locales
            WHERE manual_id = %s AND COALESCE(is_auto, FALSE) = TRUE
            RETURNING id
            """,
            (str(manual_id),),
        ).fetchall()
        return len(rows)


def set_source_language(
    *,
    tenant_id: UUID | str,
    manual_id: UUID | str,
    source_language: str,
) -> dict[str, Any] | None:
    from app.modules.ai_tutor.voice import normalize_voice_lang

    code = normalize_voice_lang(source_language, default="en-IN")
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE manuals
            SET source_language = %s
            WHERE id = %s
            RETURNING id, tenant_id, slug, title, description, status,
                      source_language, created_at
            """,
            (code, str(manual_id)),
        ).fetchone()
        return dict(row) if row else None


def ensure_auto_translated_locale(
    tenant_id: UUID | str,
    *,
    manual: dict[str, Any],
    version: dict[str, Any],
    target_language: str,
    force: bool = False,
) -> dict[str, Any]:
    """Translate source body → target, cache in manual_locales (is_auto=True)."""
    from app.modules.ai_tutor.voice import normalize_voice_lang, voice_language_meta
    from app.modules.manuals.translate import translate_manual_markdown

    source = normalize_voice_lang(
        str(manual.get("source_language") or "en-IN"), default="en-IN"
    )
    wanted = normalize_voice_lang(target_language, default=source)
    if wanted == source:
        return {
            "ok": True,
            "skipped": True,
            "language_code": source,
            "locale": None,
        }

    existing = get_locale(
        tenant_id,
        manual_id=manual["id"],
        language_code=wanted,
        published_only=False,
    )
    # Reuse cache unless force; never overwrite teacher-authored without force.
    if existing and (existing.get("body_md") or "").strip() and not force:
        return {
            "ok": True,
            "skipped": True,
            "cached": True,
            "language_code": wanted,
            "locale": existing,
        }
    if (
        existing
        and (existing.get("body_md") or "").strip()
        and force
        and not existing.get("is_auto")
    ):
        # Teacher body: leave alone even on force_retranslate from UI.
        return {
            "ok": True,
            "skipped": True,
            "cached": True,
            "language_code": wanted,
            "locale": existing,
        }

    try:
        translated = translate_manual_markdown(
            body_md=str(version.get("body_md") or ""),
            title=str(manual.get("title") or ""),
            source_language=source,
            target_language=wanted,
        )
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": str(exc),
            "language_code": wanted,
            "language_name": voice_language_meta(wanted)["name"],
            "source_language": source,
        }

    body = str(translated.get("body_md") or "").strip()
    if not body:
        return {
            "ok": False,
            "error": "Translation returned empty text",
            "language_code": wanted,
            "source_language": source,
        }

    locale = upsert_locale(
        tenant_id=tenant_id,
        manual_id=manual["id"],
        language_code=wanted,
        body_md=body,
        title=str(translated.get("title") or manual.get("title") or ""),
        publish=True,
        is_auto=True,
    )
    return {
        "ok": True,
        "skipped": False,
        "auto": True,
        "language_code": wanted,
        "locale": locale,
        "provider": translated.get("provider"),
    }


def resolve_reader_content(
    tenant_id: UUID | str,
    *,
    manual: dict[str, Any],
    version: dict[str, Any],
    language_code: str,
    allow_unpublished_locale: bool = False,
    auto_translate: bool = False,
    force_retranslate: bool = False,
) -> dict[str, Any]:
    """Pick localized title/body; optionally LLM-translate + cache on miss."""
    from app.modules.ai_tutor.voice import normalize_voice_lang, voice_language_meta
    from app.modules.manuals.locales import resolve_preferred_language

    source = normalize_voice_lang(
        str(manual.get("source_language") or "en-IN"), default="en-IN"
    )
    wanted = resolve_preferred_language(
        query_lang=language_code,
        source_language=source,
        default=source,
    )
    translate_info: dict[str, Any] | None = None
    locale = get_locale(
        tenant_id,
        manual_id=manual["id"],
        language_code=wanted,
        published_only=not allow_unpublished_locale,
    )
    used_locale = bool(locale and (locale.get("body_md") or "").strip())

    if (not used_locale or force_retranslate) and auto_translate and wanted != source:
        translate_info = ensure_auto_translated_locale(
            tenant_id,
            manual=manual,
            version=version,
            target_language=wanted,
            force=force_retranslate,
        )
        if translate_info.get("ok") and translate_info.get("locale"):
            locale = translate_info["locale"]
            used_locale = True
        elif translate_info.get("ok") and translate_info.get("cached"):
            locale = translate_info.get("locale") or locale
            used_locale = bool(locale and (locale.get("body_md") or "").strip())

    if used_locale and locale:
        body_md = str(locale.get("body_md") or "")
        title = str(locale.get("title") or "").strip() or str(
            manual.get("title") or ""
        )
        lang = normalize_voice_lang(str(locale.get("language_code") or wanted))
        is_auto = bool(locale.get("is_auto"))
    else:
        body_md = str(version.get("body_md") or "")
        title = str(manual.get("title") or "")
        lang = source
        is_auto = False
    meta = voice_language_meta(lang)
    return {
        "title": title,
        "body_md": body_md,
        "language_code": lang,
        "language_name": meta["name"],
        "language_native": meta["native"],
        "is_locale": used_locale,
        "is_auto": is_auto,
        "source_language": source,
        "fallback_to_source": not used_locale and wanted != source,
        "requested_language": wanted,
        "translate_error": (
            str(translate_info.get("error") or "")
            if translate_info and not translate_info.get("ok")
            else ""
        ),
        "just_translated": bool(
            translate_info
            and translate_info.get("ok")
            and translate_info.get("auto")
            and not translate_info.get("skipped")
        ),
    }
