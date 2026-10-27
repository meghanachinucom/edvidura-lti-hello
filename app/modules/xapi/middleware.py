"""xAPI middleware helpers: assignment dashboard, files, inbound grades, attempts.

HTTP stays in ``app.api.xapi`` / ``app.api.app_client``. This module has no FastAPI.
"""
from __future__ import annotations

import base64
import json
import mimetypes
from typing import Any
from uuid import UUID, uuid4

from app import db

VIRTUAL_ALIASES = {
    "quiz": "quiz",
    "virtual:quiz": "quiz",
    "assignments": "assignments",
    "virtual:assignments": "assignments",
    "attempts": "attempts",
    "virtual:attempts": "attempts",
    "assessment.md": "assessment.md",
    "virtual:assessment.md": "assessment.md",
    "assessment.pdf": "assessment.pdf",
    "virtual:assessment.pdf": "assessment.pdf",
}

_JSON_CT = {
    "application/json",
    "application/ld+json",
    "text/json",
    "application/vnd.api+json",
}


def detect_file_kind(
    filename: str = "",
    content_type: str = "",
    payload: bytes | bytearray | None = None,
    json_body: Any = None,
) -> dict[str, Any]:
    """F-10: sniff kind + Content-Type and pick json vs stream routing."""
    name = (filename or "").strip().lower()
    ct = (content_type or "").split(";")[0].strip().lower()
    raw = bytes(payload or b"")
    if json_body is not None and not isinstance(json_body, (bytes, bytearray, str)):
        kind, ct_out = "json", "application/json"
    elif ct in _JSON_CT or name.endswith(".json"):
        kind, ct_out = "json", ct or "application/json"
    elif ct == "application/pdf" or name.endswith(".pdf") or raw[:4] == b"%PDF":
        kind, ct_out = "pdf", "application/pdf"
    elif ct in {"text/markdown", "text/x-markdown"} or name.endswith((".md", ".markdown")):
        kind, ct_out = "markdown", ct or "text/markdown; charset=utf-8"
    elif ct.startswith("image/") or name.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")):
        kind, ct_out = "image", ct or (mimetypes.guess_type(name)[0] or "image/png")
    elif ct.startswith("text/") or name.endswith((".txt", ".csv")):
        kind, ct_out = "text", ct or "text/plain; charset=utf-8"
    elif raw[:1] in {b"{", b"["} or (
        raw.lstrip()[:1] in {b"{", b"["} if raw else False
    ):
        kind, ct_out = "json", "application/json"
    elif raw[:8] == b"\x89PNG\r\n\x1a\n":
        kind, ct_out = "image", "image/png"
    elif raw[:2] == b"\xff\xd8":
        kind, ct_out = "image", "image/jpeg"
    else:
        guessed = mimetypes.guess_type(name)[0] or ct or "application/octet-stream"
        if guessed in _JSON_CT:
            kind, ct_out = "json", guessed
        else:
            kind, ct_out = "binary", guessed
    route = "json" if kind == "json" else "stream"
    return {
        "kind": kind,
        "content_type": ct_out,
        "route": route,
        "filename": (filename or "file").strip() or "file",
    }


def put_file(
    tenant_id: UUID | str,
    *,
    filename: str,
    payload: bytes | None = None,
    json_body: Any = None,
    content_type: str = "",
    file_key: str = "",
    source: str = "upload",
) -> dict[str, Any]:
    name = (filename or "file").strip() or "file"
    key = (file_key or "").strip()
    body = bytes(payload or b"")
    detected = detect_file_kind(name, content_type, body, json_body)
    stored_json = json_body
    if stored_json is None and detected["kind"] == "json" and body:
        try:
            stored_json = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            stored_json = None
    json_dump = json.dumps(stored_json) if stored_json is not None else None
    blob = None if stored_json is not None else (body or None)
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        row = conn.execute(
            """
            INSERT INTO middleware_files (
                tenant_id, file_key, filename, content_type, kind, payload, json_body, source
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            RETURNING id, file_key, filename, content_type, kind, source, created_at
            """,
            (
                tid,
                key,
                name,
                detected["content_type"],
                detected["kind"],
                blob,
                json_dump,
                (source or "upload").strip() or "upload",
            ),
        ).fetchone()
    return _file_row(row, detected=detected)


