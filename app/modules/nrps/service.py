"""LTI Advantage NRPS — Moodle roster awareness (no EdVidura logins)."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from app import db

NRPS_CLAIM = "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice"
NRPS_SCOPE = (
    "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
)


def nrps_claim_from_launch(launch_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(launch_data, dict):
        return {}
    claim = launch_data.get(NRPS_CLAIM) or {}
    return claim if isinstance(claim, dict) else {}


def has_nrps_on_launch(launch_data: dict[str, Any] | None) -> bool:
    claim = nrps_claim_from_launch(launch_data)
    return bool(str(claim.get("context_memberships_url") or "").strip())


def normalize_member(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Map NRPS member object → stable awareness row (no passwords/accounts)."""
    if not isinstance(raw, dict):
        return None
    user_id = str(raw.get("user_id") or raw.get("userId") or "").strip()
    if not user_id:
        return None
    name = str(raw.get("name") or "").strip()
    given = str(raw.get("given_name") or raw.get("givenName") or "").strip()
    family = str(raw.get("family_name") or raw.get("familyName") or "").strip()
    if not name and (given or family):
        name = f"{given} {family}".strip()
    email = str(raw.get("email") or "").strip()
    roles = raw.get("roles") or []
    if not isinstance(roles, list):
        roles = []
    role_text = [str(r) for r in roles]
    status = str(raw.get("status") or "Active").strip() or "Active"
    return {
        "user_id": user_id,
        "name": name or user_id,
        "given_name": given,
        "family_name": family,
        "email": email,
        "roles": role_text,
        "status": status,
        "is_learner": any(
            "Learner" in r or "Student" in r for r in role_text
        )
        or not any(
            "Instructor" in r or "Administrator" in r or "ContentDeveloper" in r
            for r in role_text
        ),
        "is_instructor": any(
            "Instructor" in r or "TeachingAssistant" in r for r in role_text
        ),
    }


def fetch_members_via_launch(message_launch: Any) -> list[dict[str, Any]]:
    """Call Moodle NRPS using the restored MessageLaunch service connector."""
    if not message_launch.has_nrps():
        raise ValueError(
            "NRPS not available on this launch. In Moodle: tool Services → "
            "Names and Role Provisioning = Use this service, then relaunch."
        )
    nrps = message_launch.get_nrps()
    raw_members = nrps.get_members() or []
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in raw_members:
        item = normalize_member(raw if isinstance(raw, dict) else {})
        if not item or item["user_id"] in seen:
            continue
        seen.add(item["user_id"])
        out.append(item)
    return out


def save_roster(
    tenant_id: UUID | str,
    *,
    lti_context_id: str,
    members: list[dict[str, Any]],
    class_id: str | None = None,
) -> dict[str, Any]:
    ctx = (lti_context_id or "").strip()
    if not ctx:
        raise ValueError("lti_context_id required")
    tid = str(tenant_id)
    payload = json.dumps(members)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            INSERT INTO lti_context_rosters (
                tenant_id, lti_context_id, class_id, members, member_count,
                source, fetched_at
            )
            VALUES (%s, %s, %s, %s::jsonb, %s, 'nrps', now())
            ON CONFLICT (tenant_id, lti_context_id) DO UPDATE
              SET class_id = COALESCE(EXCLUDED.class_id, lti_context_rosters.class_id),
                  members = EXCLUDED.members,
                  member_count = EXCLUDED.member_count,
                  source = 'nrps',
                  fetched_at = now()
            RETURNING id, lti_context_id, class_id, member_count, fetched_at, source
            """,
            (
                tid,
                ctx,
                class_id or None,
                payload,
                len(members),
            ),
        ).fetchone()
        item = dict(row)
        item["id"] = str(item["id"])
        if item.get("class_id"):
            item["class_id"] = str(item["class_id"])
        item["members"] = members
        return item


def get_roster(
    tenant_id: UUID | str, lti_context_id: str
) -> dict[str, Any] | None:
    ctx = (lti_context_id or "").strip()
    if not ctx:
        return None
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, lti_context_id, class_id, members, member_count,
                   source, fetched_at
            FROM lti_context_rosters
            WHERE lti_context_id = %s
            """,
            (ctx,),
        ).fetchone()
        if not row:
            return None
        item = dict(row)
        item["id"] = str(item["id"])
        if item.get("class_id"):
            item["class_id"] = str(item["class_id"])
        members = item.get("members") or []
        if isinstance(members, str):
            members = json.loads(members)
        item["members"] = list(members) if isinstance(members, list) else []
        return item


def display_names_by_subject(
    tenant_id: UUID | str, lti_context_id: str
) -> dict[str, str]:
    roster = get_roster(tenant_id, lti_context_id)
    if not roster:
        return {}
    out: dict[str, str] = {}
    for m in roster.get("members") or []:
        uid = str(m.get("user_id") or "")
        name = str(m.get("name") or uid)
        if uid:
            out[uid] = name
    return out


def learners_from_roster(roster: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not roster:
        return []
    out = []
    for m in roster.get("members") or []:
        if m.get("status") and str(m["status"]).lower() == "inactive":
            continue
        if m.get("is_instructor") and not m.get("is_learner"):
            continue
        out.append(m)
    return out


def sync_roster_from_session(
    session: dict[str, Any],
    *,
    message_launch: Any,
) -> dict[str, Any]:
    """Fetch NRPS using launch + persist under RLS for this Moodle context."""
    members = fetch_members_via_launch(message_launch)
    ctx = str(session.get("lti_context_id") or "").strip()
    if not ctx:
        raise ValueError("No Moodle context on this launch")
    return save_roster(
        session["tenant_id"],
        lti_context_id=ctx,
        members=members,
        class_id=str(session.get("class_id") or "") or None,
    )
