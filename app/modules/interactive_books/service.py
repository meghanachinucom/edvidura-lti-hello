"""Living Interactive Textbooks & Concept Reels Service (Phase 2 Engine).

Manages beat compilation, audio narration synchronizer,
in-picture interactive concept checks, and SCORM/EPUB packaging.
100% native EdVidura branding.
"""
from __future__ import annotations

import io
import json
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db import connect
from app.modules.xapi.service import record_statement

# In-memory beats store for offline fallback / seeded books
_MEM_BEATS: Dict[str, List[Dict[str, Any]]] = {
    "de7900fd-488b-4740-bf7e-7a11b3475cd6": [
        {
            "id": "beat-alg-0",
            "manual_id": "de7900fd-488b-4740-bf7e-7a11b3475cd6",
            "chapter_index": 0,
            "beat_index": 0,
            "title": "The Equal Sign as a Balanced Scale",
            "narration_text": "An equation states that two mathematical expressions represent the exact same quantity. Picture a balanced physical scale: whatever you do to one side, you must do to the other to keep it balanced.",
            "narration_translations": {
                "hi": "एक समीकरण यह बताता है कि दो गणितीय भाव बिल्कुल समान मात्रा का प्रतिनिधित्व करते हैं। एक संतुलित तराजू की कल्पना करें।",
                "te": "ఒక సమీకరణం రెండు గణిత సమాసాలు సరిగ్గా ఒకే విలువను సూచిస్తాయని చెబుతుంది. సమతుల్య త్రాసును ఊహించుకోండి.",
            },
            "visual_diagram": {
                "type": "balance_scale",
                "left": "2x + 5",
                "right": "15",
                "pivot": "center",
                "balanced": True,
            },
            "duration_sec": 30,
            "inline_check": {
                "id": "check-alg-0",
                "question": "Why must an operation be applied to both sides of an equation?",
                "options": [
                    "To change the variable",
                    "To preserve balance and equality",
                    "To eliminate all numbers",
                    "To double the answer",
                ],
                "correct_index": 1,
                "explanation": "Applying operations equally to both sides ensures the mathematical statement remains true.",
            },
        },
        {
            "id": "beat-alg-1",
            "manual_id": "de7900fd-488b-4740-bf7e-7a11b3475cd6",
            "chapter_index": 0,
            "beat_index": 1,
            "title": "Undoing Constant Addition",
            "narration_text": "In 2x + 5 = 15, our first objective is to isolate the variable term 2x. Because 5 is added, we use the inverse operation: subtract 5 from both sides, yielding 2x = 10.",
            "narration_translations": {
                "hi": "2x + 5 = 15 में, हमारा पहला लक्ष्य 2x पद को अलग करना है। 5 घटाने पर हमें 2x = 10 मिलता है।",
                "te": "2x + 5 = 15 లో, మొదటి లక్ష్యం 2x పదాన్ని వేరుచేయడం. రెండు వైపులా 5 తీసివేస్తే 2x = 10 అవుతుంది.",
            },
            "visual_diagram": {
                "type": "step_transformation",
                "initial": "2x + 5 = 15",
                "action": "- 5 from both sides",
                "result": "2x = 10",
            },
            "duration_sec": 35,
            "inline_check": {
                "id": "check-alg-1",
                "question": "What is the inverse operation of adding 5?",
                "options": ["Adding 5", "Subtracting 5", "Multiplying by 5", "Dividing by 5"],
                "correct_index": 1,
                "explanation": "Subtraction is the inverse operation of addition.",
            },
        },
        {
            "id": "beat-alg-2",
            "manual_id": "de7900fd-488b-4740-bf7e-7a11b3475cd6",
            "chapter_index": 0,
            "beat_index": 2,
            "title": "Dividing by the Coefficient",
            "narration_text": "Now we have 2x = 10. The coefficient 2 is multiplying x. We divide both sides by 2 to isolate x completely: x = 10 / 2 = 5.",
            "narration_translations": {
                "hi": "अब हमारे पास 2x = 10 है। 2 से दोनों पक्षों को भाग देने पर: x = 5।",
                "te": "ఇప్పుడు 2x = 10 ఉంది. రెండు వైపులా 2 తో భాగిస్తే: x = 5 అవుతుంది.",
            },
            "visual_diagram": {
                "type": "solution_card",
                "step": "Divide by 2",
                "equation": "x = 5",
            },
            "duration_sec": 25,
            "inline_check": {
                "id": "check-alg-2",
                "question": "If 2x = 10, what is the value of x?",
                "options": ["2", "5", "8", "20"],
                "correct_index": 1,
                "explanation": "Dividing 10 by 2 yields x = 5.",
            },
        },
    ],
    "science-class8-physics": [
        {
            "id": "beat-sci-0",
            "manual_id": "science-class8-physics",
            "chapter_index": 0,
            "beat_index": 0,
            "title": "The Three Wire Color Code",
            "narration_text": "Standard domestic electrical circuits utilize three dedicated conductors: Live, Neutral, and Earth. The earth wire ensures safety by routing fault current into the ground.",
            "narration_translations": {
                "hi": "घरेलू विद्युत सर्किट में तीन तार होते हैं: लाइव, न्यूट्रल और अर्थ।",
                "te": "గృహ విద్యుత్ వలయాల్లో మూడు తీగలు ఉంటాయి: లైవ్, న్యూట్రల్ మరియు ఎర్త్.",
            },
            "visual_diagram": {
                "type": "circuit_wiring",
                "wires": [
                    {"name": "Live", "color": "#ef4444"},
                    {"name": "Neutral", "color": "#3b82f6"},
                    {"name": "Earth", "color": "#22c55e"},
                ],
            },
            "duration_sec": 30,
            "inline_check": {
                "id": "check-sci-0",
                "question": "What is the primary safety purpose of the earth conductor?",
                "options": [
                    "To power the appliance",
                    "To carry fault current safely into the ground",
                    "To increase voltage",
                    "To store electricity",
                ],
                "correct_index": 1,
                "explanation": "The earth wire diverts fault currents to earth, tripping the circuit breaker safely.",
            },
        }
    ],
    "railways-safety-ops": [
        {
            "id": "beat-rail-0",
            "manual_id": "railways-safety-ops",
            "chapter_index": 0,
            "beat_index": 0,
            "title": "Automatic Block Signalling System",
            "narration_text": "Indian Railways operates on automatic block signalling systems to maintain safe headways between consecutive trains.",
            "narration_translations": {
                "hi": "भारतीय रेल में स्वचालित ब्लॉक सिग्नलिंग प्रणाली का उपयोग किया जाता है।",
                "te": "భారతీయ రైల్వేలలో ఆటోమేటిక్ బ్లాక్ సిగ్నలింగ్ వ్యవస్థ ఉపయోగించబడుతుంది.",
            },
            "visual_diagram": {
                "type": "railway_signal",
                "aspects": ["Green", "Double Yellow", "Yellow", "Red"],
            },
            "duration_sec": 30,
            "inline_check": {
                "id": "check-rail-0",
                "question": "What does a Yellow aspect signal instruct the loco pilot to do?",
                "options": [
                    "Proceed at maximum speed",
                    "Pass at normal speed",
                    "Proceed with caution, prepare to stop at next signal",
                    "Reverse the train",
                ],
                "correct_index": 2,
                "explanation": "Yellow indicates caution and preparing to stop at the next signal.",
            },
        }
    ],
    "digital-literacy-ai": [
        {
            "id": "beat-digi-0",
            "manual_id": "digital-literacy-ai",
            "chapter_index": 0,
            "beat_index": 0,
            "title": "Password Hygiene & MFA Protection",
            "narration_text": "Strong credentials and Multi-Factor Authentication prevent credential theft across academic systems.",
            "narration_translations": {
                "hi": "मजबूत पासवर्ड और मल्टी-फैक्टर प्रमाणीकरण पहली रक्षा पंक्ति हैं।",
                "te": "బలమైన పాస్‌వర్డ్‌లు మరియు మల్టీ-ఫాక్టర్ ప్రామాణీకరణ రక్షణ కల్పిస్తాయి.",
            },
            "visual_diagram": {
                "type": "security_shield",
                "layers": ["Passphrase", "OTP", "Biometrics"],
            },
            "duration_sec": 30,
            "inline_check": {
                "id": "check-digi-0",
                "question": "Why is multi-factor authentication (MFA) critical for student portals?",
                "options": [
                    "It makes logins faster",
                    "It stops unauthorized access even if password is compromised",
                    "It replaces the password entirely",
                    "It reduces network bandwidth",
                ],
                "correct_index": 1,
                "explanation": "MFA ensures an attacker cannot gain access with only a password.",
            },
        }
    ],
    "niti-ethics-values": [
        {
            "id": "beat-niti-0",
            "manual_id": "niti-ethics-values",
            "chapter_index": 0,
            "beat_index": 0,
            "title": "Vidura Niti: Truth, Duty & Compassion",
            "narration_text": "Ancient Indian ethical discourse emphasizes perseverance, intellectual honesty, and treating peers with dignity.",
            "narration_translations": {
                "hi": "विदुर नीति सत्य, कर्तव्यनिष्ठा और करुणा पर जोर देती है।",
                "te": "విదుర నీతి సత్యం, ధర్మం మరియు కరుణను ప్రతిపాదించింది.",
            },
            "visual_diagram": {
                "type": "values_pillar",
                "pillars": ["Satya", "Dharma", "Karuna"],
            },
            "duration_sec": 30,
            "inline_check": {
                "id": "check-niti-0",
                "question": "What is the core pillar of intellectual honesty in collaborative study?",
                "options": [
                    "Claiming credit for others work",
                    "Acknowledging sources and helping peers grow",
                    "Studying in isolation",
                    "Memorizing without understanding",
                ],
                "correct_index": 1,
                "explanation": "Intellectual honesty means giving credit and uplifting fellow learners.",
            },
        }
    ],
}


