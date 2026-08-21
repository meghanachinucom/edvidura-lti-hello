"""Seed two schools with classes, teachers, students, chapters, and quizzes.

Each school's content is tenant-scoped (RLS). Re-run safely (idempotent).

  python scripts/seed_schools.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app import db  # noqa: E402
from app.tenancy import TENANT_A_ID, TENANT_B_ID  # noqa: E402

SCHOOL_A_ID = "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SCHOOL_B_ID = "22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
COURSE_A_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
COURSE_B_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
QUIZ_A_ID = "aa11aa11-aa11-aa11-aa11-aa11aa11aa11"
QUIZ_B_ID = "bb22bb22-bb22-bb22-bb22-bb22bb22bb22"


DEMO = {
    "riverside": {
        "tenant_id": TENANT_A_ID,
        "tenant_slug": "tenant-a",
        "tenant_name": "Riverside High",
        "institution_id": SCHOOL_A_ID,
        "institution_code": "riverside",
        "institution_name": "Riverside High School",
        "issuer": "http://localhost:8085",
        "client_id": "demo-riverside-client",
        "school_admins": [
            ("ADM-R01", "Riverside School Admin", "admin@riverside.test"),
        ],
        "course_id": COURSE_A_ID,
        "course_slug": "riverside-algebra",
        "course_title": "Riverside Algebra I",
        "course_desc": "Riverside-only chapters and quiz. Lakeside cannot see this.",
        "quiz_id": QUIZ_A_ID,
        "quiz_slug": "riverside-algebra-check",
        "quiz_title": "Riverside Algebra check",
        "teachers": [
            ("TCH-R01", "Ms. Priya Sharma", "priya.sharma@riverside.test"),
            ("TCH-R02", "Mr. James Cole", "james.cole@riverside.test"),
            ("TCH-R03", "Ms. Ana Ruiz", "ana.ruiz@riverside.test"),
        ],
        "students": [
            ("STU-R01", "Alice Nguyen", "alice.nguyen@riverside.test"),
            ("STU-R02", "Bob Okonkwo", "bob.okonkwo@riverside.test"),
            ("STU-R03", "Carol Patel", "carol.patel@riverside.test"),
            ("STU-R04", "Diego Santos", "diego.santos@riverside.test"),
            ("STU-R05", "Emma Brooks", "emma.brooks@riverside.test"),
            ("STU-R06", "Farah Ali", "farah.ali@riverside.test"),
        ],
        "classes": [
            {
                "code": "RHS-ALG-P1",
                "name": "Algebra I — Period 1",
                "subject": "Mathematics",
                "term": "Fall 2026",
                "lead": "TCH-R01",
                "assist": "TCH-R03",
                "roster": ["STU-R01", "STU-R02", "STU-R03"],
            },
            {
                "code": "RHS-ALG-P3",
                "name": "Algebra I — Period 3",
                "subject": "Mathematics",
                "term": "Fall 2026",
                "lead": "TCH-R02",
                "assist": "TCH-R01",
                "roster": ["STU-R04", "STU-R05", "STU-R06"],
            },
            {
                "code": "RHS-SCI-P2",
                "name": "Intro Science — Period 2",
                "subject": "Science",
                "term": "Fall 2026",
                "lead": "TCH-R03",
                "assist": None,
                "roster": ["STU-R01", "STU-R04", "STU-R05"],
            },
        ],
        "chapters": [
            (
                "ch1-welcome",
                "Chapter 1: Welcome to Riverside Algebra",
                1,
                "article",
                "This course belongs only to Riverside High.\n\n"
                "Other schools (including Lakeside) cannot read these chapters.",
                "",
            ),
            (
                "ch2-variables",
                "Chapter 2: Variables and expressions",
                2,
                "article",
                "A variable stands for a number you do not know yet.\n\n"
                "Example: in 2x + 3 = 11, x is the unknown.",
                "",
            ),
            (
                "ch3-video",
                "Chapter 3: Solving for x (video)",
                3,
                "video",
                "Watch the short overview, then continue to the Riverside quiz.",
                "https://www.youtube.com/embed/dQw4w9WgXcQ",
            ),
            (
                "ch4-quiz",
                "Chapter 4: Riverside Algebra quiz",
                4,
                "quiz",
                "School-specific quiz — only Riverside questions.",
                "",
            ),
        ],
        "questions": [
            (
                "rq1",
                "Which school owns this Algebra course?",
                ["Riverside High", "Lakeside Academy", "Any school", "Moodle HQ"],
                0,
            ),
            (
                "rq2",
                "In 2x + 3 = 11, what is x?",
                ["3", "4", "5", "8"],
                1,
            ),
            (
                "rq3",
                "Can Lakeside teachers see Riverside quiz attempts?",
                ["Yes, always", "Only on Fridays", "No — tenants are isolated", "Only if names match"],
                2,
            ),
        ],
    },
    "lakeside": {
        "tenant_id": TENANT_B_ID,
        "tenant_slug": "tenant-b",
        "tenant_name": "Lakeside Academy",
        "institution_id": SCHOOL_B_ID,
        "institution_code": "lakeside",
        "institution_name": "Lakeside Academy",
        "issuer": "http://localhost:8085",
        "client_id": "demo-lakeside-client",
        "school_admins": [
            ("ADM-L01", "Lakeside School Admin", "admin@lakeside.test"),
        ],
        "course_id": COURSE_B_ID,
        "course_slug": "lakeside-civics",
        "course_title": "Lakeside Civics",
        "course_desc": "Lakeside-only chapters and quiz. Riverside cannot see this.",
        "quiz_id": QUIZ_B_ID,
        "quiz_slug": "lakeside-civics-check",
        "quiz_title": "Lakeside Civics check",
        "teachers": [
            ("TCH-L01", "Dr. Helen Park", "helen.park@lakeside.test"),
            ("TCH-L02", "Mr. Omar Haddad", "omar.haddad@lakeside.test"),
            ("TCH-L03", "Ms. Grace Okello", "grace.okello@lakeside.test"),
        ],
        "students": [
            ("STU-L01", "Dana Rivera", "dana.rivera@lakeside.test"),
            ("STU-L02", "Evan Kim", "evan.kim@lakeside.test"),
            ("STU-L03", "Fay Hassan", "fay.hassan@lakeside.test"),
            ("STU-L04", "Gina Rossi", "gina.rossi@lakeside.test"),
            ("STU-L05", "Hassan Malik", "hassan.malik@lakeside.test"),
            ("STU-L06", "Ivy Chen", "ivy.chen@lakeside.test"),
        ],
        "classes": [
            {
                "code": "LKS-CIV-A",
                "name": "Civics — Section A",
                "subject": "Social Studies",
                "term": "Fall 2026",
                "lead": "TCH-L01",
                "assist": "TCH-L02",
                "roster": ["STU-L01", "STU-L02", "STU-L03"],
            },
            {
                "code": "LKS-CIV-B",
                "name": "Civics — Section B",
                "subject": "Social Studies",
                "term": "Fall 2026",
                "lead": "TCH-L02",
                "assist": "TCH-L03",
                "roster": ["STU-L04", "STU-L05", "STU-L06"],
            },
            {
                "code": "LKS-ENG-1",
                "name": "English Foundations",
                "subject": "English",
                "term": "Fall 2026",
                "lead": "TCH-L03",
                "assist": None,
                "roster": ["STU-L02", "STU-L04", "STU-L06"],
            },
        ],
        "chapters": [
            (
                "ch1-welcome",
                "Chapter 1: Welcome to Lakeside Civics",
                1,
                "article",
                "This course belongs only to Lakeside Academy.\n\n"
                "Riverside High cannot read these chapters or quiz items.",
                "",
            ),
            (
                "ch2-community",
                "Chapter 2: Community and local government",
                2,
                "article",
                "Local governments handle parks, schools, and city services.\n\n"
                "Citizens can attend public meetings and vote in local elections.",
                "",
            ),
            (
                "ch3-video",
                "Chapter 3: How a city council works (video)",
                3,
                "video",
                "Watch the overview, then take the Lakeside-only quiz.",
                "https://www.youtube.com/embed/dQw4w9WgXcQ",
            ),
            (
                "ch4-quiz",
                "Chapter 4: Lakeside Civics quiz",
                4,
                "quiz",
                "School-specific quiz — only Lakeside questions.",
                "",
            ),
        ],
        "questions": [
            (
                "lq1",
                "Which school owns this Civics course?",
                ["Riverside High", "Lakeside Academy", "Any school", "The state capital"],
                1,
            ),
            (
                "lq2",
                "What is one role of local government?",
                ["Issuing passports", "Managing city parks and services", "Declaring war", "Printing money"],
                1,
            ),
            (
                "lq3",
                "Can Riverside see Lakeside quiz scores?",
                ["Yes", "Only admins of any school", "No — tenant isolation blocks it", "If emails match"],
                2,
            ),
        ],
    },
}


def _exec(sql: str, params: tuple | list | None = None):
    with db.connect() as conn:
        with conn.transaction():
            return conn.execute(sql, params or ())


def _fetchone(sql: str, params: tuple | list | None = None):
    with db.connect() as conn:
        return conn.execute(sql, params or ()).fetchone()


def _ensure_tenant(tenant_id: str, slug: str, name: str) -> None:
    _exec(
        """
        INSERT INTO tenants (id, slug, name, status)
        VALUES (%s, %s, %s, 'active')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'
        """,
        (tenant_id, slug, name),
    )


def _upsert_institution(school: dict) -> str:
    row = _fetchone(
        """
        INSERT INTO institutions (
            id, tenant_id, institution_code, institution_name,
            issuer, client_id, deployment_ids, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
        ON CONFLICT (institution_code) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            institution_name = EXCLUDED.institution_name,
            issuer = EXCLUDED.issuer,
            client_id = EXCLUDED.client_id,
            deployment_ids = EXCLUDED.deployment_ids,
            status = 'active'
        RETURNING id
        """,
        (
            school["institution_id"],
            school["tenant_id"],
            school["institution_code"],
            school["institution_name"],
            school["issuer"],
            school["client_id"],
            ["1"],
        ),
    )
    return str(row["id"])


def _upsert_person_student(institution_id: str, code: str, name: str, email: str) -> str:
    row = _fetchone(
        """
        INSERT INTO students (institution_id, student_code, name, email, status)
        VALUES (%s, %s, %s, %s, 'active')
        ON CONFLICT (institution_id, student_code) DO UPDATE SET
            name = EXCLUDED.name, email = EXCLUDED.email, status = 'active'
        RETURNING id
        """,
        (institution_id, code, name, email),
    )
    return str(row["id"])


def _upsert_school_admin(
    tenant_id: str, institution_id: str, code: str, name: str, email: str
) -> str:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO school_admins (
                tenant_id, institution_id, admin_code, name, email, status
            )
            VALUES (%s, %s, %s, %s, %s, 'active')
            ON CONFLICT (tenant_id, admin_code) DO UPDATE SET
                institution_id = EXCLUDED.institution_id,
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                status = 'active'
            RETURNING id
            """,
            (tenant_id, institution_id, code, name, email),
        ).fetchone()
        return str(row["id"])


