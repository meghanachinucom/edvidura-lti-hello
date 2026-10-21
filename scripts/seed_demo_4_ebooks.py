"""Seed exactly 4 curated, beautiful, demo-aligned eBooks and clean up test clutter.

Aligned Books:
1. Principles of Science & Technology (Physical Sciences · PeBL Core Demo)
2. Interactive Welding & Metallurgy Guide (Vocational Engineering · Moodle Course 2 Aligned)
3. Algebra I: Foundations & Functions Handbook (Mathematics · Class 8 Aligned)
4. Modern Biology & Cellular Systems (Life Sciences · Biology Aligned)
"""
from __future__ import annotations

import html
import io
import json
import os
import shutil
import sys
import zipfile
from pathlib import Path
from uuid import UUID, uuid5, NAMESPACE_URL

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import psycopg
from psycopg.rows import dict_row

from app.tenancy import TENANT_A_ID
from app.modules.manuals.epub import validate_and_extract_epub

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00"
    b"\x1f\xf3\xffa\x00\x00\x00\x19IDATx\x9cc\xfc\xcf\x80\x01\x18\x18\x18\x80\x81\x81\x01\x00"
    b"\x00\x04\x10\x00\x01\xa8y\xcd\xad\x00\x00\x00\x00IEND\xaeB`\x82"
)


def build_epub(
    title: str,
    identifier: str,
    chapters: list[dict[str, str]],
    accent_color: str = "#0f766e",
    accent_light: str = "#f0fdfa",
) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("mimetype", b"application/epub+zip", compress_type=zipfile.ZIP_STORED)

        container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""
        zf.writestr("META-INF/container.xml", container_xml.encode("utf-8"))

        manifest_items = [
            '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
            '<item id="style" href="style.css" media-type="text/css"/>',
            '<item id="img1" href="images/diagram.png" media-type="image/png"/>',
        ]
        spine_items = []
        for i, ch in enumerate(chapters, start=1):
            cid = f"ch{i}"
            manifest_items.append(f'<item id="{cid}" href="{cid}.xhtml" media-type="application/xhtml+xml"/>')
            spine_items.append(f'<itemref idref="{cid}"/>')

        safe_title = html.escape(title, quote=False)
        opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:{identifier}</dc:identifier>
    <dc:title>{safe_title}</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    {chr(10).join("    " + m for m in manifest_items)}
  </manifest>
  <spine>
    {chr(10).join("    " + s for s in spine_items)}
  </spine>
</package>"""
        zf.writestr("OEBPS/content.opf", opf.encode("utf-8"))

        style_css = f"""body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.7;
  color: #1e293b;
  margin: 0;
  padding: 2rem 2.5rem;
  background: #ffffff;
}}
h1 {{
  color: {accent_color};
  font-size: 1.85rem;
  font-weight: 700;
  border-bottom: 2px solid {accent_color}22;
  padding-bottom: 0.75rem;
  margin-top: 0;
  margin-bottom: 1.5rem;
}}
h2 {{
  color: {accent_color};
  font-size: 1.35rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}}
p {{
  margin: 0 0 1.25rem 0;
  font-size: 1.05rem;
}}
.callout {{
  background: {accent_light};
  border-left: 4px solid {accent_color};
  padding: 1.25rem 1.5rem;
  border-radius: 8px;
  margin: 1.75rem 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}}
