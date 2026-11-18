"""FreeFlow AI Voice Cleanup Helper.

Cleans speech-to-text transcripts:
- Removes filler sounds/words: "um", "uh", "ahem", "er", "like", "you know"
- Normalizes spoken mathematical statements:
  - "2 x plus 5 equals 15" -> "2x + 5 = 15"
  - "x squared" -> "x^2"
  - "divided by" -> "/"
  - "multiplied by" / "times" -> "*"
  - "minus" -> "-"
- Preserves Indian proper names, LMS technical terminology, and multilingual terms
- Returns clean, polished text ready for Ask Vidura, SME search, or eBook notes.
"""
from __future__ import annotations

import re
from typing import Any

# Filler words and verbal hesitations to strip cleanly
FILLER_REGEX = re.compile(
    r"\b(um+|uh+|er+|ahem+|hm+|hmm+|you know|like,\s*|sort of|kind of)\b",
    re.IGNORECASE,
)

# Spoken mathematical word replacements
MATH_REPLACEMENTS = [
    (re.compile(r"\bplus\b", re.IGNORECASE), "+"),
    (re.compile(r"\bminus\b", re.IGNORECASE), "-"),
    (re.compile(r"\bequals?\s+to\b|\bequals?\b", re.IGNORECASE), "="),
    (re.compile(r"\bdivided\s+by\b", re.IGNORECASE), "/"),
    (re.compile(r"\bmultiplied\s+by\b|\btimes\b", re.IGNORECASE), "*"),
    (re.compile(r"\bsquared\b", re.IGNORECASE), "^2"),
    (re.compile(r"\bcubed\b", re.IGNORECASE), "^3"),
    (re.compile(r"(\d+)\s+([a-zA-Z])\b"), r"\1\2"),  # "2 x" -> "2x"
    (re.compile(r"(\d+)\s*\+\s*(\d+)"), r"\1 + \2"),
    (re.compile(r"(\d+)\s*\-\s*(\d+)"), r"\1 - \2"),
    (re.compile(r"(\d+)\s*\=\s*(\d+)"), r"\1 = \2"),
]


def clean_voice_transcript(raw_transcript: str, *, language: str = "en-IN") -> dict[str, Any]:
    """Clean and polish raw audio speech-to-text input."""
    text = (raw_transcript or "").strip()
    if not text:
        return {"original": "", "cleaned": "", "was_modified": False, "language": language}

    cleaned = text

    # 1. Remove verbal fillers
    cleaned = FILLER_REGEX.sub("", cleaned)

    # 2. Mathematical pattern formatting
    for pattern, replacement in MATH_REPLACEMENTS:
        cleaned = pattern.sub(replacement, cleaned)

    # 3. Clean up multiple spaces, misplaced commas, and trim
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"\s*,\s*", ", ", cleaned)
    cleaned = re.sub(r",\s*,+", ",", cleaned)
    cleaned = cleaned.strip(" ,.-")

    # Capitalize first character if non-empty
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]

    return {
        "original": text,
        "cleaned": cleaned,
        "was_modified": cleaned != text,
        "language": language,
    }
