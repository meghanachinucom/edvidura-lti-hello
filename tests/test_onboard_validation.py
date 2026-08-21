"""Onboard input validation (no DB required)."""
from __future__ import annotations

import pytest

from app.onboard_routes import validate_issuer, validate_slug


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("http://localhost:8085", "http://localhost:8085"),
        ("https://moodle.school.edu/", "https://moodle.school.edu"),
        ("not-a-url", None),
        ("ftp://moodle.test", None),
        ("https://moodle.test/path", None),
        ("", None),
    ],
)
def test_validate_issuer(raw, expected):
    assert validate_issuer(raw) == expected


@pytest.mark.parametrize(
    "raw,ok",
    [
        ("acme-school", True),
        ("a", False),
        ("Acme", True),  # normalized to lowercase
        ("ok_org-1", True),
        ("", False),
        ("x", False),
    ],
)
def test_validate_slug(raw, ok):
    got = validate_slug(raw)
    assert (got is not None) is ok
    if got:
        assert got == got.lower()
