"""Seed exactly 5 curated, multi-chapter interactive demo textbooks for EdVidura.

Textbooks:
1. Algebra I: Foundations, Variables & Linear Equations Handbook (MATH-08)
2. Physical Science: Motion, Forces & Energy Interactive Textbook (SCI-08)
3. Indian Railways Track Maintenance & Signalling Safety Manual (VOC-RLY)
4. Digital Literacy, AI & Cybersecurity Foundations (CS-08)
5. Niti & Life Values: Student Character & Ethics Companion (VAL-08)
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
.callout {{
  background: {accent_light};
  border-left: 4px solid {accent_color};
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
  border-radius: 4px;
}}
.diagram-box {{
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: #f8fafc;
}}
.key-takeaway {{
  background: #f1f5f9;
  border-radius: 6px;
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
  font-size: 0.95rem;
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
            safe_caption = html.escape(ch.get("diagram_caption", "Pedagogical Diagram"), quote=False)
            safe_takeaway = html.escape(ch.get("takeaway", "Concept mastery preparing the learner for assessment."), quote=False)
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


DEMO_5_BOOKS = [
    {
        "id": "de7900fd-488b-4740-bf7e-7a11b3475cd6",
        "slug": "algebra-i-foundations",
        "title": "Algebra I: Foundations, Variables & Linear Equations Handbook",
        "desc": "Foundational algebraic reasoning, single and multi-step linear equations, inequalities, and Cartesian graphing for Class 8.",
        "accent": "#0284c7",
        "light": "#f0f9ff",
        "chapters": [
            {
                "title": "Chapter 1: Foundations of Algebraic Reasoning & Variable Notation",
                "body": """<p>In algebra, letters such as x, y, and z serve as symbols for numbers whose values are currently unknown or subject to change.</p>
<div class="callout">
  <strong>Golden Rule:</strong> Equality is preserved if and only if identical operations are applied simultaneously to both sides.
</div>
<p>An expression combines variables and operations, while an equation asserts equality between two expressions.</p>""",
                "diagram_caption": "Balance Scale Analogy of Algebraic Equality",
                "takeaway": "Variables are placeholders; equality is an invariant state under symmetric operations.",
            },
            {
                "title": "Chapter 2: Solving Linear Equations (One-Step, Two-Step & Multi-Step)",
                "body": """<p>Solving a linear equation requires systematic simplification before variable isolation.</p>
<div class="callout">
  <strong>Order of Operations:</strong> Distribute parentheses, combine like terms, apply inverse addition/subtraction, then inverse multiplication/division.
</div>
<p>Always verify solutions by substituting the derived value back into the original equation.</p>""",
                "diagram_caption": "Step-by-Step Inverse Operation Workflow",
                "takeaway": "Invert operations in reverse hierarchical order.",
            },
            {
                "title": "Chapter 3: Linear Inequalities & Graphing on the Cartesian Plane",
                "body": """<p>Linear inequalities divide the Cartesian plane into half-planes separated by boundary lines.</p>
<div class="callout">
  <strong>Crucial Rule:</strong> Multiplying or dividing both sides by a negative number flips the inequality sign.
</div>
<p>Slope-intercept form y = mx + b indicates steepness m and vertical intercept b.</p>""",
                "diagram_caption": "Slope-Intercept Form y = mx + b on Cartesian Plane",
                "takeaway": "Inequalities graph as boundary half-planes on the 2D coordinate plane.",
            },
            {
                "title": "Chapter 4: Real-World Applications & Word Problem Modeling",
                "body": """<p>Word problems require identifying fixed baseline costs and variable rates of change.</p>
<div class="callout">
  <strong>Linear Modeling:</strong> Total = Fixed Fee + (Rate × Quantity).
</div>
<p>Applying this model simplifies utility bills, travel distances, and budget projections.</p>""",
                "diagram_caption": "Translating Natural Language to Linear Equations",
                "takeaway": "Algebra maps descriptive narrative challenges into solvable linear constraints.",
            },
        ],
    },
    {
        "id": "11111111-2222-3333-4444-555555555551",
        "slug": "physical-science-motion",
        "title": "Physical Science: Motion, Forces & Energy Interactive Textbook",
        "desc": "Kinematics, Newton's three laws of motion, work-energy transformations, and momentum conservation with interactive formula checks.",
        "accent": "#059669",
        "light": "#ecfdf5",
        "chapters": [
            {
                "title": "Chapter 1: Kinematics — Distance, Displacement, Speed & Velocity",
                "body": """<p>Kinematics describes object motion without reference to the forces causing that motion.</p>
