"""Auto-translate manual markdown into a target Indian language (LLM).

Uses the shared AI stack (Anthropic / OpenAI / local HTTP via run_ai).
Caches are written by callers into ``manual_locales``.
"""
from __future__ import annotations

from typing import Any

from app.modules.ai_assessment.llm import openai_chat_json, run_ai
from app.modules.ai_tutor.voice import normalize_voice_lang, voice_language_meta

_CHUNK = 4500


def _chunks(text: str, size: int = _CHUNK) -> list[str]:
    raw = text or ""
    if len(raw) <= size:
        return [raw] if raw.strip() else []
    parts: list[str] = []
    start = 0
    while start < len(raw):
        end = min(len(raw), start + size)
        if end < len(raw):
            # Prefer break at paragraph / heading.
            cut = raw.rfind("\n\n", start, end)
            if cut <= start:
                cut = raw.rfind("\n", start, end)
            if cut > start:
                end = cut
        parts.append(raw[start:end].strip())
        start = end
        while start < len(raw) and raw[start] in "\n\r":
            start += 1
    return [p for p in parts if p]


def translate_manual_markdown(
    *,
    body_md: str,
    title: str = "",
    source_language: str = "sa-IN",
    target_language: str = "te-IN",
) -> dict[str, Any]:
    """Translate markdown body into target language. Returns title + body_md."""
    src = normalize_voice_lang(source_language, default="sa-IN")
    tgt = normalize_voice_lang(target_language, default="te-IN")
    if src == tgt:
        return {
            "title": title,
            "body_md": body_md or "",
            "provider": "identity",
            "auto": False,
        }

    src_meta = voice_language_meta(src)
    tgt_meta = voice_language_meta(tgt)
    text = (body_md or "").strip()
    if len(text) < 8:
        raise ValueError("Manual text is too short to translate")

    pieces = _chunks(text)
    translated_parts: list[str] = []
    out_title = title
    provider = "local"

    def _translate_piece(piece: str, *, is_first: bool) -> dict[str, str]:
        def _openai():
            data = openai_chat_json(
                system=(
                    "You translate educational eBook markdown for Indian learners. "
                    "Preserve Markdown structure: ## headings, lists, blank lines, "
                    "and any [links](url). Do not add commentary. "
                    "Keep English technical terms that have no natural translation, "
                    "with a brief gloss in the target language on first use if helpful. "
                    'Return ONLY JSON: {"title":"...","body_md":"..."}.'
                ),
                user=(
                    f"Source language: {src_meta['name']} ({src_meta['native']}, {src}).\n"
                    f"Target language: {tgt_meta['name']} ({tgt_meta['native']}, {tgt}) "
                    f"using the {tgt_meta['script']} script.\n"
                    + (
                        f'Also translate this title into the target language: "{title}"\n'
                        if is_first and title
                        else "Leave title empty string.\n"
                    )
                    + f"\nMarkdown to translate:\n\n{piece}"
                ),
                temperature=0.2,
                timeout=90.0,
            )
            return {
                "title": str(data.get("title") or "").strip(),
                "body_md": str(data.get("body_md") or "").strip(),
            }

        def _local():
            # No real MT offline — empty body triggers caller error/fallback.
            return {
                "title": "",
                "body_md": "",
                "error": (
                    "Auto-translate needs a remote LLM "
                    "(AI_ENABLED=1 + ANTHROPIC_API_KEY or OPENAI_API_KEY)."
                ),
            }

        out = run_ai(openai_fn=_openai, local_fn=_local, feature="manual_translate")
        if not str(out.get("body_md") or "").strip():
            raise RuntimeError(
                str(out.get("error") or out.get("note") or "Translation unavailable")
            )
        return out

    for i, piece in enumerate(pieces):
        result = _translate_piece(piece, is_first=(i == 0))
        provider = "llm"
        if i == 0 and result.get("title"):
            out_title = str(result["title"])
        part = str(result.get("body_md") or "").strip()
        if not part:
            raise ValueError("Translation returned empty body")
        translated_parts.append(part)

    return {
        "title": out_title or title,
        "body_md": "\n\n".join(translated_parts),
        "provider": provider,
        "auto": True,
        "source_language": src,
        "target_language": tgt,
    }


__all__ = ["translate_manual_markdown"]
