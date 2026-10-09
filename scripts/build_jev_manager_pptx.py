"""
Build docs/management-proof/jev-manager-deck.pptx
Same topics + easy wording as jev-manager-deck.html.
PowerPoint "Appear" builds approximate the Space-reveal steps.
CSS-only effects (mesh, sticky peel, pipeline dot, confetti) are not in PPT.
"""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "management-proof" / "jev-manager-deck.pptx"

# EdVidura citrus/mint palette
INK = RGBColor(0x03, 0x20, 0x19)
MUTED = RGBColor(0x3C, 0x4A, 0x42)
PRIMARY = RGBColor(0x00, 0x6C, 0x4B)
MINT = RGBColor(0x34, 0xD3, 0x99)
SKY = RGBColor(0x40, 0xC2, 0xFD)
CITRUS = RGBColor(0xF0, 0xC0, 0x1A)
CORAL = RGBColor(0xF0, 0x5A, 0x3A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SURFACE = RGBColor(0xE6, 0xFF, 0xF5)
SURFACE2 = RGBColor(0xD5, 0xF5, 0xEA)
WARM_BG = RGBColor(0xFF, 0xF5, 0xD6)
DEEP = RGBColor(0x0E, 0x2B, 0x24)
PAPER = RGBColor(0xFF, 0xFF, 0xFF)

NSMAP = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}


def _solid_bg(slide, color: RGBColor) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def _set_run(run, text: str, *, size: int, bold: bool = False, color: RGBColor = INK) -> None:
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Calibri"


def add_text(slide, left, top, width, height, lines, *, default_size=18, default_color=INK, align=PP_ALIGN.LEFT, bold_first=False):
    """lines: list of str | (str, size, bold, color)"""
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if isinstance(line, str):
            text, size, bold, color = line, default_size, (bold_first and i == 0), default_color
        else:
            text, size, bold, color = line
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(6)
        run = p.add_run()
        _set_run(run, text, size=size, bold=bold, color=color)
    return box


def add_rect(slide, left, top, width, height, fill: RGBColor, *, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1.5)
    # softer corners
    try:
        shape.adjustments[0] = 0.15
    except Exception:
        pass
    return shape


def add_card_text(shape, text: str, *, title: str | None = None, size=14, color=INK, title_color=PRIMARY):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    p = tf.paragraphs[0]
    if title:
        run = p.add_run()
        _set_run(run, title, size=size + 4, bold=True, color=title_color)
        p2 = tf.add_paragraph()
        p2.space_before = Pt(6)
        run2 = p2.add_run()
        _set_run(run2, text, size=size, bold=False, color=color)
    else:
        run = p.add_run()
        _set_run(run, text, size=size, bold=False, color=color)


def _shape_id(shape) -> int:
    return int(shape.shape_id)


