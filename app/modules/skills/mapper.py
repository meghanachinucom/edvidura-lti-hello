"""CAT F-4 — map Technical Order / upload text onto competency skills."""
from __future__ import annotations

import re
from typing import Any

_TO_CODE = re.compile(
    r"\b((?:TO|EO|OBJ|COMP)[- ]?\d+(?:\.\d+)*)\b", re.IGNORECASE
)
_LABELED = re.compile(
    r"^(?:(?:terminal|enabling)\s+)?"
    r"(?:objective|competency|skill|outcome|task)\s*[:.\-]\s*(.+)$",
    re.IGNORECASE,
)
_SHALL = re.compile(
    r"(?:the\s+)?(?:student|learner|technician|operator|trainee)s?\s+"
    r"(?:will|shall|must|is able to)\s+(.+)",
    re.IGNORECASE,
)
_NUMBERED = re.compile(r"^\s*(?:\d+[.)]|[A-Z]\))\s+([A-Z].{12,180})\s*$")
_HEADING = re.compile(r"^\s{0,3}#{1,3}\s+(.+)$")
_NOISE = re.compile(
    r"^(page\s+\d+|table of contents|revision|confidential)\b", re.IGNORECASE
)


def _norm_code(raw: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "_", (raw or "").strip().lower()).strip("_")
    return text[:48]


def _clean_label(raw: str) -> str:
    label = re.sub(r"\s+", " ", (raw or "").strip(" .;:-"))
    return label[:160]


def extract_objectives(text: str) -> list[dict[str, str]]:
    """Pull TO / objective / competency lines from a Technical Order or upload."""
    seen: set[str] = set()
    out: list[dict[str, str]] = []

    def _add(code: str, label: str, source: str) -> None:
        title = _clean_label(label)
        if len(title) < 8 or _NOISE.match(title):
            return
        key = _norm_code(code) or _norm_code(title)
        if not key or key in seen:
            return
        seen.add(key)
        out.append(
            {
                "to_code": _norm_code(code) or key,
                "label": title,
                "skill_code": key,
                "source": source,
            }
        )

    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line or _NOISE.match(line):
            continue
        heading = _HEADING.match(line)
        if heading:
            _add("", heading.group(1), "heading")
            continue
        labeled = _LABELED.match(line)
        if labeled:
            rest = labeled.group(1)
            code_m = _TO_CODE.search(line)
            _add(code_m.group(1) if code_m else "", rest, "labeled")
            continue
        shall = _SHALL.search(line)
        if shall:
            code_m = _TO_CODE.search(line)
            _add(code_m.group(1) if code_m else "", shall.group(1), "shall")
            continue
        numbered = _NUMBERED.match(line)
        if numbered:
            _add("", numbered.group(1), "numbered")
            continue
        code_m = _TO_CODE.search(line)
        if code_m and len(line) > 12:
            rest = _TO_CODE.sub("", line).strip(" :-")
            _add(code_m.group(1), rest or line, "to_code")

    return out[:40]


def _score_match(objective: dict[str, str], skill: dict[str, Any]) -> float:
    code = (objective.get("skill_code") or "").lower()
    label = (objective.get("label") or "").lower()
    scode = str(skill.get("skill_code") or "").lower()
    slabel = str(skill.get("label") or "").lower()
    if code and code == scode:
        return 1.0
    if label and label == slabel:
        return 0.95
    if scode and scode in label:
        return 0.8
    if slabel and slabel in label:
        return 0.75
    tokens = {t for t in re.split(r"[_\s]+", label) if len(t) > 3}
    stokens = {t for t in re.split(r"[_\s]+", slabel + " " + scode) if len(t) > 3}
    if not tokens or not stokens:
        return 0.0
    overlap = len(tokens & stokens) / max(1, len(tokens))
    return round(overlap, 3) if overlap >= 0.4 else 0.0


def map_competencies_from_text(
    text: str,
    *,
    existing: list[dict[str, Any]] | None = None,
    title: str = "",
) -> list[dict[str, Any]]:
    """Heuristic AI competency mapper: TO lines → existing or new skills."""
    objectives = extract_objectives(text)
    catalog = list(existing or [])
    mapped: list[dict[str, Any]] = []
    for obj in objectives:
        best: dict[str, Any] | None = None
        best_score = 0.0
        for skill in catalog:
            score = _score_match(obj, skill)
            if score > best_score:
                best_score = score
                best = skill
        if best is not None and best_score >= 0.5:
            mapped.append(
                {
                    "to_code": obj["to_code"],
                    "to_label": obj["label"],
                    "skill_code": best.get("skill_code") or obj["skill_code"],
                    "label": best.get("label") or obj["label"],
                    "skill_id": str(best.get("id") or ""),
                    "confidence": min(0.99, best_score),
                    "matched": True,
                    "source": obj["source"],
                }
            )
        else:
            mapped.append(
                {
                    "to_code": obj["to_code"],
                    "to_label": obj["label"],
                    "skill_code": obj["skill_code"],
                    "label": obj["label"],
                    "skill_id": "",
                    "confidence": 0.55,
                    "matched": False,
                    "source": obj["source"],
                }
            )
    if not mapped and (text or "").strip():
        fallback = _clean_label(title) or "Technical order competency"
        mapped.append(
            {
                "to_code": _norm_code(fallback) or "to_document",
                "to_label": fallback,
                "skill_code": _norm_code(fallback) or "to_document",
                "label": fallback,
                "skill_id": "",
                "confidence": 0.4,
                "matched": False,
                "source": "document",
            }
        )
    return mapped