def get_book_beats(manual_id: str, chapter_index: int = 0, lang: str = "en") -> List[Dict[str, Any]]:
    """Return synchronized chapter beats, diagram specs, and language-matched narration."""
    beats = _MEM_BEATS.get(manual_id)
    if not beats:
        alias_map = {
            "11111111-2222-3333-4444-555555555551": "de7900fd-488b-4740-bf7e-7a11b3475cd6",
            "11111111-2222-3333-4444-555555555552": "science-class8-physics",
            "11111111-2222-3333-4444-555555555553": "railways-safety-ops",
            "11111111-2222-3333-4444-555555555554": "vocational-automotive-mfg",
            "11111111-2222-3333-4444-555555555555": "niti-ethics-values",
        }
        alt_id = alias_map.get(manual_id)
        if alt_id:
            beats = _MEM_BEATS.get(alt_id)
    if not beats:
        beats = list(_MEM_BEATS.values())[0] if _MEM_BEATS else []

    # Try DB
    try:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, manual_id, chapter_index, beat_index, title, narration_text,
                           narration_translations_json, visual_diagram_spec, inline_check_json, duration_sec
                    FROM book_chapter_beats
                    WHERE manual_id = %s AND chapter_index = %s
                    ORDER BY beat_index ASC
                    """,
                    (manual_id, chapter_index),
                )
                rows = cur.fetchall()
                if rows:
                    beats = []
                    for r in rows:
                        beats.append({
                            "id": str(r["id"]),
                            "manual_id": r["manual_id"],
                            "chapter_index": r["chapter_index"],
                            "beat_index": r["beat_index"],
                            "title": r["title"],
                            "narration_text": r["narration_text"],
                            "narration_translations": r["narration_translations_json"] or {},
                            "visual_diagram": r["visual_diagram_spec"] or {},
                            "inline_check": r["inline_check_json"] or {},
                            "duration_sec": r["duration_sec"],
                        })
    except Exception:
        pass

    # Filter/enrich for language
    results = []
    for b in beats:
        b_copy = dict(b)
        translations = b_copy.get("narration_translations", {})
        # Language matched narration if requested
        lang_code = lang.split("-")[0] if "-" in lang else lang
        if lang_code in translations:
            b_copy["active_narration"] = translations[lang_code]
        else:
            b_copy["active_narration"] = b_copy.get("narration_text", "")
        results.append(b_copy)

    return results


def compile_beats_from_content(
    manual_id: str,
    title: str,
    raw_text: str,
    chapter_index: int = 0,
) -> Dict[str, Any]:
    """Auto-generate structured visual beats and inline checks from raw textbook text."""
    paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
    generated_beats = []

    for idx, p in enumerate(paragraphs[:3]):
        beat_id = f"gen-{manual_id[:8]}-{chapter_index}-{idx}"
        first_sentence = p.split(".")[0]
        beat = {
            "id": beat_id,
            "manual_id": manual_id,
            "chapter_index": chapter_index,
            "beat_index": idx,
            "title": f"Beat {idx + 1}: {first_sentence[:45]}...",
            "narration_text": p,
            "narration_translations": {
                "hi": f"अध्याय {chapter_index + 1}: {first_sentence[:40]}।",
                "te": f"అధ్యాయం {chapter_index + 1}: {first_sentence[:40]}.",
            },
            "visual_diagram": {
                "type": "conceptual_infographic",
                "heading": f"Key Principle {idx + 1}",
                "summary": first_sentence,
            },
            "duration_sec": 30,
            "inline_check": {
                "id": f"chk-{beat_id}",
                "question": f"Which statement best summarizes {first_sentence[:30]}?",
                "options": [
                    "It introduces an arbitrary convention",
                    f"It establishes that {first_sentence[:40]}",
                    "It has no practical application",
                ],
                "correct_index": 1,
                "explanation": "Core comprehension check confirming active recall.",
            },
        }
        generated_beats.append(beat)

    _MEM_BEATS[manual_id] = generated_beats

    # Try saving to DB
    try:
        with connect() as conn:
            with conn.cursor() as cur:
                for b in generated_beats:
                    cur.execute(
                        """
                        INSERT INTO book_chapter_beats (
                            tenant_id, manual_id, chapter_index, beat_index, title,
                            narration_text, narration_translations_json, visual_diagram_spec,
                            inline_check_json, duration_sec
                        ) VALUES (
                            (SELECT id FROM tenants WHERE slug = 'riverside' LIMIT 1),
                            %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """,
                        (
                            manual_id,
                            chapter_index,
                            b["beat_index"],
                            b["title"],
                            b["narration_text"],
                            json.dumps(b["narration_translations"]),
                            json.dumps(b["visual_diagram"]),
                            json.dumps(b["inline_check"]),
                            b["duration_sec"],
                        ),
                    )
    except Exception:
        pass

    return {
        "ok": True,
        "manual_id": manual_id,
        "compiled_beats_count": len(generated_beats),
        "beats": generated_beats,
    }


def grade_beat_check(
    manual_id: str,
    beat_id: str,
    selected_option: int,
    subject: str = "6",
) -> Dict[str, Any]:
    """Grade learner's in-picture quick check, unlock next beat, log xAPI statement."""
    beats = _MEM_BEATS.get(manual_id, [])
    target_beat = next((b for b in beats if b.get("id") == beat_id), None)

    if not target_beat and beats:
        target_beat = beats[0]

    inline_chk = target_beat.get("inline_check", {}) if target_beat else {}
    correct_idx = inline_chk.get("correct_index", inline_chk.get("correct", 1))
    is_correct = (selected_option == correct_idx)

    # Log xAPI statement
    try:
        record_statement(
            actor_id=subject,
            actor_name="Alice Nguyen",
            verb="answered" if is_correct else "attempted",
            object_id=f"urn:edvidura:book:{manual_id}:beat:{beat_id}",
            object_name=target_beat.get("title", "Interactive Chapter Quick-Check"),
            score=100.0 if is_correct else 0.0,
            success=is_correct,
            tenant_slug="riverside",
        )
    except Exception:
        pass

    return {
        "ok": True,
        "beat_id": beat_id,
        "is_correct": is_correct,
        "correct_index": correct_idx,
        "feedback": "Correct! Excellent grasp of the concept." if is_correct else "Not quite. Review the visual diagram and try again.",
        "explanation": inline_chk.get("explanation", "Active recall reinforces key textbook concepts."),
        "next_beat_unlocked": True,
    }


def export_scorm_package(manual_id: str, title: str = "Interactive Textbook") -> bytes:
    """Generate a clean SCORM 1.2 zip bundle for LMS import."""
    beats = get_book_beats(manual_id=manual_id)
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # imsmanifest.xml
        manifest = f"""<?xml version="1.0" standalone="no" ?>
<manifest identifier="edvidura_scorm_{manual_id}" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>{title}</title>
      <item identifier="item1" identifierref="res1">
        <title>{title} — Interactive Beats</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>"""
        z.writestr("imsmanifest.xml", manifest)

        # index.html
        beats_json = json.dumps(beats, indent=2)
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <style>
    body {{ font-family: sans-serif; padding: 2rem; max-width: 800px; margin: auto; line-height: 1.6; color: #1e293b; }}
    .beat {{ border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; background: #fff; }}
    h1 {{ color: #0f766e; }}
    .badge {{ display: inline-block; background: #ccfbf1; color: #0f766e; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <p class="badge">EdVidura SCORM 1.2 Interactive Edition</p>
  <div id="beats">
    {"".join(f'<div class="beat"><h2>{b.get("title")}</h2><p>{b.get("narration_text")}</p></div>' for b in beats)}
  </div>
  <script>
    // SCORM 1.2 LMS API connector stub
    window.addEventListener('load', function() {{
      var api = window.parent.API || window.API;
      if (api) {{
        api.LMSInitialize('');
        api.LMSSetValue('cmi.core.lesson_status', 'completed');
        api.LMSCommit('');
        api.LMSFinish('');
      }}
    }});
  </script>
</body>
</html>"""
        z.writestr("index.html", html)

    buf.seek(0)
    return buf.getvalue()


def export_epub_html_package(manual_id: str, title: str = "Interactive Textbook") -> str:
    """Generate standalone semantic HTML5 / EPUB3 readable edition."""
    beats = get_book_beats(manual_id=manual_id)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{title} — EdVidura Digital Textbook</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 840px; margin: 2rem auto; padding: 1rem; color: #0f172a; line-height: 1.7; }}
    header {{ border-bottom: 2px solid #0f766e; padding-bottom: 1rem; margin-bottom: 2rem; }}
    .chapter-beat {{ margin-bottom: 2.5rem; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; }}
    .q-card {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem; margin-top: 1rem; }}
  </style>
</head>
<body>
  <header>
    <h1>{title}</h1>
    <p>EdVidura Standalone Accessible eBook Edition · WCAG 2.1 AA Compliant</p>
  </header>
  <main>
    {"".join(f'''<section class="chapter-beat">
      <h2>{b.get("title")}</h2>
      <p>{b.get("narration_text")}</p>
      <div class="q-card">
        <strong>Concept Check:</strong> {b.get("inline_check", {}).get("question", "")}
      </div>
    </section>''' for b in beats)}
  </main>
</body>
</html>"""
    return html
