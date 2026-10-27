"""Indian state → language map + manual locale resolution helpers.

Canonical manual body may be Sanskrit (sa-IN); published locales supply
state languages (Telugu, Tamil, Hindi, …) for the same manual_id.
"""
from __future__ import annotations

from typing import Any

from app.modules.ai_tutor.voice import (
    list_voice_languages,
    normalize_voice_lang,
    voice_language_meta,
)

# Major state / UT → default BCP-47 (official or widely used language).
STATE_LANGUAGE: dict[str, str] = {
    "AP": "te-IN",  # Andhra Pradesh
    "TG": "te-IN",  # Telangana
    "TS": "te-IN",
    "TN": "ta-IN",  # Tamil Nadu
    "KA": "kn-IN",  # Karnataka
    "KL": "ml-IN",  # Kerala
    "MH": "mr-IN",  # Maharashtra
    "GJ": "gu-IN",  # Gujarat
    "WB": "bn-IN",  # West Bengal
    "PB": "pa-IN",  # Punjab
    "OD": "or-IN",  # Odisha
    "OR": "or-IN",
    "AS": "as-IN",  # Assam
    "UP": "hi-IN",
    "MP": "hi-IN",
    "RJ": "hi-IN",
    "BR": "hi-IN",
    "BH": "hi-IN",
    "HR": "hi-IN",
    "UK": "hi-IN",
    "UT": "hi-IN",
    "JH": "hi-IN",
    "CG": "hi-IN",
    "CT": "hi-IN",
    "DL": "hi-IN",  # Delhi
    "HP": "hi-IN",
    "JK": "ur-IN",
    "LA": "hi-IN",
    "GA": "en-IN",  # Goa — Konkani not in coach catalog; English default
    "ML": "en-IN",
    "MN": "en-IN",
    "MZ": "en-IN",
    "NL": "en-IN",
    "SK": "ne-NP",
    "TR": "bn-IN",
    "AN": "en-IN",
    "CH": "hi-IN",
    "DH": "gu-IN",
    "DD": "gu-IN",
    "LD": "ml-IN",
    "PY": "ta-IN",
}

STATE_NAMES: dict[str, str] = {
    "AP": "Andhra Pradesh",
    "TG": "Telangana",
    "TN": "Tamil Nadu",
    "KA": "Karnataka",
    "KL": "Kerala",
    "MH": "Maharashtra",
    "GJ": "Gujarat",
    "WB": "West Bengal",
    "PB": "Punjab",
    "OD": "Odisha",
    "AS": "Assam",
    "UP": "Uttar Pradesh",
    "MP": "Madhya Pradesh",
    "RJ": "Rajasthan",
    "BR": "Bihar",
    "HR": "Haryana",
    "UK": "Uttarakhand",
    "JH": "Jharkhand",
    "CG": "Chhattisgarh",
    "DL": "Delhi",
    "HP": "Himachal Pradesh",
    "JK": "Jammu & Kashmir",
    "GA": "Goa",
    "SK": "Sikkim",
    "TR": "Tripura",
    "PY": "Puducherry",
}


def normalize_state(raw: Any) -> str:
    s = str(raw or "").strip().upper().replace(" ", "")
    aliases = {
        "TELANGANA": "TG",
        "ANDHRAPRADESH": "AP",
        "ANDHRA": "AP",
        "TAMILNADU": "TN",
        "KARNATAKA": "KA",
        "KERALA": "KL",
        "MAHARASHTRA": "MH",
        "GUJARAT": "GJ",
        "WESTBENGAL": "WB",
        "PUNJAB": "PB",
        "ODISHA": "OD",
        "ORISSA": "OD",
        "ASSAM": "AS",
        "DELHI": "DL",
        "NCR": "DL",
    }
    if s in aliases:
        return aliases[s]
    if s in STATE_LANGUAGE:
        return s
    if len(s) == 2 and s.isalpha():
        return s
    return ""


def language_for_state(state: Any, *, default: str = "hi-IN") -> str:
    code = normalize_state(state)
    if code and code in STATE_LANGUAGE:
        return normalize_voice_lang(STATE_LANGUAGE[code], default=default)
    return normalize_voice_lang(default, default="hi-IN")


def list_states() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for code, name in STATE_NAMES.items():
        if code in seen:
            continue
        seen.add(code)
        lang = STATE_LANGUAGE.get(code, "hi-IN")
        meta = voice_language_meta(lang)
        out.append(
            {
                "code": code,
                "name": name,
                "language_code": meta["code"],
                "language_name": meta["name"],
                "native": meta["native"],
            }
        )
    return sorted(out, key=lambda r: r["name"])


def list_manual_languages() -> list[dict[str, str]]:
    """Same catalog as Ask Vidura — keeps UI codes aligned."""
    return list_voice_languages()


def resolve_preferred_language(
    *,
    query_lang: str | None = None,
    session_lang: str | None = None,
    tenant_language: str | None = None,
    tenant_state: str | None = None,
    source_language: str | None = None,
    default: str = "en-IN",
) -> str:
    """Pick reader BCP-47: query → session → tenant lang → state → source."""
    for candidate in (query_lang, session_lang, tenant_language):
        raw = str(candidate or "").strip()
        if raw:
            return normalize_voice_lang(raw, default=default)
    state = normalize_state(tenant_state)
    if state:
        return language_for_state(state, default=default)
    src = str(source_language or "").strip()
    if src:
        return normalize_voice_lang(src, default=default)
    return normalize_voice_lang(default, default="en-IN")


__all__ = [
    "STATE_LANGUAGE",
    "STATE_NAMES",
    "language_for_state",
    "list_manual_languages",
    "list_states",
    "normalize_state",
    "resolve_preferred_language",
]