def _file_row(row: Any, *, detected: dict[str, Any] | None = None) -> dict[str, Any]:
    item = dict(row or {})
    item["id"] = str(item.get("id") or "")
    if hasattr(item.get("created_at"), "isoformat"):
        item["created_at"] = item["created_at"].isoformat()
    meta = detected or detect_file_kind(
        str(item.get("filename") or ""),
        str(item.get("content_type") or ""),
        json_body=item.get("json_body"),
    )
    item["kind"] = item.get("kind") or meta["kind"]
    item["route"] = meta["route"]
    item["content_type"] = item.get("content_type") or meta["content_type"]
    return item


def get_stored_file(tenant_id: UUID | str, file_id: str) -> dict[str, Any] | None:
    fid = (file_id or "").strip()
    if not fid:
        return None
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, file_key, filename, content_type, kind, payload, json_body, source, created_at
            FROM middleware_files
            WHERE id::text = %s OR (file_key <> '' AND file_key = %s)
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (fid, fid),
        ).fetchone()
    if not row:
        return None
    pack = _file_row(row)
    pack["payload"] = bytes(row["payload"]) if row.get("payload") is not None else b""
    pack["json_body"] = row.get("json_body")
    return pack


def _virtual_payload(
    tenant_id: UUID | str,
    alias: str,
    *,
    subject: str = "",
) -> dict[str, Any]:
    key = VIRTUAL_ALIASES.get(alias.strip().lower(), "")
    if key == "quiz":
        from app.modules import quiz as quiz_mod

        questions = [
            quiz_mod.public_question_dict(q)
            for q in quiz_mod.questions_for_tenant(tenant_id)
        ]
        body = {"file": "quiz", "count": len(questions), "questions": questions}
        raw = json.dumps(body).encode("utf-8")
        return {
            "id": "quiz",
            "filename": "quiz.json",
            "content_type": "application/json",
            "kind": "json",
            "route": "json",
            "json_body": body,
            "payload": raw,
            "source": "virtual",
        }
    if key == "assignments":
        body = assignment_dashboard(tenant_id, subject=subject or None)
        raw = json.dumps(body, default=str).encode("utf-8")
        return {
            "id": "assignments",
            "filename": "assignments.json",
            "content_type": "application/json",
            "kind": "json",
            "route": "json",
            "json_body": body,
            "payload": raw,
            "source": "virtual",
        }
    if key == "attempts":
        body = attempt_counters(tenant_id, subject=subject or None)
        raw = json.dumps(body, default=str).encode("utf-8")
        return {
            "id": "attempts",
            "filename": "attempts.json",
            "content_type": "application/json",
            "kind": "json",
            "route": "json",
            "json_body": body,
            "payload": raw,
            "source": "virtual",
        }
    if key in {"assessment.md", "assessment.pdf"}:
        from app.modules import quiz as quiz_mod
        from app.modules.ai_assessment import assessment_markdown, assessment_pdf

        questions = [
            {
                "id": q.id,
                "prompt": q.prompt,
                "choices": list(q.choices),
                "correct_index": q.correct_index,
                "qtype": getattr(q, "qtype", "single") or "single",
                "correct_text": getattr(q, "correct_text", "") or "",
            }
            for q in quiz_mod.questions_for_tenant(tenant_id)
        ]
        if key.endswith(".md"):
            text = assessment_markdown(questions, title="Assessment")
            raw = text.encode("utf-8")
            return {
                "id": "assessment.md",
                "filename": "assessment.md",
                "content_type": "text/markdown; charset=utf-8",
                "kind": "markdown",
                "route": "stream",
                "json_body": None,
                "payload": raw,
                "source": "virtual",
            }
        pdf = assessment_pdf(questions, title="Assessment")
        return {
            "id": "assessment.pdf",
            "filename": "assessment.pdf",
            "content_type": "application/pdf",
            "kind": "pdf",
            "route": "stream",
            "json_body": None,
            "payload": pdf,
            "source": "virtual",
        }
    raise LookupError(f"Unknown file '{alias}'")


