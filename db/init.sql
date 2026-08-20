-- EdVidura multi-tenant spike schema (DEC-006: shared DB + RLS)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lti_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    deployment_ids TEXT[] NOT NULL DEFAULT ARRAY['1'],
    auth_login_url TEXT NOT NULL,
    auth_token_url TEXT NOT NULL,
    key_set_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_launch_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (issuer, client_id)
);

CREATE INDEX lti_platforms_issuer_client_idx
    ON lti_platforms (issuer, client_id)
    WHERE active;

CREATE TABLE launch_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '',
    course_label TEXT NOT NULL DEFAULT '',
    raw_claims JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX launch_events_tenant_created_idx
    ON launch_events (tenant_id, created_at DESC);

ALTER TABLE launch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_events FORCE ROW LEVEL SECURITY;

CREATE POLICY launch_events_tenant_isolation ON launch_events
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

-- App role must NOT be superuser / BYPASSRLS (Docker POSTGRES_USER is superuser)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edvidura_app') THEN
        CREATE ROLE edvidura_app LOGIN PASSWORD 'edvidura_app' NOSUPERUSER NOBYPASSRLS;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE edvidura TO edvidura_app;
GRANT USAGE ON SCHEMA public TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edvidura_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edvidura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO edvidura_app;

-- Fixed UUIDs so seed scripts and docs stay stable
INSERT INTO tenants (id, slug, name, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tenant-a', 'Tenant A (Moodle 8085)', 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tenant-b', 'Tenant B (RLS fixture)', 'active');

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_code TEXT NOT NULL UNIQUE,
    institution_name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    deployment_ids TEXT[] NOT NULL DEFAULT ARRAY['1']::TEXT[],
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_students_institution_student_code UNIQUE (institution_id, student_code)
);

CREATE INDEX IF NOT EXISTS idx_institutions_tenant_id ON institutions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions (institution_code);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students (institution_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students (student_code);

-- Slice A: quiz attempts under RLS
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    learner_name TEXT NOT NULL DEFAULT '',
    course_label TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    grade_sent BOOLEAN NOT NULL DEFAULT FALSE,
    grade_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_tenant_created_idx
    ON quiz_attempts (tenant_id, created_at DESC);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_attempts_tenant_isolation ON quiz_attempts;
CREATE POLICY quiz_attempts_tenant_isolation ON quiz_attempts
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edvidura_app;

-- Persist LTI launch JWT bodies for AGS after process reload
CREATE TABLE IF NOT EXISTS lti_launch_snapshots (
    launch_id TEXT PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    launch_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lti_launch_snapshots_created_idx
    ON lti_launch_snapshots (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_launch_snapshots TO edvidura_app;

CREATE TABLE IF NOT EXISTS quiz_session_tokens (
    token TEXT PRIMARY KEY,
    context JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS quiz_session_tokens_expires_idx
    ON quiz_session_tokens (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_session_tokens TO edvidura_app;

-- Tenant-isolated course content (also in migration_course_content.sql)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS courses_tenant_status_idx
    ON courses (tenant_id, status);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    position INT NOT NULL DEFAULT 1,
    lesson_type TEXT NOT NULL DEFAULT 'article'
        CHECK (lesson_type IN ('article', 'video', 'quiz')),
    body_md TEXT NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, slug),
    UNIQUE (course_id, position)
);

CREATE INDEX IF NOT EXISTS lessons_course_position_idx
    ON lessons (course_id, position);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, subject)
);

CREATE INDEX IF NOT EXISTS lesson_progress_learner_idx
    ON lesson_progress (tenant_id, course_id, subject);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courses_tenant_isolation ON courses;
CREATE POLICY courses_tenant_isolation ON courses
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lessons_tenant_isolation ON lessons;
CREATE POLICY lessons_tenant_isolation ON lessons
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_progress_tenant_isolation ON lesson_progress;
CREATE POLICY lesson_progress_tenant_isolation ON lesson_progress
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON courses, lessons, lesson_progress TO edvidura_app;



-- Demo curriculum seeds (from migration_course_content.sql)
-- Seed Tenant A curriculum (isolated content)
INSERT INTO courses (id, tenant_id, slug, title, description, status)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'readiness-check',
    'Course readiness check',
    'Short lessons, then a quiz. Scores can sync to Moodle.',
    'published'
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

INSERT INTO lessons (id, tenant_id, course_id, slug, title, position, lesson_type, body_md, video_url)
VALUES
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'welcome',
    'Welcome to EdVidura',
    1,
    'article',
    $md$You opened this tool from Moodle through a trusted LTI launch.

That means Moodle already verified who you are and which course you came from. EdVidura does not ask for a separate password.

In the next lessons you will see how your school’s data stays private, then take a short quiz.$md$,
    ''
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'your-space',
    'Your school’s private space',
    2,
    'article',
    $md$Many schools can use the same EdVidura product — but each school has its own sealed workspace.

Your attempts and progress stay with your institution. Another school cannot read your rows.

That isolation is enforced in the database for every tenant-owned table.$md$,
    ''
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'watch-overview',
    'How launch works (video)',
    3,
    'video',
    $md$Watch this short overview of LTI tool launch, then continue to the quiz.

(Replace the sample URL with your institution’s video when ready.)$md$,
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'quiz',
    'Readiness quiz',
    4,
    'quiz',
    $md$Complete the quiz to check what you learned. Your score is saved for this school and may sync to Moodle.$md$,
    ''
)
ON CONFLICT (course_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    position = EXCLUDED.position,
    lesson_type = EXCLUDED.lesson_type,
    body_md = EXCLUDED.body_md,
    video_url = EXCLUDED.video_url;

-- Seed Tenant B with different content (proves isolation)
INSERT INTO courses (id, tenant_id, slug, title, description, status)
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'tenant-b-only',
    'Tenant B private course',
    'This course must never appear under Tenant A.',
    'published'
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

INSERT INTO lessons (id, tenant_id, course_id, slug, title, position, lesson_type, body_md, video_url)
VALUES (
    'ffffffff-ffff-ffff-ffff-fffffffffff1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'secret',
    'Tenant B secret lesson',
    1,
    'article',
    'If Tenant A can see this text, content isolation is broken.',
    ''
)
ON CONFLICT (course_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    body_md = EXCLUDED.body_md;