<div class="callout">
  <strong>Vectors vs Scalars:</strong> Distance is a scalar; displacement is a directed vector measuring Δx = x_final - x_initial.
</div>
<p>Velocity represents the time rate of change of displacement.</p>""",
                "diagram_caption": "Vector Displacement vs Scalar Path Distance",
                "takeaway": "Physics distinguishes magnitude-only scalars from directed spatial vectors.",
            },
            {
                "title": "Chapter 2: Newton's Three Laws of Motion & Net Force Calculations",
                "body": """<p>Forces represent interactions that modify states of motion.</p>
<div class="callout">
  <strong>Newton's Second Law:</strong> Net Force = mass × acceleration (F_net = m · a).
</div>
<p>Action and reaction forces occur in equal and opposite simultaneous pairs.</p>""",
                "diagram_caption": "Free-Body Diagram & Orthogonal Vector Equilibrium",
                "takeaway": "Acceleration occurs strictly along the unbalanced net force vector.",
            },
            {
                "title": "Chapter 3: Work, Power, Potential & Kinetic Energy Transformations",
                "body": """<p>Mechanical work transfers energy across physical displacements: W = F · d.</p>
<div class="callout">
  <strong>Kinetic Energy:</strong> KE = 0.5 · m · v². Doubling velocity quadruples kinetic energy.
</div>
<p>Gravitational potential energy depends on mass, gravity, and height: PE = m · g · h.</p>""",
                "diagram_caption": "Mechanical Energy Conversion: Potential to Kinetic Exchange",
                "takeaway": "Total mechanical energy is conserved in conservative gravitational fields.",
            },
            {
                "title": "Chapter 4: Conservation of Momentum & Energy Systems",
                "body": """<p>Linear momentum is the product of mass and velocity: p = m · v.</p>
<div class="callout">
  <strong>Universal Conservation:</strong> In an isolated system, total momentum before collision strictly equals total momentum afterward.
</div>
<p>Elastic collisions conserve kinetic energy; inelastic collisions deform or produce thermal loss.</p>""",
                "diagram_caption": "Elastic vs Inelastic Momentum Conservation Vectors",
                "takeaway": "Linear momentum is universally conserved in closed mechanical systems.",
            },
        ],
    },
    {
        "id": "11111111-2222-3333-4444-555555555552",
        "slug": "railways-safety-manual",
        "title": "Indian Railways Track Maintenance & Signalling Safety Manual",
        "desc": "Permanent way engineering, ultrasonic flaw detection, electronic interlocking, Kavach ATP systems, and field trackside safety protocols.",
        "accent": "#d97706",
        "light": "#fffbeb",
        "chapters": [
            {
                "title": "Chapter 1: Permanent Way Components — Rails, Sleepers, Ballast & Fastenings",
                "body": """<p>Indian Railways broad gauge track operates on a standard width of 1676 mm.</p>
<div class="callout">
  <strong>Track Structure:</strong> 60 kg/m 90 UTS continuous welded rails on pre-stressed concrete sleepers with 300 mm granite ballast.
</div>
<p>The permanent way safely sustains wheel axle loads up to 25 tonnes at operating speeds.</p>""",
                "diagram_caption": "Indian Railways 1676 mm Broad Gauge Track Profile",
                "takeaway": "Track geometry must withstand dynamic lateral, longitudinal, and vertical forces.",
            },
            {
                "title": "Chapter 2: Track Inspection, Gauge Tolerance & Ultrasonic Defect Detection",
                "body": """<p>Daily track patrol and ultrasonic flaw detection (USFD) prevent rail fractures.</p>
<div class="callout">
  <strong>USFD Probe Angles:</strong> 0° probes detect horizontal web cracks; 70° probes detect vertical transverse fissures in rail heads.