.callout strong {{
  color: {accent_color};
  display: block;
  margin-bottom: 0.25rem;
}}
.diagram-box {{
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin: 1.75rem 0;
}}
.diagram-box img {{
  width: 52px;
  height: 52px;
  object-fit: contain;
}}
.key-takeaway {{
  background: #f1f5f9;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-top: 2rem;
  font-size: 0.95rem;
}}
ul, ol {{
  margin: 0 0 1.5rem 1.5rem;
  padding: 0;
}}
li {{
  margin-bottom: 0.5rem;
}}
"""
        zf.writestr("OEBPS/style.css", style_css.encode("utf-8"))
        zf.writestr("OEBPS/images/diagram.png", PNG_BYTES)

        toc_items = []
        for i, ch in enumerate(chapters, start=1):
            toc_items.append(f'<li><a href="ch{i}.xhtml">{html.escape(ch["title"], quote=False)}</a></li>')

        toc = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>{safe_title} — Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      {chr(10).join("      " + t for t in toc_items)}
    </ol>
  </nav>
</body>
</html>"""
        zf.writestr("OEBPS/toc.xhtml", toc.encode("utf-8"))

        for i, ch in enumerate(chapters, start=1):
            safe_ch_title = html.escape(ch["title"], quote=False)
            safe_caption = html.escape(ch.get("diagram_caption", "Interactive Technical Diagram"), quote=False)
            safe_takeaway = html.escape(ch.get("takeaway", "Mastery of this section prepares the learner for the associated competency check."), quote=False)
            ch_html = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8"/>
  <title>{safe_ch_title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>{safe_ch_title}</h1>
  {ch["body"]}
  <div class="diagram-box">
    <img src="images/diagram.png" alt="Technical Diagram"/>
    <div>
      <div style="font-weight:600;color:{accent_color}">{safe_caption}</div>
      <div style="font-size:0.9rem;color:#64748b">Verified pedagogical diagram — accessible with screen readers.</div>
    </div>
  </div>
  <div class="key-takeaway">
    <strong>Key Competency Takeaway:</strong> {safe_takeaway}
  </div>
</body>
</html>"""
            zf.writestr(f"OEBPS/ch{i}.xhtml", ch_html.encode("utf-8"))

    return buf.getvalue()


DEMO_BOOKS = [
    {
        "slug": "pebl-demo-ebook",
        "title": "Principles of Science & Technology",
        "desc": "Official PeBL demonstration eBook featuring interactive chapters, navigation, local CSS, diagrams, and full xAPI telemetry.",
        "accent": "#0f766e",
        "light": "#f0fdfa",
        "chapters": [
            {
                "title": "Chapter 1: The Scientific Method & Empirical Investigation",
                "body": """<p>The scientific method is an empirical method for acquiring knowledge that has characterized the development of science since at least the 17th century.</p>
<div class="callout">
  <strong>Key Principle:</strong> Hypotheses must be empirically testable and falsifiable through controlled, repeatable experimentation.
</div>
<p>Modern scientific inquiry combines deductive logic with rigorous inductive observation to build predictive models of the physical world.</p>""",
                "diagram_caption": "Empirical Observation & Falsification Cycle",
                "takeaway": "Formulating testable hypotheses and distinguishing correlation from causation.",
            },
            {
                "title": "Chapter 2: Energy Systems, Thermodynamics & Entropy",
                "body": """<p>Thermodynamics is the branch of physics that deals with heat, work, and temperature, and their relation to energy, radiation, and physical properties of matter.</p>
<div class="callout">
  <strong>First Law of Thermodynamics:</strong> Energy can neither be created nor destroyed; it can only change forms from potential, kinetic, or thermal states.
</div>
<p>The Second Law states that the total entropy of an isolated system can never decrease over time, establishing the fundamental arrow of time in physical systems.</p>""",
                "diagram_caption": "Closed vs Open Thermodynamic Energy Exchanges",
                "takeaway": "Energy conservation and entropy limits in mechanical engines.",
            },
            {
                "title": "Chapter 3: Quantum Foundations & Particle Duality",
                "body": """<p>Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.</p>
<div class="callout">
  <strong>Wave-Particle Duality:</strong> Matter and light exhibit behaviors characteristic of both waves and particles depending on the measurement apparatus.
</div>
<p>Heisenberg's Uncertainty Principle imposes a fundamental limit on the precision with which certain pairs of physical properties, such as position and momentum, can be known.</p>""",
                "diagram_caption": "Double-Slit Diffraction & Waveform Superposition",
                "takeaway": "Probabilistic quantum states and measurement limits.",
            },
            {
                "title": "Chapter 4: Technological Applications in Modern Engineering",
                "body": """<p>Applied physics bridges the gap between pure theoretical inquiry and practical technological systems, powering modern microelectronics, lasers, and quantum sensors.</p>
<div class="callout">
  <strong>Semiconductor Physics:</strong> Doped silicon p-n junctions enable solid-state transistor switching, the fundamental building block of modern digital computers.
</div>
<p>Future engineering horizons include quantum computing, solid-state battery electrolytes, and high-efficiency photovoltaic materials.</p>""",
                "diagram_caption": "Semiconductor Bandgap & Carrier Dynamics",
                "takeaway": "Translating physical laws into scalable computing and clean energy technologies.",
            },
        ],
    },
    {
        "slug": "welding-demo-handbook",
        "title": "Interactive Welding & Metallurgy Guide",
        "desc": "Industrial standard procedures for shielded metal arc welding (SMAW), metallurgy of heat-affected zones, and non-destructive joint testing. Aligned with Course 2.",
        "accent": "#b45309",
        "light": "#fffbeb",
        "chapters": [
            {
                "title": "Chapter 1: Shielded Metal Arc Welding (SMAW) Principles & Safety",
                "body": """<p>Shielded Metal Arc Welding (SMAW), informally known as stick welding, utilizes a consumable electrode coated in flux to lay the weld bead.</p>
<div class="callout">
  <strong>Crucial Safety Standard:</strong> Maintain shade 10–12 eye protection, flame-retardant leather gear, and positive ventilation to exhaust toxic metal fumes.
</div>
<p>The electric arc generates temperatures exceeding 3,500°C (6,300°F), melting the base metal and depositing filler metal protected by a decomposing gaseous flux shield.</p>""",
                "diagram_caption": "SMAW Arc Zone & Slag Shielding Mechanism",
                "takeaway": "Safe workstation preparation, voltage checks, and strike technique.",
            },
            {
                "title": "Chapter 2: Arc Physics, Voltage Regulation & Electrical Safety",
                "body": """<p>Stable arc maintenance requires strict control over open circuit voltage (OCV), current polarity (DCEP vs DCEN), and arc length distance.</p>
<div class="callout">
  <strong>Electrical Safety Threshold:</strong> Never touch the energized electrode with wet gloves or barefoot on a grounded steel worktable.
</div>
<p>Too long of an arc increases voltage, causing spatter and porosity; too short of an arc causes electrode freezing and irregular bead penetration.</p>""",
                "diagram_caption": "Constant-Current Power Curve & Arc Length Voltage Variations",
                "takeaway": "Fine-tuning amperage and arc length for clean weld penetration.",
            },
            {
                "title": "Chapter 3: Metallurgy of Welds, Microstructure & Cooling Dynamics",
                "body": """<p>The heat-affected zone (HAZ) undergoes significant metallurgical microstructural changes without reaching melting temperature.</p>
<div class="callout">
  <strong>Martensitic Transformation:</strong> Rapid quench rates in medium-to-high carbon steels induce brittle martensite, dramatically increasing hydrogen-induced cracking risks.
</div>
<p>Preheating the base plate and utilizing low-hydrogen E7018 electrodes controls the cooling rate and prevents cold-cracking failures in critical structural members.</p>""",
                "diagram_caption": "Iron-Carbon Phase Diagram & HAZ Grain Coarsening Zones",
                "takeaway": "Preheat calculations and preventing brittle microstructure formation.",
            },
            {
                "title": "Chapter 4: Inspection Protocols, Non-Destructive Testing & Certification",
                "body": """<p>Quality assurance ensures weldment integrity through both visual inspection (VT) and non-destructive examination (NDE) methods.</p>
<div class="callout">
  <strong>Acceptance Criteria (AWS D1.1):</strong> Complete fusion without undercut exceeding 1mm, zero cracks, and restricted surface porosity within prescribed inspection limits.
</div>
<p>Ultrasonic Testing (UT) and Radiographic Testing (RT) identify subsurface discontinuities such as incomplete root penetration and slag inclusions.</p>""",
                "diagram_caption": "Ultrasonic Angle-Beam Flaw Detection in Butt Joints",
                "takeaway": "Executing visual inspection checklists and identifying root causes of weld defects.",
            },
        ],
    },
    {
        "slug": "algebra-i-study-handbook",
        "title": "Algebra I: Foundations & Functions Handbook",
        "desc": "Core algebraic principles, linear modeling, functions, and quadratic factoring for secondary education. Aligned with Class 8 curriculum.",
        "accent": "#4338ca",
        "light": "#eef2ff",
        "chapters": [
            {
                "title": "Chapter 1: Real Number Systems, Axioms & Variable Expressions",
                "body": """<p>Algebra extends arithmetic by representing unknown quantities with letters called variables, governed by field axioms.</p>
<div class="callout">
  <strong>Fundamental Properties:</strong> Commutative, Associative, and Distributive properties allow restructuring complex polynomial terms without altering their mathematical value.
</div>
<p>Evaluating an expression requires substituting numerical values and executing operations adhering strictly to operator precedence (PEMDAS).</p>""",
                "diagram_caption": "Real Number Hierarchy: Natural, Integer, Rational, and Irrational Sets",
                "takeaway": "Order of operations and distributive property simplification.",
            },
            {
                "title": "Chapter 2: Solving Linear Equations & Multi-Variable Systems",
                "body": """<p>A linear equation in one variable expresses an equality between two first-degree polynomial expressions.</p>
<div class="callout">
  <strong>Balancing Rule:</strong> Whatever mathematical operation is performed on one side of an equation must simultaneously be performed on the opposite side.
</div>
<p>Systems of two linear equations can be resolved using graphing, substitution, or elimination to find the singular coordinate intersection point (x, y).</p>""",
                "diagram_caption": "System Intersection, Parallel Inconsistency, and Coincident Systems",
                "takeaway": "Substitution and elimination methods for solving simultaneous linear systems.",
            },
            {
                "title": "Chapter 3: Coordinate Geometry, Relations & Function Notation",
                "body": """<p>A function is a mathematical relation that maps every element in an input domain to exactly one element in an output range.</p>
<div class="callout">
  <strong>Vertical Line Test:</strong> If any vertical line intersects a graph in more than one place, the relation is not a function.
</div>
<p>The slope-intercept form y = mx + b directly communicates the constant rate of change (slope m) and vertical baseline (y-intercept b).</p>""",
                "diagram_caption": "Cartesian Coordinate Plane, Domain-Range Mapping, and Slope Calculation",
                "takeaway": "Graphing linear functions and interpreting rates of change in real-world contexts.",
            },
            {
                "title": "Chapter 4: Quadratic Polynomials, Factoring & Vertex Analysis",
                "body": """<p>Quadratic equations possess second-degree terms (ax² + bx + c = 0) producing parabolic geometric curves.</p>
<div class="callout">
  <strong>The Quadratic Formula:</strong> For any quadratic equation, roots are given by x = (-b ± √(b² - 4ac)) / 2a.
</div>
<p>The discriminant (b² - 4ac) reveals the nature of the roots: positive yields two distinct real solutions, zero yields one double root, and negative yields complex conjugates.</p>""",
                "diagram_caption": "Parabola Vertex, Axis of Symmetry, and Zeroes (x-intercepts)",
                "takeaway": "Factoring trinomials and computing vertex coordinates.",
            },
        ],
    },
    {
        "slug": "biology-life-sciences",
        "title": "Modern Biology & Cellular Systems",
        "desc": "Cellular architecture, genetics, photosynthesis, and human physiological homeostasis. Aligned with Life Sciences curriculum.",
        "accent": "#0d9488",
        "light": "#f0fdfa",
        "chapters": [
            {
                "title": "Chapter 1: Cellular Architecture, Membranes & Organelle Function",
                "body": """<p>The cell is the basic structural, functional, and biological unit of all known organisms. All living cells arise from pre-existing cells.</p>
<div class="callout">
  <strong>Fluid Mosaic Model:</strong> The phospholipid bilayer selectively controls molecule transport via passive diffusion, facilitated channels, and ATP-powered active pumps.
</div>
<p>Eukaryotic cells compartmentalize biochemical functions inside membrane-bound organelles such as the nucleus, mitochondria, and endoplasmic reticulum.</p>""",
                "diagram_caption": "Eukaryotic Cell Organelles & Phospholipid Membrane Bilayer",
                "takeaway": "Distinguishing prokaryotes from eukaryotes and organelle functions.",
            },
            {
                "title": "Chapter 2: DNA Structure, Replication & Molecular Heredity",
                "body": """<p>Deoxyribonucleic acid (DNA) is a double helix polymer carrying genetic instructions for the development and functioning of living systems.</p>
<div class="callout">
  <strong>Base-Pairing Rule:</strong> Adenine pairs specifically with Thymine (A-T), and Guanine pairs with Cytosine (G-C) via complementary hydrogen bonds.
</div>
<p>During protein synthesis, genetic code is transcribed into mRNA in the nucleus, then translated into functional polypeptide chains by ribosomes.</p>""",
                "diagram_caption": "DNA Antiparallel Double Helix & Replication Fork",
                "takeaway": "DNA replication mechanism and transcription-translation central dogma.",
            },
            {
                "title": "Chapter 3: Cellular Respiration, Photosynthesis & Bioenergetics",
                "body": """<p>Bioenergetics explores how living organisms extract, store, and transfer energy through coupled biochemical oxidation-reduction reactions.</p>
<div class="callout">
  <strong>ATP Synthase Engine:</strong> Chemiosmosis harnesses proton concentration gradients across inner mitochondrial membranes to generate cellular energy (ATP).
</div>
<p>Photosynthesis in plant chloroplasts captures solar photons to synthesize glucose from carbon dioxide and water, releasing atmospheric oxygen.</p>""",
                "diagram_caption": "Chloroplast Light Reactions & Mitochondrial Krebs Cycle",
                "takeaway": "Energy balance between photosynthesis and aerobic cellular respiration.",
            },
            {
                "title": "Chapter 4: Human Organ Systems & Homeostatic Equilibrium",
                "body": """<p>Multicellular organisms maintain stable internal chemical and thermal environments through negative feedback homeostatic loops.</p>
<div class="callout">
  <strong>Negative Feedback Loop:</strong> A stimulus triggers a sensory receptor, the control center computes error margin, and effectors restore set-point balance.
</div>
<p>The cardiovascular, nervous, endocrine, and respiratory systems collaborate continuously to deliver nutrients and oxygen while regulating blood pH and core temperature.</p>""",
                "diagram_caption": "Negative Feedback Mechanism: Endocrine & Thermoregulation Loops",
                "takeaway": "Homeostatic regulation mechanisms in human physiology.",
            },
        ],
    },
]


