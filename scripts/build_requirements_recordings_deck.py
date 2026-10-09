#!/usr/bin/env python3
"""Build full-screen manager deck for sheet Done feature recordings."""
from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
PROOF = ROOT / "docs" / "management-proof"
FEATURES = PROOF / "features.yaml"
OUT_HTML = PROOF / "requirements-recordings-deck.html"
OUT_PPTX = PROOF / "requirements-recordings-deck.pptx"

# Easy one-liners for managers (plain language)
PLAIN = {
    "f01-moodle-lti": "Student opens EdVidura from Moodle — signed launch, real class session.",
    "f02-onboarding-apis": "School connect page: create school + get Moodle LTI URLs.",
    "f03-data-isolation": "Each school’s data stays separate (Riverside ≠ Lakeside).",
    "f04-quiz-ui-results": "Take quiz → submit → see score and results page.",
    "f05-ags-passback": "Grade sync UI after quiz (sheet notes testing roadblock — we show honestly).",
    "f06-screen-design": "Branded landing and in-app look.",
    "f07-multi-tenancy": "One app, many schools — pick Riverside or Lakeside.",
    "f08-lti-authorization": "Moodle trusts our keys; we verify Moodle’s login token.",
    "f09-yet-metabase": "Owner console for learning records (Yet) and Metabase reports.",
    "f10-ai-quizzes": "Teacher sets level/complexity; each student gets a different quiz.",
    "f11-coach-voice": "Ask Vidura with mic + speak — many Indian languages.",
    "f12-xapi-chats": "Coach chat saves learning evidence (xAPI).",
    "f13-quiz-parser": "3 difficulty levels + whole-book coverage + study-plan check.",
}


def load_features() -> list[dict]:
    data = yaml.safe_load(FEATURES.read_text(encoding="utf-8"))
    return list(data.get("features") or [])


