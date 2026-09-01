"""D08 competency framework import + TO→skill proposals."""
from __future__ import annotations

import csv
import io
import json
from typing import Any
from uuid import UUID

from app import db
from app.modules.skills.service import upsert_skill_pack


def _norm_code(raw: str) -> str:
    return (raw or "").strip().lower().replace(" ", "_").replace("-", "_")


def parse_framework_json(data: Any) -> list[dict[str, Any]]:
    """Accept list or {skills|competencies|items: [...]}."""
    if isinstance(data, dict):
        rows = (
            data.get("skills")
            or data.get("competencies")
            or data.get("items")
            or data.get("framework")
            or []
        )
    elif isinstance(data, list):
        rows = data
    else:
        raise ValueError("JSON must be a list or object with skills[]")
    if not isinstance(rows, list):
        raise ValueError("skills must be a list")
    return [normalize_spec(r) for r in rows if isinstance(r, dict)]


def parse_framework_csv(text: str | bytes) -> list[dict[str, Any]]:
    if isinstance(text, bytes):
        text = text.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict[str, Any]] = []
    for row in reader:
        if not row:
            continue
        out.append(normalize_spec(row))
    return out


def normalize_spec(raw: dict[str, Any]) -> dict[str, Any]:
    code = _norm_code(
        str(
            raw.get("skill_code")
            or raw.get("code")
            or raw.get("competency_id")
            or raw.get("id")
            or ""
        )
    )
    label = str(raw.get("label") or raw.get("title") or raw.get("name") or code).strip()
    if not code or not label:
        raise ValueError("Each skill needs skill_code/code and label/title")
    qk = raw.get("question_keys") or raw.get("questions") or ""
    if isinstance(qk, str):
        keys = [k.strip() for k in qk.replace(";", "|").split("|") if k.strip()]
    elif isinstance(qk, (list, tuple)):
        keys = [str(k).strip() for k in qk if str(k).strip()]
    else:
        keys = []
    return {
        "skill_code": code,
        "label": label,
        "description": str(raw.get("description") or raw.get("desc") or "").strip(),
        "external_id": str(raw.get("external_id") or raw.get("ieee_id") or "").strip(),
        "system": str(raw.get("system") or "ieee").strip() or "ieee",
        "parent_code": _norm_code(str(raw.get("parent_code") or raw.get("parent") or "")),
        "question_keys": tuple(keys),
        "to_code": _norm_code(str(raw.get("to_code") or raw.get("objective_code") or "")),
        "to_label": str(raw.get("to_label") or raw.get("objective") or "").strip(),
        "manual_focus": str(raw.get("manual_focus") or "").strip(),
        "prefer_path": str(raw.get("prefer_path") or "lessons").strip() or "lessons",
    }


def create_framework_import(
    tenant_id: UUID | str,
    *,
    specs: list[dict[str, Any]],
    source_label: str = "",
    format: str = "json",
) -> dict[str, Any]:
    if not specs:
        raise ValueError("No skills to import")
    fmt = format if format in {"json", "csv"} else "json"
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            INSERT INTO skill_framework_imports (
                tenant_id, source_label, format, payload, status
            )
            VALUES (%s, %s, %s, %s::jsonb, 'pending_review')
            RETURNING id, tenant_id, source_label, format, payload, status,
                      created_at, reviewed_at, reviewed_by
            """,
            (tid, source_label or "import", fmt, json.dumps(specs)),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        item["skill_count"] = len(specs)
        return item


def list_framework_imports(
    tenant_id: UUID | str, *, status: str | None = None, limit: int = 50
) -> list[dict[str, Any]]:
    lim = max(1, min(int(limit), 200))
    with db.tenant_connection(tenant_id) as conn:
        if status:
            rows = conn.execute(
                """
                SELECT id, source_label, format, payload, status,
                       created_at, reviewed_at, reviewed_by
                FROM skill_framework_imports
                WHERE status = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (status, lim),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, source_label, format, payload, status,
                       created_at, reviewed_at, reviewed_by
                FROM skill_framework_imports
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (lim,),
            ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item["id"] = str(item["id"])
            payload = item.get("payload") or []
            if isinstance(payload, str):
                payload = json.loads(payload)
            item["payload"] = payload
            item["skill_count"] = len(payload) if isinstance(payload, list) else 0
            out.append(item)
        return out


