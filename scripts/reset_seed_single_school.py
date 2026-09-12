"""Wipe all app data and seed ONE demo school (fresh).

Includes: 1 school admin, teachers, students, classes/subjects,
courses/lessons, quizzes, grades (attempts), LTI platform for local Moodle.

  python scripts/reset_seed_single_school.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Preserve explicitly provided process env (e.g. Railway tunnel / Moodle LTI)
# over .env defaults so presentation seeds do not silently fall back to localhost.
_PRESERVE_ENV = {
    k: os.environ[k]
    for k in (
        "DATABASE_URL",
        "DATABASE_OWNER_URL",
        "MOODLE_ISSUER",
        "MOODLE_CLIENT_ID",
        "MOODLE_DEPLOYMENT_IDS",
        "MOODLE_AUTH_LOGIN_URL",
        "MOODLE_AUTH_TOKEN_URL",
        "MOODLE_KEY_SET_URL",
        "SEED_MOODLE_CLASS_CONTEXTS",
        "SEED_MOODLE_CONTEXT_ID",
        "APP_BASE_URL",
    )
    if os.environ.get(k)
}
from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)
os.environ.update(_PRESERVE_ENV)

from app import db  # noqa: E402
from app.tenancy import TENANT_A_ID, TENANT_B_ID  # noqa: E402

TENANT_ID = TENANT_A_ID  # aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
INST_ID = "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
COURSE_MATH = "cccccccc-cccc-cccc-cccc-cccccccccccc"
COURSE_SCI = "dddddddd-dddd-dddd-dddd-dddddddddddd"
COURSE_ENG = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
# Isolation peer (Tenant B) — distinct from Riverside English course id
COURSE_B = "ffffffff-ffff-ffff-ffff-ffffffffffff"
QUIZ_MATH = "aa11aa11-aa11-aa11-aa11-aa11aa11aa11"
QUIZ_SCI = "bb22bb22-bb22-bb22-bb22-bb22bb22bb22"

TRUNCATE_SQL = """
TRUNCATE TABLE
    quiz_attempts,
    lesson_progress,
    quiz_questions,
    quizzes,
    lessons,
    courses,
    skill_remediation,
    skill_items,
    role_skill_requirements,
    role_profiles,
    to_skill_proposals,
    skill_external_ids,
    skill_framework_imports,
    skills,
    sme_sources,
    learner_plans,
    lti_context_rosters,
    lti_context_bindings,
    class_enrollments,
    class_teachers,
    classes,
    teachers,
    school_admins,
    students,
    institutions,
    manuals,
    manual_versions,
    xapi_statements,
    event_outbox,
    support_incidents,
    launch_events,
    lti_launch_snapshots,
    quiz_session_tokens,
    lti_registration_invites,
    lti_platforms,
    tenants
