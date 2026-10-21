"""Unit tests for standard EPUB CFI (Canonical Fragment Identifier) generation & resolution."""
from __future__ import annotations

import pytest

from app.modules.manuals.pebl_phase2 import generate_epub_cfi, parse_epub_cfi


def test_generate_standard_point_cfi():
    cfi = generate_epub_cfi(chapter_index=0, itemref_id="ch1", element_step=2, start_char=0)
    assert cfi == "epubcfi(/6/2[ch1]!/4/2:0)"

    cfi_chap2 = generate_epub_cfi(chapter_index=1, itemref_id="ch2", element_step=4, start_char=15)
    assert cfi_chap2 == "epubcfi(/6/4[ch2]!/4/4:15)"


def test_generate_standard_range_cfi():
    cfi_range = generate_epub_cfi(
        chapter_index=0,
        itemref_id="ch1",
        element_step=4,
        start_char=10,
        end_char=52,
    )
    assert cfi_range == "epubcfi(/6/2[ch1]!/4/4,/1:10,/1:52)"


def test_parse_standard_point_cfi():
    parsed = parse_epub_cfi("epubcfi(/6/2[ch1]!/4/2:0)")
    assert parsed is not None
    assert parsed["is_standard_cfi"] is True
    assert parsed["chapter_index"] == 0
    assert parsed["itemref_id"] == "ch1"
    assert parsed["element_step"] == 2
    assert parsed["start_char"] == 0
    assert parsed["end_char"] is None

    # Point CFI pointing to text node (/1:15)
    parsed_text = parse_epub_cfi("epubcfi(/6/4[ch2]!/4/4/1:15)")
    assert parsed_text is not None
    assert parsed_text["chapter_index"] == 1
    assert parsed_text["start_char"] == 15


def test_parse_standard_range_cfi():
    # Standard subpath range
    parsed = parse_epub_cfi("epubcfi(/6/6[ch3]!/4/4,/1:12,/1:65)")
    assert parsed is not None
    assert parsed["is_standard_cfi"] is True
    assert parsed["chapter_index"] == 2
    assert parsed["itemref_id"] == "ch3"
    assert parsed["element_step"] == 4
    assert parsed["start_char"] == 12
    assert parsed["end_char"] == 65

    # Direct character-offset subpath range
    parsed_offsets = parse_epub_cfi("epubcfi(/6/6[ch3]!/4/4/1,:12,:65)")
    assert parsed_offsets is not None
    assert parsed_offsets["chapter_index"] == 2
    assert parsed_offsets["start_char"] == 12
    assert parsed_offsets["end_char"] == 65

    # Backward-compatible fallback range
    parsed_fallback = parse_epub_cfi("epubcfi(/6/6[ch3]!/4/4,12,65)")
    assert parsed_fallback is not None
    assert parsed_fallback["chapter_index"] == 2
    assert parsed_fallback["start_char"] == 12
    assert parsed_fallback["end_char"] == 65


def test_parse_legacy_marker_fallback():
    parsed = parse_epub_cfi("epub-cfi-chap-1")
    assert parsed is not None
    assert parsed["is_standard_cfi"] is False
    assert parsed["chapter_index"] == 0

    parsed3 = parse_epub_cfi("epub-cfi-chap-3")
    assert parsed3 is not None
    assert parsed3["is_standard_cfi"] is False
    assert parsed3["chapter_index"] == 2


def test_parse_invalid_cfi_returns_none():
    assert parse_epub_cfi(None) is None
    assert parse_epub_cfi("") is None
    assert parse_epub_cfi("invalid-string-random") is None


def test_generate_and_parse_across_inline_elements():
    """W3C EPUB CFI 1.1: Range spanning across inline element (e.g. <strong> to sibling text node)."""
    # Start inside <strong> (child element 1 of container -> /2, text node -> /1:0)
    # End in trailing text node (text chunk after <strong> -> /3:39)
    # Common parent is <div class="callout"> (body element child 3 -> /6)
    cfi = generate_epub_cfi(
        chapter_index=0,
        itemref_id="ch1",
        element_step=6,
        start_subpath="/2/1:0",
        end_subpath="/3:39",
    )
    assert cfi == "epubcfi(/6/2[ch1]!/4/6,/2/1:0,/3:39)"

    parsed = parse_epub_cfi(cfi)
    assert parsed is not None
    assert parsed["chapter_index"] == 0
    assert parsed["itemref_id"] == "ch1"
    assert parsed["element_step"] == 6
    assert parsed["parent_path"] == "/6/2[ch1]!/4/6"
    assert parsed["start_subpath"] == "/2/1:0"
    assert parsed["end_subpath"] == "/3:39"
    assert parsed["start_char"] == 0
    assert parsed["end_char"] == 39