def _upsert_teacher(tenant_id: str, code: str, name: str, email: str) -> str:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO teachers (tenant_id, teacher_code, name, email, status)
            VALUES (%s, %s, %s, %s, 'active')
            ON CONFLICT (tenant_id, teacher_code) DO UPDATE SET
                name = EXCLUDED.name, email = EXCLUDED.email, status = 'active'
            RETURNING id
            """,
            (tenant_id, code, name, email),
        ).fetchone()
        return str(row["id"])


def _upsert_class(
    tenant_id: str,
    institution_id: str,
    code: str,
    name: str,
    subject: str,
    term: str,
) -> str:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO classes (
                tenant_id, institution_id, class_code, class_name, subject, term, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            ON CONFLICT (tenant_id, class_code) DO UPDATE SET
                institution_id = EXCLUDED.institution_id,
                class_name = EXCLUDED.class_name,
                subject = EXCLUDED.subject,
                term = EXCLUDED.term,
                status = 'active'
            RETURNING id
            """,
            (tenant_id, institution_id, code, name, subject, term),
        ).fetchone()
        return str(row["id"])


def _link_teacher(tenant_id: str, class_id: str, teacher_id: str, role: str) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            INSERT INTO class_teachers (tenant_id, class_id, teacher_id, role)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (class_id, teacher_id) DO UPDATE SET role = EXCLUDED.role
            """,
            (tenant_id, class_id, teacher_id, role),
        )


def _enroll(tenant_id: str, class_id: str, student_id: str) -> None:
    with db.tenant_connection(tenant_id) as conn:
        conn.execute(
            """
            INSERT INTO class_enrollments (tenant_id, class_id, student_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (class_id, student_id) DO NOTHING
            """,
            (tenant_id, class_id, student_id),
        )


def _upsert_course(school: dict) -> None:
    tid = school["tenant_id"]
    with db.tenant_connection(tid) as conn:
        conn.execute(
            """
            INSERT INTO courses (id, tenant_id, slug, title, description, status)
            VALUES (%s, %s, %s, %s, %s, 'published')
            ON CONFLICT (id) DO UPDATE SET
                slug = EXCLUDED.slug,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                status = 'published'
            """,
            (
                school["course_id"],
                tid,
                school["course_slug"],
                school["course_title"],
                school["course_desc"],
            ),
        )
        # Drop older demo course slug if it still exists under a different id
        conn.execute(
            """
            DELETE FROM courses
            WHERE tenant_id = %s
              AND slug IN ('readiness-check', 'tenant-b-only')
              AND id <> %s
            """,
            (tid, school["course_id"]),
        )


def _upsert_quiz(school: dict) -> None:
    tid = school["tenant_id"]
    with db.tenant_connection(tid) as conn:
        conn.execute(
            """
            INSERT INTO quizzes (id, tenant_id, course_id, slug, title, description, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'published')
            ON CONFLICT (id) DO UPDATE SET
                course_id = EXCLUDED.course_id,
                slug = EXCLUDED.slug,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                status = 'published'
            """,
            (
                school["quiz_id"],
                tid,
                school["course_id"],
                school["quiz_slug"],
                school["quiz_title"],
                school["course_desc"],
            ),
        )
        for i, (key, prompt, choices, correct) in enumerate(school["questions"], start=1):
            conn.execute(
                """
                INSERT INTO quiz_questions (
                    tenant_id, quiz_id, question_key, prompt, choices, correct_index, position
                )
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
                ON CONFLICT (quiz_id, question_key) DO UPDATE SET
                    prompt = EXCLUDED.prompt,
                    choices = EXCLUDED.choices,
                    correct_index = EXCLUDED.correct_index,
                    position = EXCLUDED.position
                """,
                (tid, school["quiz_id"], key, prompt, json.dumps(choices), correct, i),
            )


def _upsert_chapters(school: dict) -> None:
    tid = school["tenant_id"]
    with db.tenant_connection(tid) as conn:
        # Clear existing lessons for this course so position/slug swaps stay clean
        conn.execute(
            "DELETE FROM lessons WHERE course_id = %s",
            (school["course_id"],),
        )
        for slug, title, pos, ltype, body, video in school["chapters"]:
            quiz_id = school["quiz_id"] if ltype == "quiz" else None
            conn.execute(
                """
                INSERT INTO lessons (
                    tenant_id, course_id, slug, title, position,
                    lesson_type, body_md, video_url, quiz_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    tid,
                    school["course_id"],
                    slug,
                    title,
                    pos,
                    ltype,
                    body,
                    video,
                    quiz_id,
                ),
            )