def resolve_file(
    tenant_id: UUID | str,
    file_id: str,
    *,
    subject: str = "",
) -> dict[str, Any]:
    fid = (file_id or "").strip()
    if not fid:
        raise LookupError("file_id required")
    if fid.lower() in VIRTUAL_ALIASES:
        return _virtual_payload(tenant_id, fid, subject=subject)
    stored = get_stored_file(tenant_id, fid)
    if stored:
        return stored
    raise LookupError(f"Unknown file '{fid}'")


def fetch_json_file(
    tenant_id: UUID | str,
    file_id: str,
    *,
    subject: str = "",
) -> dict[str, Any]:
    """F-4: structured JSON file fetcher. Raises ValueError when the file is not JSON."""
    pack = resolve_file(tenant_id, file_id, subject=subject)
    meta = detect_file_kind(
        str(pack.get("filename") or ""),
        str(pack.get("content_type") or ""),
        pack.get("payload") or b"",
        pack.get("json_body"),
    )
    if meta["route"] != "json":
        raise ValueError(
            f"File is {meta['kind']}; use the streamer at /files/{file_id}/stream"
        )
    body = pack.get("json_body")
    if body is None:
        raw = pack.get("payload") or b""
        body = json.loads(bytes(raw).decode("utf-8"))
    return {
        "id": pack.get("id") or file_id,
        "filename": pack.get("filename"),
        "content_type": "application/json",
        "kind": "json",
        "route": "json",
        "source": pack.get("source") or "virtual",
        "body": body,
    }


def stream_file(
    tenant_id: UUID | str,
    file_id: str,
    *,
    subject: str = "",
) -> tuple[bytes, str, str]:
    """F-9: universal file streamer — bytes + content type + filename."""
    pack = resolve_file(tenant_id, file_id, subject=subject)
    raw = pack.get("payload")
    if raw is None and pack.get("json_body") is not None:
        raw = json.dumps(pack["json_body"], default=str).encode("utf-8")
    data = bytes(raw or b"")
    ct = str(pack.get("content_type") or "application/octet-stream")
    name = str(pack.get("filename") or file_id)
    return data, ct, name


def file_meta(
    tenant_id: UUID | str,
    file_id: str,
    *,
    subject: str = "",
) -> dict[str, Any]:
    pack = resolve_file(tenant_id, file_id, subject=subject)
    meta = detect_file_kind(
        str(pack.get("filename") or ""),
        str(pack.get("content_type") or ""),
        pack.get("payload") or b"",
        pack.get("json_body"),
    )
    return {
        "id": pack.get("id") or file_id,
        "filename": pack.get("filename"),
        "source": pack.get("source") or "virtual",
        **meta,
        "size": len(bytes(pack.get("payload") or b"")),
    }


def assignment_dashboard(
    tenant_id: UUID | str,
    *,
    subject: str | None = None,
) -> dict[str, Any]:
    """F-3: per-user (or class) assignment dashboard for external modules."""
    from app.modules import lti_groups as groups_mod
    from app.modules import quiz as quiz_mod

    assignments = groups_mod.list_assignments(tenant_id)
    groups = groups_mod.list_groups(tenant_id)
    uid = (subject or "").strip()
    learners: list[dict[str, Any]] = []
    if uid:
        member_groups = groups_mod.groups_for_member(tenant_id, uid)
        mine = groups_mod.assignments_for_member(tenant_id, uid)
        quota = quiz_mod.attempt_quota(tenant_id, uid)
        learners.append(
            {
                "subject": uid,
                "groups": [
                    {"group_id": g.get("group_id"), "name": g.get("name")}
                    for g in member_groups
                ],
                "assignments": mine,
                "quota": quota,
                "access": groups_mod.activity_access(tenant_id, uid, "quiz"),
            }
        )
    else:
        seen: set[str] = set()
        for g in groups:
            for m in g.get("members") or []:
                sid = str(m.get("user_id") or "").strip()
                if not sid or sid in seen:
                    continue
                seen.add(sid)
                learners.append(
                    {
                        "subject": sid,
                        "name": str(m.get("name") or sid),
                        "groups": [
                            {"group_id": gg.get("group_id"), "name": gg.get("name")}
                            for gg in groups_mod.groups_for_member(tenant_id, sid)
                        ],
                        "assignments": groups_mod.assignments_for_member(tenant_id, sid),
                        "quota": quiz_mod.attempt_quota(tenant_id, sid),
                    }
                )
    return {
        "assignments": assignments,
        "group_count": len(groups),
        "learner_count": len(learners),
        "learners": learners,
    }


