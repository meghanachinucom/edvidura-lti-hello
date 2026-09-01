"""C8 Skills / competency registry — catalog, question links, remediation."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db

# Built-in starter catalog (used when tenant has no skills yet / fallback keys)
DEFAULT_SKILLS: tuple[dict[str, Any], ...] = (
    {
        "skill_code": "lti_launch",
        "label": "LTI launch",
        "description": "How the tool opens from Moodle via LTI 1.3.",
        "question_keys": ("q1",),
        "manual_focus": "lti-launch",
        "prefer_path": "lessons",
        "teleport_label": "Review: how LTI launch works",
        "teleport_hint": "Open the launch lesson, then practice this item",
    },
    {
        "skill_code": "tenant_isolation",
        "label": "Tenant isolation",
        "description": "Each school’s data stays private under RLS.",
        "question_keys": ("q2",),
        "manual_focus": "tenant-isolation",
        "prefer_path": "lessons",
        "teleport_label": "Review: tenant isolation",
        "teleport_hint": "Re-read isolation, then retry this skill",
    },
    {
        "skill_code": "gradebook_sync",
        "label": "Gradebook sync",
        "description": "Official scores live in Moodle via AGS.",
        "question_keys": ("q3",),
        "manual_focus": "gradebook-sync",
        "prefer_path": "manuals",
        "teleport_label": "Review: Moodle gradebook vs EdVidura",
        "teleport_hint": "Open the pinned manual section on grade sync",
    },
)


def list_skills(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.skill_code, s.label, s.description, s.status, s.position,
                   COALESCE(
                     (SELECT array_agg(si.question_key ORDER BY si.question_key)
                      FROM skill_items si WHERE si.skill_id = s.id),
                     ARRAY[]::text[]
                   ) AS question_keys,
                   r.lesson_id, r.manual_id, r.manual_focus, r.prefer_path,
                   r.teleport_label, r.teleport_hint
            FROM skills s
            LEFT JOIN skill_remediation r ON r.skill_id = s.id
            WHERE s.status = 'active'
            ORDER BY s.position, s.label
            """
        ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item["id"] = str(item["id"])
            if item.get("lesson_id"):
                item["lesson_id"] = str(item["lesson_id"])
            if item.get("manual_id"):
                item["manual_id"] = str(item["manual_id"])
            keys = item.get("question_keys") or []
            if not isinstance(keys, list):
                keys = list(keys)
            item["question_keys"] = [str(k) for k in keys]
            out.append(item)
        return out