def build_html(features: list[dict]) -> str:
    n = len(features)
    feature_slides = []
    for i, f in enumerate(features, start=1):
        fid = f["id"]
        title = f.get("title") or fid
        sheet = f.get("sheet") or ""
        plain = PLAIN.get(fid) or (f.get("intro") or "")
        video = f"videos/by-feature/{fid}.mp4"
        feature_slides.append(
            f"""
    <section class="slide theme-video" data-frags="0" data-video="1">
      <div class="video-layout">
        <div class="video-meta">
          <span class="kicker">Done · {i} of {n}</span>
          <h2>{_esc(title)}</h2>
          <p class="sheet-line">{_esc(sheet)}</p>
          <p class="lede">{_esc(plain)}</p>
          <p class="tip">🔊 Turn sound on · Space / → next feature</p>
        </div>
        <div class="video-frame">
          <video controls playsinline preload="metadata" src="{video}">
            <a href="{video}">Open {fid}.mp4</a>
          </video>
        </div>
      </div>
    </section>"""
        )

    slides_inner = "\n".join(feature_slides)
    total = n + 3  # title + how + all features + close

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>EdVidura · Done requirements — recordings</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet"/>
  <style>
    :root {{
      --surface: #e6fff5; --surface-2: #d5f5ea; --ink: #032019; --muted: #3c4a42;
      --primary: #006c4b; --mint: #34d399; --sky: #40c2fd; --citrus: #f0c01a; --coral: #f05a3a;
      --font-display: "Syne", system-ui, sans-serif; --font-body: "Outfit", system-ui, sans-serif;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html, body {{ height: 100%; width: 100%; overflow: hidden; }}
    body {{ font-family: var(--font-body); color: var(--ink); background: var(--surface); }}
    .viewport {{ position: fixed; inset: 0; width: 100vw; height: 100dvh; }}
    .slides {{ position: absolute; inset: 0; }}
    .slide {{
      position: absolute; inset: 0;
      padding: clamp(28px, 4vw, 56px) clamp(28px, 5vw, 72px) clamp(64px, 8vh, 88px);
      display: flex; flex-direction: column; justify-content: center;
      opacity: 0; pointer-events: none; transform: scale(1.03);
      transition: opacity 0.55s ease, transform 0.55s ease;
      background:
        radial-gradient(120% 80% at 100% 0%, rgba(64,194,253,.2), transparent 50%),
        radial-gradient(90% 70% at 0% 100%, rgba(52,211,153,.25), transparent 55%),
        linear-gradient(160deg, #f0fff9 0%, var(--surface) 45%, var(--surface-2) 100%);
    }}
    .slide.on {{ opacity: 1; pointer-events: auto; transform: scale(1); }}
    .slide.theme-deep {{
      color: #e8f8ec;
      background: linear-gradient(155deg, #032019 0%, #0e2b24 55%, #071612 100%);
    }}
    .slide.theme-deep .lede {{ color: rgba(232,248,236,.8); }}
    .kicker {{
      font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
      color: var(--primary); margin-bottom: 10px; display: inline-flex; align-items: center; gap: 8px;
    }}
    .theme-deep .kicker {{ color: var(--mint); }}
    .kicker::before {{
      content: ""; width: 24px; height: 3px; border-radius: 99px;
      background: linear-gradient(90deg, var(--mint), var(--sky));
    }}
    h1 {{
      font-family: var(--font-display); font-size: clamp(2.2rem, 5vw, 3.5rem);
      line-height: 1.05; letter-spacing: -0.03em; font-weight: 800; max-width: 14ch;
    }}
    h1 .pop {{
      background: linear-gradient(105deg, var(--primary), #059669, var(--sky));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }}
    h2 {{
      font-family: var(--font-display); font-size: clamp(1.4rem, 3vw, 2.1rem);
      letter-spacing: -0.02em; font-weight: 700; margin-bottom: 6px;
    }}
    .lede {{ font-size: clamp(1rem, 1.7vw, 1.15rem); line-height: 1.5; color: var(--muted); max-width: 46ch; margin-top: 12px; }}
    .sheet-line {{ font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-top: 6px; }}
    .tip {{ font-size: 0.8rem; color: var(--muted); margin-top: 14px; opacity: 0.85; }}

    .grid {{
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px; margin-top: 22px; max-width: 1100px;
    }}
    .chip {{
      padding: 12px 14px; border-radius: 14px; background: #fff; border: 1px solid rgba(0,108,75,.12);
      font-size: 0.82rem; font-weight: 600; box-shadow: 0 6px 18px rgba(14,43,36,.06);
      opacity: 0; translate: 0 12px; transition: opacity 0.4s, translate 0.4s;
      cursor: pointer;
    }}
    .slide.on .chip.show {{ opacity: 1; translate: 0 0; }}
    .chip small {{ display: block; font-weight: 500; color: var(--muted); margin-top: 4px; font-size: 0.72rem; }}

    .video-layout {{
      display: grid; grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.4fr);
      gap: clamp(16px, 3vw, 36px); align-items: center; height: 100%;
    }}
    @media (max-width: 900px) {{
      .video-layout {{ grid-template-columns: 1fr; overflow: auto; }}
    }}
    .video-frame {{
      background: #0a1612; border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,.25);
      border: 1px solid rgba(0,108,75,.2);
      aspect-ratio: 16 / 9; max-height: min(62vh, 640px);
    }}
    .video-frame video {{ width: 100%; height: 100%; display: block; background: #000; object-fit: contain; }}

    .chrome {{
      position: absolute; left: 0; right: 0; bottom: 0; z-index: 20;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px clamp(16px, 3vw, 28px);
      background: linear-gradient(180deg, transparent, rgba(3,32,25,.1));
    }}
    .dots {{ display: flex; gap: 5px; flex-wrap: wrap; max-width: 55vw; }}
    .dots button {{
      width: 7px; height: 7px; border: 0; border-radius: 99px;
      background: rgba(3,32,25,.22); cursor: pointer; padding: 0;
    }}
    .dots button.on {{ width: 18px; background: var(--primary); }}
    .hint-text {{ font-size: 11px; color: var(--muted); }}
    .nav-btns {{ display: flex; gap: 8px; }}
    .nav-btns button {{
      font-family: var(--font-body); font-weight: 700; font-size: 13px;
      border: 0; cursor: pointer; padding: 10px 16px; border-radius: 999px;
      background: var(--primary); color: #fff;
    }}
    .nav-btns button.ghost {{
      background: rgba(255,255,255,.9); color: var(--primary);
      border: 1px solid rgba(0,108,75,.2);
    }}
    @media print {{
      .chrome {{ display: none !important; }}
      .slide {{ position: relative; opacity: 1 !important; min-height: 100vh; page-break-after: always; }}
      video {{ display: none; }}
    }}
  </style>
</head>
<body>
<div class="viewport">
  <div class="slides" id="slides">

    <section class="slide on" data-frags="0">
      <span class="kicker">Management proof · Sheet Done</span>
      <h1><span class="pop">Requirements</span><br/>as recordings</h1>
      <p class="lede">Every <strong>Done</strong> row from the meetings sheet — one short narrated video with mouse clicks. Same colourful deck style as JEV / LearnWise. Press <strong>F</strong> for fullscreen.</p>
      <p class="lede" style="font-size:0.85rem;margin-top:18px;opacity:0.75">{n} features · turn sound on</p>
    </section>

    <section class="slide" data-frags="1">
      <h2>All Done features</h2>
      <p class="lede">Click a chip to jump, or use Next through each recording.</p>
      <div class="grid" id="toc">
{_toc_chips(features)}
      </div>
    </section>

{slides_inner}

    <section class="slide theme-deep" data-frags="0">
      <span class="kicker">Share</span>
      <h1 style="max-width:16ch;color:#fff">Proof pack ready</h1>
      <p class="lede">Email the HTML + <code style="color:var(--mint)">videos/by-feature/</code> folder, or open the PowerPoint and play videos from the links. Rebuild: <code style="color:var(--mint)">python scripts/build_requirements_recordings_deck.py</code></p>
    </section>

  </div>
  <div class="chrome">
    <div class="dots" id="dots"></div>
    <span class="hint-text" id="counter">1 / {total}</span>
    <div class="nav-btns">
      <button type="button" class="ghost" id="prev">←</button>
      <button type="button" id="next">Next →</button>
    </div>
  </div>
</div>
<script>
(function () {{
  const slides = [...document.querySelectorAll(".slide")];
  const total = slides.length;
  let si = 0;
  const counter = document.getElementById("counter");
  const dotsEl = document.getElementById("dots");

  slides.forEach((_, i) => {{
    const b = document.createElement("button");
    b.type = "button";
    b.title = "Slide " + (i + 1);
    b.addEventListener("click", () => go(i));
    dotsEl.appendChild(b);
  }});

  document.querySelectorAll(".chip[data-jump]").forEach((el) => {{
    el.addEventListener("click", () => go(parseInt(el.dataset.jump, 10)));
  }});

  function pauseAll() {{
    document.querySelectorAll("video").forEach((v) => {{ try {{ v.pause(); }} catch (e) {{}} }});
  }}

  function go(n) {{
    pauseAll();
    slides[si].classList.remove("on");
    si = (n + total) % total;
    slides[si].classList.add("on");
    [...dotsEl.children].forEach((d, i) => d.classList.toggle("on", i === si));
    counter.textContent = (si + 1) + " / " + total;
    slides[si].querySelectorAll(".chip").forEach((c, i) => {{
      setTimeout(() => c.classList.add("show"), 40 + i * 40);
    }});
    const vid = slides[si].querySelector("video");
    if (vid) {{
      try {{ vid.currentTime = 0; vid.play().catch(() => {{}}); }} catch (e) {{}}
    }}
  }}

  document.getElementById("next").onclick = () => go(si + 1);
  document.getElementById("prev").onclick = () => go(si - 1);
  document.addEventListener("keydown", (e) => {{
    if (e.key === "ArrowRight" || e.key === " ") {{ e.preventDefault(); go(si + 1); }}
    if (e.key === "ArrowLeft") {{ e.preventDefault(); go(si - 1); }}
    if (e.key === "f" || e.key === "F") {{
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }}
    if (e.key === "Home") go(0);
    if (e.key === "End") go(total - 1);
  }});

  go(0);
}})();
</script>
</body>
</html>
"""


def _esc(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _toc_chips(features: list[dict]) -> str:
    # slide index: 0 title, 1 toc, 2+ features
    lines = []
    for i, f in enumerate(features):
        jump = i + 2
        lines.append(
            f'        <button type="button" class="chip" data-frag="1" data-jump="{jump}">'
            f'{_esc(f.get("title") or f["id"])}'
            f'<small>{_esc(f.get("sheet") or "")}</small></button>'
        )
    return "\n".join(lines)


def build_pptx(features: list[dict]) -> None:
    from lxml import etree
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import PP_ALIGN
    from pptx.oxml.ns import qn
    from pptx.util import Inches, Pt

    INK = RGBColor(0x03, 0x20, 0x19)
    MUTED = RGBColor(0x3C, 0x4A, 0x42)
    PRIMARY = RGBColor(0x00, 0x6C, 0x4B)
    MINT = RGBColor(0x34, 0xD3, 0x99)
    WHITE = RGBColor(0xFF, 0xFF, 0xFF)
    SURFACE = RGBColor(0xE6, 0xFF, 0xF5)
    DEEP = RGBColor(0x0E, 0x2B, 0x24)
    PAPER = RGBColor(0xFF, 0xFF, 0xFF)
    CITRUS = RGBColor(0xF0, 0xC0, 0x1A)

    def solid_bg(slide, color):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = color

    def set_run(run, text, *, size, bold=False, color=INK):
        run.text = text
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
        run.font.name = "Calibri"

    def add_text(slide, left, top, width, height, lines, align=PP_ALIGN.LEFT):
        box = slide.shapes.add_textbox(left, top, width, height)
        tf = box.text_frame
        tf.word_wrap = True
        for i, (text, size, bold, color) in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = align
            p.space_after = Pt(6)
            run = p.add_run()
            set_run(run, text, size=size, bold=bold, color=color)
        return box

    def add_rect(slide, left, top, width, height, fill):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
        shape.line.fill.background()
        return shape

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    s = prs.slides.add_slide(blank)
    solid_bg(s, SURFACE)
    add_text(s, Inches(0.7), Inches(0.5), Inches(12), Inches(0.4), [("MANAGEMENT PROOF · SHEET DONE", 14, True, PRIMARY)])
    add_text(
        s,
        Inches(0.7),
        Inches(1.8),
        Inches(12),
        Inches(2.2),
        [("Requirements", 44, True, PRIMARY), ("as recordings", 44, True, INK)],
    )
    add_text(
        s,
        Inches(0.7),
        Inches(4.4),
        Inches(11.5),
        Inches(1.5),
        [
            (
                f"Every Done row — {len(features)} narrated videos with mouse clicks. "
                "Open the HTML deck to play videos fullscreen, or open each MP4 from the links below.",
                18,
                False,
                MUTED,
            )
        ],
    )

    # TOC slide
    s = prs.slides.add_slide(blank)
    solid_bg(s, SURFACE)
    add_text(s, Inches(0.7), Inches(0.35), Inches(12), Inches(0.6), [("All Done features", 32, True, INK)])
    for i, f in enumerate(features):
        col = i % 2
        row = i // 2
        x = 0.7 + col * 6.3
        y = 1.2 + row * 0.85
        sh = add_rect(s, Inches(x), Inches(y), Inches(6.0), Inches(0.7), PAPER if i % 2 == 0 else CITRUS)
        tf = sh.text_frame
        p = tf.paragraphs[0]
        run = p.add_run()
        set_run(run, f"{i+1}. {f.get('title') or f['id']}", size=14, bold=True, color=INK)

    # One slide per feature + hyperlink note
    for i, f in enumerate(features, start=1):
        fid = f["id"]
        s = prs.slides.add_slide(blank)
        solid_bg(s, DEEP)
        add_text(
            s,
            Inches(0.7),
            Inches(0.4),
            Inches(12),
            Inches(0.4),
            [(f"DONE · {i} OF {len(features)}", 12, True, MINT)],
        )
        add_text(
            s,
            Inches(0.7),
            Inches(1.1),
            Inches(12),
            Inches(1.2),
            [(f.get("title") or fid, 32, True, WHITE)],
        )
        add_text(
            s,
            Inches(0.7),
            Inches(2.5),
            Inches(12),
            Inches(0.5),
            [(f.get("sheet") or "", 16, True, MINT)],
        )
        add_text(
            s,
            Inches(0.7),
            Inches(3.3),
            Inches(11.5),
            Inches(1.5),
            [(PLAIN.get(fid) or f.get("intro") or "", 20, False, WHITE)],
        )
        add_text(
            s,
            Inches(0.7),
            Inches(5.3),
            Inches(12),
            Inches(1.2),
            [
                (f"Video file: videos/by-feature/{fid}.mp4", 16, True, MINT),
                ("Best: open requirements-recordings-deck.html — video plays on this slide.", 14, False, MINT),
            ],
        )

    s = prs.slides.add_slide(blank)
    solid_bg(s, DEEP)
    add_text(s, Inches(0.7), Inches(2.5), Inches(12), Inches(1.5), [("Proof pack ready", 40, True, WHITE)], align=PP_ALIGN.CENTER)
    add_text(
        s,
        Inches(1.5),
        Inches(4.2),
        Inches(10.3),
        Inches(1.2),
        [("Share HTML deck + videos/by-feature folder, or this PPTX with the MP4s beside it.", 18, False, MINT)],
        align=PP_ALIGN.CENTER,
    )

    prs.save(OUT_PPTX)


def main() -> None:
    features = load_features()
    OUT_HTML.write_text(build_html(features), encoding="utf-8")
    print(f"Wrote {OUT_HTML}")
    try:
        build_pptx(features)
        print(f"Wrote {OUT_PPTX}")
    except Exception as e:
        print(f"PPTX skipped: {e}")


if __name__ == "__main__":
    main()
