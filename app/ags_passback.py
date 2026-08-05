"""LTI Assignment and Grade Services (AGS) passback helpers."""
from __future__ import annotations

from datetime import datetime, timezone

from pylti1p3.exception import LtiException
from pylti1p3.grade import Grade
from pylti1p3.lineitem import LineItem

from app.lti_fastapi import FastAPIMessageLaunch


def send_quiz_grade(
    message_launch: FastAPIMessageLaunch,
    *,
    user_id: str,
    score: float,
    score_maximum: float,
) -> tuple[bool, str | None]:
    """Push a score to the LMS gradebook. Returns (ok, error_message)."""
    if not message_launch.has_ags():
        return False, "AGS not available on this launch (enable grades on the Moodle external tool)"

    ags = message_launch.get_ags()
    if not ags.can_put_grade():
        return False, "Missing AGS score scope on this launch"

    grade = (
        Grade()
        .set_score_given(float(score))
        .set_score_maximum(float(score_maximum))
        .set_timestamp(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
        .set_activity_progress("Completed")
        .set_grading_progress("FullyGraded")
        .set_user_id(user_id)
    )

    try:
        endpoint = message_launch.get_launch_data().get(
            "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint", {}
        ) or {}
        lineitem = None
        if endpoint.get("lineitem"):
            # Use the line item Moodle attached to this resource link
            lineitem = None
        elif ags.can_create_lineitem():
            lineitem = LineItem()
            lineitem.set_tag("edvidura-slice-a-quiz")
            lineitem.set_score_maximum(float(score_maximum))
            lineitem.set_label("EdVidura Slice A Quiz")
            lineitem.set_resource_id("edvidura-slice-a-quiz")
        else:
            scopes = ", ".join(endpoint.get("scope") or []) or "(none)"
            return (
                False,
                "No line item on launch and cannot create one. "
                f"Scopes={scopes}. In Moodle activity: Accept grades=Yes and set a Point grade, then relaunch.",
            )

        ags.put_grade(grade, lineitem)
        return True, None
    except LtiException as exc:
        return False, str(exc)
    except Exception as exc:  # noqa: BLE001
        return False, f"AGS error: {exc}"
