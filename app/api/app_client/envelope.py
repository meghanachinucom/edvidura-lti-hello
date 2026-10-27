"""Shared response envelope for web + mobile App API."""
from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse


def ok(
    data: Any = None,
    *,
    meta: dict[str, Any] | None = None,
    status_code: int = 200,
) -> JSONResponse:
    body: dict[str, Any] = {"ok": True, "data": data, "error": None}
    if meta is not None:
        body["meta"] = meta
    return JSONResponse(body, status_code=status_code)


def fail(
    message: str,
    *,
    code: str = "error",
    status_code: int = 400,
    details: Any = None,
) -> JSONResponse:
    err: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        err["details"] = details
    return JSONResponse(
        {"ok": False, "data": None, "error": err},
        status_code=status_code,
    )


def public_session(session: dict[str, Any]) -> dict[str, Any]:
    """Learner-safe session fields (no launch secrets)."""
    from app.modules.tenancy import attach_to_session, defaults_for_segment

    try:
        attach_to_session(session)
    except Exception:  # noqa: BLE001
        session.setdefault("segment", "school")
        session.setdefault(
            "capabilities",
            defaults_for_segment(session.get("segment") or "school"),
        )
    return {
        "token": str(session.get("quiz_token") or ""),
        "tenant_id": str(session.get("tenant_id") or ""),
        "subject": str(session.get("subject") or ""),
        "learner_name": str(session.get("learner_name") or ""),
        "class_id": str(session.get("class_id") or "") or None,
        "class_name": str(session.get("class_name") or "") or None,
        "course": str(session.get("course") or "") or None,
        "lti_context_id": str(session.get("lti_context_id") or "") or None,
        "is_instructor": bool(session.get("is_instructor")),
        "is_school_admin": bool(session.get("is_school_admin")),
        "lms_name": str(session.get("lms_name") or "LMS"),
        "lms_return_url": str(
            session.get("lms_return_url")
            or session.get("moodle_return_url")
            or ""
        )
        or None,
        "segment": str(session.get("segment") or "school"),
        "is_corporate": bool(session.get("is_corporate")),
        "is_government": bool(session.get("is_government"))
        or str(session.get("segment") or "") == "government",
        "capabilities": session.get("capabilities")
        or defaults_for_segment(session.get("segment") or "school"),
        "given_name": str(session.get("given_name") or "") or None,
        "tenant_slug": str(session.get("tenant_slug") or "") or None,
        "tenant_name": str(session.get("tenant_name") or "") or None,
        "course_id": str(session.get("edvidura_course_id") or "") or None,
        "preferred_language": str(session.get("preferred_language") or "") or None,
        "preferred_state": str(session.get("preferred_state") or "") or None,
        "nrps_available": bool(session.get("nrps_available")),
        "gs_available": bool(session.get("gs_available")),
    }


def json_safe(value: Any) -> Any:
    """Convert UUIDs/datetimes for JSON."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)