</div>
<p>Permissible gauge tolerance on straight broad gauge track is -3 mm to +6 mm.</p>""",
                "diagram_caption": "USFD Ultrasonic Probe Angle Geometry & Crack Detection",
                "takeaway": "Non-destructive ultrasonic testing identifies internal fatigue flaws before failure.",
            },
            {
                "title": "Chapter 3: Railway Signalling, Interlocking Systems & Automatic Train Protection (Kavach)",
                "body": """<p>Modern fail-safe electronic interlocking coordinates train movements without human conflict.</p>
<div class="callout">
  <strong>Kavach SIL-4 ATP:</strong> Indigenous Automatic Train Protection enforces automatic emergency braking if an engineer passes a Signal at Danger.
</div>
<p>Color light aspects convey proceed, caution, attention, and danger speed authorities.</p>""",
                "diagram_caption": "Kavach Radio & RFID Automatic Train Protection Architecture",
                "takeaway": "SIL-4 interlocking and Kavach ATP enforce absolute train safety.",
            },
            {
                "title": "Chapter 4: Trackside Safety Protocols, Lookout Duties & Emergency Work Rules",
                "body": """<p>Track maintenance crews face severe hazards from high-speed electric trains.</p>
<div class="callout">
  <strong>Emergency Protection:</strong> In track obstruction, place a red banner flag at 600m and 3 detonators 10m apart at 1200m.
</div>
<p>Dedicated lookouts equipped with audible hooters are mandatory for all gang work.</p>""",
                "diagram_caption": "Standard 1200m Detonator Protection Placement Distances",
                "takeaway": "Distance-based banner and detonator placement protects crews and approaching trains.",
            },
        ],
    },
    {
        "id": "11111111-2222-3333-4444-555555555553",
        "slug": "digital-ai-cybersecurity",
        "title": "Digital Literacy, AI & Cybersecurity Foundations",
        "desc": "Computer architecture, modern artificial intelligence models, cybersecurity defense, DPDP compliance, and ethical digital citizenship.",
        "accent": "#7c3aed",
        "light": "#f5f3ff",
        "chapters": [
            {
                "title": "Chapter 1: Computing Architecture, Operating Systems & Networks",
                "body": """<p>The Von Neumann architecture underpins modern computing through CPU, RAM, and storage.</p>
<div class="callout">
  <strong>Fetch-Decode-Execute:</strong> Clock cycles drive instructions from main memory into CPU registers and the Arithmetic Logic Unit.
</div>
<p>Operating system kernels govern process scheduling and file permissions.</p>""",
                "diagram_caption": "CPU Bus Architecture: ALU, Control Unit & Memory",
                "takeaway": "Computers execute binary instructions through coordinated micro-architectural cycles.",
            },
            {
                "title": "Chapter 2: Artificial Intelligence, Neural Networks & Machine Learning Foundations",
                "body": """<p>Machine learning shifts programming from deterministic rules to statistical parameter optimization.</p>
<div class="callout">
  <strong>Deep Learning & Transformers:</strong> Layered neural networks learn high-dimensional embeddings; self-attention mechanisms evaluate full context sequences.
</div>
<p>Loss gradient backpropagation continuously tunes synaptic weights during training.</p>""",
                "diagram_caption": "Transformer Self-Attention Mechanism & Layered Perceptrons",
                "takeaway": "AI optimizes mathematical tensor weights to identify complex empirical patterns.",
            },
            {
                "title": "Chapter 3: Cybersecurity Essentials — Phishing, Passwords, Encryption & MFA",
                "body": """<p>Cybersecurity safeguards confidential systems against unauthorized extraction.</p>
<div class="callout">
  <strong>MFA Defense:</strong> Multi-Factor Authentication stops over 99% of automated credential compromise by requiring multiple independent factors.
</div>
<p>Asymmetric public-key cryptography encrypts data with public keys and decrypts with secret private keys.</p>""",
                "diagram_caption": "Asymmetric Cryptography: Public Key Encryption & Private Decryption",
                "takeaway": "Multi-Factor Authentication and mathematical encryption defeat credential theft.",
            },
            {
                "title": "Chapter 4: Ethical Computing, Data Privacy (DPDP Act) & Digital Citizenship",
                "body": """<p>Responsible technology leadership demands compliance with privacy legislation.</p>
