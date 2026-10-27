"""LTI Advantage Group Services (IMS LTI-GS) + local group assignments.

Moodle Group Services is optional. Teachers can still form groups from the
NRPS roster and assign a quiz / lesson to a group.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

from app import db

GS_CLAIM = "https://purl.imsglobal.org/spec/lti-gs/claim/groupsservice"
GS_SCOPE = "https://purl.imsglobal.org/spec/lti-gs/scope/contextgroup.readonly"


def gs_claim_from_launch(launch_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(launch_data, dict):
        return {}
    claim = launch_data.get(GS_CLAIM) or {}
    return claim if isinstance(claim, dict) else {}


def has_gs_on_launch(launch_data: dict[str, Any] | None) -> bool:
    claim = gs_claim_from_launch(launch_data)
    return bool(
        str(claim.get("context_groups_url") or claim.get("contextGroupsUrl") or "").strip()
    )


def normalize_gs_group(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Map an LTI-GS group object to a stable cache row."""
    if not isinstance(raw, dict):
        return None
    gid = str(
        raw.get("id")
        or raw.get("group_id")
        or raw.get("set_id")
        or raw.get("tag")
        or ""
    ).strip()
    name = str(raw.get("name") or raw.get("title") or gid).strip()
    if not gid and not name:
        return None
    if not gid:
        gid = name
    members_raw = raw.get("members") or raw.get("users") or []
    members: list[dict[str, str]] = []
    if isinstance(members_raw, list):
        for m in members_raw:
            if isinstance(m, str) and m.strip():
                members.append({"user_id": m.strip(), "name": m.strip()})
            elif isinstance(m, dict):
                uid = str(m.get("user_id") or m.get("userId") or m.get("id") or "").strip()
                if uid:
                    members.append(
                        {
                            "user_id": uid,
                            "name": str(m.get("name") or uid),
                        }
                    )
    return {
        "group_id": gid,
        "name": name or gid,
        "tag": str(raw.get("tag") or ""),
        "set_id": str(raw.get("set_id") or raw.get("setId") or ""),
        "members": members,
    }


def save_groups(
    tenant_id: UUID | str,
    *,
    lti_context_id: str,
    groups: list[dict[str, Any]],
    class_id: str | None = None,
    source: str = "lti-gs",
) -> list[dict[str, Any]]:
    ctx = (lti_context_id or "").strip()
    if not ctx:
        raise ValueError("lti_context_id required")
    tid = str(tenant_id)
    saved: list[dict[str, Any]] = []
    with db.tenant_connection(tid) as conn:
        for raw in groups:
            item = normalize_gs_group(raw if isinstance(raw, dict) else {})
            if not item:
                continue
            row = conn.execute(
                """
                INSERT INTO lti_context_groups (
                    tenant_id, lti_context_id, class_id, group_id, name, tag, set_id,
                    members, member_count, source, fetched_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, now())
                ON CONFLICT (tenant_id, lti_context_id, group_id) DO UPDATE
                  SET class_id = COALESCE(EXCLUDED.class_id, lti_context_groups.class_id),
                      name = EXCLUDED.name,
                      tag = EXCLUDED.tag,
                      set_id = EXCLUDED.set_id,
                      members = EXCLUDED.members,
                      member_count = EXCLUDED.member_count,
                      source = EXCLUDED.source,
                      fetched_at = now()
                RETURNING id, group_id, name, tag, set_id, members, member_count, source, fetched_at
                """,
                (
                    tid,
                    ctx,
                    class_id or None,
                    item["group_id"],
                    item["name"],
                    item["tag"],
                    item["set_id"],
                    json.dumps(item["members"]),
                    len(item["members"]),
                    source,
                ),
            ).fetchone()
            saved.append(_row(row))
    return saved


def create_local_group(
    tenant_id: UUID | str,
    *,
    lti_context_id: str,
    name: str,
    members: list[dict[str, Any]] | None = None,
    class_id: str | None = None,
) -> dict[str, Any]:
    label = (name or "").strip() or "Group"
    gid = f"local-{uuid4().hex[:10]}"
    rows = save_groups(
        tenant_id,
        lti_context_id=lti_context_id or "local",
        groups=[
            {
                "id": gid,
                "name": label,
                "members": members or [],
            }
        ],
        class_id=class_id,
        source="local",
    )
    if not rows:
        raise ValueError("Could not create group")
    return rows[0]