def upsert_skill_pack(
    tenant_id: UUID | str, specs: tuple[dict[str, Any], ...] | list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Idempotent upsert of skills + question links + remediation from specs."""
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        for i, spec in enumerate(specs, start=1):
            row = conn.execute(
                """
                INSERT INTO skills (
                    tenant_id, skill_code, label, description, status, position
                )
                VALUES (%s, %s, %s, %s, 'active', %s)
                ON CONFLICT (tenant_id, skill_code) DO UPDATE
                  SET label = EXCLUDED.label,
                      description = EXCLUDED.description,
                      status = 'active',
                      position = EXCLUDED.position
                RETURNING id
                """,
                (
                    tid,
                    spec["skill_code"],
                    spec["label"],
                    spec.get("description") or "",
                    int(spec.get("position") or i),
                ),
            ).fetchone()
            skill_id = str(row["id"])
            for qk in spec.get("question_keys") or ():
                conn.execute(
                    """
                    INSERT INTO skill_items (tenant_id, skill_id, question_key)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (tenant_id, question_key) DO UPDATE
                      SET skill_id = EXCLUDED.skill_id
                    """,
                    (tid, skill_id, qk),
                )
            conn.execute(
                """
                INSERT INTO skill_remediation (
                    skill_id, tenant_id, lesson_id, manual_id, manual_focus,
                    prefer_path, teleport_label, teleport_hint, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (skill_id) DO UPDATE
                  SET lesson_id = COALESCE(EXCLUDED.lesson_id, skill_remediation.lesson_id),
                      manual_id = COALESCE(EXCLUDED.manual_id, skill_remediation.manual_id),
                      manual_focus = EXCLUDED.manual_focus,
                      prefer_path = EXCLUDED.prefer_path,
                      teleport_label = EXCLUDED.teleport_label,
                      teleport_hint = EXCLUDED.teleport_hint,
                      updated_at = now()
                """,
                (
                    skill_id,
                    tid,
                    spec.get("lesson_id") or None,
                    spec.get("manual_id") or None,
                    spec.get("manual_focus") or "",
                    spec.get("prefer_path") or "manuals",
                    spec.get("teleport_label") or "",
                    spec.get("teleport_hint") or "",
                ),
            )
    return list_skills(tenant_id)


def ensure_default_skills(tenant_id: UUID | str) -> list[dict[str, Any]]:
    """Idempotent seed of starter skills for a tenant (no-op if any exist)."""
    existing = list_skills(tenant_id)
    if existing:
        return existing
    return upsert_skill_pack(tenant_id, DEFAULT_SKILLS)


def create_skill(
    tenant_id: UUID | str,
    *,
    skill_code: str,
    label: str,
    description: str = "",
) -> dict[str, Any]:
    code = (skill_code or "").strip().lower().replace(" ", "_")
    label_s = (label or "").strip()
    if not code or not label_s:
        raise ValueError("Skill code and label required")
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        pos = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM skills"
        ).fetchone()
        row = conn.execute(
            """
            INSERT INTO skills (
                tenant_id, skill_code, label, description, status, position
            )
            VALUES (%s, %s, %s, %s, 'active', %s)
            ON CONFLICT (tenant_id, skill_code) DO UPDATE
              SET label = EXCLUDED.label,
                  description = EXCLUDED.description,
                  status = 'active'
            RETURNING id, skill_code, label, description, status, position
            """,
            (tid, code, label_s, (description or "").strip(), int(pos["n"])),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        return item


def link_question_to_skill(
    tenant_id: UUID | str,
    *,
    question_key: str,
    skill_id: UUID | str,
) -> None:
    qk = (question_key or "").strip()
    if not qk:
        raise ValueError("question_key required")
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        conn.execute(
            """
            INSERT INTO skill_items (tenant_id, skill_id, question_key)
            VALUES (%s, %s, %s)
            ON CONFLICT (tenant_id, question_key) DO UPDATE
              SET skill_id = EXCLUDED.skill_id
            """,
            (tid, str(skill_id), qk),
        )


def set_skill_remediation(
    tenant_id: UUID | str,
    skill_id: UUID | str,
    *,
    lesson_id: str | None = None,
    manual_id: str | None = None,
    manual_focus: str = "",
    prefer_path: str = "manuals",
    teleport_label: str = "",
    teleport_hint: str = "",
) -> None:
    path = prefer_path if prefer_path in {"lessons", "manuals"} else "manuals"
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        conn.execute(
            """
            INSERT INTO skill_remediation (
                skill_id, tenant_id, lesson_id, manual_id, manual_focus,
                prefer_path, teleport_label, teleport_hint, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (skill_id) DO UPDATE
              SET lesson_id = EXCLUDED.lesson_id,
                  manual_id = EXCLUDED.manual_id,
                  manual_focus = EXCLUDED.manual_focus,
                  prefer_path = EXCLUDED.prefer_path,
                  teleport_label = EXCLUDED.teleport_label,
                  teleport_hint = EXCLUDED.teleport_hint,
                  updated_at = now()
            """,
            (
                str(skill_id),
                tid,
                lesson_id or None,
                manual_id or None,
                (manual_focus or "").strip(),
                path,
                (teleport_label or "").strip(),
                (teleport_hint or "").strip(),
            ),
        )


def skill_map_by_question(tenant_id: UUID | str) -> dict[str, dict[str, Any]]:
    """question_key → skill + remediation dict."""
    skills = ensure_default_skills(tenant_id)
    out: dict[str, dict[str, Any]] = {}
    for s in skills:
        for qk in s.get("question_keys") or []:
            out[str(qk)] = s
    return out


def remediation_for_question(
    tenant_id: UUID | str, question_key: str
) -> dict[str, Any] | None:
    m = skill_map_by_question(tenant_id)
    skill = m.get((question_key or "").strip())
    if not skill:
        return None
    return {
        "skill_id": skill["id"],
        "skill_code": skill["skill_code"],
        "label": skill.get("teleport_label") or f"Review: {skill['label']}",
        "lesson_hint": skill.get("teleport_hint")
        or "Review the linked material, practice, then graded retry.",
        "path": skill.get("prefer_path") or "manuals",
        "competency": skill["skill_code"],
        "manual_focus": skill.get("manual_focus") or "",
        "lesson_id": skill.get("lesson_id"),
        "manual_id": skill.get("manual_id"),
    }


def competency_catalog(tenant_id: UUID | str) -> dict[str, dict[str, Any]]:
    """Shape compatible with legacy COMPETENCIES dict."""
    skills = ensure_default_skills(tenant_id)
    out: dict[str, dict[str, Any]] = {}
    for s in skills:
        out[s["skill_code"]] = {
            "id": s["skill_code"],
            "label": s["label"],
            "questions": tuple(s.get("question_keys") or ()),
            "skill_uuid": s["id"],
        }
    return out


def bind_default_manual(
    tenant_id: UUID | str, manual_id: UUID | str
) -> None:
    """Attach a published manual to every skill (for focus deep-links)."""
    mid = str(manual_id)
    for s in ensure_default_skills(tenant_id):
        set_skill_remediation(
            tenant_id,
            s["id"],
            lesson_id=s.get("lesson_id"),
            manual_id=mid,
            manual_focus=s.get("manual_focus") or "",
            prefer_path=s.get("prefer_path") or "manuals",
            teleport_label=s.get("teleport_label") or "",
            teleport_hint=s.get("teleport_hint") or "",
        )


def bind_default_lesson(
    tenant_id: UUID | str, lesson_id: UUID | str
) -> None:
    """Attach a reading lesson to skills that prefer the lessons path."""
    lid = str(lesson_id)
    for s in ensure_default_skills(tenant_id):
        if (s.get("prefer_path") or "manuals") != "lessons":
            continue
        set_skill_remediation(
            tenant_id,
            s["id"],
            lesson_id=lid,
            manual_id=s.get("manual_id"),
            manual_focus=s.get("manual_focus") or "",
            prefer_path="lessons",
            teleport_label=s.get("teleport_label") or "",
            teleport_hint=s.get("teleport_hint") or "",
        )


# --- D23 role skill matrices -------------------------------------------------

DEFAULT_ROLES: tuple[dict[str, Any], ...] = (
    {
        "role_code": "learner",
        "label": "Learner",
        "description": "Standard course path — all active skills required.",
        "position": 1,
        "all_skills": True,
    },
    {
        "role_code": "technician",
        "label": "Technician",
        "description": "Hands-on operator role — isolation and gradebook skills.",
        "position": 2,
        "skill_codes": ("tenant_isolation", "gradebook_sync", "solve_linear", "variables"),
    },
    {
        "role_code": "supervisor",
        "label": "Supervisor",
        "description": "Lead / check path — launch + gradebook awareness.",
        "position": 3,
        "skill_codes": ("lti_launch", "gradebook_sync", "solve_linear"),
    },
)


def list_role_profiles(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT r.id, r.role_code, r.label, r.description, r.position, r.status,
                   COALESCE(
                     (SELECT array_agg(s.skill_code ORDER BY s.position)
                      FROM role_skill_requirements rr
                      JOIN skills s ON s.id = rr.skill_id
                      WHERE rr.role_id = r.id),
                     ARRAY[]::text[]
                   ) AS skill_codes,
                   COALESCE(
                     (SELECT array_agg(rr.skill_id::text ORDER BY s.position)
                      FROM role_skill_requirements rr
                      JOIN skills s ON s.id = rr.skill_id
                      WHERE rr.role_id = r.id),
                     ARRAY[]::text[]
                   ) AS skill_ids
            FROM role_profiles r
            WHERE r.status = 'active'
            ORDER BY r.position, r.label
            """
        ).fetchall()
        out = []
        for row in rows:
            item = dict(row)
            item["id"] = str(item["id"])
            codes = item.get("skill_codes") or []
            ids = item.get("skill_ids") or []
            if not isinstance(codes, list):
                codes = list(codes)
            if not isinstance(ids, list):
                ids = list(ids)
            item["skill_codes"] = [str(c) for c in codes]
            item["skill_ids"] = [str(i) for i in ids]
            out.append(item)
        return out


def create_role_profile(
    tenant_id: UUID | str,
    *,
    role_code: str,
    label: str,
    description: str = "",
    position: int | None = None,
) -> dict[str, Any]:
    code = (role_code or "").strip().lower().replace(" ", "_")
    lab = (label or "").strip()
    if not code or not lab:
        raise ValueError("role_code and label required")
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        if position is None:
            pos_row = conn.execute(
                "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM role_profiles"
            ).fetchone()
            position = int(pos_row["n"])
        row = conn.execute(
            """
            INSERT INTO role_profiles (
                tenant_id, role_code, label, description, position
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (tenant_id, role_code) DO UPDATE
              SET label = EXCLUDED.label,
                  description = EXCLUDED.description,
                  status = 'active'
            RETURNING id, role_code, label, description, position, status
            """,
            (tid, code, lab, description or "", int(position)),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        item["skill_codes"] = []
        item["skill_ids"] = []
        return item


def set_role_skills(
    tenant_id: UUID | str,
    role_id: UUID | str,
    skill_ids: list[str],
) -> None:
    tid = str(tenant_id)
    rid = str(role_id)
    unique = []
    seen: set[str] = set()
    for sid in skill_ids:
        s = str(sid or "").strip()
        if s and s not in seen:
            seen.add(s)
            unique.append(s)
    with db.tenant_connection(tid) as conn:
        conn.execute(
            "DELETE FROM role_skill_requirements WHERE role_id = %s",
            (rid,),
        )
        for sid in unique:
            conn.execute(
                """
                INSERT INTO role_skill_requirements (tenant_id, role_id, skill_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (tenant_id, role_id, skill_id) DO NOTHING
                """,
                (tid, rid, sid),
            )


def add_role_skill(
    tenant_id: UUID | str, role_id: UUID | str, skill_id: UUID | str
) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            INSERT INTO role_skill_requirements (tenant_id, role_id, skill_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (tenant_id, role_id, skill_id) DO NOTHING
            """,
            (str(tenant_id), str(role_id), str(skill_id)),
        )


def ensure_default_roles(tenant_id: UUID | str) -> list[dict[str, Any]]:
    """Seed starter roles and link to existing skills when possible."""
    existing = list_role_profiles(tenant_id)
    if existing:
        return existing
    skills = ensure_default_skills(tenant_id)
    by_code = {s["skill_code"]: s for s in skills}
    for spec in DEFAULT_ROLES:
        role = create_role_profile(
            tenant_id,
            role_code=str(spec["role_code"]),
            label=str(spec["label"]),
            description=str(spec.get("description") or ""),
            position=int(spec.get("position") or 1),
        )
        if spec.get("all_skills"):
            ids = [s["id"] for s in skills]
        else:
            ids = [
                by_code[c]["id"]
                for c in (spec.get("skill_codes") or ())
                if c in by_code
            ]
        if ids:
            set_role_skills(tenant_id, role["id"], ids)
    return list_role_profiles(tenant_id)


def required_skills_for_role(
    tenant_id: UUID | str, role_code: str
) -> list[dict[str, Any]]:
    """Full skill rows required by a role_code."""
    code = (role_code or "").strip().lower()
    if not code:
        return []
    roles = {r["role_code"]: r for r in list_role_profiles(tenant_id)}
    role = roles.get(code)
    if not role:
        return []
    wanted = set(role.get("skill_codes") or [])
    return [s for s in list_skills(tenant_id) if s["skill_code"] in wanted]


def skill_gaps_for_role(
    tenant_id: UUID | str,
    *,
    role_code: str,
    answers: Any = None,
) -> list[dict[str, Any]]:
    """
    Difference training: required skills for role minus demonstrated mastery.

    Mastery = skill appears in attempt with status strong/mastered (not weak/developing).
    Untested required skills count as gaps.
    """
    from app.modules.specials import competency_profile

    required = required_skills_for_role(tenant_id, role_code)
    if not required:
        return []
    profile = {
        str(r.get("id") or ""): r
        for r in competency_profile(answers, tenant_id=tenant_id)
    }
    gaps: list[dict[str, Any]] = []
    for s in required:
        code = s["skill_code"]
        row = profile.get(code)
        if row and row.get("status") in {"strong", "mastered"} and int(row.get("total") or 0) > 0:
            continue
        gaps.append(
            {
                "id": code,
                "label": s.get("label") or code,
                "status": (row or {}).get("status") or "untested",
                "percent": (row or {}).get("percent"),
                "total": int((row or {}).get("total") or 0),
                "skill_id": s["id"],
                "prefer_path": s.get("prefer_path"),
                "lesson_id": s.get("lesson_id"),
                "manual_id": s.get("manual_id"),
                "manual_focus": s.get("manual_focus"),
                "teleport_label": s.get("teleport_label"),
            }
        )
    return gaps