def ingest_external_grade(
    tenant_id: UUID | str,
    *,
    subject: str,
    score: int,
    max_score: int,
    learner_name: str = "",
    activity_id: str = "school-quiz",
    source: str = "external",
    course_label: str = "",
) -> dict[str, Any]:
    """F-5: real-time grade ingest from an external module (not Moodle AGS outbound)."""
    from app.modules import quiz as quiz_mod
    from app.modules.xapi import record_quiz_attempt

    uid = (subject or "").strip()
    if not uid:
        raise ValueError("subject required")
    mx = max(1, int(max_score or 1))
    sc = max(0, min(int(score), mx))
    aid = (activity_id or "school-quiz").strip() or "school-quiz"
    src = (source or "external").strip() or "external"
    answers = {
        "mode": "external",
        "source": src,
        "activity_id": aid,
    }
    attempt = quiz_mod.insert_attempt(
        tenant_id=tenant_id,
        subject=uid,
        learner_name=(learner_name or uid).strip() or uid,
        course_label=(course_label or aid).strip() or aid,
        score=sc,
        max_score=mx,
        answers=answers,
        grade_sent=False,
        grade_error=f"Inbound grade from {src} — not sent to Moodle",
    )
    xapi_row: dict[str, Any] | None = None
    try:
        xapi_row = record_quiz_attempt(
            tenant_id=tenant_id,
            subject=uid,
            learner_name=(learner_name or uid).strip() or uid,
            attempt_id=attempt["id"],
            score=sc,
            max_score=mx,
            course_label=(course_label or aid).strip() or aid,
            send_lrs=False,
        )
    except Exception:  # noqa: BLE001
        xapi_row = None
    inbound_id = str(uuid4())
    try:
        with db.tenant_connection(tenant_id) as conn:
            row = conn.execute(
                """
                INSERT INTO inbound_grades (
                    id, tenant_id, subject, learner_name, activity_id,
                    score, max_score, source, attempt_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (
                    inbound_id,
                    str(tenant_id),
                    uid,
                    (learner_name or uid).strip() or uid,
                    aid,
                    sc,
                    mx,
                    src,
                    str(attempt["id"]),
                ),
            ).fetchone()
            inbound_id = str(row["id"]) if row else inbound_id
    except Exception:  # noqa: BLE001
        inbound_id = inbound_id
    return {
        "inbound_id": inbound_id,
        "attempt_id": str(attempt.get("id") or ""),
        "subject": uid,
        "score": sc,
        "max_score": mx,
        "activity_id": aid,
        "source": src,
        "xapi_statement_id": (
            str(xapi_row.get("statement_id") or "") if xapi_row else None
        ),
        "ags_sent": False,
    }


def sync_attempt_counter(
    tenant_id: UUID | str,
    *,
    subject: str,
    used: int,
    activity_id: str = "school-quiz",
    source: str = "external",
) -> dict[str, Any]:
    """F-6: accept an external attempt count and merge with local graded attempts."""
    uid = (subject or "").strip()
    if not uid:
        raise ValueError("subject required")
    aid = (activity_id or "school-quiz").strip() or "school-quiz"
    n = max(0, int(used))
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO attempt_counter_sync (
                tenant_id, subject, activity_id, used, source, synced_at
            )
            VALUES (%s, %s, %s, %s, %s, now())
            ON CONFLICT (tenant_id, subject, activity_id) DO UPDATE
              SET used = EXCLUDED.used,
                  source = EXCLUDED.source,
                  synced_at = now()
            RETURNING id, used, source, synced_at
            """,
            (str(tenant_id), uid, aid, n, (source or "external").strip() or "external"),
        ).fetchone()
    from app.modules import quiz as quiz_mod

    local = quiz_mod.count_graded_attempts(tenant_id, uid, activity_id=aid)
    synced = int((row or {}).get("used") or n)
    merged = max(local, synced)
    quota = quiz_mod.remaining_attempts(merged, quiz_mod.get_max_attempts(tenant_id))
    quota.update(
        {
            "subject": uid,
            "activity_id": aid,
            "local_used": local,
            "synced_used": synced,
            "source": str((row or {}).get("source") or source or "external"),
        }
    )
    if hasattr((row or {}).get("synced_at"), "isoformat"):
        quota["synced_at"] = row["synced_at"].isoformat()
    return quota


