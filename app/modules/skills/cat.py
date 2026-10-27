"""Competency Assessment Tool — 20+ TO question bank + mapper persist."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.modules.skills.mapper import map_competencies_from_text
from app.modules.skills.service import (
    link_question_to_skill,
    list_skills,
    upsert_skill_pack,
)

CAT_MIN_BANK = 20


def generate_cat_bank(
    body: str,
    *,
    count: int = 20,
    title: str = "",
    difficulty: str = "core",
    complexity: str = "apply",
    segments: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """CAT F-1: at least 20 questions from a Technical Order / upload."""
    from app.modules.ai_assessment.service import (
        _local_mcqs_covered,
        generate_mcqs_from_text,
        normalize_difficulty,
        segment_text_for_coverage,
    )

    wanted = max(CAT_MIN_BANK, min(int(count or CAT_MIN_BANK), 80))
    result = generate_mcqs_from_text(
        body,
        count=wanted,
        title=title,
        difficulty=difficulty,
        complexity=complexity,
        segments=segments,
        cap=80,
    )
    questions = list(result.get("questions") or [])
    if len(questions) < CAT_MIN_BANK:
        segs = segments or segment_text_for_coverage(body, title=title)
        extra = _local_mcqs_covered(
            segs or [{"label": title or "Technical order", "text": body}],
            count=wanted,
            title=title,
            difficulty=normalize_difficulty(difficulty),
            complexity=complexity,
        )
        seen = {str(q.get("prompt") or "") for q in questions}
        for q in extra:
            prompt = str(q.get("prompt") or "")
            if prompt in seen:
                continue
            questions.append(q)
            seen.add(prompt)
            if len(questions) >= wanted:
                break
    for q in questions:
        q["review_status"] = "draft"
    result["questions"] = questions[:wanted]
    result["bank_size"] = len(result["questions"])
    result["review_required"] = True
    result["min_size"] = CAT_MIN_BANK
    return result


def _tag_questions(
    questions: list[dict[str, Any]], competencies: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    if not competencies:
        return questions
    n = len(competencies)
    tagged = []
    for i, q in enumerate(questions):
        skill = competencies[i % n]
        item = dict(q)
        item["skill_code"] = skill.get("skill_code") or ""
        item["topic"] = skill.get("skill_code") or skill.get("label") or item.get("topic")
        item["competency_label"] = skill.get("label") or ""
        tagged.append(item)
    return tagged


def persist_mapped_skills(
    tenant_id: UUID | str,
    mapped: list[dict[str, Any]],
    *,
    source_label: str = "",
) -> list[dict[str, Any]]:
    """Upsert proposed competencies and queue TO→skill review rows."""
    if not mapped:
        return []
    specs = [
        {
            "skill_code": row["skill_code"],
            "label": row.get("label") or row["skill_code"],
            "description": row.get("to_label") or "",
            "manual_focus": row.get("to_code") or "",
            "prefer_path": "manuals",
        }
        for row in mapped
        if row.get("skill_code")
    ]
    skills = upsert_skill_pack(tenant_id, specs)
    by_code = {s["skill_code"]: s for s in skills}
    from app.modules.skills.framework import record_to_proposals

    proposals = []
    for row in mapped:
        skill = by_code.get(row.get("skill_code") or "")
        if not skill:
            continue
        proposals.append(
            {
                "to_code": row.get("to_code") or row.get("skill_code"),
                "to_label": row.get("to_label") or row.get("label") or "",
                "skill_id": skill["id"],
                "skill_code": skill["skill_code"],
                "confidence": float(row.get("confidence") or 0.55),
            }
        )
        row["skill_id"] = skill["id"]
        row["label"] = skill.get("label") or row.get("label")
    try:
        record_to_proposals(
            tenant_id,
            proposals,
            proposed_by="cat_mapper",
            source_label=source_label,
        )
    except Exception:  # noqa: BLE001 — table may be missing on old DBs
        pass
    return mapped


def link_question_if_skill_code(
    tenant_id: UUID | str, *, question_key: str, skill_code: str
) -> bool:
    code = (skill_code or "").strip()
    key = (question_key or "").strip()
    if not code or not key:
        return False
    try:
        for skill in list_skills(tenant_id):
            if skill.get("skill_code") == code:
                link_question_to_skill(
                    tenant_id, question_key=key, skill_id=skill["id"]
                )
                return True
    except Exception:  # noqa: BLE001
        return False
    return False


def map_source(
    tenant_id: UUID | str | None,
    text: str,
    *,
    title: str = "",
    persist: bool = True,
    filename: str = "",
) -> list[dict[str, Any]]:
    existing: list[dict[str, Any]] = []
    if tenant_id:
        try:
            existing = list_skills(tenant_id)
        except Exception:  # noqa: BLE001
            existing = []
    mapped = map_competencies_from_text(text, existing=existing, title=title)
    if persist and tenant_id:
        mapped = persist_mapped_skills(
            tenant_id, mapped, source_label=filename or title or "technical_order"
        )
    return mapped


def cat_from_text(
    tenant_id: UUID | str | None,
    text: str,
    *,
    title: str = "",
    count: int = 20,
    persist: bool = True,
    filename: str = "",
    segments: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Map competencies and draft a 20+ CAT bank from TO / upload text."""
    existing: list[dict[str, Any]] = []
    if tenant_id:
        try:
            existing = list_skills(tenant_id)
        except Exception:  # noqa: BLE001
            existing = []
    mapped = map_competencies_from_text(text, existing=existing, title=title)
    if persist and tenant_id:
        mapped = persist_mapped_skills(
            tenant_id, mapped, source_label=filename or title or "technical_order"
        )
    bank = generate_cat_bank(
        text,
        count=count,
        title=title or filename or "Technical order",
        segments=segments,
    )
    questions = _tag_questions(list(bank.get("questions") or []), mapped)
    bank["questions"] = questions
    bank["competencies"] = mapped
    batch = None
    items: list[dict[str, Any]] = []
    if persist and tenant_id and questions:
        try:
            from app.modules import quiz as quiz_mod

            batch = quiz_mod.save_bank_batch(
                tenant_id,
                title=title or filename or "CAT bank",
                questions=questions,
                source_kind="technical_order",
                source_label=filename or title or "technical_order",
            )
            if batch:
                items = quiz_mod.list_bank_items(
                    tenant_id, batch_id=str(batch.get("id") or "")
                )
        except Exception:  # noqa: BLE001
            batch = None
    return {
        **bank,
        "batch": batch,
        "items": items,
        "mapped_count": len(mapped),
        "source_filename": filename,
    }