def add_appear_animation(slide, shapes_in_order) -> None:
    """
    Add sequential Appear (entrance) animations for build-style reveals.
    shapes_in_order: list of shape objects to show one after another on click.
    """
    if not shapes_in_order:
        return

    # Build timing XML on cSld sibling
    cSld = slide._element.cSld
    # Remove existing timing if any
    for child in list(slide._element):
        if child.tag == qn("p:timing"):
            slide._element.remove(child)

    timing = etree.SubElement(slide._element, qn("p:timing"))
    tnLst = etree.SubElement(timing, qn("p:tnLst"))
    par = etree.SubElement(tnLst, qn("p:par"))
    cTn = etree.SubElement(
        par,
        qn("p:cTn"),
        {
            "id": "1",
            "dur": "indefinite",
            "restart": "never",
            "nodeType": "tmRoot",
        },
    )
    childTnLst = etree.SubElement(cTn, qn("p:childTnLst"))
    seq = etree.SubElement(childTnLst, qn("p:seq"), {"concurrent": "1", "nextAc": "seek"})
    seqCTn = etree.SubElement(
        seq,
        qn("p:cTn"),
        {
            "id": "2",
            "dur": "indefinite",
            "nodeType": "mainSeq",
        },
    )
    seqChild = etree.SubElement(seqCTn, qn("p:childTnLst"))

    next_id = 3
    for i, shape in enumerate(shapes_in_order):
        sid = _shape_id(shape)
        par2 = etree.SubElement(seqChild, qn("p:par"))
        cTn2 = etree.SubElement(
            par2,
            qn("p:cTn"),
            {
                "id": str(next_id),
                "fill": "hold",
            },
        )
        next_id += 1
        stCondLst = etree.SubElement(cTn2, qn("p:stCondLst"))
        etree.SubElement(
            stCondLst,
            qn("p:cond"),
            {
                "delay": "0" if i == 0 else "indefinite",
            },
        )
        if i > 0:
            # click to advance — delay indefinite + onClick from previous is handled by mainSeq clicks
            pass
        child2 = etree.SubElement(cTn2, qn("p:childTnLst"))
        par3 = etree.SubElement(child2, qn("p:par"))
        cTn3 = etree.SubElement(
            par3,
            qn("p:cTn"),
            {
                "id": str(next_id),
                "fill": "hold",
            },
        )
        next_id += 1
        st2 = etree.SubElement(cTn3, qn("p:stCondLst"))
        etree.SubElement(st2, qn("p:cond"), {"delay": "0"})
        child3 = etree.SubElement(cTn3, qn("p:childTnLst"))

        # Appear effect (presetID 1, presetClass entr)
        animEffect = etree.SubElement(
            child3,
            qn("p:animEffect"),
            {
                "transition": "in",
                "filter": "fade",
            },
        )
        cBhvr = etree.SubElement(animEffect, qn("p:cBhvr"))
        cTnA = etree.SubElement(
            cBhvr,
            qn("p:cTn"),
            {
                "id": str(next_id),
                "dur": "500",
            },
        )
        next_id += 1
        tgtEl = etree.SubElement(cBhvr, qn("p:tgtEl"))
        etree.SubElement(tgtEl, qn("p:spTgt"), {"spid": str(sid)})

        # set visibility
        set_el = etree.SubElement(child3, qn("p:set"))
        cBhvr2 = etree.SubElement(set_el, qn("p:cBhvr"))
        cTnB = etree.SubElement(
            cBhvr2,
            qn("p:cTn"),
            {
                "id": str(next_id),
                "dur": "1",
                "fill": "hold",
            },
        )
        next_id += 1
        stB = etree.SubElement(cTnB, qn("p:stCondLst"))
        etree.SubElement(stB, qn("p:cond"), {"delay": "0"})
        tgt2 = etree.SubElement(cBhvr2, qn("p:tgtEl"))
        etree.SubElement(tgt2, qn("p:spTgt"), {"spid": str(sid)})
        attr = etree.SubElement(cBhvr2, qn("p:attrNameLst"))
        an = etree.SubElement(attr, qn("p:attrName"))
        an.text = "style.visibility"
        to = etree.SubElement(set_el, qn("p:to"))
        etree.SubElement(to, qn("p:strVal"), {"val": "visible"})