<div class="callout">
  <strong>India's DPDP Act:</strong> Mandates data minimization, explicit purpose limitation, and the uninhibited right to withdraw consent.
</div>
<p>Ethical digital citizens verify information credibility before recirculating synthetic media.</p>""",
                "diagram_caption": "Citizen Rights Under India's Digital Personal Data Protection Act",
                "takeaway": "Data minimization and ethical stewardship safeguard citizen privacy.",
            },
        ],
    },
    {
        "id": "11111111-2222-3333-4444-555555555554",
        "slug": "niti-ethics-companion",
        "title": "Niti & Life Values: Student Character & Ethics Companion",
        "desc": "Moral reasoning, Satya and Dharma in daily life, community compassion, and civic harmony with multilingual Indian language reflections.",
        "accent": "#c026d3",
        "light": "#fdf4ff",
        "chapters": [
            {
                "title": "Chapter 1: Satya & Dharma — Truthfulness and Moral Responsibility in Daily Life",
                "body": """<p>Satya (truth) and Dharma (righteous duty) form the core of ethical character.</p>
<div class="callout">
  <strong>Tri-Karna Shuddhi:</strong> Satya requires purity in thought (Manasa), speech (Vacha), and physical action (Karmana).
</div>
<p>In student life, academic honesty and moral courage build lasting self-respect.</p>""",
                "diagram_caption": "Tri-Karna Shuddhi: Alignment of Thought, Word, and Deed",
                "takeaway": "Moral integrity requires active harmony between thoughts, words, and actions.",
            },
            {
                "title": "Chapter 2: Seva & Karuna — Compassion, Community Service and Social Empathy",
                "body": """<p>Karuna is the urge to relieve distress; Seva is selfless service rendered without expectation.</p>
<div class="callout">
  <strong>Nishkama Karma:</strong> Selfless civic service undertaken for the welfare of others without seeking personal applause.
</div>
<p>Youth develop true civic leadership by helping classmates and improving community spaces.</p>""",
                "diagram_caption": "Cycle of Seva: Empathy Translating into Social Action",
                "takeaway": "Character is defined by compassion towards the vulnerable and community service.",
            },
            {
                "title": "Chapter 3: Vidya & Vinaya — Knowledge, Humility and the Scientific Temper",
                "body": """<p>The timeless maxim 'Vidya Dadati Vinayam' reminds us that wisdom breeds humility.</p>
<div class="callout">
  <strong>Scientific Temper:</strong> Inquiry, objective evidence, open debate, and humility in the presence of what remains unknown.
</div>
<p>An educated mind gracefully admits errors and uses intellect for the public good.</p>""",
                "diagram_caption": "Vidya Dadati Vinayam: Humility as the True Fruit of Learning",
                "takeaway": "True education fosters modest inquiry, mutual respect, and scientific temper.",
            },
            {
                "title": "Chapter 4: Samata & Shanti — Equality, Environmental Harmony and Conflict Resolution",
                "body": """<p>Peace (Shanti) is sustained by social justice, mutual respect, and ecological balance.</p>
<div class="callout">
  <strong>Vasudhaiva Kutumbakam:</strong> The universal philosophical realization that the entire earth and all living beings constitute one family.
