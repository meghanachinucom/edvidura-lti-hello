"""Build docs/EdVidura_LMS_Advisor_Overview.pptx — same story as the HTML deck."""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "EdVidura_LMS_Advisor_Overview.pptx"

NAVY = RGBColor(0x07, 0x1E, 0x2D)
INK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x47, 0x55, 0x69)
CORAL = RGBColor(0xFF, 0x47, 0x57)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PAPER = RGBColor(0xFA, 0xFB, 0xFC)
SOFT = RGBColor(0xFF, 0xF0, 0xF3)
LINE = RGBColor(0xE2, 0xE8, 0xF0)
OK = RGBColor(0x05, 0x96, 0x69)


def _solid_bg(slide, color: RGBColor) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def _run(p, text: str, *, size: int, bold: bool = False, color: RGBColor = INK):
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Calibri"
    return run


def add_text(slide, left, top, width, height, lines, *, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        text, size, bold, color = line
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(8)
        _run(p, text, size=size, bold=bold, color=color)
    return box


def add_rect(slide, left, top, width, height, fill: RGBColor, *, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1.25)
    try:
        shape.adjustments[0] = 0.08
    except Exception:
        pass
    return shape


def card(slide, left, top, width, height, title: str, body: str, *, fill=WHITE, title_color=INK):
    shape = add_rect(slide, left, top, width, height, fill, line=LINE)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.18)
    tf.margin_right = Inches(0.18)
    tf.margin_top = Inches(0.16)
    p = tf.paragraphs[0]
    _run(p, title, size=16, bold=True, color=title_color)
    p2 = tf.add_paragraph()
    p2.space_before = Pt(8)
    _run(p2, body, size=14, color=MUTED)
    return shape


def footer(slide, n: int, *, light: bool = True):
    color = RGBColor(0x94, 0xA3, 0xB8) if light else RGBColor(0x64, 0x74, 0x8B)
    add_text(slide, Inches(0.6), Inches(7.05), Inches(6), Inches(0.3), [("EdVidura", 11, False, color)])
    add_text(
        slide,
        Inches(10.6),
        Inches(7.05),
        Inches(2.1),
        Inches(0.3),
        [(f"{n:02d}  /  11", 11, False, color)],
        align=PP_ALIGN.RIGHT,
    )