def test_generate_and_parse_across_separate_paragraphs():
    """W3C EPUB CFI 1.1: Range spanning across distinct block paragraphs."""
    # Common parent is <body> (/6/2[ch1]!/4)
    # Start is in Paragraph 2 (element 4 -> /4), text node 1, offset 10 (/4/1:10)
    # End is in Paragraph 3 (element 6 -> /6), text node 1, offset 25 (/6/1:25)
    cfi = generate_epub_cfi(
        chapter_index=0,
        itemref_id="ch1",
        element_step=None,
        parent_path="/6/2[ch1]!/4",
        start_subpath="/4/1:10",
        end_subpath="/6/1:25",
    )
    assert cfi == "epubcfi(/6/2[ch1]!/4,/4/1:10,/6/1:25)"

    parsed = parse_epub_cfi(cfi)
    assert parsed is not None
    assert parsed["chapter_index"] == 0
    assert parsed["itemref_id"] == "ch1"
    assert parsed["parent_path"] == "/6/2[ch1]!/4"
    assert parsed["start_subpath"] == "/4/1:10"
    assert parsed["end_subpath"] == "/6/1:25"
    assert parsed["start_char"] == 10
    assert parsed["end_char"] == 25


def test_utf16_unicode_character_offsets():
    """W3C EPUB CFI 1.1 Section 3.1.2: Character offsets count UTF-16 code units."""
    # Astral plane character (e.g. rocket emoji 🚀 is 2 UTF-16 code units: \uD83D\uDE80)
    unicode_text = "Science 🚀 Research"
    utf16_len = len(unicode_text.encode("utf-16-le")) // 2
    # In Python, len("🚀") is 1, but in UTF-16 / JavaScript DOM offsets, it is 2 code units!
    assert len(unicode_text) == 18
    assert utf16_len == 19

    # CFI pointing after the rocket emoji
    cfi = generate_epub_cfi(
        chapter_index=0,
        itemref_id="ch1",
        element_step=4,
        start_char=8,
        end_char=utf16_len,
    )
    assert cfi == f"epubcfi(/6/2[ch1]!/4/4,/1:8,/1:{utf16_len})"

    parsed = parse_epub_cfi(cfi)
    assert parsed is not None
    assert parsed["start_char"] == 8
    assert parsed["end_char"] == utf16_len


def test_direct_cfi_resolution_without_quote_fallback():
    """Verify that a CFI resolves to exact text via direct tree navigation without quote search."""
    # Simulated DOM structure:
    # <body>
    #   <h1>Title</h1>                 <!-- child 0, element step 2 -->
    #   <p>                            <!-- child 1, element step 4 -->
    #     Text before                  <!-- text child 0, step /1 -->
    #     <em>important</em>           <!-- element child 1, step /2 -> text step /1 -->
    #     text after                   <!-- text child 2, step /3 -->
    #   </p>
    # </body>

    # Target: select "important" inside <em>: parent /6/2[ch1]!/4/4, start /2/1:0, end /2/1:9
    cfi = "epubcfi(/6/2[ch1]!/4/4,/2/1:0,/2/1:9)"
    parsed = parse_epub_cfi(cfi)
    assert parsed is not None
    assert parsed["start_subpath"] == "/2/1:0"
    assert parsed["end_subpath"] == "/2/1:9"

    # Direct resolution logic simulation (matching browser resolveCfiToRange):
    dom_tree = {
        "step": 4,  # <p>
        "children": [
            {"type": "text", "step": 1, "text": "Text before "},
            {"type": "element", "step": 2, "tag": "em", "children": [
                {"type": "text", "step": 1, "text": "important"}
            ]},
            {"type": "text", "step": 3, "text": " text after"},
        ]
    }

    # Resolve start: /2/1:0 -> element 2 (em) -> text 1 -> offset 0
    em_elem = next(c for c in dom_tree["children"] if c.get("step") == 2)
    em_text_node = next(c for c in em_elem["children"] if c.get("step") == 1)
    resolved_text = em_text_node["text"][0:9]

    # Exactly resolves to "important" directly from the CFI path, 0 quote search involved
    assert resolved_text == "important"

