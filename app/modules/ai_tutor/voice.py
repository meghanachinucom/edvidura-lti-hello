"""Study-coach voice languages (Indian locales + English).

Browser Web Speech API uses BCP-47 tags (`hi-IN`, `te-IN`, …).
Chrome/Edge typically offer the best STT coverage for Indic languages;
TTS voices vary by OS — the `lang` hint still steers synthesis.
"""
from __future__ import annotations

from typing import Any

# Stable catalog: English + major Indian languages (beyond Hindi / Telugu).
COACH_VOICE_LANGUAGES: tuple[dict[str, str], ...] = (
    {
        "code": "en-IN",
        "name": "English (India)",
        "native": "English",
        "script": "Latin",
    },
    {
        "code": "en-US",
        "name": "English (US)",
        "native": "English",
        "script": "Latin",
    },
    {
        "code": "hi-IN",
        "name": "Hindi",
        "native": "हिन्दी",
        "script": "Devanagari",
    },
    {
        "code": "te-IN",
        "name": "Telugu",
        "native": "తెలుగు",
        "script": "Telugu",
    },
    {
        "code": "ta-IN",
        "name": "Tamil",
        "native": "தமிழ்",
        "script": "Tamil",
    },
    {
        "code": "kn-IN",
        "name": "Kannada",
        "native": "ಕನ್ನಡ",
        "script": "Kannada",
    },
    {
        "code": "ml-IN",
        "name": "Malayalam",
        "native": "മലയാളം",
        "script": "Malayalam",
    },
    {
        "code": "mr-IN",
        "name": "Marathi",
        "native": "मराठी",
        "script": "Devanagari",
    },
    {
        "code": "gu-IN",
        "name": "Gujarati",
        "native": "ગુજરાતી",
        "script": "Gujarati",
    },
    {
        "code": "bn-IN",
        "name": "Bengali",
        "native": "বাংলা",
        "script": "Bengali",
    },
    {
        "code": "pa-IN",
        "name": "Punjabi",
        "native": "ਪੰਜਾਬੀ",
        "script": "Gurmukhi",
    },
    {
        "code": "or-IN",
        "name": "Odia",
        "native": "ଓଡ଼ିଆ",
        "script": "Odia",
    },
    {
        "code": "ur-IN",
        "name": "Urdu",
        "native": "اردو",
        "script": "Arabic",
    },
    {
        "code": "as-IN",
        "name": "Assamese",
        "native": "অসমীয়া",
        "script": "Bengali-Assamese",
    },
    {
        "code": "sa-IN",
        "name": "Sanskrit",
        "native": "संस्कृतम्",
        "script": "Devanagari",
    },
    {
        "code": "ne-NP",
        "name": "Nepali",
        "native": "नेपाली",
        "script": "Devanagari",
    },
)

_DEFAULT = "en-IN"
_BY_CODE = {row["code"].lower(): row for row in COACH_VOICE_LANGUAGES}
# Accept bare language tags (hi → hi-IN) when unique.
_BY_LANG: dict[str, str] = {}
for row in COACH_VOICE_LANGUAGES:
    lang = row["code"].split("-", 1)[0].lower()
    # Prefer *-IN when several share a language (en-IN over en-US).
    if lang not in _BY_LANG or row["code"].endswith("-IN"):
        _BY_LANG[lang] = row["code"]


def list_voice_languages() -> list[dict[str, str]]:
    """Public catalog for UI + API."""
    return [dict(row) for row in COACH_VOICE_LANGUAGES]


def normalize_voice_lang(value: str | None, *, default: str = _DEFAULT) -> str:
    """Return a catalog BCP-47 code, or default."""
    raw = (value or "").strip().replace("_", "-")
    if not raw:
        return default if default.lower() in _BY_CODE else _DEFAULT
    lower = raw.lower()
    if lower in _BY_CODE:
        return _BY_CODE[lower]["code"]
    # hi-in already covered; try language-only
    lang = lower.split("-", 1)[0]
    if lang in _BY_LANG:
        return _BY_LANG[lang]
    return default if default.lower() in _BY_CODE else _DEFAULT


def voice_language_meta(code: str | None) -> dict[str, str]:
    normalized = normalize_voice_lang(code)
    return dict(_BY_CODE[normalized.lower()])


def reply_language_instruction(code: str | None) -> str:
    """Prompt fragment so the coach answers in the selected language."""
    meta = voice_language_meta(code)
    name = meta["name"]
    native = meta["native"]
    script = meta["script"]
    if meta["code"].startswith("en"):
        return (
            f"Reply in {name}. Keep explanations clear for school students. "
            "Citations titles may stay as given in the sources."
        )
    return (
        f"Reply in {name} ({native}), using the {script} script where appropriate. "
        "If a technical term has no natural translation, keep the English term "
        "and briefly explain it in the reply language. "
        "Citation titles may stay as given in the sources."
    )


def voice_capabilities() -> dict[str, Any]:
    """Describe client capabilities (browser Web Speech; no cloud STT required)."""
    return {
        "schema": "edvidura.coach.voice.v1",
        "stt": "browser_web_speech",
        "tts": "browser_speech_synthesis",
        "languages": list_voice_languages(),
        "default": _DEFAULT,
        "note": (
            "Mic and speak use the browser Web Speech API. "
            "Chrome/Edge usually support the widest set of Indian languages."
        ),
    }


__all__ = [
    "COACH_VOICE_LANGUAGES",
    "list_voice_languages",
    "normalize_voice_lang",
    "reply_language_instruction",
    "voice_capabilities",
    "voice_language_meta",
]
