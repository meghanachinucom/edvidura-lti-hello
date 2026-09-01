"""Multi-LMS issuer detection."""
from __future__ import annotations

from app.modules.tenancy import (
    default_lms_return_url,
    detect_lms_name,
)


def test_detect_lms_name():
    assert detect_lms_name("https://school.instructure.com") == "Canvas"
    assert detect_lms_name("https://canvas.example.edu") == "Canvas"
    assert detect_lms_name("http://localhost:8085") == "Moodle"
    assert detect_lms_name("https://moodle.example.edu") == "Moodle"
    assert detect_lms_name("https://courses.edx.org") == "Open edX"
    assert detect_lms_name("https://unknown.example") == "LMS"


def test_default_return_urls():
    assert "course/view.php?id=5" in default_lms_return_url(
        "http://localhost:8085", context_id="5", lms_name="Moodle"
    )
    assert default_lms_return_url(
        "https://school.instructure.com", context_id="42", lms_name="Canvas"
    ).endswith("/courses/42")
    assert default_lms_return_url(
        "https://school.instructure.com", context_id="course_99", lms_name="Canvas"
    ).endswith("/courses/99")