def build() -> Path:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # 1 title
    s = prs.slides.add_slide(blank)
    _solid_bg(s, NAVY)
    add_text(s, Inches(0.7), Inches(0.7), Inches(12), Inches(0.4), [("CONFIDENTIAL BRIEFING  ·  LMS IMPLEMENTATION", 12, True, CORAL)])
    add_text(
        s,
        Inches(0.7),
        Inches(1.6),
        Inches(12),
        Inches(2.6),
        [
            ("EdVidura sits inside the LMS", 40, True, WHITE),
            ("— it is not a second LMS.", 40, True, CORAL),
        ],
    )
    add_text(
        s,
        Inches(0.7),
        Inches(4.6),
        Inches(11),
        Inches(1.6),
        [
            (
                "Moodle / LTI Advantage, grade passback, and how AI is used in the class without touching the official gradebook.",
                18,
                False,
                RGBColor(0xCB, 0xD5, 0xE1),
            )
        ],
    )
    footer(s, 1, light=False)

    # 2 one sentence
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.45), Inches(12), Inches(0.35), [("ONE SENTENCE", 12, True, CORAL)])
    add_text(
        s,
        Inches(0.7),
        Inches(1.2),
        Inches(12),
        Inches(3.2),
        [
            (
                "Launched from Moodle as an LTI 1.3 Advantage tool. Moodle keeps people and grades. EdVidura delivers the learning path, quizzes, AI tutor, and evidence.",
                28,
                True,
                INK,
            )
        ],
    )
    add_text(
        s,
        Inches(0.7),
        Inches(5.0),
        Inches(11.5),
        Inches(1.4),
        [
            (
                "Typical story: student opens the tool in a Moodle course → class-bound lessons and a checkpoint quiz → score returns to the Moodle gradebook.",
                16,
                False,
                MUTED,
            )
        ],
    )
    footer(s, 2)

    # 3 split of record
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.35), [("THE RULE WE WILL NOT BREAK", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.8), Inches(12), Inches(0.6), [("Split of record", 32, True, INK)])
    left = add_rect(s, Inches(0.7), Inches(1.7), Inches(5.7), Inches(3.2), NAVY)
    tf = left.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.28)
    tf.margin_top = Inches(0.24)
    p = tf.paragraphs[0]
    _run(p, "LMS OWNS", size=13, bold=True, color=CORAL)
    p2 = tf.add_paragraph()
    p2.space_before = Pt(12)
    _run(p2, "People, enrollment, roles, and the official course gradebook.", size=20, bold=True, color=WHITE)
    right = add_rect(s, Inches(6.8), Inches(1.7), Inches(5.7), Inches(3.2), SOFT, line=CORAL)
    tf = right.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.28)
    tf.margin_top = Inches(0.24)
    p = tf.paragraphs[0]
    _run(p, "EDVIDURA OWNS", size=13, bold=True, color=CORAL)
    p2 = tf.add_paragraph()
    p2.space_before = Pt(12)
    _run(p2, "Learning path, content, attempts, AI tutor, and verifiable evidence.", size=20, bold=True, color=INK)
    add_text(
        s,
        Inches(0.7),
        Inches(5.2),
        Inches(12),
        Inches(1.2),
        [("If grade passback fails, the attempt still exists in EdVidura. We do not invent a second official score.", 16, False, MUTED)],
    )
    footer(s, 3)

    # 4 LTI table
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.35), Inches(12), Inches(0.3), [("MOODLE INTEGRATION", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.7), Inches(12), Inches(0.55), [("LTI Advantage — what is wired", 28, True, INK)])
    rows = [
        ("LTI 1.3 launch", "Student or teacher opens EdVidura from a Moodle activity. Unknown platforms fail closed."),
        ("AGS", "Quiz score is passed back to the Moodle gradebook when the tool accepts grades."),
        ("NRPS", "Roster cache for class awareness. People are not mastered in EdVidura."),
        ("Deep Linking", "Teacher can pick EdVidura content from Moodle."),
        ("Dynamic Registration", "Moodle one-click / invite install, plus Client ID + Deployment ID."),
        ("Groups", "LTI Advantage Group Services; quizzes can be gated to assigned groups."),
    ]
    y = 1.45
    for title, body in rows:
        add_text(s, Inches(0.7), Inches(y), Inches(3.2), Inches(0.7), [(title, 15, True, INK)])
        add_text(s, Inches(4.0), Inches(y), Inches(8.6), Inches(0.7), [(body, 14, False, MUTED)])
        y += 0.78
    footer(s, 4)

    # 5 class loop
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.3), [("THE CLASS LOOP", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.75), Inches(12), Inches(0.55), [("Twenty minutes, end to end", 28, True, INK)])
    steps = [
        ("01  Moodle", "Login and enrol in the LMS. Open the EdVidura activity."),
        ("02  Path", "Class-bound lessons and practice for that course context."),
        ("03  Quiz", "Checkpoint assessment. Attempt stored under the tenant."),
        ("04  Gradebook", "Score syncs to Moodle via AGS. Teacher sees class results."),
    ]
    x = 0.7
    for title, body in steps:
        card(slide=s, left=Inches(x), top=Inches(1.7), width=Inches(2.85), height=Inches(2.6), title=title, body=body, title_color=CORAL)
        x += 3.1
    add_text(
        s,
        Inches(0.7),
        Inches(4.7),
        Inches(12),
        Inches(1.4),
        [
            (
                "Teacher launch from the same course: miss rates, at-risk students, AI next steps. Enrollment never moves out of Moodle.",
                16,
                False,
                MUTED,
            )
        ],
    )
    footer(s, 5)

    # 6 AI students
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.3), [("AI  ·  STUDENTS", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.8), Inches(12), Inches(1.1), [("Ask Vidura is a class tutor, not a campus chatbot.", 28, True, INK)])
    card(s, Inches(0.7), Inches(2.2), Inches(3.8), Inches(2.8), "Grounded", "Answers from teacher-approved manuals and lessons, with citations. Not the open web.")
    card(s, Inches(4.75), Inches(2.2), Inches(3.8), Inches(2.8), "Instructional", "Socratic hint / explain / practice. Hints on missed quiz items. Practice handoff.")
    card(s, Inches(8.8), Inches(2.2), Inches(3.8), Inches(2.8), "Integrity", "Refuses writing exams, assignments, or answer keys. Optional voice in English and Indian languages.")
    add_text(
        s,
        Inches(0.7),
        Inches(5.3),
        Inches(12),
        Inches(1.0),
        [("AI can run on OpenAI, Anthropic, or a local model. Demos also run on heuristics if no key is set.", 16, False, MUTED)],
    )
    footer(s, 6)

    # 7 AI teachers
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.3), [("AI  ·  TEACHERS", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.8), Inches(12), Inches(0.7), [("Teachers draft. Moodle still records the grade.", 28, True, INK)])
    left = add_rect(s, Inches(0.7), Inches(1.8), Inches(5.8), Inches(3.3), WHITE, line=LINE)
    tf = left.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.22)
    tf.margin_top = Inches(0.18)
    p = tf.paragraphs[0]
    _run(p, "What AI may do", size=18, bold=True, color=INK)
    for line in (
        "Generate quiz drafts from a lesson or PDF — teacher reviews before save",
        "Authoring assist for lessons / manuals from approved sources",
        "Suggest a score on open responses",
        "Suggest next steps from class results",
    ):
        p = tf.add_paragraph()
        p.space_before = Pt(8)
        _run(p, "•  " + line, size=14, color=MUTED)
    right = add_rect(s, Inches(6.8), Inches(1.8), Inches(5.8), Inches(3.3), SOFT, line=CORAL)
    tf = right.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.22)
    tf.margin_top = Inches(0.18)
    p = tf.paragraphs[0]
    _run(p, "What AI must not do", size=18, bold=True, color=CORAL)
    for line in (
        "Auto-write the Moodle gradebook",
        "Call AGS from grade-assist",
        "Answer from unapproved sources",
        "Complete the student’s exam for them",
    ):
        p = tf.add_paragraph()
        p.space_before = Pt(8)
        _run(p, "•  " + line, size=14, color=INK)
    add_text(
        s,
        Inches(0.7),
        Inches(5.35),
        Inches(12),
        Inches(1.0),
        [("US procurement question: AI does not write the gradebook.", 16, True, MUTED)],
    )
    footer(s, 7)

    # 8 evidence
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.3), [("EVIDENCE", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.8), Inches(12), Inches(1.0), [("Learning records sit beside the grade — they do not replace it.", 26, True, INK)])
    card(s, Inches(0.7), Inches(2.2), Inches(3.8), Inches(2.6), "Moodle AGS", "Official score. System of record for the course grade.")
    card(s, Inches(4.75), Inches(2.2), Inches(3.8), Inches(2.6), "xAPI 1.0.3", "Activity statements (quiz, tutor turns). Local store; optional forward to an LRS.")
    card(s, Inches(8.8), Inches(2.2), Inches(3.8), Inches(2.6), "Receipts", "HMAC-sealed attempt evidence so a payload can be verified later.")
    add_text(
        s,
        Inches(0.7),
        Inches(5.2),
        Inches(12),
        Inches(1.2),
        [("We produce xAPI. We are not claiming a conformant LRS. Optional forward if a district already has one.", 16, False, MUTED)],
    )
    footer(s, 8)

    # 9 status
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.35), Inches(12), Inches(0.3), [("HONEST STATUS", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.7), Inches(12), Inches(0.55), [("What is proven vs intended", 28, True, INK)])
    status_rows = [
        ("Moodle LTI 1.3 launch, AGS, NRPS, Deep Linking, dynreg", "Proven"),
        ("Quizzes, Ask Vidura, teacher AI tools, tenant isolation (RLS)", "Live"),
        ("Canvas — same LTI model, manual Developer Key playbook", "Target — not the daily demo"),
        ("Open edX / Blackboard packs", "Later"),
        ("SIS, full LRS, replacing Moodle", "Out of scope"),
    ]
    y = 1.5
    for item, st in status_rows:
        add_text(s, Inches(0.7), Inches(y), Inches(8.4), Inches(0.7), [(item, 15, False, INK)])
        add_text(s, Inches(9.2), Inches(y), Inches(3.4), Inches(0.7), [(st, 14, True, OK if st in ("Proven", "Live") else CORAL)])
        y += 0.78
    footer(s, 9)

    # 10 advice
    s = prs.slides.add_slide(blank)
    _solid_bg(s, PAPER)
    add_text(s, Inches(0.7), Inches(0.4), Inches(12), Inches(0.3), [("WHY WE ASKED TO MEET", 12, True, CORAL)])
    add_text(s, Inches(0.7), Inches(0.8), Inches(12), Inches(0.6), [("Advice we would value", 28, True, INK)])
    card(s, Inches(0.7), Inches(1.7), Inches(5.8), Inches(2.15), "01  Evaluation", "How US K–12 / higher-ed teams actually score an LTI tool: AGS, NRPS, privacy, 1EdTech cert, Canvas vs Moodle mix.")
    card(s, Inches(6.8), Inches(1.7), Inches(5.8), Inches(2.15), "02  Gradebook & roster", "Passback and membership expectations that fail in real districts — line items, points, delayed sync, multi-section courses.")
    card(s, Inches(0.7), Inches(4.1), Inches(5.8), Inches(2.15), "03  AI procurement", "What “AI in the LMS” must not do for FERPA, academic integrity, and gradebook policy.")
    card(s, Inches(6.8), Inches(4.1), Inches(5.8), Inches(2.15), "04  Split of record", "Whether “LMS of record / EdVidura for path + evidence” matches how you implement platforms.")
    footer(s, 10)

    # 11 close
    s = prs.slides.add_slide(blank)
    _solid_bg(s, NAVY)
    add_text(s, Inches(0.7), Inches(0.7), Inches(12), Inches(0.35), [("NEXT STEP", 12, True, CORAL)])
    add_text(
        s,
        Inches(0.7),
        Inches(1.6),
        Inches(12),
        Inches(2.4),
        [
            ("Best demo is a Moodle launch", 36, True, WHITE),
            ("— not the standalone shell.", 36, True, CORAL),
        ],
    )
    add_text(
        s,
        Inches(0.7),
        Inches(4.5),
        Inches(12),
        Inches(1.6),
        [
            ("Twenty minutes: launch → quiz → gradebook → Ask Vidura → teacher results.", 18, False, RGBColor(0xCB, 0xD5, 0xE1)),
            ("edvidura-app-production.up.railway.app/app/", 16, False, CORAL),
        ],
    )
    footer(s, 11, light=False)

    prs.save(OUT)
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