def list_groups(
    tenant_id: UUID | str,
    *,
    lti_context_id: str | None = None,
) -> list[dict[str, Any]]:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        if lti_context_id:
            rows = conn.execute(
                """
                SELECT id, group_id, name, tag, set_id, members, member_count, source,
                       lti_context_id, fetched_at
                FROM lti_context_groups
                WHERE lti_context_id = %s
                ORDER BY name ASC
                """,
                (lti_context_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, group_id, name, tag, set_id, members, member_count, source,
                       lti_context_id, fetched_at
                FROM lti_context_groups
                ORDER BY name ASC
                """
            ).fetchall()
    return [_row(r) for r in rows]


def assign_activity(
    tenant_id: UUID | str,
    *,
    group_id: str,
    activity_type: str,
    activity_id: str,
    title: str = "",
) -> dict[str, Any]:
    kind = (activity_type or "quiz").strip().lower()
    if kind not in {"quiz", "lesson", "manual"}:
        kind = "quiz"
    aid = (activity_id or "").strip()
    if not aid:
        raise ValueError("activity_id required")
    gid = (group_id or "").strip()
    if not gid:
        raise ValueError("group_id required")
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        group = conn.execute(
            """
            SELECT id FROM lti_context_groups
            WHERE group_id = %s OR id::text = %s
            ORDER BY fetched_at DESC
            LIMIT 1
            """,
            (gid, gid),
        ).fetchone()
        if not group:
            raise ValueError("Unknown group")
        row = conn.execute(
            """
            INSERT INTO group_assignments (
                tenant_id, group_row_id, activity_type, activity_id, title
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, activity_type, activity_id, title, created_at
            """,
            (tid, str(group["id"]), kind, aid, (title or kind).strip()[:160]),
        ).fetchone()
    pack = dict(row)
    pack["id"] = str(pack["id"])
    pack["group_id"] = gid
    if hasattr(pack.get("created_at"), "isoformat"):
        pack["created_at"] = pack["created_at"].isoformat()
    return pack


def list_assignments(
    tenant_id: UUID | str,
    *,
    group_id: str | None = None,
) -> list[dict[str, Any]]:
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        if group_id:
            rows = conn.execute(
                """
                SELECT a.id, a.activity_type, a.activity_id, a.title, a.created_at,
                       g.group_id, g.name AS group_name
                FROM group_assignments a
                JOIN lti_context_groups g ON g.id = a.group_row_id
                WHERE g.group_id = %s OR g.id::text = %s
                ORDER BY a.created_at DESC
                """,
                (group_id, group_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT a.id, a.activity_type, a.activity_id, a.title, a.created_at,
                       g.group_id, g.name AS group_name
                FROM group_assignments a
                JOIN lti_context_groups g ON g.id = a.group_row_id
                ORDER BY a.created_at DESC
                """
            ).fetchall()
    out = []
    for r in rows:
        item = dict(r)
        item["id"] = str(item["id"])
        if hasattr(item.get("created_at"), "isoformat"):
            item["created_at"] = item["created_at"].isoformat()
        out.append(item)
    return out


def groups_for_member(tenant_id: UUID | str, user_id: str) -> list[dict[str, Any]]:
    uid = (user_id or "").strip()
    if not uid:
        return []
    matched = []
    for g in list_groups(tenant_id):
        members = g.get("members") or []
        if any(str(m.get("user_id") or "") == uid for m in members):
            matched.append(g)
    return matched


def assignments_for_member(
    tenant_id: UUID | str, user_id: str
) -> list[dict[str, Any]]:
    """Group assignments visible to a learner (union of their groups)."""
    mine = {str(g.get("group_id") or "") for g in groups_for_member(tenant_id, user_id)}
    mine.discard("")
    if not mine:
        return []
    return [a for a in list_assignments(tenant_id) if str(a.get("group_id") or "") in mine]


def evaluate_activity_access(
    *,
    assignments: list[dict[str, Any]],
    member_group_ids: set[str] | list[str],
    activity_type: str,
    activity_id: str = "",
    is_staff: bool = False,
) -> dict[str, Any]:
    """Decide whether a learner may take a group-assigned activity.

    If nobody in the class has been assigned this activity type, the activity
    is open. Once a teacher assigns it to one or more groups, only members of
    those groups may take the graded activity.
    """
    if is_staff:
        return {
            "allowed": True,
            "restricted": False,
            "assignment": None,
            "reason": "staff",
        }
    kind = (activity_type or "quiz").strip().lower() or "quiz"
    aid = (activity_id or "").strip()
    typed = [
        a
        for a in assignments
        if str(a.get("activity_type") or "quiz").strip().lower() == kind
    ]
    if aid:
        matching = [
            a
            for a in typed
            if str(a.get("activity_id") or "").strip() in {"", aid}
        ]
        if matching:
            typed = matching
    if not typed:
        return {
            "allowed": True,
            "restricted": False,
            "assignment": None,
            "reason": "open",
        }
    gids = {str(g).strip() for g in member_group_ids if str(g).strip()}
    mine = [a for a in typed if str(a.get("group_id") or "") in gids]
    if mine:
        return {
            "allowed": True,
            "restricted": True,
            "assignment": mine[0],
            "reason": "assigned",
        }
    return {
        "allowed": False,
        "restricted": True,
        "assignment": None,
        "reason": "not_assigned",
        "assigned_groups": [
            {
                "group_id": str(a.get("group_id") or ""),
                "group_name": str(a.get("group_name") or ""),
                "title": str(a.get("title") or ""),
            }
            for a in typed
        ],
    }


def activity_access(
    tenant_id: UUID | str,
    user_id: str,
    activity_type: str,
    activity_id: str = "",
    *,
    is_staff: bool = False,
) -> dict[str, Any]:
    if is_staff:
        return evaluate_activity_access(
            assignments=[],
            member_group_ids=set(),
            activity_type=activity_type,
            activity_id=activity_id,
            is_staff=True,
        )
    groups = groups_for_member(tenant_id, user_id)
    return evaluate_activity_access(
        assignments=list_assignments(tenant_id),
        member_group_ids={str(g.get("group_id") or "") for g in groups},
        activity_type=activity_type,
        activity_id=activity_id,
        is_staff=False,
    )


def _row(row: Any) -> dict[str, Any]:
    item = dict(row or {})
    item["id"] = str(item.get("id") or "")
    members = item.get("members") or []
    if isinstance(members, str):
        try:
            members = json.loads(members)
        except json.JSONDecodeError:
            members = []
    item["members"] = members if isinstance(members, list) else []
    if hasattr(item.get("fetched_at"), "isoformat"):
        item["fetched_at"] = item["fetched_at"].isoformat()
    return item
