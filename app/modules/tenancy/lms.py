"""LMS platform helpers — detect issuer family for multi-LMS UX (E03)."""
from __future__ import annotations


def detect_lms_name(issuer: str | None) -> str:
    """Map LTI issuer URL → short product name for UI copy."""
    iss = (issuer or "").strip().lower()
    if not iss:
        return "LMS"
    if "instructure.com" in iss or "canvas." in iss or "/canvas" in iss:
        return "Canvas"
    if "edx.org" in iss or "openedx" in iss or "open.edx" in iss:
        return "Open edX"
    if "blackboard" in iss or "bbcollab" in iss or "learn.blackboard" in iss:
        return "Blackboard"
    if (
        "moodle" in iss
        or ":8085" in iss
        or iss.rstrip("/").endswith("localhost:8085")
        or "127.0.0.1:8085" in iss
    ):
        return "Moodle"
    return "LMS"


def default_lms_home(issuer: str | None, *, lms_name: str | None = None) -> str:
    """Fallback home URL when launch_presentation.return_url is absent."""
    base = (issuer or "").strip().rstrip("/")
    name = lms_name or detect_lms_name(base)
    if not base:
        return "http://localhost:8085/my/" if name == "Moodle" else "/"
    if name == "Moodle":
        return f"{base}/my/"
    if name == "Canvas":
        return f"{base}/"
    return f"{base}/"


def default_lms_return_url(
    issuer: str | None,
    *,
    context_id: str | None = None,
    lms_name: str | None = None,
) -> str:
    """Best-effort course/home return when platform omits return_url."""
    base = (issuer or "").strip().rstrip("/")
    name = lms_name or detect_lms_name(base)
    ctx = (context_id or "").strip()
    if not base:
        return default_lms_home(issuer, lms_name=name)
    if name == "Moodle":
        if ctx.isdigit():
            return f"{base}/course/view.php?id={ctx}"
        return f"{base}/my/"
    if name == "Canvas" and ctx:
        # Canvas context.id is often the course id (numeric or "course_N")
        cid = ctx
        if cid.lower().startswith("course_"):
            cid = cid.split("_", 1)[-1]
        if cid.isdigit():
            return f"{base}/courses/{cid}"
    return default_lms_home(base, lms_name=name)