def build() -> Path:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # --- 1 Title ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, SURFACE)
    add_text(
        s,
        Inches(0.7),
        Inches(0.5),
        Inches(10),
        Inches(0.4),
        [("FOR MANAGERS · JEV", 14, True, PRIMARY)],
    )
    add_text(
        s,
        Inches(0.7),
        Inches(1.8),
        Inches(11),
        Inches(2.2),
        [
            ("Decide first.", 48, True, PRIMARY),
            ("Write second.", 48, True, INK),
        ],
    )
    add_text(
        s,
        Inches(0.7),
        Inches(4.3),
        Inches(11),
        Inches(1.5),
        [
            (
                "JEV (from TypeSafe) helps Ask Vidura and AI quizzes stay on topic, cover the full book, and spend less on AI. Moodle still holds grades.",
                20,
                False,
                MUTED,
            ),
            ("October 2026 · Sheet item: JEV + lower AI cost", 14, False, MUTED),
        ],
    )

    # --- 2 Why ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, WARM_BG)
    add_text(s, Inches(0.7), Inches(0.4), Inches(10), Inches(1), [("Why we need it", 36, True, INK), ("Four problems we keep seeing.", 18, False, MUTED)])
    stickies = [
        (CITRUS, "Cost", "Every long AI chat and quiz costs money — both the question we send and the answer we get."),
        (MINT, "Focus", "Students can ask things outside the class. The coach must answer only from approved lessons."),
        (SKY, "Coverage", "AI quizzes must use the whole book, not only the first chapters."),
        (CORAL, "Trust", "Teachers need to see what the AI decided. We save that in learning records (xAPI) — not a black box."),
    ]
    anim = []
    positions = [
        (0.7, 2.0),
        (6.9, 2.0),
        (0.7, 4.5),
        (6.9, 4.5),
    ]
    for (x, y), (fill, title, body) in zip(positions, stickies):
        sh = add_rect(s, Inches(x), Inches(y), Inches(5.5), Inches(2.0), fill)
        add_card_text(sh, body, title=title, size=15, color=INK, title_color=INK)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 3 Two jobs ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, SURFACE)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.9), [("Two jobs — easy to remember", 36, True, INK)])
    left = add_rect(s, Inches(0.8), Inches(1.8), Inches(5.2), Inches(3.2), PAPER, line=CITRUS)
    add_card_text(
        left,
        "The boss: Is this on topic? How should we teach? Cheap AI or full AI? Did the quiz cover everything?",
        title="🎯  JEV",
        size=16,
        title_color=PRIMARY,
    )
    right = add_rect(s, Inches(7.2), Inches(1.8), Inches(5.2), Inches(3.2), PAPER, line=SKY)
    add_card_text(
        right,
        "The writer: Writes the answer or quiz questions — only when JEV says yes.",
        title="✍️  Chat AI",
        size=16,
        title_color=PRIMARY,
    )
    add_text(
        s,
        Inches(0.7),
        Inches(5.4),
        Inches(12),
        Inches(1.2),
        [("JEV replies in a split second with a short yes/no style answer. Students never see that message.", 18, False, MUTED)],
    )
    add_appear_animation(s, [left, right])

    # --- 4 Not ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, DEEP)
    add_text(
        s,
        Inches(0.7),
        Inches(0.4),
        Inches(12),
        Inches(1.0),
        [("What JEV is not", 36, True, WHITE), ("Clear limits — so nobody expects the wrong thing.", 18, False, MINT)],
    )
    nots = [
        "Not another school chatbot or campus help widget",
        "Not Moodle — students and grades still live there",
        "Not the thing that marks work or sends scores back",
        "Not needed for demos — EdVidura still works if JEV is off",
        "Not a new content team — it only guides the AI before it writes",
    ]
    anim = []
    for i, t in enumerate(nots):
        sh = add_rect(s, Inches(0.8), Inches(1.6 + i * 1.0), Inches(11.7), Inches(0.85), RGBColor(0x1A, 0x3A, 0x30))
        add_card_text(sh, t, size=18, color=WHITE, title_color=MINT)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 5 Where it sits ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, SURFACE)
    add_text(
        s,
        Inches(0.7),
        Inches(0.4),
        Inches(12),
        Inches(1.1),
        [
            ("Where it sits", 36, True, INK),
            ("Student opens EdVidura from Moodle. JEV decides before we call the expensive AI.", 18, False, MUTED),
        ],
    )
    nodes = [
        (CORAL, "Moodle"),
        (PRIMARY, "EdVidura"),
        (CITRUS, "JEV decides"),
        (RGBColor(0x63, 0x66, 0xF1), "AI writes\n(only if needed)"),
    ]
    anim = []
    for i, (color, label) in enumerate(nodes):
        x = 0.7 + i * 3.15
        sh = add_rect(s, Inches(x), Inches(3.0), Inches(2.7), Inches(1.5), color)
        tf = sh.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        _set_run(run, label, size=18, bold=True, color=INK if color == CITRUS else WHITE)
        anim.append(sh)
        if i < 3:
            add_text(s, Inches(x + 2.75), Inches(3.4), Inches(0.4), Inches(0.5), [("→", 24, True, PRIMARY)], align=PP_ALIGN.CENTER)
    add_text(s, Inches(0.7), Inches(5.2), Inches(12), Inches(0.8), [("Code: app/modules/jev   ·   Guide: docs/JEV.md", 16, False, MUTED)])
    add_appear_animation(s, anim)

    # --- 6 Four jobs ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, DEEP)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.8), [("Four jobs we already built", 36, True, WHITE)])
    jobs = [
        ("01  Ask Vidura", "Is the question on class? Hint, explain, or practice? Cheap local reply or full AI?"),
        ("02  Quiz coverage", "After questions are made — did they touch every chapter? If not, make more."),
        ("03  Save money", "For easy recall questions, use the cheap path when JEV is sure enough."),
        ("04  Health check", "AI status page shows whether JEV is set up (API key present)."),
    ]
    anim = []
    for i, (title, body) in enumerate(jobs):
        x = 0.7 + (i % 2) * 6.2
        y = 1.5 + (i // 2) * 2.6
        sh = add_rect(s, Inches(x), Inches(y), Inches(5.8), Inches(2.2), RGBColor(0x1A, 0x3A, 0x30))
        add_card_text(sh, body, title=title, size=16, color=WHITE, title_color=MINT)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 7 Ask Vidura path ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, SURFACE)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.8), [("What happens in Ask Vidura", 36, True, INK)])
    steps = [
        "1. Load the approved class lessons",
        "2. Ask JEV — on topic? how to teach? cheap or full AI?",
        "3. Off topic → polite “please stay on class” — no AI cost",
        "4. Easy path → short local answer",
        "5. Full AI → longer answer with lesson citations, saved to learning records",
    ]
    anim = []
    for i, t in enumerate(steps):
        sh = add_rect(s, Inches(0.8), Inches(1.4 + i * 1.05), Inches(11.7), Inches(0.9), PAPER, line=MINT)
        add_card_text(sh, t, size=18, color=INK)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 8 Quizzes ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, WARM_BG)
    add_text(
        s,
        Inches(0.7),
        Inches(0.35),
        Inches(12),
        Inches(1.0),
        [
            ("AI quizzes (matches the sheet)", 34, True, INK),
            ("Three difficulty levels · whole-book coverage · checks the study plan.", 18, False, MUTED),
        ],
    )
    tiles = [
        (0.7, 1.6, 11.9, 1.2, "Teacher sets options", "Level, how hard, and how much of the book to cover — before making questions."),
        (0.7, 3.0, 5.8, 1.8, "Make questions", "AI or local path builds a quiz for each student."),
        (6.8, 3.0, 5.8, 1.8, "JEV checks", "Do the questions cover all the section titles?"),
        (0.7, 5.1, 11.9, 1.5, "Fix gaps", "If coverage is weak → auto second pass adds questions across the missing units."),
    ]
    anim = []
    for x, y, w, h, title, body in tiles:
        sh = add_rect(s, Inches(x), Inches(y), Inches(w), Inches(h), PAPER, line=CITRUS)
        add_card_text(sh, body, title=title, size=15, title_color=PRIMARY)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 9 Cost ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, DEEP)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.8), [("Money story (simple)", 36, True, WHITE)])
    # visual bars as shapes
    add_text(s, Inches(0.8), Inches(1.8), Inches(11), Inches(0.4), [("JEV decision (tiny call)  ~1×", 18, True, MINT)])
    bar1 = add_rect(s, Inches(0.8), Inches(2.3), Inches(1.5), Inches(0.7), MINT)
    add_text(s, Inches(0.8), Inches(3.5), Inches(11), Inches(0.4), [("Full AI answer (when we skip it)  ~100–400×", 18, True, CORAL)])
    bar2 = add_rect(s, Inches(0.8), Inches(4.0), Inches(11.5), Inches(0.7), CORAL)
    add_text(
        s,
        Inches(0.7),
        Inches(5.3),
        Inches(12),
        Inches(1.2),
        [
            (
                "After we turn it on, we can count how often JEV saved a full AI call (jev_skipped_remote in our learning records).",
                16,
                False,
                MINT,
            )
        ],
    )
    add_appear_animation(s, [bar1, bar2])

    # --- 10 Turn on ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, SURFACE)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.8), [("How we turn it on", 36, True, INK)])
    checklist = [
        "1. Get the TypeSafe API key",
        "2. Set on Railway: JEV_ENABLED=1 and the key",
        "3. Check AI status shows JEV is ready",
        "4. Try on Riverside — coach chat + quiz",
        "5. Adjust the confidence setting after teachers review",
    ]
    anim = []
    for i, t in enumerate(checklist):
        sh = add_rect(s, Inches(0.8), Inches(1.4 + i * 1.05), Inches(11.7), Inches(0.9), PAPER, line=PRIMARY)
        add_card_text(sh, t, size=18, color=INK)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 11 Status ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, SURFACE)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.8), [("Where we are on the sheet", 36, True, INK)])
    add_text(s, Inches(0.9), Inches(1.4), Inches(5), Inches(0.4), [("DONE", 16, True, PRIMARY)])
    add_text(s, Inches(7.2), Inches(1.4), Inches(5), Inches(0.4), [("WAITING", 16, True, RGBColor(0x9A, 0x6B, 0x00))])
    done = [
        "JEV code connected in EdVidura",
        "Tests + learning-record fields",
    ]
    wait = [
        "Live API key + turn on in Railway",
        "Pilot OK from teachers + final settings",
    ]
    anim = []
    for i, t in enumerate(done):
        sh = add_rect(s, Inches(0.8), Inches(2.0 + i * 1.5), Inches(5.5), Inches(1.2), MINT)
        add_card_text(sh, t, size=16, color=INK)
        anim.append(sh)
    for i, t in enumerate(wait):
        sh = add_rect(s, Inches(7.0), Inches(2.0 + i * 1.5), Inches(5.5), Inches(1.2), CITRUS)
        add_card_text(sh, t, size=16, color=INK)
        anim.append(sh)
    add_appear_animation(s, anim)

    # --- 12 Takeaway ---
    s = prs.slides.add_slide(blank)
    _solid_bg(s, DEEP)
    add_text(s, Inches(0.7), Inches(1.5), Inches(12), Inches(0.5), [("ONE LINE TO REMEMBER", 14, True, MINT)], align=PP_ALIGN.CENTER)
    add_text(
        s,
        Inches(0.7),
        Inches(2.3),
        Inches(12),
        Inches(1.5),
        [("JEV decides. AI writes.", 44, True, WHITE)],
        align=PP_ALIGN.CENTER,
    )
    add_text(
        s,
        Inches(1.5),
        Inches(4.2),
        Inches(10.3),
        Inches(1.5),
        [("Stays on class. Covers the book. Costs less. Moodle still owns grades.", 20, False, MINT)],
        align=PP_ALIGN.CENTER,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