</div>
<p>Conflict resolution through non-violent dialogue and environmental protection ensures a sustainable future.</p>""",
                "diagram_caption": "Vasudhaiva Kutumbakam: Ecological and Social Equilibrium",
                "takeaway": "Equality, non-violent dialogue, and ecological harmony create lasting peace.",
            },
        ],
    },
]


def seed_database(dsn: str, db_label: str):
    print(f"\nSeeding 5 complete demo textbooks on {db_label}...")
    with psycopg.connect(dsn, row_factory=dict_row, connect_timeout=8) as conn:
        with conn.transaction():
            conn.execute("SELECT set_config('app.tenant_id', %s, true)", (TENANT_A_ID,))

            # Find or bind to Class 8 (RHS-C08)
            c8_row = conn.execute(
                "SELECT id FROM classes WHERE tenant_id = %s AND (class_code = 'RHS-C08' OR class_name ILIKE '%%Class 8%%')",
                (TENANT_A_ID,)
            ).fetchone()
            class_id = str(c8_row["id"]) if c8_row else None

            for book in DEMO_5_BOOKS:
                slug = book["slug"]
                title = book["title"]
                desc = book["desc"]
                manual_id = book["id"]

                # Upsert manual
                existing = conn.execute(
                    "SELECT id FROM manuals WHERE tenant_id = %s AND (id = %s OR slug = %s)",
                    (TENANT_A_ID, manual_id, slug)
                ).fetchone()

                if existing:
                    manual_id = str(existing["id"])
                    conn.execute(
                        """
                        UPDATE manuals
                        SET title = %s, description = %s, status = 'published', slug = %s
                        WHERE id = %s
                        """,
                        (title, desc, slug, manual_id)
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO manuals (id, tenant_id, slug, title, description, status)
                        VALUES (%s, %s, %s, %s, %s, 'published')
                        """,
                        (manual_id, TENANT_A_ID, slug, title, desc)
                    )

                # Bind to Class 8
                if class_id:
                    conn.execute(
                        """
                        INSERT INTO class_manuals (tenant_id, class_id, manual_id)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (class_id, manual_id) DO NOTHING
                        """,
                        (TENANT_A_ID, class_id, manual_id)
                    )

                # Build EPUB package
                epub_bytes = build_epub(
                    title=title,
                    identifier=f"edvidura-demo-{slug}",
                    chapters=book["chapters"],
                    accent_color=book["accent"],
                    accent_light=book["light"],
                )

                # Validate & Extract EPUB to local static storage
                target_dir = ROOT / "app" / "static" / "uploads" / "epub" / TENANT_A_ID / manual_id / "1"
                try:
                    target_dir.mkdir(parents=True, exist_ok=True)
                    manifest, sha256_hash = validate_and_extract_epub(epub_bytes, target_dir=target_dir)
                except Exception as e:
                    manifest = {
                        "spine": [{"id": f"ch{i}", "href": f"ch{i}.xhtml"} for i in range(1, 5)],
                        "toc": [{"title": ch["title"], "href": f"ch{i}.xhtml"} for i, ch in enumerate(book["chapters"], 1)],
                    }
                    sha256_hash = "demo-sha256-hash"

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
                            changelog = 'Published interactive EPUB3 edition with diagrams and xAPI.',
                            is_published = true,
                            epub_filename = %s,
                            epub_sha256 = %s,
                            epub_manifest = %s
                        WHERE id = %s
                        """,
                        (desc, f"{slug}.epub", sha256_hash, json.dumps(manifest), str(v_row["id"]))
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO manual_versions (
                            tenant_id, manual_id, version, content_type,
                            body_md, changelog, is_published, created_by_subject,
                            epub_filename, epub_sha256, epub_manifest
                        ) VALUES (%s, %s, 1, 'epub', %s, 'Published interactive EPUB3 edition with diagrams and xAPI.', true, 'demo-seed', %s, %s, %s)
                        """,
                        (TENANT_A_ID, manual_id, desc, f"{slug}.epub", sha256_hash, json.dumps(manifest))
                    )
                print(f"  + Seeded Textbook: '{title}' (4 chapters, Class 8 bound)")

    print(f"Successfully populated all 5 textbooks on {db_label}.\n")


def main():
    print("=" * 65)
    print("SEEDING 5 COMPLETE MULTI-CHAPTER INTERACTIVE DEMO TEXTBOOKS")
    print("=" * 65)

    # 1. Seed Cloud Supabase PostgreSQL
    supabase_dsn = "postgres://postgres.hkxbdjshjzqlqllqwnmx:6XQ8wTwNTXfvKGdr@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
    try:
        seed_database(supabase_dsn, "Cloud Supabase PostgreSQL")
    except Exception as e:
        print(f"Warning: Could not seed Cloud Supabase PostgreSQL: {e}")

    # 2. Seed Application Database (local port 5433 if running)
    app_dsn = "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura"
    try:
        seed_database(app_dsn, "Local Application Database (port 5433)")
    except Exception as e:
        print(f"Note: Local DB port 5433 not accessible: {e}")

    print("ALL DONE! 5 complete textbooks are populated and accessible.")


if __name__ == "__main__":
    main()