def attempt_counters(
    tenant_id: UUID | str,
    *,
    subject: str | None = None,
    activity_id: str = "",
) -> dict[str, Any]:
    """F-6: attempt counters for one learner or the whole class."""
    from app.modules import quiz as quiz_mod

    uid = (subject or "").strip()
    aid = (activity_id or "").strip() or None
    cap = quiz_mod.get_max_attempts(tenant_id)
    if uid:
        local = quiz_mod.count_graded_attempts(tenant_id, uid, activity_id=aid)
        synced = _synced_used(tenant_id, uid, aid or "school-quiz")
        used = max(local, synced)
        pack = quiz_mod.remaining_attempts(used, cap)
        pack.update(
            {
                "subject": uid,
                "activity_id": aid or "school-quiz",
                "local_used": local,
                "synced_used": synced,
            }
        )
        return {"count": 1, "limit": cap, "learners": [pack], **pack}
    by_sub: dict[str, int] = {}
    names: dict[str, str] = {}
    try:
        with db.tenant_connection(tenant_id) as conn:
            rows = conn.execute(
                """
                SELECT subject,
                       MAX(learner_name) AS learner_name,
                       COUNT(*) FILTER (
                           WHERE COALESCE(answers->>'mode', '') <> 'practice'
                       )::int AS n
                FROM quiz_attempts
                GROUP BY subject
                ORDER BY subject
                """
            ).fetchall()
        for r in rows:
            sid = str(r.get("subject") or "").strip()
            if not sid:
                continue
            by_sub[sid] = int(r.get("n") or 0)
            names[sid] = str(r.get("learner_name") or sid)
    except Exception:  # noqa: BLE001
        for r in quiz_mod.list_attempts_for_tenant(tenant_id, limit=400):
            sid = str(r.get("subject") or "").strip()
            if not sid:
                continue
            by_sub[sid] = by_sub.get(sid, 0) + 1
            if r.get("learner_name"):
                names[sid] = str(r.get("learner_name"))
    learners = []
    for sid, local in sorted(by_sub.items()):
        synced = _synced_used(tenant_id, sid, aid or "school-quiz")
        used = max(local, synced)
        item = quiz_mod.remaining_attempts(used, cap)
        item.update(
            {
                "subject": sid,
                "name": names.get(sid, sid),
                "activity_id": aid or "school-quiz",
                "local_used": local,
                "synced_used": synced,
            }
        )
        learners.append(item)
    return {"count": len(learners), "limit": cap, "learners": learners}


def _synced_used(tenant_id: UUID | str, subject: str, activity_id: str) -> int:
    try:
        with db.tenant_connection(tenant_id) as conn:
            row = conn.execute(
                """
                SELECT used FROM attempt_counter_sync
                WHERE subject = %s AND activity_id = %s
                LIMIT 1
                """,
                (subject, activity_id),
            ).fetchone()
        return int((row or {}).get("used") or 0)
    except Exception:  # noqa: BLE001
        return 0


def decode_base64_body(raw: str) -> bytes:
    text = (raw or "").strip()
    if "," in text and text.lower().startswith("data:"):
        text = text.split(",", 1)[1]
    return base64.b64decode(text)