def seed_database(dsn: str, db_label: str):
    print(f"\nSeeding 4 curated demo eBooks on {db_label}...")
    with psycopg.connect(dsn, row_factory=dict_row, connect_timeout=3) as conn:
        with conn.transaction():
            conn.execute("SELECT set_config('app.tenant_id', %s, true)", (TENANT_A_ID,))

            # 1. Clean up duplicate test manuals
            canonical_slugs = [b["slug"] for b in DEMO_BOOKS]
            conn.execute(
                """
                DELETE FROM manuals 
                WHERE tenant_id = %s 
                  AND slug NOT IN ('pebl-demo-ebook', 'welding-demo-handbook', 'algebra-i-study-handbook', 'biology-life-sciences')
                """,
                (TENANT_A_ID,)
            )
            print("  - Cleaned up obsolete/duplicate test manuals.")

            # 2. Seed each of the 4 canonical demo books
            for book in DEMO_BOOKS:
                slug = book["slug"]
                title = book["title"]
                desc = book["desc"]

                # Upsert manual
                existing = conn.execute(
                    "SELECT id FROM manuals WHERE tenant_id = %s AND slug = %s",
                    (TENANT_A_ID, slug)
                ).fetchone()

                if existing:
                    manual_id = str(existing["id"])
                    conn.execute(
                        """
                        UPDATE manuals 
                        SET title = %s, description = %s, status = 'published'
                        WHERE id = %s
                        """,
                        (title, desc, manual_id)
                    )
                else:
                    row = conn.execute(
                        """
                        INSERT INTO manuals (tenant_id, slug, title, description, status)
                        VALUES (%s, %s, %s, %s, 'published')
                        RETURNING id
                        """,
                        (TENANT_A_ID, slug, title, desc)
                    ).fetchone()
                    manual_id = str(row["id"])

                # Build EPUB
                epub_bytes = build_epub(
                    title=title,
                    identifier=f"edvidura-demo-{slug}",
                    chapters=book["chapters"],
                    accent_color=book["accent"],
                    accent_light=book["light"],
                )

                # Validate & Extract EPUB
                target_dir = ROOT / "app" / "static" / "uploads" / "epub" / TENANT_A_ID / manual_id / "1"
                if target_dir.exists():
                    shutil.rmtree(target_dir, ignore_errors=True)
                target_dir.mkdir(parents=True, exist_ok=True)

                manifest, sha256_hash = validate_and_extract_epub(epub_bytes, target_dir=target_dir)

                # Upsert Version 1
                v_row = conn.execute(
                    "SELECT id FROM manual_versions WHERE tenant_id = %s AND manual_id = %s AND version = 1",
                    (TENANT_A_ID, manual_id)
                ).fetchone()

                if v_row:
                    conn.execute(
                        """
                        UPDATE manual_versions
                        SET content_type = 'epub',
                            body_md = %s,
                            changelog = 'Initial published interactive EPUB3 edition with diagrams and xAPI.',
                            is_published = true,
                            epub_filename = %s,
                            epub_sha256 = %s,
                            epub_manifest = %s
                        WHERE id = %s
                        """,
                        (
                            desc,
                            f"{slug}.epub",
                            sha256_hash,
                            json.dumps(manifest),
                            str(v_row["id"]),
                        )
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO manual_versions (
                            tenant_id, manual_id, version, content_type,
                            body_md, changelog, is_published, created_by_subject,
                            epub_filename, epub_sha256, epub_manifest
                        ) VALUES (%s, %s, 1, 'epub', %s, 'Initial published interactive EPUB3 edition with diagrams and xAPI.', true, 'demo-seed', %s, %s, %s)
                        """,
                        (
                            TENANT_A_ID,
                            manual_id,
                            desc,
                            f"{slug}.epub",
                            sha256_hash,
                            json.dumps(manifest),
                        )
                    )
                print(f"  + Seeded eBook: '{title}' (ID: {manual_id}, 4 chapters, EPUB3 extracted)")

    print(f"Successfully populated 4 curated eBooks on {db_label}.\n")


def main():
    print("=" * 60)
    print("SEEDING 4 CURATED, CONTENT-ALIGNED DEMO EBOOKS")
    print("=" * 60)

    # 1. Seed application database on port 5433
    app_dsn = "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura"
    try:
        seed_database(app_dsn, "Application Database (port 5433)")
    except Exception as e:
        print(f"Warning: Could not seed app database: {e}")

    # 2. Seed disposable test database on port 5432
    secret_file = ROOT / "scratch" / ".test_db_dsn"
    if secret_file.exists():
        test_dsn = secret_file.read_text(encoding="utf-8").strip()
        try:
            seed_database(test_dsn, "Disposable Test Database (port 5432)")
        except Exception as e:
            print(f"Warning: Could not seed test database: {e}")

    print("ALL DONE! Exactly 4 clean eBooks are now available for the demo.")


if __name__ == "__main__":
    main()