def _seed_school(key: str, school: dict) -> None:
    print(f"=== {school['institution_name']} ({key}) ===")
    _ensure_tenant(school["tenant_id"], school["tenant_slug"], school["tenant_name"])
    inst_id = _upsert_institution(school)

    for code, name, email in school.get("school_admins") or []:
        _upsert_school_admin(school["tenant_id"], inst_id, code, name, email)
        print(f"  School admin  {code}  {name}")

    teachers: dict[str, str] = {}
    for code, name, email in school["teachers"]:
        tid = _upsert_teacher(school["tenant_id"], code, name, email)
        teachers[code] = tid
        print(f"  Teacher       {code}  {name}")

    students: dict[str, str] = {}
    for code, name, email in school["students"]:
        sid = _upsert_person_student(inst_id, code, name, email)
        students[code] = sid
        print(f"  Student      {code}  {name}")

    for cls in school["classes"]:
        cid = _upsert_class(
            school["tenant_id"],
            inst_id,
            cls["code"],
            cls["name"],
            cls["subject"],
            cls["term"],
        )
        _link_teacher(school["tenant_id"], cid, teachers[cls["lead"]], "lead")
        if cls.get("assist"):
            _link_teacher(school["tenant_id"], cid, teachers[cls["assist"]], "assistant")
        for scode in cls["roster"]:
            _enroll(school["tenant_id"], cid, students[scode])
        print(f"  Class   {cls['code']}  {cls['name']}  ({len(cls['roster'])} students)")

    _upsert_course(school)
    _upsert_quiz(school)
    _upsert_chapters(school)
    print(f"  Course  {school['course_title']}  ({len(school['chapters'])} chapters)")
    print(f"  Quiz    {school['quiz_title']}  ({len(school['questions'])} questions)")
    print()


def main() -> None:
    for key, school in DEMO.items():
        _seed_school(key, school)

    # Isolation smoke check
    with db.tenant_connection(TENANT_A_ID) as conn:
        a_courses = conn.execute("SELECT title FROM courses").fetchall()
        a_quizzes = conn.execute("SELECT title FROM quizzes").fetchall()
    with db.tenant_connection(TENANT_B_ID) as conn:
        b_courses = conn.execute("SELECT title FROM courses").fetchall()
        b_quizzes = conn.execute("SELECT title FROM quizzes").fetchall()

    a_titles = {r["title"] for r in a_courses}
    b_titles = {r["title"] for r in b_courses}
    leaked = ("Lakeside" in " ".join(a_titles)) or ("Riverside Algebra" in " ".join(b_titles))
    print("Isolation check:")
    print(f"  Tenant A courses: {sorted(a_titles)}")
    print(f"  Tenant B courses: {sorted(b_titles)}")
    print(f"  Cross-leak: {'YES — FAIL' if leaked else 'none (pass)'}")
    print()
    print("APIs: GET /api/v1/institutions  GET /api/v1/students")
    print("App:  Lessons + Quiz load per tenant after LTI launch")


if __name__ == "__main__":
    main()