def approve_framework_import(
    tenant_id: UUID | str,
    import_id: UUID | str,
    *,
    reviewed_by: str = "",
) -> dict[str, Any]:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            SELECT id, payload, status FROM skill_framework_imports
            WHERE id = %s
            """,
            (str(import_id),),
        ).fetchone()
        if not row:
            raise ValueError("Import not found")
        if row["status"] == "approved":
            return {"id": str(row["id"]), "status": "approved", "already": True}
        payload = row["payload"]
        if isinstance(payload, str):
            payload = json.loads(payload)
        specs = list(payload or [])

    skills = upsert_skill_pack(tid, specs)
    by_code = {s["skill_code"]: s for s in skills}

    with db.tenant_connection(tid) as conn:
        for spec in specs:
            sid = by_code.get(spec["skill_code"], {}).get("id")
            ext = (spec.get("external_id") or "").strip()
            if sid and ext:
                conn.execute(
                    """
                    INSERT INTO skill_external_ids (
                        tenant_id, skill_id, system, external_id
                    )
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (tenant_id, system, external_id) DO UPDATE
                      SET skill_id = EXCLUDED.skill_id
                    """,
                    (tid, sid, spec.get("system") or "ieee", ext),
                )
            to_code = (spec.get("to_code") or "").strip()
            if to_code and sid:
                conn.execute(
                    """
                    INSERT INTO to_skill_proposals (
                        tenant_id, to_code, to_label, skill_id, skill_code,
                        confidence, status, proposed_by
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending', 'framework_import')
                    """,
                    (
                        tid,
                        to_code,
                        spec.get("to_label") or to_code,
                        sid,
                        spec["skill_code"],
                        0.8,
                    ),
                )
        conn.execute(
            """
            UPDATE skill_framework_imports
            SET status = 'approved', reviewed_at = now(), reviewed_by = %s
            WHERE id = %s
            """,
            (reviewed_by or "ops", str(import_id)),
        )
    return {
        "id": str(import_id),
        "status": "approved",
        "skills_upserted": len(skills),
        "skills": skills,
    }


def list_to_proposals(
    tenant_id: UUID | str, *, status: str = "pending", limit: int = 100
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, to_code, to_label, skill_id, skill_code, confidence,
                   status, proposed_by, created_at, reviewed_at
            FROM to_skill_proposals
            WHERE status = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (status, max(1, min(int(limit), 200))),
        ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item["id"] = str(item["id"])
            if item.get("skill_id"):
                item["skill_id"] = str(item["skill_id"])
            out.append(item)
        return out


def approve_to_proposal(
    tenant_id: UUID | str, proposal_id: UUID | str
) -> dict[str, Any] | None:
    """Mark TO→skill mapping approved (skill already linked on import)."""
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE to_skill_proposals
            SET status = 'approved', reviewed_at = now()
            WHERE id = %s AND status = 'pending'
            RETURNING id, to_code, to_label, skill_id, skill_code, status
            """,
            (str(proposal_id),),
        ).fetchone()
        if not row:
            return None
        item = dict(row)
        item["id"] = str(item["id"])
        if item.get("skill_id"):
            item["skill_id"] = str(item["skill_id"])
        return item


def reject_to_proposal(
    tenant_id: UUID | str, proposal_id: UUID | str
) -> dict[str, Any] | None:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE to_skill_proposals
            SET status = 'rejected', reviewed_at = now()
            WHERE id = %s AND status = 'pending'
            RETURNING id, to_code, status
            """,
            (str(proposal_id),),
        ).fetchone()
        if not row:
            return None
        return {"id": str(row["id"]), "to_code": row["to_code"], "status": row["status"]}
