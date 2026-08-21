"""Human-readable names from LTI launch claims."""
from __future__ import annotations

from typing import Any


def display_name_from_launch(launch_data: dict[str, Any]) -> str:
    """Prefer real person name; never fall back to a bare numeric ``sub`` id."""
    given = str(launch_data.get("given_name") or "").strip()
    family = str(launch_data.get("family_name") or "").strip()
    if given and family:
        return f"{given} {family}"
    if given:
        return given
    if family:
        return family

    full = str(launch_data.get("name") or "").strip()
    if full and not full.isdigit():
        return full

    # Moodle sometimes puts "Firstname Lastname" only when privacy allows it
    for key in ("https://purl.imsglobal.org/spec/lti/claim/lis",):
        lis = launch_data.get(key) or {}
        if isinstance(lis, dict):
            person = str(lis.get("person_name_full") or "").strip()
            if person and not person.isdigit():
                return person

    return ""


def greeting_first_name(display_name: str | None, *, subject: str | None = None) -> str:
    """First token for 'Hi, …' — skip empty / numeric ids."""
    name = str(display_name or "").strip()
    if not name or name.isdigit():
        return ""
    if subject and name == str(subject).strip():
        return ""
    # Prefer first name; if single token that looks like a last name only, still use it
    return name.split()[0]
