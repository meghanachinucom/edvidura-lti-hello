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

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app import db  # noqa: E402
from app.tenancy import TENANT_A_ID  # noqa: E402

TENANT_ID = TENANT_A_ID  # aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
INST_ID = "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
COURSE_MATH = "cccccccc-cccc-cccc-cccc-cccccccccccc"
COURSE_SCI = "dddddddd-dddd-dddd-dddd-dddddddddddd"
COURSE_ENG = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
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


def _super_exec(sql: str) -> None:
    """Run as DB owner (bypasses RLS) via DATABASE_URL host with edvidura user."""
    import psycopg
    from psycopg.rows import dict_row

    url = os.getenv("DATABASE_URL", "").strip()
    # Prefer superuser-ish local docker owner for TRUNCATE
    owner_url = os.getenv(
        "DATABASE_OWNER_URL",
        "postgresql://edvidura:edvidura@127.0.0.1:5433/edvidura",
    ).strip()
    with psycopg.connect(owner_url, row_factory=dict_row) as conn:
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
    print("Wiping all tenants / school / LTI / attempts data…")
    _super_exec(TRUNCATE_SQL)
    print("  done.")


def seed() -> None:
    issuer = os.getenv("MOODLE_ISSUER", "http://localhost:8085").rstrip("/")
    client_id = os.getenv("MOODLE_CLIENT_ID", "2HXWneHjMgBHNNl").strip()
    deployments = [
        d.strip()
        for d in os.getenv("MOODLE_DEPLOYMENT_IDS", "1").split(",")
        if d.strip()
    ] or ["1"]

    print("Seeding Riverside High (single school)…")
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

    teachers = [
        ("TCH-01", "Priya Sharma", "priya.sharma@riverside.test"),
        ("TCH-02", "James Cole", "james.cole@riverside.test"),
        ("TCH-03", "Ana Ruiz", "ana.ruiz@riverside.test"),
        ("TCH-04", "Omar Haddad", "omar.haddad@riverside.test"),
    ]
    teacher_ids: dict[str, str] = {}
    for code, name, email in teachers:
        row = _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO teachers (tenant_id, teacher_code, name, email, status)
            VALUES (%s, %s, %s, %s, 'active')
            RETURNING id
            """,
            (TENANT_ID, code, name, email),
        ).fetchone()
        teacher_ids[code] = str(row["id"])
        print(f"  Teacher       {code}  {name}")

    students = [
        ("STU-01", "Alice Nguyen", "alice.nguyen@riverside.test"),
        ("STU-02", "Bob Okonkwo", "bob.okonkwo@riverside.test"),
        ("STU-03", "Carol Patel", "carol.patel@riverside.test"),
        ("STU-04", "Diego Santos", "diego.santos@riverside.test"),
        ("STU-05", "Emma Brooks", "emma.brooks@riverside.test"),
        ("STU-06", "Farah Ali", "farah.ali@riverside.test"),
        ("STU-07", "Gabe Ortiz", "gabe.ortiz@riverside.test"),
        ("STU-08", "Hana Lee", "hana.lee@riverside.test"),
        ("STU-09", "Ian Brooks", "ian.brooks@riverside.test"),
        ("STU-10", "Jade Kim", "jade.kim@riverside.test"),
        ("STU-11", "Kai Mensah", "kai.mensah@riverside.test"),
        ("STU-12", "Lina Rossi", "lina.rossi@riverside.test"),
    ]
    student_ids: dict[str, str] = {}
    for code, name, email in students:
        row = _exec_owner(
            """
            INSERT INTO students (institution_id, student_code, name, email, status)
            VALUES (%s, %s, %s, %s, 'active')
            RETURNING id
            """,
            (INST_ID, code, name, email),
        ).fetchone()
        student_ids[code] = str(row["id"])
        print(f"  Student      {code}  {name}")

    classes = [
        {
            "code": "RHS-MATH-P1",
            "name": "Algebra I — Period 1",
            "subject": "Mathematics",
            "term": "Fall 2026",
            "lead": "TCH-01",
            "assist": "TCH-02",
            "roster": ["STU-01", "STU-02", "STU-03", "STU-04"],
        },
        {
            "code": "RHS-MATH-P3",
            "name": "Algebra I — Period 3",
            "subject": "Mathematics",
            "term": "Fall 2026",
            "lead": "TCH-02",
            "assist": "TCH-01",
            "roster": ["STU-05", "STU-06", "STU-07", "STU-08"],
        },
        {
            "code": "RHS-SCI-P2",
            "name": "Intro Science — Period 2",
            "subject": "Science",
            "term": "Fall 2026",
            "lead": "TCH-03",
            "assist": None,
            "roster": ["STU-01", "STU-05", "STU-09", "STU-10"],
        },
        {
            "code": "RHS-ENG-A",
            "name": "English Foundations — A",
            "subject": "English",
            "term": "Fall 2026",
            "lead": "TCH-04",
            "assist": "TCH-03",
            "roster": ["STU-02", "STU-06", "STU-11", "STU-12"],
        },
        {
            "code": "RHS-HIST-B",
            "name": "World History — B",
            "subject": "History",
            "term": "Fall 2026",
            "lead": "TCH-04",
            "assist": None,
            "roster": ["STU-03", "STU-07", "STU-09", "STU-11"],
        },
    ]
    for cls in classes:
        row = _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO classes (
                tenant_id, institution_id, class_code, class_name, subject, term, status
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
        _exec_tenant(
            TENANT_ID,
            """
            INSERT INTO class_teachers (tenant_id, class_id, teacher_id, role)
            VALUES (%s, %s, %s, 'lead')
            """,
            (TENANT_ID, cid, teacher_ids[cls["lead"]]),
        )
        if cls.get("assist"):
            _exec_tenant(
                TENANT_ID,
                """
                INSERT INTO class_teachers (tenant_id, class_id, teacher_id, role)
                VALUES (%s, %s, %s, 'assistant')
                """,
                (TENANT_ID, cid, teacher_ids[cls["assist"]]),
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
        print(f"  Class        {cls['code']}  {cls['subject']}  ({len(cls['roster'])} students)")

    # Courses / subjects content
    courses = [
        (
            COURSE_MATH,
            "riverside-algebra",
            "Algebra I",
            "Core algebra for Riverside High.",
            QUIZ_MATH,
            [
                (
                    "ch1-welcome",
                    "Welcome to Algebra I",
                    1,
                    "article",
                    "Variables, expressions, and solving for x.",
                    "",
                ),
                (
                    "ch2-equations",
                    "Linear equations",
                    2,
                    "article",
                    "Balance both sides. Isolate the variable.",
                    "",
                ),
                (
                    "ch3-video",
                    "Solving for x (video)",
                    3,
                    "video",
                    "Short overview video.",
                    "https://www.youtube.com/embed/dQw4w9WgXcQ",
                ),
                (
                    "ch4-quiz",
                    "Algebra check quiz",
                    4,
                    "quiz",
                    "Show what you know.",
                    "",
                ),
            ],
            [
                ("q1", "What is x in 2x + 3 = 11?", ["3", "4", "5", "8"], 1),
                ("q2", "A variable stands for…", ["A fixed number", "An unknown", "A formula", "A grade"], 1),
                ("q3", "2x = 10 → x = ?", ["2", "5", "8", "12"], 1),
            ],
        ),
        (
            COURSE_SCI,
            "riverside-science",
            "Intro Science",
            "Scientific method and matter.",
            QUIZ_SCI,
            [
                (
                    "s1-method",
                    "The scientific method",
                    1,
                    "article",
                    "Ask, hypothesize, test, conclude.",
                    "",
                ),
                (
                    "s2-matter",
                    "States of matter",
                    2,
                    "article",
                    "Solid, liquid, gas.",
                    "",
                ),
                (
                    "s3-quiz",
                    "Science check quiz",
                    3,
                    "quiz",
                    "Quick check.",
                    "",
                ),
            ],
            [
                ("sq1", "First step of the scientific method?", ["Guess", "Ask a question", "Publish", "Skip testing"], 1),
                ("sq2", "Water boiling is mostly which change?", ["Chemical", "Physical", "Nuclear", "None"], 1),
            ],
        ),
        (
            COURSE_ENG,
            "riverside-english",
            "English Foundations",
            "Reading and clear writing.",
            None,
            [
                (
                    "e1-reading",
                    "Active reading",
                    1,
                    "article",
                    "Annotate, summarize, question the text.",
                    "",
                ),
                (
                    "e2-writing",
                    "Paragraph structure",
                    2,
                    "article",
                    "Topic sentence → evidence → wrap-up.",
                    "",
                ),
            ],
            [],
        ),
    ]

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
        print(f"  Course       {title}  ({len(chapters)} lessons)")

    # Grades / quiz attempts for several students
    grades = [
        ("stu-alice", "Alice Nguyen", "Algebra I", 3, 3, True),
        ("stu-bob", "Bob Okonkwo", "Algebra I", 2, 3, True),
        ("stu-carol", "Carol Patel", "Algebra I", 1, 3, False),
        ("stu-diego", "Diego Santos", "Algebra I", 3, 3, False),
        ("stu-emma", "Emma Brooks", "Intro Science", 2, 2, True),
        ("stu-farah", "Farah Ali", "Intro Science", 1, 2, False),
        ("stu-gabe", "Gabe Ortiz", "Algebra I", 2, 3, True),
        ("stu-hana", "Hana Lee", "Algebra I", 0, 3, False),
    ]
    for subject, learner, course, score, max_s, sent in grades:
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
                course,
                score,
                max_s,
                json.dumps({"seed": True}),
                sent,
            ),
        )
    print(f"  Grades       {len(grades)} quiz attempts")

    # Mark some lesson progress
    with db.tenant_connection(TENANT_ID) as conn:
        rows = conn.execute(
            """
            SELECT id, course_id FROM lessons
            WHERE course_id = %s::uuid
            ORDER BY position
            LIMIT 3
            """,
            (COURSE_MATH,),
        ).fetchall()
        for i, r in enumerate(rows):
            conn.execute(
                """
                INSERT INTO lesson_progress (
                    tenant_id, course_id, lesson_id, subject, completed_at
                )
                VALUES (%s::uuid, %s::uuid, %s::uuid, %s, now())
                ON CONFLICT (lesson_id, subject) DO NOTHING
                """,
                (TENANT_ID, str(r["course_id"]), str(r["id"]), f"stu-progress-{i}"),
            )
    print("  Progress     sample lesson completions")

    print()
    print("Done. Single school ready:")
    print("  Tenant slug : riverside")
    print("  Admin       : Alex Morgan <admin@riverside.test>")
    print(f"  Moodle LTI  : {issuer} / {client_id}")
    print("  Launch from Moodle -> EdVidura should open Riverside High.")


def summarize() -> None:
    with db.connect() as conn:
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
