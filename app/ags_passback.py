"""LTI Assignment and Grade Services (AGS) passback helpers."""
from __future__ import annotations

from datetime import datetime, timezone
import traceback

from pylti1p3.exception import LtiException
from pylti1p3.grade import Grade
from pylti1p3.lineitem import LineItem

from app.lti_fastapi import FastAPIMessageLaunch

# Stable ids so find_or_create does not spawn duplicate Moodle grade columns.
_LINEITEM_TAG = "edvidura-quiz"
_LINEITEM_RESOURCE_ID = "edvidura-quiz"
_LINEITEM_LABEL = "EdVidura Quiz"


def send_quiz_grade(
    message_launch: FastAPIMessageLaunch,
    *,
    user_id: str,
    score: float,
    score_maximum: float,
) -> tuple[bool, str | None]:
    """Push a score to the LMS gradebook. Returns (ok, error_message)."""
    if not message_launch.has_ags():
        return (
            False,
            "AGS not available on this launch (Moodle tool: Accept grades = Yes, then relaunch)",
        )

    ags = message_launch.get_ags()
    if not ags.can_put_grade():
        return False, "Missing AGS score scope on this launch — relaunch after enabling grades"

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
        scopes = list(endpoint.get("scope") or [])
        lineitem: LineItem | None = None

        if endpoint.get("lineitem"):
            # Moodle attached a line item to this resource link — pylti uses it when None.
            lineitem = None
        elif ags.can_create_lineitem() and endpoint.get("lineitems"):
            lineitem = LineItem()
            lineitem.set_tag(_LINEITEM_TAG)
            lineitem.set_score_maximum(float(score_maximum))
            lineitem.set_label(_LINEITEM_LABEL)
            lineitem.set_resource_id(_LINEITEM_RESOURCE_ID)
            # Prefer matching an existing column before creating another.
            try:
                existing = ags.find_lineitem_by_tag(_LINEITEM_TAG)
                if existing is not None:
                    lineitem = existing
            except LtiException:
                pass
        elif not endpoint.get("lineitem"):
            scope_txt = ", ".join(scopes) or "(none)"
            return (
                False,
                "No line item on launch and cannot create one. "
                f"Scopes={scope_txt}. Moodle activity: Accept grades=Yes, Grade type=Point, then relaunch.",
            )

        ags.put_grade(grade, lineitem)
        return True, None
    except LtiException as exc:
        traceback.print_exc()
        return False, f"LMS rejected grade: {exc}"
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return False, f"AGS error: {exc}"