def cat_from_document(
    tenant_id: UUID | str | None,
    data: bytes,
    *,
    filename: str = "",
    title: str = "",
    count: int = 20,
    persist: bool = True,
) -> dict[str, Any]:
    from app.modules.ai_assessment.service import extract_text_from_bytes

    extracted = extract_text_from_bytes(data, filename=filename)
    label = title or extracted.get("filename") or filename or "Technical order"
    pack = cat_from_text(
        tenant_id,
        extracted["text"],
        title=label,
        count=count,
        persist=persist,
        filename=extracted.get("filename") or filename,
        segments=extracted.get("segments"),
    )
    pack["source_kind"] = extracted.get("source_kind")
    pack["page_count"] = extracted.get("page_count")
    return pack


def cat_overview(
    tenant_id: UUID | str,
    *,
    subject: str = "",
    is_staff: bool = False,
) -> dict[str, Any]:
    from app import db
    from app.modules.specials import class_competency_map, competency_profile
    from app.modules.skills.framework import list_to_proposals

    skills = []
    try:
        skills = list_skills(tenant_id)
    except Exception:  # noqa: BLE001
        skills = []
    attempts: list[dict[str, Any]] = []
    try:
        with db.tenant_connection(tenant_id) as conn:
            if not is_staff and subject:
                rows = conn.execute(
                    """
                    SELECT answers FROM quiz_attempts
                    WHERE subject = %s
                    ORDER BY created_at DESC
                    LIMIT 80
                    """,
                    (subject,),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT answers FROM quiz_attempts
                    ORDER BY created_at DESC
                    LIMIT 80
                    """,
                ).fetchall()
        attempts = [dict(r) for r in rows]
    except Exception:  # noqa: BLE001
        attempts = []
    proposals: list[dict[str, Any]] = []
    if is_staff:
        try:
            proposals = list_to_proposals(tenant_id, status="pending", limit=50)
        except Exception:  # noqa: BLE001
            proposals = []
        return {
            "skills": skills,
            "class_map": class_competency_map(attempts, tenant_id=tenant_id),
            "proposals": proposals,
            "profile": [],
        }
    last = attempts[0] if attempts else {}
    return {
        "skills": skills,
        "class_map": [],
        "proposals": [],
        "profile": competency_profile(last.get("answers"), tenant_id=tenant_id),
    }