RESTART IDENTITY CASCADE;
"""

# Fixed UUIDs: Class 8 keeps the historic Algebra course id (LTI demo bind).
COURSE_BY_GRADE: dict[int, str] = {
    g: f"ccccccc{g:01d}-cccc-cccc-cccc-cccccccccccc" if g != 8 else COURSE_MATH
    for g in range(1, 11)
}
# Fix invalid UUID for g=10
COURSE_BY_GRADE[10] = "cccccc10-cccc-cccc-cccc-cccccccccccc"
COURSE_BY_GRADE[8] = COURSE_MATH

# Lead names aligned with Moodle seed (riverside_cNN_t / riverside_priya).
# Emails use cN.teacher@… so school-admin matching can align with Moodle.
TEACHER_NAMES = [
    ("Priya Sharma", "c1.teacher"),
    ("James Cole", "c2.teacher"),
    ("Ana Ruiz", "c3.teacher"),
    ("Omar Haddad", "c4.teacher"),
    ("Helen Park", "c5.teacher"),
    ("Mei Chen", "c6.teacher"),
    ("Sam Okonkwo", "c7.teacher"),
    ("Priya Sharma", "c8.teacher"),  # Class 8 hero teacher (Moodle riverside_priya)
    ("Tom Brooks", "c9.teacher"),
    ("Nina Rossi", "c10.teacher"),
]

# Students per class in EdVidura directory (Moodle seed uses 22).
STUDENTS_PER_CLASS = 22

STUDENT_FIRST = [
    "Alice", "Bob", "Carol", "Diego", "Emma", "Farah", "Gabe", "Hana",
    "Ian", "Jade", "Kai", "Lina", "Maya", "Noah", "Olivia", "Pavel",
    "Quinn", "Rosa", "Samir", "Talia", "Uma", "Victor", "Willa", "Xander",
    "Yara", "Zane", "Asha", "Ben", "Cora", "Dev", "Elena", "Finn",
    "Gita", "Hugo", "Ivy", "Jon", "Kira", "Leo", "Mira", "Ned",
    "Ora", "Pix", "Ravi", "Sia", "Ted", "Una", "Val", "Wes", "Xin", "Zoe",
]
STUDENT_LAST = [
    "Nguyen", "Okonkwo", "Patel", "Santos", "Brooks", "Ali", "Ortiz", "Lee",
    "Kim", "Mensah", "Rossi", "Chen", "Park", "Hassan", "Rivera", "Shaw",
    "Diaz", "Khan", "Murphy", "Singh", "Costa", "Berg", "Nair", "Frost",
    "Walsh", "Gupta",
]

GRADE_SUBJECTS = {
    1: ("English & Numbers", "Letters, numbers, and classroom routines."),
    2: ("Reading & Maths", "Early reading and place value."),
    3: ("Language & Maths", "Paragraphs and multiplication."),
    4: ("Science & Maths", "Living things and fractions."),
    5: ("General Studies", "Earth science and decimals."),
    6: ("Middle School Core", "Ratios, cells, and essays."),
    7: ("Pre-Algebra Path", "Integers, equations warm-up."),
    8: ("Algebra I", "Variables, expressions, and solving for x."),
    9: ("Geometry Path", "Shapes, proofs intro, and measurement."),
    10: ("Advanced Maths", "Functions, graphs, and exam prep."),
}

# Moodle course context ids (contextlevel=50) for class01…class10 + Demo → Class 8.
# Also bind Moodle course ids + shortnames (platforms may send any of these).
# Override with SEED_MOODLE_CLASS_CONTEXTS=113:1,114:2,... if Moodle rebuilds.
DEFAULT_MOODLE_CLASS_CONTEXTS = {
    "54": 8,  # Demo context
    "5": 8,  # Demo course id / legacy
    "Demo": 8,
    "113": 1,
    "114": 2,
    "115": 3,
    "116": 4,
    "117": 5,
    "118": 6,
    "119": 7,
    "120": 8,
    "121": 9,
    "122": 10,
    # Moodle course ids for class01…class10
    "6": 1,
    "7": 2,
    "8": 3,
    "9": 4,
    "10": 5,
    "11": 6,
    "12": 7,
    "13": 8,
    "14": 9,
    "15": 10,
    # shortnames
    "class01": 1,
    "class02": 2,
    "class03": 3,
    "class04": 4,
    "class05": 5,
    "class06": 6,
    "class07": 7,
    "class08": 8,
    "class09": 9,
    "class10": 10,
}


def _quiz_id_for_grade(grade: int) -> str:
    if grade == 8:
        return QUIZ_MATH
    if grade == 5:
        return QUIZ_SCI
    return f"aa11aa11-aa11-aa11-aa11-aa11aa11aa{grade:02d}"


def curriculum_for_grade(grade: int) -> dict:
    """Return grade-specific lessons + quiz (dynamic content per Class 1–10)."""
    title, desc = GRADE_SUBJECTS[grade]
    quiz_id = _quiz_id_for_grade(grade)
    # Each grade: 3 article/video lessons + 1 check quiz with distinct questions.
    packs: dict[int, tuple[list, list]] = {
        1: (
            [
                ("c01-letters", "Letter sounds", 1, "article",
                 "## Letter sounds\n\nSay the sound for A, B, and C. Trace each letter.", ""),
                ("c01-count", "Count to 20", 2, "article",
                 "## Counting\n\nCount objects in the room. Write numbers 1–20.", ""),
                ("c01-video", "Morning circle (video)", 3, "video",
                 "Practice greetings and counting aloud.",
                 "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ("c01-quiz", "Class 1 check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "Which comes after 7?", ["5", "8", "9", "10"], 1),
                ("q2", "The letter after B is…", ["A", "C", "D", "E"], 1),
                ("q3", "How many sides does a triangle have?", ["2", "3", "4", "5"], 1),
            ],
        ),
        2: (
            [
                ("c02-read", "Short stories", 1, "article",
                 "## Reading\n\nRead a short story. Find the main character.", ""),
                ("c02-place", "Place value (tens)", 2, "article",
                 "## Place value\n\n42 = 4 tens and 2 ones.", ""),
                ("c02-video", "Phonics practice (video)", 3, "video",
                 "Blend sounds into words.",
                 "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ("c02-quiz", "Class 2 check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "In 35, the 3 means…", ["3 ones", "3 tens", "3 hundreds", "30 tens"], 1),
                ("q2", "A story’s main character is…", ["The setting", "Who the story is about", "The page number", "The author only"], 1),
                ("q3", "10 + 7 = ?", ["15", "16", "17", "18"], 2),
            ],
        ),
        3: (
            [
                ("c03-para", "Building a paragraph", 1, "article",
                 "## Paragraphs\n\nTopic sentence → details → closing sentence.", ""),
                ("c03-mult", "Times tables (2–5)", 2, "article",
                 "## Multiplication\n\n3 × 4 means three groups of four.", ""),
                ("c03-video", "Multiplication tips (video)", 3, "video",
                 "Skip-count to multiply.",
                 "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ("c03-quiz", "Class 3 check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "4 × 5 = ?", ["9", "20", "25", "45"], 1),
                ("q2", "A paragraph usually starts with a…", ["Joke", "Topic sentence", "Quiz", "Picture only"], 1),
                ("q3", "6 × 2 = ?", ["8", "10", "12", "16"], 2),
            ],
        ),
        4: (
            [
                ("c04-life", "Living vs non-living", 1, "article",
                 "## Living things\n\nLiving things grow, need food/water, and reproduce.", ""),
                ("c04-frac", "Fractions of a whole", 2, "article",
                 "## Fractions\n\n1/2 means one of two equal parts.", ""),
                ("c04-video", "Habitats (video)", 3, "video",
                 "Where animals live and why.",
                 "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ("c04-quiz", "Class 4 check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "A rock is…", ["Living", "Non-living", "A plant", "An animal"], 1),
                ("q2", "1/4 of 8 is…", ["1", "2", "4", "8"], 1),
                ("q3", "Plants make food using…", ["Sleep", "Sunlight", "Rocks only", "Metal"], 1),
            ],
        ),
        5: (
            [
                ("s1-method", "The scientific method", 1, "article",
                 "## Method\n\nAsk → hypothesize → test → conclude.", ""),
                ("s2-matter", "States of matter", 2, "article",
                 "## Matter\n\nSolid, liquid, gas — and how heat changes them.", ""),
                ("s3-decimals", "Decimals & place value", 3, "article",
                 "## Decimals\n\n0.5 is five tenths; 0.05 is five hundredths.", ""),
                ("s4-quiz", "Science & decimals check", 4, "quiz", "Quick check.", ""),
            ],
            [
                ("sq1", "First step of the scientific method?",
                 ["Guess", "Ask a question", "Publish", "Skip testing"], 1),
                ("sq2", "Water boiling is mostly which change?",
                 ["Chemical", "Physical", "Nuclear", "None"], 1),
                ("sq3", "0.7 means…", ["7 ones", "7 tenths", "7 hundredths", "70"], 1),
            ],
        ),
        6: (
            [
                ("c06-ratio", "Ratios in everyday life", 1, "article",
                 "## Ratios\n\nA ratio compares two quantities (e.g. 2:3).", ""),
                ("c06-cells", "Cells — building blocks", 2, "article",
                 "## Cells\n\nPlant and animal cells; nucleus and membrane.", ""),
                ("c06-essay", "Five-paragraph essay map", 3, "article",
                 "## Essays\n\nIntro, three body points, conclusion.", ""),
                ("c06-quiz", "Class 6 check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "A ratio 1:4 means…", ["1 plus 4", "1 compared to 4", "14", "4 minus 1"], 1),
                ("q2", "The control center of a cell is the…", ["Wall", "Nucleus", "Vacuole only", "Foot"], 1),
                ("q3", "An essay introduction should…", ["List grades", "State the main idea", "Skip the topic", "Only ask questions"], 1),
            ],
        ),
        7: (
            [
                ("c07-int", "Integers on the number line", 1, "article",
                 "## Integers\n\nPositive, negative, and zero.", ""),
                ("c07-eq", "One-step equations", 2, "article",
                 "## Equations\n\nx + 5 = 12 → subtract 5 → x = 7.", ""),
                ("c07-video", "Integer rules (video)", 3, "video",
                 "Adding and subtracting signed numbers.",
                 "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ("c07-quiz", "Pre-algebra check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "−3 + 5 = ?", ["−8", "2", "8", "−2"], 1),
                ("q2", "x − 4 = 10 → x = ?", ["6", "14", "40", "−6"], 1),
                ("q3", "Which is an integer?", ["1/2", "−7", "π", "√2"], 1),
            ],
        ),
        8: (
            [
                ("ch1-welcome", "Welcome to Algebra I", 1, "article",
                 "## Algebra I\n\nVariables, expressions, and solving for x.", ""),
                ("ch2-equations", "Linear equations", 2, "article",
                 "## Linear equations\n\nBalance both sides. Isolate the variable.", ""),
                ("ch3-video", "Solving for x (video)", 3, "video",
                 "Short overview video.",
                 "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ("ch4-quiz", "Algebra check quiz", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "What is x in 2x + 3 = 11?", ["3", "4", "5", "8"], 1),
                ("q2", "A variable stands for…",
                 ["A fixed number", "An unknown", "A formula", "A grade"], 1),
                ("q3", "2x = 10 → x = ?", ["2", "5", "8", "12"], 1),
            ],
        ),
        9: (
            [
                ("c09-shapes", "Polygons & properties", 1, "article",
                 "## Shapes\n\nTriangles, quadrilaterals, and angle sums.", ""),
                ("c09-proof", "Reasoning & simple proofs", 2, "article",
                 "## Proofs\n\nGiven → reasons → conclusion.", ""),
                ("c09-measure", "Area and perimeter", 3, "article",
                 "## Measurement\n\nRectangle area = length × width.", ""),
                ("c09-quiz", "Geometry check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "Sum of angles in a triangle?", ["90°", "180°", "270°", "360°"], 1),
                ("q2", "Perimeter of a 3×5 rectangle?", ["8", "15", "16", "30"], 2),
                ("q3", "A square is a…", ["Circle", "Quadrilateral", "Triangle", "Line"], 1),
            ],
        ),
        10: (
            [
                ("c10-fn", "Functions & notation", 1, "article",
                 "## Functions\n\nf(x) maps each input to one output.", ""),
                ("c10-graph", "Graphs of linear functions", 2, "article",
                 "## Graphs\n\ny = mx + b — slope and intercept.", ""),
                ("c10-exam", "Exam strategies", 3, "article",
                 "## Prep\n\nShow work, check units, estimate first.", ""),
                ("c10-quiz", "Advanced maths check", 4, "quiz", "Show what you know.", ""),
            ],
            [
                ("q1", "In y = 2x + 1, the slope is…", ["1", "2", "x", "y"], 1),
                ("q2", "f(3) for f(x)=x+4 is…", ["3", "4", "7", "12"], 2),
                ("q3", "A function gives each input…", ["Many outputs", "Exactly one output", "No output", "Only zero"], 1),
            ],
        ),
    }
    chapters, questions = packs[grade]
    return {
        "title": title,
        "desc": desc,
        "quiz_id": quiz_id,
        "chapters": chapters,
        "questions": questions,
    }


def _owner_dsn() -> str:
    """Prefer DATABASE_OWNER_URL; else DATABASE_URL (Railway owner is usually superuser)."""
    owner = os.getenv("DATABASE_OWNER_URL", "").strip()
    dsn = os.getenv("DATABASE_URL", "").strip()
    if owner:
        return owner
    if dsn:
        return dsn
    return "postgresql://edvidura:edvidura@127.0.0.1:5433/edvidura"


def _super_exec(sql: str) -> None:
    """Run as DB owner (bypasses RLS) for TRUNCATE / cross-tenant DDL."""
    import psycopg
    from psycopg.rows import dict_row

    with psycopg.connect(_owner_dsn(), row_factory=dict_row) as conn:
        conn.execute(sql)
        conn.commit()


def _exec_tenant(tenant_id: str, sql: str, params: tuple | list | None = None):
    with db.tenant_connection(tenant_id) as conn:
        return conn.execute(sql, params or ())


def _exec_owner(sql: str, params: tuple | list | None = None):
    with db.connect() as conn:
        with conn.transaction():
            return conn.execute(sql, params or ())


def reset() -> None:
    print("Wiping all tenants / school / LTI / attempts data...")
    _super_exec(TRUNCATE_SQL)
    print("  done.")


def seed() -> None:
    issuer = os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
    client_id = os.getenv("MOODLE_CLIENT_ID", "ib0qN8mQMZO2GKi").strip()
    deployments = [
        d.strip()
        for d in os.getenv("MOODLE_DEPLOYMENT_IDS", "1,5").split(",")
        if d.strip()
    ] or ["1", "5"]

    print("Seeding Riverside High (single school)...")
    _exec_owner(
        """
        INSERT INTO tenants (id, slug, name, status)
        VALUES (%s, 'riverside', 'Riverside High', 'active')
        """,
        (TENANT_ID,),
    )

    _exec_owner(
        """
        INSERT INTO institutions (
            id, tenant_id, institution_code, institution_name,
            issuer, client_id, deployment_ids, status
        )
        VALUES (%s, %s, 'riverside', 'Riverside High School', %s, %s, %s, 'active')
        """,
        (INST_ID, TENANT_ID, issuer, client_id, deployments),
    )

    # LTI platform so local Moodle launches resolve to this school
    db.upsert_platform(
        tenant_id=TENANT_ID,
        issuer=issuer,
        client_id=client_id,
        deployment_ids=deployments,
        auth_login_url=os.getenv(
            "MOODLE_AUTH_LOGIN_URL", f"{issuer}/mod/lti/auth.php"
        ),
        auth_token_url=os.getenv(
            "MOODLE_AUTH_TOKEN_URL", f"{issuer}/mod/lti/token.php"
        ),
        key_set_url=os.getenv(
            "MOODLE_KEY_SET_URL", f"{issuer}/mod/lti/certs.php"
        ),
    )
    print(f"  LTI platform  {issuer} / {client_id}")

    _exec_tenant(
        TENANT_ID,
        """
        INSERT INTO school_admins (
            tenant_id, institution_id, admin_code, name, email, status
        )
        VALUES (%s, %s, 'ADM-01', 'Alex Morgan', 'admin@riverside.test', 'active')
        """,
        (TENANT_ID, INST_ID),
    )
    print("  School admin  ADM-01  Alex Morgan")

    # --- Classes 1–10: one lead teacher + 5 students + one course each ---
    teacher_ids: dict[str, str] = {}
    for grade, (tname, temail_local) in enumerate(TEACHER_NAMES, start=1):
        code = f"TCH-{grade:02d}"
        email = f"{temail_local}@riverside.test"
        row = _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO teachers (tenant_id, teacher_code, name, email, status)
            VALUES (%s, %s, %s, %s, 'active')
            RETURNING id
            """,
            (TENANT_ID, code, tname, email),
        ).fetchone()
        teacher_ids[code] = str(row["id"])
        print(f"  Teacher       {code}  {tname}  (Class {grade})")

    student_ids: dict[str, str] = {}
    student_names: dict[str, str] = {}
    # Classic Class 8 demo users (Moodle riverside_alice / bob / carol)
    classic_emails = {
        (8, 1): ("Alice Nguyen", "alice.nguyen@riverside.test"),
        (8, 2): ("Bob Okonkwo", "bob.okonkwo@riverside.test"),
        (8, 3): ("Carol Patel", "carol.patel@riverside.test"),
    }
    idx = 0
    for grade in range(1, 11):
        for n in range(1, STUDENTS_PER_CLASS + 1):
            code = f"STU-C{grade:02d}-{n:02d}"
            if (grade, n) in classic_emails:
                name, email = classic_emails[(grade, n)]
            else:
                first = STUDENT_FIRST[idx % len(STUDENT_FIRST)]
                last = STUDENT_LAST[idx % len(STUDENT_LAST)]
                idx += 1
                name = f"{first} {last}"
                email = f"c{grade:02d}.s{n:02d}@riverside.test"
            row = _exec_owner(
                """
                INSERT INTO students (institution_id, student_code, name, email, status)
                VALUES (%s, %s, %s, %s, 'active')
                RETURNING id
                """,
                (INST_ID, code, name, email),
            ).fetchone()
            student_ids[code] = str(row["id"])
            student_names[code] = name
        print(f"  Students     Class {grade}: {STUDENTS_PER_CLASS} enrolled")

    classes: list[dict] = []
    class_ids: dict[str, str] = {}
    for grade in range(1, 11):
        subj, _desc = GRADE_SUBJECTS[grade]
        code = f"RHS-C{grade:02d}"
        name = f"Class {grade}"
        lead = f"TCH-{grade:02d}"
        roster = [
            f"STU-C{grade:02d}-{n:02d}" for n in range(1, STUDENTS_PER_CLASS + 1)
        ]
        course_id = COURSE_BY_GRADE[grade]
        classes.append(
            {
                "code": code,
                "name": name,
                "subject": subj,
                "term": "2026–27",
                "lead": lead,
                "assist": None,
                "roster": roster,
                "course_id": course_id,
                "grade": grade,
            }
        )

    for cls in classes:
        row = _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO classes (
                tenant_id, institution_id, class_code, class_name, subject, term,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            RETURNING id
            """,
            (
                TENANT_ID,
                INST_ID,
                cls["code"],
                cls["name"],
                cls["subject"],
                cls["term"],
            ),
        ).fetchone()
        cid = str(row["id"])
        class_ids[cls["code"]] = cid
        _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO class_teachers (tenant_id, class_id, teacher_id, role)
            VALUES (%s, %s, %s, 'lead')
            """,
            (TENANT_ID, cid, teacher_ids[cls["lead"]]),
        )
        for scode in cls["roster"]:
            _exec_tenant(
                TENANT_ID,
                """
                INSERT INTO class_enrollments (tenant_id, class_id, student_id)
                VALUES (%s, %s, %s)
                """,
                (TENANT_ID, cid, student_ids[scode]),
            )
        print(
            f"  Class        {cls['code']}  {cls['name']} · {cls['subject']}  "
            f"({len(cls['roster'])} students, lead {cls['lead']})"
        )

    # Courses / subjects content — unique curriculum per Class 1–10
    courses = []
    for grade in range(1, 11):
        pack = curriculum_for_grade(grade)
        course_id = COURSE_BY_GRADE[grade]
        slug = f"riverside-class-{grade:02d}"
        courses.append(
            (
                course_id,
                slug,
                f"Class {grade} · {pack['title']}",
                pack["desc"],
                pack["quiz_id"],
                pack["chapters"],
                pack["questions"],
            )
        )

    for course_id, slug, title, desc, quiz_id, chapters, questions in courses:
        _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO courses (id, tenant_id, slug, title, description, status)
            VALUES (%s, %s, %s, %s, %s, 'published')
            """,
            (course_id, TENANT_ID, slug, title, desc),
        )
        if quiz_id and questions:
            _exec_tenant(
                TENANT_ID,
                """
                INSERT INTO quizzes (id, tenant_id, course_id, slug, title, description, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'published')
                """,
                (quiz_id, TENANT_ID, course_id, f"{slug}-quiz", f"{title} quiz", desc),
            )
            for i, (key, prompt, choices, correct) in enumerate(questions, start=1):
                _exec_tenant(
                    TENANT_ID,
                    """
                    INSERT INTO quiz_questions (
                        tenant_id, quiz_id, question_key, prompt, choices, correct_index, position
                    )
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
                    """,
                    (TENANT_ID, quiz_id, key, prompt, json.dumps(choices), correct, i),
                )
        for lslug, ltitle, pos, ltype, body, video in chapters:
            qid = quiz_id if ltype == "quiz" else None
            _exec_tenant(
                TENANT_ID,
                """
                INSERT INTO lessons (
                    tenant_id, course_id, slug, title, position,
                    lesson_type, body_md, video_url, quiz_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (TENANT_ID, course_id, lslug, ltitle, pos, ltype, body, video or "", qid),
            )
        print(f"  Course       {title}  ({len(chapters)} lessons, quiz={'yes' if questions else 'no'})")

    # Link classes → curriculum (after courses exist for FK)
    for cls in classes:
        if not cls.get("course_id"):
            continue
        _exec_tenant(
            TENANT_ID,
            "UPDATE classes SET course_id = %s WHERE id = %s",
            (cls["course_id"], class_ids[cls["code"]]),
        )
        print(f"  Class->course {cls['code']} -> {cls['course_id'][:8]}...")

    # Bind each Moodle Class 1–10 (and Demo) context → matching EdVidura class/course
    ctx_map = dict(DEFAULT_MOODLE_CLASS_CONTEXTS)
    raw_ctx = os.getenv("SEED_MOODLE_CLASS_CONTEXTS", "").strip()
    if raw_ctx:
        ctx_map = {}
        for part in raw_ctx.split(","):
            part = part.strip()
            if not part or ":" not in part:
                continue
            ctx, g = part.split(":", 1)
            ctx_map[ctx.strip()] = int(g.strip())
    # Legacy single-context override still maps to Class 8
    legacy = os.getenv("SEED_MOODLE_CONTEXT_ID", "").strip()
    if legacy and legacy not in ctx_map:
        ctx_map[legacy] = 8

    for moodle_ctx, grade in sorted(ctx_map.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
        code = f"RHS-C{grade:02d}"
        if code not in class_ids:
            continue
        subj, _ = GRADE_SUBJECTS[grade]
        _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO lti_context_bindings (
                tenant_id, lti_context_id, class_id, course_id,
                context_label, context_title, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (tenant_id, lti_context_id) DO UPDATE
              SET class_id = EXCLUDED.class_id,
                  course_id = EXCLUDED.course_id,
                  context_label = EXCLUDED.context_label,
                  context_title = EXCLUDED.context_title,
                  updated_at = now()
            """,
            (
                TENANT_ID,
                moodle_ctx,
                class_ids[code],
                COURSE_BY_GRADE[grade],
                code,
                f"Class {grade} · {subj}",
            ),
        )
        print(f"  LTI bind     Moodle context {moodle_ctx} -> {code} / Class {grade}")

    # Natural demo activity across every class (attempts + lesson progress)
    attempt_n, progress_n = _seed_natural_activity(
        class_ids=class_ids,
        student_ids=student_ids,
        student_names=student_names,
        classes=classes,
    )
    print(f"  Grades       {attempt_n} quiz attempts across Classes 1–10")
    print(f"  Progress     {progress_n} lesson completions across Classes 1–10")

    _seed_skills_and_handbook()
    _seed_isolation_peer()

    print()
    print("Done. Pilot school ready:")
    print("  Tenant slug : riverside")
    print("  Admin       : Alex Morgan <admin@riverside.test>")
    print(f"  Moodle LTI  : {issuer} / {client_id}")
    print(
        f"  Classes     : Class 1 … Class 10 "
        f"({STUDENTS_PER_CLASS} students each, unique lessons + quiz)"
    )
    print("  Moodle bind : Demo + class01..class10 contexts -> matching Class 1-10")
    print("  Activity    : varied quiz scores + lesson progress per class")
    print("  Skills      : Algebra competencies + handbook remediation")
    print("  SME coach   : handbook + lesson sources registered")
    print("  Isolation   : tenant-b peer seeded (not for demo launch)")
    print("  Launch from Moodle -> EdVidura should open Riverside High.")


def _seed_natural_activity(
    *,
    class_ids: dict[str, str],
    student_ids: dict[str, str],
    student_names: dict[str, str],
    classes: list[dict],
) -> tuple[int, int]:
    """Spread quiz attempts + lesson progress so dashboards look lived-in."""
    del class_ids, student_ids  # roster identity comes from codes + names
    attempt_n = 0
    # ~70% of each class has attempted; scores vary (not everyone perfect)
    for cls in classes:
        grade = int(cls["grade"])
        subj_label, _ = GRADE_SUBJECTS[grade]
        course_label = f"Class {grade} · {subj_label}"
        max_score = 3
        # First 16 of 22 attempt; last 6 "not started" for natural gap
        for n in range(1, min(17, STUDENTS_PER_CLASS + 1)):
            code = f"STU-C{grade:02d}-{n:02d}"
            if grade == 8 and n == 1:
                subject = "stu-alice"
            elif grade == 8 and n == 2:
                subject = "stu-bob"
            elif grade == 8 and n == 3:
                subject = "stu-carol"
            else:
                subject = f"moodle-c{grade:02d}-s{n:02d}"
            learner = student_names.get(code, f"Class {grade} Student {n:02d}")

            if n <= 4:
                score = max_score
            elif n <= 10:
                score = max_score - 1
            elif n <= 14:
                score = max_score - 2 if max_score >= 2 else 0
            else:
                score = 0
            grade_sent = score >= (max_score - 1) and n % 3 != 0
            _exec_tenant(
                TENANT_ID,
                """
                INSERT INTO quiz_attempts (
                    tenant_id, subject, learner_name, course_label,
                    score, max_score, answers, grade_sent
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                (
                    TENANT_ID,
                    subject,
                    learner,
                    course_label,
                    score,
                    max_score,
                    json.dumps(
                        {
                            "seed": True,
                            "class_code": cls["code"],
                            "grade": grade,
                            "student_code": code,
                        }
                    ),
                    grade_sent,
                ),
            )
            attempt_n += 1

    progress_n = 0
    with db.tenant_connection(TENANT_ID) as conn:
        for cls in classes:
            grade = int(cls["grade"])
            course_id = cls["course_id"]
            lessons = conn.execute(
                """
                SELECT id, course_id, position, lesson_type
                FROM lessons
                WHERE course_id = %s::uuid
                ORDER BY position
                """,
                (course_id,),
            ).fetchall()
            reading = [r for r in lessons if r["lesson_type"] != "quiz"]
            if not reading:
                continue
            for n in range(1, min(13, STUDENTS_PER_CLASS + 1)):
                if grade == 8 and n == 1:
                    subject = "stu-alice"
                elif grade == 8 and n == 2:
                    subject = "stu-bob"
                elif grade == 8 and n == 3:
                    subject = "stu-carol"
                else:
                    subject = f"moodle-c{grade:02d}-s{n:02d}"
                done_count = 3 if n <= 5 else (2 if n <= 9 else 1)
                for r in reading[:done_count]:
                    conn.execute(
                        """
                        INSERT INTO lesson_progress (
                            tenant_id, course_id, lesson_id, subject, completed_at
                        )
                        VALUES (
                            %s::uuid, %s::uuid, %s::uuid, %s,
                            now() - (%s || ' hours')::interval
                        )
                        ON CONFLICT (lesson_id, subject) DO NOTHING
                        """,
                        (
                            TENANT_ID,
                            str(r["course_id"]),
                            str(r["id"]),
                            subject,
                            str((grade * 3 + n) % 72),
                        ),
                    )
                    progress_n += 1
    return attempt_n, progress_n


def _seed_skills_and_handbook() -> None:
    """C8 skills registry + versioned handbook for remediation loop."""
    from app.modules import manuals as manuals_mod
    from app.modules import skills as skills_mod

    handbook_body = """## Solve for x

Isolate the variable. For 2x + 3 = 11, subtract 3, then divide by 2 → x = 4.

## Variables

A variable stands for an unknown value. Use letters like x or y in expressions.

## Linear equations

Balance both sides of the equation. Whatever you do to one side, do to the other.

## Gradebook sync

Official scores live in the Moodle gradebook via AGS. Practice attempts skip grade sync.
"""
    manual = manuals_mod.create_manual(
        tenant_id=TENANT_ID,
        title="Algebra I study handbook",
        description="Pinned sections for skill remediation",
        body_md=handbook_body,
        subject="seed",
        publish=True,
    )
    mid = str(manual["id"])
    print(f"  Manual       Algebra handbook ({mid[:8]}…)")

    # Extra handbooks so Manuals library looks stocked across grades
    extra_manuals = [
        (
            "Class 1 · Letter sounds handbook",
            "Early literacy warm-ups for Class 1.",
            "## Sounds\n\nSay A-B-C slowly. Clap once per sound.\n\n## Counting\n\nCount to 20 using classroom objects.",
        ),
        (
            "Class 5 · Earth & decimals handbook",
            "General studies reference for Class 5.",
            "## Earth layers\n\nCrust, mantle, core.\n\n## Decimals\n\n0.5 is one half. Line up the decimal points when adding.",
        ),
        (
            "Class 10 · Functions handbook",
            "Exam prep notes for Advanced Maths.",
            "## Functions\n\nA function maps each input to one output.\n\n## Graphs\n\nSlope is rise over run. Practice sketching y = mx + b.",
        ),
        (
            "Class 9 · Geometry handbook",
            "Shapes and measurement for Class 9.",
            "## Triangles\n\nSum of angles is 180°.\n\n## Circles\n\nCircumference = 2πr. Area = πr².",
        ),
    ]
    for title, desc, body in extra_manuals:
        m = manuals_mod.create_manual(
            tenant_id=TENANT_ID,
            title=title,
            description=desc,
            body_md=body,
            subject="seed",
            publish=True,
        )
        print(f"  Manual       {title} ({str(m['id'])[:8]}…)")

    from app.modules import sme as sme_mod

    # First reading lesson for prefer_path=lessons
    lesson_id = None
    with db.tenant_connection(TENANT_ID) as conn:
        row = conn.execute(
            """
            SELECT id FROM lessons
            WHERE course_id = %s::uuid AND lesson_type <> 'quiz'
            ORDER BY position
            LIMIT 1
            """,
            (COURSE_MATH,),
        ).fetchone()
        if row:
            lesson_id = str(row["id"])

    riverside_pack = (
        {
            "skill_code": "solve_linear",
            "label": "Solve linear equations",
            "description": "Isolate the variable and check both sides.",
            "question_keys": ("q1", "q3"),
            "manual_focus": "solve-for-x",
            "prefer_path": "lessons",
            "lesson_id": lesson_id,
            "manual_id": mid,
            "teleport_label": "Review: solving for x",
            "teleport_hint": "Re-read linear equations, then practice this skill",
            "position": 1,
        },
        {
            "skill_code": "variables",
            "label": "Variables",
            "description": "What a variable stands for in an expression.",
            "question_keys": ("q2",),
            "manual_focus": "variables",
            "prefer_path": "manuals",
            "lesson_id": lesson_id,
            "manual_id": mid,
            "teleport_label": "Review: variables",
            "teleport_hint": "Open the pinned handbook section, then practice",
            "position": 2,
        },
    )
    skills_mod.upsert_skill_pack(TENANT_ID, riverside_pack)
    print(f"  Skills       {len(riverside_pack)} Algebra competencies linked to q1–q3")

    roles = skills_mod.ensure_default_roles(TENANT_ID)
    print(f"  Roles        {len(roles)} difference-training profiles")

    # Pin all seed manuals for study coach
    with db.tenant_connection(TENANT_ID) as conn:
        manual_rows = conn.execute(
            "SELECT id, title FROM manuals ORDER BY created_at"
        ).fetchall()
    for row in manual_rows:
        sme_mod.add_manual_source(
            TENANT_ID,
            manual_id=str(row["id"]),
            pin_version=1,
            label=str(row["title"]),
        )
    if lesson_id:
        sme_mod.add_lesson_source(
            TENANT_ID, lesson_id=lesson_id, label="Welcome to Algebra I"
        )
    print(f"  SME sources  {len(manual_rows)} handbooks + Algebra lesson")


def _seed_isolation_peer() -> None:
    """Minimal Tenant B so RLS isolation proofs still pass after single-school seed."""
    _exec_owner(
        """
        INSERT INTO tenants (id, slug, name, status)
        VALUES (%s::uuid, 'lakeside-peer', 'Lakeside Peer (isolation)', 'active')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'
        """,
        (TENANT_B_ID,),
    )
    _exec_tenant(
        TENANT_B_ID,
        """
        INSERT INTO courses (id, tenant_id, slug, title, description, status)
        VALUES (%s::uuid, %s::uuid, 'lakeside-peer', 'Lakeside Peer Course',
                'Isolation proof only — not for Moodle demo.', 'published')
        ON CONFLICT (id) DO UPDATE SET status = 'published', title = EXCLUDED.title
        """,
        (COURSE_B, TENANT_B_ID),
    )
    with db.tenant_connection(TENANT_B_ID) as conn:
        exists = conn.execute(
            "SELECT 1 FROM lessons WHERE course_id = %s::uuid LIMIT 1",
            (COURSE_B,),
        ).fetchone()
        if not exists:
            conn.execute(
                """
                INSERT INTO lessons (
                    tenant_id, course_id, slug, title, position,
                    lesson_type, body_md, status
                )
                VALUES (
                    %s::uuid, %s::uuid, 'peer-welcome', 'Peer welcome', 1,
                    'article',
                    'Tenant B only. Riverside must never see this body.',
                    'published'
                )
                """,
                (TENANT_B_ID, COURSE_B),
            )
    print("  Isolation    tenant-b peer course + lesson")


def summarize() -> None:
    """Count rows as DB owner so RLS does not zero-out tenant tables."""
    import psycopg
    from psycopg.rows import dict_row

    with psycopg.connect(_owner_dsn(), row_factory=dict_row) as conn:
        print("--- counts ---")
        for label, sql in [
            ("tenants", "SELECT COUNT(*) AS n FROM tenants"),
            ("admins", "SELECT COUNT(*) AS n FROM school_admins"),
            ("teachers", "SELECT COUNT(*) AS n FROM teachers"),
            ("students", "SELECT COUNT(*) AS n FROM students"),
            ("classes", "SELECT COUNT(*) AS n FROM classes"),
            ("courses", "SELECT COUNT(*) AS n FROM courses"),
            ("lessons", "SELECT COUNT(*) AS n FROM lessons"),
            ("attempts", "SELECT COUNT(*) AS n FROM quiz_attempts"),
            ("bindings", "SELECT COUNT(*) AS n FROM lti_context_bindings"),
            ("platforms", "SELECT COUNT(*) AS n FROM lti_platforms"),
        ]:
            n = conn.execute(sql).fetchone()["n"]
            print(f"  {label:10} {n}")


def main() -> None:
    reset()
    seed()
    summarize()


if __name__ == "__main__":
    main()
